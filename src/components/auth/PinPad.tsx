import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinPadProps {
  onSubmit: (pin: string) => Promise<boolean>;
  isLoading?: boolean;
  error?: string;
  title?: string;
  subtitle?: string;
}

export function PinPad({ 
  onSubmit, 
  isLoading = false, 
  error,
  title = "Staff Login",
  subtitle = "Enter your PIN to clock in"
}: PinPadProps) {
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const maxLength = 4;

  const handleNumberPress = useCallback((num: string) => {
    if (pin.length < maxLength && !isLoading) {
      setPin(prev => prev + num);
      setLocalError(null);
    }
  }, [pin.length, isLoading]);

  const handleDelete = useCallback(() => {
    if (!isLoading) {
      setPin(prev => prev.slice(0, -1));
      setLocalError(null);
    }
  }, [isLoading]);

  const handleClear = useCallback(() => {
    if (!isLoading) {
      setPin('');
      setLocalError(null);
    }
  }, [isLoading]);

  useEffect(() => {
    if (pin.length === maxLength && !isLoading) {
      const submitPin = async () => {
        const success = await onSubmit(pin);
        if (!success) {
          setLocalError('Invalid PIN. Please try again.');
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setPin('');
          }, 600);
        }
      };
      submitPin();
    }
  }, [pin, isLoading, onSubmit]);

  const displayError = error || localError;
  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'delete'];

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-xs"
      >
        {/* Title */}
        <div className="text-center mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-1">{title}</h2>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>

        {/* PIN Display */}
        <motion.div
          animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center gap-4 mb-8"
        >
          {[...Array(maxLength)].map((_, index) => (
            <motion.div
              key={index}
              animate={{ 
                backgroundColor: pin.length > index ? 'hsl(var(--primary))' : 'hsl(var(--border))'
              }}
              transition={{ duration: 0.15 }}
              className={cn(
                "w-3.5 h-3.5 rounded-full transition-all duration-150",
                pin.length > index && "scale-110"
              )}
            />
          ))}
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {displayError && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-center mb-6"
            >
              <p className="text-destructive text-sm">{displayError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center mb-6"
            >
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Number Pad - Clean, minimal */}
        <div className="grid grid-cols-3 gap-3">
          {buttons.map((btn) => {
            if (btn === 'clear') {
              return (
                <button
                  key={btn}
                  onClick={handleClear}
                  disabled={isLoading}
                  className="h-14 rounded-xl bg-card border border-border text-muted-foreground text-xs font-medium transition-all duration-150 hover:bg-accent active:scale-95 disabled:opacity-50"
                >
                  Clear
                </button>
              );
            }
            if (btn === 'delete') {
              return (
                <button
                  key={btn}
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="h-14 rounded-xl bg-card border border-border text-muted-foreground transition-all duration-150 hover:bg-accent active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  <Delete className="w-4 h-4" />
                </button>
              );
            }
            return (
              <button
                key={btn}
                onClick={() => handleNumberPress(btn)}
                disabled={isLoading}
                className="h-14 rounded-xl bg-card border border-border text-foreground text-lg font-medium transition-all duration-150 hover:bg-accent hover:border-primary/20 active:scale-95 active:bg-primary active:text-primary-foreground disabled:opacity-50"
              >
                {btn}
              </button>
            );
          })}
        </div>

        {/* PIN hint removed for production security */}
      </motion.div>
    </div>
  );
}
