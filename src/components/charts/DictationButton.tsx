import React from 'react';
import { Mic, MicOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DictationButtonProps {
  isListening: boolean;
  showDone: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function DictationButton({ isListening, showDone, onToggle, disabled }: DictationButtonProps) {
  return (
    <div className="flex items-center gap-1.5">
      {isListening && (
        <span className="flex items-center gap-1 text-[10px] font-medium text-destructive animate-pulse">
          <span className="w-2 h-2 rounded-full bg-destructive" />
          Listening…
        </span>
      )}
      {showDone && !isListening && (
        <span className="flex items-center gap-1 text-[10px] font-medium text-success">
          <Check className="w-3 h-3" />
          Done
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 shrink-0",
          isListening && "text-destructive hover:text-destructive"
        )}
        onClick={onToggle}
        disabled={disabled}
      >
        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}

export function AutoFilledBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning px-1.5 py-0.5 rounded bg-warning/10">
      Auto-filled ✓
    </span>
  );
}
