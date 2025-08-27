"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import LandingView from "@/components/conversation/landing-view";
import ChatView from "@/components/conversation/chat-view";
import type { Message, UserAction, UserData, FinancialData } from "@/components/conversation/chat-view";
import { 
    calculatePremium, 
    calculateDeathDeficit, 
    calculateCriticalIllnessDeficit, 
    calculateRetirementNeeds, 
    calculateChildStudiesNeeds 
} from "@/lib/calculation";
import { format } from "date-fns";

type ConversationStep = {
    message: (data: any) => string;
    actionType: UserAction['type'] | 'end' | 'calculation' | 'sequence';
    options?: any;
    handler?: (response: any, data: any) => void;
    nextStep: (response?: any, data?: any) => string;
};

type ConversationFlow = {
    [key: string]: ConversationStep;
};

type AllConversationFlows = {
    [key: string]: ConversationFlow;
}

const conversationFlows: AllConversationFlows = {
    // --- FLUXUL A: Protecție în caz de Deces ---
    deces: {
        start: {
            message: () => "Am înțeles. Protejarea familiei este esențială. Pentru a calcula exact plasa de siguranță, am nevoie de câteva detalii. Mai întâi, care ar fi suma lunară (în €) necesară pentru ca familia să mențină stilul de viață actual?",
            actionType: 'input',
            options: { placeholder: 'Ex: 1500', type: 'number' },
            handler: (response, data) => { data.monthlyExpenses = Number(response); },
            nextStep: () => 'ask_protection_period'
        },
        ask_protection_period: {
            message: () => "Perfect. Pentru ce perioadă (în ani) ai dori ca familia ta să aibă această siguranță financiară?",
            actionType: 'buttons',
            options: ['3 ani', '4 ani', '5 ani'],
            handler: (response, data) => { data.protectionPeriodYears = parseInt(response); },
            nextStep: () => 'ask_specific_costs'
        },
        ask_specific_costs: {
            message: () => "Ce sumă unică (în €) ar trebui să alocăm pentru cheltuieli neprevăzute (taxe, costuri funerare etc.)?",
            actionType: 'input',
            options: { placeholder: 'Ex: 5000', type: 'number' },
            handler: (response, data) => { data.specificEventCosts = Number(response); },
            nextStep: () => 'ask_future_projects'
        },
        ask_future_projects: {
            message: () => "Există proiecte în desfășurare (educația copiilor, etc.) care ar trebui protejate? Dacă da, care este suma necesară?",
            actionType: 'input',
            options: { placeholder: 'Ex: 20000 (sau 0)', type: 'number' },
            handler: (response, data) => { data.futureProjects = Number(response); },
            nextStep: () => 'ask_existing_insurance'
        },
        ask_existing_insurance: {
            message: () => "Acum, resursele existente. Aveți vreo asigurare de viață? Dacă da, ce sumă ar primi familia?",
            actionType: 'input',
            options: { placeholder: 'Ex: 10000 (sau 0)', type: 'number' },
            handler: (response, data) => { data.existingInsurance = Number(response); },
            nextStep: () => 'ask_savings'
        },
        ask_savings: {
            message: () => "Și în final, aveți economii sau investiții disponibile imediat?",
            actionType: 'input',
            options: { placeholder: 'Ex: 5000 (sau 0)', type: 'number' },
            handler: (response, data) => { data.savings = Number(response); },
            nextStep: () => 'calculate_deficit'
        },
        calculate_deficit: {
            message: () => "Se calculează...",
            actionType: 'calculation',
            handler: (_, data) => { data.deficit = calculateDeathDeficit(data); },
            nextStep: () => 'show_deficit'
        },
        show_deficit: {
            message: (data) => `Am finalizat calculul. Deficitul financiar, adică plasa de siguranță necesară, este de ${data.deficit.toLocaleString('ro-RO')} €.`,
            actionType: 'buttons',
            options: ['Continuă'],
            nextStep: () => 'emotional_sequence_intro'
        },
        emotional_sequence_intro: {
            message: () => "Este o sumă care te pune pe gânduri. Fără o planificare corectă, opțiunile partenerului de viață sunt adesea dureroase. Privește, te rog...",
            actionType: 'sequence',
            options: [
                "...să își ia un al doilea job și să dispară din viața copiilor.",
                "...să vândă casa sau bunuri cu valoare sentimentală.",
                "...să amâne sau să renunțe la educația copiilor.",
                "...să ceară ajutor financiar de la familie sau prieteni.",
                "...să acumuleze datorii pentru a supraviețui de la o lună la alta."
            ],
            nextStep: () => 'ask_dob'
        },
        ask_dob: {
            message: () => "Este un scenariu dificil, dar există soluții. Pentru a-ți oferi o estimare de cost, mai am nevoie de data nașterii.",
            actionType: 'date',
            handler: (response, data) => { data.birthDate = response as Date; },
            nextStep: () => 'calculate_premium'
        },
        calculate_premium: {
            message: () => "Se calculează prima...",
            actionType: 'calculation',
            handler: (_, data) => {
                const userDataForPremium: UserData = {
                    birthDate: data.birthDate, isSmoker: false, desiredSum: data.deficit, gender: 'Masculin'
                };
                data.monthlyPremium = calculatePremium(userDataForPremium).monthlyPremium;
            },
            nextStep: () => 'show_solution_cost'
        },
        show_solution_cost: {
            message: (data) => `Pentru a acoperi complet deficitul de ${data.deficit.toLocaleString('ro-RO')} €, costul estimat al unei asigurări ar fi de aproximativ ${data.monthlyPremium.toFixed(2)} € pe lună. Dorești să discuți cu un consultant?`,
            actionType: 'buttons',
            options: ['Da, vreau detalii', 'Nu acum'],
            nextStep: (response) => response === 'Da, vreau detalii' ? 'contact_form_intro' : 'end_dialog_friendly'
        },
    },

    // --- FLUXUL B: Protecție în caz de Boală Gravă ---
    boala_grava: {
        start: {
            message: () => "Am înțeles. Protejarea stabilității tale financiare în fața provocărilor medicale este esențială. Mai întâi, care este suma lunară (în €) de care ai avea nevoie pentru a acoperi cheltuielile curente dacă nu ai mai putea genera venit?",
            actionType: 'input',
            options: { placeholder: 'Ex: 1500', type: 'number' },
            handler: (response, data) => { data.monthlyExpenses = Number(response); },
            nextStep: () => 'ask_recovery_period'
        },
        ask_recovery_period: {
            message: () => "Pentru ce perioadă (în luni) estimezi că ai avea nevoie de acest sprijin financiar pentru recuperare?",
            actionType: 'buttons',
            options: ['6 luni', '12 luni', '24 luni'],
            handler: (response, data) => { data.protectionPeriodMonths = parseInt(response); },
            nextStep: () => 'ask_medical_costs'
        },
        ask_medical_costs: {
            message: () => "Ce sumă unică (în €) estimezi că ar fi necesară pentru costuri medicale (tratamente, intervenții, medicamente) neacoperite de stat?",
            actionType: 'input',
            options: { placeholder: 'Ex: 10000', type: 'number' },
            handler: (response, data) => { data.medicalCosts = Number(response); },
            nextStep: () => 'ask_existing_savings'
        },
        ask_existing_savings: {
            message: () => "Ai deja o asigurare privată de sănătate sau economii dedicate pentru urgențe medicale? Dacă da, care este suma totală?",
            actionType: 'input',
            options: { placeholder: 'Ex: 5000 (sau 0)', type: 'number' },
            handler: (response, data) => { data.existingInsurance = Number(response); },
            nextStep: () => 'calculate_deficit'
        },
        calculate_deficit: {
            message: () => "Se calculează...",
            actionType: 'calculation',
            handler: (_, data) => { data.deficit = calculateCriticalIllnessDeficit(data); },
            nextStep: () => 'show_deficit'
        },
        show_deficit: {
            message: (data) => `Am calculat. Necesarul financiar pentru a trece peste o perioadă dificilă este de ${data.deficit.toLocaleString('ro-RO')} €.`,
            actionType: 'buttons',
            options: ['Continuă'],
            nextStep: () => 'impact_message'
        },
        impact_message: {
             message: () => "A avea această siguranță înseamnă că te poți concentra 100% pe recuperare, fără stresul banilor și fără a afecta economiile familiei.",
             actionType: 'buttons',
             options: ['Continuă'],
             nextStep: () => 'ask_dob'
        },
        ask_dob: {
            message: () => "Pentru a-ți oferi o estimare de cost, mai am nevoie de data nașterii.",
            actionType: 'date',
            handler: (response, data) => { data.birthDate = response as Date; },
            nextStep: () => 'calculate_premium'
        },
        calculate_premium: {
            message: () => "Se calculează prima...",
            actionType: 'calculation',
            handler: (_, data) => {
                const userDataForPremium: UserData = {
                    birthDate: data.birthDate, isSmoker: false, desiredSum: data.deficit, gender: 'Masculin'
                };
                data.monthlyPremium = calculatePremium(userDataForPremium).monthlyPremium;
            },
            nextStep: () => 'show_solution_cost'
        },
        show_solution_cost: {
            message: (data) => `O asigurare de sănătate care să acopere un risc de ${data.deficit.toLocaleString('ro-RO')} € ar avea un cost estimat de ${data.monthlyPremium.toFixed(2)} € pe lună. Dorești să afli mai multe de la un consultant?`,
            actionType: 'buttons',
            options: ['Da, vreau detalii', 'Nu acum'],
            nextStep: (response) => response === 'Da, vreau detalii' ? 'contact_form_intro' : 'end_dialog_friendly'
        },
    },

    // --- FLUXUL C: Planificare Pensionare ---
    pensionare: {
        start: {
            message: () => "Excelentă alegere! Planificarea pensiei este cheia unui viitor liniștit. Mai întâi, ce sumă lunară (în €) ți-ai dori să ai la pensie, în banii de azi?",
            actionType: 'input',
            options: { placeholder: 'Ex: 2000', type: 'number' },
            handler: (response, data) => { data.desiredRetirementIncome = Number(response); },
            nextStep: () => 'ask_retirement_age'
        },
        ask_retirement_age: {
            message: () => "La ce vârstă ți-ai dori să te pensionezi?",
            actionType: 'input',
            options: { placeholder: 'Ex: 65', type: 'number' },
            handler: (response, data) => { data.retirementAge = Number(response); },
            nextStep: () => 'ask_existing_savings'
        },
        ask_existing_savings: {
            message: () => "Ai deja o sumă economisită special pentru pensie (Pilon 2, Pilon 3, alte investiții)? Dacă da, care este valoarea ei actuală?",
            actionType: 'input',
            options: { placeholder: 'Ex: 10000 (sau 0)', type: 'number' },
            handler: (response, data) => { data.currentSavings = Number(response); },
            nextStep: () => 'ask_dob'
        },
        ask_dob: {
            message: () => "Pentru a-ți oferi un plan, am nevoie și de data ta de naștere.",
            actionType: 'date',
            handler: (response, data) => { data.birthDate = response as Date; },
            nextStep: () => 'calculate_needs'
        },
        calculate_needs: {
            message: () => "Se calculează...",
            actionType: 'calculation',
            handler: (_, data) => { data.monthlyContribution = calculateRetirementNeeds(data).monthlyContribution; },
            nextStep: () => 'show_plan'
        },
        show_plan: {
            message: (data) => `Am calculat. Pentru a atinge obiectivul tău, ar fi necesar să economisești/investești aproximativ ${data.monthlyContribution.toLocaleString('ro-RO')} € pe lună, până la vârsta de pensionare.`,
            actionType: 'buttons',
            options: ['Continuă'],
            nextStep: () => 'offer_consultant'
        },
        offer_consultant: {
            message: () => "Vestea bună este că, prin instrumente de investiții inteligente, poți pune banii la treabă pentru tine. Dorești să discuți cu un consultant despre un plan de acumulare personalizat?",
            actionType: 'buttons',
            options: ['Da, vreau detalii', 'Nu acum'],
            nextStep: (response) => response === 'Da, vreau detalii' ? 'contact_form_intro' : 'end_dialog_friendly'
        }
    },
    
    // --- FLUXUL D: Planificare Studii Copii ---
    studii_copii: {
        start: {
            message: () => "O decizie minunată! Investiția în educația copiilor este cel mai de preț cadou. Mai întâi, care este suma totală (în €) pe care estimezi că o vei avea nevoie pentru studiile copilului tău?",
            actionType: 'input',
            options: { placeholder: 'Ex: 50000', type: 'number' },
            handler: (response, data) => { data.targetAmount = Number(response); },
            nextStep: () => 'ask_child_age'
        },
        ask_child_age: {
             message: () => "Care este vârsta actuală a copilului?",
             actionType: 'input',
             options: { placeholder: 'Ex: 2', type: 'number' },
             handler: (response, data) => { data.childAge = Number(response); },
             nextStep: () => 'ask_existing_savings'
        },
        ask_existing_savings: {
            message: () => "Ai deja o sumă economisită special pentru acest scop? Dacă da, care este valoarea ei?",
            actionType: 'input',
            options: { placeholder: 'Ex: 5000 (sau 0)', type: 'number' },
            handler: (response, data) => { data.currentSavings = Number(response); },
            nextStep: () => 'calculate_needs'
        },
        calculate_needs: {
            message: () => "Se calculează...",
            actionType: 'calculation',
            handler: (_, data) => { data.monthlyContribution = calculateChildStudiesNeeds(data).monthlyContribution; },
            nextStep: () => 'show_plan'
        },
        show_plan: {
            message: (data) => `Am calculat. Pentru a atinge obiectivul tău până la majoratul copilului, ar fi necesar să economisești ${data.monthlyContribution.toLocaleString('ro-RO')} € pe lună.`,
            actionType: 'buttons',
            options: ['Continuă'],
            nextStep: () => 'offer_consultant'
        },
        offer_consultant: {
             message: () => "Prin produse dedicate, cum ar fi asigurările de studii, poți asigura acest viitor chiar și în situații neprevăzute. Dorești să afli mai multe de la un consultant?",
             actionType: 'buttons',
             options: ['Da, vreau detalii', 'Nu acum'],
             nextStep: (response) => response === 'Da, vreau detalii' ? 'contact_form_intro' : 'end_dialog_friendly'
        }
    }
};

