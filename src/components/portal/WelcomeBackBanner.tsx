import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, PartyPopper, X } from 'lucide-react';
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

// Jumping letter animation
function JumpingText({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="inline-flex">
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ y: 0 }}
          animate={{ y: [0, -8, 0] }}
          transition={{
            duration: 0.5,
            delay: delay + i * 0.04,
            ease: 'easeInOut',
          }}
          className="inline-block"
          style={{ whiteSpace: char === ' ' ? 'pre' : undefined }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
}

export function WelcomeBackBanner({ firstName, lastVisitDate, visitCount = 0, isVip }: WelcomeBackBannerProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const daysSince = getDaysSinceVisit(lastVisitDate);
  const isReturning = daysSince !== null && daysSince > 7;
  const isLongAbsence = daysSince !== null && daysSince > 30;

  const greeting = useMemo(() => {
    if (isLongAbsence) return { emoji: '💖', text: 'We missed you' };
    if (isVip) return { emoji: '👑', text: getTimeBasedGreeting() };
    return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  }, [isLongAbsence, isVip]);

  useEffect(() => {
    const sessionKey = `elita-welcome-shown-${new Date().toDateString()}`;
    if (!sessionStorage.getItem(sessionKey)) {
      const timer = setTimeout(() => {
        setVisible(true);
        sessionStorage.setItem(sessionKey, 'true');
      }, 400);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setDismissed(true), 8000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (dismissed || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className={cn(
          "relative overflow-hidden rounded-2xl p-5 cursor-pointer",
          isVip
            ? "bg-gradient-to-br from-primary/15 via-primary/8 to-warning/10 border border-primary/25 shadow-lg shadow-primary/5"
            : "bg-gradient-to-br from-primary/10 via-card to-primary/5 border border-border shadow-md"
        )}
        onClick={() => setDismissed(true)}
      >
        {/* Floating sparkle particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            style={{ left: `${15 + i * 18}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{
              y: [0, -12, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [0.8, 1.3, 0.8],
            }}
            transition={{
              duration: 2 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.4,
            }}
          />
        ))}

        {/* Dismiss button */}
        <button
          onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted/60 transition-colors z-10"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {/* Animated sparkle icon */}
        <motion.div
          className="absolute top-4 right-10"
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
        >
          <Sparkles className="h-5 w-5 text-primary/30" />
        </motion.div>

        {isVip && (
          <motion.div
            className="absolute bottom-3 right-10"
            animate={{ 
              y: [0, -6, 0],
              rotate: [0, 8, -8, 0],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-xl">👑</span>
          </motion.div>
        )}

        <div className="flex items-center gap-4">
          {/* Bouncing emoji */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ 
              scale: 1, 
              rotate: 0,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 10, delay: 0.2 }}
            className="relative"
          >
            <motion.span
              className="text-4xl block"
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ 
                duration: 1.2, 
                repeat: 2, 
                delay: 0.6,
                ease: 'easeInOut',
              }}
            >
              {greeting.emoji}
            </motion.span>
          </motion.div>

          <div className="flex-1 min-w-0">
            <motion.p
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-sm font-medium text-muted-foreground"
            >
              {greeting.text}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-heading font-bold text-foreground mt-0.5"
            >
              <JumpingText text={`${firstName}!`} delay={0.5} />
            </motion.h2>
          </div>
        </div>

        {/* Contextual sub-message */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-3"
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
              Welcome to your beauty journey — let's get started! 💅
            </p>
          )}
        </motion.div>

        {/* Milestone callout with bounce */}
        {visitCount > 0 && visitCount % 10 === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.9, type: 'spring', stiffness: 300 }}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
          >
            <motion.span
              animate={{ rotate: [0, 20, -20, 0] }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              <PartyPopper className="h-3.5 w-3.5" />
            </motion.span>
            {visitCount} visits milestone! You're amazing!
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
