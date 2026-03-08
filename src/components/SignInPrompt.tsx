import { useState, useEffect, type FormEvent } from 'react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } from '../firebase';
import { SURFER_EMOJIS } from '../constants';

interface SignInPromptProps {
  onClose: () => void;
}

function friendlyError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function SignInPrompt({ onClose }: SignInPromptProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [surferIndex, setSurferIndex] = useState(0);
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSurferIndex((prev) => (prev + 1) % SURFER_EMOJIS.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
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

  const toggleMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError(null);
    setResetSent(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email above, then tap "Forgot password?"');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      setError(friendlyError(code));
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
        <div className="signin-prompt-header">
          <button
            type="button"
            className="btn-retro-edit"
            onClick={onClose}
          >
            CLOSE
          </button>
        </div>
        <div className="signin-prompt-icon">
          <img
            src={SURFER_EMOJIS[surferIndex].image}
            alt={SURFER_EMOJIS[surferIndex].label}
            className="signin-surfer-img"
          />
        </div>
        <h2 className="signin-prompt-title">
          {mode === 'signin' ? 'Sign in to keep journaling' : 'Create account or sign in'}
        </h2>
        <p className="signin-prompt-text">
          {mode === 'signin'
            ? 'Save unlimited surf sessions.'
            : 'Save unlimited surf sessions.'}
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
          {loading ? 'Please wait…' : 'Continue with Google'}
        </button>

        <div className="email-auth-divider">
          <span>or</span>
        </div>

        <form className="email-auth-form" onSubmit={handleEmailSubmit} noValidate>
          <input
            type="email"
            className="form-input email-auth-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-label="Email"
          />
          <input
            type="password"
            className="form-input email-auth-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            aria-label="Password"
          />
          <button
            type="submit"
            className="btn btn-primary email-auth-submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        {mode === 'signin' && !resetSent && (
          <button type="button" className="email-auth-toggle" onClick={handleForgotPassword}>
            Forgot password?
          </button>
        )}

        {resetSent && (
          <p className="reset-sent-msg">Reset link sent! Check your email.</p>
        )}

        <button type="button" className="email-auth-toggle" onClick={toggleMode}>
          {mode === 'signin'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>

        {error && <p className="login-error">{error}</p>}

      </div>
    </div>
  );
}
