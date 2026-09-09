'use client';
import {useEffect,useState} from 'react';

async function api(path:string,method='GET',body?:unknown) {
  const r=await fetch(`/api/${path}`,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json();if(!r.ok)throw new Error(data.message||'Request failed');return data;
}
type User={name:string;roles:string[];mfa:boolean;email_verified:boolean};
type RecordRow={id:string;key?:string;name?:string;email?:string;status?:string;reason?:string;version?:number;suspended?:boolean;enabled?:boolean;data?:{title?:string;images?:{uri:string}[]};[key:string]:unknown};
export default function Dashboard() {
  const [user,setUser]=useState<User|null>(null),[login,setLogin]=useState(''),[password,setPassword]=useState('');
  const [challenge,setChallenge]=useState(''),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [tab,setTab]=useState('sellers'),[rows,setRows]=useState<RecordRow[]>([]),[reason,setReason]=useState('');
  const [contentKey,setContentKey]=useState('categories'),[content,setContent]=useState('[]');
  const run=async(action:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'Request failed');}finally{setBusy(false);}};
  useEffect(()=>{api('me').then(setUser).catch(()=>{});},[]);
  useEffect(()=>{setRows([]);if(user?.mfa&&tab!=='content')api(`admin/${tab}`).then(items=>setRows(items.map((item:RecordRow)=>({...item,id:item.id||String(item.key)})))).catch(e=>setError(e.message));},[tab,user]);
  const signIn=()=>run(async()=>{const r=await api('auth/login','POST',{login,password});setPassword('');setUser(r.user);});
  const sendCode=()=>run(async()=>{const r=await api('auth/challenge','POST',{channel:'email',purpose:user?.email_verified?'admin':'verify'});setChallenge(r.challengeId);});
  const verify=()=>run(async()=>{await api('auth/verify','POST',{challengeId:challenge,code});setCode('');setChallenge('');setUser(await api('me'));});
  const moderate=(row:RecordRow,status:string)=>run(async()=>{
    if(reason.trim().length<3)throw new Error('Enter a decision reason first.');
    await api(`admin/${tab}/${row.id}`,'PATCH',{status,reason,...(tab==='products'?{version:row.version}:{})});
    setRows(await api(`admin/${tab}`));setReason('');
  });
  const updateRule=(row:RecordRow)=>run(async()=>{
    await api(`admin/rules/${row.id}`,'PATCH',{version:row.version,data:row.data,enabled:!row.enabled});
    const items=await api('admin/rules');setRows(items.map((item:RecordRow)=>({...item,id:String(item.key)})));
  });
  const roles=user?.roles||[];
  const tabs=['sellers','products','users','reports','audit','content','rules'].filter(t=>roles.includes('super_admin')||(['sellers','products','content'].includes(t)?roles.includes('catalog'):t==='rules'?roles.includes('finance'):['users','reports'].includes(t)&&roles.includes('support')));
  return <main><header><strong>love<span>raf</span> <small>ADMIN</small></strong>{user&&<button onClick={()=>run(async()=>{await api('auth/logout','POST',{});setUser(null);setRows([]);})}>Sign out</button>}</header>
    {error&&<p role="alert" className="error">{error}</p>}
    {!user?<form onSubmit={e=>{e.preventDefault();signIn();}} className="panel login"><h1>Administrator sign in</h1><label>Email or phone<input value={login} onChange={e=>setLogin(e.target.value)} autoComplete="username" required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label><button disabled={busy}>Sign in</button></form>
      :!user.roles.length?<p className="panel">This account has no administrator access.</p>
      :!user.mfa?<section className="panel login"><h1>{user.email_verified?'Verify administrator sign in':'Verify your email'}</h1><p>A verification code will be sent to your account email.</p><button disabled={busy} onClick={sendCode}>Send code</button>{challenge&&<form onSubmit={e=>{e.preventDefault();verify();}}><label>Six-digit code<input inputMode="numeric" pattern="[0-9]{6}" value={code} onChange={e=>setCode(e.target.value)} required/></label><button disabled={busy}>Verify</button></form>}</section>
      :<><nav>{tabs.map(t=><button aria-current={tab===t?'page':undefined} key={t} onClick={()=>{setTab(t);setError('');}}>{t}</button>)}</nav>
      <section className="panel"><h1>{tab}</h1>{tab==='content'?<><label>Content type<select value={contentKey} onChange={e=>setContentKey(e.target.value)}>{['categories','banners','policies','about','faq'].map(k=><option key={k}>{k}</option>)}</select></label><button disabled={busy} onClick={()=>run(async()=>setContent(JSON.stringify((await api(`content/${contentKey}`)).data,null,2)))}>Load</button><label>Content JSON<textarea value={content} onChange={e=>setContent(e.target.value)} rows={15}/></label><button disabled={busy} onClick={()=>run(async()=>{await api(`admin/content/${contentKey}`,'POST',{data:JSON.parse(content)});})}>Save content</button></>
      :<>{['sellers','products','users'].includes(tab)&&<label>Decision reason<input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason for approval, rejection or suspension"/></label>}{rows.length===0?<p>No records found.</p>:<div className="table"><table><thead><tr><th>Record</th><th>Status / details</th><th>Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.name||row.data?.title||row.email||row.id}</strong><small>{row.id}</small>{row.data?.images?.slice(0,1).map(i=><a key={i.uri} href={i.uri} target="_blank" rel="noreferrer">View image</a>)}</td><td>{row.status||String(row.enabled??row.suspended??'')}<details><summary>Details</summary><pre>{JSON.stringify(row,null,2)}</pre></details></td><td>{['sellers','products'].includes(tab)&&<><button disabled={busy} onClick={()=>moderate(row,'approved')}>Approve</button><button disabled={busy} onClick={()=>moderate(row,'rejected')}>Reject</button><button disabled={busy} onClick={()=>moderate(row,tab==='sellers'?'suspended':'archived')}>{tab==='sellers'?'Suspend':'Archive'}</button></>}{tab==='users'&&roles.includes('super_admin')&&<button disabled={busy} onClick={()=>moderate(row,row.suspended?'active':'suspended')}>{row.suspended?'Reactivate':'Suspend'}</button>}{tab==='rules'&&<button disabled={busy} onClick={()=>updateRule(row)}>{row.enabled?'Disable':'Enable'}</button>}</td></tr>)}</tbody></table></div>}</>}
      </section></>}
    <footer>Account and catalog administration · Decisions are recorded in the audit log.</footer>
  </main>;
}
