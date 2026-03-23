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
      <div className="journey-hero luxury-dust relative overflow-hidden rounded-[2rem]">
        {/* Ambient glow layers — stronger radials */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[160%] h-[80%] bg-[radial-gradient(ellipse_65%_55%_at_50%_0%,hsl(34_48%_60%/0.16)_0%,transparent_60%)]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] h-[50%] bg-[radial-gradient(ellipse_75%_65%_at_50%_100%,hsl(30_40%_52%/0.08)_0%,transparent_55%)]" />
          <div className="absolute top-[15%] right-0 w-[60%] h-[70%] bg-[radial-gradient(ellipse_55%_55%_at_85%_35%,hsl(34_48%_60%/0.1)_0%,transparent_55%)]" />
          {/* Central hero spotlight */}
          <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[50%] h-[40%] bg-[radial-gradient(circle_at_center,hsl(34_48%_60%/0.08)_0%,transparent_70%)]" />
        </div>

        <div className="relative px-8 pt-16 pb-12 sm:px-12 sm:pt-24 sm:pb-18">
          {/* ─── Welcome & Title ─── */}
          <div className="text-center mb-12 sm:mb-16">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-[9px] sm:text-[11px] font-semibold text-elita-camel uppercase tracking-[0.55em] mb-5"
            >
              Welcome back, {firstName}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-[3.25rem] sm:text-[4.5rem] font-heading font-semibold text-foreground leading-[0.88] tracking-[-0.04em]"
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
                className="text-[11px] sm:text-xs text-muted-foreground/70 mt-5 tracking-widest uppercase font-medium"
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
                className="relative p-10 sm:p-12 rounded-[1.5rem] overflow-hidden grain-overlay luxury-dust"
                style={{
                  background: 'linear-gradient(165deg, hsl(24 24% 26%) 0%, hsl(22 22% 21%) 35%, hsl(20 20% 18%) 70%, hsl(18 18% 16%) 100%)',
                  boxShadow: '0 24px 80px hsl(20 24% 10% / 0.35), 0 8px 28px hsl(20 24% 10% / 0.18), 0 0 60px hsl(34 48% 60% / 0.06), inset 0 1px 0 hsl(34 34% 45% / 0.25), inset 0 -1px 0 hsl(20 18% 12% / 0.3)',
                }}
              >
                {/* Gold glow overlay — stronger */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse 60% 50% at 80% 15%, hsl(34 48% 60% / 0.18) 0%, transparent 55%), radial-gradient(ellipse 40% 40% at 20% 85%, hsl(30 40% 52% / 0.06) 0%, transparent 50%)',
                  }}
                />
                {/* Gold edge highlight — top */}
                <div
                  className="absolute top-0 left-[10%] right-[10%] h-[1px] pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, hsl(34 48% 60% / 0.3), transparent)' }}
                />

                <div className="relative z-10">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.5em] mb-5"
                     style={{ color: 'hsl(34 48% 68%)' }}>
                    Your Next Visit
                  </p>

                  <p className="text-[1.75rem] sm:text-[2.15rem] font-heading font-semibold leading-snug tracking-tight"
                     style={{ color: 'hsl(36 30% 96%)' }}>
                    {nextAppointment.services?.name}
                  </p>

                  <div className="divider-luxe my-6 opacity-25" />

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                         style={{ background: 'hsl(34 48% 60% / 0.14)', border: '1px solid hsl(34 48% 60% / 0.18)', boxShadow: '0 0 20px hsl(34 48% 60% / 0.08)' }}>
                      <Clock className="w-[18px] h-[18px]" style={{ color: 'hsl(34 48% 68%)' }} />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium"
                         style={{ color: 'hsl(36 26% 90%)' }}>
                        {format(new Date(nextAppointment.scheduled_at), 'EEEE, MMMM d')}
                      </p>
                      <p className="text-[11px] mt-1"
                         style={{ color: 'hsl(34 18% 58%)' }}>
                        {format(new Date(nextAppointment.scheduled_at), 'h:mm a')}
                        {nextAppointment.staff && (
                          <span> · with {nextAppointment.staff.first_name} {nextAppointment.staff.last_name}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="p-8 sm:p-10 rounded-[1.25rem] text-center overflow-hidden grain-overlay"
                style={{
                  background: 'linear-gradient(165deg, hsl(26 22% 28%) 0%, hsl(22 18% 22%) 100%)',
                  boxShadow: '0 12px 40px hsl(22 24% 12% / 0.2), inset 0 1px 0 hsl(34 30% 40% / 0.15)',
                }}
              >
                <Clock className="w-5 h-5 mx-auto mb-3" style={{ color: 'hsl(34 40% 55%)' }} />
                <p className="text-sm" style={{ color: 'hsl(34 18% 55%)' }}>No upcoming visits</p>
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
          <div className="divider-luxe mb-10" />

          {/* ─── Primary CTA ─── */}
          <Button
            asChild
            size="lg"
            className="w-full h-16 text-[14px] font-semibold gap-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-xl transition-all duration-400 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] btn-glow"
          >
            <Link to={bookingHref}>
              <CalendarPlus className="h-5 w-5" />
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
