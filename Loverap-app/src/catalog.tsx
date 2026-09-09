/* eslint-disable react-hooks/exhaustive-deps */
import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {api, fixtureMode, uploadImage} from './api';
import {useAuth} from './auth';
import {products as seedProducts} from './data';
import {Product, ProductImage, ProductVariant} from './types';

const demoVariants: ProductVariant[] = [
  {name: 'Red', swatch: '#F41854', imageIds: []},
  {name: 'Blue', swatch: '#2E6FF2', imageIds: []},
  {name: 'Black', swatch: '#081426', imageIds: []},
  {name: 'White', swatch: '#F7F7F7', imageIds: []},
];

function enrichProduct(product: Product): Product {
  if (product.images?.length && product.variants?.length) {
    return product;
  }
  const images: ProductImage[] = demoVariants.map((variant, index) => ({
    id: `${product.id}-image-${index}`,
    art: product.art,
    color: index === 0 ? product.color : `${variant.swatch}24`,
    variantName: variant.name,
  }));
  return {
    ...product,
    description:
      product.description ||
      'Premium quality with refined finishing, dependable performance and official Loveraf buyer protection.',
    category: product.category || 'For You',
    sku: product.sku || `LRF-${product.id.toUpperCase()}`,
    stock: product.stock ?? 60,
    sizes: product.sizes || ['36', '38', '40', '42'],
    images,
    variants: demoVariants.map((variant, index) => ({
      ...variant,
      imageIds: [images[index].id],
    })),
    returnDays: product.returnDays ?? 3,
    exchangeDays: product.exchangeDays ?? 3,
    deliveryMinDays: product.deliveryMinDays ?? 2,
    deliveryMaxDays: product.deliveryMaxDays ?? 3,
    codAvailable: product.codAvailable ?? true,
  };
}

type CatalogContextValue = {
  products: Product[];
  publishProduct: (product: Product, sellerId?: string) => Promise<void>;
  error: string;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
  sellerProducts: Product[];
  loadSellerProducts: (sellerId: string) => Promise<void>;
  findProduct: (id?: unknown) => Product;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({children}: {children: React.ReactNode}) {
  const [products, setProducts] = useState<Product[]>(() =>
    fixtureMode ? seedProducts.map(enrichProduct) : [],
  );
  const {user} = useAuth();
  const [error,setError] = useState('');
  const [sellerProducts,setSellerProducts] = useState<Product[]>([]);
  const [nextOffset,setNextOffset] = useState<number|null>(null);
  const reload = async () => {
    if (fixtureMode) return;
    try {const result = await api<{items:Product[];nextOffset:number|null}>('/products');
      setProducts(result.items);setNextOffset(result.nextOffset);setError('');
    } catch(e) {setError(e instanceof Error ? e.message : 'Products unavailable');}
  };
  const loadMore = async () => {
    if (fixtureMode || nextOffset===null) return;
    const result=await api<{items:Product[];nextOffset:number|null}>(`/products?offset=${nextOffset}`);
    setProducts(current=>[...current,...result.items.filter(p=>!current.some(c=>c.id===p.id))]);
    setNextOffset(result.nextOffset);
  };
  const loadSellerProducts=async(sellerId:string)=>{
    if(!fixtureMode)setSellerProducts(await api<Product[]>(`/me/sellers/${sellerId}/products`));
  };
  useEffect(()=>{reload();},[]);
  useEffect(()=>{setSellerProducts([]);},[user?.id]);
  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      error,reload,loadMore,sellerProducts,loadSellerProducts,
      publishProduct: async (product,sellerId) => {
        if (fixtureMode) {setProducts(current=>[enrichProduct(product),...current]);return;}
        if(!user || !sellerId) throw new Error('Sign in and select your seller account.');
        const images=await Promise.all((product.images||[]).map(async image=>({
          oldId:image.id,...await uploadImage(image.uri!),
        })));
        const {title,description,category,sku,price,oldPrice,stock,sizes,returnDays,exchangeDays,deliveryMinDays,deliveryMaxDays,codAvailable}=product;
        await api(`/me/sellers/${sellerId}/products`,'POST',{
          title,description,category,sku,price,oldPrice,stock,sizes,returnDays,exchangeDays,deliveryMinDays,deliveryMaxDays,codAvailable,
          images:images.map(({id,uri})=>({id,uri})),
          variants:product.variants?.map(v=>({...v,imageIds:v.imageIds.map(key=>images.find(i=>i.oldId===key)!.id)})),
        });
        await loadSellerProducts(sellerId);
      },
      findProduct: id =>
        products.find(product => product.id === id) || products[0],
    }),
    [products,error,nextOffset,sellerProducts,user],
  );
  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) {
    throw new Error('useCatalog must be used inside CatalogProvider');
  }
  return value;
}
