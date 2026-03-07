import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MaskedFieldProps {
  value: string | null | undefined;
  type?: 'email' | 'phone' | 'text';
  icon?: React.ReactNode;
  className?: string;
}

function maskValue(value: string, type: string): string {
  if (!value) return '';
  
  switch (type) {
    case 'email': {
      const [local, domain] = value.split('@');
      if (!domain) return '••••••';
      return `${local.slice(0, 2)}${'•'.repeat(Math.max(local.length - 2, 2))}@${domain}`;
    }
    case 'phone': {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 4) return '•'.repeat(value.length);
      return '•'.repeat(digits.length - 4) + digits.slice(-4);
    }
    default:
      if (value.length <= 4) return '•'.repeat(value.length);
      return '•'.repeat(value.length - 4) + value.slice(-4);
  }
}

export function MaskedField({ value, type = 'text', icon, className }: MaskedFieldProps) {
  const [revealed, setRevealed] = useState(false);

  if (!value) return null;

  return (
    <span className={cn("inline-flex items-center gap-1 group", className)}>
      {icon}
      <span className="font-mono text-sm">
        {revealed ? value : maskValue(value, type)}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setRevealed(!revealed);
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
        title={revealed ? 'Hide' : 'Reveal'}
      >
        {revealed ? (
          <EyeOff className="w-3 h-3 text-muted-foreground" />
        ) : (
          <Eye className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
    </span>
  );
}
