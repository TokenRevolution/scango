# Scan n Go
React + TypeScript + Firebase Authentication, Firestore e Cloud Functions.

## Come funziona
1. L’utente accede con Google e vede un QR personale valido 120 secondi.
2. Un operatore abilitato accede sul dispositivo all’ingresso e apre **Controllo ingressi**.
3. La fotocamera legge il QR; il server verifica l’email completa nella lista Firestore.
4. Se il documento esiste e `active` è `true`: **Puoi entrare**. Altrimenti: **Passare dalla vice presidenza**.
Il risultato appare sul dispositivo dell’operatore. Ogni QR è monouso; il nuovo QR invalida il precedente. Il QR contiene un token casuale, non l’email. Nessun risultato positivo è simulato in assenza di Firebase.

## Configurazione
Occorrono Node.js 22 e un progetto Firebase. Cloud Functions richiede un piano che consenta il deployment (Blaze).

1. Nella console Firebase registra un’app Web e attiva Authentication > Google.
2. Aggiungi `localhost` e il dominio definitivo ai domini autorizzati di Authentication.
3. Crea Firestore. La configurazione Web del progetto `marketplace-2a219` è già inserita in `src/firebase.ts`; non occorre creare `.env`. Le variabili `.env` sono facoltative e consentono di cambiare progetto. Analytics non è avviato.
4. Installa e compila:
```bash
npm install
npm --prefix functions install
npm run build
npm --prefix functions run build
```
5. Installa la CLI e seleziona il progetto:
```bash
npm install -g firebase-tools
firebase login
firebase use marketplace-2a219
firebase deploy --only firestore:rules,functions
npm run dev
```
6. Per pubblicare su Firebase Hosting:
```bash
npm run build
firebase deploy --only hosting
```
La fotocamera richiede HTTPS (oppure localhost). Le configurazioni VITE sono pubbliche; non inserire credenziali Admin o service account nel frontend.

## Lista autorizzati
Gestita dalla console Firestore, accessibile solo agli amministratori del progetto.
Collezione: `allowedEmails`. ID documento: **email completa in minuscolo**, ad esempio `mario.rossi@scuola.it`.
Campi:
```json
{"active": true, "name": "Mario Rossi"}
```
`name` è facoltativo. La verifica usa l’email Google, non il nome visualizzato né la sola parte prima di @. Per revocare l’autorizzazione imposta `active: false` o elimina il documento. Gli utenti e gli operatori non possono leggere o modificare direttamente il database.

## Abilitare un operatore
Dopo il primo login Google, copia il suo UID da Authentication. In un ambiente amministrativo fidato con Firebase Admin SDK e credenziali del progetto, assegna il custom claim:
```js
const user = await getAuth().getUser(uid);
await getAuth().setCustomUserClaims(uid, { ...user.customClaims, scanner: true });
```
L’operatore deve uscire e rientrare per aggiornare il token. Per revocare, elimina il claim e revoca i refresh token; un token già emesso può restare valido fino alla scadenza. Non assegnare ruoli dal browser.

## Verifica prima dell’uso
- Account autorizzato: scansione → Puoi entrare.
- Account assente o disattivato: scansione → Passare dalla vice presidenza.
- QR scaduto, riutilizzato o manomesso: errore, nessun accesso.
- Nuovo QR: il precedente viene invalidato.
- Account senza claim scanner: verifica rifiutata dal server.
- Fotocamera negata: incolla il contenuto del QR o riabilita la fotocamera.

## Note operative
Richiesta rete Internet: in caso di errore non viene emessa alcuna autorizzazione. Un QR condiviso può essere presentato da un’altra persona durante i 120 secondi di validità: l’operatore deve verificare l’identità se necessario. Per volumi elevati valutare App Check, limiti di invocazione e pulizia TTL dei documenti `passes` scaduti tramite il campo `expiresAt`. La lista non viene inclusa nella repository. Non è presente un pannello di modifica lista: si usa la console Firebase.

Documentazione: https://firebase.google.com/docs/auth/web/google-signin e https://firebase.google.com/docs/functions/callable
