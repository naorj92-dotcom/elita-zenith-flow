import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, Calendar, DollarSign, Clock, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  highlight?: string; // CSS selector or description
  position: 'center' | 'bottom-right' | 'bottom-left';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Elita! 🎉',
    description: 'Your all-in-one MedSpa management platform. Let\'s take a quick tour of the key features.',
    icon: Sparkles,
    position: 'center',
  },
  {
    id: 'schedule',
    title: 'Your Schedule',
    description: 'View today\'s appointments at a glance. Click any appointment to see details, check in clients, or add notes.',
    icon: Calendar,
    position: 'bottom-right',
  },
  {
    id: 'metrics',
    title: 'Performance Metrics',
    description: 'Track your daily sales, weekly revenue, and monthly commissions in real time. Stay on top of your goals.',
    icon: DollarSign,
    position: 'bottom-right',
  },
  {
    id: 'clock',
    title: 'Time Clock',
    description: 'Clock in and out right from the dashboard. Your hours are automatically tracked for payroll.',
    icon: Clock,
    position: 'bottom-left',
  },
  {
    id: 'clients',
    title: 'Client Management',
    description: 'Access full client profiles, treatment history, photos, and notes. Use the sidebar to navigate to Clients.',
    icon: Users,
    position: 'bottom-right',
  },
  {
    id: 'settings',
    title: 'Customize Your Setup',
    description: 'Head to Settings to configure your business info, branding, payment methods, and policies. You\'re all set!',
    icon: Settings,
    position: 'center',
  },
];

const STORAGE_KEY = 'elita-tour-completed';

interface OnboardingTourProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

export function OnboardingTour({ forceShow = false, onComplete }: OnboardingTourProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      setCurrentStep(0);
      return;
    }
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay so the dashboard renders first
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const completeTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
    onComplete?.();
  }, [onComplete]);

  const next = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skip = () => completeTour();

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={skip} />

          {/* Tour Card */}
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={cn(
              "relative z-10 w-full max-w-md mx-4 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
            )}
          >
            {/* Progress Bar */}
            <div className="h-1 bg-muted">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Close */}
            <button
              onClick={skip}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="p-6 pt-5">
              {/* Icon */}
              <motion.div
                key={step.id + '-icon'}
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4"
              >
                <StepIcon className="w-7 h-7 text-primary" />
              </motion.div>

              {/* Text */}
              <motion.div
                key={step.id + '-text'}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>

              {/* Step Dots */}
              <div className="flex items-center gap-1.5 mt-6 mb-4">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === currentStep
                        ? "w-6 bg-primary"
                        : i < currentStep
                        ? "w-1.5 bg-primary/40"
                        : "w-1.5 bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div>
                  {!isFirst && (
                    <Button variant="ghost" size="sm" onClick={prev} className="gap-1">
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </Button>
                  )}
                  {isFirst && (
                    <Button variant="ghost" size="sm" onClick={skip} className="text-muted-foreground">
                      Skip Tour
                    </Button>
                  )}
                </div>
                <Button size="sm" onClick={next} className="gap-1">
                  {isLast ? 'Get Started' : 'Next'}
                  {!isLast && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
