"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import LandingView from "@/components/conversation/landing-view";
import ChatView from "@/components/conversation/chat-view";
import type { Message, UserAction, UserData, FinancialData } from "@/components/conversation/chat-view";
import { calculatePremium, calculateDeficit, calculateSavings } from "@/lib/calculation";
import { format } from "date-fns";

type Reaction = 'Este o sumă mare' | 'Rezonabil' | 'Mă așteptam' | null;

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

const conversationFlow: ConversationFlow = {
    // START AND BRANCHING
    ask_priorities: {
        message: () => "Salut! Sunt Marius, asistentul tău pentru siguranță financiară. Pentru a te putea ajuta, te rog să-mi spui care dintre următoarele subiecte sunt de interes pentru tine în acest moment.",
        actionType: 'checkbox',
        options: {
            options: ["Pensionare", "Studii copii", "Protecție în caz de deces", "Protecție în caz de boală gravă"],
            buttonText: "Am ales"
        },
        handler: (response, data) => {
            data.priorities = response;
        },
        nextStep: (response) => {
            const isRiskFlow = response.includes("Protecție în caz de deces") || response.includes("Protecție în caz de boală gravă");
            return isRiskFlow ? 'risk_intro' : 'planning_intro';
        }
    },
    
    // --- FLOW A: Risk Analysis ---
    risk_intro: {
        message: () => "Perfect. Văd că protecția familiei este o prioritate pentru tine. Ești pregătit să descoperim împreună gradul real de expunere financiară în cazul unui eveniment neprevăzut?",
        actionType: 'buttons',
        options: ['Da, sunt pregătit', 'Poate altă dată'],
        nextStep: (response) => response === 'Da, sunt pregătit' ? 'ask_protection_period' : 'end_dialog_friendly'
    },
    ask_protection_period: {
        message: () => "Excelent. Mai întâi, pentru ce perioadă (în ani) ai dori ca familia ta să aibă completă siguranță financiară?",
        actionType: 'buttons',
        options: ['3 ani', '4 ani', '5 ani'],
        handler: (response, data) => { data.protectionPeriod = parseInt(response); },
        nextStep: () => 'ask_monthly_expenses'
    },
    ask_monthly_expenses: {
        message: () => "Am notat. Care ar fi suma lunară (în €) necesară pentru a menține stilul de viață actual?",
        actionType: 'input',
        options: { placeholder: 'Ex: 1500', type: 'number' },
        handler: (response, data) => { data.monthlyExpenses = Number(response); },
        nextStep: () => 'ask_specific_costs'
    },
    ask_specific_costs: {
        message: () => "Ce sumă unică (în €) ar trebui să alocăm pentru cheltuieli specifice evenimentului (taxe, costuri funerare etc.)?",
        actionType: 'input',
        options: { placeholder: 'Ex: 5000', type: 'number' },
        handler: (response, data) => { data.specificEventCosts = Number(response); },
        nextStep: () => 'ask_future_projects'
    },
    ask_future_projects: {
        message: () => "Există proiecte în desfășurare (educația copiilor, etc.) care ar trebui protejate? Dacă da, care este suma totală necesară?",
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
        message: () => "Se calculează deficitul...", // Placeholder, will be replaced
        actionType: 'calculation',
        handler: (_, data) => {
            data.deficit = calculateDeficit(data as FinancialData);
        },
        nextStep: () => 'show_deficit'
    },
    show_deficit: {
        message: (data) => `Am finalizat calculul. Deficitul financiar, adică plasa de siguranță necesară, este de ${data.deficit.toLocaleString('ro-RO')} €.`,
        actionType: 'buttons', // The next message will be triggered by this
        options: ['Este o sumă mare', 'Rezonabil', 'Mă așteptam'],
        handler: (response, data) => { data.reaction = response as Reaction },
        nextStep: () => 'ask_deficit_reaction'
    },
    ask_deficit_reaction: {
        message: () => 'Cum ți se pare această sumă?',
        actionType: 'buttons',
        options: ['Este o sumă mare', 'Rezonabil', 'Mă așteptam'],
        handler: (response, data) => { data.reaction = response as Reaction },
        nextStep: () => 'emotional_sequence_intro'
    },
    emotional_sequence_intro: {
        message: () => "Înțeleg perfect reacția. Fără o planificare corectă, dacă acest deficit ar deveni realitate, opțiunile partenerului de viață sunt adesea dureroase. Privește, te rog...",
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
        message: () => "Este un scenariu dificil, dar există soluții. Pentru a-ți oferi o estimare de cost, mai am nevoie de câteva detalii. Te rog să selectezi data nașterii.",
        actionType: 'date',
        handler: (response, data) => { data.birthDate = response as Date; },
        nextStep: () => 'ask_smoker'
    },
    ask_smoker: {
        message: () => "Mulțumesc. Ești fumător?",
        actionType: 'buttons',
        options: ["Da", "Nu"],
        handler: (response, data) => { data.isSmoker = response === 'Da'; },
        nextStep: () => 'calculate_premium'
    },
    calculate_premium: {
        message: () => "Se calculează prima...",
        actionType: 'calculation',
        handler: (_, data) => {
            const userDataForPremium: UserData = {
                birthDate: data.birthDate,
                isSmoker: data.isSmoker,
                desiredSum: data.deficit,
                gender: 'Masculin' // Assuming gender
            };
            const result = calculatePremium(userDataForPremium);
            data.monthlyPremium = result.monthlyPremium;
        },
        nextStep: () => 'show_solution_intro'
    },
    show_solution_intro: {
        message: (data) => {
            if (data.reaction === 'Este o sumă mare') {
                return "Știu că suma pare mare, dar vestea bună este că soluția pentru a proteja complet viitorul familiei tale este mult mai accesibilă.";
            }
            return "Mă bucur că vezi lucrurile în perspectivă. Este, într-adevăr, o investiție calculată în liniștea celor dragi.";
        },
        actionType: 'buttons', // The next message will be triggered by this
        options: [],
        nextStep: () => 'show_solution_cost'
    },
    show_solution_cost: {
        message: (data) => `Pentru a acoperi complet deficitul de ${data.deficit.toLocaleString('ro-RO')} €, costul estimat al unei asigurări de viață pentru tine ar fi de aproximativ ${data.monthlyPremium.toFixed(2)} € pe lună. Ai fi interesat să vezi o soluție personalizată?`,
        actionType: 'buttons',
        options: ['Da, vreau detalii', 'Nu acum'],
        nextStep: (response) => response === 'Da, vreau detalii' ? 'contact_form_intro' : 'end_dialog_friendly'
    },

    // --- FLOW B: Financial Planning ---
    planning_intro: {
        message: (data) => `Am înțeles, vrei să discutăm despre ${data.priorities.join(', ').toLowerCase()}. Hai să conturăm un plan. Care este suma totală (în €) pe care estimezi că o vei avea nevoie pentru acest obiectiv?`,
        actionType: 'input',
        options: { placeholder: 'Ex: 50000', type: 'number' },
        handler: (response, data) => { data.targetAmount = Number(response); },
        nextStep: () => 'planning_ask_period'
    },
    planning_ask_period: {
        message: () => "În câți ani de acum înainte vei avea nevoie de această sumă?",
        actionType: 'input',
        options: { placeholder: 'Ex: 10', type: 'number' },
        handler: (response, data) => { data.protectionPeriod = Number(response); },
        nextStep: () => 'planning_ask_savings'
    },
    planning_ask_savings: {
        message: () => "Ai deja o sumă economisită pentru acest scop? Dacă da, care este valoarea ei?",
        actionType: 'input',
        options: { placeholder: 'Ex: 5000 (sau 0)', type: 'number' },
        handler: (response, data) => { data.savings = Number(response); },
        nextStep: () => 'planning_calculate'
    },
    planning_calculate: {
        message: () => "Se calculează planul...",
        actionType: 'calculation',
        handler: (_, data) => {
            const result = calculateSavings(data as Partial<FinancialData>);
            data.monthlyContribution = result.monthlyContribution;
        },
        nextStep: () => 'planning_show_plan'
    },
    planning_show_plan: {
        message: (data) => `Am finalizat calculul. Pentru a atinge obiectivul tău de ${(data.targetAmount || 0).toLocaleString('ro-RO')} € în ${data.protectionPeriod} ani, ar fi necesar să economisești aproximativ ${data.monthlyContribution.toLocaleString('ro-RO')} € pe lună.`,
        actionType: 'buttons',
        options: [],
        nextStep: () => 'planning_offer_consultant'
    },
    planning_offer_consultant: {
        message: () => "Vestea bună este că, prin instrumente de investiții, suma poate fi mai mică. Dorești să discuți cu un consultant pentru a explora opțiunile?",
        actionType: 'buttons',
        options: ['Da, vreau detalii', 'Nu acum'],
        nextStep: (response) => response === 'Da, vreau detalii' ? 'contact_form_intro' : 'end_dialog_friendly'
    },
    
    // --- SHARED: Contact & End ---
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
        handler: (response, data) => {
            data.contact = response;
        },
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
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  
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
    if (!stepId) {
        setIsWaitingForResponse(false);
        setCurrentUserAction(null);
        return;
    }

    currentStateRef.current = stepId;
    const step = conversationFlow[stepId];

    if (!step) {
        console.error("Invalid step ID:", stepId);
        return;
    }
    
    // Handle special non-interactive steps
    if (step.actionType === 'calculation') {
        if (step.handler) {
            step.handler(null, userDataRef.current);
        }
        const nextStepId = step.nextStep();
        renderStep(nextStepId);
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

        const nextStepId = step.nextStep();
        renderStep(nextStepId);
        return;
    }
    
    // Handle interactive steps
    setIsWaitingForResponse(true);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate thinking
    
    addMessage({ author: "Marius", type: "text", content: step.message(userDataRef.current) });
    
    if(step.actionType === 'end') {
        setIsWaitingForResponse(false);
        setCurrentUserAction(null);
    } else {
        setCurrentUserAction({ type: step.actionType, options: step.options });
    }

    // For multi-message steps
    if(step.actionType === 'buttons' && step.options?.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        const nextStepId = step.nextStep();
        renderStep(nextStepId);
    }

  }, [addMessage]);

  const processUserResponse = useCallback((response: any) => {
    setIsWaitingForResponse(false);
    setCurrentUserAction(null);

    const stepId = currentStateRef.current;
    if (!stepId) return;

    const step = conversationFlow[stepId];

    // Display user response in chat
    let userMessageContent = response;
    if (typeof response === 'object' && response.name) {
        userMessageContent = `Nume: ${response.name}, Email: ${response.email}, Telefon: ${response.phone}`;
    } else if (response instanceof Date) {
        userMessageContent = format(response, "dd/MM/yyyy");
    } else if (Array.isArray(response)) {
        userMessageContent = response.join(', ');
    }
    addMessage({ author: "user", type: "response", content: userMessageContent });
    
    // Save data
    if (step.handler) {
        step.handler(response, userDataRef.current);
    }

    // Determine and render next step
    const nextStepId = step.nextStep(response, userDataRef.current);
    renderStep(nextStepId);

  }, [addMessage, renderStep]);


  const startConversation = useCallback(() => {
    renderStep('ask_priorities');
  }, [renderStep]);


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
