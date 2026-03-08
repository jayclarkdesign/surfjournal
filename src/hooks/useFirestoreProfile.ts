import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface FirestoreProfile {
  name: string;
  emojiIndex: number;
}

export function useFirestoreProfile(uid: string | null) {
  const [profile, setProfile] = useState<FirestoreProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, 'users', uid, 'settings', 'profile');
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as FirestoreProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[useFirestoreProfile] Snapshot error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  const saveProfile = useCallback(
    async (data: FirestoreProfile) => {
      if (!uid) return;
      const docRef = doc(db, 'users', uid, 'settings', 'profile');
      await setDoc(docRef, data);
    },
    [uid]
  );

  return { profile, loading, saveProfile };
}
