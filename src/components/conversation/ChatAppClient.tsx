
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
import SaaSLandingView from "@/components/marketing/SaaSLandingView";
import Footer from "@/components/ui/Footer";


async function trackConversationStart(agentId: string, templateId: string) {
    try {
        const analyticsCollection = collection(db, "analytics");
        await addDoc(analyticsCollection, {
            agentId,
            templateId,
            type: 'conversation_start',
            timestamp: serverTimestamp()
        });
    } catch (error) {
        // We don't want to block the user if tracking fails, so just log it.
        console.error("Error tracking conversation start:", error);
    }
}


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
    message: ((data: any) => string | string[]) | string | string[];
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
    const BASE_DELAY = 400; 
    const WORDS_PER_SECOND = 10; 

    if (!text) return BASE_DELAY;

    const cleanText = text.replace(/<[^>]*>?/gm, '');
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

    const readingTime = (wordCount / WORDS_PER_SECOND) * 1000;
    
    return Math.max(BASE_DELAY, Math.min(readingTime, 2000));
}

const performDynamicCalculations = (data: any) => {
    const newData = { ...data };
    
    // Helper Robust: Transformă orice string "12.000" sau "12,000" în numărul 12000
    const parse = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        // Păstrează doar cifrele (0-9), elimină tot restul
        const clean = String(val).replace(/[^0-9]/g, '');
        return Number(clean) || 0;
    };
    // === 1. STUDII COPII (Fix pentru problema ta curentă) ===
    if (newData.studii_ask_annual_cost || newData.studii_ask_years) {
        const annual = parse(newData.studii_ask_annual_cost);
        // Extragem doar prima cifra din "5 ani" -> 5
        const yearsString = String(newData.studii_ask_years || "0");
        const years = parseInt(yearsString) || 0;
        newData.deficit1 = annual * years;
        // Calcul Final Studii
        const extra = parse(newData.studii_ask_extra) + 
                      parse(newData.studii_ask_projects) + 
                      parse(newData.studii_ask_wedding);
        const resources = parse(newData.studii_ask_savings) + 
                          parse(newData.studii_ask_insurance);
        const perChild = newData.deficit1 + extra - resources;
        const children = parse(newData.studii_ask_children_count) || 1;
        newData.finalDeficit = perChild * children;
    }
    // === 2. DECES ===
    if (newData.deces_ask_monthly_sum || newData.deces_ask_period) {
        const sum = parse(newData.deces_ask_monthly_sum);
        const yearsString = String(newData.deces_ask_period || "0");
        const years = parseInt(yearsString) || 0;
        
        newData.deficit1 = sum * years * 12;
        const costs = parse(newData.deces_ask_event_costs) + 
                      parse(newData.deces_ask_projects) + 
                      parse(newData.deces_ask_debts);
        const resources = parse(newData.deces_ask_insurance) + parse(newData.deces_ask_savings);
        
        newData.bruteDeficit = newData.deficit1 + costs;
        newData.finalDeficit = newData.bruteDeficit - resources;
    }
    // === 3. PENSIONARE ===
    if (newData.pensie_ask_monthly_needed || newData.pensie_ask_years) {
        const monthly = parse(newData.pensie_ask_monthly_needed);
        const yearsString = String(newData.pensie_ask_years || "0");
        const years = parseInt(yearsString) || 0;
        newData.deficit1 = monthly * years * 12;
        const needs = newData.deficit1 + 
                      parse(newData.pensie_ask_projects) + 
                      parse(newData.pensie_ask_debts);
        const resources = parse(newData.pensie_ask_insurance) + 
                          parse(newData.pensie_ask_savings);
        newData.finalDeficit = needs - resources;
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
        return match; // Keep placeholder if data not available
    });
};


export default function ChatAppClient() {
    const searchParams = useSearchParams();
    const agentIdRef = useRef<string | null>(null);
    const hasTrackedStartRef = useRef(false);
    const [hasCheckedParams, setHasCheckedParams] = useState(false);

    useEffect(() => {
        agentIdRef.current = searchParams.get('agentId');
        setHasCheckedParams(true);
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
        
        userDataRef.current = performDynamicCalculations(userDataRef.current);
        
        const step = getStep(stepId);
    
        if (!step) {
            setIsTyping(false);
            setCurrentUserAction(null);
            console.error(`Step "${stepId}" not found in flow.`);
            return;
        }
    
        setCurrentUserAction(null);
    
        let rawMessageContent;
        if (typeof step.message === 'function') {
            rawMessageContent = step.message(userDataRef.current);
        } else {
            rawMessageContent = step.message;
        }

        const messagesToShow = Array.isArray(rawMessageContent) ? rawMessageContent : (rawMessageContent ? [rawMessageContent] : []);

        for (const [index, msg] of messagesToShow.entries()) {
            const formattedMessage = formatMessage(msg, userDataRef.current);
            setIsTyping(true);
            await delay(step.delay || 800);
            setIsTyping(false);
            addMessage({ author: "Marius", type: "text" }, formattedMessage);

             if (index < messagesToShow.length - 1) {
                await delay(calculateDynamicDelay(formattedMessage));
            }
        }

        if (step.actionType === 'end') {
            setIsConversationDone(true);
            setCurrentUserAction({ type: 'end' });
            return;
        }
    
        if (step.autoContinue && step.nextStep) {
             const nextStepId = typeof step.nextStep === 'function' ? step.nextStep(undefined, userDataRef.current, loadedFlow) : step.nextStep;
             await delay(500); // Small pause before auto-continuing
             await renderStep(nextStepId);
        } else {
            setCurrentUserAction({ type: step.actionType, options: step.options });
        }
    }, [addMessage, getStep, loadedFlow]);

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
                // This case is handled by the parent component (shows SaaS landing)
                // but as a fallback, we throw an error that can be displayed.
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

            // Track conversation start
            if (!hasTrackedStartRef.current) {
                await trackConversationStart(agentId, activeFormId);
                hasTrackedStartRef.current = true;
            }

            const formRef = doc(db, "formTemplates", activeFormId);
            const formDoc = await getDoc(formRef);
            if (!formDoc.exists()) {
                throw new Error("Formularul configurat nu a fost găsit.");
            }
            
            const formData = formDoc.data();
            setLoadedFlow(formData.flow as ConversationFlow);
            
            setStartStepId(formData.startStepId || Object.keys(formData.flow)[0]);

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
            if (agentIdRef.current) {
                startConversation();
            }
        }, 500);
    };

    useEffect(() => {
        if (view === 'chat' && agentIdRef.current && loadedFlow && startStepId && conversation.length === 0) {
            userDataRef.current = {};
            conversationIdRef.current = 0;
            currentProgressStep.current = 0;
            setProgress(0);
            setIsConversationDone(false);
            renderStep(startStepId);
        }
    }, [loadedFlow, startStepId, view, conversation.length, renderStep]);

    if (!hasCheckedParams) {
        return <div className="flex items-center justify-center h-full">Se încarcă...</div>;
    }

    if (!agentIdRef.current) {
        return <SaaSLandingView />;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="container mx-auto h-full max-h-[-webkit-fill-available] p-0 flex flex-col flex-grow">
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
                                isLoading={false}
                                errorMessage={null}
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
            <Footer />
        </div>
    );
}
