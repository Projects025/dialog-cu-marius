"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import LandingView from "@/components/conversation/landing-view";
import ChatView from "@/components/conversation/chat-view";
import type { Message, UserAction, FinancialData } from "@/components/conversation/chat-view";
import { 
    calculateBruteDeficit,
    calculateFinalDeficit
} from "@/lib/calculation";
import { format } from "date-fns";

type ConversationStep = {
    message: (data: any) => string;
    actionType: UserAction['type'] | 'end' | 'calculation' | 'sequence';
    options?: any;
    handler?: (response: any, data: any) => void;
    nextStep: (response?: any, data?: any) => string;
    autoContinue?: boolean;
};

type ConversationFlow = {
    [key: string]: ConversationStep;
};

const conversationFlow: ConversationFlow = {
    // --- Faza 1: Introducere și Prioritizare ---
    intro_1: {
        message: () => "Viața produce pierderi financiare semnificative in patru situații majore. Dintre acestea, două situații sunt previzibile, precis așezate pe axa vieții, iar două sunt total imprevizibile („ceasul rău, pisica neagră”).",
        actionType: 'buttons',
        options: [],
        nextStep: () => 'intro_2',
        autoContinue: true
    },
    intro_2: {
        message: () => "Previzibile:\n1. Pensionarea...\n2. Studiile copiilor...",
        actionType: 'buttons',
        options: [],
        nextStep: () => 'intro_3',
        autoContinue: true
    },
    intro_3: {
        message: () => "Imprevizibile:\n1. Decesul...\n2. Bolile grave...",
        actionType: 'buttons',
        options: [],
        nextStep: () => 'ask_priority',
        autoContinue: true
    },
    ask_priority: {
        message: () => "Care dintre aceste subiecte ar fi de interes pentru tine la acest moment?",
        actionType: 'buttons',
        options: [
            { label: 'Reducerea drastica a veniturilor la pensionare', disabled: true },
            { label: 'Asigurarea viitorului copiilor', disabled: true },
            { label: 'Decesul spontan', disabled: false },
            { label: 'Bolile grave...', disabled: true }
        ],
        nextStep: (response) => response === 'Decesul spontan' ? 'confirm_deces_analysis' : 'end_dialog_friendly'
    },
    // --- Faza 2: Analiza de Risc pentru Deces ---
    confirm_deces_analysis: {
        message: () => "Ar fi de interes pentru tine sa vezi care este gradul de expunere financiara a familiei tale in cazul unui deces spontan?",
        actionType: 'buttons',
        options: ['Da', 'Nu'],
        nextStep: (response) => response === 'Da' ? 'intro_analysis' : 'end_dialog_friendly'
    },
    intro_analysis: {
        message: () => "Un deces afecteaza negativ pe multiple planuri... In momentele urmatoare, vom stabili care este suma de bani de care ar avea nevoie familia... Daca esti gata, da click.",
        actionType: 'buttons',
        options: ['Sunt gata'],
        nextStep: () => 'ask_period'
    },
    // --- Faza 3: Calculul Detaliat al Deficitului ---
    ask_period: {
        message: () => "In cazul unui posibil deces, care ar fi perioada de timp in care familia ta ar avea nevoie de sustinere financiara...?",
        actionType: 'buttons',
        options: ['3 ani', '4 ani', '5 ani'],
        handler: (response, data) => { data.period = parseInt(response); },
        nextStep: () => 'ask_monthly_sum'
    },
    ask_monthly_sum: {
        message: () => "Care ar fi suma lunara necesara (in lei)...?",
        actionType: 'input',
        options: { placeholder: 'Ex: 3000', type: 'number' },
        handler: (response, data) => { data.monthlySum = Number(response); },
        nextStep: () => 'show_deficit_1'
    },
    show_deficit_1: {
        message: (data) => {
            const deficit1 = (data.monthlySum || 0) * (data.period || 0) * 12;
            data.deficit1 = deficit1;
            return `Avem o prima suma de bani, ${deficit1.toLocaleString('ro-RO')} lei, reprezentand nevoia de venit lunar a familiei pe perioada selectata. Esti pregatit(a) sa mai facem un pas?`;
        },
        actionType: 'buttons',
        options: ['Da'],
        nextStep: () => 'ask_event_costs'
    },
    ask_event_costs: {
        message: () => "Evenimentul in sine produce cheltuieli specifice... Care ar fi suma necesara?",
        actionType: 'input',
        options: { placeholder: 'Ex: 10000', type: 'number' },
        handler: (response, data) => { data.eventCosts = Number(response); },
        nextStep: () => 'show_deficit_2'
    },
    show_deficit_2: {
        message: (data) => `Am adaugat. Avem acum o a doua suma-deficit de ${(data.eventCosts || 0).toLocaleString('ro-RO')} lei. Mergem mai departe?`,
        actionType: 'buttons',
        options: ['Da'],
        nextStep: () => 'ask_projects'
    },
    ask_projects: {
        message: () => "Exista proiecte in desfasurare (educatia copiilor, etc.) care ar trebui protejate...? Daca da, care este suma totala necesara?",
        actionType: 'input',
        options: { placeholder: 'Ex: 50000', type: 'number' },
        handler: (response, data) => { data.projects = Number(response); },
        nextStep: () => 'show_deficit_3'
    },
    show_deficit_3: {
        message: (data) => `Am notat si proiectele, in valoare de ${(data.projects || 0).toLocaleString('ro-RO')} lei. Mai avem un singur pas.`,
        actionType: 'buttons',
        options: ['Continuă'],
        nextStep: () => 'ask_debts'
    },
    ask_debts: {
        message: () => "In final, exista datorii (credite, etc.) care ar trebui acoperite integral? Daca da, care este suma totala?",
        actionType: 'input',
        options: { placeholder: 'Ex: 100000', type: 'number' },
        handler: (response, data) => { data.debts = Number(response); },
        nextStep: () => 'ask_show_brute_deficit'
    },
    // --- Faza 4: Revelația și Ajustarea ---
    ask_show_brute_deficit: {
        message: () => "Bun... Avem cele patru sume-deficit... Esti pregatit sa vezi suma-deficit totala?",
        actionType: 'buttons',
        options: ['Da'],
        nextStep: () => 'show_brute_deficit'
    },
    show_brute_deficit: {
        message: (data) => {
            data.bruteDeficit = calculateBruteDeficit(data);
            return `Suma-deficit totala, adica nevoia reala de bani a familiei, este: ${data.bruteDeficit.toLocaleString('ro-RO')} lei.`;
        },
        actionType: 'buttons',
        options: [],
        nextStep: () => 'ask_insurance',
        autoContinue: true
    },
    ask_insurance: {
        message: () => "...familia ta ar beneficia de vreo asigurare de viata...? Daca da, care este suma...?",
        actionType: 'input',
        options: { placeholder: 'Ex: 25000', type: 'number' },
        handler: (response, data) => { data.existingInsurance = Number(response); },
        nextStep: () => 'ask_savings'
    },
    ask_savings: {
        message: () => "...familia ta ar putea accesa anumite economii...? Daca da, care este suma...?",
        actionType: 'input',
        options: { placeholder: 'Ex: 15000', type: 'number' },
        handler: (response, data) => { data.savings = Number(response); },
        nextStep: () => 'show_final_deficit'
    },
    // --- Faza 5: Impactul Emoțional și Soluția ---
    show_final_deficit: {
        message: (data) => {
            data.finalDeficit = calculateFinalDeficit(data);
            return `Scazand resursele existente, "mostenirea-negativa" pe care ai lasa-o in urma ar fi de: ${data.finalDeficit.toLocaleString('ro-RO')} lei.`;
        },
        actionType: 'buttons',
        options: [],
        nextStep: () => 'ask_feeling',
        autoContinue: true,
    },
    ask_feeling: {
        message: () => "Cum ti se pare aceasta suma? Care este sentimentul pe care il simti acum?",
        actionType: 'input',
        options: { placeholder: 'Scrie aici...', type: 'text' },
        handler: (response, data) => { data.feeling = response; },
        nextStep: () => 'ask_dramatic_options'
    },
    ask_dramatic_options: {
        message: () => "In acest scenariu... ce optiuni ar avea cei dragi...? Bifeaza optiunile realiste...",
        actionType: 'interactive_scroll_list',
        options: {
            options: [
                'Partenerul de viata isi ia al doilea job',
                'Partenerul de viata vinde casa',
                'Partenerul de viata vinde masina',
                'Partenerul de viata renunta la concedii',
                'Partenerul de viata face un credit de nevoi personale',
                'Partenerul de viata se imprumuta la prieteni',
                'Partenerul de viata se imprumuta la familie',
                'Copiii renunta la meditatii',
                'Copiii renunta la sport',
                'Copiii renunta la facultate in strainatate',
                'Copiii renunta la facultate in tara',
                'Copiii se angajeaza imediat dupa liceu',
                'Bunicii contribuie financiar masiv',
                'Bunicii au grija de nepoti non-stop',
                'Stilul de viata se reduce drastic'
            ],
            buttonText: "Am bifat"
        },
        handler: (response, data) => { data.dramaticOptions = response; },
        nextStep: () => 'present_solution'
    },
    present_solution: {
        message: () => "Daca nu esti foarte multumit cu optiunile bifate... ai fi interesat sa vezi o solutie personalizata care sa anuleze complet acest scenariu dramatic?",
        actionType: 'buttons',
        options: ['Da, sunt interesat', 'Nu, multumesc'],
        nextStep: (response) => response === 'Da, sunt interesat' ? 'ask_contact_details' : 'end_dialog_friendly'
    },
    ask_contact_details: {
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


export default function Home() {
    const [view, setView] = useState<"landing" | "chat">("landing");
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [conversation, setConversation] = useState<Message[]>([]);
    const [currentUserAction, setCurrentUserAction] = useState<UserAction | null>(null);
    const [isWaitingForResponse, setIsWaitingForResponse] = useState(true);
    
    const conversationIdRef = useRef(0);
    const currentStateRef = useRef<string | null>(null);
    const userDataRef = useRef<any>({});

    const addMessage = useCallback((message: Omit<Message, "id" | "style">, style?: 'normal' | 'dramatic') => {
        setConversation((prev) => [
            ...prev,
            { ...message, id: conversationIdRef.current++, style: style || 'normal' },
        ]);
    }, []);

    const renderStep = useCallback(async (stepId: string) => {
        currentStateRef.current = stepId;

        if (!stepId) {
            setIsWaitingForResponse(false);
            setCurrentUserAction(null);
            return;
        }
        
        const step = conversationFlow[stepId];

        if (!step) {
            console.error("Invalid stepId:", stepId);
            return;
        }
        
        setIsWaitingForResponse(true); // Always waiting when a step starts
        setCurrentUserAction(null); // Clear old actions first

        // Delay for dramatic effect
        await new Promise(resolve => setTimeout(resolve, 800));
        
        addMessage({ author: "Marius", type: "text", content: step.message(userDataRef.current) });
        
        if (step.actionType === 'end') {
            setIsWaitingForResponse(false);
        } else if (step.autoContinue) {
             await new Promise(resolve => setTimeout(resolve, 1200));
             const nextStepId = step.nextStep();
             renderStep(nextStepId);
        } else {
             // For non-auto-continue steps, we show the action and wait.
            setCurrentUserAction({ type: step.actionType, options: step.options });
        }
    }, [addMessage]);

    const processUserResponse = useCallback((response: any) => {
        setCurrentUserAction(null); // User has responded, clear actions

        if (!currentStateRef.current) {
            console.error("Cannot process response without a current state.");
            return;
        }

        const step = conversationFlow[currentStateRef.current];
        
        // Use the label for logic, if the response is an object
        const responseValue = typeof response === 'object' && response !== null && response.label ? response.label : response;

        // Format and add user message to conversation
        let userMessageContent = responseValue;
        if (typeof response === 'object' && response !== null && response.name) {
            userMessageContent = `Nume: ${response.name}, Email: ${response.email}, Telefon: ${response.phone}`;
        } else if (response instanceof Date) {
            userMessageContent = format(response, "dd/MM/yyyy");
        } else if (Array.isArray(response)) {
            userMessageContent = response.join(', ');
        }
        addMessage({ author: "user", type: "response", content: userMessageContent });
        
        // Save data if handler exists
        if (step.handler) {
            step.handler(responseValue, userDataRef.current);
        }

        // Determine and render next step
        const nextStepId = step.nextStep(responseValue, userDataRef.current);
        renderStep(nextStepId);

    }, [addMessage, renderStep]);

    const startConversation = useCallback(() => {
        userDataRef.current = {}; // Reset data
        conversationIdRef.current = 0;
        setConversation([]);
        renderStep('intro_1');
    }, [renderStep]);

    const handleStart = () => {
        setIsFadingOut(true);
        setTimeout(() => {
            setView("chat");
            setIsFadingOut(false);
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

    