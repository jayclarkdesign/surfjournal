import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useFirestoreEntries } from './hooks/useFirestoreEntries';
import { useFirestoreProfile } from './hooks/useFirestoreProfile';
import { useAuth } from './hooks/useAuth';
import { LS_KEY, LS_PROFILE_KEY, SURFER_EMOJIS } from './constants';
import type { Entry } from './types';
import Header from './components/Header';
import EntryForm from './components/EntryForm';
import EntryList from './components/EntryList';
import Toast from './components/Toast';
import SignInPrompt from './components/SignInPrompt';
import MapView from './components/MapView';

const soundBtnStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 99999,
  width: 44,
  height: 44,
  border: 'none',
  borderRadius: 0,
  background: '#f5c800',
  color: '#1a1a2e',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 -3px 0 0 #333, 0 3px 0 0 #333, -3px 0 0 0 #333, 3px 0 0 0 #333',
  padding: 0,
};

function SoundToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return createPortal(
    <button
      type="button"
      onClick={onToggle}
      aria-label={muted ? 'Unmute backing track' : 'Mute backing track'}
      style={soundBtnStyle}
    >
      {muted ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.7 }}>
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      )}
    </button>,
    document.body
  );
}

function SplashSurferCycle() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % SURFER_EMOJIS.length);
        setFade(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <img
      src={SURFER_EMOJIS[index].image}
      alt={SURFER_EMOJIS[index].label}
      className={`splash-surfer-img ${fade ? 'splash-surfer-visible' : 'splash-surfer-hidden'}`}
    />
  );
}

