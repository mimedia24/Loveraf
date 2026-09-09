import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {CartProvider} from '../src/cart';
import {DiscountOctagon} from '../src/components/DiscountOctagon';
import {ProductSlider} from '../src/components/ProductSlider';
import {products} from '../src/data';
import {Navigation} from '../src/types';

const navigation: Navigation = {
  push: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  back: jest.fn(),
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('product slider exposes four logical pages with four products per page', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <CartProvider>
        <ProductSlider
          products={products}
          navigation={navigation}
          productsPerSlide={4}
          slideCount={4}
          autoplay={false}
        />
      </CartProvider>,
    );
  });
  expect(renderer?.root.findByProps({testID: 'home-product-slider'})).toBeTruthy();
  expect(
    renderer?.root.findByProps({
      accessibilityLabel: '4 slides, 4 products each',
    }),
  ).toBeTruthy();
  const renderedProductTitles = renderer?.root
    .findAllByType(Text)
    .filter(
      node =>
        typeof node.props.children === 'string' &&
        products.some(product => product.title === node.props.children),
    );
  expect(renderedProductTitles).toHaveLength(20); // 16 logical slots + first-page loop clone
  expect(renderer?.root.findAllByProps({children: 'LIMITED DEALS'})).toHaveLength(0);
  expect(renderer?.root.findAllByProps({children: '21% OFF'}).length).toBeGreaterThan(0);
  await ReactTestRenderer.act(() => renderer?.unmount());
});

test('discount octagon rotates valid API messages and ignores missing data', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <DiscountOctagon discounts={['20% OFF', '40% OFF']} animationDuration={1500} />,
    );
  });
  expect(renderer?.root.findByProps({testID: 'discount-octagon'})).toBeTruthy();
  expect(renderer?.root.findByProps({children: '20% OFF'})).toBeTruthy();
  await ReactTestRenderer.act(() => renderer?.unmount());

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<DiscountOctagon discounts={['', '   ']} />);
  });
  expect(renderer?.toJSON()).toBeNull();
  await ReactTestRenderer.act(() => renderer?.unmount());
});
