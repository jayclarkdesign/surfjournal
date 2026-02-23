import { useState, useEffect } from 'react';
import { signInWithGoogle } from '../firebase';
import { SURFER_EMOJIS } from '../constants';

interface SignInPromptProps {
  onClose: () => void;
}

export default function SignInPrompt({ onClose }: SignInPromptProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [surferIndex, setSurferIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSurferIndex((prev) => (prev + 1) % SURFER_EMOJIS.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      // Auth state change will automatically close this via App
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
      if (message.includes('popup-closed-by-user')) {
        setLoading(false);
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="dialog-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="signin-prompt">
        <div className="signin-prompt-icon">
          <img
            src={SURFER_EMOJIS[surferIndex].image}
            alt={SURFER_EMOJIS[surferIndex].label}
            className="signin-surfer-img"
          />
        </div>
        <h2 className="signin-prompt-title">Sign in to keep journaling</h2>
        <p className="signin-prompt-text">
          Create a free account to save unlimited surf sessions.
        </p>

        <button
          className="btn-google"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? 'Signing in…' : 'Sign in with Google'}
        </button>

        {error && <p className="login-error">{error}</p>}

        <button className="signin-prompt-dismiss" onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

