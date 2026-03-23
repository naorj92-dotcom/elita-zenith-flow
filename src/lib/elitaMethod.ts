// Elita Method Recommendation Engine
// Freeze • Tone • Tight • Glow

export type ClientGoal = 'fat_loss' | 'body_sculpting' | 'skin_tightening' | 'face_glow' | 'post_weight_loss';
export type TreatmentCategory = 'freeze' | 'tone' | 'tight' | 'glow';

export interface CategoryInfo {
  key: TreatmentCategory;
  label: string;
  description: string;
  emoji: string;
  treatments: string[];
}

export interface GoalInfo {
  key: ClientGoal;
  label: string;
  description: string;
  emoji: string;
}

export interface Recommendation {
  category: TreatmentCategory;
  label: string;
  reason: string;
  isPrimary: boolean;
}

export interface ProgressData {
  category: TreatmentCategory;
  sessions_completed: number;
  sessions_target: number;
}

// ─── Category Definitions ───
export const CATEGORIES: Record<TreatmentCategory, CategoryInfo> = {
  freeze: {
    key: 'freeze',
    label: 'Freeze',
    description: 'Fat reduction',
    emoji: '❄️',
    treatments: ['Cryolipolysis', 'X-Freeze', 'CoolSculpting', 'Fat Freeze'],
  },
  tone: {
    key: 'tone',
    label: 'Tone',
    description: 'Muscle sculpting',
    emoji: '💪',
    treatments: ['EMS', 'EMSculpt', 'Muscle Toning', 'Body Sculpt'],
  },
  tight: {
    key: 'tight',
    label: 'Tight',
    description: 'Skin tightening',
    emoji: '✨',
    treatments: ['RF Skin Tightening', 'X-Tight', 'Radio Frequency', 'Skin Tightening'],
  },
  glow: {
    key: 'glow',
    label: 'Glow',
    description: 'Skin rejuvenation',
    emoji: '🌟',
    treatments: ['Hydrafacial', 'LED Therapy', 'Chemical Peel', 'Microneedling', 'Facial', 'PRP Facial'],
  },
};

// ─── Goal Definitions ───
export const GOALS: GoalInfo[] = [
  { key: 'fat_loss', label: 'Fat Loss', description: 'Reduce stubborn fat areas', emoji: '🔥' },
  { key: 'body_sculpting', label: 'Body Sculpting', description: 'Tone and define muscles', emoji: '💪' },
  { key: 'skin_tightening', label: 'Skin Tightening', description: 'Firm and tighten skin', emoji: '✨' },
  { key: 'face_glow', label: 'Face Glow', description: 'Radiant, rejuvenated skin', emoji: '🌟' },
  { key: 'post_weight_loss', label: 'Post Weight Loss', description: 'Tighten loose skin after weight loss', emoji: '🦋' },
];

// ─── Goal → Treatment Mapping ───
const GOAL_RECOMMENDATIONS: Record<ClientGoal, { primary: TreatmentCategory; secondary?: TreatmentCategory; secondaryReason?: string }> = {
  fat_loss: { primary: 'freeze', secondary: 'tight', secondaryReason: 'to prevent loose skin' },
  body_sculpting: { primary: 'tone', secondary: 'freeze', secondaryReason: 'for fat reduction' },
  skin_tightening: { primary: 'tight' },
  face_glow: { primary: 'glow' },
  post_weight_loss: { primary: 'tight', secondary: 'tone', secondaryReason: 'to build muscle definition' },
};

