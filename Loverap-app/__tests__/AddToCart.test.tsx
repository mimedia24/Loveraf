import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {CatalogProvider} from '../src/catalog';
import {CartProvider, useCart} from '../src/cart';
import {ProductDetailsScreen} from '../src/screens/ShopScreens';
import {CartScreen} from '../src/screens/CommerceScreens';
import {Navigation} from '../src/types';
import {products} from '../src/data';

test('adding repeatedly keeps the Add to Cart action available and removes only the selected cart variant', async () => {
  jest.useFakeTimers();
  const navigation: Navigation = {
    push: jest.fn(), replace: jest.fn(), reset: jest.fn(), back: jest.fn(),
  };
  let cart: ReturnType<typeof useCart>;
  function Probe() {
    cart = useCart();
    return null;
  }
  const render = (screen: 'product' | 'cart') => (
    <SafeAreaProvider initialMetrics={{
      frame: {x: 0, y: 0, width: 320, height: 720},
      insets: {top: 24, bottom: 24, left: 0, right: 0},
    }}>
      <CatalogProvider>
        <CartProvider>
          <Probe />
          {screen === 'product'
            ? <ProductDetailsScreen navigation={navigation} params={{productId: products[0].id}} />
            : <CartScreen navigation={navigation} />}
        </CartProvider>
      </CatalogProvider>
    </SafeAreaProvider>
  );
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => { renderer = ReactTestRenderer.create(render('product')); });
  const press = async (label: string) => {
    const button = renderer.root.findAllByProps({accessibilityLabel: label})
      .find(node => typeof node.props.onPress === 'function');
    expect(button).toBeDefined();
    await act(() => button!.props.onPress());
  };
  try {
    await press('Select color Red');
    await press('Select size 36');
    await press('Add to Cart');
    expect(cart!.itemCount).toBe(1);
    expect(renderer!.root.findByProps({testID: 'cart-add-feedback'})).toBeTruthy();
    // A second tap adds another of the same variant without navigating away.
    await press('Add to Cart');
    expect(cart!.itemCount).toBe(2);
    await press('Select size 38');
    await press('Add to Cart');
    expect(cart!.lines).toHaveLength(2);
    expect(cart!.itemCount).toBe(3);
    expect(navigation.push).not.toHaveBeenCalled();
    await act(() => { jest.advanceTimersByTime(2500); });
    expect(renderer!.root.findAllByProps({testID: 'cart-add-feedback'})).toHaveLength(0);
    await act(() => { renderer!.update(render('cart')); });
    await press(`Remove ${products[0].title}, Red · Size 38`);
    expect(cart!.lines).toHaveLength(1);
    expect(cart!.lines[0].selectedSize).toBe('36');
    expect(cart!.itemCount).toBe(2);
  } finally {
    await act(() => renderer!.unmount());
    jest.useRealTimers();
  }
});
