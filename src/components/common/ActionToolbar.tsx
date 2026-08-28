"use client";

import * as React from "react";
import { 
  Crop, 
  Scaling, 
  Zap, 
  Type, 
  Wand2, 
  Repeat 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionToolbarProps {
  onActionSelect: (action: string) => void;
  className?: string;
}

export function ActionToolbar({
  onActionSelect,
  className,
}: ActionToolbarProps) {
  const actions = [
    { id: "crop", label: "Crop", icon: Crop },
    { id: "resize", label: "Resize", icon: Scaling },
    { id: "optimize", label: "Optimize", icon: Zap },
    { id: "text", label: "Add Text", icon: Type },
    { id: "effects", label: "Effects", icon: Wand2 },
    { id: "convert", label: "Format", icon: Repeat },
  ];

  return (
    <div className={cn("w-full bg-card border border-border rounded-xl p-2 md:p-3 overflow-x-auto", className)}>
      <div className="flex items-center gap-2 md:gap-4 min-w-max">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onActionSelect(action.id)}
              className="group flex flex-col items-center justify-center gap-1.5 min-w-[72px] h-[72px] rounded-lg hover:bg-muted/50 active:bg-muted transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-foreground tracking-wide">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
