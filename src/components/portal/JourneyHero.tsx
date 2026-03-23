import React from 'react';
import { motion } from 'framer-motion';
import { CalendarPlus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CATEGORIES, type TreatmentCategory, type ProgressData } from '@/lib/elitaMethod';
import { cn } from '@/lib/utils';

const STAGES: { key: TreatmentCategory; label: string }[] = [
  { key: 'freeze', label: 'Freeze' },
  { key: 'tone', label: 'Tone' },
  { key: 'tight', label: 'Tight' },
  { key: 'glow', label: 'Glow' },
];

function getCurrentStageIndex(progress: ProgressData[]): number {
  // Find the first stage that isn't fully completed
  for (let i = 0; i < STAGES.length; i++) {
    const p = progress.find(pr => pr.category === STAGES[i].key);
    if (!p || p.sessions_completed < p.sessions_target) return i;
  }
  return STAGES.length - 1; // All done — show last
}

interface JourneyHeroProps {
  firstName: string;
  hasGoals: boolean;
  treatmentProgress: ProgressData[];
  nextAppointment: any;
  recommendation: { title: string; subtitle: string; category: TreatmentCategory } | null;
  bookingHref: string;
}

export function JourneyHero({
  firstName,
  hasGoals,
  treatmentProgress,
  nextAppointment,
  recommendation,
  bookingHref,
}: JourneyHeroProps) {
  const currentStage = hasGoals ? getCurrentStageIndex(treatmentProgress) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative z-10"
    >
      {/* ─── Full-width glowing hero container ─── */}
      <div className="journey-hero relative overflow-hidden rounded-[1.5rem]">
        {/* Ambient glow layers */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[70%] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(34_48%_60%/0.1)_0%,transparent_65%)]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[40%] bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,hsl(30_40%_52%/0.05)_0%,transparent_60%)]" />
          <div className="absolute top-[20%] right-0 w-[50%] h-[60%] bg-[radial-gradient(ellipse_50%_50%_at_90%_40%,hsl(34_48%_60%/0.06)_0%,transparent_60%)]" />
        </div>

        <div className="relative px-8 pt-12 pb-10 sm:px-12 sm:pt-16 sm:pb-14">
          {/* ─── Welcome & Title ─── */}
          <div className="text-center mb-10 sm:mb-14">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-[9px] sm:text-[10px] font-semibold text-elita-camel uppercase tracking-[0.5em] mb-4"
            >
              Welcome back, {firstName}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-[2.75rem] sm:text-[3.75rem] font-heading font-semibold text-foreground leading-[0.92] tracking-[-0.035em]"
            >
              Your Elita
              <br />
              <span className="italic font-normal">Journey</span>
            </motion.h1>
            {hasGoals && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.5 }}
                className="text-[11px] sm:text-xs text-muted-foreground mt-4 tracking-wide"
              >
                Stage {currentStage + 1} of {STAGES.length}
              </motion.p>
            )}
          </div>

          {/* ─── Journey Progress Stepper ─── */}
          {hasGoals && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mb-12 sm:mb-14"
            >
              <JourneyStepper
                stages={STAGES}
                currentStage={currentStage}
                progress={treatmentProgress}
              />
            </motion.div>
          )}

          {/* ─── Next Visit ─── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mb-8"
          >
            {nextAppointment ? (
              <div
                className="relative p-6 sm:p-8 rounded-2xl border border-border/15"
                style={{
                  background: 'linear-gradient(165deg, hsl(36 28% 99%) 0%, hsl(34 22% 97%) 100%)',
                  boxShadow: 'inset 0 1px 0 hsl(36 34% 100% / 0.7), 0 4px 20px hsl(22 24% 22% / 0.04)',
                }}
              >
                <p className="text-[8px] font-bold text-elita-camel/60 uppercase tracking-[0.4em] mb-3">
                  Next Visit
                </p>
                <p className="text-xl sm:text-2xl font-heading font-semibold text-foreground leading-snug tracking-tight">
                  {nextAppointment.services?.name}
                </p>
                <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
                  {format(new Date(nextAppointment.scheduled_at), 'EEEE, MMMM d')}
                  <span className="mx-1.5 text-border">·</span>
                  {format(new Date(nextAppointment.scheduled_at), 'h:mm a')}
                </p>
                {nextAppointment.staff && (
                  <p className="text-xs text-muted-foreground/60 mt-1.5">
                    with {nextAppointment.staff.first_name} {nextAppointment.staff.last_name}
                  </p>
                )}
              </div>
            ) : (
              <div
                className="p-8 rounded-2xl text-center border border-border/10"
                style={{
                  background: 'linear-gradient(165deg, hsl(36 24% 99%) 0%, hsl(34 18% 97.5%) 100%)',
                }}
              >
                <Clock className="w-5 h-5 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground/60">No upcoming visits</p>
              </div>
            )}
          </motion.div>

          {/* ─── Recommendation chip ─── */}
          {recommendation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mb-8"
            >
              <div
                className="relative rounded-2xl p-5 sm:p-6 border border-border/15"
                style={{
                  background: 'linear-gradient(165deg, hsl(36 26% 99%) 0%, hsl(34 20% 97%) 100%)',
                  boxShadow: 'inset 0 1px 0 hsl(36 32% 100% / 0.6)',
                }}
              >
                <p className="text-[8px] font-bold text-elita-camel/60 uppercase tracking-[0.4em] mb-3">
                  Recommended
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-accent/40 flex items-center justify-center text-lg">
                    {CATEGORIES[recommendation.category].emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-heading font-semibold text-foreground leading-snug">
                      {recommendation.title}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">
                      {recommendation.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Divider ─── */}
          <div className="divider-luxe mb-8" />

          {/* ─── Primary CTA ─── */}
          <Button
            asChild
            size="lg"
            className="w-full h-14 text-[13px] font-semibold gap-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-lg transition-all duration-400 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] btn-glow"
          >
            <Link to={bookingHref}>
              <CalendarPlus className="h-4.5 w-4.5" />
              {recommendation ? 'Book Recommended Session' : 'Book Your Next Session'}
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   JOURNEY STEPPER — Freeze → Tone → Tight → Glow
   ═══════════════════════════════════════════════ */

function JourneyStepper({
  stages,
  currentStage,
  progress,
}: {
  stages: { key: TreatmentCategory; label: string }[];
  currentStage: number;
  progress: ProgressData[];
}) {
  return (
    <div className="relative flex items-center justify-between px-2 sm:px-4">
      {/* Connecting line (background) */}
      <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-border/30 rounded-full" />

      {/* Connecting line (filled/gold) */}
      <motion.div
        className="absolute top-[18px] left-[10%] h-[2px] rounded-full"
        style={{
          background: 'linear-gradient(90deg, hsl(30 40% 52%) 0%, hsl(34 48% 60%) 100%)',
          boxShadow: '0 0 8px hsl(34 48% 60% / 0.3)',
        }}
        initial={{ width: '0%' }}
        animate={{
          width: `${(currentStage / (stages.length - 1)) * 80}%`,
        }}
        transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.6 }}
      />

      {stages.map((stage, i) => {
        const p = progress.find(pr => pr.category === stage.key);
        const isCompleted = p ? p.sessions_completed >= p.sessions_target : false;
        const isCurrent = i === currentStage;
        const isPast = i < currentStage;

        return (
          <div key={stage.key} className="relative flex flex-col items-center z-10">
            {/* Glowing dot */}
            <div className="relative">
              {isCurrent && (
                <motion.div
                  className="absolute inset-[-6px] rounded-full"
                  style={{
                    background: 'radial-gradient(circle, hsl(34 48% 60% / 0.3) 0%, transparent 70%)',
                  }}
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.6, 0.3, 0.6],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4, ease: 'backOut' }}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium transition-all duration-500',
                  isCurrent && 'ring-2 ring-offset-2 ring-offset-transparent',
                  (isCurrent || isPast || isCompleted)
                    ? 'text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground/50 border border-border/30',
                )}
                style={
                  (isCurrent || isPast || isCompleted)
                    ? {
                        background: 'linear-gradient(135deg, hsl(30 40% 52%) 0%, hsl(34 48% 60%) 100%)',
                        boxShadow: isCurrent
                          ? '0 0 16px hsl(34 48% 60% / 0.4), 0 0 6px hsl(30 40% 52% / 0.25)'
                          : '0 0 8px hsl(34 48% 60% / 0.15)',
                      }
                    : undefined
                }
              >
                {isCompleted ? '✓' : CATEGORIES[stage.key].emoji.charAt(0) === '❄' ? '❄' : (i + 1)}
              </motion.div>
            </div>

            {/* Label */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
              className={cn(
                'text-[10px] sm:text-[11px] mt-3 font-semibold tracking-wide',
                (isCurrent || isPast || isCompleted)
                  ? 'text-foreground'
                  : 'text-muted-foreground/40',
              )}
            >
              {stage.label}
            </motion.p>

            {/* Session count for current */}
            {isCurrent && p && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="text-[9px] text-elita-camel mt-0.5 font-medium"
              >
                {p.sessions_completed}/{p.sessions_target}
              </motion.p>
            )}
          </div>
        );
      })}
    </div>
  );
}
