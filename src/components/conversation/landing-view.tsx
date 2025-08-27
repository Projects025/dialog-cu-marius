"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LandingViewProps {
  onStart: () => void;
  isFadingOut: boolean;
}

const LandingView = ({ onStart, isFadingOut }: LandingViewProps) => {
  return (
    <div
      className={cn(
        "min-h-screen w-full flex flex-col justify-center items-center text-center p-6 md:p-8 transition-opacity duration-500",
        isFadingOut ? "opacity-0" : "opacity-100"
      )}
    >
      <div
        className={cn(
          "space-y-6 transition-all duration-500",
          isFadingOut ? "transform-none" : "animate-in fade-in-0 slide-in-from-bottom-10"
        )}
      >
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
          Liniștea ta financiară, simplificată.
        </h1>
        <p
          className="max-w-xl mx-auto text-base md:text-lg text-foreground/70"
          style={{ animationDelay: '150ms' }}
        >
          Descoperă în câteva minute cum îți poți proteja viitorul și pe al celor dragi. Fără jargon, fără obligații.
        </p>
      </div>

      <Button 
        onClick={onStart} 
        size="lg" 
        className={cn(
            "mt-10 w-full max-w-xs md:w-auto text-base font-semibold bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform hover:scale-105",
            isFadingOut ? "transform-none" : "animate-in fade-in-0 slide-in-from-bottom-10"
        )}
        style={{ animationDelay: '300ms' }}
      >
        Începe Analiza Gratuită
      </Button>
    </div>
  );
};

export default LandingView;
