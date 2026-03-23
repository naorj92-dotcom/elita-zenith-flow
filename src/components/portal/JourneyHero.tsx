import React from 'react';
import { motion } from 'framer-motion';
import { CalendarPlus, Clock, ArrowRight, DollarSign } from 'lucide-react';
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
  for (let i = 0; i < STAGES.length; i++) {
    const p = progress.find(pr => pr.category === STAGES[i].key);
    if (!p || p.sessions_completed < p.sessions_target) return i;
  }
  return STAGES.length - 1;
}

interface RecommendedServiceInfo {
  duration: number;
  price: number;
  slots: Date[];
}

interface JourneyHeroProps {
  firstName: string;
  hasGoals: boolean;
  treatmentProgress: ProgressData[];
  nextAppointment: any;
  recommendation: { title: string; subtitle: string; category: TreatmentCategory } | null;
  recommendedServiceInfo?: RecommendedServiceInfo;
  bookingHref: string;
}

export function JourneyHero({
  firstName,
  hasGoals,
  treatmentProgress,
  nextAppointment,
  recommendation,
  recommendedServiceInfo,
  bookingHref,
}: JourneyHeroProps) {
  const currentStage = hasGoals ? getCurrentStageIndex(treatmentProgress) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative z-10"
    >
      <div className="journey-hero luxury-dust relative overflow-hidden rounded-[2.5rem]">
        {/* ─── Multi-layer background shapes ─── */}
        <svg
          className="absolute bottom-0 left-0 w-full h-[40%] pointer-events-none opacity-[0.035]"
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
        >
          <path d="M0,80 C200,140 400,20 600,80 C800,140 1000,40 1200,100 L1200,200 L0,200 Z" fill="hsl(34 48% 60%)" />
          <path d="M0,120 C300,160 500,60 700,110 C900,160 1100,80 1200,130 L1200,200 L0,200 Z" fill="hsl(30 40% 52%)" opacity="0.5" />
        </svg>

        {/* Ambient glow layers — stronger */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[180%] h-[85%] bg-[radial-gradient(ellipse_65%_55%_at_50%_0%,hsl(34_48%_60%/0.22)_0%,transparent_60%)]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] h-[50%] bg-[radial-gradient(ellipse_75%_65%_at_50%_100%,hsl(30_40%_52%/0.1)_0%,transparent_55%)]" />
          <div className="absolute top-[10%] right-[-10%] w-[70%] h-[80%] bg-[radial-gradient(ellipse_55%_55%_at_85%_35%,hsl(34_48%_60%/0.15)_0%,transparent_55%)]" />
          {/* Animated central spotlight */}
          <motion.div
            className="absolute top-[15%] left-[40%] w-[60%] h-[55%] bg-[radial-gradient(circle_at_center,hsl(34_48%_60%/0.12)_0%,transparent_65%)]"
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.12, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative px-8 pt-24 pb-16 sm:px-14 sm:pt-32 sm:pb-24">
          {/* ─── Welcome & Title — asymmetric editorial ─── */}
          <div className="text-left mb-16 sm:mb-24 max-w-[80%]">
            <motion.p
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-[9px] sm:text-[11px] font-semibold text-elita-camel uppercase tracking-[0.6em] mb-7"
            >
              Welcome back, {firstName}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="font-heading font-semibold text-foreground leading-[0.85] tracking-[-0.04em]"
              style={{ fontSize: 'clamp(3rem, 7.5vw, 5.5rem)' }}
            >
              Your Elita Journey
            </motion.h1>
            {hasGoals && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.5 }}
                className="text-[11px] sm:text-xs text-muted-foreground/55 mt-7 tracking-[0.35em] uppercase font-medium"
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
              className="mb-18 sm:mb-24"
            >
              <JourneyStepper stages={STAGES} currentStage={currentStage} progress={treatmentProgress} />
            </motion.div>
          )}

          {/* ─── Next Visit — signature glassmorphic VIP card ─── */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.9 }}
            className="mb-16 sm:-mr-4"
          >
            {nextAppointment ? (
              <motion.div
                whileHover={{ y: -8, scale: 1.02, rotateX: 1 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="next-visit-card glass-dark gold-edge inner-glow gradient-sweep relative p-12 sm:p-16 rounded-[2.25rem] overflow-hidden grain-overlay luxury-dust"
                style={{
                  background: 'linear-gradient(165deg, hsl(26 24% 30%) 0%, hsl(24 22% 24%) 25%, hsl(22 20% 19%) 55%, hsl(20 18% 14%) 100%)',
                  backgroundSize: '200% 200%',
                  boxShadow: '0 36px 110px hsl(20 24% 6% / 0.55), 0 14px 45px hsl(20 24% 8% / 0.3), 0 0 110px hsl(34 48% 60% / 0.12), inset 0 1px 0 hsl(34 34% 50% / 0.25), inset 0 -1px 0 hsl(20 18% 8% / 0.4)',
                }}
              >
                {/* Glass shimmer sweep */}
                <div className="glass-shimmer absolute inset-0 pointer-events-none" />

                {/* Gold atmospheric glow — intensified */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse 60% 55% at 85% 0%, hsl(34 48% 60% / 0.3) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 10% 100%, hsl(30 40% 52% / 0.12) 0%, transparent 50%), radial-gradient(ellipse 30% 30% at 50% 50%, hsl(34 48% 60% / 0.04) 0%, transparent 60%)',
                  }}
                />
                {/* Gold edge highlights */}
                <div className="absolute top-0 left-[3%] right-[3%] h-[1px] pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, hsl(34 48% 60% / 0.55), hsl(34 48% 65% / 0.3), transparent)' }}
                />
                <div className="absolute bottom-0 left-[8%] right-[8%] h-[1px] pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, hsl(34 48% 60% / 0.12), transparent)' }}
                />

                <div className="relative z-10">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.65em] mb-8"
                     style={{ color: 'hsl(34 48% 72%)' }}>
                    Your Next Visit
                  </p>

                  <p className="font-heading font-semibold leading-[0.88] tracking-tight"
                     style={{ color: 'hsl(36 30% 96%)', fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>
                    {nextAppointment.services?.name}
                  </p>

                  <div className="divider-luxe my-9 opacity-20" />

                  <div className="flex items-center gap-6">
                    <motion.div
                      animate={{ boxShadow: ['0 0 24px hsl(34 48% 60% / 0.1)', '0 0 40px hsl(34 48% 60% / 0.2)', '0 0 24px hsl(34 48% 60% / 0.1)'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: 'hsl(34 48% 60% / 0.14)', border: '1px solid hsl(34 48% 60% / 0.2)' }}
                    >
                      <Clock className="w-5.5 h-5.5" style={{ color: 'hsl(34 48% 72%)' }} />
                    </motion.div>
                    <div>
                      <p className="text-[16px] font-medium" style={{ color: 'hsl(36 26% 93%)' }}>
                        {format(new Date(nextAppointment.scheduled_at), 'EEEE, MMMM d')}
                      </p>
                      <p className="text-[11px] mt-2 font-light" style={{ color: 'hsl(34 14% 50%)' }}>
                        {format(new Date(nextAppointment.scheduled_at), 'h:mm a')}
                        {nextAppointment.staff && (
                          <span> · with {nextAppointment.staff.first_name} {nextAppointment.staff.last_name}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div
                className="glass-dark gold-edge inner-glow p-12 sm:p-14 rounded-[2.25rem] text-center overflow-hidden grain-overlay"
                style={{
                  boxShadow: '0 24px 70px hsl(22 24% 10% / 0.35), inset 0 1px 0 hsl(34 30% 40% / 0.2)',
                }}
              >
                <Clock className="w-5 h-5 mx-auto mb-4" style={{ color: 'hsl(34 40% 55%)' }} />
                <p className="text-sm font-light" style={{ color: 'hsl(34 14% 50%)' }}>No upcoming visits</p>
              </div>
            )}
          </motion.div>

          {/* ─── Recommendation chip — offset right ─── */}
          {recommendation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.5 }}
              className="mb-14 sm:ml-10"
            >
              <div className="glass gold-edge relative rounded-[1.75rem] p-7 sm:p-8 overflow-hidden hover-lift">
                <div className="absolute top-0 right-0 w-[45%] h-[65%] bg-[radial-gradient(ellipse_60%_60%_at_90%_10%,hsl(34_48%_60%/0.09)_0%,transparent_60%)] pointer-events-none" />
                <p className="text-[8px] font-bold text-elita-camel/60 uppercase tracking-[0.55em] mb-3 relative z-10">
                  Recommended
                </p>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-13 h-13 rounded-2xl bg-accent/50 flex items-center justify-center text-xl"
                       style={{ boxShadow: '0 0 24px hsl(34 48% 60% / 0.08)' }}>
                    {CATEGORIES[recommendation.category].emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-heading font-semibold text-foreground leading-snug">
                      {recommendation.title}
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-1.5 leading-relaxed">
                      {recommendation.subtitle}
                    </p>
                  </div>
                </div>

                {/* Service details */}
                {recommendedServiceInfo && (
                  <div className="relative z-10 mt-5 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium">{recommendedServiceInfo.duration} min</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span className="font-medium">From ${recommendedServiceInfo.price}</span>
                      </div>
                    </div>

                    {/* Available slots */}
                    {recommendedServiceInfo.slots.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                          Next Available
                        </p>
                        <div className="flex flex-col gap-2">
                          {recommendedServiceInfo.slots.map((slot, i) => (
                            <Link
                              key={i}
                              to={`${bookingHref}&date=${slot.toISOString()}`}
                              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-border/30 hover:border-elita-camel/30 hover:bg-accent/30 transition-all duration-300 group"
                            >
                              <CalendarPlus className="w-3.5 h-3.5 text-elita-camel/60 group-hover:text-elita-camel transition-colors" />
                              <span className="text-[13px] font-medium text-foreground">
                                {format(slot, 'EEE MMM d')} at {format(slot, 'h:mm a')}
                              </span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground/30 ml-auto group-hover:text-elita-camel/60 transition-colors" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Link
                        to={bookingHref}
                        className="flex items-center gap-2 text-xs font-medium text-elita-camel hover:text-elita-camel/80 transition-colors"
                      >
                        Request Appointment
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── Divider ─── */}
          <div className="divider-luxe mb-14" />

          {/* ─── Primary CTA ─── */}
          <Button
            asChild
            size="lg"
            className="w-full h-[4.75rem] text-[15px] font-semibold gap-3 rounded-[1.5rem] text-primary-foreground transition-all duration-600 hover:-translate-y-2.5 active:translate-y-0 active:scale-[0.98] btn-glow"
            style={{
              background: 'linear-gradient(165deg, hsl(22 20% 38%) 0%, hsl(24 22% 32%) 40%, hsl(28 28% 36%) 100%)',
              boxShadow: '0 20px 56px hsl(22 24% 18% / 0.25), 0 0 50px hsl(34 48% 60% / 0.1), inset 0 1px 0 hsl(34 30% 48% / 0.3), inset 0 -1px 0 hsl(22 20% 24% / 0.3)',
            }}
          >
            <Link to={bookingHref}>
              <CalendarPlus className="h-5 w-5" />
              {recommendation ? 'Book Recommended Session' : 'Book Your Next Session'}
              <ArrowRight className="h-4 w-4 ml-1 opacity-50" />
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
    <div className="relative flex items-center justify-between px-2 sm:px-8">
      {/* Connecting line (background) */}
      <div className="absolute top-[22px] left-[10%] right-[10%] h-[2px] bg-border/20 rounded-full" />

      {/* Connecting line (filled/gold) */}
      <motion.div
        className="absolute top-[22px] left-[10%] h-[2px] rounded-full"
        style={{
          background: 'linear-gradient(90deg, hsl(30 40% 52%) 0%, hsl(34 48% 60%) 100%)',
          boxShadow: '0 0 16px hsl(34 48% 60% / 0.4)',
        }}
        initial={{ width: '0%' }}
        animate={{ width: `${(currentStage / (stages.length - 1)) * 80}%` }}
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
                  className="absolute inset-[-10px] rounded-full"
                  style={{ background: 'radial-gradient(circle, hsl(34 48% 60% / 0.4) 0%, transparent 70%)' }}
                  animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0.15, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.5, ease: 'backOut' }}
                className={cn(
                  'w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-medium transition-all duration-500',
                  isCurrent && 'ring-2 ring-offset-2 ring-offset-transparent',
                  (isCurrent || isPast || isCompleted)
                    ? 'text-primary-foreground'
                    : 'bg-muted/40 text-muted-foreground/35 border border-border/15',
                )}
                style={
                  (isCurrent || isPast || isCompleted)
                    ? {
                        background: 'linear-gradient(135deg, hsl(30 40% 52%) 0%, hsl(34 48% 60%) 100%)',
                        boxShadow: isCurrent
                          ? '0 0 24px hsl(34 48% 60% / 0.5), 0 0 10px hsl(30 40% 52% / 0.35)'
                          : '0 0 12px hsl(34 48% 60% / 0.2)',
                      }
                    : undefined
                }
              >
                {isCompleted ? '✓' : (i + 1)}
              </motion.div>
            </div>

            {/* Label */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
              className={cn(
                'text-[10px] sm:text-[11px] mt-4 font-semibold tracking-wider',
                (isCurrent || isPast || isCompleted)
                  ? 'text-foreground'
                  : 'text-muted-foreground/30',
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
                className="text-[9px] text-elita-camel mt-1 font-medium"
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
