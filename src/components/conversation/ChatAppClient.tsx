
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import LandingView from "@/components/conversation/landing-view";
import ChatView from "@/components/conversation/chat-view";
import type { Message, UserAction } from "@/components/conversation/chat-view";
import { format } from "date-fns";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";
import type { FinancialData } from "@/lib/calculation";


async function saveLeadToFirestore(data: any, agentId: string | null) {
    if (!agentId) {
        console.error("Eroare critică: ID-ul agentului lipsește la trimitere.");
        return; 
    }
    
    const dataToSend = { ...data };

    if (Array.isArray(dataToSend.dramaticOptions)) {
        dataToSend.dramaticOptions = dataToSend.dramaticOptions.join(', ');
    }
    if (Array.isArray(dataToSend.priorities)) {
        dataToSend.priorities = dataToSend.priorities.join(', ');
    }

    const leadsCollection = collection(db, "leads");

    addDoc(leadsCollection, { 
        ...dataToSend, 
        agentId: agentId,
        timestamp: serverTimestamp()
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: leadsCollection.path,
            operation: 'create',
            requestResourceData: { ...dataToSend, agentId, timestamp: new Date().toISOString() }, // Approximate timestamp
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
        message: () => "",
        actionType: 'end',
        nextStep: () => ''
    },
    end_dialog_success: {
        message: () => "",
        actionType: 'end',
        nextStep: () => ''
    }
};

const introFlow: ConversationFlow = {
    welcome_1: {
        message: () => `Salut!`,
        actionType: 'buttons',
        options: [],
        nextStep: () => 'welcome_2',
        autoContinue: true,
        delay: 500,
    },
    welcome_2: {
        message: () => `Sunt Marius, consultantul tău financiar.`,
        actionType: 'buttons',
        options: [],
        nextStep: () => 'welcome_3',
        autoContinue: true,
        delay: 1200,
    },
    welcome_3: {
        message: () => `În următoarele 3 minute te invit la un moment de reflecție și de analiză prin care să descoperi care este gradul tău de expunere financiară.`,
        actionType: 'buttons',
        options: [],
        nextStep: () => 'welcome_4',
        autoContinue: true,
        delay: 1200,
    },
    welcome_4: {
        message: () => `Această analiză nu implică nicio obligație din partea ta.`,
        actionType: 'buttons',
        options: ['Continuă'],
        nextStep: () => 'intro_1'
    },
    intro_1: {
        message: () => `Viața produce pierderi financiare semnificative în patru situații majore.`,
        actionType: 'buttons',
        options: ['Continuă'],
        nextStep: () => 'intro_2',
    },
    intro_2: {
        message: () => `Dintre acestea, două situații sunt previzibile, precis așezate pe axa vieții, iar două sunt total imprevizibile.`,
        actionType: 'buttons',
        options: ['Continuă'],
        nextStep: () => 'intro_3',
    },
    intro_3: {
        message: () => `<strong>Previzibile:</strong> \n\n
1. Pensionarea - reducerea drastică a opțiunilor, a demnității și a statutului de susținător al familiei\n\n
2. Studiile copiilor - cheltuieli complexe, unele neanticipate, care pun presiune pe bugetul familiei`,
        actionType: 'buttons',
        options: ['Continuă'],
        nextStep: () => 'intro_4',
    },
    intro_4: {
        message: () => `<strong>Imprevizibile:</strong> \n\n
1. Decesul - detonează standardul de viață, proiectele în desfășurare și viitorul copiilor \n\n
2. Bolile grave - Accident Vascular cerebral, Cancer, Infarct Miocardic, Transplant, etc,`,
        actionType: 'buttons',
        options: ['Continuă'],
        nextStep: () => 'ask_priority',
    },
    ask_priority: {
        message: () => "Pentru care dintre aceste subiecte dorești să îți calculezi gradul de expunere financiară?",
        actionType: 'multi_choice',
        isProgressStep: true,
        options: [
            { label: 'Reducerea drastică a veniturilor la pensionare', id: 'pensionare', disabled: true },
            { label: 'Asigurarea viitorului copiilor', id: 'studii_copii', disabled: true },
            { label: 'Decesul spontan', id: 'deces', disabled: false },
            { label: 'Protecție în caz de boală gravă', id: 'boala_grava', disabled: true }
        ],
        handler: (response, data) => { data.priorities = response; },
        nextStep: (response, data, loadedFlow) => {
            if (!response || response.length === 0) return 'end_dialog_friendly';
            const selectedId = response.find((r: string) => r === 'deces') || response[0];
            if (loadedFlow) {
                const firstStepKey = Object.keys(loadedFlow).find(key => key.startsWith(`${selectedId}.`));
                return firstStepKey || 'end_dialog_friendly';
            }
            return 'end_dialog_friendly';
        }
    },
};


const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const calculateDynamicDelay = (text: string): number => {
    const BASE_DELAY = 50; 
    const WORDS_PER_SECOND = 4; 

    if (!text) return BASE_DELAY;

    const cleanText = text.replace(/<[^>]*>?/gm, '');
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

    const readingTime = (wordCount / WORDS_PER_SECOND) * 1000;
    
    return Math.max(BASE_DELAY, Math.min(readingTime, 400));
}


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
        ...introFlow,
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

        if (messageContent) {
            setIsTyping(true);
            await delay(step.delay || 1000);
            setIsTyping(false);
            addMessage({ author: "Marius", type: "text" }, messageContent);
            
            const dynamicDelay = calculateDynamicDelay(messageContent);
            await delay(dynamicDelay);
        }

        if (step.actionType === 'end') {
            setIsTyping(false);
            setIsConversationDone(true);
            setCurrentUserAction(null);
            if (Object.keys(userDataRef.current).length > 1) { // more than just priorities
                await saveLeadToFirestore(userDataRef.current, agentIdRef.current);
            }
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

        if (!currentStateRef.current) {
            console.error("Cannot process response without a current state.");
            return;
        }

        const step = getStep(currentStateRef.current);
        if (!step) return;
        
        if (step.isProgressStep) {
            currentProgressStep.current++;
            const newProgress = TOTAL_STEPS > 0 ? (currentProgressStep.current / TOTAL_STEPS) * 100 : 0;
            setProgress(newProgress);
        }
        
        const responseValue = (typeof response === 'object' && response !== null && response.label) ? response.label : response;
        
        let userMessageContent: string | null = null;

        if (step.actionType === 'input' && step.options?.type === 'number') {
            const numValue = Number(response);
            userMessageContent = isNaN(numValue) ? String(response) : numValue.toLocaleString('ro-RO');
        } else if (typeof response === 'number') {
            userMessageContent = response.toLocaleString('ro-RO');
        } else if (typeof response === 'string' && response.trim() !== '') {
            userMessageContent = response;
        } else if (Array.isArray(response) && response.length > 0) {
            const labels = response.map(item => {
                if (typeof item === 'object' && item !== null && item.label) {
                    return item.label;
                }
                return item;
            });
            userMessageContent = labels.join(', ');
        } else if (response instanceof Date) {
            userMessageContent = format(response, "dd/MM/yyyy");
        } else if (typeof response === 'object' && response !== null) {
            if (response.name) { // Contact form
                userMessageContent = `Nume: ${response.name}, Email: ${response.email}, Telefon: ${response.phone}`;
            } else if (response.label) { // Single choice from button list
                userMessageContent = response.label;
            }
        }
        
        if (userMessageContent !== null && (userMessageContent.trim() !== '' || typeof response === 'number')) {
             if (typeof response === 'number' && response === 0 && (step.options?.type === 'number' && step.options?.placeholder)) {
                 // Don't show '0' for optional numeric fields, let it be silent
             } else {
                 addMessage({ author: "user", type: "response" }, userMessageContent);
             }
        }
        
        if (step.handler) {
            const handlerResponse = Array.isArray(response) ? response.map(r => r.id || r) : (response.id || responseValue);
            if (typeof step.handler === 'function') {
                step.handler(handlerResponse, userDataRef.current);
            } else {
                 // String handlers are deprecated due to security and complexity
            }
        }
        
        let nextStepId;
        if (typeof step.nextStep === 'function') {
            const processedResponse = Array.isArray(response) ? response.map(r => r.id || r) : (response.id || responseValue);
            nextStepId = step.nextStep(processedResponse, userDataRef.current, loadedFlow);
        } else if (typeof step.nextStep === 'string') {
            nextStepId = step.nextStep;
        } else {
            console.error("Eroare critică: nextStep nu este nici funcție, nici string valid.", step);
            return; 
        }

        if (nextStepId === 'common.end_dialog_success' || nextStepId === 'common.end_dialog_friendly') {
            await saveLeadToFirestore(userDataRef.current, agentIdRef.current);
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
