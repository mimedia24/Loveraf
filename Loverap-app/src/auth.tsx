import React,{createContext,useContext,useEffect,useState} from 'react';
import {api,clearToken,fixtureMode,onSessionExpired,restoreToken,saveToken} from './api';

export type User={id:string;name:string;email:string;phone:string;email_verified:boolean;phone_verified:boolean;roles:string[];preferences:{push:boolean;offers:boolean;language:string}};
type Auth={user:User|null;ready:boolean;login:(login:string,password:string)=>Promise<User>;register:(input:{name:string;phone:string;email:string;password:string})=>Promise<User>;logout:()=>Promise<void>;refresh:()=>Promise<void>};
const empty:Auth={user:null,ready:fixtureMode,login:async()=>{throw new Error('Sign in unavailable');},register:async()=>{throw new Error('Registration unavailable');},logout:async()=>{},refresh:async()=>{}};
const Context=createContext<Auth>(empty);
export function AuthProvider({children}:{children:React.ReactNode}) {
  const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(fixtureMode);
  useEffect(()=>{
    if(fixtureMode)return;
    let mounted=true;
    restoreToken().then(async exists=>{if(exists){const value=await api<User>('/me');if(mounted)setUser(value);}})
      .catch(()=>{}).finally(()=>{if(mounted)setReady(true);});
    const unsubscribe=onSessionExpired(()=>setUser(null));
    return ()=>{mounted=false;unsubscribe();};
  },[]);
  const accept=async(path:string,body:unknown)=>{
    const response=await api<{token:string;user:User}>(path,'POST',body);
    await saveToken(response.token);setUser(response.user);return response.user;
  };
  return <Context.Provider value={{user,ready,
    login:(login,password)=>accept('/auth/login',{login,password}),register:input=>accept('/auth/register',input),
    logout:async()=>{try{await api('/auth/logout','POST',{});}finally{await clearToken();setUser(null);}},
    refresh:async()=>setUser(await api<User>('/me')),
  }}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
