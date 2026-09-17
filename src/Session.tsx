import { useEffect, useState } from 'react';
import { LogIn, RefreshCw } from 'lucide-react';
import { api, ApiError } from './api';
import type { Account } from '../shared/care';
import App from './App';

export default function Session() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api<Account>('me')
      .then((user) => {
        if (!cancelled) setAccount(user);
      })
      .catch((error: Error) => {
        if (!cancelled && (!(error instanceof ApiError) || error.status !== 401))
          setError('Cannot reach the demo API. Check your connection and retry.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [retry]);
  useEffect(() => {
    const clear = () => {
      setAccount(null);
      setPassword('');
    };
    const channel = new BroadcastChannel('research-twin-auth');
    channel.onmessage = clear;
    window.addEventListener('session-expired', clear);
    return () => {
      channel.close();
      window.removeEventListener('session-expired', clear);
    };
  }, []);
  async function logout() {
    try {
      await api('auth/sign-out', {});
      const channel = new BroadcastChannel('research-twin-auth');
      channel.postMessage('signed-out');
      channel.close();
      setAccount(null);
      setPassword('');
      setError('');
    } catch (error) {
      window.alert((error as Error).message + ' Sign-out was not confirmed.');
    }
  }
  if (loading)
    return (
      <main className="startup" role="status">
        Checking session...
      </main>
    );
  if (account) return <App key={account.id} account={account} onLogout={logout} />;
  return (
    <main className="login-page my-health">
      <img src="/icon-192.png" width="56" height="56" alt="" />
      <h1>Research Twin</h1>
      <p>Patient and doctor workspace</p>
      <p className="notice">Synthetic demonstration only. Do not enter real health information.</p>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      <form
        aria-label="Sign in"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          try {
            await api('auth/sign-in/email', { email, password, rememberMe: false });
            const channel = new BroadcastChannel('research-twin-auth');
            channel.postMessage('account-changed');
            channel.close();
            setAccount(await api<Account>('me'));
            setPassword('');
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="primary" type="submit">
            <LogIn size={17} />
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </fieldset>
      </form>
      {error && (
        <button className="secondary" onClick={() => setRetry((value) => value + 1)}>
          <RefreshCw size={16} />
          Retry connection
        </button>
      )}
    </main>
  );
}
