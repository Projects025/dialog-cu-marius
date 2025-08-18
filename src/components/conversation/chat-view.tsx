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
  type: "text" | "options" | "input" | "response";
  content: any;
};

interface ChatViewProps {
  conversation: Message[];
  onResponse: (response: string) => void;
  isWaitingForResponse: boolean;
}

const ChatView = ({ conversation, onResponse, isWaitingForResponse }: ChatViewProps) => {
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

  const renderMessageContent = (message: Message) => {
    switch (message.type) {
      case "text":
      case "response":
        return <p>{message.content}</p>;
      case "options":
        return (
          <div className="flex flex-col sm:flex-row gap-2 mt-2 justify-end">
            {message.content.map((option: string, index: number) => (
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
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[75vh] data-[state=open]:animate-in data-[state=open]:fade-in-50" data-state="open">
      <div className="flex-grow space-y-6 overflow-y-auto p-4 rounded-lg">
        {conversation.map((message, index) => (
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
                  : "bg-primary text-primary-foreground rounded-br-none",
                (message.type === 'options' || message.type === 'input') && "bg-transparent shadow-none p-0"
              )}
            >
              {renderMessageContent(message)}
            </div>
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
};

export default ChatView;
