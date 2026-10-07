# Scan n Go
React + TypeScript + Firebase Authentication (login Google).

## Come funziona
1. L’utente accede con Google (account scuola).
2. L’email viene confrontata con la lista in `emails.md`.
3. Se è presente: **Puoi entrare**. Altrimenti: **Passare in vicepresidenza**.

## Lista email
Modifica il file `emails.md` nella root del progetto. Una email per riga (anche come elenco markdown):

```md
# Email autorizzate

- simone.dibiasi@istitutoboselli.edu.it
- giuseppe.iaria@istitutoboselli.edu.it
```

Dopo ogni modifica a `emails.md` riesegui `npm run build` (e il deploy hosting, se usi Firebase Hosting).

## Configurazione
Occorrono Node.js e un progetto Firebase con Authentication > Google attivo.

1. Nella console Firebase registra un’app Web e attiva Authentication > Google.
2. Aggiungi `localhost` e il dominio definitivo ai domini autorizzati.
3. La configurazione Web del progetto `marketplace-2a219` è già in `src/firebase.ts`. Non servono Firestore né Cloud Functions.
4. Installa e avvia:
```bash
npm install
npm run dev
```
5. Per pubblicare su Firebase Hosting:
```bash
npm run build
firebase deploy --only hosting
```

Documentazione: https://firebase.google.com/docs/auth/web/google-signin
