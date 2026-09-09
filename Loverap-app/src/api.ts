import {Platform} from 'react-native';
import * as Keychain from 'react-native-keychain';

declare const process: {env: {NODE_ENV?: string}};

// Set this to the HTTPS API origin before a production build. No demo fallback.
export const PRODUCTION_API_URL = 'https://api.loveraf.com/api/v1';
export const fixtureMode = process.env.NODE_ENV === 'test';
const base = __DEV__ ? (Platform.OS === 'android' ? 'http://10.0.2.2:3001/api/v1' : 'http://localhost:3001/api/v1') : PRODUCTION_API_URL;
let sessionToken = '';
let expired: (() => void) | undefined;
export function onSessionExpired(handler: () => void) {expired = handler; return () => {expired = undefined;};}
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly fields: Record<string,string> = {}) {super(message);}
}
export async function restoreToken() {
  const saved = await Keychain.getGenericPassword({service:'loveraf.session'});
  sessionToken = saved ? saved.password : '';
  return Boolean(sessionToken);
}
export async function saveToken(token: string) {
  await Keychain.setGenericPassword('session',token,{service:'loveraf.session',accessible:Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
  sessionToken=token;
}
export async function clearToken() {sessionToken='';await Keychain.resetGenericPassword({service:'loveraf.session'});}
export async function api<T>(path: string, method='GET', body?: unknown, headers: Record<string,string> = {}): Promise<T> {
  if(!base) throw new ApiError('The service is not connected yet. Please try again later.',503);
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),15000);
  try {
    const isForm = body instanceof FormData;
    const response=await fetch(`${base}${path}`,{method,headers:{...(isForm?{}:{'Content-Type':'application/json'}),
      ...(sessionToken?{Authorization:`Bearer ${sessionToken}`} : {}),...headers},
      body:body===undefined?undefined:isForm?body:JSON.stringify(body),signal:controller.signal});
    const data=await response.json();
    if(!response.ok) {
      if(response.status===401 && !path.startsWith('/auth/')) {await clearToken();expired?.();}
      throw new ApiError(data.message||'Request failed.',response.status,data.fields);
    }
    return data;
  } catch(error) {
    if(error instanceof ApiError) throw error;
    throw new ApiError('Unable to reach the service. Check your connection and retry.',0);
  } finally {clearTimeout(timer);}
}
export async function uploadImage(uri:string) {
  const form=new FormData();
  form.append('image',{uri,name:'product-image',type:'application/octet-stream'} as unknown as Blob);
  return api<{id:string;uri:string}>('/media','POST',form);
}
