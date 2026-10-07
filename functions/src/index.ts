import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();

/** Controlla se l'email dell'utente loggato è nella lista autorizzati. */
export const checkAccess = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Accedi con Google.');
  if (request.auth.token.firebase?.sign_in_provider !== 'google.com') {
    throw new HttpsError('permission-denied', 'È richiesto un account Google.');
  }

  const user = await getAuth().getUser(request.auth.uid);
  if (!user.email || !user.emailVerified) {
    throw new HttpsError('permission-denied', 'Email non verificata.');
  }

  const email = user.email.trim().toLowerCase();
  const entry = await db.doc('allowedEmails/' + email).get();
  const allowed = entry.exists && entry.data()?.active === true;
  const name = (entry.exists && entry.data()?.name) || user.displayName || email;

  return { allowed, email, name };
});
