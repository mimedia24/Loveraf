import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {CatalogProvider, useCatalog} from '../src/catalog';
import {promisedDeliveryText} from '../src/screens/ShopScreens';
import {Product} from '../src/types';

test('catalog enriches demo products with galleries and variants', async () => {
  let catalog: ReturnType<typeof useCatalog> | undefined;
  function Probe() {
    catalog = useCatalog();
    return null;
  }
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <CatalogProvider><Probe /></CatalogProvider>,
    );
  });
  expect(catalog?.products[0].images).toHaveLength(4);
  expect(catalog?.products[0].variants?.[0].imageIds).toHaveLength(1);
  await ReactTestRenderer.act(() => renderer?.unmount());
});

test('published seller product becomes the first buyer catalog item', async () => {
  let catalog: ReturnType<typeof useCatalog> | undefined;
  function Probe() {
    catalog = useCatalog();
    return null;
  }
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <CatalogProvider><Probe /></CatalogProvider>,
    );
  });
  const product: Product = {
    id: 'seller-test', title: 'Seller Watch', price: 1200, rating: 5,
    sold: '0', art: 'watch', color: '#EEE', sellerCreated: true,
    images: [{id: 'photo-1', uri: 'file:///photo.jpg'}],
    variants: [{name: 'Red', swatch: '#FF0000', imageIds: ['photo-1']}],
  };
  await ReactTestRenderer.act(async () => {await catalog!.publishProduct(product);});
  expect(catalog?.products[0].id).toBe('seller-test');
  expect(catalog?.findProduct('seller-test').title).toBe('Seller Watch');
  await ReactTestRenderer.act(() => renderer?.unmount());
});

test('promised delivery uses the configured day range', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 8, 4, 12));
  expect(promisedDeliveryText(2, 3)).toBe('6–7 September');
  jest.useRealTimers();
});
