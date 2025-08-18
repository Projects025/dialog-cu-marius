"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  insuranceDuration: number;
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

const ChatView = ({ conversation, userAction, onResponse, isWaitingForResponse }: ChatViewProps) => {
  const [inputValue, setInputValue] = useState("");
  const [date, setDate] = useState<Date | undefined>();
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

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      onResponse(selectedDate);
    }
  }

  const renderUserActions = () => {
    // Only show actions if Marius is waiting for a response, UNLESS it's the special cards case
    if (!isWaitingForResponse && userAction?.type !== 'cards') return null;
    if (!userAction) return null;


    switch (userAction.type) {
      case "buttons":
        return (
          <div className="flex flex-col sm:flex-row gap-2 mt-2 justify-center animate-in fade-in-50">
            {userAction.options?.map((option: string, index: number) => (
              <Button
                key={index}
                onClick={() => onResponse(option)}
                variant="outline"
                className="bg-white hover:bg-gray-100 text-primary-foreground border-gray-200 shadow-sm"
              >
                {option}
              </Button>
            ))}
          </div>
        );
      case "input":
        return (
            <div className="flex w-full max-w-sm items-center space-x-2 mt-2 animate-in fade-in-50">
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
           <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal bg-white animate-in fade-in-50",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Alege o dată</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
                captionLayout="dropdown-buttons"
                fromYear={1930}
                toYear={new Date().getFullYear() - 18}
              />
            </PopoverContent>
          </Popover>
        )
      case "cards":
        return (
            <div className="flex flex-col gap-3 mt-2 justify-center w-full max-w-md">
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
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[85vh] data-[state=open]:animate-in data-[state=open]:fade-in-50" data-state="open">
      <div id="dialog-flow" className="flex-grow space-y-6 overflow-y-auto p-4 rounded-lg scroll-smooth">
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
      <div id="user-actions" className="py-4 flex justify-center items-center min-h-[70px]">
        {renderUserActions()}
      </div>
    </div>
  );
};

export default ChatView;

    