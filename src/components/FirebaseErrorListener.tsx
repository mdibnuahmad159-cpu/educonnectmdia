'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by Next.js's global-error.tsx,
 * UNLESS it's a missing index error or specific permission error that components handle.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      const msg = error.message.toLowerCase();
      
      // If it's an index error or offline error, we don't throw it globally 
      // so the local component can show a specific UI or link
      if (msg.includes('requires an index') || 
          msg.includes('index') || 
          msg.includes('offline') ||
          msg.includes('network')) {
        console.warn('Firestore controlled error:', error.message);
        return;
      }
      
      // Also don't throw for standard permission errors on pages that handle them locally
      // but log them for debugging
      console.error('Firestore contextual error:', error.message);
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  if (error) {
    throw error;
  }

  return null;
}
