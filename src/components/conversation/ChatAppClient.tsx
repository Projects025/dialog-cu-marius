
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import LandingView from "@/components/conversation/landing-view";
import ChatView from "@/components/conversation/chat-view";
import type { Message, UserAction } from "@/components/conversation/chat-view";
import { format } from "date-fns";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";
import type { FinancialData } from "@/lib/calculation";


async function saveLeadToFirestore(data: any, agentId: string | null) {
    if (!agentId) {
        console.error("Eroare critică: ID-ul agentului lipsește la trimitere.");
        return; 
    }

    // Curățarea datelor de valori 'undefined' care cauzează erori în Firestore
    const cleanedData = JSON.parse(JSON.stringify(data, (key, value) => {
        return value === undefined ? null : value;
    }));
    
    console.log("Încerc salvare lead...", cleanedData);
    
    const dataToSend = { 
        ...cleanedData, 
        agentId: agentId,
        source: 'Link Client',
        timestamp: serverTimestamp()
    };

    // Conversii suplimentare pe datele deja curățate
    if (Array.isArray(dataToSend.dramaticOptions)) {
        dataToSend.dramaticOptions = dataToSend.dramaticOptions.join(', ');
    }
    if (Array.isArray(dataToSend.priorities)) {
        dataToSend.priorities = dataToSend.priorities.join(', ');
    }
     if (Array.isArray(dataToSend.deces_ask_dramatic_options)) {
        dataToSend.deces_ask_dramatic_options = dataToSend.deces_ask_dramatic_options.join(', ');
    }
     if (Array.isArray(dataToSend.pensie_dramatic_options)) {
        dataToSend.pensie_dramatic_options = dataToSend.pensie_dramatic_options.join(', ');
    }
     if (Array.isArray(dataToSend.studii_dramatic_options)) {
        dataToSend.studii_dramatic_options = dataToSend.studii_dramatic_options.join(', ');
    }
    if (dataToSend.birthDate && typeof dataToSend.birthDate === 'string' && dataToSend.birthDate.includes('T')) {
         // Asigură-te că data este într-un format consistent dacă e deja string
        dataToSend.birthDate = new Date(dataToSend.birthDate).toISOString();
    }


    const leadsCollection = collection(db, "leads");

    addDoc(leadsCollection, dataToSend).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: leadsCollection.path,
            operation: 'create',
            requestResourceData: { ...dataToSend, timestamp: new Date().toISOString() }, // Approximate timestamp
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });
}


type ConversationStep = {
    message: ((data: any) => string) | string;
    actionType: UserAction['type'] | 'end';
    options?: any;
    handler?: ((response: any, data: any) => void) | string;
    nextStep: ((response?: any, data?: any, loadedFlow?: any) => string) | string;
    autoContinue?: boolean;
    isProgressStep?: boolean;
    delay?: number;
};

type ConversationFlow = {
    [key: string]: ConversationStep;
};

const commonFlow: ConversationFlow = {
    end_dialog_friendly: {
        message: () => "Mulțumesc pentru timpul acordat! Un consultant te va contacta în curând.",
        actionType: 'end',
        nextStep: () => ''
    },
    end_dialog_success: {
        message: () => "Analiza a fost finalizată cu succes! Vei fi contactat de un consultant pentru a discuta rezultatele.",
        actionType: 'end',
        nextStep: () => ''
    }
};


const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const calculateDynamicDelay = (text: string): number => {
    const BASE_DELAY = 50; 
    const WORDS_PER_SECOND = 4; 

    if (!text) return BASE_DELAY;

    const cleanText = text.replace(/&lt;[^&gt;]*&gt;?/gm, '');
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

    const readingTime = (wordCount / WORDS_PER_SECOND) * 1000;
    
    return Math.max(BASE_DELAY, Math.min(readingTime, 400));
}

