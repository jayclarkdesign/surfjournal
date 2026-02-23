import { useEffect, useState, useRef } from 'react';
import { signInWithGoogle, signOut } from '../firebase';

interface HeaderProps {
  surferImage: string;
  userName: string;
  userPhoto?: string;
  isSignedIn: boolean;
}

export default function Header({
  surferImage,
  userName,
  userPhoto,
  isSignedIn,
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

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
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
          <img src={surferImage} alt="Surfer" className="header-surfer-img" /> {title}
        </h1>
        <div className="header-right">
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
    </header>
  );
}
