"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

// --- CSS for hiding scrollbar ---
const styles = `
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
`;

export type Message = {
  id: number;
  author: "Marius" | "user";
  type: "text" | "response";
  content: any;
};

export type UserData = {
  birthDate: Date;
  gender: 'Masculin' | 'Feminin';
  isSmoker: boolean;
  desiredSum: number;
  phone?: string;
}

export type FinancialData = {
    protectionPeriod: number;
    monthlyExpenses: number;
    totalDebts: number;
    existingInsurance: number;
    savings: number;
}

export type UserAction = {
  type: 'input' | 'buttons' | 'date' | 'cards';
  options?: any;
}

interface ChatViewProps {
  conversation: Message[];
  userAction: UserAction | null;
  onResponse: (response: any) => void;
  isWaitingForResponse: boolean;
}

const DateOfBirthPicker = ({ onDateSelect }: { onDateSelect: (date: Date) => void }) => {
    const [day, setDay] = useState<string>("");
    const [month, setMonth] = useState<string>("");
    const [year, setYear] = useState<string>("");
    const [error, setError] = useState<string>("");

    const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
    const months = [
        { value: "0", label: "Ianuarie" }, { value: "1", label: "Februarie" },
        { value: "2", label: "Martie" }, { value: "3", label: "Aprilie" },
        { value: "4", label: "Mai" }, { value: "5", label: "Iunie" },
        { value: "6", label: "Iulie" }, { value: "7", label: "August" },
        { value: "8", label: "Septembrie" }, { value: "9", label: "Octombrie" },
        { value: "10", label: "Noiembrie" }, { value: "11", label: "Decembrie" },
    ];
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 53 }, (_, i) => (currentYear - 18 - i).toString());

    const handleConfirm = () => {
        if (day && month && year) {
            const selectedDate = new Date(parseInt(year), parseInt(month), parseInt(day));
            if (selectedDate.getDate() !== parseInt(day)) {
                setError("Data selectată nu este validă.");
                return;
            }
            setError("");
            onDateSelect(selectedDate);
        } else {
            setError("Te rog să completezi toate câmpurile.");
        }
    };

    return (
        <div className="flex flex-col gap-4 p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30 animate-in fade-in-50 w-full">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="day" className="text-sm font-medium text-foreground/80">Ziua</label>
                    <Select onValueChange={setDay} value={day}>
                        <SelectTrigger id="day"><SelectValue placeholder="Zi" /></SelectTrigger>
                        <SelectContent>
                            {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex flex-col gap-1.5">
                    <label htmlFor="month" className="text-sm font-medium text-foreground/80">Luna</label>
                    <Select onValueChange={setMonth} value={month}>
                        <SelectTrigger id="month"><SelectValue placeholder="Lună" /></SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex flex-col gap-1.5">
                    <label htmlFor="year" className="text-sm font-medium text-foreground/80">Anul</label>
                    <Select onValueChange={setYear} value={year}>
                        <SelectTrigger id="year"><SelectValue placeholder="An" /></SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={handleConfirm} className="w-full">Confirmă</Button>
        </div>
    );
};


const ChatView = ({ conversation, userAction, onResponse, isWaitingForResponse }: ChatViewProps) => {
  const [inputValue, setInputValue] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onResponse(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const renderUserActions = () => {
    if (!userAction || (!isWaitingForResponse && userAction.type !== 'cards')) return null;

    switch (userAction.type) {
      case "buttons":
        return (
          <div className="flex flex-col gap-3 w-full animate-in fade-in-50">
            {userAction.options?.map((option: string, index: number) => (
              <Button
                key={index}
                onClick={() => onResponse(option)}
                variant="outline"
                className="bg-white/50 backdrop-blur-sm border-white/30 text-foreground shadow-md justify-start p-4 h-auto hover:bg-white/80"
              >
                {option}
              </Button>
            ))}
          </div>
        );
      case "input":
        return (
            <div className="flex w-full items-center space-x-2 animate-in fade-in-50">
              <Input
                type={userAction.options?.type || 'text'}
                placeholder={userAction.options?.placeholder || ''}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white"
                autoFocus
              />
              <Button type="submit" onClick={handleSend} disabled={!inputValue.trim()}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Trimite</span>
              </Button>
            </div>
        );
      case "date":
        return (
          <DateOfBirthPicker onDateSelect={onResponse} />
        )
      case "cards":
        return (
            <div className="flex flex-col gap-3 w-full">
                {userAction.options?.map((cardText: string, index: number) => (
                    <Card 
                        key={index}
                        className="bg-white/60 backdrop-blur-sm border-white/30 text-center animate-in fade-in slide-in-from-bottom-5 duration-500"
                        style={{ animationDelay: `${index * 300}ms` }}
                    >
                        <CardContent className="p-3">
                            <p className="text-foreground/80 font-medium">{cardText}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
      default:
        return null;
    }
  };

  return (
    <>
    <style>{styles}</style>
    <div id="chat-container" className="w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-8rem)] bg-black/5 rounded-2xl shadow-2xl overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-50" data-state="open">
        {/* Zona de Dialog */}
        <div id="dialog-flow" className="flex-grow space-y-6 overflow-y-auto p-4 md:p-6 no-scrollbar">
            {conversation.map((message) => (
            <div
                key={message.id}
                className={cn(
                "flex items-end gap-3 w-full animate-in fade-in slide-in-from-bottom-5 duration-500",
                message.author === "Marius" ? "justify-start" : "justify-end"
                )}
            >
                {message.author === "Marius" && (
                <Avatar className="h-8 w-8 hidden sm:flex self-start">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                    M
                    </AvatarFallback>
                </Avatar>
                )}
                <div
                className={cn(
                    "max-w-md md:max-w-lg rounded-2xl px-4 py-3 shadow-md",
                    message.author === "Marius"
                    ? "bg-white/80 backdrop-blur-sm text-gray-800 rounded-bl-none"
                    : "bg-primary text-primary-foreground rounded-br-none"
                )}
                >
                <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
            </div>
            ))}
            {isWaitingForResponse && conversation.length > 0 && userAction === null && (
            <div className="flex items-end gap-3 w-full justify-start">
                <Avatar className="h-8 w-8 hidden sm:flex self-start">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                    M
                    </AvatarFallback>
                </Avatar>
                <div className="bg-white/80 backdrop-blur-sm text-gray-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-md">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 bg-primary rounded-full animate-bounce"></span>
                    </div>
                </div>
            </div>
            )}
            <div ref={endOfMessagesRef} />
        </div>
      
        {/* Zona de Acțiune */}
        <div id="user-actions-container" className="flex-shrink-0 p-4 bg-transparent">
            <div className="w-full md:w-auto md:max-w-sm ml-auto flex flex-col justify-center items-center">
             {renderUserActions()}
            </div>
        </div>
    </div>
    </>
  );
};

export default ChatView;
