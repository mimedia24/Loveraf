import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {money} from '../data';
import {colors} from '../theme';
import {Navigation, Product} from '../types';
import {Icon} from './Icon';
import {ProductMedia} from './UI';
import {Text} from './Typography';

export type ProductSliderProps = {
  products: Product[];
  navigation: Navigation;
  productsPerSlide?: number;
  slideCount?: number;
  autoplayInterval?: number;
  autoplay?: boolean;
  loop?: boolean;
};

export function ProductSlider({
  products,
  navigation,
  productsPerSlide = 4,
  slideCount = 4,
  autoplayInterval = 3500,
  autoplay = true,
  loop = true,
}: ProductSliderProps) {
  const {width: screenWidth} = useWindowDimensions();
  const [pageWidth, setPageWidth] = useState(Math.max(280, screenWidth - 32));
  const activePageRef = useRef(0);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const pages = useMemo(() => {
    if (!products.length) return [];
    return Array.from({length: slideCount}, (_page, pageIndex) =>
      Array.from(
        {length: productsPerSlide},
        (_slot, productIndex) =>
          products[(pageIndex * productsPerSlide + productIndex) % products.length],
      ),
    );
  }, [products, productsPerSlide, slideCount]);
  const renderedPages = loop && pages.length > 1 ? [...pages, pages[0]] : pages;

  useEffect(() => {
    if (!autoplay || pages.length < 2) return;
    const timer = setInterval(() => {
      const next = activePageRef.current + 1;
      scrollRef.current?.scrollTo({x: next * pageWidth, animated: true});
    }, autoplayInterval);
    return () => clearInterval(timer);
  }, [autoplay, autoplayInterval, pageWidth, pages.length]);

  if (!pages.length) return null;

  const updatePage = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const rawPage = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (loop && rawPage === pages.length) {
      scrollRef.current?.scrollTo({x: 0, animated: false});
      activePageRef.current = 0;
      return;
    }
    const next = Math.min(rawPage, pages.length - 1);
    activePageRef.current = next;
  };
  const tileWidth = (pageWidth - 18) / productsPerSlide;

  return (
    <View
      testID="home-product-slider"
      accessibilityLabel={`${pages.length} slides, ${productsPerSlide} products each`}
      onLayout={event => setPageWidth(event.nativeEvent.layout.width)}
      style={styles.shell}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={updatePage}
        scrollEventThrottle={16}
      >
        {renderedPages.map((page, pageIndex) => (
          <View
            key={`slider-page-${pageIndex}`}
            testID={`product-slider-page-${pageIndex}`}
            style={[styles.page, {width: pageWidth}]}
          >
            {page.map((product, productIndex) => {
              const discount = product.oldPrice
                ? `${Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF`
                : product.badge?.includes('%')
                  ? product.badge
                  : '';
              return (
                <Pressable
                  key={`${pageIndex}-${productIndex}-${product.id}`}
                  onPress={() => navigation.push('ProductDetails', {productId: product.id})}
                  style={[styles.product, {width: tileWidth}]}
                >
                  <View style={[styles.art, {backgroundColor: product.color}]}>
                    {Boolean(discount) && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{discount}</Text>
                      </View>
                    )}
                    <ProductMedia image={product.images?.[0]} fallbackArt={product.art} size={65} />
                  </View>
                  <Text numberOfLines={1} style={styles.productName}>{product.title}</Text>
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={9} color={colors.warning} />
                    <Text numberOfLines={1} style={styles.rating}>{product.rating} · {product.sold}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.price}>{money(product.price)}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {backgroundColor: 'transparent', overflow: 'hidden', marginBottom: 18},
  page: {flexDirection: 'row', gap: 6, paddingVertical: 5},
  product: {
    minWidth: 0,
    minHeight: 132,
    borderRadius: 14,
    backgroundColor: colors.white,
    padding: 5,
    shadowColor: '#0B1424',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  art: {height: 76, borderRadius: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  discountBadge: {position: 'absolute', zIndex: 3, left: 3, top: 3, borderRadius: 7, backgroundColor: colors.accent, paddingHorizontal: 4, paddingVertical: 3},
  discountText: {fontSize: 6, color: colors.white, fontWeight: '900'},
  productName: {fontSize: 7.8, lineHeight: 11, color: colors.text, fontWeight: '800', marginTop: 5},
  ratingRow: {flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2},
  rating: {fontSize: 6.7, color: colors.textSoft, flex: 1},
  price: {fontSize: 8.5, color: colors.accent, fontWeight: '900', marginTop: 2},
});
