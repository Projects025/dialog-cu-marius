"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export type Message = {
  id: number;
  author: "Marius" | "user";
  type: "text" | "response";
  content: any;
};

export type UserAction = {
  type: 'input' | 'buttons';
  options?: string[];
}

interface ChatViewProps {
  conversation: Message[];
  userAction: UserAction | null;
  onResponse: (response: string) => void;
  isWaitingForResponse: boolean;
}

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
    if (!userAction) return null;

    switch (userAction.type) {
      case "buttons":
        return (
          <div className="flex flex-col sm:flex-row gap-2 mt-2 justify-center">
            {userAction.options?.map((option: string, index: number) => (
              <Button
                key={index}
                onClick={() => onResponse(option)}
                variant="outline"
                className="bg-white hover:bg-gray-100 text-primary-foreground border-gray-200 shadow-sm"
                disabled={!isWaitingForResponse}
              >
                {option}
              </Button>
            ))}
          </div>
        );
      case "input":
        return (
            <div className="flex w-full max-w-sm items-center space-x-2 mt-2">
              <Input
                type="number"
                placeholder="Venit lunar net"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white"
                disabled={!isWaitingForResponse}
              />
              <Button type="submit" onClick={handleSend} disabled={!isWaitingForResponse}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Trimite</span>
              </Button>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[80vh] data-[state=open]:animate-in data-[state=open]:fade-in-50" data-state="open">
      <div id="dialog-flow" className="flex-grow space-y-6 overflow-y-auto p-4 rounded-lg">
        {conversation.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-end gap-3 w-full animate-in fade-in slide-in-from-bottom-5 duration-500",
              message.author === "Marius" ? "justify-start" : "justify-end"
            )}
          >
            {message.author === "Marius" && (
              <Avatar className="h-8 w-8 hidden sm:flex">
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
              <p>{message.content}</p>
            </div>
          </div>
        ))}
        {isWaitingForResponse && conversation.length > 0 && (
          <div className="flex items-end gap-3 w-full justify-start">
             <Avatar className="h-8 w-8 hidden sm:flex">
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
      <div id="user-actions" className="py-4 flex justify-center items-center">
        {renderUserActions()}
      </div>
    </div>
  );
};

export default ChatView;
