"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import LandingView from "@/components/conversation/landing-view";
import ChatView from "@/components/conversation/chat-view";
import type { Message, UserAction, UserData, FinancialData } from "@/components/conversation/chat-view";
import { calculatePremium, calculateDeficit, calculateSavings } from "@/lib/calculation";
import { format } from "date-fns";

export type Reaction = 'Este o sumă mare' | 'Rezonabil' | 'Mă așteptam' | null;

export default function Home() {
  const [view, setView] = useState<"landing" | "chat">("landing");
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeFlow, setActiveFlow] = useState<'A' | 'B' | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [currentUserAction, setCurrentUserAction] = useState<UserAction | null>(null);
  const [userData, setUserData] = useState<Partial<UserData>>({});
  const [financialData, setFinancialData] = useState<Partial<FinancialData>>({});
  const [lastReaction, setLastReaction] = useState<Reaction>(null);
  const [userPriorities, setUserPriorities] = useState<string[]>([]);

  const conversationIdRef = useRef(0);

  const addMessage = useCallback((message: Omit<Message, "id" | "style">, style?: 'normal' | 'dramatic') => {
    setConversation((prev) => [
      ...prev,
      { ...message, id: conversationIdRef.current++, style: style || 'normal' },
    ]);
  }, []);

  const updateUserActions = (type: UserAction['type'] | null, options?: any) => {
    if (type === null) {
      setCurrentUserAction(null);
    } else {
      setCurrentUserAction({ type, options });
    }
    setIsWaitingForResponse(type !== null);
  };
  
  const conversationFlow = useCallback(
    async (step: number, response?: any) => {
      setIsWaitingForResponse(true);
      
      const run = (callback: () => void) => setTimeout(callback, 800);

      // Main flow dispatcher
      if (step === 1) { // Ask for priorities
        run(() => {
            addMessage({
                author: "Marius",
                type: "text",
                content: "Salut! Sunt Marius, asistentul tău pentru siguranță financiară. Pentru a te putea ajuta, te rog să-mi spui care dintre următoarele subiecte sunt de interes pentru tine în acest moment.",
            });
            updateUserActions('checkbox', { 
                options: ["Pensionare", "Studii copii", "Protecție în caz de deces", "Protecție în caz de boală gravă"],
                buttonText: "Am ales"
            });
        });
      } else if (step === 2) { // Branching based on priorities
        addMessage({ author: "user", type: "response", content: response.join(', ') });
        setUserPriorities(response);

        const isRiskFlow = response.includes("Protecție în caz de deces") || response.includes("Protecție în caz de boală gravă");
        
        if (isRiskFlow) {
            setActiveFlow('A');
            setCurrentStep(10); // Start of Flow A
            conversationFlow(10);
        } else {
            setActiveFlow('B');
            setCurrentStep(50); // Start of Flow B
            conversationFlow(50, response); // Pass priorities for custom message
        }
      }

      // --- FLOW A: Risk Analysis ---
      else if (activeFlow === 'A') {
        if (step === 10) { // A1: Introduction
            run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "Perfect. Văd că protecția familiei este o prioritate pentru tine. Ești pregătit să descoperim împreună gradul real de expunere financiară în cazul unui eveniment neprevăzut?",
                });
                updateUserActions('buttons', ['Da, sunt pregătit', 'Poate altă dată']);
            });
        } else if (step === 11) { // A2.1: Protection Period
            addMessage({ author: "user", type: "response", content: response });
            if (response === 'Poate altă dată') {
                addMessage({ author: "Marius", type: "text", content: "Am înțeles. Când ești pregătit, știi unde mă găsești." });
                updateUserActions(null); setIsWaitingForResponse(false); return;
            }
            run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "Excelent. Mai întâi, pentru ce perioadă (în ani) ai dori ca familia ta să aibă completă siguranță financiară?",
                });
                updateUserActions('buttons', ['3 ani', '4 ani', '5 ani']);
            });
        } else if (step === 12) { // A2.2: Monthly Expenses
            addMessage({ author: "user", type: "response", content: response });
            const years = parseInt(response.split(' ')[0], 10);
            setFinancialData(prev => ({...prev, protectionPeriod: years}));
            run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "Am notat. Care ar fi suma lunară (în €) necesară pentru a menține stilul de viață actual?",
                });
                updateUserActions('input', { placeholder: 'Ex: 1500', type: 'number' });
            });
        } else if (step === 13) { // A2.3: Specific Event Costs
            addMessage({ author: "user", type: "response", content: `€ ${response}` });
            setFinancialData(prev => ({...prev, monthlyExpenses: Number(response)}));
             run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "Ce sumă unică (în €) ar trebui să alocăm pentru cheltuieli specifice evenimentului (taxe, costuri funerare etc.)?",
                });
                updateUserActions('input', { placeholder: 'Ex: 5000', type: 'number' });
            });
        } else if (step === 14) { // A2.4: Future Projects
            addMessage({ author: "user", type: "response", content: `€ ${response}` });
            setFinancialData(prev => ({...prev, specificEventCosts: Number(response)}));
            run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "Există proiecte în desfășurare (educația copiilor, etc.) care ar trebui protejate? Dacă da, care este suma totală necesară?",
                });
                updateUserActions('input', { placeholder: 'Ex: 20000 (sau 0)', type: 'number' });
            });
        } else if (step === 15) { // A2.5: Existing Insurance
            addMessage({ author: "user", type: "response", content: `€ ${response}` });
            setFinancialData(prev => ({...prev, futureProjects: Number(response)}));
            run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "Acum, resursele existente. Aveți vreo asigurare de viață? Dacă da, ce sumă ar primi familia?",
                });
                updateUserActions('input', { placeholder: 'Ex: 10000 (sau 0)', type: 'number' });
            });
        } else if (step === 16) { // A2.6: Savings
            addMessage({ author: "user", type: "response", content: `€ ${response}` });
            setFinancialData(prev => ({...prev, existingInsurance: Number(response)}));
            run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "Și în final, aveți economii sau investiții disponibile imediat?",
                });
                updateUserActions('input', { placeholder: 'Ex: 5000 (sau 0)', type: 'number' });
            });
        } else if (step === 17) { // A3: Calculate and show deficit
            addMessage({ author: "user", type: "response", content: `€ ${response}` });
            const finalFinancialData = {...financialData, savings: Number(response)} as FinancialData;
            setFinancialData(finalFinancialData);
            
            const deficit = calculateDeficit(finalFinancialData);
            setUserData(prev => ({...prev, desiredSum: deficit}));
            
            run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: `Am finalizat calculul. Deficitul financiar, adică plasa de siguranță necesară, este de ${deficit.toLocaleString('ro-RO')} €.`,
                });

                setTimeout(() => {
                    addMessage({
                        author: "Marius",
                        type: "text",
                        content: `Cum ți se pare această sumă?`
                    });
                    updateUserActions('buttons', ['Este o sumă mare', 'Rezonabil', 'Mă așteptam']);
                }, 1200);
            });
        } else if (step === 18) { // A4: Emotional impact sequence
            addMessage({ author: "user", type: "response", content: response });
            setLastReaction(response as Reaction);
            
            const showRealities = async () => {
                await new Promise(resolve => setTimeout(resolve, 800));
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "Înțeleg perfect reacția. Fără o planificare corectă, dacă acest deficit ar deveni realitate, opțiunile partenerului de viață sunt adesea dureroase. Privește, te rog..."
                });
                
                const realities = [
                    "...să își ia un al doilea job și să dispară din viața copiilor.",
                    "...să vândă casa sau bunuri cu valoare sentimentală.",
                    "...să amâne sau să renunțe la educația copiilor.",
                    "...să ceară ajutor financiar de la familie sau prieteni.",
                    "...să acumuleze datorii pentru a supraviețui de la o lună la alta."
                ];
                
                for (const reality of realities) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    addMessage({ author: "Marius", type: 'text', content: reality }, 'dramatic');
                }
                
                await new Promise(resolve => setTimeout(resolve, 1500));
                setCurrentStep(19);
                conversationFlow(19);
            }
            showRealities();
        } else if (step === 19) { // A5.1: Ask for DOB
            run(() => {
              addMessage({
                  author: "Marius",
                  type: "text",
                  content: "Este un scenariu dificil, dar există soluții. Pentru a-ți oferi o estimare de cost, mai am nevoie de câteva detalii. Te rog să selectezi data nașterii."
              });
              updateUserActions('date');
            });
        } else if (step === 20) { // A5.2: Ask about smoking
            addMessage({ author: "user", type: "response", content: format(response, "dd/MM/yyyy") });
            setUserData(prev => ({...prev, birthDate: response as Date}));
             run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "Mulțumesc. Ești fumător?",
                });
                updateUserActions('buttons', ["Da", "Nu"]);
            });
        } else if (step === 21) { // A5.3: Show solution
            addMessage({ author: "user", type: "response", content: response });
            const finalUserData = { 
                ...userData, 
                isSmoker: response === 'Da',
                gender: 'Masculin' // Assuming gender, can be asked
            } as UserData;
            setUserData(finalUserData);

            const result = calculatePremium(finalUserData);
            const deficit = finalUserData.desiredSum || 0;
            
            let adaptiveMessage;
            if (lastReaction === 'Este o sumă mare') {
                 adaptiveMessage = "Știu că suma pare mare, dar vestea bună este că soluția pentru a proteja complet viitorul familiei tale este mult mai accesibilă.";
            } else {
                 adaptiveMessage = "Mă bucur că vezi lucrurile în perspectivă. Este, într-adevăr, o investiție calculată în liniștea celor dragi.";
            }

            run(() => {
                addMessage({ author: "Marius", type: "text", content: adaptiveMessage });

                setTimeout(() => {
                    addMessage({
                        author: "Marius",
                        type: "text",
                        content: `Pentru a acoperi complet deficitul de ${deficit.toLocaleString('ro-RO')} €, costul estimat al unei asigurări de viață pentru tine ar fi de aproximativ ${result.monthlyPremium.toFixed(2)} € pe lună. Ai fi interesat să vezi o soluție personalizată?`,
                    });
                    updateUserActions('buttons', ['Da, vreau detalii', 'Nu acum']);
                }, 1200);
            });
        } else if (step === 22) { // A6: Handle consultant response
             addMessage({ author: "user", type: "response", content: response });
             if (response === 'Da, vreau detalii') {
                setCurrentStep(101); // Jump to contact form
                conversationFlow(101);
            } else {
                addMessage({ author: "Marius", type: "text", content: "Am înțeles. Îți mulțumesc pentru timpul acordat! Dacă te răzgândești, știi unde mă găsești." });
                updateUserActions(null); setIsWaitingForResponse(false);
            }
        }
      }

      // --- FLOW B: Financial Planning ---
      else if (activeFlow === 'B') {
        if (step === 50) { // B1.1: Intro and ask for target amount
            const priorities = response.join(', ').toLowerCase();
            run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: `Am înțeles, vrei să discutăm despre ${priorities}. Hai să conturăm un plan. Care este suma totală (în €) pe care estimezi că o vei avea nevoie pentru acest obiectiv?`,
                });
                updateUserActions('input', { placeholder: 'Ex: 50000', type: 'number' });
            });
        } else if (step === 51) { // B1.2: Ask for time period
            addMessage({ author: "user", type: "response", content: `€ ${response}` });
            setFinancialData(prev => ({...prev, targetAmount: Number(response)}));
            run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "În câți ani de acum înainte vei avea nevoie de această sumă?",
                });
                updateUserActions('input', { placeholder: 'Ex: 10', type: 'number' });
            });
        } else if (step === 52) { // B1.3: Ask for current savings
            addMessage({ author: "user", type: "response", content: `${response} ani` });
            setFinancialData(prev => ({...prev, protectionPeriod: Number(response)}));
            run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "Ai deja o sumă economisită pentru acest scop? Dacă da, care este valoarea ei?",
                });
                updateUserActions('input', { placeholder: 'Ex: 5000 (sau 0)', type: 'number' });
            });
        } else if (step === 53) { // B2: Show plan
             addMessage({ author: "user", type: "response", content: `€ ${response}` });
            const finalFinancialData = {...financialData, savings: Number(response)} as FinancialData;
            setFinancialData(finalFinancialData);

            const result = calculateSavings(finalFinancialData);
            
            run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: `Am finalizat calculul. Pentru a atinge obiectivul tău de ${result.targetAmount.toLocaleString('ro-RO')} € în ${result.years} ani, ar fi necesar să economisești aproximativ ${result.monthlyContribution.toLocaleString('ro-RO')} € pe lună.`,
                });

                setTimeout(() => {
                    addMessage({
                        author: "Marius",
                        type: "text",
                        content: "Vestea bună este că, prin instrumente de investiții, suma poate fi mai mică. Dorești să discuți cu un consultant pentru a explora opțiunile?",
                    });
                    updateUserActions('buttons', ['Da, vreau detalii', 'Nu acum']);
                }, 1200);
            });
        } else if (step === 54) { // B3: Handle consultant response
             addMessage({ author: "user", type: "response", content: response });
             if (response === 'Da, vreau detalii') {
                setCurrentStep(101); // Jump to contact form
                conversationFlow(101);
            } else {
                addMessage({ author: "Marius", type: "text", content: "Am înțeles. Îți mulțumesc pentru timpul acordat! Dacă te răzgândești, știi unde mă găsești." });
                updateUserActions(null); setIsWaitingForResponse(false);
            }
        }
      }

      // --- SHARED FLOWS ---
      else if (step === 101) { // Contact Form
        run(() => {
            addMessage({
                author: "Marius",
                type: "text",
                content: "Perfect. Pentru a stabili o discuție cu un consultant, te rog să completezi datele de mai jos. Acestea sunt confidențiale și vor fi folosite exclusiv în acest scop.",
            });
            updateUserActions('form', {
                fields: [
                    { name: 'name', placeholder: 'Nume', type: 'text', required: true },
                    { name: 'email', placeholder: 'Email', type: 'email', required: true },
                    { name: 'phone', placeholder: 'Telefon', type: 'tel', required: true },
                ],
                gdpr: 'Sunt de acord cu prelucrarea datelor personale.',
                buttonText: 'Trimite'
            });
        });
      } else if (step === 102) { // Final message after form
        addMessage({ author: "user", type: "response", content: `Nume: ${response.name}, Email: ${response.email}, Telefon: ${response.phone}`});
        setUserData(prev => ({...prev, ...response}));
         run(() => {
            addMessage({
                author: "Marius",
                type: "text",
                content: "Mulțumesc! Datele tale au fost înregistrate. Un consultant te va suna în curând. O zi excelentă!",
            });
            updateUserActions(null);
            setIsWaitingForResponse(false);
        });
      }
    },
    [addMessage, userData, financialData, lastReaction, activeFlow]
  );
  
  const startConversation = useCallback(() => {
    setCurrentStep(1);
    conversationFlow(1);
  }, [conversationFlow]);


  const handleStart = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setView("chat");
    }, 500);
  };

  const handleResponse = (response: any) => {
    updateUserActions(null);
    setIsWaitingForResponse(false);
    
    if (currentUserAction?.type === 'form') {
      setCurrentStep(102); // Shared final step
      conversationFlow(102, response);
      return;
    }

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    conversationFlow(nextStep, response);
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
          onResponse={handleResponse}
          isWaitingForResponse={isWaitingForResponse}
        />
      )}
    </div>
  );
}
