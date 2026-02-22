'use client';
import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, DocumentReference, DocumentData, Firestore } from 'firebase/firestore';
import { useFirestore } from '../provider';

export function useDoc<T>(path: string) {
  const firestore = useFirestore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const docRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, path) as DocumentReference<T>;
  }, [firestore, path]);

  useEffect(() => {
    if (!docRef) {
        setLoading(false);
        return;
    }

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setData({ id: snapshot.id, ...snapshot.data() } as any);
      } else {
        setData(null);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [docRef]);

  return { data, loading, error };
}
