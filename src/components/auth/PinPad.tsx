import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, Fingerprint, Loader2 } from 'lucide-react';
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
  title = "Welcome to Elita",
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

  // Auto-submit when PIN is complete
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-hero p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6"
          >
            <Fingerprint className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="font-heading text-3xl text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground font-body text-sm">{subtitle}</p>
        </div>

        {/* PIN Display */}
        <motion.div
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center gap-4 mb-8"
        >
          {[...Array(maxLength)].map((_, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                backgroundColor: pin.length > index ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
              }}
              transition={{ 
                delay: 0.2 + index * 0.05,
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-200",
                pin.length > index ? "scale-110" : ""
              )}
            />
          ))}
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {displayError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center mb-6"
            >
              <p className="text-destructive text-sm font-medium">{displayError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center mb-6"
            >
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-4">
          {buttons.map((btn, index) => {
            if (btn === 'clear') {
              return (
                <motion.button
                  key={btn}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.03 }}
                  onClick={handleClear}
                  disabled={isLoading}
                  className="h-16 rounded-2xl bg-card border border-border text-muted-foreground text-sm font-medium transition-all duration-200 hover:bg-secondary active:scale-95 disabled:opacity-50"
                >
                  Clear
                </motion.button>
              );
            }
            if (btn === 'delete') {
              return (
                <motion.button
                  key={btn}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.03 }}
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="h-16 rounded-2xl bg-card border border-border text-muted-foreground transition-all duration-200 hover:bg-secondary active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  <Delete className="w-5 h-5" />
                </motion.button>
              );
            }
            return (
              <motion.button
                key={btn}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.03 }}
                onClick={() => handleNumberPress(btn)}
                disabled={isLoading}
                className="pin-button h-16 rounded-2xl text-xl"
              >
                {btn}
              </motion.button>
            );
          })}
        </div>

        {/* Demo Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          Demo PINs: 1234 (Provider) · 5678 (Esthetician) · 0000 (Admin)
        </motion.p>
      </motion.div>
    </div>
  );
}
