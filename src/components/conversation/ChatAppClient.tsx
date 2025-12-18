
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import LandingView from "@/components/conversation/landing-view";
import ChatView from "@/components/conversation/chat-view";
import type { Message, UserAction } from "@/components/conversation/chat-view";
import { format } from "date-fns";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, query, where, getDocs } from "firebase/firestore";
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
        status: 'Nou', // Adaugă statusul default aici
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
    if (Array.isArray(dataToSend.sanatate_control_tratament)) {
        dataToSend.sanatate_control_tratament = dataToSend.sanatate_control_tratament.join(', ');
    }
     if (Array.isArray(dataToSend.sanatate_situatie_curenta)) {
        dataToSend.sanatate_situatie_curenta = dataToSend.sanatate_situatie_curenta.join(', ');
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
    branchStart?: boolean;
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
    const FAST_DELAY = 150; // Delay foarte scurt, in milisecunde
    return FAST_DELAY;
}

const performDynamicCalculations = (data: any) => {
    const newData = { ...data };
    
    const parse = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        const clean = String(val).replace(/[^0-9]/g, '');
        return Number(clean) || 0;
    };
    
    const extractNumber = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        const match = String(val).match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    };

    // === DECES ===
    if (newData.deces_suma_lunara || newData.deces_perioada_suport) {
        const sum = parse(newData.deces_suma_lunara);
        const years = extractNumber(newData.deces_perioada_suport);
        
        newData.deficit1 = sum * years * 12;
        const costs = parse(newData.deces_costuri_eveniment) + 
                      parse(newData.deces_proiecte_in_desfasurare) + 
                      parse(newData.deces_datorii_credite);
        const resources = parse(newData.deces_asigurari_existente) + parse(newData.deces_economii_existente);
        
        newData.bruteDeficit = newData.deficit1 + costs;
        newData.finalDeficit = newData.bruteDeficit - resources;
    }
    
    // === PENSIONARE ===
    if (newData.pensie_suma_lunara_necesara || newData.pensie_ani_speranta) {
        const monthly = parse(newData.pensie_suma_lunara_necesara);
        const years = extractNumber(newData.pensie_ani_speranta);
        newData.deficit1 = monthly * years * 12;
        
        const needs = newData.deficit1 + 
                      (parse(newData.pensie_suma_proiecte) * years) + // Suma proiectelor e anuala
                      parse(newData.pensie_datorii);
        const resources = parse(newData.pensie_asigurari_existente) + 
                          parse(newData.pensie_economii_existente);
                          
        newData.bruteDeficit = needs; // Brute deficit for pensie is the total need
        newData.finalDeficit = needs - resources;
    }

    // === STUDII COPII ===
    if (newData.studii_suma_cost_anual || newData.studii_ani_sustinere) {
        const annual = parse(newData.studii_suma_cost_anual);
        const years = extractNumber(newData.studii_ani_sustinere);
        newData.deficit1 = annual * years;
        
        const extra = (parse(newData.studii_suma_extra) * years) + 
                      parse(newData.studii_suma_proiecte) + 
                      parse(newData.studii_nunta);
        const resources = parse(newData.studii_economii_existente) + 
                          parse(newData.studii_asigurari_existente);

        newData.bruteDeficit = newData.deficit1 + extra; // Total cost before savings
        const perChild = newData.deficit1 + extra - resources;
        newData.finalDeficitOneChild = perChild; // Store deficit for one child

        const children = parse(newData.studii_numar_copii) || 1;
        newData.finalDeficit = perChild * children;
    }

    return newData;
};


const formatMessage = (template: string, data: any): string => {
    if (!template) return "";
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
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

const countProgressStepsInPath = (flow: ConversationFlow, startStepId: string): number => {
    if (!startStepId || !flow[startStepId]) return 0;
    
    let count = 0;
    const queue = [startStepId];
    const visited = new Set([startStepId]);
    
    // Pași comuni care pot termina un flux, dar pe care dorim să-i explorăm
    const commonEndPoints = ['formular_contact', 'final_dialog_prietenos', 'multumire_contact', 'multumire_final'];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentStep = flow[currentId];

        if (!currentStep) continue;

        if (currentStep.isProgressStep) {
            count++;
        }

        const exploreNext = (nextId: string | undefined) => {
            if (nextId && (!visited.has(nextId) || commonEndPoints.includes(nextId))) {
                visited.add(nextId);
                queue.push(nextId);
            }
        };

        if (currentStep.actionType === 'buttons' && Array.isArray(currentStep.options)) {
            currentStep.options.forEach(opt => {
                if (typeof opt === 'object' && opt.nextStep) {
                    exploreNext(opt.nextStep);
                } else if (currentStep.nextStep && typeof currentStep.nextStep === 'string') {
                    // Cazul pentru butoane simple care folosesc nextStep principal
                    exploreNext(currentStep.nextStep as string);
                }
            });
        }
        
        if (typeof currentStep.nextStep === 'string') {
            exploreNext(currentStep.nextStep);
        }
    }
    return count;
};