const sharedEndSteps: ConversationFlow = {
    contact_form_intro: {
        message: () => "Perfect. Pentru a stabili o discuție cu un consultant, te rog să completezi datele de mai jos. Acestea sunt confidențiale și vor fi folosite exclusiv în acest scop.",
        actionType: 'form',
        options: {
            fields: [
                { name: 'name', placeholder: 'Nume', type: 'text', required: true },
                { name: 'email', placeholder: 'Email', type: 'email', required: true },
                { name: 'phone', placeholder: 'Telefon', type: 'tel', required: true },
            ],
            gdpr: 'Sunt de acord cu prelucrarea datelor personale.',
            buttonText: 'Trimite'
        },
        handler: (response, data) => { data.contact = response; },
        nextStep: () => 'end_dialog_success'
    },
    end_dialog_friendly: {
        message: () => "Am înțeles. Îți mulțumesc pentru timpul acordat! Dacă te răzgândești, știi unde mă găsești.",
        actionType: 'end',
        nextStep: () => ''
    },
    end_dialog_success: {
        message: () => "Mulțumesc! Datele tale au fost înregistrate. Un consultant te va suna în curând. O zi excelentă!",
        actionType: 'end',
        nextStep: () => ''
    }
};

const initialStep: ConversationFlow = {
    ask_priorities: {
        message: () => "Salut! Sunt Marius, asistentul tău pentru siguranță financiară. Pentru a te putea ajuta, te rog să-mi spui care dintre următoarele subiecte sunt de interes pentru tine în acest moment.",
        actionType: 'checkbox',
        options: {
            options: ["Protecție în caz de deces", "Protecție în caz de boală gravă", "Pensionare", "Studii copii"],
            buttonText: "Am ales"
        },
        handler: (response, data) => {
            data.priorities = response;
        },
        nextStep: (response) => {
            // Priority order: Deces > Boala Grava > Pensionare > Studii
            if (response.includes("Protecție în caz de deces")) return 'deces';
            if (response.includes("Protecție în caz de boală gravă")) return 'boala_grava';
            if (response.includes("Pensionare")) return 'pensionare';
            if (response.includes("Studii copii")) return 'studii_copii';
            return 'end_dialog_friendly'; // Fallback
        }
    }
};