export default function App() {
  const { user, loading } = useAuth();

  // Local storage for anonymous / first-entry users
  const [localEntries, setLocalEntries] = useLocalStorage<Entry[]>(LS_KEY, []);

  // Firestore for signed-in users
  const firestore = useFirestoreEntries(user?.uid ?? null);
  const firestoreProfile = useFirestoreProfile(user?.uid ?? null);

  // Use Firestore entries when signed in, localStorage when not
  const baseEntries = user ? firestore.entries : localEntries;
  const firestoreLoading = user ? (firestore.loading || firestoreProfile.loading) : false;
  const [pendingEntry, setPendingEntry] = useState<Entry | null>(null);

  // Clear pending entry once Firestore listener has the real data
  useEffect(() => {
    if (pendingEntry && baseEntries.some((e) => e.id === pendingEntry.id)) {
      setPendingEntry(null);
    }
  }, [baseEntries, pendingEntry]);

  // Include pending entry until Firestore listener catches up
  const entries = useMemo(() => {
    if (pendingEntry && !baseEntries.some((e) => e.id === pendingEntry.id)) {
      return [pendingEntry, ...baseEntries];
    }
    return baseEntries;
  }, [baseEntries, pendingEntry]);

  const [profile, setProfileLocal] = useLocalStorage<{ name: string; emojiIndex: number }>(
    LS_PROFILE_KEY,
    { name: '', emojiIndex: 0 }
  );

  // Sync profile between Firestore and localStorage when signed in
  const profileSyncedRef = useRef(false);
  useEffect(() => {
    if (!user) {
      profileSyncedRef.current = false;
      return;
    }
    if (!firestoreProfile.checkedOnce || profileSyncedRef.current) return;

    if (firestoreProfile.profile) {
      setProfileLocal(firestoreProfile.profile);
    } else if (profile.name) {
      firestoreProfile.saveProfile(profile).catch((err) => console.error('Profile push failed:', err));
    }
    profileSyncedRef.current = true;
  }, [user, firestoreProfile.checkedOnce, firestoreProfile.profile, firestoreProfile, profile, setProfileLocal]);

  // Wrap setProfile to also persist to Firestore
  const setProfile = useCallback(
    (updater: { name: string; emojiIndex: number } | ((prev: { name: string; emojiIndex: number }) => { name: string; emojiIndex: number })) => {
      setProfileLocal((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (user) {
          firestoreProfile.saveProfile(next).catch((err) => console.error('Profile save failed:', err));
        }
        return next;
      });
    },
    [user, firestoreProfile, setProfileLocal]
  );
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [showMap, setShowMapRaw] = useState(() => window.location.hash === '#map');
  const [mapFocusSpot, setMapFocusSpot] = useState<string | null>(null);

  const setShowMap = useCallback((show: boolean) => {
    setShowMapRaw(show);
    if (show) {
      window.location.hash = '#map';
    } else {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setShowMapRaw(window.location.hash === '#map');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Preload all surfer images on mount to prevent loading delays
  useEffect(() => {
    SURFER_EMOJIS.forEach((surfer) => {
      const img = new Image();
      img.src = surfer.image;
    });
  }, []);

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

  // Create Audio object once on mount
  useEffect(() => {
    const audio = new Audio('/audio/backing-track.mp3');
    audio.loop = true;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  // Pause music when tab/browser is backgrounded, resume when foregrounded
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  useEffect(() => {
    const handleVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) {
        audio.pause();
      } else if (!mutedRef.current) {
        audio.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // "Get Started" handler: start music and advance to surfer picker
  const handleGetStarted = useCallback(() => {
    const audio = audioRef.current;
    if (audio) audio.play().catch(() => {});
    setStarted(true);
  }, []);

  // Mute toggle: play/pause directly in click handler (user gesture)
  const handleToggleSound = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (muted) {
      audio.play().catch(() => {});
      setMuted(false);
    } else {
      audio.pause();
      setMuted(true);
    }
  }, [muted]);

  const soundTogglePortal = <SoundToggle muted={muted} onToggle={handleToggleSound} />;

  // Lock body scroll when a modal is open
  useEffect(() => {
    if (showForm || showSignInPrompt || showMap) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showForm, showSignInPrompt, showMap]);

  // Auto-close sign-in prompt when user signs in
  const signInSourceRef = useRef<'splash' | 'gate' | null>(null);
  const prevUserRef = useRef(user);
  useEffect(() => {
    const justSignedIn = user && !prevUserRef.current;
    prevUserRef.current = user;
    if (justSignedIn && showSignInPrompt) {
      setShowSignInPrompt(false);
      if (signInSourceRef.current === 'gate') {
        setShowForm(true);
      }
      // For splash sign-ins: returning users will skip onboarding automatically
      // via isReturningUser; new users need the surfer picker
      setStarted(true);
      signInSourceRef.current = null;
    }
  }, [user, showSignInPrompt]);

  // Gate new entries behind sign-in after the first free one
  const handleNewEntry = useCallback(() => {
    if (entries.length >= 1 && !user) {
      signInSourceRef.current = 'gate';
      setShowSignInPrompt(true);
    } else {
      setShowForm(true);
    }
  }, [entries.length, user]);

  const addEntry = useCallback(
    (entry: Entry) => {
      if (user) {
        firestore.addEntry(entry).catch((err) => console.error('Add failed:', err));
        if (entries.length === 0) {
          setPendingEntry(entry);
        }
      } else {
        setLocalEntries((prev) => [entry, ...prev]);
      }
      if (entries.length === 0) {
        setOnboardingDone(true);
      }
    },
    [user, firestore, setLocalEntries, entries.length]
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

  // Skip onboarding entirely for signed-in users with entries
  const isReturningUser = !!user && entries.length > 0;
  const needsOnboarding = !onboardingDone && !isReturningUser && (entries.length === 0 || !profile.name);

  return (
    <>
      {needsOnboarding ? (
        !started ? (
          <div className="welcome-screen">
            <div className="welcome-screen-bg" />
            <div className="welcome-content">
              <img src="/logo.png" alt="Surf Journal" className="welcome-logo splash-entrance splash-delay-0" />
              <h2 className="splash-tagline splash-entrance splash-delay-1">LOG YOUR WAVES</h2>
              <div className="splash-surfer splash-entrance splash-delay-2">
                <SplashSurferCycle />
              </div>
              <button
                className="btn-retro-cta splash-entrance splash-delay-3"
                onClick={handleGetStarted}
              >
                Get started
              </button>
              <button
                type="button"
                className="btn-retro-cta splash-signin-btn splash-entrance splash-delay-3"
                onClick={() => {
                  signInSourceRef.current = 'splash';
                  setShowSignInPrompt(true);
                }}
              >
                Sign in
              </button>
            </div>
          </div>
        ) : (
          <>
            {soundTogglePortal}
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
                  onClick={() => {
                    if (entries.length > 0) {
                      // Returning user on new device -- profile is now set, skip to journal
                    } else {
                      setShowForm(true);
                    }
                  }}
                  disabled={!profile.name.trim()}
                >
                  {entries.length > 0 ? "Let's go" : 'Log first wave'}
                </button>
              </div>
            </div>
          </>
        )
      ) : (
        <div className="retro-app">
          <div className="retro-app-bg" />
          <Header
            surferImage={surferImage}
            userName={profile.name || user?.displayName || ''}
            userPhoto={user?.photoURL ?? undefined}
            isSignedIn={!!user}
            muted={muted}
            onToggleSound={handleToggleSound}
            onSignIn={() => { signInSourceRef.current = 'gate'; setShowSignInPrompt(true); }}
          />
          <main className="app-container">
            <div className="action-buttons-row">
              <button
                className="btn btn-secondary view-map-btn"
                onClick={() => setShowMap(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
                  <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
                </svg>
                View map
              </button>
              <button
                className="btn btn-primary add-entry-btn"
                onClick={handleNewEntry}
              >
                + New entry
              </button>
            </div>
            <EntryList
              entries={sorted}
              onDelete={deleteEntry}
              onUpdate={updateEntry}
              onOpenMap={(spot) => { setMapFocusSpot(spot); setShowMap(true); }}
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

      {showMap && (
        <MapView
          entries={entries}
          onClose={() => { setShowMap(false); setMapFocusSpot(null); }}
          focusSpot={mapFocusSpot}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
