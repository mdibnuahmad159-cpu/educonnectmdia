'use client';
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, Query, DocumentData, Firestore } from 'firebase/firestore';
import { useFirestore } from '../provider';

export function useCollection<T>(path: string) {
  const firestore = useFirestore();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const collectionQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, path));
  }, [firestore, path]);


  useEffect(() => {
    if (!collectionQuery) {
        setLoading(false);
        return;
    };

    const unsubscribe = onSnapshot(collectionQuery, (snapshot) => {
      const result: T[] = [];
      snapshot.forEach((doc) => {
        result.push({ id: doc.id, ...doc.data() } as any);
      });
      setData(result);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionQuery]);

  return { data, loading, error };
}
