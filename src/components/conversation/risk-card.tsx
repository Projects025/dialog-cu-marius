"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RiskCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const RiskCard = ({ icon, title, description, className, ...props }: RiskCardProps) => {
  return (
    <Card
      className={cn(
        "text-left bg-white/50 backdrop-blur-sm border-white/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-2",
        className
      )}
      {...props}
    >
      <CardHeader>
        <div className="mb-4">{icon}</div>
        <CardTitle className="font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-foreground/70">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
};

export default RiskCard;
