"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import LandingView from "@/components/conversation/landing-view";
import ChatView from "@/components/conversation/chat-view";
import type { Message, UserAction, UserData } from "@/components/conversation/chat-view";
import { calculatePremium } from "@/lib/calculation";
import { format } from "date-fns";

export default function Home() {
  const [view, setView] = useState<"landing" | "chat">("landing");
  const [isFadingOut, setIsFadingOut] =useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [currentUserAction, setCurrentUserAction] = useState<UserAction | null>(null);
  const [userData, setUserData] = useState<Partial<UserData>>({});
  
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

      const performCalculation = () => {
        const finalUserData = { ...userData } as UserData;
        const result = calculatePremium(finalUserData);
        
        addMessage({
          author: "Marius",
          type: "text",
          content: `Mulțumesc pentru informații. Pe baza profilului tău, o asigurare de viață de ${finalUserData.desiredSum.toLocaleString('ro-RO')} € pe o perioadă de ${finalUserData.insuranceDuration} de ani ar avea un cost estimat de aproximativ ${result.monthlyPremium.toFixed(2)} € pe lună.`,
        });
         addMessage({
          author: "Marius",
          type: "text",
          content: "Aceasta este o estimare preliminară. Un consultant te poate ajuta să optimizezi oferta exact pentru nevoile tale."
        });
        
        // Ask about consultant
        setTimeout(() => conversationFlow(9), 800);
      };
      
      setTimeout(() => {
        if (step === 1) {
          addMessage({
            author: "Marius",
            type: "text",
            content: "Pentru a începe, îmi poți spune data ta de naștere?",
          });
          updateUserActions('date');
        } else if (step === 2) {
          addMessage({ author: "user", type: "response", content: format(response, "dd/MM/yyyy") });
          setUserData(prev => ({...prev, birthDate: response as Date}));
          addMessage({
            author: "Marius",
            type: "text",
            content: "Mulțumesc. Acum, te rog să selectezi sexul tău.",
          });
          updateUserActions('buttons', ["Masculin", "Feminin"]);
        } else if (step === 3) {
          addMessage({ author: "user", type: "response", content: response });
          setUserData(prev => ({...prev, gender: response as 'Masculin' | 'Feminin'}));
          addMessage({
            author: "Marius",
            type: "text",
            content: "Următoarea întrebare este foarte importantă pentru calcul. Ești fumător sau ai fumat în ultimele 12 luni?",
          });
          updateUserActions('buttons', ["Da", "Nu"]);
        } else if (step === 4) {
          addMessage({ author: "user", type: "response", content: response });
           setUserData(prev => ({...prev, isSmoker: response === 'Da'}));
          addMessage({
            author: "Marius",
            type: "text",
            content: "Acum, hai să vorbim despre protecția în sine. Ce sumă consideri că ar trebui să primească familia ta pentru a-și menține stabilitatea financiară?",
          });
           updateUserActions('input', { placeholder: 'Ex: 100000', type: 'number' });
        } else if (step === 5) {
          addMessage({ author: "user", type: "response", content: `€ ${response}` });
          setUserData(prev => ({...prev, desiredSum: Number(response)}));
          addMessage({
            author: "Marius",
            type: "text",
            content: "Pe ce perioadă de timp ai dori să fie valabilă această protecție? De obicei, se alege perioada până la terminarea unui credit, până copiii devin independenți sau până la vârsta de pensionare.",
          });
          updateUserActions('buttons', ["10 ani", "20 ani", "30 ani"]);
        } else if (step === 6) {
           addMessage({ author: "user", type: "response", content: response });
           setUserData(prev => ({...prev, insuranceDuration: parseInt(response)}));
           addMessage({
             author: "Marius",
             type: "text",
             content: "Pentru a finaliza profilul, care este domeniul tău de activitate?",
           });
           updateUserActions('buttons', ["Muncă de birou", "Muncă fizică redusă", "Muncă fizică solicitantă / cu risc"]);
        } else if (step === 7) {
            addMessage({ author: "user", type: "response", content: response });
            setUserData(prev => ({...prev, occupation: response}));
            addMessage({
              author: "Marius",
              type: "text",
              content: "Ai fost diagnosticat în ultimii 5 ani cu afecțiuni medicale grave (ex: boli de inimă, diabet, cancer)?",
            });
            updateUserActions('buttons', ["Da", "Nu"]);
        } else if (step === 8) {
            addMessage({ author: "user", type: "response", content: response });
            setUserData(prev => ({...prev, healthStatus: response === 'Da'}));
            addMessage({
              author: "Marius",
              type: "text",
              content: "Perfect. Calculez acum cea mai bună estimare pentru tine...",
            });
            setIsWaitingForResponse(true);
            updateUserActions(null);
            setTimeout(performCalculation, 1500);
        } else if (step === 9) {
          addMessage({
            author: "Marius",
            type: "text",
            content: "Dorești să fii contactat de un consultant pentru o ofertă personalizată și fără obligații?",
          });
          updateUserActions('buttons', ['Da, doresc', 'Nu, mulțumesc']);
        } else if (step === 10) {
          addMessage({ author: "user", type: "response", content: response });
          if (response === 'Da, doresc') {
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
        } else if (step === 11) {
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
    [addMessage, userData]
  );
  
  const startConversation = useCallback(() => {
    addMessage({
        author: "Marius",
        type: "text",
        content: "Bun venit! Sunt Marius, asistentul tău virtual. Te voi ajuta să estimezi costul unei asigurări de viață.",
    });
    conversationFlow(1);
  }, [addMessage, conversationFlow]);

  const handleRiskSelect = (riskTitle: string) => {
    setIsFadingOut(true);
    setTimeout(() => {
      setView("chat");
      setCurrentStep(1);
    }, 500);
  };

  const handleResponse = (response: any) => {
    if (!isWaitingForResponse) return;
    setIsWaitingForResponse(false);
    updateUserActions(null);
    
    const nextStep = currentStep + 1;
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
