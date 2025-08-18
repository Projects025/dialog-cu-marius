"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import LandingView from "@/components/conversation/landing-view";
import ChatView from "@/components/conversation/chat-view";
import type { Message } from "@/components/conversation/chat-view";

const riskToQuestionMap: Record<string, string> = {
  Deces:
    "Protejarea familiei în situații neprevăzute este un subiect esențial.",
  Pensionare: "Planificarea unui viitor confortabil este un pas important.",
  Invaliditate: "Asigurarea stabilității în caz de invaliditate este crucială.",
  "Boli Grave":
    "Pregătirea pentru evenimente neașteptate legate de sănătate este înțeleaptă.",
};

export default function Home() {
  const [view, setView] = useState<"landing" | "chat">("landing");
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const conversationIdRef = useRef(0);

  const addMessage = useCallback((message: Omit<Message, "id">) => {
    setConversation((prev) => [
      ...prev,
      { ...message, id: conversationIdRef.current++ },
    ]);
  }, []);

  const conversationFlow = useCallback(
    (step: number, response?: string) => {
      setTimeout(() => {
        if (step === 1) {
          const personalizedIntro = selectedRisk
            ? riskToQuestionMap[selectedRisk]
            : "Să începem.";
          addMessage({
            author: "Marius",
            type: "text",
            content: `${personalizedIntro} Pentru a putea face o analiză corectă, îmi poți spune care este venitul tău lunar net?`,
          });
          setIsWaitingForResponse(true);
        } else if (step === 2) {
          addMessage({ author: "user", type: "response", content: `€ ${response}` });
          addMessage({
            author: "Marius",
            type: "text",
            content:
              "Mulțumesc. Acum, pentru a înțelege contextul familiei, ești căsătorit(ă) sau într-o relație stabilă?",
          });
          addMessage({
            author: "user",
            type: "options",
            content: ["Da", "Nu"],
          });
          setIsWaitingForResponse(true);
        } else if (step === 3) {
          addMessage({ author: "user", type: "response", content: response });
          addMessage({
            author: "Marius",
            type: "text",
            content: "Perfect. Ai copii sau alte persoane în întreținere?",
          });
          addMessage({
            author: "user",
            type: "options",
            content: ["Da", "Nu"],
          });
          setIsWaitingForResponse(true);
        } else if (step === 4) {
          addMessage({ author: "user", type: "response", content: response });
          addMessage({
            author: "Marius",
            type: "text",
            content:
              "Am înțeles. Mulțumesc pentru informații! Acesta este un prim pas excelent în evaluarea situației tale financiare.",
          });
          setIsWaitingForResponse(false);
        }
      }, 800);
    },
    [addMessage, selectedRisk]
  );

  const handleRiskSelect = (riskTitle: string) => {
    setIsFadingOut(true);
    setTimeout(() => {
      setSelectedRisk(riskTitle);
      setView("chat");
      setCurrentStep(1);
    }, 500); // Duration should match the fade-out animation
  };

  const handleResponse = (response: string) => {
    if (!isWaitingForResponse) return;
    setIsWaitingForResponse(false);
    
    // Remove options/input from conversation
    setConversation(prev => prev.filter(msg => msg.type !== 'options' && msg.type !== 'input'));
    
    const nextStep = currentStep + 1;
    conversationFlow(nextStep, response);
    setCurrentStep(nextStep);
  };
  
  useEffect(() => {
    if (currentStep === 1 && view === 'chat') {
       conversationFlow(1);
    }
  }, [currentStep, view, conversationFlow]);


  return (
    <div className="container mx-auto min-h-screen px-4 py-8 md:py-16 flex flex-col items-center justify-center">
      {view === "landing" ? (
        <LandingView onRiskSelect={handleRiskSelect} isFadingOut={isFadingOut} />
      ) : (
        <ChatView
          conversation={conversation}
          onResponse={handleResponse}
          isWaitingForResponse={isWaitingForResponse}
        />
      )}
    </div>
  );
}
