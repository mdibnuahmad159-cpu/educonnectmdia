'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

type AcademicYearContextType = {
  activeYear: string;
  setActiveYear: (year: string) => void;
  availableYears: string[];
};

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

function getCurrentAcademicYear(): string {
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
  return [previousYear, currentYear, nextYear];
}

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const currentYear = useMemo(getCurrentAcademicYear, []);
  const availableYears = useMemo(() => getAvailableAcademicYears(currentYear), [currentYear]);
  
  const [activeYear, setActiveYear] = useState<string>(currentYear);

  const value = {
    activeYear,
    setActiveYear,
    availableYears,
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
