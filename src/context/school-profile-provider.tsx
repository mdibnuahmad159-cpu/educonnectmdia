'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import type { SchoolProfile } from '@/types';

type SchoolProfileContextType = {
  profile: SchoolProfile | null;
  loading: boolean;
};

const SchoolProfileContext = createContext<SchoolProfileContextType | undefined>(undefined);

export function SchoolProfileProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();

  const profileRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "schoolProfile", "main");
  }, [firestore]);

  const { data: profile, isLoading: loading } = useDoc<SchoolProfile>(profileRef);

  return (
    <SchoolProfileContext.Provider value={{ profile, loading }}>
      {children}
    </SchoolProfileContext.Provider>
  );
}

export function useSchoolProfile() {
  const context = useContext(SchoolProfileContext);
  if (context === undefined) {
    throw new Error('useSchoolProfile must be used within a SchoolProfileProvider');
  }
  return context;
}