const performDynamicCalculations = (data: any) => {
    const newData = { ...data };

    const parse = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        const clean = String(val).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
        return Number(clean) || 0;
    };

    // === SCENARIUL 1: DECES ===
    if (newData.deces_ask_monthly_sum && newData.deces_ask_period) {
        newData.deficit1_deces = parse(newData.deces_ask_monthly_sum) * parse(newData.deces_ask_period) * 12;
        newData.bruteDeficit_deces = newData.deficit1_deces + parse(newData.deces_ask_event_costs) + parse(newData.deces_ask_projects) + parse(newData.deces_ask_debts);
        newData.finalDeficit_deces = newData.bruteDeficit_deces - (parse(newData.deces_ask_insurance) + parse(newData.deces_ask_savings));
    }

    // === SCENARIUL 2: PENSIE ===
    if (newData.pensie_ask_monthly_needed && newData.pensie_ask_years) {
        const years = parse(newData.pensie_ask_years) || 20; 
        newData.deficit1_pensie = parse(newData.pensie_ask_monthly_needed) * years * 12;

        const totalNeed = newData.deficit1_pensie + parse(newData.pensie_ask_projects) + parse(newData.pensie_ask_debts);
        newData.finalDeficit_pensie = totalNeed - (parse(newData.pensie_ask_insurance) + parse(newData.pensie_ask_savings));
    }

    // === SCENARIUL 3: STUDII COPII ===
    if (newData.studii_ask_annual_cost && newData.studii_ask_years) {
        newData.deficit1_studii = parse(newData.studii_ask_annual_cost) * parse(newData.studii_ask_years);
        const perChild = newData.deficit1_studii + parse(newData.studii_ask_extra) + parse(newData.studii_ask_projects) + parse(newData.studii_ask_wedding) - (parse(newData.studii_ask_savings) + parse(newData.studii_ask_insurance));
        const children = parse(newData.studii_ask_children_count) || 1;
        newData.finalDeficit_studii = perChild * children;
    }

    return newData;
};


const formatMessage = (template: string, data: any): string => {
    if (!template) return "";
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        const value = data[key];
        if (value !== undefined && value !== null) {
            if (typeof value === 'number') {
                return value.toLocaleString('ro-RO');
            }
            return String(value);
        }
        return match; // Lasă placeholder-ul dacă data nu există
    });
};