export default function Home() {
    const [view, setView] = useState<"landing" | "chat">("landing");
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [conversation, setConversation] = useState<Message[]>([]);
    const [currentUserAction, setCurrentUserAction] = useState<UserAction | null>(null);
    const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
    
    const conversationIdRef = useRef(0);
    const currentStateRef = useRef<{flow: string, step: string} | null>(null);
    const userDataRef = useRef<any>({});

    const addMessage = useCallback((message: Omit<Message, "id" | "style">, style?: 'normal' | 'dramatic') => {
        setConversation((prev) => [
            ...prev,
            { ...message, id: conversationIdRef.current++, style: style || 'normal' },
        ]);
    }, []);

    const getCurrentFlow = useCallback(() => {
        if (!currentStateRef.current) return null;
        const { flow } = currentStateRef.current;
        return { ...conversationFlows[flow], ...sharedEndSteps };
    }, []);

    const renderStep = useCallback(async (flow: string, stepId: string) => {
        if (!stepId) {
            setIsWaitingForResponse(false);
            setCurrentUserAction(null);
            return;
        }

        currentStateRef.current = { flow, step: stepId };
        
        const currentFlow = { ...conversationFlows[flow], ...sharedEndSteps };
        const step = currentFlow[stepId];

        if (!step) {
            console.error("Invalid step or flow:", {flow, stepId});
            return;
        }

        if (step.actionType === 'calculation') {
            setIsWaitingForResponse(true);
            setCurrentUserAction(null);
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (step.handler) {
                step.handler(null, userDataRef.current);
            }
            const nextStepId = step.nextStep();
            renderStep(flow, nextStepId);
            return;
        }

        if (step.actionType === 'sequence') {
            setIsWaitingForResponse(true);
            setCurrentUserAction(null);
            addMessage({ author: "Marius", type: "text", content: step.message(userDataRef.current) });
            
            for (const item of step.options) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                addMessage({ author: "Marius", type: 'text', content: item }, 'dramatic');
            }
            await new Promise(resolve => setTimeout(resolve, 800));
            const nextStepId = step.nextStep();
            renderStep(flow, nextStepId);
            return;
        }
        
        setIsWaitingForResponse(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        addMessage({ author: "Marius", type: "text", content: step.message(userDataRef.current) });
        
        if (step.actionType === 'end') {
            setIsWaitingForResponse(false);
            setCurrentUserAction(null);
        } else if (step.options?.length === 0 && step.actionType === 'buttons') { // Auto-continue for messages that are just text
             await new Promise(resolve => setTimeout(resolve, 1200));
             const nextStepId = step.nextStep();
             renderStep(flow, nextStepId);
        } else {
            setCurrentUserAction({ type: step.actionType, options: step.options });
        }
    }, [addMessage]);

    const processUserResponse = useCallback((response: any) => {
        setIsWaitingForResponse(false);
        setCurrentUserAction(null);

        // Handle initial priority selection
        if (!currentStateRef.current) {
            const step = initialStep.ask_priorities;
            addMessage({ author: "user", type: "response", content: (response as string[]).join(', ') });
            if (step.handler) {
                step.handler(response, userDataRef.current);
            }
            const nextFlow = step.nextStep(response, userDataRef.current) as string;
            if (conversationFlows[nextFlow]) {
                renderStep(nextFlow, 'start');
            } else {
                console.error("Invalid flow selected:", nextFlow);
            }
            return;
        }

        const { flow, step: stepId } = currentStateRef.current;
        const currentFlow = getCurrentFlow();
        if (!currentFlow) return;
        const step = currentFlow[stepId];

        let userMessageContent = response;
        if (typeof response === 'object' && response.name) {
            userMessageContent = `Nume: ${response.name}, Email: ${response.email}, Telefon: ${response.phone}`;
        } else if (response instanceof Date) {
            userMessageContent = format(response, "dd/MM/yyyy");
        } else if (Array.isArray(response)) {
            userMessageContent = response.join(', ');
        }
        addMessage({ author: "user", type: "response", content: userMessageContent });
        
        if (step.handler) {
            step.handler(response, userDataRef.current);
        }

        const nextStepId = step.nextStep(response, userDataRef.current);
        renderStep(flow, nextStepId);

    }, [addMessage, renderStep, getCurrentFlow]);

    const startConversation = useCallback(() => {
        currentStateRef.current = null; // Reset state
        userDataRef.current = {}; // Reset data
        addMessage({ author: "Marius", type: "text", content: initialStep.ask_priorities.message(null) });
        setCurrentUserAction({ type: initialStep.ask_priorities.actionType, options: initialStep.ask_priorities.options });
        setIsWaitingForResponse(true);
    }, [addMessage]);

    const handleStart = () => {
        setIsFadingOut(true);
        setTimeout(() => {
            setView("chat");
        }, 500);
    };

    useEffect(() => {
        if (view === 'chat' && conversation.length === 0) {
            startConversation();
        }
    }, [view, startConversation, conversation.length]);

    return (
        <div className="container mx-auto h-full max-h-[-webkit-fill-available] p-0 flex flex-col">
            {view === "landing" ? (
                <LandingView onStart={handleStart} isFadingOut={isFadingOut} />
            ) : (
                <ChatView
                    conversation={conversation}
                    userAction={currentUserAction}
                    onResponse={processUserResponse}
                    isWaitingForResponse={isWaitingForResponse}
                />
            )}
        </div>
    );
}
