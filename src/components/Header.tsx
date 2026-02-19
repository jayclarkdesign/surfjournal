import { useRef, useEffect, useState } from 'react';
import { signInWithGoogle, signOut } from '../firebase';

interface HeaderProps {
  entryCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  searchOpen: boolean;
  onSearchToggle: () => void;
  surferEmoji: string;
  userName: string;
  userPhoto?: string;
  isSignedIn: boolean;
}

export default function Header({
  entryCount,
  search,
  onSearchChange,
  searchOpen,
  onSearchToggle,
  surferEmoji,
  userName,
  userPhoto,
  isSignedIn,
}: HeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const title = userName ? `${userName}'s Surf Journal` : 'Surf Journal';

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      // Only ignore popup-closed-by-user; surface real errors
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('popup-closed-by-user')) {
        console.error('Sign-in failed:', err);
      }
    }
  };

  return (
    <header className="header">
      <div className="header-inner">
        <h1 className="header-title">
          <span className="header-emoji">{surferEmoji}</span> {title}
        </h1>
        <div className="header-right">
          <span className="header-count" aria-label={`${entryCount} entries`}>
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
          </span>
          {entryCount > 0 && (
            <button
              className="btn-icon"
              onClick={onSearchToggle}
              aria-label={searchOpen ? 'Close search' : 'Search entries'}
              aria-expanded={searchOpen}
            >
              {searchOpen ? '✕' : '🔍'}
            </button>
          )}
          {isSignedIn ? (
            <div className="user-menu-wrapper" ref={menuRef}>
              <button
                className="user-avatar-btn"
                onClick={() => setMenuOpen((p) => !p)}
                aria-label="Account menu"
                aria-expanded={menuOpen}
              >
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt=""
                    className="user-avatar-img"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="user-avatar-fallback">
                    {userName ? userName.charAt(0).toUpperCase() : '?'}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div className="user-menu">
                  <button className="user-menu-item" onClick={handleSignOut}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="header-signin-btn" onClick={handleSignIn}>
              Sign in
            </button>
          )}
        </div>
      </div>
      {searchOpen && (
        <div className="header-search">
          <input
            ref={inputRef}
            type="search"
            className="header-search-input"
            placeholder="Search entries…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search entries"
          />
        </div>
      )}
    </header>
  );
}
