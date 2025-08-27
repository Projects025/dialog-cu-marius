"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import LandingView from "@/components/conversation/landing-view";
import ChatView from "@/components/conversation/chat-view";
import type { Message, UserAction, UserData, FinancialData } from "@/components/conversation/chat-view";
import { calculatePremium, calculateDeficit } from "@/lib/calculation";
import { format } from "date-fns";

export type Reaction = 'Este o sumă mare' | 'Rezonabil' | 'Mă așteptam' | null;

export default function Home() {
  const [view, setView] = useState<"landing" | "chat">("landing");
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
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
      } else if (step === 2) { // Handle priorities
        addMessage({ author: "user", type: "response", content: response.join(', ') });
        setUserPriorities(response);

        if (response.includes("Protecție în caz de deces") || response.includes("Protecție în caz de boală gravă")) {
            run(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "Perfect. Văd că protecția familiei este o prioritate pentru tine. Ești pregătit să descoperim împreună gradul real de expunere financiară în cazul unui eveniment neprevăzut?",
                });
                updateUserActions('buttons', ['Da, sunt pregătit', 'Poate altă dată']);
            });
        } else {
            setCurrentStep(100); // Jump to contact form
            conversationFlow(100, response); // Pass priorities for custom message
        }
      } else if (step === 3) { // Ask for protection period
        run(() => {
            addMessage({ author: "user", type: "response", content: response });
            if (response === 'Poate altă dată') {
                addMessage({ author: "Marius", type: "text", content: "Am înțeles. Când ești pregătit, știi unde mă găsești." });
                updateUserActions(null);
                setIsWaitingForResponse(false);
                return;
            }
            addMessage({
                author: "Marius",
                type: "text",
                content: "Excelent. Pentru a calcula exact plasa de siguranță, am nevoie de câteva informații. Mai întâi, pentru ce perioadă (în ani) ai dori ca familia ta să aibă completă siguranță financiară?",
            });
            updateUserActions('buttons', ['3 ani', '4 ani', '5 ani']);
        });
      } else if (step === 4) { // Ask for monthly expenses
        run(() => {
            addMessage({ author: "user", type: "response", content: response });
            const years = parseInt(response.split(' ')[0], 10);
            setFinancialData(prev => ({...prev, protectionPeriod: years}));
            addMessage({
                author: "Marius",
                type: "text",
                content: "Am notat. Acum, care ar fi suma lunară (în €) necesară pentru ca familia să mențină stilul de viață actual (rate, facturi, mâncare etc.)?",
            });
            updateUserActions('input', { placeholder: 'Ex: 1500', type: 'number' });
        });
      } else if (step === 5) { // Ask for projects/extra costs
        run(() => {
            addMessage({ author: "user", type: "response", content: `€ ${response}` });
            setFinancialData(prev => ({...prev, monthlyExpenses: Number(response)}));
            addMessage({
                author: "Marius",
                type: "text",
                content: "Există proiecte importante (educația copiilor, finalizarea casei) sau cheltuieli neprevăzute (taxe, costuri funerare) care ar trebui acoperite? Dacă da, care este suma totală necesară?",
            });
            updateUserActions('input', { placeholder: 'Ex: 20000 (sau 0)', type: 'number' });
        });
      } else if (step === 6) { // Ask about existing insurance
        run(() => {
            addMessage({ author: "user", type: "response", content: `€ ${response}` });
            setFinancialData(prev => ({...prev, futureProjects: Number(response)}));
            addMessage({
                author: "Marius",
                type: "text",
                content: "Acum, să vedem resursele existente. Aveți vreo asigurare de viață care să acopere un deces? Dacă da, ce sumă ar primi familia?",
            });
            updateUserActions('input', { placeholder: 'Ex: 10000 (sau 0)', type: 'number' });
        });
      } else if (step === 7) { // Ask about savings
        run(() => {
            addMessage({ author: "user", type: "response", content: `€ ${response}` });
            setFinancialData(prev => ({...prev, existingInsurance: Number(response)}));
            addMessage({
                author: "Marius",
                type: "text",
                content: "Și în final, aveți economii sau investiții disponibile imediat, fără a afecta alte planuri pe termen lung?",
            });
            updateUserActions('input', { placeholder: 'Ex: 5000 (sau 0)', type: 'number' });
        });
      } else if (step === 8) { // Calculate and show deficit
        run(() => {
            addMessage({ author: "user", type: "response", content: `€ ${response}` });
            const finalFinancialData = {...financialData, savings: Number(response)} as FinancialData;
            setFinancialData(finalFinancialData);
            
            const deficit = calculateDeficit(finalFinancialData);
            setUserData(prev => ({...prev, desiredSum: deficit}));
            
            addMessage({
                author: "Marius",
                type: "text",
                content: `Am finalizat calculul. Deficitul financiar, adică plasa de siguranță necesară pentru a îndeplini obiectivele setate, este de ${deficit.toLocaleString('ro-RO')} €.`,
            });

            setTimeout(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: `Cum ți se pare această sumă, știind că ea reprezintă liniștea financiară a familiei tale?`
                });
                updateUserActions('buttons', ['Este o sumă mare', 'Rezonabil', 'Mă așteptam']);
            }, 1200);
        });
      } else if (step === 9) { // Emotional impact sequence
        addMessage({ author: "user", type: "response", content: response });
        setLastReaction(response as Reaction);
        
        const showRealities = async () => {
            await new Promise(resolve => setTimeout(resolve, 800));
            addMessage({
                author: "Marius",
                type: "text",
                content: "Înțeleg perfect reacția. Fără o planificare corectă, dacă acest deficit ar deveni realitate, opțiunile partenerului de viață sunt adesea dureroase. Privește, te rog, câteva dintre realitățile cu care s-ar putea confrunta..."
            });
            
            const realities = [
                "...să își ia un al doilea job și să dispară din viața copiilor.",
                "...să vândă casa sau bunuri cu valoare sentimentală.",
                "...să amâne sau să renunțe la educația copiilor.",
                "...să ceară ajutor financiar de la familie sau prieteni."
            ];
            
            for (const reality of realities) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                addMessage({ author: "Marius", type: 'text', content: reality }, 'dramatic');
            }
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            setCurrentStep(10);
            conversationFlow(10);
        }
        showRealities();
      } else if (step === 10) { // Ask for risk details (DOB)
          run(() => {
              addMessage({
                  author: "Marius",
                  type: "text",
                  content: "Este un scenariu dificil, dar există soluții pentru a-l preveni. Pentru a-ți putea oferi o estimare de cost, mai am nevoie doar de câteva detalii despre tine. Te rog să selectezi data nașterii."
              });
              updateUserActions('date');
          });
      } else if (step === 11) { // Ask about smoking
        run(() => {
            addMessage({ author: "user", type: "response", content: format(response, "dd/MM/yyyy") });
            setUserData(prev => ({...prev, birthDate: response as Date}));
            addMessage({
                author: "Marius",
                type: "text",
                content: "Mulțumesc. Ești fumător sau ai consumat produse cu tutun/nicotină în ultimele 12 luni?",
            });
            updateUserActions('buttons', ["Da", "Nu"]);
        });
      } else if (step === 12) { // Ask for gender & show solution
        run(() => {
            addMessage({ author: "user", type: "response", content: response });
            // This is the last piece of data needed for calculation
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

            addMessage({ author: "Marius", type: "text", content: adaptiveMessage });

            setTimeout(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: `Pentru a acoperi complet deficitul de ${deficit.toLocaleString('ro-RO')} €, costul estimat al unei asigurări de viață pentru tine ar fi de aproximativ ${result.monthlyPremium.toFixed(2)} € pe lună. Ai fi interesat să vezi o soluție personalizată, fără nicio obligație?`,
                });
                updateUserActions('buttons', ['Da, vreau detalii', 'Nu acum']);
            }, 1200);
        });
      } else if (step === 13) { // Handle consultant response
        run(() => {
            addMessage({ author: "user", type: "response", content: response });
            if (response === 'Da, vreau detalii') {
                setCurrentStep(101); // Jump to contact form, standard message
                conversationFlow(101);
            } else {
                addMessage({
                author: "Marius",
                type: "text",
                content: "Am înțeles. Îți mulțumesc pentru timpul acordat! Dacă te răzgândești, știi unde mă găsești.",
                });
                updateUserActions(null);
                setIsWaitingForResponse(false);
            }
        });
      } else if (step === 14) { // Final message after form
        run(() => {
            addMessage({ author: "user", type: "response", content: `Nume: ${response.name}, Email: ${response.email}, Telefon: ${response.phone}`});
            setUserData(prev => ({...prev, ...response}));
            addMessage({
                author: "Marius",
                type: "text",
                content: "Mulțumesc! Datele tale au fost înregistrate. Un consultant te va suna în curând. O zi excelentă!",
            });
            updateUserActions(null);
            setIsWaitingForResponse(false);
        });
      }

      // Bifurcation flows
      else if (step === 100) { // Jump to contact form from priorities
        run(() => {
            const priorities = response.join(', ').toLowerCase();
            addMessage({
                author: "Marius",
                type: "text",
                content: `Am înțeles. Pentru a discuta despre ${priorities}, cel mai bine este să vorbești direct cu un consultant. Te rog completează datele de mai jos.`
            });
            setCurrentStep(101);
            conversationFlow(101);
        });
      } else if (step === 101) { // Contact Form
        run(() => {
            addMessage({
                author: "Marius",
                type: "text",
                content: "Pentru a stabili o discuție cu un consultant, te rog să completezi datele de mai jos. Acestea sunt confidențiale și vor fi folosite exclusiv în acest scop.",
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
      }
    },
    [addMessage, userData, financialData, lastReaction]
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
    
    // For form, the next step is handled differently
    if (currentUserAction?.type === 'form') {
      setCurrentStep(14);
      conversationFlow(14, response);
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
