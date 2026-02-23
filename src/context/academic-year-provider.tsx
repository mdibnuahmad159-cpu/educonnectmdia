'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useSchoolProfile } from './school-profile-provider';
import { useFirestore } from '@/firebase';
import { updateSchoolProfile } from '@/lib/firebase-helpers';
import { useToast } from '@/hooks/use-toast';

type AcademicYearContextType = {
  activeYear: string;
  setActiveYear: (year: string) => Promise<void>;
  availableYears: string[];
  loading: boolean;
};

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

function getDefaultAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed (January is 0)

  // Academic year typically changes around July
  if (month >= 6) { // July or later
    return `${year}/${year + 1}`;
  } else { // Before July
    return `${year - 1}/${year}`;
  }
}

function getAvailableAcademicYears(currentYear: string): string[] {
    const [startYear] = currentYear.split('/').map(Number);
    const previousYear = `${startYear - 1}/${startYear}`;
    const nextYear = `${startYear + 1}/${startYear + 2}`;
    // Ensure the list is unique and sorted, with the currentYear in it.
    const yearSet = new Set([previousYear, currentYear, nextYear]);
    return Array.from(yearSet).sort();
}


export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { profile, loading: profileLoading } = useSchoolProfile();
  const { toast } = useToast();

  const activeYear = useMemo(() => profile?.activeAcademicYear || getDefaultAcademicYear(), [profile]);
  const availableYears = useMemo(() => getAvailableAcademicYears(activeYear), [activeYear]);

  const setActiveYear = async (year: string) => {
    if (!firestore) return;
    try {
      await updateSchoolProfile(firestore, { activeAcademicYear: year });
      toast({ title: "Tahun Ajaran Diubah", description: `Tahun ajaran aktif sekarang adalah ${year}.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Mengubah", description: error.message });
    }
  };

  const value = {
    activeYear,
    setActiveYear,
    availableYears,
    loading: profileLoading,
  };

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  const context = useContext(AcademicYearContext);
  if (context === undefined) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
}
