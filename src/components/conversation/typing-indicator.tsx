import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const TypingIndicator = () => {
  return (
    <div className="flex items-end gap-3 w-full justify-start animate-in fade-in slide-in-from-bottom-5 duration-500">
      <Avatar className="h-8 w-8 hidden sm:flex self-start flex-shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
          M
        </AvatarFallback>
      </Avatar>
      <div className="max-w-md md:max-w-lg rounded-2xl px-4 py-3 shadow-md text-base bg-secondary text-secondary-foreground rounded-bl-none">
        <div className="flex items-center justify-center space-x-1 h-5">
            <span className="sr-only">Tasting...</span>
            <div className="h-2 w-2 bg-gray-300 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 bg-gray-300 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 bg-gray-300 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
