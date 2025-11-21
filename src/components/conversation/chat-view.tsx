
"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Circle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import TypingIndicator from "./typing-indicator";
import { ScrollArea } from "../ui/scroll-area";


export type Message = {
  id: number;
  author: "Marius" | "user";
  type: "text" | "response";
  content: any;
};

export type UserAction = {
  type: 'input' | 'buttons' | 'date' | 'interactive_scroll_list' | 'form' | 'multi_choice' | 'end';
  options?: any;
}

interface ChatViewProps {
  conversation: Message[];
  userAction: UserAction | null;
  onResponse: (response: any) => void;
  progress: number;
  isConversationDone: boolean;
  isTyping: boolean;
  isLoading: boolean;
  errorMessage: string | null;
}

const UserInput = ({ options, onResponse }: { options: any, onResponse: (value: string | number) => void }) => {
    const [inputValue, setInputValue] = useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleSendInput = () => {
        if (options?.type === 'number') {
            const valueToSend = inputValue.trim() === '' ? 0 : Number(inputValue);
            onResponse(valueToSend);
        } else {
            onResponse(inputValue);
        }
        setInputValue("");
    };

    const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSendInput();
        }
    };

    return (
        <div className="flex w-full items-center space-x-2 animate-in fade-in-50">
            <Input
                type={options?.type || 'text'}
                placeholder={options?.placeholder || ''}
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleInputKeyPress}
                className="bg-background h-12 text-sm"
                autoFocus
            />
            <Button type="submit" onClick={handleSendInput} disabled={!inputValue.trim() && options?.type !== 'number'} size="icon" className="h-12 w-12 flex-shrink-0">
                <Send className="h-5 w-5" />
                <span className="sr-only">Trimite</span>
            </Button>
        </div>
    );
};

