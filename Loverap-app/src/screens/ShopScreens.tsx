/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { categories, money, products } from '../data';
import {Text, TextInput} from '../components/Typography';
import { Icon } from '../components/Icon';
import { BrandLogo } from '../components/BrandLogo';
import { ProductArt } from '../components/ProductArt';
import {ProductSlider} from '../components/ProductSlider';
import {DiscountOctagon} from '../components/DiscountOctagon';
import { useCart } from '../cart';
import { useCatalog } from '../catalog';
import {
  BottomNav,
  Header,
  PrimaryButton,
  ProductCard,
  ProductMedia,
  Screen,
  SearchBar,
  SectionHeader,
  StatusPill,
} from '../components/UI';
import { chrome, colors, radius, shadow } from '../theme';
import { Product, ScreenProps } from '../types';
import {fixtureMode} from '../api';

const homeTabs = ['For You', 'Men', 'Women', 'Kids', 'Baby'];
const demoBanners = [
  {
    id: 'b1',
    kicker: 'NEW SEASON',
    title: 'Fresh style,\nevery day.',
    sub: 'Curated fashion · Easy returns',
    art: 'dress' as const,
    color: '#FFE4EC',
  },
  {
    id: 'b2',
    kicker: 'TECH WEEK',
    title: 'Smart picks.\nBetter prices.',
    sub: 'Official gadgets · Buyer protected',
    art: 'headphones' as const,
    color: '#E5ECFF',
  },
  {
    id: 'b3',
    kicker: 'HOME EDIT',
    title: 'Comfort made\nbeautiful.',
    sub: 'Modern essentials · Fast delivery',
    art: 'chair' as const,
    color: '#FFF0DA',
  },
];
const homeProductIds: Record<string, string[]> = {
  'For You': products.map(product => product.id),
  Men: ['p2', 'p3', 'p7', 'p1'],
  Women: ['p5', 'p8', 'p3', 'p7'],
  Kids: ['p7', 'p2', 'p3', 'p1'],
  Baby: ['p8', 'p4', 'p1', 'p6'],
};

