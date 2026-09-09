import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {CartProvider, useCart} from '../src/cart';
import {products} from '../src/data';

test('same product supports repeated and different variant cart lines', async () => {
  let cart: ReturnType<typeof useCart> | undefined;
  function Probe() {
    cart = useCart();
    return null;
  }
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <CartProvider><Probe /></CartProvider>,
    );
  });
  await ReactTestRenderer.act(() => {
    cart?.addItem(products[0], 1, 'Red', '36');
    cart?.addItem(products[0], 1, 'Red', '36');
    cart?.addItem(products[0], 1, 'Blue', '36');
    cart?.addItem(products[0], 1, 'Red', '38');
  });
  expect(cart?.lines).toHaveLength(3);
  expect(cart?.lines.find(line => line.selectedSize === '36')?.qty).toBe(2);
  expect(cart?.lines.find(line => line.selectedSize === '38')?.qty).toBe(1);
  expect(cart?.itemCount).toBe(4);

  const otherSize = cart?.lines.find(line => line.selectedSize === '38');
  await ReactTestRenderer.act(async () => {await cart!.changeQty(otherSize!.lineId, 2);});
  expect(cart?.lines.find(line => line.lineId === otherSize?.lineId)?.qty).toBe(3);
  expect(cart?.lines.find(line => line.selectedColor === 'Blue')?.qty).toBe(1);
  expect(cart?.itemCount).toBe(6);

  const blueLine = cart?.lines.find(line => line.selectedColor === 'Blue');
  await ReactTestRenderer.act(async () => {if (blueLine) await cart!.removeItem(blueLine.lineId);});
  expect(cart?.lines).toHaveLength(2);
  expect(cart?.itemCount).toBe(5);
  await ReactTestRenderer.act(() => renderer?.unmount());
});