// ─── Session Progression Rules ───
const PROGRESSION_RULES: { condition: (p: ProgressData[]) => boolean; recommendation: Recommendation }[] = [
  {
    condition: (p) => {
      const freeze = p.find(x => x.category === 'freeze');
      const tight = p.find(x => x.category === 'tight');
      return (freeze?.sessions_completed || 0) >= 3 && (tight?.sessions_completed || 0) < 2;
    },
    recommendation: {
      category: 'tight',
      label: 'Add Tightening',
      reason: 'After multiple Freeze sessions, add Tightening to firm the treated areas',
      isPrimary: false,
    },
  },
  {
    condition: (p) => {
      const tone = p.find(x => x.category === 'tone');
      const freeze = p.find(x => x.category === 'freeze');
      return (tone?.sessions_completed || 0) >= 3 && (freeze?.sessions_completed || 0) < 2;
    },
    recommendation: {
      category: 'freeze',
      label: 'Add Fat Reduction',
      reason: 'Combine with Freeze to enhance your body sculpting results',
      isPrimary: false,
    },
  },
  {
    condition: (p) => {
      const glow = p.find(x => x.category === 'glow');
      return (glow?.sessions_completed || 0) >= 4;
    },
    recommendation: {
      category: 'glow',
      label: 'Maintenance Glow',
      reason: 'Continue with maintenance facials every 4–6 weeks for lasting results',
      isPrimary: false,
    },
  },
];

// ─── Main Recommendation Function ───
export function getRecommendations(
  goals: ClientGoal[],
  progress: ProgressData[],
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const addedCategories = new Set<TreatmentCategory>();

  // 1. Goal-based recommendations
  const activeGoal = goals[0]; // Primary goal
  if (activeGoal) {
    const mapping = GOAL_RECOMMENDATIONS[activeGoal];
    const primaryProgress = progress.find(p => p.category === mapping.primary);
    const isComplete = primaryProgress && primaryProgress.sessions_completed >= primaryProgress.sessions_target;

    if (!isComplete) {
      recommendations.push({
        category: mapping.primary,
        label: `Continue ${CATEGORIES[mapping.primary].label}`,
        reason: `Your ${GOALS.find(g => g.key === activeGoal)?.label} journey — keep going!`,
        isPrimary: true,
      });
      addedCategories.add(mapping.primary);
    }

    // Add secondary if applicable
    if (mapping.secondary && !addedCategories.has(mapping.secondary)) {
      const primarySessions = primaryProgress?.sessions_completed || 0;
      if (primarySessions >= 2) {
        recommendations.push({
          category: mapping.secondary,
          label: `Add ${CATEGORIES[mapping.secondary].label}`,
          reason: mapping.secondaryReason || 'Enhance your results',
          isPrimary: false,
        });
        addedCategories.add(mapping.secondary);
      }
    }
  }

  // 2. Session progression rules
  for (const rule of PROGRESSION_RULES) {
    if (!addedCategories.has(rule.recommendation.category) && rule.condition(progress)) {
      recommendations.push(rule.recommendation);
      addedCategories.add(rule.recommendation.category);
    }
  }

  return recommendations.slice(0, 2); // Max 2 recommendations
}

// ─── Get single clear recommendation text ───
export function getSimpleRecommendation(
  goals: ClientGoal[],
  progress: ProgressData[],
): { title: string; subtitle: string; category: TreatmentCategory } | null {
  const recs = getRecommendations(goals, progress);
  const primary = recs.find(r => r.isPrimary) || recs[0];
  if (!primary) return null;

  return {
    title: primary.label,
    subtitle: primary.reason,
    category: primary.category,
  };
}

// ─── Match a service name to a treatment category ───
export function matchServiceToCategory(serviceName: string): TreatmentCategory | null {
  const lower = serviceName.toLowerCase();
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (cat.treatments.some(t => lower.includes(t.toLowerCase()))) {
      return key as TreatmentCategory;
    }
  }
  // Fallback keyword matching
  if (lower.includes('cryo') || lower.includes('freeze') || lower.includes('fat')) return 'freeze';
  if (lower.includes('ems') || lower.includes('sculpt') || lower.includes('tone') || lower.includes('muscle')) return 'tone';
  if (lower.includes('tight') || lower.includes('rf') || lower.includes('radio')) return 'tight';
  if (lower.includes('facial') || lower.includes('glow') || lower.includes('peel') || lower.includes('led') || lower.includes('needle')) return 'glow';
  return null;
}