function HomeCategoryTabs({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (tab: string) => void;
}) {
  return (
    <View style={s.homeTabs}>
      {homeTabs.map(tab => (
        <Pressable
          key={tab}
          onPress={() => onSelect(tab)}
          style={[s.homeTab, active === tab && s.homeTabActive]}
        >
          <Text style={[s.homeTabText, active === tab && s.homeTabTextActive]}>
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const HOME_PRODUCT_SLIDER_CONFIG = {
  rowsBetweenSliders: 5,
  productsPerGridRow: 2,
  productsPerSlide: 4,
  slideCount: 4,
  autoplayInterval: 3500,
};

export function HomeScreen({ navigation }: ScreenProps) {
  const {products: catalogProducts} = useCatalog();
  const [activeCategory, setActiveCategory] = useState('For You');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerWidth, setBannerWidth] = useState(0);
  const [stickySearchVisible, setStickySearchVisible] = useState(false);
  const [stickyTabsVisible, setStickyTabsVisible] = useState(false);
  const [categoryAnchorY, setCategoryAnchorY] = useState(0);
  const bannerRef = useRef<any>(null);
  const visibleProducts = useMemo(() => {
    if (activeCategory === 'For You') {
      return Array.from({length: 3}, () => catalogProducts).flat();
    }
    return catalogProducts.filter(
      product =>
        homeProductIds[activeCategory].includes(product.id) ||
        product.category?.toLowerCase().includes(activeCategory.toLowerCase()),
    );
  }, [activeCategory, catalogProducts]);
  const homeDiscounts = useMemo(
    () =>
      Array.from(
        new Set(
          catalogProducts
            .filter(product => product.oldPrice && product.oldPrice > product.price)
            .map(product =>
              `${Math.round(((product.oldPrice! - product.price) / product.oldPrice!) * 100)}% OFF`,
            ),
        ),
      ),
    [catalogProducts],
  );
  const homeSliderProducts = useMemo(() => {
    const discounted = catalogProducts.filter(
      product => product.oldPrice && product.oldPrice > product.price,
    );
    return discounted.length ? discounted : catalogProducts;
  }, [catalogProducts]);
  const productsBeforeSlider =
    HOME_PRODUCT_SLIDER_CONFIG.rowsBetweenSliders *
    HOME_PRODUCT_SLIDER_CONFIG.productsPerGridRow;
  useEffect(() => {
    if (!bannerWidth) {
      return;
    }
    const timer = setInterval(
      () => setBannerIndex(current => (current + 1) % demoBanners.length),
      3500,
    );
    return () => clearInterval(timer);
  }, [bannerWidth]);
  useEffect(() => {
    if (bannerWidth) {
      bannerRef.current?.scrollTo({
        x: bannerIndex * bannerWidth,
        animated: true,
      });
    }
  }, [bannerIndex, bannerWidth]);
  return (
    <Screen scroll={false}>
      <View style={s.homeRoot}>
        <ScrollView
          onScroll={event => {
            const offsetY = event.nativeEvent.contentOffset.y;
            setStickySearchVisible(offsetY > 72);
            setStickyTabsVisible(
              categoryAnchorY > 0 && offsetY >= categoryAnchorY - chrome.headerHeight,
            );
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.homeScroll}
        >
          <Header
            logo
            right={
              <View style={s.headerActions}>
                <Pressable
                  onPress={() => navigation.push('Messages')}
                  style={s.darkIcon}
                >
                  <Icon name="chat" color={colors.white} size={19} />
                </Pressable>
                <Pressable
                  onPress={() => navigation.push('Notifications')}
                  style={s.darkIcon}
                >
                  <Icon name="bell" color={colors.white} size={20} />
                  <View style={s.notifDot} />
                </Pressable>
              </View>
            }
          />
          <View style={s.heroShell}>
            <SearchBar compact onPress={() => navigation.push('Catalog')} />
            <DiscountOctagon discounts={homeDiscounts} />
            <View
              onLayout={event => setBannerWidth(event.nativeEvent.layout.width)}
              style={s.bannerViewport}
            >
              <ScrollView
                ref={bannerRef}
                horizontal
                pagingEnabled
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
              >
                {demoBanners.map(banner => (
                  <Pressable
                    key={banner.id}
                    onPress={() => navigation.push('Catalog')}
                    style={[
                      s.demoBanner,
                      {
                        width: bannerWidth || 340,
                        backgroundColor: banner.color,
                      },
                    ]}
                  >
                    <View style={s.demoBannerText}>
                      <Text style={s.demoBannerKicker}>{banner.kicker}</Text>
                      <Text style={s.demoBannerTitle}>{banner.title}</Text>
                      <Text style={s.demoBannerSub}>{banner.sub}</Text>
                    </View>
                    <View style={s.demoBannerArt}>
                      <ProductArt type={banner.art} size={118} />
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={s.bannerDots}>
                {demoBanners.map((banner, index) => (
                  <View
                    key={banner.id}
                    style={[
                      s.bannerDot,
                      bannerIndex === index && s.bannerDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>
            <Pressable
              onPress={() => navigation.push('Wallet')}
              style={s.balanceStrip}
            >
              <View style={s.balanceIcon}>
                <Icon name="wallet" color={colors.accent} />
              </View>
              <View>
                <Text style={s.balanceLabel}>Your rewards</Text>
                <Text style={s.balanceValue}>৳200 Promo · ৳550 Earnings</Text>
              </View>
              <View style={s.balanceGrow} />
              <Icon name="chevron" color={colors.white} />
            </Pressable>
          </View>
          <View style={s.homeBody}>
            <SectionHeader
              title="Top categories"
              action="See all"
              onPress={() => navigation.push('Categories')}
            />
            <View style={s.categoryGrid}>
              {categories.map(item => (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    navigation.push('Catalog', { category: item.name })
                  }
                  style={s.categoryTile}
                >
                  <View
                    style={[s.categoryArt, { backgroundColor: item.color }]}
                  >
                    <ProductArt type={item.art} size={55} />
                  </View>
                  <Text numberOfLines={2} style={s.categoryName}>
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={s.flashBanner}>
              <View>
                <Text style={s.flashKicker}>FLASH DROP</Text>
                <Text style={s.flashTitle}>Up to 35% off</Text>
                <Text style={s.flashTimer}>Ends in 04 : 28 : 16</Text>
              </View>
              <Pressable
                onPress={() => navigation.push('FlashSale')}
                style={s.flashArrow}
              >
                <Icon name="chevron" color={colors.white} />
              </Pressable>
            </View>
          </View>
          <View
            onLayout={event => setCategoryAnchorY(event.nativeEvent.layout.y)}
            style={s.categoryAnchor}
          >
            <HomeCategoryTabs
              active={activeCategory}
              onSelect={setActiveCategory}
            />
          </View>
          <View style={s.homeBody}>
            {Array.from({length: Math.ceil(visibleProducts.length / productsBeforeSlider)}).map(
              (_, groupIndex) => {
                const group = visibleProducts.slice(
                  groupIndex * productsBeforeSlider,
                  groupIndex * productsBeforeSlider + productsBeforeSlider,
                );
                return (
                  <React.Fragment key={`feed-${activeCategory}-${groupIndex}`}>
                    <View style={s.productGrid}>
                      {group.map((product, index) => (
                        <ProductCard
                          key={`${groupIndex}-${index}-${product.id}`}
                          product={product}
                          navigation={navigation}
                        />
                      ))}
                    </View>
                    {activeCategory === 'For You' &&
                      group.length === productsBeforeSlider && (
                      <ProductSlider
                        products={homeSliderProducts}
                        navigation={navigation}
                        productsPerSlide={HOME_PRODUCT_SLIDER_CONFIG.productsPerSlide}
                        slideCount={HOME_PRODUCT_SLIDER_CONFIG.slideCount}
                        autoplayInterval={HOME_PRODUCT_SLIDER_CONFIG.autoplayInterval}
                      />
                    )}
                  </React.Fragment>
                );
              },
            )}
            <SectionHeader title="Discover more" />
            <View style={s.discoverRow}>
              <Pressable
                onPress={() => navigation.push('Store')}
                style={[s.discoverCard, { backgroundColor: '#E9F0FF' }]}
              >
                <Icon name="store" color={colors.info} />
                <Text style={s.discoverTitle}>Official Shop</Text>
                <Text style={s.discoverSub}>Authentic picks</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.push('Compare')}
                style={[s.discoverCard, { backgroundColor: colors.purpleSoft }]}
              >
                <Icon name="grid" color={colors.purple} />
                <Text style={s.discoverTitle}>Compare</Text>
                <Text style={s.discoverSub}>Choose better</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
        {stickySearchVisible && (
          <View style={s.compactHomeHeader}>
            <BrandLogo compact />
            <Pressable
              onPress={() => navigation.push('Catalog')}
              style={s.compactSearch}
            >
              <Icon name="search" size={18} color={colors.textSoft} />
              <Text numberOfLines={1} style={s.compactSearchText}>
                Search products...
              </Text>
              <View style={s.compactSearchButton}>
                <Text style={s.compactSearchButtonText}>Search</Text>
              </View>
            </Pressable>
          </View>
        )}
        {stickyTabsVisible && (
          <View style={s.stickyHomeTabs}>
            <HomeCategoryTabs
              active={activeCategory}
              onSelect={setActiveCategory}
            />
          </View>
        )}
        <BottomNav active="Home" navigation={navigation} />
      </View>
    </Screen>
  );
}

export function CategoriesScreen({ navigation }: ScreenProps) {
  return (
    <Screen scroll={false}>
      <Header
        title="Categories"
        navigation={navigation}
        right={
          <Pressable
            onPress={() => navigation.push('Notifications')}
            style={s.darkIcon}
          >
            <Icon name="bell" color={colors.white} />
          </Pressable>
        }
      />
      <View style={s.searchWrap}>
        <SearchBar
          placeholder="Search categories..."
          onPress={() => navigation.push('Catalog')}
        />
      </View>
      <ScrollView
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((item, index) => (
          <Pressable
            key={item.id}
            onPress={() => navigation.push('Catalog', { category: item.name })}
            style={s.categoryListItem}
          >
            <View style={[s.categoryListArt, { backgroundColor: item.color }]}>
              <ProductArt type={item.art} size={61} />
            </View>
            <View style={s.categoryListText}>
              <Text style={s.categoryListName}>{item.name}</Text>
              <Text style={s.categoryCount}>
                {12 + index * 9} products · New arrivals
              </Text>
            </View>
            <Icon name="chevron" color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
      <BottomNav active="Categories" navigation={navigation} />
    </Screen>
  );
}

export function CatalogScreen({ navigation, params }: ScreenProps) {
  const {products: catalogProducts} = useCatalog();
  const [query, setQuery] = useState((params?.query as string) || '');
  const filtered = useMemo(
    () =>
      catalogProducts.filter(p => {
        const matchesQuery = p.title.toLowerCase().includes(query.toLowerCase());
        const requestedCategory = params?.category as string | undefined;
        return matchesQuery &&
          (!requestedCategory ||
            p.category?.toLowerCase().includes(requestedCategory.toLowerCase()) ||
            !p.sellerCreated);
      }),
    [catalogProducts, params?.category, query],
  );
  return (
    <Screen scroll={false}>
      <Header
        title={(params?.category as string) || 'Explore products'}
        navigation={navigation}
        right={
          <Pressable style={s.darkIcon}>
            <Icon name="filter" color={colors.white} />
          </Pressable>
        }
      />
      <View style={s.catalogSearch}>
        <SearchBar value={query} onChangeText={setQuery} />
        <View style={s.filterChips}>
          {['Popular', 'Newest', 'Price ↓', '4.5+'].map((x, i) => (
            <Pressable key={x} style={[s.chip, i === 0 && s.chipActive]}>
              <Text style={[s.chipText, i === 0 && s.chipTextActive]}>{x}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={s.catalogBody}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.resultTitle}>
          <Text style={s.resultCount}>{filtered.length} beautiful finds</Text>
          <Text style={s.resultSort}>Recommended</Text>
        </View>
        <View style={s.productGrid}>
          {filtered.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              navigation={navigation}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const variantColors = [
  { name: 'Red', value: colors.accent },
  { name: 'Blue', value: '#2E6FF2' },
  { name: 'Black', value: colors.ink },
  { name: 'White', value: '#F7F7F7' },
];
const variantSizes = ['32', '34', '36', '38', '40', '42'];

type MoreProduct = { instanceId: string; product: Product };

function makeMoreBatch(batch: number, source: Product[]): MoreProduct[] {
  return [...source]
    .sort(() => Math.random() - 0.5)
    .map((product, index) => ({
      instanceId: `${batch}-${index}-${product.id}`,
      product,
    }));
}

export function promisedDeliveryText(minDays = 2, maxDays = 3) {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const start = new Date();
  const end = new Date();
  start.setDate(start.getDate() + minDays);
  end.setDate(end.getDate() + maxDays);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${months[end.getMonth()]}`;
  }
  return `${start.getDate()} ${months[start.getMonth()]}–${end.getDate()} ${
    months[end.getMonth()]
  }`;
}

export function ProductDetailsScreen({ navigation, params }: ScreenProps) {
  const {products: catalogProducts, findProduct} = useCatalog();
  const product = findProduct(params?.productId);
  const { addItem, itemCount } = useCart();
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState<number | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [variantSheet, setVariantSheet] = useState<'buy' | 'cart' | null>(null);
  const [reportMenu, setReportMenu] = useState(false);
  const [reported, setReported] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [headerQuery, setHeaderQuery] = useState('');
  const [selectedImageId, setSelectedImageId] = useState(
    product.images?.[0]?.id || '',
  );
  const [cartMessage, setCartMessage] = useState('');
  const cartFeedback = useRef(new Animated.Value(0)).current;
  const feedbackAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const [moreBatch, setMoreBatch] = useState(1);
  const [moreProducts, setMoreProducts] = useState<MoreProduct[]>(() =>
    makeMoreBatch(0, catalogProducts),
  );
  const lastLoadedHeight = useRef(0);
  const [reviews, setReviews] = useState([
    {
      id: 'r1',
      name: 'Nusrat Jahan',
      date: '28 Aug 2026',
      text: 'Beautiful finishing and the quality feels premium. Delivery was quick too.',
      rating: 5,
    },
    {
      id: 'r2',
      name: 'Tanvir Ahmed',
      date: '24 Aug 2026',
      text: 'Exactly as described and securely packed. Great value for the price.',
      rating: 4,
    },
  ]);
  const saved = product.oldPrice ? product.oldPrice - product.price : 0;
  const discount = product.oldPrice
    ? Math.round((saved / product.oldPrice) * 100)
    : 0;
  const productImages = product.images || [];
  const productVariants = product.variants?.length
    ? product.variants
    : variantColors.map(item => ({...item, swatch: item.value, imageIds: []}));
  const productSizes = product.sizes?.length ? product.sizes : variantSizes;
  const selectedImage =
    productImages.find(image => image.id === selectedImageId) || productImages[0];
  const deliveryPromise = useMemo(
    () =>
      promisedDeliveryText(
        product.deliveryMinDays ?? 2,
        product.deliveryMaxDays ?? 3,
      ),
    [product.deliveryMaxDays, product.deliveryMinDays],
  );
  const submitHeaderSearch = () => {
    if (headerQuery.trim()) {
      navigation.push('Catalog', { query: headerQuery.trim() });
    } else {
      navigation.push('Catalog');
    }
  };
  const loadMoreProducts = (contentHeight: number) => {
    if (contentHeight <= lastLoadedHeight.current) {
      return;
    }
    lastLoadedHeight.current = contentHeight;
    const nextBatch = moreBatch + 1;
    setMoreProducts(current => [
      ...current,
      ...makeMoreBatch(nextBatch, catalogProducts),
    ]);
    setMoreBatch(nextBatch);
  };
  const submitReview = () => {
    if (!reviewText.trim()) {
      return;
    }
    setReviews(current => [
      {
        id: `r${current.length + 1}`,
        name: 'Rafiqul Islam',
        date: 'Today',
        text: reviewText.trim(),
        rating: 5,
      },
      ...current,
    ]);
    setReviewText('');
    setReviewOpen(false);
  };
  const showCartFeedback = () => {
    if (size === null || color === null) return;
    feedbackAnimation.current?.stop();
    setCartMessage(`${qty} × ${product.title} · ${productVariants[color].name} · Size ${size}`);
    cartFeedback.setValue(0);
    feedbackAnimation.current = Animated.sequence([
      Animated.timing(cartFeedback, {toValue: 1,duration: 220,useNativeDriver: true}),
      Animated.delay(1200),
      Animated.timing(cartFeedback, {toValue: 0,duration: 220,useNativeDriver: true}),
    ]);
    feedbackAnimation.current.start(({finished}) => {if (finished) setCartMessage('');});
  };
  const addSelectionToCart = () => {
    if (size === null || color === null) {
      return;
    }
    if (fixtureMode) {
      addItem(product, qty, productVariants[color].name, size);
      showCartFeedback();
      return;
    }
    addItem(product, qty, productVariants[color].name, size)
      .then(showCartFeedback)
      .catch(error => Alert.alert('Cart',error instanceof Error?error.message:'Could not add this item.'));
  };
  const confirmVariant = () => {
    if (size === null || color === null || variantSheet === null) return;
    const action = variantSheet;
    setVariantSheet(null);
    if (action === 'buy') {
      navigation.push('Checkout', {
        buyNow: {
          productId: product.id,
          qty,
          color: productVariants[color].name,
          size,
        },
      });
    } else {
      addSelectionToCart();
    }
  };
  useEffect(() => () => feedbackAnimation.current?.stop(), []);
  useEffect(() => {
    setSelectedImageId(product.images?.[0]?.id || '');
    setColor(null);
    setSize(null);
    setQty(1);
    feedbackAnimation.current?.stop();
    setCartMessage('');
  }, [product.id, product.images]);
  return (
    <Screen scroll={false}>
      <View style={s.productRoot}>
        <View style={s.productSearchHeader}>
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={8}
            onPress={navigation.back}
            style={s.productHeaderIcon}
          >
            <Icon name="back" color={colors.white} />
          </Pressable>
          <View style={s.productHeaderSearch}>
            <Icon name="search" size={17} color={colors.textMuted} />
            <TextInput
              value={headerQuery}
              onChangeText={setHeaderQuery}
              onSubmitEditing={submitHeaderSearch}
              placeholder="Search products..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={s.productHeaderInput}
            />
            <Pressable onPress={submitHeaderSearch} style={s.productSearchGo}>
              <Icon name="search" size={15} color={colors.white} />
            </Pressable>
          </View>
          <Pressable
            accessibilityLabel="Open cart"
            hitSlop={8}
            onPress={() => navigation.push('Cart')}
            style={s.productHeaderIcon}
          >
            <Icon name="cart" color={colors.white} size={20} />
            {itemCount > 0 && (
              <View style={s.headerCartBadge}>
                <Text style={s.headerCartBadgeText}>{itemCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => setReportMenu(!reportMenu)}
            style={s.productHeaderIcon}
          >
            <Icon name="more" color={colors.white} size={20} />
          </Pressable>
        </View>
        {reportMenu && (
          <View style={s.reportMenu}>
            <Pressable
              onPress={() => {
                setReported(true);
                setReportMenu(false);
              }}
              style={s.reportMenuRow}
            >
              <Icon
                name={reported ? 'check' : 'help'}
                size={18}
                color={reported ? colors.success : colors.accent}
              />
              <Text
                style={[
                  s.reportMenuText,
                  reported && { color: colors.success },
                ]}
              >
                {reported ? 'Report submitted' : 'Report this product'}
              </Text>
            </Pressable>
          </View>
        )}
        {Boolean(cartMessage) && (
          <Animated.View
            testID="cart-add-feedback"
            accessibilityLiveRegion="polite"
            pointerEvents="none"
            style={[
              s.cartFeedback,
              {
                opacity: cartFeedback,
                transform: [
                  {
                    translateY: cartFeedback.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={s.cartFeedbackIcon}>
              <Icon name="check" size={15} color={colors.white} />
            </View>
            <View style={s.cartFeedbackCopy}>
              <Text style={s.cartFeedbackTitle}>Added to cart</Text>
              <Text numberOfLines={1} style={s.cartFeedbackText}>{cartMessage}</Text>
            </View>
          </Animated.View>
        )}
        <ScrollView
          onScroll={event => {
            const { contentOffset, layoutMeasurement, contentSize } =
              event.nativeEvent;
            if (
              contentOffset.y + layoutMeasurement.height >=
              contentSize.height - 220
            ) {
              loadMoreProducts(contentSize.height);
            }
          }}
          scrollEventThrottle={80}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.detailScroll}
        >
          <View style={[s.detailArt, { backgroundColor: product.color }]}>
            <View style={s.detailBrand}>
              <Text style={s.detailBrandText}>LOVERAF SELECT</Text>
            </View>
            <ProductMedia
              image={selectedImage}
              fallbackArt={product.art}
              size={278}
            />
            <View style={s.imageCounter}>
              <Text style={s.imageCounterText}>
                Item {Math.max(1, productImages.indexOf(selectedImage) + 1)}/
                {Math.max(1, productImages.length)} ·{' '}
                {selectedImage?.variantName || 'Color'}
              </Text>
            </View>
          </View>
          {productImages.length > 0 && (
            <View style={s.thumbnailShell}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.thumbnailRow}
              >
                {productImages.map(image => (
                  <Pressable
                    key={image.id}
                    onPress={() => {
                      setSelectedImageId(image.id);
                      const variantIndex = productVariants.findIndex(variant =>
                        variant.imageIds.includes(image.id),
                      );
                      if (variantIndex >= 0) {
                        setColor(variantIndex);
                      }
                    }}
                    style={[
                      s.thumbnail,
                      selectedImage?.id === image.id && s.thumbnailSelected,
                      {backgroundColor: image.color || product.color},
                    ]}
                  >
                    <ProductMedia image={image} fallbackArt={product.art} size={56} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          <View style={s.detailBody}>
            <View style={s.detailMeta}>
              <StatusPill text={product.badge || 'TRENDING'} tone="accent" />
              <View style={s.detailSocial}>
                <Pressable style={s.socialButton}>
                  <Icon name="share" size={18} color={colors.ink} />
                </Pressable>
                <Pressable style={s.socialButton}>
                  <Icon name="heart" size={18} color={colors.accent} />
                </Pressable>
              </View>
            </View>
            <Text style={s.detailTitle}>{product.title}</Text>
            <View style={s.priceRatingRow}>
              <Text style={s.detailPrice}>{money(product.price)}</Text>
              <View style={s.detailRating}>
                <Icon name="star" size={16} color={colors.warning} />
                <Text style={s.detailRatingText}>
                  {product.rating} · {product.sold} sold
                </Text>
              </View>
            </View>
            <View style={s.savingsRow}>
              {product.oldPrice && (
                <Text style={s.detailOld}>{money(product.oldPrice)}</Text>
              )}
              {discount > 0 && (
                <Text style={s.discountText}>{discount}% OFF</Text>
              )}
              {saved > 0 && (
                <Text style={s.savedText}>You save {money(saved)}</Text>
              )}
              <Text style={s.stock}>In stock</Text>
            </View>
            <Text style={s.detailDescription}>{product.description}</Text>
            <View style={s.optionLabelRow}>
              <Text style={s.optionLabel}>Select color</Text>
              <View style={s.selectedOption}>
                <Text style={s.selectedOptionText}>
                  {color === null ? 'Choose' : productVariants[color].name}
                </Text>
                <Icon name="chevron" size={15} color={colors.accent} />
              </View>
            </View>
            <View style={s.swatches}>
              {productVariants.map((item, index) => (
                <Pressable
                  accessibilityLabel={`Select color ${item.name}`}
                  accessibilityState={{selected: color === index}}
                  onPress={() => {
                    setColor(index);
                    if (item.imageIds[0]) {
                      setSelectedImageId(item.imageIds[0]);
                    }
                  }}
                  key={item.name}
                  style={[s.swatchOuter, color === index && s.swatchSelected]}
                >
                  <View style={[s.swatch, { backgroundColor: item.swatch }]} />
                </Pressable>
              ))}
            </View>
            <Text style={s.optionLabel}>Select size</Text>
            <View style={s.sizeRow}>
              {productSizes.map(item => (
                <Pressable
                  accessibilityLabel={`Select size ${item}`}
                  accessibilityState={{selected: size === item}}
                  onPress={() => setSize(item)}
                  key={item}
                  style={[s.sizeChip, size === item && s.sizeChipActive]}
                >
                  <Text style={[s.sizeText, size === item && s.sizeTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={s.qtyDelivery}>
              <View>
                <Text style={s.optionLabel}>Quantity</Text>
                <View style={s.stepper}>
                  <Pressable onPress={() => setQty(Math.max(1, qty - 1))}>
                    <Icon name="minus" size={18} />
                  </Pressable>
                  <Text style={s.qty}>{qty}</Text>
                  <Pressable onPress={() => setQty(qty + 1)}>
                    <Icon name="plus" size={18} />
                  </Pressable>
                </View>
              </View>
              <View style={s.deliveryMini}>
                <Icon name="truck" color={colors.success} />
                <View>
                  <Text style={s.deliveryTitle}>Free delivery</Text>
                  <Text style={s.deliveryText}>Arrives in 2–3 days</Text>
                </View>
              </View>
            </View>
            <View style={s.trustRow}>
              <View style={s.trustItem}>
                <Icon name="shield" color={colors.info} />
                <Text style={s.trustText}>Buyer protected</Text>
              </View>
              <View style={s.trustItem}>
                <Icon name="wallet" color={colors.purple} />
                <Text style={s.trustText}>Secure payment</Text>
              </View>
            </View>
            <View style={s.promiseCard}>
              {[
                ['back', 'Return', `${product.returnDays ?? 3} Days`, colors.accent],
                ['exchange', 'Exchange', `${product.exchangeDays ?? 3} Days`, colors.info],
                ['truck', 'Delivery', deliveryPromise, colors.success],
                ['wallet', 'Payment', product.codAvailable === false ? 'Prepaid' : 'COD', colors.purple],
              ].map(item => (
                <View key={item[1]} style={s.promiseRow}>
                  <View
                    style={[s.promiseIcon, {backgroundColor: `${item[3]}14`}]}
                  >
                    <Icon name={item[0]} size={15} color={item[3]} />
                  </View>
                  <View style={s.promiseText}>
                    <Text style={s.promiseLabel}>{item[1]}</Text>
                    <Text numberOfLines={1} style={s.promiseValue}>{item[2]}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={s.reviewHeader}>
              <SectionHeader title="User Reviews" />
              <Pressable onPress={() => setReviewOpen(!reviewOpen)}>
                <Text style={s.writeReview}>Write a Review</Text>
              </Pressable>
            </View>
            {reviewOpen && (
              <View style={s.reviewComposer}>
                <View style={s.reviewStars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Icon
                      key={star}
                      name="star"
                      size={18}
                      color={colors.warning}
                    />
                  ))}
                </View>
                <TextInput
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline
                  placeholder="Share your experience with this product..."
                  placeholderTextColor={colors.textMuted}
                  style={s.reviewInput}
                />
                <Pressable onPress={submitReview} style={s.reviewSubmit}>
                  <Text style={s.reviewSubmitText}>Submit Review</Text>
                </Pressable>
              </View>
            )}
            <View style={s.reviewList}>
              {reviews.map(review => (
                <View key={review.id} style={s.reviewCard}>
                  <View style={s.reviewTop}>
                    <View style={s.reviewerAvatar}>
                      <Text style={s.reviewerAvatarText}>
                        {review.name
                          .split(' ')
                          .map(part => part[0])
                          .join('')
                          .slice(0, 2)}
                      </Text>
                    </View>
                    <View style={s.reviewIdentity}>
                      <Text style={s.reviewerName}>{review.name}</Text>
                      <Text style={s.reviewDate}>{review.date}</Text>
                    </View>
                    <View style={s.reviewStars}>
                      {Array.from({ length: review.rating }).map((_, index) => (
                        <Icon
                          key={index}
                          name="star"
                          size={12}
                          color={colors.warning}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={s.reviewText}>{review.text}</Text>
                </View>
              ))}
            </View>
            <Pressable style={s.viewReviews}>
              <Text style={s.viewReviewsText}>View All Reviews</Text>
              <Icon name="chevron" size={16} color={colors.accent} />
            </Pressable>
            <SectionHeader title="You May Also Like" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {products.slice(2, 6).map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  navigation={navigation}
                  compact
                />
              ))}
            </ScrollView>
            <SectionHeader title="More For You" />
            <View style={s.productGrid}>
              {moreProducts.map(item => (
                <ProductCard
                  key={item.instanceId}
                  product={item.product}
                  navigation={navigation}
                />
              ))}
            </View>
            <View style={s.moreLoading}>
              <View style={s.moreLoadingDot} />
              <Text style={s.moreLoadingText}>Scroll for more picks</Text>
            </View>
          </View>
        </ScrollView>
        <View style={s.detailFooter}>
          <View style={s.footerUtilities}>
            <Pressable
              onPress={() => navigation.push('Store')}
              style={s.footerUtility}
            >
              <View style={s.footerIcon}>
                <Icon name="store" color={colors.accent} size={19} />
              </View>
              <Text style={s.footerUtilityText}>Store</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                navigation.push('Chat', { name: 'Loveraf Official Store' })
              }
              style={s.footerUtility}
            >
              <View style={s.footerIcon}>
                <Icon name="chat" color={colors.ink} size={19} />
              </View>
              <Text style={s.footerUtilityText}>Chat</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add to Cart"
            onPress={() => {
              if (size === null || color === null) setVariantSheet('cart');
              else addSelectionToCart();
            }}
            style={s.cartButton}
          >
            <Text style={s.cartButtonText}>Add to Cart</Text>
          </Pressable>
          <Pressable onPress={() => setVariantSheet('buy')} style={s.buyButton}>
            <Text style={s.buyButtonText}>Buy Now</Text>
          </Pressable>
        </View>
        <Modal
          visible={variantSheet !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setVariantSheet(null)}
        >
          <View style={s.variantModalBackdrop}>
            <Pressable
              style={s.variantDismiss}
              onPress={() => setVariantSheet(null)}
            />
            <View style={s.variantSheetPanel}>
              <View style={s.variantHandle} />
              <Pressable
                onPress={() => setVariantSheet(null)}
                style={s.variantClose}
              >
                <Icon name="close" size={21} color={colors.textSoft} />
              </Pressable>
              <View style={s.variantProductRow}>
                <View
                  style={[
                    s.variantProductArt,
                    { backgroundColor: product.color },
                  ]}
                >
                  <ProductMedia
                    image={selectedImage}
                    fallbackArt={product.art}
                    size={88}
                  />
                </View>
                <View style={s.variantProductInfo}>
                  <Text numberOfLines={2} style={s.variantProductTitle}>
                    {product.title}
                  </Text>
                  <View style={s.variantPriceRow}>
                    <Text style={s.variantPrice}>{money(product.price)}</Text>
                    {product.oldPrice && (
                      <Text style={s.variantOldPrice}>
                        {money(product.oldPrice)}
                      </Text>
                    )}
                    <Text style={s.variantStock}>Stock {product.stock ?? 60}</Text>
                  </View>
                </View>
              </View>
              <Text style={s.variantLabel}>Select Size</Text>
              <View style={s.variantSizeGrid}>
                {productSizes.map(item => (
                  <Pressable
                    key={item}
                    onPress={() => setSize(item)}
                    style={[
                      s.variantSizeChip,
                      size === item && s.variantChoiceActive,
                    ]}
                  >
                    <Text
                      style={[
                        s.variantSizeText,
                        size === item && s.variantChoiceTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.variantLabel}>Select Color</Text>
              <View style={s.variantColorRow}>
                {productVariants.map((item, index) => (
                  <Pressable
                    key={item.name}
                    onPress={() => {
                      setColor(index);
                      if (item.imageIds[0]) {
                        setSelectedImageId(item.imageIds[0]);
                      }
                    }}
                    style={[
                      s.variantColorChip,
                      color === index && s.variantChoiceActive,
                    ]}
                  >
                    <View
                      style={[
                        s.variantColorDot,
                        { backgroundColor: item.swatch },
                      ]}
                    />
                    <Text
                      style={[
                        s.variantColorText,
                        color === index && s.variantChoiceTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.variantQuantityRow}>
                <Text style={s.variantLabelNoMargin}>Quantity</Text>
                <View style={s.variantStepper}>
                  <Pressable
                    onPress={() => setQty(Math.max(1, qty - 1))}
                    style={s.variantStepButton}
                  >
                    <Icon name="minus" size={18} color={colors.ink} />
                  </Pressable>
                  <Text style={s.variantQty}>{qty}</Text>
                  <Pressable
                    onPress={() => setQty(qty + 1)}
                    style={s.variantStepButton}
                  >
                    <Icon name="plus" size={18} color={colors.ink} />
                  </Pressable>
                </View>
              </View>
              {(size === null || color === null) && (
                <Text style={s.variantHint}>
                  Please choose both size and color to continue.
                </Text>
              )}
              <Pressable
                disabled={size === null || color === null}
                onPress={confirmVariant}
                style={[
                  s.variantConfirm,
                  (size === null || color === null) && s.variantConfirmDisabled,
                ]}
              >
                <Icon
                  name={variantSheet === 'buy' ? 'bag' : 'cart'}
                  size={19}
                  color={colors.white}
                />
                <Text style={s.variantConfirmText}>
                  {variantSheet === 'buy' ? 'Buy Now' : 'Add to Cart'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

export function StoreScreen({ navigation }: ScreenProps) {
  const [followed, setFollowed] = useState(false);
  const [tab, setTab] = useState('Store');
  const [category, setCategory] = useState('All');
  const storeProducts =
    category === 'All'
      ? products
      : products.filter(product =>
          category === 'Fashion'
            ? ['hoodie', 'dress', 'shoe'].includes(product.art)
            : category === 'Electronics'
            ? ['headphones', 'watch', 'phone'].includes(product.art)
            : ['chair', 'beauty', 'grocery'].includes(product.art),
        );
  return (
    <Screen scroll={false}>
      <Header
        title="Loveraf Official Store"
        navigation={navigation}
        right={
          <Pressable onPress={() => navigation.push('Cart')} style={s.darkIcon}>
            <Icon name="cart" color={colors.white} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={s.storeScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.storeHero}>
          <View style={s.storeIdentity}>
            <View style={s.storeLogoLarge}>
              <Icon name="store" size={34} color={colors.accent} />
            </View>
            <View style={s.storeNameWrap}>
              <Text style={s.storeNameLarge}>Loveraf Official Store</Text>
              <View style={s.storeRating}>
                <Icon name="star" size={13} color={colors.warning} />
                <Text style={s.storeRatingText}>
                  4.9 Seller Rating · 19.4K followers
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setFollowed(!followed)}
              style={[s.followButton, followed && s.followButtonActive]}
            >
              <Text
                style={[
                  s.followButtonText,
                  followed && s.followButtonTextActive,
                ]}
              >
                {followed ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          </View>
          <View style={s.shippingStrip}>
            <Icon name="truck" size={18} color={colors.success} />
            <Text style={s.shippingStripText}>
              Fast Shipping · 100% shipped within 48 hours
            </Text>
          </View>
        </View>
        <View style={s.storeBanner}>
          <View>
            <Text style={s.storeBannerKicker}>LOVERAF SELECT</Text>
            <Text style={s.storeBannerTitle}>
              Quality picks.{`\n`}Better everyday value.
            </Text>
            <Text style={s.storeBannerSub}>
              Official products · Buyer protected
            </Text>
          </View>
          <View style={s.storeBannerArt}>
            <ProductArt type="headphones" size={130} />
          </View>
        </View>
        {tab === 'Categories' && (
          <View style={s.storeCategories}>
            {['All', 'Fashion', 'Electronics', 'Lifestyle'].map(item => (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[
                  s.storeCategoryChip,
                  category === item && s.storeCategoryChipActive,
                ]}
              >
                <Text
                  style={[
                    s.storeCategoryText,
                    category === item && s.storeCategoryTextActive,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={s.storeProductsHead}>
          <Text style={s.storeProductsTitle}>
            {tab === 'Categories' ? `${category} Products` : 'All Products'}
          </Text>
          <Text style={s.storeProductsCount}>{storeProducts.length} items</Text>
        </View>
        <View style={s.storeProductGrid}>
          {storeProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              navigation={navigation}
            />
          ))}
        </View>
      </ScrollView>
      <View style={s.storeFooter}>
        {[
          { name: 'Store', icon: 'store' },
          { name: 'Products', icon: 'package' },
          { name: 'Categories', icon: 'grid' },
          { name: 'Chat', icon: 'message' },
        ].map(item => (
          <Pressable
            key={item.name}
            onPress={() =>
              item.name === 'Chat'
                ? navigation.push('Chat', { name: 'Loveraf Official Store' })
                : setTab(item.name)
            }
            style={s.storeFooterItem}
          >
            <Icon
              name={item.icon}
              size={21}
              color={tab === item.name ? colors.accent : colors.textMuted}
            />
            <Text
              style={[
                s.storeFooterText,
                tab === item.name && s.storeFooterTextActive,
              ]}
            >
              {item.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

export function FlashSaleScreen({ navigation }: ScreenProps) {
  return (
    <Screen>
      <Header title="Flash Sale" navigation={navigation} />
      <View style={s.flashHero}>
        <Text style={s.flashHeroKicker}>LIMITED TIME</Text>
        <Text style={s.flashHeroTitle}>Midnight Drop</Text>
        <Text style={s.flashHeroText}>
          Best prices vanish when the timer ends.
        </Text>
        <View style={s.timerRow}>
          {['04', '28', '16'].map((x, i) => (
            <React.Fragment key={x}>
              <View style={s.timerBox}>
                <Text style={s.timerNumber}>{x}</Text>
                <Text style={s.timerLabel}>{['HRS', 'MIN', 'SEC'][i]}</Text>
              </View>
              {i < 2 && <Text style={s.timerColon}>:</Text>}
            </React.Fragment>
          ))}
        </View>
      </View>
      <View style={s.padded}>
        <View style={s.productGrid}>
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={{ ...product, badge: product.badge || 'FLASH' }}
              navigation={navigation}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

export function WishlistScreen({ navigation }: ScreenProps) {
  return (
    <Screen scroll={false}>
      <Header title="My Wishlist" right={<Text style={s.edit}>Edit</Text>} />
      <ScrollView contentContainerStyle={s.wishlistBody}>
        <Text style={s.listLead}>8 saved items · Price drop alerts are on</Text>
        <View style={s.productGrid}>
          {products.slice(0, 6).map(product => (
            <ProductCard
              key={product.id}
              product={product}
              navigation={navigation}
            />
          ))}
        </View>
      </ScrollView>
      <BottomNav active="Wishlist" navigation={navigation} />
    </Screen>
  );
}

export function CompareScreen({ navigation }: ScreenProps) {
  const items = [products[0], products[2]];
  const rows = [
    ['Price', money(items[0].price), money(items[1].price)],
    ['Rating', '4.8 / 5', '4.9 / 5'],
    ['Warranty', '12 months', '18 months'],
    ['Delivery', 'Free · 2 days', 'Free · 3 days'],
    ['Seller', 'Loveraf Official', 'Nova Verified'],
  ];
  return (
    <Screen>
      <Header title="Product Comparison" navigation={navigation} />
      <View style={s.compareBody}>
        <View style={s.compareProducts}>
          {items.map(p => (
            <View key={p.id} style={s.compareProduct}>
              <View style={[s.compareArt, { backgroundColor: p.color }]}>
                <ProductArt type={p.art} size={105} />
              </View>
              <Text numberOfLines={2} style={s.compareName}>
                {p.title}
              </Text>
            </View>
          ))}
        </View>
        <View style={s.compareTable}>
          {rows.map((row, i) => (
            <View
              key={row[0]}
              style={[s.compareRow, i % 2 === 0 && s.compareRowAlt]}
            >
              <Text style={s.compareLabel}>{row[0]}</Text>
              <Text style={s.compareValue}>{row[1]}</Text>
              <Text style={s.compareValue}>{row[2]}</Text>
            </View>
          ))}
        </View>
        <PrimaryButton
          title="Add selected to cart"
          onPress={() => navigation.push('Cart')}
        />
      </View>
    </Screen>
  );
}

export function RecentlyViewedScreen({ navigation }: ScreenProps) {
  return (
    <Screen>
      <Header
        title="Recently Viewed"
        navigation={navigation}
        right={<Text style={s.edit}>Clear</Text>}
      />
      <View style={s.padded}>
        <Text style={s.listLead}>Continue where you left off</Text>
        <View style={s.productGrid}>
          {products.map(p => (
            <ProductCard key={p.id} product={p} navigation={navigation} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

export function FollowedShopsScreen({ navigation }: ScreenProps) {
  const shops = [
    {
      name: 'Loveraf Official',
      type: 'Official brand store',
      color: colors.accent,
    },
    {
      name: 'Nova Electronics',
      type: 'Top verified seller',
      color: colors.info,
    },
    {
      name: 'North & Loom',
      type: 'Premium lifestyle shop',
      color: colors.purple,
    },
    { name: 'Glow Theory', type: 'Beauty specialist', color: colors.warning },
  ];
  return (
    <Screen>
      <Header title="Followed Shops" navigation={navigation} />
      <View style={s.padded}>
        {shops.map((shop, index) => (
          <View key={shop.name} style={s.shopCard}>
            <View style={[s.shopLogo, { backgroundColor: `${shop.color}18` }]}>
              <Icon name="store" color={shop.color} size={27} />
            </View>
            <View style={s.shopText}>
              <Text style={s.shopName}>{shop.name}</Text>
              <Text style={s.shopType}>
                {shop.type} · {12 + index * 8} new
              </Text>
            </View>
            <Pressable style={s.following}>
              <Text style={s.followingText}>Following</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  headerActions: { flexDirection: 'row', gap: 4 },
  productSearchHeader: {
    height: chrome.headerHeight,
    backgroundColor: colors.ink,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 20,
  },
  productHeaderIcon: {
    width: 34,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productHeaderSearch: {
    flex: 1,
    minWidth: 0,
    height: 39,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  productHeaderInput: {
    flex: 1,
    height: 39,
    color: colors.text,
    fontSize: 10.5,
    paddingHorizontal: 7,
    paddingVertical: 0,
  },
  productSearchGo: {
    width: 34,
    height: 32,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  darkIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF10',
  },
  headerCartBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  headerCartBadgeText: { fontSize: 8, color: colors.white, fontWeight: '900' },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  homeScroll: { paddingBottom: 20 },
  heroShell: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  heroCard: {
    height: 205,
    backgroundColor: colors.inkSoft,
    borderRadius: radius.lg,
    marginTop: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#20344F',
  },
  heroText: { width: '61%', padding: 19, alignItems: 'flex-start', zIndex: 2 },
  heroTitle: {
    color: colors.white,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    marginTop: 13,
  },
  heroSub: { color: '#AEB9C9', fontSize: 10.5, marginTop: 6 },
  shopNow: {
    backgroundColor: colors.accent,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  shopNowText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  heroArt: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 165,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.96,
  },
  balanceStrip: {
    marginTop: 12,
    backgroundColor: '#111F33',
    borderRadius: radius.md,
    minHeight: 66,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#223550',
  },
  balanceIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  balanceLabel: { fontSize: 9, color: '#8B9AAF' },
  balanceValue: {
    fontSize: 13,
    color: colors.white,
    fontWeight: '700',
    marginTop: 3,
  },
  balanceGrow: { flex: 1 },
  homeBody: { paddingHorizontal: 10 },
  categoryRow: { gap: 12, paddingRight: 12 },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 13,
  },
  categoryTile: { width: '23%' },
  categoryArt: {
    height: 65,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 5,
    minHeight: 24,
  },
  flashBanner: {
    height: 94,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    marginTop: 24,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  flashKicker: {
    color: colors.accent,
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '800',
  },
  flashTitle: {
    color: colors.white,
    fontSize: 21,
    fontWeight: '800',
    marginTop: 4,
  },
  flashTimer: { color: '#9EADBF', fontSize: 10, marginTop: 5 },
  flashArrow: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  discoverRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  discoverCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: 16,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  discoverTitle: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '800',
    marginTop: 12,
  },
  discoverSub: { fontSize: 10, color: colors.textSoft },
  searchWrap: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listContent: { padding: 16, paddingBottom: 30 },
  categoryListItem: {
    ...shadow,
    minHeight: 82,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    padding: 10,
  },
  categoryListArt: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryListText: { flex: 1, marginLeft: 13 },
  categoryListName: { fontSize: 14, color: colors.text, fontWeight: '700' },
  categoryCount: { fontSize: 10.5, color: colors.textSoft, marginTop: 5 },
  catalogSearch: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterChips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#16253A',
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: '#ABB6C7', fontSize: 10.5, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  catalogBody: { padding: 16, paddingBottom: 40 },
  resultTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  resultCount: { fontSize: 13, color: colors.text, fontWeight: '700' },
  resultSort: { fontSize: 10, color: colors.textSoft },
  detailScroll: { paddingBottom: 16 },
  detailArt: {
    height: 330,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  detailBrand: {
    position: 'absolute',
    left: 18,
    top: 18,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detailBrandText: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: colors.ink,
    fontWeight: '800',
  },
  imageCounter: {
    position: 'absolute',
    left: 16,
    bottom: 14,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: '#FFFFFFE8',
  },
  imageCounterText: {fontSize: 10, color: colors.ink, fontWeight: '800'},
  thumbnailShell: {backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line},
  thumbnailRow: {paddingHorizontal: 14, paddingVertical: 10, gap: 9},
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  thumbnailSelected: {borderWidth: 2, borderColor: colors.ink},
  detailBody: { padding: 18 },
  detailMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRating: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  detailRatingText: { fontSize: 11, color: colors.textSoft },
  detailTitle: {
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
    fontWeight: '800',
    marginTop: 13,
  },
  detailPrices: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
    marginTop: 9,
  },
  detailPrice: { fontSize: 23, color: colors.accent, fontWeight: '900' },
  detailOld: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  stock: {
    fontSize: 9,
    color: colors.success,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  detailDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSoft,
    marginTop: 13,
  },
  promiseCard: {
    marginTop: 16,
    marginBottom: 2,
    padding: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  promiseRow: {
    width: '50%',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  promiseIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  promiseText: {flex: 1},
  promiseLabel: {
    fontSize: 8.5,
    color: colors.text,
    fontWeight: '800',
  },
  promiseValue: {fontSize: 8.5, color: colors.textSoft, fontWeight: '700', marginTop: 1},
  optionLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
    marginTop: 19,
    marginBottom: 10,
  },
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 10,
  },
  selectedOptionText: { fontSize: 11, color: colors.accent, fontWeight: '800' },
  swatches: { flexDirection: 'row', gap: 8 },
  swatchOuter: {
    width: 34,
    height: 34,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: { borderWidth: 2, borderColor: colors.accent },
  swatch: { width: 24, height: 24, borderRadius: 13 },
  qtyDelivery: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  stepper: {
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
    paddingHorizontal: 12,
  },
  qty: { fontSize: 14, color: colors.text, fontWeight: '800' },
  deliveryMini: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: 11,
  },
  deliveryTitle: { fontSize: 11, color: colors.success, fontWeight: '700' },
  deliveryText: { fontSize: 8.5, color: colors.textSoft, marginTop: 2 },
  trustRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  trustItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustText: { fontSize: 10, color: colors.text, fontWeight: '600' },
  detailFooter: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  moreLoading: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  moreLoadingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  moreLoadingText: { fontSize: 9, color: colors.textMuted, fontWeight: '700' },
  footerHalf: { flex: 1 },
  flashHero: {
    backgroundColor: colors.ink,
    padding: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  flashHeroKicker: {
    color: colors.accent,
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: '800',
  },
  flashHeroTitle: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 8,
  },
  flashHeroText: { color: '#AEB9C9', fontSize: 12, marginTop: 7 },
  timerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  timerBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#15243A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerNumber: { color: colors.white, fontSize: 20, fontWeight: '800' },
  timerLabel: { color: colors.textMuted, fontSize: 7, marginTop: 2 },
  timerColon: { color: colors.accent, fontSize: 24, marginHorizontal: 8 },
  padded: { padding: 16 },
  wishlistBody: { padding: 16, paddingBottom: 35 },
  listLead: { fontSize: 11, color: colors.textSoft, marginBottom: 14 },
  edit: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  compareBody: { padding: 16 },
  compareProducts: { flexDirection: 'row', gap: 12 },
  compareProduct: { flex: 1 },
  compareArt: {
    height: 150,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareName: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 10,
  },
  compareTable: {
    marginVertical: 22,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  compareRow: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  compareRowAlt: { backgroundColor: colors.surfaceAlt },
  compareLabel: {
    width: 82,
    fontSize: 10,
    color: colors.textSoft,
    fontWeight: '700',
  },
  compareValue: {
    flex: 1,
    fontSize: 10.5,
    color: colors.text,
    fontWeight: '600',
  },
  shopCard: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shopLogo: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopText: { flex: 1, marginLeft: 12 },
  shopName: { fontSize: 14, color: colors.text, fontWeight: '700' },
  shopType: { fontSize: 10, color: colors.textSoft, marginTop: 4 },
  following: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  followingText: { fontSize: 9, color: colors.accent, fontWeight: '700' },
  homeRoot: { flex: 1 },
  categoryAnchor: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.canvas,
    zIndex: 15,
  },
  homeTabs: {
    height: 38,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeTab: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeTabActive: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
  },
  homeTabText: { fontSize: 9.5, color: colors.textSoft, fontWeight: '700' },
  homeTabTextActive: { color: colors.white, fontWeight: '900' },
  compactHomeHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: chrome.headerHeight,
    backgroundColor: colors.ink,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
    elevation: 18,
  },
  compactSearch: {
    height: 39,
    flex: 1,
    minWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingLeft: 13,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  compactSearchText: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 8,
    flex: 1,
  },
  compactSearchButton: {
    height: 31,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    marginRight: 4,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactSearchButtonText: {
    fontSize: 9.5,
    color: colors.white,
    fontWeight: '800',
  },
  stickyHomeTabs: {
    position: 'absolute',
    top: chrome.headerHeight,
    left: 0,
    right: 0,
    backgroundColor: colors.canvas,
    paddingHorizontal: 12,
    paddingVertical: 4,
    zIndex: 19,
    elevation: 17,
  },
  bannerViewport: {
    height: 154,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: 12,
  },
  demoBanner: {
    height: 154,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  demoBannerText: { paddingLeft: 18, width: '64%', zIndex: 2 },
  demoBannerKicker: {
    fontSize: 7.5,
    color: colors.accent,
    letterSpacing: 1.5,
    fontWeight: '900',
  },
  demoBannerTitle: {
    fontSize: 21,
    lineHeight: 25,
    color: colors.ink,
    fontWeight: '900',
    marginTop: 5,
  },
  demoBannerSub: { fontSize: 8.5, color: colors.textSoft, marginTop: 6 },
  demoBannerArt: {
    position: 'absolute',
    right: 5,
    bottom: -4,
    width: 135,
    height: 145,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerDots: {
    position: 'absolute',
    left: 18,
    bottom: 10,
    flexDirection: 'row',
    gap: 5,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BFC5D0',
  },
  bannerDotActive: { width: 19, backgroundColor: colors.accent },
  productRoot: { flex: 1 },
  reportMenu: {
    ...shadow,
    position: 'absolute',
    top: chrome.headerHeight - 3,
    right: 14,
    width: 190,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: 6,
    zIndex: 30,
    elevation: 20,
  },
  reportMenuRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
  },
  reportMenuText: { fontSize: 11, color: colors.text, fontWeight: '700' },
  cartFeedback: {
    ...shadow,
    position: 'absolute',
    top: chrome.headerHeight + 6,
    left: 14,
    right: 14,
    minHeight: 54,
    zIndex: 35,
    elevation: 24,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.successSoft,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartFeedbackIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartFeedbackCopy: {flex: 1, marginLeft: 9},
  cartFeedbackTitle: {fontSize: 10, color: colors.success, fontWeight: '900'},
  cartFeedbackText: {fontSize: 8.5, color: colors.textSoft, marginTop: 2},
  detailSocial: { flexDirection: 'row', gap: 8 },
  socialButton: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 9,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 7,
  },
  discountText: {
    fontSize: 9,
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    fontWeight: '800',
  },
  savedText: { fontSize: 9, color: colors.success, fontWeight: '700' },
  sizeRow: { flexDirection: 'row', gap: 9 },
  sizeChip: {
    minWidth: 48,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  sizeChipDisabled: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.surfaceAlt,
  },
  sizeText: { fontSize: 11, color: colors.text, fontWeight: '700' },
  sizeTextActive: { color: colors.white },
  sizeTextDisabled: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  writeReview: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '800',
    paddingBottom: 17,
  },
  reviewComposer: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewInput: {
    minHeight: 82,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 11,
    color: colors.text,
    marginTop: 10,
  },
  reviewSubmit: {
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  reviewSubmitText: { fontSize: 10, color: colors.white, fontWeight: '800' },
  reviewList: { gap: 10 },
  reviewCard: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 13,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center' },
  reviewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerAvatarText: { fontSize: 10, color: colors.accent, fontWeight: '900' },
  reviewIdentity: { flex: 1, marginLeft: 9 },
  reviewerName: { fontSize: 11, color: colors.text, fontWeight: '800' },
  reviewDate: { fontSize: 8, color: colors.textMuted, marginTop: 3 },
  reviewText: {
    fontSize: 10,
    lineHeight: 16,
    color: colors.textSoft,
    marginTop: 10,
  },
  viewReviews: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  viewReviewsText: { fontSize: 10, color: colors.accent, fontWeight: '800' },
  footerUtilities: { width: 92, flexDirection: 'row' },
  footerUtility: { width: 46, alignItems: 'center', justifyContent: 'center' },
  footerIcon: {
    width: 28,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerUtilityText: { fontSize: 8, color: colors.textSoft, fontWeight: '700' },
  buyButton: {
    flex: 1,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: { fontSize: 11, color: colors.white, fontWeight: '800' },
  cartButton: {
    flex: 1.1,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  cartButtonText: { fontSize: 11, color: colors.white, fontWeight: '800' },
  variantModalBackdrop: {
    flex: 1,
    backgroundColor: '#07142688',
    justifyContent: 'flex-end',
  },
  variantDismiss: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  variantSheetPanel: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
  },
  variantHandle: {
    width: 42,
    height: 4,
    borderRadius: 3,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: 13,
  },
  variantClose: {
    position: 'absolute',
    right: 15,
    top: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  variantProductRow: { flexDirection: 'row', paddingRight: 40 },
  variantProductArt: {
    width: 94,
    height: 104,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  variantProductInfo: { flex: 1, marginLeft: 13, justifyContent: 'center' },
  variantProductTitle: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
    fontWeight: '800',
  },
  variantPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 9,
  },
  variantPrice: { fontSize: 17, color: colors.accent, fontWeight: '900' },
  variantOldPrice: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  variantStock: { fontSize: 11, color: colors.textSoft, fontWeight: '700' },
  variantLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 10,
  },
  variantLabelNoMargin: { fontSize: 14, color: colors.text, fontWeight: '800' },
  variantSizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variantSizeChip: {
    width: 54,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantSizeText: { fontSize: 12, color: colors.text, fontWeight: '700' },
  variantChoiceActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  variantChoiceTextActive: { color: colors.accent, fontWeight: '900' },
  variantColorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variantColorChip: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  variantColorDot: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.line,
  },
  variantColorText: { fontSize: 10, color: colors.textSoft, fontWeight: '700' },
  variantQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  variantStepper: {
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  variantStepButton: {
    width: 43,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  variantQty: {
    minWidth: 52,
    textAlign: 'center',
    fontSize: 14,
    color: colors.text,
    fontWeight: '900',
  },
  variantHint: { fontSize: 9.5, color: colors.accent, marginTop: 11 },
  variantConfirm: {
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  variantConfirmDisabled: { backgroundColor: colors.textMuted },
  variantConfirmText: { fontSize: 13, color: colors.white, fontWeight: '900' },
  storeScroll: { paddingBottom: 28 },
  storeHero: { backgroundColor: colors.ink, padding: 16, paddingBottom: 19 },
  storeIdentity: { flexDirection: 'row', alignItems: 'center' },
  storeLogoLarge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeNameWrap: { flex: 1, marginLeft: 12 },
  storeNameLarge: { fontSize: 15, color: colors.white, fontWeight: '900' },
  storeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  storeRatingText: { fontSize: 8.5, color: '#A7B3C4' },
  followButton: {
    height: 38,
    minWidth: 76,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  followButtonActive: { backgroundColor: colors.white },
  followButtonText: { fontSize: 10, color: colors.white, fontWeight: '800' },
  followButtonTextActive: { color: colors.accent },
  shippingStrip: {
    height: 43,
    borderRadius: 13,
    backgroundColor: '#14243A',
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  shippingStripText: { fontSize: 9, color: '#C5CEDA', fontWeight: '600' },
  storeBanner: {
    height: 190,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    margin: 16,
    padding: 19,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  storeBannerKicker: {
    fontSize: 8,
    color: colors.accent,
    letterSpacing: 1.5,
    fontWeight: '900',
  },
  storeBannerTitle: {
    fontSize: 22,
    lineHeight: 27,
    color: colors.ink,
    fontWeight: '900',
    marginTop: 7,
  },
  storeBannerSub: { fontSize: 9, color: colors.textSoft, marginTop: 8 },
  storeBannerArt: { position: 'absolute', right: 5, bottom: 0, opacity: 0.92 },
  storeCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  storeCategoryChip: {
    height: 38,
    borderRadius: radius.pill,
    paddingHorizontal: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeCategoryChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  storeCategoryText: {
    fontSize: 9.5,
    color: colors.textSoft,
    fontWeight: '700',
  },
  storeCategoryTextActive: { color: colors.white },
  storeProductsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  storeProductsTitle: { fontSize: 19, color: colors.text, fontWeight: '900' },
  storeProductsCount: { fontSize: 9, color: colors.textMuted },
  storeProductGrid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  storeFooter: {
    height: 70,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
  },
  storeFooterItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  storeFooterText: {
    fontSize: 8.5,
    color: colors.textMuted,
    marginTop: 5,
    fontWeight: '600',
  },
  storeFooterTextActive: { color: colors.accent, fontWeight: '800' },
});
