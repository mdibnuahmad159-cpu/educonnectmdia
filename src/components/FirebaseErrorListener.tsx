
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
      // If it's an index error, we don't throw it globally so the component can show the link
      if (error.message.toLowerCase().includes('requires an index') || 
          error.message.toLowerCase().includes('index')) {
        console.warn('Firestore Index Required:', error.message);
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
