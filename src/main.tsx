import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, configured } from './firebase';
import allowedEmailsMd from '../emails.md?raw';
import './style.css';

type Result = { allowed: boolean; email: string; name: string };

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

function parseAllowedEmails(md: string): Set<string> {
  const emails = new Set<string>();
  for (const match of md.matchAll(EMAIL_RE)) {
    emails.add(match[0].toLowerCase());
  }
  return emails;
}

const allowedEmails = parseAllowedEmails(allowedEmailsMd);

function checkUserAccess(user: User): Result {
  const email = (user.email || '').trim().toLowerCase();
  return {
    allowed: email !== '' && allowedEmails.has(email),
    email,
    name: user.displayName || email,
  };
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setResult(u ? checkUserAccess(u) : null);
      setError('');
      setLoading(false);
    });
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operazione non riuscita. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  function verifyAgain() {
    if (user) setResult(checkUserAccess(user));
  }

  return (
    <main>
      <header>
        <span className="logo">▦</span>
        <div>
          <h1>Scan n Go</h1>
          <p>Controllo accesso scuola</p>
        </div>
      </header>

      {!configured ? (
        <section>
          <h2>Configurazione necessaria</h2>
          <p>Inserisci i dati Firebase nel file .env seguendo il README.</p>
        </section>
      ) : loading ? (
        <section>Caricamento…</section>
      ) : !user ? (
        <section>
          <span className="tag">ACCESSO SCUOLA</span>
          <h2>Accedi con il tuo account scuola</h2>
          <p>Usa l’email istituzionale Google per verificare se puoi entrare.</p>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await signInWithPopup(auth!, new GoogleAuthProvider());
              })
            }
          >
            Accedi con Google
          </button>
        </section>
      ) : (
        <>
          <nav>
            <span>
              {user.displayName}
              <small>{user.email}</small>
            </span>
            <button className="secondary" onClick={() => void run(() => signOut(auth!))}>
              Esci
            </button>
          </nav>

          <section>
            <span className="tag">ESITO ACCESSO</span>
            {result ? (
              <div className={result.allowed ? 'result ok' : 'result no'}>
                <h2>{result.allowed ? 'Puoi entrare' : 'Passare in vicepresidenza'}</h2>
                <p>{result.name}</p>
                <small>{result.email}</small>
              </div>
            ) : (
              <p>Impossibile verificare l’accesso.</p>
            )}
            <button disabled={busy} onClick={verifyAgain}>
              Verifica di nuovo
            </button>
          </section>
        </>
      )}

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <footer>Scan n Go · Accesso con account Google</footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