const ActionButtons = ({ options, onResponse }: { options: any[], onResponse: (value: any) => void }) => {
    return (
        <div className="flex flex-col gap-2.5 w-full animate-in fade-in-50">
            {options?.map((option: any, index: number) => {
                const isComplexOption = typeof option === 'object' && option !== null;
                const label = isComplexOption ? option.label : option;
                const isDisabled = isComplexOption ? !!option.disabled : false;
                const displayText = isDisabled ? `${label} (în curând)` : label;
                 const isPrimary = ['Continuă', 'Continuăm', 'Da'].includes(label);

                return (
                    <Button
                        key={index}
                        onClick={() => onResponse(isComplexOption ? option : label)}
                        variant={isPrimary ? "default" : "outline"}
                        disabled={isDisabled}
                        className={cn(
                            "shadow-md justify-center py-2.5 min-h-[48px] h-auto text-sm",
                            isPrimary 
                                ? "bg-amber-400 text-gray-900 font-bold hover:bg-amber-300"
                                : "bg-background/80 backdrop-blur-sm border-border text-foreground hover:bg-accent",
                            isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                        )}
                    >
                        {displayText}
                    </Button>
                );
            })}
        </div>
    );
};

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
    const years = Array.from({ length: 70 }, (_, i) => (currentYear - 18 - i).toString());

    const handleConfirm = () => {
        if (day && month && year) {
            const selectedDate = new Date(parseInt(year), parseInt(month), parseInt(day));
            if (selectedDate.getDate() !== parseInt(day) || selectedDate.getMonth() !== parseInt(month) || selectedDate.getFullYear() !== parseInt(year)) {
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
        <div className="flex flex-col gap-4 p-4 rounded-lg bg-transparent w-full">
             <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="day" className="text-xs font-medium text-foreground/80">Ziua</label>
                    <Select onValueChange={setDay} value={day}>
                        <SelectTrigger id="day" className="bg-background h-9 text-xs"><SelectValue placeholder="Zi" /></SelectTrigger>
                        <SelectContent>
                            {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex flex-col gap-1.5">
                    <label htmlFor="month" className="text-xs font-medium text-foreground/80">Luna</label>
                    <Select onValueChange={setMonth} value={month}>
                        <SelectTrigger id="month" className="bg-background h-9 text-xs"><SelectValue placeholder="Lună" /></SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex flex-col gap-1.5">
                    <label htmlFor="year" className="text-xs font-medium text-foreground/80">Anul</label>
                    <Select onValueChange={setYear} value={year}>
                        <SelectTrigger id="year" className="bg-background h-9 text-xs"><SelectValue placeholder="An" /></SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={handleConfirm} className="w-full h-11 mt-2">Confirmă</Button>
        </div>
    );
};

const InteractiveScrollList = ({ options, buttonText, onConfirm }: { options: any, buttonText: string, onConfirm: (selected: string[]) => void }) => {
    const [selected, setSelected] = useState<string[]>([]);

    const toggleOption = (option: string) => {
        setSelected(prev =>
            prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]
        );
    };

    return (
        <div className="flex flex-col w-full max-w-sm rounded-2xl bg-background/80 backdrop-blur-sm border border-border shadow-md animate-in fade-in-50 max-h-60">
            <div className="flex-grow min-h-0 overflow-y-auto no-scrollbar touch-scroll p-3">
                 <div className="space-y-1">
                    {options.map((option: string, index: number) => {
                        const isSelected = selected.includes(option);
                        return (
                             <div
                                key={index}
                                onClick={() => toggleOption(option)}
                                className={cn(
                                    "flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-colors duration-200",
                                    isSelected ? "bg-primary/20" : "hover:bg-accent/50"
                                )}
                            >
                                {isSelected ? (
                                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                                ) : (
                                    <Circle className="h-5 w-5 text-foreground/30 flex-shrink-0" />
                                )}
                                <span className="text-sm font-medium text-foreground/90">{option}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex-shrink-0 p-3 border-t border-border">
                <Button
                    onClick={() => onConfirm(selected)}
                    disabled={selected.length === 0}
                    className="w-full h-12"
                >
                    {buttonText}
                </Button>
            </div>
        </div>
    );
};

const MultiChoiceList = ({ options, onConfirm }: { options: {id: string, label: string, disabled?: boolean}[], onConfirm: (selected: any[]) => void }) => {
    const [selected, setSelected] = useState<{id: string, label: string}[]>([]);

    const toggleOption = (option: {id: string, label: string}) => {
        setSelected(prev =>
            prev.find(item => item.id === option.id)
                ? prev.filter(item => item.id !== option.id)
                : [...prev, option]
        );
    };
    
    const isComplexOption = typeof options[0] === 'object' && options[0] !== null;

    return (
        <div className="flex flex-col w-full bg-transparent max-h-96 animate-in fade-in-50">
             <div className="flex-grow space-y-2.5">
                {options.map((option, index) => {
                    const label = isComplexOption ? option.label : option;
                    const id = isComplexOption ? option.id : option;
                    const isDisabled = isComplexOption ? !!option.disabled : false;
                    const displayText = isDisabled ? `${label} (în curând)` : label;
                    
                    return (
                        <div
                            key={index}
                            onClick={() => !isDisabled && toggleOption({id, label})}
                            className={cn(
                                "flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-colors duration-200 bg-background/80 backdrop-blur-sm border border-border text-foreground shadow-md justify-center min-h-[48px] h-auto text-sm",
                                selected.some(item => item.id === id) ? "bg-primary/20 text-primary-foreground border-primary" : "hover:bg-accent/50",
                                isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                            )}
                        >
                            <span className="font-medium text-center">{displayText}</span>
                        </div>
                    )
                })}
            </div>
            <div className="pt-4 flex-shrink-0">
                <Button
                    onClick={() => onConfirm(selected.map(s => s.id))}
                    disabled={selected.length === 0}
                    className="w-full h-12"
                >
                    Am ales
                </Button>
            </div>
        </div>
    );
};


const ContactForm = ({ options, onResponse }: { options: any, onResponse: (data: any) => void }) => {
    const [formData, setFormData] = useState<{[key: string]: string}>({});
    const [gdprChecked, setGdprChecked] = useState(false);
    const [errors, setErrors] = useState<{[key: string]: string}>({});
    
    const fields = options?.fields || [];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const validate = () => {
        const newErrors: {[key: string]: string} = {};
        fields.forEach((field: any) => {
            if (field.required && !formData[field.name]) {
                newErrors[field.name] = 'Acest câmp este obligatoriu.';
            }
            if (field.type === 'email' && formData[field.name] && !/\S+@\S+\.\S+/.test(formData[field.name])) {
                 newErrors[field.name] = 'Adresa de email nu este validă.';
            }
        });
        if (!gdprChecked) {
            newErrors.gdpr = 'Acordul este necesar.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onResponse(formData);
        }
    };
    
    if (fields.length === 0) {
        return <div className="text-destructive p-2 text-center bg-destructive/10 rounded-md">Eroare de configurare: Câmpurile formularului lipsesc.</div>;
    }

    return (
        <div className="flex flex-col gap-4 w-full animate-in fade-in-50">
            {fields.map((field: any) => (
                <div key={field.name}>
                    <Input
                        name={field.name}
                        type={field.type}
                        placeholder={field.placeholder}
                        onChange={handleInputChange}
                        className="bg-background h-12 text-sm"
                    />
                    {errors[field.name] && <p className="text-sm text-red-600 mt-1">{errors[field.name]}</p>}
                </div>
            ))}
            <div className="flex items-center space-x-2">
                <Checkbox id="gdpr" checked={gdprChecked} onCheckedChange={(checked) => setGdprChecked(checked as boolean)} />
                <Label htmlFor="gdpr" className="text-xs font-medium leading-none text-foreground/80 cursor-pointer">{options?.gdpr || 'Sunt de acord cu prelucrarea datelor.'}</Label>
            </div>
            {errors.gdpr && <p className="text-sm text-red-600">{errors.gdpr}</p>}
            <Button onClick={handleSubmit} className="w-full h-12 mt-2">{options?.buttonText || 'Trimite'}</Button>
        </div>
    )
}

const EndConversationModal = () => {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in-50">
            <div className="bg-background rounded-2xl shadow-xl p-8 text-center w-full max-w-sm mx-4 animate-in fade-in-0 zoom-in-95">
                <h2 className="text-4xl font-bold text-primary">Mulțumesc!</h2>
                <p className="text-lg text-foreground/80 mt-2">O zi frumoasă îți doresc.</p>
                
                <div className="mt-6 border-t border-border/50 pt-6 text-sm text-foreground/70">
                    <p>Dacă vrei să mă contactezi tu mai repede, te rog fă-o aici:</p>
                    <a 
                        href="tel:+40745288882" 
                        className="text-amber-500 font-semibold text-xl mt-2 block hover:scale-105 transition-transform"
                    >
                        +40 745 288 882
                    </a>
                </div>
                <Button 
                    variant="outline" 
                    className="w-full mt-6"
                    onClick={() => window.location.reload()}
                >
                    Înapoi la început
                </Button>
            </div>
        </div>
    );
};

const ChatView = ({ conversation, userAction, onResponse, progress, isConversationDone, isTyping, isLoading, errorMessage }: ChatViewProps) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const actionsContainerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateHeightAndScroll = () => {
      if (actionsContainerRef.current && spacerRef.current) {
        const height = actionsContainerRef.current.offsetHeight;
        spacerRef.current.style.height = `${height}px`;
      }
      setTimeout(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

    calculateHeightAndScroll();
    const resizeObserver = new ResizeObserver(calculateHeightAndScroll);
    if (actionsContainerRef.current) {
        resizeObserver.observe(actionsContainerRef.current);
    }

    return () => {
        if (actionsContainerRef.current) {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            resizeObserver.unobserve(actionsContainerRef.current);
        }
    };
  }, [userAction, conversation]);

  const renderUserActions = () => {
    if (!userAction) return null;

    switch (userAction.type) {
      case "buttons":
        return <ActionButtons options={userAction.options} onResponse={onResponse} />;
      case "input":
        return <UserInput options={userAction.options} onResponse={onResponse} />;
      case "date":
        return <DateOfBirthPicker onDateSelect={onResponse} />;
      case "interactive_scroll_list":
        return <InteractiveScrollList options={userAction.options.options} buttonText={userAction.options.buttonText} onConfirm={onResponse} />;
      case 'multi_choice':
        return <MultiChoiceList options={userAction.options} onConfirm={onResponse} />;
      case "form":
        return <ContactForm options={userAction.options} onResponse={onResponse} />;
      default:
        return null;
    }
  };
  
  const renderMessageContent = (content: any) => {
    if ((typeof content !== 'string' || !content.trim()) && typeof content !== 'number') {
        return null;
    }
    const createMarkup = () => {
        const contentString = typeof content === 'number' ? content.toLocaleString('ro-RO') : content;
        return { __html: contentString.replace(/\n/g, '<br />') };
    };
    return <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={createMarkup()} />;
};

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-foreground/80">Se încarcă formularul...</p>
        </div>
    );
  }

  if (errorMessage) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <h2 className="text-xl font-bold text-destructive mb-2">Eroare de configurare</h2>
            <p className="text-foreground/80">{errorMessage}</p>
        </div>
      );
  }

  return (
    <div id="chat-container" className="relative w-full h-full flex flex-col rounded-none md:rounded-2xl shadow-none md:shadow-2xl overflow-hidden animate-in fade-in-50">
        
        <div id="progress-container" className="w-full flex-shrink-0 p-4 pt-6">
            <div className="w-full h-2.5 bg-muted rounded-full">
                <div 
                    id="progress-bar" 
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-in-out" 
                    style={{ width: `${progress}%` }}>
                </div>
            </div>
        </div>
        
        <ScrollArea id="dialog-flow" className="flex-grow w-full px-4 md:px-6">
            <div className="space-y-3">
                {conversation.map((message) => {
                    const content = renderMessageContent(message.content);
                    if (!content && message.content !== 0) return null;

                    return (
                        <div
                            key={message.id}
                            className={cn(
                            "flex items-end gap-2.5 w-full animate-in fade-in slide-in-from-bottom-5 duration-500",
                            message.author === "Marius" ? "justify-start" : "justify-end"
                            )}
                        >
                            {message.author === "Marius" && (
                            <Avatar className="h-8 w-8 hidden sm:flex self-start flex-shrink-0">
                                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                M
                                </AvatarFallback>
                            </Avatar>
                            )}
                            <div
                            className={cn(
                                "max-w-md md:max-w-lg rounded-2xl px-4 py-2.5 shadow-md text-sm leading-relaxed",
                                message.author === "Marius"
                                ? "bg-secondary text-secondary-foreground rounded-bl-none"
                                : "bg-primary text-primary-foreground rounded-br-none"
                            )}
                            >
                            {content}
                            </div>
                        </div>
                    )
                })}
                {isTyping && <TypingIndicator />}
                <div ref={spacerRef} className="flex-shrink-0 transition-height duration-300" />
                <div ref={endOfMessagesRef} />
            </div>
        </ScrollArea>
      
        <div ref={actionsContainerRef} id="user-actions-container" className="flex-shrink-0 p-4 bg-background/80 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none fixed bottom-0 left-0 right-0 md:relative flex flex-col">
             <div className="w-full max-w-lg mx-auto flex flex-col justify-center items-center">
                 {renderUserActions()}
            </div>
        </div>
        
        {isConversationDone && <EndConversationModal />}
    </div>
  );
};

export default ChatView;
