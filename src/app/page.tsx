"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import LandingView from "@/components/conversation/landing-view";
import ChatView from "@/components/conversation/chat-view";
import type { Message, UserAction, UserData, FinancialData } from "@/components/conversation/chat-view";
import { calculatePremium, calculateDeficit } from "@/lib/calculation";
import { format } from "date-fns";

export default function Home() {
  const [view, setView] = useState<"landing" | "chat">("landing");
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [currentUserAction, setCurrentUserAction] = useState<UserAction | null>(null);
  const [userData, setUserData] = useState<Partial<UserData>>({});
  const [financialData, setFinancialData] = useState<Partial<FinancialData>>({});

  const conversationIdRef = useRef(0);

  const addMessage = useCallback((message: Omit<Message, "id">) => {
    setConversation((prev) => [
      ...prev,
      { ...message, id: conversationIdRef.current++ },
    ]);
  }, []);

  const updateUserActions = (type: UserAction['type'] | null, options?: any) => {
    if (type === null) {
      setCurrentUserAction(null);
    } else {
      setCurrentUserAction({ type, options });
    }
  };

  const conversationFlow = useCallback(
    (step: number, response?: any) => {
      setIsWaitingForResponse(true);

      const performFinalCalculation = (deficit: number, protectionPeriod: number) => {
        const finalUserData = { ...userData, desiredSum: deficit, insuranceDuration: protectionPeriod } as UserData;
        const result = calculatePremium(finalUserData);
        
        setTimeout(() => {
          addMessage({
            author: "Marius",
            type: "text",
            content: `Pentru a oferi familiei tale protecția de ${deficit.toLocaleString('ro-RO')} €, pe o perioadă de ${protectionPeriod} ani, costul estimat al asigurării tale de viață ar fi de aproximativ ${result.monthlyPremium.toFixed(2)} € pe lună.`,
          });
        }, 800);
        
        setTimeout(() => conversationFlow(11), 1600);
      };

      setTimeout(() => {
        if (step === 1) { // Ask for birth date
          addMessage({
            author: "Marius",
            type: "text",
            content: "Pentru a începe, îmi poți spune data ta de naștere?",
          });
          updateUserActions('date');
        } else if (step === 2) { // Ask about smoking
          addMessage({ author: "user", type: "response", content: format(response, "dd/MM/yyyy") });
          setUserData(prev => ({...prev, birthDate: response as Date}));
          addMessage({
            author: "Marius",
            type: "text",
            content: "Mulțumesc. Ești fumător sau ai consumat produse cu tutun/nicotină în ultimele 12 luni?",
          });
          updateUserActions('buttons', ["Da", "Nu"]);
        } else if (step === 3) { // Ask for gender
          addMessage({ author: "user", type: "response", content: response });
          setUserData(prev => ({...prev, isSmoker: response === 'Da'}));
          addMessage({
            author: "Marius",
            type: "text",
            content: "Te rog să selectezi sexul tău.",
          });
          updateUserActions('buttons', ["Masculin", "Feminin"]);
        } else if (step === 4) { // Transition to needs analysis
          addMessage({ author: "user", type: "response", content: response });
          setUserData(prev => ({...prev, gender: response as 'Masculin' | 'Feminin'}));
          addMessage({
            author: "Marius",
            type: "text",
            content: "Mulțumesc pentru informații. Pe baza acestor date, putem estima un cost. Dar înainte de a vorbi despre prețuri, experiența îmi arată că cel mai important pas este să înțelegem exact ce anume trebuie să protejăm.",
          });
          setTimeout(() => {
             addMessage({
              author: "Marius",
              type: "text",
              content: "Ai fi interesat să vezi gradul real de expunere financiară a familiei tale în cazul unui eveniment neprevăzut?",
            });
            updateUserActions('buttons', ["Da, sunt interesat", "Nu, vreau doar o estimare rapidă"]);
          }, 1200);
        } else if (step === 5) { // Needs analysis or quick estimate
          addMessage({ author: "user", type: "response", content: response });
          if (response === 'Da, sunt interesat') {
            addMessage({
              author: "Marius",
              type: "text",
              content: "Excelent. Hai să calculăm împreună. Pentru ce perioadă (în ani) ai dori ca familia ta să aibă completă siguranță financiară, fără grija banilor?",
            });
            updateUserActions('input', { placeholder: 'Ex: 20', type: 'number' });
          } else {
             // Quick estimate path
            const quickUserData = { ...userData, desiredSum: 100000, insuranceDuration: 20 } as UserData;
            const result = calculatePremium(quickUserData);
            addMessage({
              author: "Marius",
              type: "text",
              content: `Am înțeles. Pentru o sumă asigurată de 100.000 € pe 20 de ani, costul estimat ar fi de aproximativ ${result.monthlyPremium.toFixed(2)} € pe lună.`,
            });
             setTimeout(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "Reține, aceasta este o estimare generică. O analiză a nevoilor ar oferi o imagine mult mai clară.",
                });
            }, 800);
            setTimeout(() => conversationFlow(11), 2000); // Skip to final step
          }
        } else if (step === 6) { // Ask for monthly expenses
          addMessage({ author: "user", type: "response", content: `${response} ani` });
          setFinancialData(prev => ({...prev, protectionPeriod: Number(response)}));
          addMessage({
            author: "Marius",
            type: "text",
            content: "Care ar fi suma lunară (în €) necesară pentru ca familia să mențină stilul de viață actual (chirie/rată, facturi, mâncare, etc.)?",
          });
          updateUserActions('input', { placeholder: 'Ex: 1500', type: 'number' });
        } else if (step === 7) { // Ask about debts
           addMessage({ author: "user", type: "response", content: `€ ${response}` });
           setFinancialData(prev => ({...prev, monthlyExpenses: Number(response)}));
           addMessage({
             author: "Marius",
             type: "text",
             content: "Există credite sau alte datorii (ipotecar, credit de nevoi personale) care ar trebui acoperite integral? Dacă da, care este soldul total aproximativ?",
           });
           updateUserActions('input', { placeholder: 'Ex: 50000 (sau 0)', type: 'number' });
        } else if (step === 8) { // Ask about existing insurance
            addMessage({ author: "user", type: "response", content: `€ ${response}` });
            setFinancialData(prev => ({...prev, totalDebts: Number(response)}));
            addMessage({
              author: "Marius",
              type: "text",
              content: "Și acum, să vedem resursele existente. Aveți vreo asigurare de viață care să acopere decesul? Dacă da, ce sumă ar primi familia?",
            });
            updateUserActions('input', { placeholder: 'Ex: 10000 (sau 0)', type: 'number' });
        } else if (step === 9) { // Ask about savings
            addMessage({ author: "user", type: "response", content: `€ ${response}` });
            setFinancialData(prev => ({...prev, existingInsurance: Number(response)}));
            addMessage({
              author: "Marius",
              type: "text",
              content: "În final, aveți economii sau investiții la care familia ar putea apela imediat, fără a afecta alte planuri pe termen lung?",
            });
            updateUserActions('input', { placeholder: 'Ex: 5000 (sau 0)', type: 'number' });
        } else if (step === 10) { // Calculate and show deficit
            addMessage({ author: "user", type: "response", content: `€ ${response}` });
            const finalFinancialData = {...financialData, savings: Number(response)} as FinancialData;
            setFinancialData(finalFinancialData);
            
            const deficit = calculateDeficit(finalFinancialData);
            setUserData(prev => ({...prev, desiredSum: deficit, insuranceDuration: finalFinancialData.protectionPeriod}));
            
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
                updateUserActions('input', { placeholder: 'Scrie un răspuns...', type: 'text' });
            }, 1200);

        } else if (step === 11) { // Emotional impact cards
            if(typeof response === 'string' && response.length > 0) {
                 addMessage({ author: "user", type: "response", content: response });
            }
            addMessage({
                author: "Marius",
                type: "text",
                content: "Înțeleg perfect. Este o sumă care te pune pe gânduri. Fără o planificare corectă, dacă acest deficit ar deveni realitate, opțiunile partenerului de viață sunt adesea dureroase."
            });
            setTimeout(() => {
                addMessage({
                    author: "Marius",
                    type: "text",
                    content: "Privește, te rog, câteva dintre realitățile cu care s-ar putea confrunta..."
                });
                updateUserActions('cards', [
                    "...să își ia un al doilea job, sacrificând timpul prețios cu copiii.",
                    "...să vândă casa sau bunuri cu valoare sentimentală.",
                    "...să renunțe la planurile pentru educația copiilor.",
                    "...să ceară ajutor familiei sau prietenilor."
                ]);
                setIsWaitingForResponse(false); // Allows cards to show without needing input

                // After showing cards, move to the solution
                setTimeout(() => {
                    updateUserActions(null);
                    conversationFlow(12);
                }, 7000); 

            }, 1500);

        } else if (step === 12) { // The solution and final calculation
            addMessage({
                author: "Marius",
                type: "text",
                content: "Este un scenariu dificil, dar vestea bună este că există o soluție directă și accesibilă pentru a elimina complet acest risc. O asigurare de viață corect dimensionată acoperă exact acest deficit."
            });
            const finalUserData = { ...userData } as UserData;
            performFinalCalculation(finalUserData.desiredSum!, finalUserData.insuranceDuration!);

        } else if (step === 13) { // Ask about consultant
           addMessage({
            author: "Marius",
            type: "text",
            content: "Acum că știi atât nevoia reală, cât și costul estimat al protecției, vrei să discuți cu un consultant pentru a explora o ofertă personalizată, fără nicio obligație?",
          });
          updateUserActions('buttons', ['Da, vreau detalii', 'Nu acum']);
        } else if (step === 14) { // Handle consultant response
          addMessage({ author: "user", type: "response", content: response });
          if (response === 'Da, vreau detalii') {
            addMessage({
              author: "Marius",
              type: "text",
              content: "Excelent! Te rog să introduci numărul tău de telefon și un consultant te va contacta în cel mai scurt timp.",
            });
            updateUserActions('input', { placeholder: 'Nr. de telefon', type: 'tel' });
          } else {
            addMessage({
              author: "Marius",
              type: "text",
              content: "Am înțeles. Îți mulțumesc pentru timpul acordat! Dacă te răzgândești, știi unde mă găsești.",
            });
            updateUserActions(null);
            setIsWaitingForResponse(false);
          }
        } else if (step === 15) { // Final message
            addMessage({ author: "user", type: "response", content: response });
            setUserData(prev => ({...prev, phone: response}));
             addMessage({
              author: "Marius",
              type: "text",
              content: "Mulțumesc! Datele tale au fost înregistrate. Un consultant te va suna în curând. O zi excelentă!",
            });
            updateUserActions(null);
            setIsWaitingForResponse(false);
        }
      }, 800);
    },
    [addMessage, userData, financialData]
  );
  
  const startConversation = useCallback(() => {
    addMessage({
        author: "Marius",
        type: "text",
        content: "Bun venit! Sunt Marius, asistentul tău virtual. Te voi ajuta să înțelegi nevoia reală de protecție financiară a familiei tale.",
    });
    conversationFlow(1);
  }, [addMessage, conversationFlow]);

  const handleRiskSelect = (riskTitle: string) => {
     if (riskTitle !== 'Deces') {
        // For now, only the "Deces" flow is fully implemented
        alert("Momentan, doar fluxul pentru riscul de 'Deces' este complet funcțional. Te rog să selectezi acest card pentru a continua.");
        return;
    }
    setIsFadingOut(true);
    setTimeout(() => {
      setView("chat");
      setCurrentStep(1);
    }, 500);
  };

  const handleResponse = (response: any) => {
    // A special case for the emotional cards, where there's no response needed
    if (currentUserAction?.type === 'cards') return;

    if (!isWaitingForResponse) return;
    setIsWaitingForResponse(false);
    updateUserActions(null);
    
    // Adjust step based on logic, not just incrementing
    let nextStep = currentStep + 1;
    // If user said "No" to needs analysis, we jump from step 5 to 13 (consultant question)
    if (currentStep === 4 && response === "Nu, vreau doar o estimare rapidă") {
      nextStep = 13;
    } else if(currentStep === 10) { // After deficit reflection
      nextStep = 11;
    } else if (currentStep === 12) { // After final premium, ask for consultant
        nextStep = 13;
    }


    conversationFlow(nextStep, response);
    setCurrentStep(nextStep);
  };
  
  useEffect(() => {
    if (currentStep === 1 && view === 'chat') {
       startConversation();
    }
  }, [currentStep, view, startConversation]);


  return (
    <div className="container mx-auto min-h-screen px-4 py-8 md:py-16 flex flex-col items-center justify-center">
      {view === "landing" ? (
        <LandingView onRiskSelect={handleRiskSelect} isFadingOut={isFadingOut} />
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

    