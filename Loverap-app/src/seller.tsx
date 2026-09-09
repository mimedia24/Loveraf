import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {api,fixtureMode} from './api';
import {useAuth} from './auth';

export type SellerIdentity = {
  status?: string;
  id: string;
  name: string;
  handle: string;
  category: string;
};

type SellerContextValue = {
  identities: SellerIdentity[];
  activeIdentity: 'personal' | string;
  activeSeller?: SellerIdentity;
  createSeller: (input: Omit<SellerIdentity, 'id'>, password?: string) => Promise<SellerIdentity>;
  loginSeller: (login: string, password?: string) => Promise<SellerIdentity>;
  switchIdentity: (id: 'personal' | string) => void;
};

const SellerContext = createContext<SellerContextValue | null>(null);

export function SellerProvider({ children }: { children: React.ReactNode }) {
  const [identities, setIdentities] = useState<SellerIdentity[]>([]);
  const [activeIdentity, setActiveIdentity] = useState<'personal' | string>(
    'personal',
  );

  const {user}=useAuth();
  useEffect(()=>{
    setIdentities([]);setActiveIdentity('personal');
    if(!fixtureMode && user) {
      let current=true;
      api<SellerIdentity[]>('/me/sellers').then(items=>{if(current)setIdentities(items);}).catch(()=>{});
      return ()=>{current=false;};
    }
  },[user]);
  const value = useMemo<SellerContextValue>(() => {
    const addOrSelect = (identity: SellerIdentity) => {
      setIdentities(current => {
        const exists = current.some(item => item.id === identity.id);
        return exists ? current : [...current, identity];
      });
      setActiveIdentity(identity.id);
      return identity;
    };

    return {
      identities,
      activeIdentity,
      activeSeller: identities.find(item => item.id === activeIdentity),
      createSeller: async (input,password) => {
        if(fixtureMode)return addOrSelect({...input,id:`seller-${Date.now()}`});
        await api('/auth/reauthenticate','POST',{password});
        return addOrSelect(await api<SellerIdentity>('/me/sellers','POST',input));
      },
      loginSeller: async (login,password) => {
        if(!fixtureMode) await api('/auth/reauthenticate','POST',{password});
        const normalized = login.trim().toLowerCase();
        const existing = identities.find(
          item =>
            item.handle.toLowerCase() === normalized ||
            item.handle.slice(1).toLowerCase() === normalized,
        );
        if(!fixtureMode && !existing)throw new Error('No seller account linked to your profile matches this handle.');
        return addOrSelect(
          existing || {
            id: `seller-login-${normalized || Date.now()}`,
            name: 'Loveraf Seller Store',
            handle: normalized.startsWith('@')
              ? normalized
              : `@${normalized || 'loverafseller'}`,
            category: 'Online shop',
          },
        );
      },
      switchIdentity: id => {if(id==='personal'||identities.some(item=>item.id===id))setActiveIdentity(id);},
    };
  }, [activeIdentity, identities]);

  return (
    <SellerContext.Provider value={value}>{children}</SellerContext.Provider>
  );
}

export function useSeller() {
  const value = useContext(SellerContext);
  if (!value) {
    throw new Error('useSeller must be used inside SellerProvider');
  }
  return value;
}
