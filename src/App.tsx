import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useFirestoreEntries } from './hooks/useFirestoreEntries';
import { useAuth } from './hooks/useAuth';
import { LS_KEY, LS_PROFILE_KEY, SURFER_EMOJIS } from './constants';
import type { Entry } from './types';
import Header from './components/Header';
import EntryForm from './components/EntryForm';
import EntryList from './components/EntryList';
import Toast from './components/Toast';
import SignInPrompt from './components/SignInPrompt';

export default function App() {
  const { user, loading } = useAuth();

  // Local storage for anonymous / first-entry users
  const [localEntries, setLocalEntries] = useLocalStorage<Entry[]>(LS_KEY, []);

  // Firestore for signed-in users
  const firestore = useFirestoreEntries(user?.uid ?? null);

  // Use Firestore entries when signed in, localStorage when not
  const entries = user ? firestore.entries : localEntries;
  const firestoreLoading = user ? firestore.loading : false;

  const [profile, setProfile] = useLocalStorage<{ name: string; emojiIndex: number }>(
    LS_PROFILE_KEY,
    { name: '', emojiIndex: 0 }
  );
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // Migrate local entries to Firestore when user signs in
  const [hasMigrated, setHasMigrated] = useState(false);
  useEffect(() => {
    if (user && !hasMigrated && localEntries.length > 0 && !firestore.loading) {
      // Move any localStorage entries to Firestore
      Promise.all(localEntries.map((entry) => firestore.addEntry(entry)))
        .then(() => {
          setLocalEntries([]); // Clear local storage after migration
          setHasMigrated(true);
        })
        .catch((err) => console.error('Migration failed:', err));
    }
    if (user && !hasMigrated && localEntries.length === 0) {
      setHasMigrated(true);
    }
  }, [user, hasMigrated, localEntries, firestore, setLocalEntries]);

  const surferImage = SURFER_EMOJIS[profile.emojiIndex]?.image ?? SURFER_EMOJIS[0].image;
  const [emojiAnim, setEmojiAnim] = useState<'none' | 'slide-left' | 'slide-right'>('none');
  const [emojiKey, setEmojiKey] = useState(0);

  const triggerEmojiChange = useCallback(
    (direction: 'left' | 'right') => {
      setEmojiAnim(direction === 'left' ? 'slide-left' : 'slide-right');
      setEmojiKey((k) => k + 1);
      setProfile((prev) => ({
        ...prev,
        emojiIndex:
          direction === 'left'
            ? (prev.emojiIndex - 1 + SURFER_EMOJIS.length) % SURFER_EMOJIS.length
            : (prev.emojiIndex + 1) % SURFER_EMOJIS.length,
      }));
    },
    [setProfile]
  );

  const handlePrevEmoji = useCallback(() => triggerEmojiChange('left'), [triggerEmojiChange]);
  const handleNextEmoji = useCallback(() => triggerEmojiChange('right'), [triggerEmojiChange]);

  const handleNameChange = useCallback(
    (name: string) => {
      setProfile((prev) => ({ ...prev, name }));
    },
    [setProfile]
  );

  // Sort entries newest first (by createdAt descending)
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.createdAt - a.createdAt),
    [entries]
  );

  // Lock body scroll when a modal is open
  useEffect(() => {
    if (showForm || showSignInPrompt) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showForm, showSignInPrompt]);

  // Auto-close sign-in prompt when user signs in
  useEffect(() => {
    if (user && showSignInPrompt) {
      setShowSignInPrompt(false);
      setShowForm(true); // open the form they originally wanted
    }
  }, [user, showSignInPrompt]);

  // Gate new entries behind sign-in after the first free one
  const handleNewEntry = useCallback(() => {
    if (entries.length >= 1 && !user) {
      setShowSignInPrompt(true);
    } else {
      setShowForm(true);
    }
  }, [entries.length, user]);

  const addEntry = useCallback(
    (entry: Entry) => {
      if (user) {
        firestore.addEntry(entry).catch((err) => console.error('Add failed:', err));
      } else {
        setLocalEntries((prev) => [entry, ...prev]);
      }
    },
    [user, firestore, setLocalEntries]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      if (user) {
        firestore.deleteEntry(id).catch((err) => console.error('Delete failed:', err));
      } else {
        setLocalEntries((prev) => prev.filter((e) => e.id !== id));
      }
      setToast('Entry deleted');
    },
    [user, firestore, setLocalEntries]
  );

  const updateEntry = useCallback(
    (updated: Entry) => {
      if (user) {
        firestore.updateEntry(updated).catch((err) => console.error('Update failed:', err));
      } else {
        setLocalEntries((prev) =>
          prev.map((e) => (e.id === updated.id ? updated : e))
        );
      }
      setToast('Entry updated ✓');
    },
    [user, firestore, setLocalEntries]
  );


  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  if (loading || firestoreLoading) {
    return (
      <div className="welcome-screen">
        <div className="welcome-screen-bg" />
        <div className="welcome-content">
          <img src="/logo.png" alt="Surf Journal" className="welcome-logo" />
          <p className="welcome-choose-text">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {entries.length === 0 ? (
        <div className="welcome-screen">
          <div className="welcome-screen-bg" />
          <div className="welcome-content">
            <img src="/logo.png" alt="Surf Journal" className="welcome-logo" />
            <h2 className="welcome-choose-text">CHOOSE YOUR SURFER</h2>
            <div className="emoji-picker">
              <button
                className="emoji-arrow"
                onClick={handlePrevEmoji}
                aria-label="Previous surfer style"
              >
                <img src="/arrow.png" alt="Previous" className="arrow-img arrow-left" />
              </button>
              <span
                key={emojiKey}
                className={`welcome-icon ${emojiAnim !== 'none' ? emojiAnim : ''}`}
                onAnimationEnd={() => setEmojiAnim('none')}
              >
                <img
                  src={surferImage}
                  alt={SURFER_EMOJIS[profile.emojiIndex]?.label ?? 'Surfer'}
                  className="surfer-img"
                />
              </span>
              <button
                className="emoji-arrow"
                onClick={handleNextEmoji}
                aria-label="Next surfer style"
              >
                <img src="/arrow.png" alt="Next" className="arrow-img arrow-right" />
              </button>
            </div>
            <input
              type="text"
              className="name-input"
              placeholder="Your name"
              value={profile.name}
              onChange={(e) => handleNameChange(e.target.value)}
              aria-label="Your name"
            />
            <button
              className="btn-retro-cta"
              onClick={() => setShowForm(true)}
            >
              Log first wave
            </button>
          </div>
        </div>
      ) : (
        <div className="retro-app">
          <div className="retro-app-bg" />
          <Header
            surferImage={surferImage}
            userName={profile.name || user?.displayName || ''}
            userPhoto={user?.photoURL ?? undefined}
            isSignedIn={!!user}
          />
          <main className="app-container">
            <button
              className="btn btn-primary add-entry-btn"
              onClick={handleNewEntry}
            >
              + New entry
            </button>
            <EntryList
              entries={sorted}
              onDelete={deleteEntry}
              onUpdate={updateEntry}
            />
          </main>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div
          className="form-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowForm(false);
          }}
        >
          <div className="form-modal-container">
            <EntryForm
              onAdd={addEntry}
              onToast={showToast}
              onClose={() => setShowForm(false)}
              lastEntry={sorted[0] ?? null}
            />
          </div>
        </div>
      )}

      {/* Sign-in prompt modal */}
      {showSignInPrompt && (
        <SignInPrompt onClose={() => setShowSignInPrompt(false)} />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
