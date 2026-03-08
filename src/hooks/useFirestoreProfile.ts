import { useEffect, useState, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface FirestoreProfile {
  name: string;
  emojiIndex: number;
}

export function useFirestoreProfile(uid: string | null) {
  const [profile, setProfile] = useState<FirestoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const activeUidRef = useRef<string | null>(null);

  useEffect(() => {
    activeUidRef.current = uid;

    if (!uid) {
      setProfile(null);
      setLoading(false);
      setCheckedOnce(false);
      return;
    }

    setLoading(true);
    setCheckedOnce(false);
    const docRef = doc(db, 'users', uid, 'settings', 'profile');
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (uid !== activeUidRef.current) return;
        if (snap.exists()) {
          setProfile(snap.data() as FirestoreProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
        setCheckedOnce(true);
      },
      (err) => {
        console.error('[useFirestoreProfile] Snapshot error:', err);
        setLoading(false);
        setCheckedOnce(true);
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

  return { profile, loading, checkedOnce, saveProfile };
}
