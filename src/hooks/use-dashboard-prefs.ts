'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DashboardPrefs {
  totalResidents: boolean;
  activeResidents: boolean;
  monthlyRevenue: boolean;
  pendingPayments: boolean;
  paymentStatus: boolean;
  revenueCard: boolean;
}

const DEFAULT_PREFS: DashboardPrefs = {
  totalResidents: true,
  activeResidents: true,
  monthlyRevenue: true,
  pendingPayments: true,
  paymentStatus: true,
  revenueCard: true,
};

const STORAGE_KEY = 'pg-dashboard-prefs';

export function useDashboardPrefs() {
  const [prefs, setPrefs] = useState<DashboardPrefs>(DEFAULT_PREFS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
      } catch {
        setPrefs(DEFAULT_PREFS);
      }
    }
    setIsLoaded(true);
  }, []);

  const updatePref = useCallback((key: keyof DashboardPrefs, value: boolean) => {
    setPrefs(prev => {
      const newPrefs = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
      return newPrefs;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setPrefs(DEFAULT_PREFS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFS));
  }, []);

  const toggleAll = useCallback((value: boolean) => {
    const newPrefs = Object.keys(DEFAULT_PREFS).reduce((acc, key) => {
      acc[key as keyof DashboardPrefs] = value;
      return acc;
    }, {} as DashboardPrefs);
    setPrefs(newPrefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
  }, []);

  return {
    prefs,
    isLoaded,
    updatePref,
    resetToDefaults,
    toggleAll,
  };
}
