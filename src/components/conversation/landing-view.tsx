"use client";

import RiskCard from "./risk-card";
import { Button } from "@/components/ui/button";
import { Users, PiggyBank, Accessibility, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";

const risks = [
  {
    icon: Users,
    title: "Deces",
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
        "flex flex-col items-center justify-center text-center space-y-12 transition-opacity duration-500",
        isFadingOut ? "opacity-0" : "opacity-100 animate-in fade-in-50"
      )}
    >
      <div className="space-y-8">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground max-w-3xl">
          Viața poate aduce provocări financiare neașteptate.
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
          {risks.map((risk, index) => (
            <RiskCard
              key={risk.title}
              icon={<risk.icon className="h-8 w-8 text-primary" />}
              title={risk.title}
              description={risk.description}
              className="animate-in fade-in-0 slide-in-from-bottom-10 duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            />
          ))}
        </div>
      </div>
      <Button 
        onClick={onStart} 
        size="lg" 
        className="bg-primary/90 hover:bg-primary text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 animate-in fade-in-0 slide-in-from-bottom-10 duration-500"
        style={{ animationDelay: '500ms' }}
      >
        Află cât costă siguranța familiei tale
      </Button>
    </div>
  );
};

export default LandingView;
