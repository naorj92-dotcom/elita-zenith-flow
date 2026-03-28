import { useState, useCallback } from 'react';

const STORAGE_KEY = 'provider-colors';

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
];

export function useProviderColors() {
  const [colorMap, setColorMap] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const getColor = useCallback((staffId: string, index: number): string => {
    return colorMap[staffId] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  }, [colorMap]);

  const setColor = useCallback((staffId: string, color: string) => {
    setColorMap(prev => {
      const next = { ...prev, [staffId]: color };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { colorMap, getColor, setColor, availableColors: DEFAULT_COLORS };
}
