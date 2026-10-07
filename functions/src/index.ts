import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { randomBytes, createHash } from 'node:crypto';
initializeApp();
const db=getFirestore();
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export const createPass=onCall({region:'europe-west1'},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','Accedi con Google.');
 if(request.auth.token.firebase?.sign_in_provider!=='google.com')throw new HttpsError('permission-denied','È richiesto un account Google.');
 const user=await getAuth().getUser(request.auth.uid);
 if(!user.email||!user.emailVerified)throw new HttpsError('permission-denied','Email non verificata.');
 const token='SNG1:'+randomBytes(32).toString('hex');const expiresAt=Date.now()+120000;
 // Un unico pass attivo per utente: generandone uno nuovo si invalida il precedente.
 await db.runTransaction(async tx=>{const ref=db.doc('activePasses/'+user.uid);const old=await tx.get(ref);if(old.exists)tx.delete(db.doc('passes/'+old.data()!.id));tx.set(db.doc('passes/'+hash(token)),{uid:user.uid,email:user.email!.trim().toLowerCase(),name:user.displayName||user.email,expiresAt:Timestamp.fromMillis(expiresAt)});tx.set(ref,{id:hash(token)});});
 return {token,expiresAt};
});
export const verifyPass=onCall({region:'europe-west1'},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','Accedi come operatore.');
 if(request.auth.token.scanner!==true)throw new HttpsError('permission-denied','Operatore non abilitato.');
 const token=request.data?.token;if(typeof token!=='string'||!/^SNG1:[a-f0-9]{64}$/.test(token))throw new HttpsError('invalid-argument','QR non valido.');
 return db.runTransaction(async tx=>{
 const ref=db.doc('passes/'+hash(token));const snap=await tx.get(ref);
 if(!snap.exists)throw new HttpsError('not-found','QR non valido o già utilizzato.');
 const pass=snap.data()!;if(pass.expiresAt.toMillis()<=Date.now())throw new HttpsError('deadline-exceeded','QR scaduto. Genera un nuovo QR.');
 const entry=await tx.get(db.doc('allowedEmails/'+pass.email));
 const allowed=entry.exists&&entry.data()?.active===true;
 tx.delete(ref);tx.delete(db.doc('activePasses/'+pass.uid));
 return {allowed,email:pass.email,name:pass.name};
 });
});
