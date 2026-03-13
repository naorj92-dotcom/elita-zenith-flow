import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, PartyPopper, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeBackBannerProps {
  firstName: string;
  lastVisitDate?: string | null;
  visitCount?: number;
  isVip?: boolean;
}

const GREETINGS = [
  { emoji: '✨', text: 'Great to see you again' },
  { emoji: '💫', text: 'Welcome back' },
  { emoji: '🌟', text: 'So glad you\'re here' },
  { emoji: '💎', text: 'Welcome back, gorgeous' },
];

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDaysSinceVisit(lastVisitDate: string | null | undefined): number | null {
  if (!lastVisitDate) return null;
  const diff = Date.now() - new Date(lastVisitDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function WelcomeBackBanner({ firstName, lastVisitDate, visitCount = 0, isVip }: WelcomeBackBannerProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const daysSince = getDaysSinceVisit(lastVisitDate);
  const isReturning = daysSince !== null && daysSince > 7;
  const isLongAbsence = daysSince !== null && daysSince > 30;

  // Pick a greeting - time-based for regular, special for long absence
  const greeting = useMemo(() => {
    if (isLongAbsence) return { emoji: '💖', text: 'We missed you' };
    if (isVip) return { emoji: '👑', text: getTimeBasedGreeting() };
    return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  }, [isLongAbsence, isVip]);

  // Check session to show only once per visit
  useEffect(() => {
    const sessionKey = `elita-welcome-shown-${new Date().toDateString()}`;
    if (!sessionStorage.getItem(sessionKey)) {
      const timer = setTimeout(() => {
        setVisible(true);
        sessionStorage.setItem(sessionKey, 'true');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setDismissed(true), 6000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (dismissed || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={cn(
          "relative overflow-hidden rounded-2xl p-6 cursor-pointer",
          isVip 
            ? "bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border border-primary/20" 
            : "bg-gradient-to-r from-primary/10 to-primary/5 border border-border"
        )}
        onClick={() => setDismissed(true)}
      >
        {/* Animated sparkle dots */}
        <motion.div
          className="absolute top-3 right-4"
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        >
          <Sparkles className="h-5 w-5 text-primary/40" />
        </motion.div>

        {isVip && (
          <motion.div
            className="absolute bottom-3 right-8"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className="text-2xl">👑</span>
          </motion.div>
        )}

        <div className="flex items-center gap-3">
          <motion.span
            className="text-3xl"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.3 }}
          >
            {greeting.emoji}
          </motion.span>
          
          <div>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm font-medium text-muted-foreground"
            >
              {greeting.text}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="text-2xl font-heading font-semibold text-foreground"
            >
              {firstName}!
            </motion.h2>
          </div>
        </div>

        {/* Contextual sub-message */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-3 flex items-center gap-4"
        >
          {isLongAbsence && daysSince && (
            <p className="text-sm text-muted-foreground">
              It's been {daysSince} days since your last visit. Ready to glow up? ✨
            </p>
          )}
          {!isLongAbsence && isReturning && daysSince && (
            <p className="text-sm text-muted-foreground">
              {daysSince} days since your last visit — looking forward to seeing you!
            </p>
          )}
          {!isReturning && visitCount > 0 && (
            <p className="text-sm text-muted-foreground">
              Visit #{visitCount + 1} — you're on a roll! 🔥
            </p>
          )}
          {visitCount === 0 && (
            <p className="text-sm text-muted-foreground">
              Welcome to your beauty journey — let's get started!
            </p>
          )}
        </motion.div>

        {/* Milestone callout */}
        {visitCount > 0 && visitCount % 10 === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: 'spring' }}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
          >
            <PartyPopper className="h-3.5 w-3.5" />
            {visitCount} visits milestone! You're amazing!
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
