import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  velocityX: number;
  velocityY: number;
  shape: 'circle' | 'square' | 'star';
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.7)',
  '#FFD700',
  '#FF6B9D',
  '#4ECDC4',
  '#A78BFA',
  '#F59E0B',
];

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 20,
    y: 50,
    size: Math.random() * 8 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    velocityX: (Math.random() - 0.5) * 120,
    velocityY: -(Math.random() * 80 + 40),
    shape: (['circle', 'square', 'star'] as const)[Math.floor(Math.random() * 3)],
  }));
}

interface CelebrationOverlayProps {
  show: boolean;
  onComplete?: () => void;
  message?: string;
  subMessage?: string;
  emoji?: string;
}

export function CelebrationOverlay({ 
  show, 
  onComplete, 
  message = 'Congratulations! 🎉',
  subMessage = 'Your purchase is being processed',
  emoji = '🎉'
}: CelebrationOverlayProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (show) {
      setParticles(createParticles(40));
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
        >
          {/* Confetti Particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                rotate: 0,
                scale: 0,
                opacity: 1,
              }}
              animate={{
                left: `${p.x + p.velocityX}%`,
                top: `${p.y + p.velocityY - 20}%`,
                rotate: p.rotation + 360,
                scale: [0, 1.2, 1, 0.5],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 2.5 + Math.random() * 1,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="absolute"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.shape !== 'star' ? p.color : 'transparent',
                borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'square' ? '2px' : '0',
                ...(p.shape === 'star' ? {
                  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                  backgroundColor: p.color,
                } : {}),
              }}
            />
          ))}

          {/* Center Message */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 20,
              delay: 0.2 
            }}
            className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl px-8 py-6 shadow-2xl text-center pointer-events-auto max-w-sm mx-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-5xl mb-3"
            >
              {emoji}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-xl font-semibold text-foreground"
            >
              {message}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-sm text-muted-foreground mt-2"
            >
              {subMessage}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Smaller inline success burst for buttons/cards */
export function SuccessBurst({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <>
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos(angle) * 30,
                  y: Math.sin(angle) * 30,
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="absolute w-2 h-2 rounded-full bg-primary"
              />
            );
          })}
        </>
      )}
    </AnimatePresence>
  );
}
