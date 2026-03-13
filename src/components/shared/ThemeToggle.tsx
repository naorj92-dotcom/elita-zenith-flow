import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export function ThemeToggle({ className, compact }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center rounded-full transition-colors duration-300",
        compact
          ? "p-2 hover:bg-accent"
          : "w-14 h-7 p-0.5",
        !compact && (isDark ? "bg-primary/20" : "bg-muted"),
        className
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {compact ? (
        <motion.div
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? (
            <Moon className="w-4 h-4 text-primary" />
          ) : (
            <Sun className="w-4 h-4 text-muted-foreground" />
          )}
        </motion.div>
      ) : (
        <>
          <motion.div
            className="w-6 h-6 rounded-full bg-card shadow-sm flex items-center justify-center"
            animate={{ x: isDark ? 26 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {isDark ? (
              <Moon className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-warning" />
            )}
          </motion.div>
        </>
      )}
    </button>
  );
}
