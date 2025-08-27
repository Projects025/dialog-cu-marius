"use client";

import RiskCard from "./risk-card";
import { Button } from "@/components/ui/button";
import { Users, PiggyBank, Accessibility, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";

const risks = [
  {
    icon: Users,
    title: "Protecție în caz de deces",
    description: "Protejează-ți familia în cazul unui eveniment nefericit.",
  },
  {
    icon: PiggyBank,
    title: "Pensionare",
    description: "Asigură-ți un viitor liniștit și independent financiar.",
  },
  {
    icon: Accessibility,
    title: "Invaliditate",
    description: "Menține-ți stabilitatea financiară dacă nu mai poți munci.",
  },
  {
    icon: HeartPulse,
    title: "Boli Grave",
    description: "Fii pregătit pentru costurile medicale neașteptate.",
  },
];

interface LandingViewProps {
  onStart: () => void;
  isFadingOut: boolean;
}

const LandingView = ({ onStart, isFadingOut }: LandingViewProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-start p-6 text-center space-y-12 py-20",
        "transition-opacity duration-500",
        isFadingOut ? "opacity-0" : "opacity-100 animate-in fade-in-50"
      )}
    >
      <div className="space-y-4 md:space-y-6">
        <h1 className="text-3xl font-bold text-foreground md:text-5xl">
          Viața poate aduce provocări financiare neașteptate.
        </h1>
      </div>
      
      <div className="w-full space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
          {risks.map((risk, index) => (
            <RiskCard
              key={risk.title}
              icon={<risk.icon className="h-8 w-8 text-primary" />}
              title={risk.title}
              description={risk.description}
              className="w-full animate-in fade-in-0 slide-in-from-bottom-10 duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            />
          ))}
      </div>

      <Button 
        onClick={onStart} 
        size="lg" 
        className="w-full md:w-auto animate-in fade-in-0 slide-in-from-bottom-10 duration-500 hover:-translate-y-1 hover:shadow-xl bg-primary/90 text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary"
        style={{ animationDelay: '500ms' }}
      >
        Descoperă gradul tău de protecție financiară
      </Button>
    </div>
  );
};

export default LandingView;
