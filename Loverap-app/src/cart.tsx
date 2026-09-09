/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api,fixtureMode} from './api';
import {useAuth} from './auth';
import { Product } from './types';

export type CartLine = Product & {
  lineId: string;
  productId: string;
  qty: number;
  selectedColor?: string;
  selectedSize?: string;
};

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  addItem: (
    product: Product,
    qty: number,
    color?: string,
    size?: string,
  ) => Promise<void>;
  changeQty: (lineId: string, amount: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  hasItem: (id: string) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const {user,ready}=useAuth();
  const currentLines=useRef(lines);
  const generation=useRef(0);
  const queue=useRef<Promise<unknown>>(Promise.resolve());
  const assign=(next:CartLine[])=>{currentLines.current=next;setLines(next);};
  const uuid=()=> 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const n=Math.floor(Math.random()*16);return (c==='x'?n:8+(n%4)).toString(16);
  });
  const serial=(action:()=>Promise<void>)=>{
    const version=generation.current;
    const next=queue.current.then(async()=>{if(version===generation.current)await action();});
    queue.current=next.catch(()=>{});return next;
  };
  useEffect(()=>{
    if(fixtureMode||!ready)return;
    const version=++generation.current;assign([]);
    const run=async()=>{
      const saved=await AsyncStorage.getItem('loveraf.guest-cart');
      const guest:CartLine[]=saved?JSON.parse(saved):[];
      if(user){
        for(const line of guest){
          // Stored key survives timeout/restart, so retrying this merge cannot double-add.
          const key=line.lineId.startsWith('guest:')?line.lineId.slice(6):uuid();
          await api('/me/cart','POST',{productId:line.productId,qty:line.qty,color:line.selectedColor,size:line.selectedSize},{'Idempotency-Key':key});
        }
        await AsyncStorage.removeItem('loveraf.guest-cart');
        const result=await api<CartLine[]>('/me/cart');if(version===generation.current)assign(result);
      }else if(version===generation.current)assign(guest);
    };
    queue.current=run().catch(()=>{});
    const ref=generation;
    return ()=>{if(ref.current===version)ref.current++;};
  },[user,ready]);
  const remoteAdd=async(product:Product,qty:number,color?:string,size?:string)=>{
    const version=generation.current;
    if(user){
      await api('/me/cart','POST',{productId:product.id,qty,color,size},{'Idempotency-Key':uuid()});
      const result=await api<CartLine[]>('/me/cart');if(version===generation.current)assign(result);
    }else{
      const existing=currentLines.current.find(l=>l.productId===product.id&&l.selectedColor===color&&l.selectedSize===size);
      const next=existing?currentLines.current.map(l=>l===existing?{...l,qty:l.qty+qty}:l):[...currentLines.current,{...product,productId:product.id,lineId:`guest:${uuid()}`,qty,selectedColor:color,selectedSize:size}];
      await AsyncStorage.setItem('loveraf.guest-cart',JSON.stringify(next));if(version===generation.current)assign(next);
    }
  };

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount: lines.reduce((total, line) => total + line.qty, 0),
      addItem: async (product, qty, selectedColor, selectedSize) => {
        if(!fixtureMode){await serial(()=>remoteAdd(product,qty,selectedColor,selectedSize));return;}
        setLines(current => {
          const lineId = JSON.stringify([
            product.id, selectedColor ?? null, selectedSize ?? null,
          ]);
          const existing = current.find(line => line.lineId === lineId);
          if (existing) {
            return current.map(line =>
              line.lineId === lineId
                ? {
                    ...line,
                    qty: line.qty + qty,
                  }
                : line,
            );
          }
          return [
            ...current,
            {
              ...product,
              lineId,
              productId: product.id,
              qty,
              selectedColor,
              selectedSize,
            },
          ];
        });
      },
      changeQty: async (lineId, amount) => {
        if(!fixtureMode){await serial(async()=>{
          const line=currentLines.current.find(l=>l.lineId===lineId);if(!line)return;
          const next=currentLines.current.map(l=>l.lineId===lineId?{...l,qty:Math.max(1,l.qty+amount)}:l);
          if(user)await api(`/me/cart/${lineId}`,'PATCH',{qty:Math.max(1,line.qty+amount)});
          else await AsyncStorage.setItem('loveraf.guest-cart',JSON.stringify(next));
          assign(next);
        });return;}
        setLines(current =>
          current.map(line =>
            line.lineId === lineId
              ? { ...line, qty: Math.max(1, line.qty + amount) }
              : line,
          ),
        );
      },
      removeItem: async lineId => {
        if(!fixtureMode){await serial(async()=>{
          const next=currentLines.current.filter(l=>l.lineId!==lineId);
          if(user)await api(`/me/cart/${lineId}`,'DELETE');else await AsyncStorage.setItem('loveraf.guest-cart',JSON.stringify(next));
          assign(next);
        });return;}
        setLines(current => current.filter(line => line.lineId !== lineId));
      },
      hasItem: id => lines.some(line => line.productId === id),
    }),
    [lines,user,remoteAdd],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return value;
}
