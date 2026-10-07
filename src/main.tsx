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

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [resultKey, setResultKey] = useState(0);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setResult(u ? checkUserAccess(u) : null);
      setResultKey((k) => k + 1);
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
    if (!user) return;
    setResult(checkUserAccess(user));
    setResultKey((k) => k + 1);
  }

  return (
    <div className="app">
      <header className="brand">
        <div className="brand-mark" aria-hidden="true">
          SG
        </div>
        <h1>
          Scan <span>n</span> Go
        </h1>
        <p>Il check-in veloce dell’Istituto Boselli</p>
      </header>

      {!configured ? (
        <section className="panel">
          <span className="eyebrow">Setup</span>
          <h2>Configurazione necessaria</h2>
          <p>Inserisci i dati Firebase nel file .env seguendo il README.</p>
        </section>
      ) : loading ? (
        <section className="panel">
          <div className="loading">
            <div className="spinner" aria-hidden="true" />
            Un attimo…
          </div>
        </section>
      ) : !user ? (
        <section className="panel">
          <span className="eyebrow">Entra a scuola</span>
          <h2>Ciao! Sei in lista?</h2>
          <p>Accedi con la tua email scolastica Google e scopri subito se puoi entrare.</p>
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
          <div className="user-bar">
            <span>
              <strong>{user.displayName || 'Studente'}</strong>
              <small>{user.email}</small>
            </span>
            <button className="secondary" onClick={() => void run(() => signOut(auth!))}>
              Esci
            </button>
          </div>

          <section className="panel">
            <span className="eyebrow">Esito</span>
            {result ? (
              <div key={resultKey} className={result.allowed ? 'result ok' : 'result no'}>
                <div className="result-icon" aria-hidden="true">
                  {result.allowed ? 'OK' : '!'}
                </div>
                <h2>{result.allowed ? 'Puoi entrare!' : 'Passare in vicepresidenza'}</h2>
                <p>
                  {result.allowed
                    ? `Ottimo, ${firstName(result.name)} — sei in lista.`
                    : `${firstName(result.name)}, non risulti in lista.`}
                </p>
                <small>{result.email}</small>
              </div>
            ) : (
              <p>Impossibile verificare l’accesso.</p>
            )}
            <button className="ghost" disabled={busy} onClick={verifyAgain}>
              Controlla di nuovo
            </button>
          </section>
        </>
      )}

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <footer className="foot">Scan n Go · account Google scuola</footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
