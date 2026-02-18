import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
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
  const [entries, setEntries] = useLocalStorage<Entry[]>(LS_KEY, []);
  const [profile, setProfile] = useLocalStorage<{ name: string; emojiIndex: number }>(
    LS_PROFILE_KEY,
    { name: '', emojiIndex: 0 }
  );
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const surferEmoji = SURFER_EMOJIS[profile.emojiIndex]?.emoji ?? SURFER_EMOJIS[0].emoji;
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

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (e) =>
        e.spot.toLowerCase().includes(q) ||
        e.conditions.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
    );
  }, [sorted, search]);

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

  const handleSearchToggle = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) setSearch(''); // clear search when closing
      return !prev;
    });
  }, []);

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
      setEntries((prev) => [entry, ...prev]);
    },
    [setEntries]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setToast('Entry deleted');
    },
    [setEntries]
  );

  const updateEntry = useCallback(
    (updated: Entry) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
      );
      setToast('Entry updated ✓');
    },
    [setEntries]
  );

  const clearAll = useCallback(() => {
    setEntries([]);
    setToast('All entries cleared');
    setSearchOpen(false);
    setSearch('');
  }, [setEntries]);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  if (loading) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-icon">🏄</div>
          <p className="login-subtitle">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        entryCount={entries.length}
        search={search}
        onSearchChange={setSearch}
        searchOpen={searchOpen}
        onSearchToggle={handleSearchToggle}
        surferEmoji={surferEmoji}
        userName={profile.name || user?.displayName || ''}
        userPhoto={user?.photoURL ?? undefined}
        isSignedIn={!!user}
      />
      <main className="app-container">
        {entries.length === 0 ? (
          <div className="welcome-card">
            <div className="emoji-picker">
              <button
                className="emoji-arrow"
                onClick={handlePrevEmoji}
                aria-label="Previous surfer style"
              >
                ‹
              </button>
              <span
                key={emojiKey}
                className={`welcome-icon ${emojiAnim !== 'none' ? emojiAnim : ''}`}
                aria-label={SURFER_EMOJIS[profile.emojiIndex]?.label}
                onAnimationEnd={() => setEmojiAnim('none')}
              >
                {surferEmoji}
              </span>
              <button
                className="emoji-arrow"
                onClick={handleNextEmoji}
                aria-label="Next surfer style"
              >
                ›
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
            <h2 className="welcome-title">Welcome to Surf Journal</h2>
            <p className="welcome-text">
              Track your sessions, conditions, and progress — all in one place.
            </p>
            <button
              className="btn btn-primary add-entry-btn"
              onClick={() => setShowForm(true)}
            >
              Log your first session
            </button>
          </div>
        ) : (
          <>
            <button
              className="btn btn-primary add-entry-btn"
              onClick={handleNewEntry}
            >
              New entry
            </button>
            <EntryList
              entries={filtered}
              totalCount={entries.length}
              search={search}
              onDelete={deleteEntry}
              onUpdate={updateEntry}
              onClearAll={clearAll}
            />
          </>
        )}
      </main>

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
