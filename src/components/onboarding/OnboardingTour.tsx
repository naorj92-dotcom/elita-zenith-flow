import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, Calendar, DollarSign, Clock, Users, Settings, CreditCard, Package, FileText, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  position: 'center' | 'bottom-right' | 'bottom-left';
  roleFilter?: ('owner' | 'employee')[];
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Elita! 🎉',
    description: 'Your all-in-one MedSpa management platform. Let\'s walk through the key features so you can hit the ground running.',
    icon: Sparkles,
    position: 'center',
  },
  {
    id: 'clock',
    title: 'Clock In / Out',
    description: 'Start every shift by clocking in from the dashboard. Your hours are automatically tracked for payroll.',
    icon: Clock,
    position: 'bottom-right',
  },
  {
    id: 'schedule',
    title: 'Your Schedule',
    description: 'View and manage appointments. Click any slot to see details, check in clients, or add notes. Clients can self-check-in when they arrive!',
    icon: Calendar,
    position: 'bottom-right',
  },
  {
    id: 'clients',
    title: 'Client Profiles',
    description: 'Access full client profiles with treatment history, photos, forms, and notes. Everything in one place.',
    icon: Users,
    position: 'bottom-right',
  },
  {
    id: 'pos',
    title: 'Point of Sale',
    description: 'Complete checkouts, apply packages or membership credits, add retail products, and generate receipts — all in one flow.',
    icon: CreditCard,
    position: 'bottom-left',
  },
  {
    id: 'metrics',
    title: 'Track Your Performance',
    description: 'Monitor daily sales, weekly revenue, and monthly commissions in real time on your dashboard.',
    icon: DollarSign,
    position: 'bottom-right',
  },
  {
    id: 'packages',
    title: 'Packages & Memberships',
    description: 'Manage service packages, track remaining sessions, and handle membership credits for your clients.',
    icon: Package,
    position: 'bottom-left',
    roleFilter: ['owner'],
  },
  {
    id: 'forms',
    title: 'Digital Forms',
    description: 'Create intake forms, consent forms, and questionnaires. Clients fill them out digitally — no more paper!',
    icon: FileText,
    position: 'bottom-right',
    roleFilter: ['owner'],
  },
  {
    id: 'analytics',
    title: 'Business Analytics',
    description: 'Deep insights into revenue, staff performance, service popularity, and client retention. Data-driven decisions.',
    icon: BarChart3,
    position: 'bottom-left',
    roleFilter: ['owner'],
  },
  {
    id: 'settings',
    title: 'You\'re All Set! 🚀',
    description: 'Head to Settings to configure your business info, branding, and policies. If you need this tour again, find it in Settings.',
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
  const { role } = useUnifiedAuth();

  const filteredSteps = TOUR_STEPS.filter(
    step => !step.roleFilter || step.roleFilter.includes(role as 'owner' | 'employee')
  );

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      setCurrentStep(0);
      return;
    }
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
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
    if (currentStep < filteredSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  if (!isVisible || filteredSteps.length === 0) return null;

  const step = filteredSteps[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === filteredSteps.length - 1;
  const isFirst = currentStep === 0;
  const progress = ((currentStep + 1) / filteredSteps.length) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => completeTour()} />

          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
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

            <button
              onClick={() => completeTour()}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 pt-5">
              <div className="flex items-center gap-2 mb-4">
                <motion.div
                  key={step.id + '-icon'}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                  className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"
                >
                  <StepIcon className="w-6 h-6 text-primary" />
                </motion.div>
                <span className="text-xs text-muted-foreground font-medium">
                  {currentStep + 1} of {filteredSteps.length}
                </span>
              </div>

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
                {filteredSteps.map((_, i) => (
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

              <div className="flex items-center justify-between">
                <div>
                  {!isFirst ? (
                    <Button variant="ghost" size="sm" onClick={prev} className="gap-1">
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => completeTour()} className="text-muted-foreground">
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
