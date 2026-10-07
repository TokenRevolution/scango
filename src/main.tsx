import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { auth, functions, configured } from './firebase';
import './style.css';
type Pass = { token:string; expiresAt:number };
type Result = {allowed:boolean; email:string; name:string};
function Scanner({onScan,onError}:{onScan:(s:string)=>Promise<void>;onError:(s:string)=>void}) {
 const cb=useRef(onScan); cb.current=onScan;
 useEffect(()=>{const scanner=new Html5Qrcode('reader'); let disposed=false; let processing=false;
 const start=scanner.start({facingMode:'environment'},{fps:8,qrbox:{width:240,height:240}},async text=>{if(processing||disposed)return;processing=true;await cb.current(text);},()=>{});
 start.then(()=>{if(disposed) void scanner.stop().catch(()=>{});}).catch(()=>{if(!disposed)onError('Fotocamera non disponibile. Consenti l’accesso alla fotocamera oppure incolla il codice.');});
 return ()=>{disposed=true;void start.then(()=>scanner.isScanning?scanner.stop():undefined).catch(()=>{});};
 },[]);
 return <div id="reader"/>;
}
function App(){
 const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[operator,setOperator]=useState(false);
 const [pass,setPass]=useState<Pass|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[mode,setMode]=useState(false),[result,setResult]=useState<Result|null>(null),[code,setCode]=useState(''),[scanKey,setScanKey]=useState(0),[now,setNow]=useState(Date.now());
 useEffect(()=>{if(!auth){setLoading(false);return;}return onAuthStateChanged(auth,u=>{setUser(u);setPass(null);setOperator(false);setMode(false);setResult(null);setLoading(false);if(u)void u.getIdTokenResult().then(t=>setOperator(t.claims.scanner===true)).catch(()=>setError('Impossibile verificare il ruolo.'));});},[]);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[]);
 async function run(action:()=>Promise<void>){setBusy(true);setError('');try{await action()}catch(e){setError(e instanceof Error?e.message:'Operazione non riuscita. Riprova.')}finally{setBusy(false)}}
 async function generate(){await run(async()=>{if(!functions)return;const r=await httpsCallable<undefined,Pass>(functions,'createPass')();setPass(r.data);});}
 useEffect(()=>{if(user)void generate()},[user]);
 async function verify(raw:string){await run(async()=>{if(!functions)return;const token=raw.trim();if(!/^SNG1:[a-f0-9]{64}$/.test(token))throw new Error('QR non valido per Scan n Go.');const r=await httpsCallable<{token:string},Result>(functions,'verifyPass')({token});setResult(r.data);});}
 const seconds=pass?Math.max(0,Math.ceil((pass.expiresAt-now)/1000)):0;
 return <main><header><span className="logo">▦</span><div><h1>Scan n Go</h1><p>Il tuo pass per entrare a scuola</p></div></header>
 {!configured?<section><h2>Configurazione necessaria</h2><p>Inserisci i dati Firebase nel file .env seguendo il README.</p></section>:loading?<section>Caricamento…</section>:!user?<section><span className="tag">ACCESSO SCUOLA</span><h2>Accedi. Mostra il QR. Entra.</h2><p>Usa il tuo account Google per ottenere il codice personale da mostrare all’ingresso.</p><button disabled={busy} onClick={()=>void run(async()=>{await signInWithPopup(auth!,new GoogleAuthProvider())})}>Accedi con Google</button></section>:<>
 <nav><span>{user.displayName}<small>{user.email}</small></span><button className="secondary" onClick={()=>void run(()=>signOut(auth!))}>Esci</button></nav>
 {operator&&<div className="tabs"><button className={!mode?'active':'secondary'} onClick={()=>{setMode(false);setResult(null)}}>Il mio QR</button><button className={mode?'active':'secondary'} onClick={()=>setMode(true)}>Controllo ingressi</button></div>}
 {!mode?<section><span className="tag">PASS PERSONALE</span><h2>Mostra questo QR all’ingresso</h2>{pass&&seconds>0?<><div className="qr"><QRCodeSVG value={pass.token} size={240} marginSize={3}/></div><p>Valido per {seconds} secondi · utilizzabile una sola volta</p></>:<p>{busy?'Creazione del QR…':'Il codice è scaduto o non è ancora disponibile.'}</p>}<button disabled={busy} onClick={()=>void generate()}>Genera nuovo QR</button></section>:<section><span className="tag">CONTROLLO INGRESSI</span><h2>Scansiona il pass</h2>{result?<div className={result.allowed?'result ok':'result no'}><h2>{result.allowed?'Puoi entrare':'Passare dalla vice presidenza'}</h2><p>{result.name}</p><small>{result.email}</small></div>:<Scanner key={scanKey} onScan={verify} onError={setError}/>}<form onSubmit={e=>{e.preventDefault();void verify(code)}}><label htmlFor="code">Codice QR (inserimento manuale)</label><input id="code" value={code} onChange={e=>setCode(e.target.value)} placeholder="SNG1:…"/><button disabled={busy||!code.trim()}>Verifica codice</button></form><button className="secondary" disabled={busy} onClick={()=>{setResult(null);setCode('');setError('');setScanKey(k=>k+1)}}>Nuova scansione</button></section>}
 </>}{error&&<div className="error" role="alert">{error}{mode&&!result&&<p>Premi “Nuova scansione” per riprovare.</p>}</div>}<footer>Scan n Go · Accesso con account Google</footer></main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