export default function ChatAppClient() {
    const searchParams = useSearchParams();
    const agentIdRef = useRef<string | null>(null);
    useEffect(() => {
        agentIdRef.current = searchParams.get('agentId');
    }, [searchParams]);

    const [view, setView] = useState<"landing" | "chat">("landing");
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [conversation, setConversation] = useState<Message[]>([]);
    const [currentUserAction, setCurrentUserAction] = useState<UserAction | null>(null);
    const [progress, setProgress] = useState(0);
    const [isConversationDone, setIsConversationDone] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    
    const [loadedFlow, setLoadedFlow] = useState<ConversationFlow | null>(null);
    const [startStepId, setStartStepId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    

    const allFlows = useMemo(() => ({
        ...(loadedFlow || {}),
        ...commonFlow
    }), [loadedFlow]);

    const getStep = useCallback((stepId: string): ConversationStep | null => {
        if (!stepId) return null;
        
        const step = allFlows[stepId];
        if (step) {
            return step;
        }

        console.error("Invalid stepId:", stepId);
        return null;
    }, [allFlows]);

    const PROGRESS_STEPS_IDS = useMemo(() => Object.keys(allFlows).filter(key => allFlows[key]?.isProgressStep), [allFlows]);
    const TOTAL_STEPS = PROGRESS_STEPS_IDS.length;

    const conversationIdRef = useRef(0);
    const currentStateRef = useRef<string | null>(null);
    const userDataRef = useRef<FinancialData>({});
    const currentProgressStep = useRef(0);

    const addMessage = useCallback((message: Omit<Message, "id" | "content">, content: string = "") => {
        const newMessage = { ...message, id: conversationIdRef.current++, content };
        setConversation((prev) => [...prev, newMessage]);
        return newMessage.id;
    }, []);
    
    const renderStep = useCallback(async (stepId: string) => {
        currentStateRef.current = stepId;
        
        // 1. Calculează datele dinamice
        userDataRef.current = performDynamicCalculations(userDataRef.current);
        
        const step = getStep(stepId);
    
        if (!step) {
            setIsTyping(false);
            setCurrentUserAction(null);
            return;
        }
    
        setCurrentUserAction(null);
    
        let messageContent = "";
        if (typeof step.message === 'function') {
            messageContent = step.message(userDataRef.current);
        } else {
            messageContent = step.message;
        }
    
        // 2. Formatează mesajul cu datele calculate
        const formattedMessage = formatMessage(messageContent, userDataRef.current);

        if (formattedMessage) {
            setIsTyping(true);
            await delay(step.delay || 1000);
            setIsTyping(false);
            addMessage({ author: "Marius", type: "text" }, formattedMessage);
            
            const dynamicDelay = calculateDynamicDelay(formattedMessage);
            await delay(dynamicDelay);
        }

        if (step.actionType === 'end') {
            setIsConversationDone(true);
            setCurrentUserAction({ type: 'end' });
            return;
        }
    
        const actionOptions = step.options;
    
        if (step.autoContinue) {
             const nextStepId = typeof step.nextStep === 'function' ? step.nextStep() : step.nextStep;
             await renderStep(nextStepId);
        } else {
            setCurrentUserAction({ type: step.actionType, options: actionOptions });
        }
    }, [addMessage, getStep]);

    const processUserResponse = useCallback(async (response: any) => {
        setCurrentUserAction(null);
    
        const currentStepId = currentStateRef.current;
        if (!currentStepId) {
            console.error("Cannot process response without a current state.");
            return;
        }
    
        const step = getStep(currentStepId);
        if (!step) return;
        
        if (step.isProgressStep) {
            currentProgressStep.current++;
            const newProgress = TOTAL_STEPS > 0 ? (currentProgressStep.current / TOTAL_STEPS) * 100 : 0;
            setProgress(newProgress);
        }
        
        const rawResponseValue = (typeof response === 'object' && response !== null && !Array.isArray(response)) 
            ? (response.id || response.value || response.label) 
            : response;

        const displayResponseValue = (typeof response === 'object' && response !== null && response.label) ? response.label : response;
        
        let userMessageContent: string | null = null;
    
        if (step.actionType === 'input' && step.options?.type === 'number') {
            const numValue = Number(displayResponseValue);
            userMessageContent = isNaN(numValue) ? String(displayResponseValue) : numValue.toLocaleString('ro-RO');
        } else if (typeof displayResponseValue === 'number') {
            userMessageContent = displayResponseValue.toLocaleString('ro-RO');
        } else if (typeof displayResponseValue === 'string' && displayResponseValue.trim() !== '') {
            userMessageContent = displayResponseValue;
        } else if (Array.isArray(response) && response.length > 0) {
            userMessageContent = response.map(item => (item.label || item)).join(', ');
        } else if (displayResponseValue instanceof Date) {
            userMessageContent = format(displayResponseValue, "dd/MM/yyyy");
        } else if (typeof response === 'object' && response !== null && response.name) { // Contact form
            userMessageContent = `Datele au fost trimise.`;
        }
        
        if (userMessageContent !== null && (userMessageContent.trim() !== '' || typeof displayResponseValue === 'number')) {
             if (typeof displayResponseValue === 'number' && displayResponseValue === 0 && (step.options?.type === 'number' && step.options?.placeholder)) {
                 // Don't show '0' for optional numeric fields, let it be silent
             } else {
                 addMessage({ author: "user", type: "response" }, userMessageContent);
             }
        }
        
        const isNavigationButton = 
            step.actionType === 'buttons' && 
            (typeof rawResponseValue === 'string') &&
            ['Continuă', 'Start', 'Da, continuăm', 'Sunt gata', 'Da'].includes(rawResponseValue);
    
        if (currentStepId && !isNavigationButton) {
            userDataRef.current[currentStepId as keyof FinancialData] = rawResponseValue;
            console.log(`[Data Capture] Saved ${currentStepId}:`, rawResponseValue);
        }
    
        if (step.handler && typeof step.handler === 'function') {
            step.handler(rawResponseValue, userDataRef.current);
        }
    
        if (step.actionType === 'form') {
            userDataRef.current.contact = response;
            await saveLeadToFirestore(userDataRef.current, agentIdRef.current);
        }
        
        let nextStepId;
        if (typeof response === 'object' && response !== null && response.nextStep) {
            nextStepId = response.nextStep;
        } 
        else if (typeof step.nextStep === 'function') {
            nextStepId = step.nextStep(rawResponseValue, userDataRef.current, loadedFlow);
        } else if (typeof step.nextStep === 'string') {
            nextStepId = step.nextStep;
        } else {
            console.error("Eroare critică: nextStep nu este nici funcție, nici string valid.", step);
            return; 
        }
        
        await renderStep(nextStepId);
    
    }, [addMessage, renderStep, getStep, TOTAL_STEPS, loadedFlow]);

    const startConversation = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);
        
        try {
            const agentId = agentIdRef.current;
            if (!agentId) {
                throw new Error("Link invalid sau incomplet. Te rog contactează consultantul tău.");
            }

            const agentRef = doc(db, "agents", agentId);
            const agentDoc = await getDoc(agentRef);
            if (!agentDoc.exists()) {
                throw new Error("Agentul nu a fost găsit.");
            }

            const activeFormId = agentDoc.data().activeFormId;
            if (!activeFormId) {
                throw new Error("Acest agent nu are un formular activ configurat.");
            }

            const formRef = doc(db, "formTemplates", activeFormId);
            const formDoc = await getDoc(formRef);
            if (!formDoc.exists()) {
                throw new Error("Formularul configurat nu a fost găsit.");
            }
            
            const formData = formDoc.data();
            setLoadedFlow(formData.flow as ConversationFlow);
            
            setStartStepId(formData.startStepId || 'welcome_1');

        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleStart = () => {
        setIsFadingOut(true);
        setTimeout(() => {
            setView("chat");
            setIsFadingOut(false);
            startConversation();
        }, 500);
    };

    useEffect(() => {
        if (loadedFlow && startStepId && view === 'chat' && conversation.length === 0) {
            userDataRef.current = {};
            conversationIdRef.current = 0;
            currentProgressStep.current = 0;
            setProgress(0);
            setIsConversationDone(false);
            renderStep(startStepId);
        }
    }, [loadedFlow, startStepId, view, conversation.length, renderStep]);


    return (
        <>
            <div className="container mx-auto h-full max-h-[-webkit-fill-available] p-0 flex flex-col">
                {view === "landing" ? (
                    <LandingView onStart={handleStart} isFadingOut={isFadingOut} />
                ) : (
                    <>
                        {isLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-50 text-primary">
                                <p className="text-xl animate-pulse">Se încarcă configurația...</p>
                                <p className="text-sm text-foreground/70 mt-2">Te rog așteaptă...</p>
                            </div>
                        )}

                        {(!isLoading && !errorMessage) && (
                            <ChatView
                                conversation={conversation}
                                userAction={currentUserAction}
                                onResponse={processUserResponse}
                                progress={progress}
                                isConversationDone={isConversationDone}
                                isTyping={isTyping}
                                isLoading={false} // Pass false as it's handled here
                                errorMessage={null}  // Pass null as it's handled here
                            />
                        )}

                        {errorMessage && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-50 p-4 text-center">
                                <h2 className="text-xl font-bold text-destructive mb-2">Eroare de configurare</h2>
                                <p className="text-foreground/80">{errorMessage}</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

    

    



    

    