export default function ChatAppClient() {
    const searchParams = useSearchParams();
    const agentIdRef = useRef<string | null>(null);
    const hasTrackedStartRef = useRef(false);
    const [hasCheckedParams, setHasCheckedParams] = useState(false);
    
    const [agentData, setAgentData] = useState<{name?: string, contactPhone?: string, contactEmail?: string} | null>(null);

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
    
    const allFlows = useMemo(() => ({ ...(loadedFlow || {}), ...commonFlow }), [loadedFlow]);

    const conversationIdRef = useRef(0);
    const currentStateRef = useRef<string | null>(null);
    const userDataRef = useRef<FinancialData>({});
    const currentProgressStep = useRef(0);
    const totalProgressSteps = useRef(99); // Start with a high number
    const initialProgressStepsCount = useRef(0);

    const addMessage = useCallback((message: Omit<Message, "id" | "content">, content: string = "") => {
        const newMessage = { ...message, id: conversationIdRef.current++, content };
        setConversation((prev) => [...prev, newMessage]);
        return newMessage.id;
    }, []);

    // Refs to hold function logic to break dependency cycles
    const renderStepRef = useRef<(stepId: string) => Promise<void>>(async () => {});
    const processUserResponseRef = useRef<(response: any) => Promise<void>>(async () => {});

    const renderStep = useCallback((stepId: string) => renderStepRef.current(stepId), []);
    const processUserResponse = useCallback((response: any) => processUserResponseRef.current(response), []);

    useEffect(() => {
        renderStepRef.current = async (stepId: string) => {
            currentStateRef.current = stepId;
            const step = allFlows[stepId];
        
            if (!step) {
                setIsTyping(false);
                setCurrentUserAction(null);
                console.error(`Step "${stepId}" not found in flow.`);
                return;
            }
        
            setCurrentUserAction(null);
        
            if (step.isProgressStep) {
                currentProgressStep.current++;
                const newProgress = totalProgressSteps.current > 0 ? (currentProgressStep.current / totalProgressSteps.current) * 100 : 0;
                setProgress(Math.min(newProgress, 100)); // Ensure it doesn't exceed 100
            }

            let rawMessageContent = typeof step.message === 'function' ? step.message(userDataRef.current) : step.message;
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
                 await delay(500); 
                 await renderStep(nextStepId);
            } else {
                setCurrentUserAction({ type: step.actionType, options: step.options });
            }
        };

        processUserResponseRef.current = async (response: any) => {
            setCurrentUserAction(null);
            const currentStepId = currentStateRef.current;
            if (!currentStepId) return;
        
            const step = allFlows[currentStepId];
            if (!step) return;

            const isNavigationButton = step.actionType === 'buttons' && ['Continuă', 'Start', 'Da, continuăm', 'Sunt gata', 'Da'].includes(typeof response === 'object' ? response.label : response);
            
            let userMessageContent: string | null = null;

            if (step.actionType === 'form') {
                 // For forms, create a summary message
                userMessageContent = "Datele au fost trimise cu succes.";
                userDataRef.current.contact = {
                    name: response.name,
                    email: response.email,
                    phone: response.phone,
                };
                userDataRef.current.contact_preference = response.contact_preference;

                // Save immediately
                await saveLeadToFirestore(userDataRef.current, agentIdRef.current);
            } else {
                 const rawResponseValue = (typeof response === 'object' && response !== null && !Array.isArray(response)) ? (response.id || response.value || response.label) : response;
                
                if (currentStepId) {
                     if (step.options?.minLength && String(rawResponseValue).length < step.options.minLength) {
                        addMessage({ author: "Marius", type: "text" }, `Te rog oferă un răspuns de cel puțin ${step.options.minLength} caractere.`);
                        setCurrentUserAction({ type: step.actionType, options: step.options });
                        return;
                    }
                    if (!isNavigationButton) {
                        userDataRef.current[currentStepId as keyof FinancialData] = rawResponseValue;
                    }
                }

                if (Array.isArray(response)) {
                    userMessageContent = response.map(item => (item.label || item)).join(', ');
                } else if (response instanceof Date) {
                    userMessageContent = format(response, "dd/MM/yyyy");
                } else if (typeof response === 'object' && response.label) {
                    userMessageContent = response.label;
                } else {
                    userMessageContent = String(response);
                }
            }
            
            if (userMessageContent && userMessageContent.trim() !== '') {
                 addMessage({ author: "user", type: "response" }, userMessageContent);
            }
            
            // Call calculation function AFTER saving the user response
            userDataRef.current = performDynamicCalculations(userDataRef.current);

            if (step.branchStart) {
                const nextStepIdForBranch = typeof response === 'object' && response.nextStep ? response.nextStep : (typeof step.nextStep === 'function' ? step.nextStep(response) : step.nextStep);
                if (nextStepIdForBranch) {
                    const stepsInBranch = countProgressStepsInPath(allFlows, nextStepIdForBranch);
                    totalProgressSteps.current = initialProgressStepsCount.current + stepsInBranch;
                }
            }

            let nextStepId;
            if (typeof response === 'object' && response !== null && response.nextStep) {
                nextStepId = response.nextStep;
            } else if (typeof step.nextStep === 'function') {
                nextStepId = step.nextStep(response, userDataRef.current, loadedFlow);
            } else if (typeof step.nextStep === 'string') {
                nextStepId = step.nextStep;
            } else {
                return; 
            }
            
            await renderStep(nextStepId);
        };
    }, [allFlows, addMessage, loadedFlow]);


    const startConversation = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);
        
        try {
            const agentId = agentIdRef.current;
            if (!agentId) throw new Error("Link invalid sau incomplet. Te rog contactează consultantul tău.");
            
            const agentRef = doc(db, "agents", agentId);
            const agentDoc = await getDoc(agentRef);
            if (!agentDoc.exists()) throw new Error("Agentul nu a fost găsit.");
            
            const agentProfile = agentDoc.data();
            setAgentData({ 
                name: agentProfile.name || 'un consultant',
                contactPhone: agentProfile.contactPhone, 
                contactEmail: agentProfile.contactEmail 
            });
            // Adaugă numele agentului în datele conversației pentru a fi folosit de placeholder
            userDataRef.current.agentName = agentProfile.name || 'un consultant';

            // Admin bypass
            const isAdmin = agentProfile.email === 'alinmflavius@gmail.com';

            if (!isAdmin) {
                const subscriptionsQuery = query(
                    collection(db, 'customers', agentId, 'subscriptions'),
                    where('status', 'in', ['trialing', 'active'])
                );
                const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
                if (subscriptionsSnapshot.empty) {
                    throw new Error("Acest formular este inactiv. Agentul nu are un abonament activ.");
                }
            }

            const activeFormId = agentProfile.activeFormId;
            if (!activeFormId) throw new Error("Acest agent nu are un formular activ configurat.");
            
            // Safety check for contact phone
             if (!agentProfile.contactPhone) {
                throw new Error("Formularul este momentan inactiv. Te rugăm să revii mai târziu.");
            }

            if (!hasTrackedStartRef.current) {
                await trackConversationStart(agentId, activeFormId);
                hasTrackedStartRef.current = true;
            }

            const formRef = doc(db, "formTemplates", activeFormId);
            const formDoc = await getDoc(formRef);
            if (!formDoc.exists()) throw new Error("Formularul configurat nu a fost găsit.");
            
            const flow = formDoc.data().flow as ConversationFlow;
            const startId = formDoc.data().startStepId || Object.keys(flow)[0];
            
            // Calcul initial progres
            let branchPointFound = false;
            let stepsBeforeBranch = 0;
            let currentId = startId;
            const visited = new Set();

            while(currentId && !branchPointFound && !visited.has(currentId)){
                visited.add(currentId);
                const step = flow[currentId];
                if(!step) break;

                if(step.isProgressStep) {
                    stepsBeforeBranch++;
                }
                if(step.branchStart){
                    branchPointFound = true;
                }
                if (typeof step.nextStep === 'string') {
                    currentId = step.nextStep;
                } else {
                    currentId = ''; // Stop if nextStep is not a simple string
                }
            }
            
            initialProgressStepsCount.current = stepsBeforeBranch;
            totalProgressSteps.current = countProgressStepsInPath(flow, startId);

            setLoadedFlow(flow);
            setStartStepId(startId);

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
            userDataRef.current = { ...userDataRef.current }; // Keep agentName if already set
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
                                agentContact={agentData}
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
