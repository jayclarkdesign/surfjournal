import { useEffect, useState, useCallback, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Entry } from '../types';

/**
 * Hook that syncs a signed-in user's journal entries with Firestore.
 * Returns the same [entries, helpers] shape that App.tsx expects.
 */
export function useFirestoreEntries(uid: string | null) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  // Subscribe to real-time updates when uid changes
  useEffect(() => {
    // Clean up previous listener
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!uid) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const entriesRef = collection(db, 'users', uid, 'entries');
    const q = query(entriesRef, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => d.data() as Entry);
        setEntries(docs);
        setLoading(false);
      },
      (err) => {
        console.error('[useFirestoreEntries] Snapshot error:', err);
        setLoading(false);
      }
    );

    unsubRef.current = unsub;
    return () => unsub();
  }, [uid]);

  const addEntry = useCallback(
    async (entry: Entry) => {
      if (!uid) return;
      const docRef = doc(db, 'users', uid, 'entries', entry.id);
      await setDoc(docRef, entry);
    },
    [uid]
  );

  const updateEntry = useCallback(
    async (entry: Entry) => {
      if (!uid) return;
      const docRef = doc(db, 'users', uid, 'entries', entry.id);
      await setDoc(docRef, entry, { merge: true });
    },
    [uid]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!uid) return;
      const docRef = doc(db, 'users', uid, 'entries', id);
      await deleteDoc(docRef);
    },
    [uid]
  );

  const clearAll = useCallback(async () => {
    if (!uid) return;
    const entriesRef = collection(db, 'users', uid, 'entries');
    const snapshot = await getDocs(entriesRef);
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }, [uid]);

  return { entries, loading, addEntry, updateEntry, deleteEntry, clearAll };
}

