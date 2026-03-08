import { useEffect, useState, useRef } from 'react';
import { signOut } from '../firebase';

interface HeaderProps {
  surferImage: string;
  userName: string;
  userPhoto?: string;
  isSignedIn: boolean;
  muted: boolean;
  onToggleSound: () => void;
  onSignIn: () => void;
}

export default function Header({
  surferImage,
  userName,
  userPhoto,
  isSignedIn,
  muted,
  onToggleSound,
  onSignIn,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const capitalizedName = userName 
    ? userName.charAt(0).toUpperCase() + userName.slice(1)
    : '';
  const title = userName ? `${capitalizedName}'s Surf Journal` : 'Surf Journal';

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

  const handleSignIn = () => {
    onSignIn();
  };

  return (
    <header className="header">
      <div className="header-inner">
        <h1 className="header-title">
          <img src={surferImage} alt="Surfer" className="header-surfer-img" /> {title}
        </h1>
        <div className="header-right">
          <button
            type="button"
            className="sound-toggle-btn"
            onClick={onToggleSound}
            aria-label={muted ? 'Unmute backing track' : 'Mute backing track'}
          >
            {muted ? (
              <svg className="sound-icon" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.7 }}>
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg className="sound-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
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
              Save progress
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
