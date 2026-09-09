/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import {
  Image,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {Text, TextInput} from '../components/Typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '../components/BrandLogo';
import { Icon } from '../components/Icon';
import { ProductArt } from '../components/ProductArt';
import {
  Header,
  MetricCard,
  PrimaryButton,
  ProductMedia,
  Screen,
  SectionHeader,
  StatusPill,
} from '../components/UI';
import { money, products } from '../data';
import {useCatalog} from '../catalog';
import { chrome, colors, radius, shadow } from '../theme';
import {Product, ProductImage, ProductVariant, RouteName, ScreenProps} from '../types';
import { useSeller } from '../seller';
import {fixtureMode} from '../api';

function RoleTop({
  label,
  name,
  status,
}: {
  label: string;
  name: string;
  status: string;
}) {
  return (
    <View style={s.roleTop}>
      <View style={s.roleTopGlow} />
      <BrandLogo compact />
      <View style={s.roleBadge}>
        <Text style={s.roleBadgeText}>{label}</Text>
      </View>
      <View style={s.roleIdentity}>
        <View style={s.roleAvatar}>
          <Icon name="store" size={29} color={colors.white} />
        </View>
        <View>
          <Text style={s.roleName}>{name}</Text>
          <Text style={s.roleStatus}>{status}</Text>
        </View>
      </View>
    </View>
  );
}

const sellerTabs: { label: string; icon: string; route: RouteName }[] = [
  { label: 'Home', icon: 'home', route: 'SellerDashboard' },
  { label: 'Manage', icon: 'grid', route: 'SellerProducts' },
  { label: 'Upload', icon: 'plus', route: 'SellerUpload' },
  { label: 'Chat', icon: 'chat', route: 'SellerInbox' },
];

function SellerBottomNav({
  active,
  navigation,
}: {
  active: RouteName;
  navigation: ScreenProps['navigation'];
}) {
  return (
    <SafeAreaView edges={['bottom']} style={s.sellerNavSafe}>
      <View style={s.sellerNav}>
        {sellerTabs.map(tab => {
          const selected =
            active === tab.route ||
            (tab.route === 'SellerProducts' && active === 'SellerOrders');
          return (
            <Pressable
              key={tab.route}
              onPress={() => !selected && navigation.push(tab.route)}
              style={s.sellerNavItem}
            >
              <View
                style={[s.sellerNavIcon, selected && s.sellerNavIconActive]}
              >
                <Icon
                  name={tab.icon}
                  size={17}
                  color={selected ? colors.white : colors.textMuted}
                />
              </View>
              <Text
                style={[s.sellerNavLabel, selected && s.sellerNavLabelActive]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export function SellerDashboardScreen({ navigation }: ScreenProps) {
  const { activeSeller } = useSeller();
  const bars = [42, 66, 48, 78, 58, 92, 73];
  return (
    <Screen scroll={false}>
      <Header
        title="Seller Dashboard"
        navigation={navigation}
        right={
          <Pressable
            onPress={() => navigation.push('Notifications')}
            style={s.darkButton}
          >
            <Icon name="bell" color={colors.white} />
          </Pressable>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <RoleTop
          label="SELLER MODE"
          name={activeSeller?.name || 'Loveraf Official Store'}
          status={
            activeSeller
              ? `${activeSeller.handle} · ${activeSeller.category}`
              : 'Verified · Excellent health'
          }
        />
        <View style={s.body}>
          <View style={s.metrics}>
            <MetricCard
              label="Today’s sales"
              value="৳28.4K"
              icon="wallet"
              tone={colors.success}
            />
            <MetricCard label="New orders" value="18" icon="orders" />
            <MetricCard
              label="Visitors"
              value="1.2K"
              icon="user"
              tone={colors.info}
            />
          </View>
          <View style={s.chartCard}>
            <View style={s.chartHead}>
              <View>
                <Text style={s.chartTitle}>Sales overview</Text>
                <Text style={s.chartSub}>৳1,42,800 this week · +18.4%</Text>
              </View>
              <StatusPill text="7 DAYS" tone="info" />
            </View>
            <View style={s.chart}>
              {bars.map((height, index) => (
                <View key={index} style={s.barColumn}>
                  <View
                    style={[s.bar, { height }, index === 5 && s.barActive]}
                  />
                  <Text style={s.barLabel}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'][index]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <SectionHeader title="Quick management" />
          <View style={s.quickRow}>
            <Pressable
              onPress={() => navigation.push('SellerProducts')}
              style={s.quickCard}
            >
              <View style={s.quickIcon}>
                <Icon name="package" color={colors.accent} />
              </View>
              <Text style={s.quickTitle}>Products</Text>
              <Text style={s.quickSub}>24 live · 3 low stock</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.push('SellerOrders')}
              style={s.quickCard}
            >
              <View style={[s.quickIcon, { backgroundColor: colors.infoSoft }]}>
                <Icon name="orders" color={colors.info} />
              </View>
              <Text style={s.quickTitle}>Orders</Text>
              <Text style={s.quickSub}>8 need attention</Text>
            </Pressable>
          </View>
          <SectionHeader title="Needs attention" />
          <View style={s.alertCard}>
            <View style={s.alertIcon}>
              <Icon name="clock" color={colors.warning} />
            </View>
            <View style={s.flex}>
              <Text style={s.alertTitle}>5 orders to pack today</Text>
              <Text style={s.alertText}>
                Pack before 4:00 PM to protect on-time score.
              </Text>
            </View>
            <Icon name="chevron" color={colors.textMuted} />
          </View>
        </View>
      </ScrollView>
      <SellerBottomNav active="SellerDashboard" navigation={navigation} />
    </Screen>
  );
}

/* eslint-disable react-hooks/exhaustive-deps */
export function SellerProductsScreen({ navigation }: ScreenProps) {
  const [tab, setTab] = useState('All');
  const {products: buyerProducts,sellerProducts,loadSellerProducts} = useCatalog();
  const {activeSeller}=useSeller();
  const catalogProducts=fixtureMode?buyerProducts:sellerProducts;
  useEffect(()=>{if(!fixtureMode && activeSeller)loadSellerProducts(activeSeller.id).catch(e=>Alert.alert('Products',e.message));},[activeSeller?.id]);
  return (
    <Screen scroll={false}>
      <Header
        title="My Products"
        navigation={navigation}
        right={
          <Pressable
            onPress={() => navigation.push('SellerUpload')}
            style={s.addButton}
          >
            <Icon name="plus" color={colors.white} />
          </Pressable>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.manageQuickRow}>
          <View style={s.manageQuickActive}>
            <Icon name="package" size={17} color={colors.accent} />
            <Text style={s.manageQuickActiveText}>Products</Text>
          </View>
          <Pressable
            onPress={() => navigation.push('SellerOrders')}
            style={s.manageQuickButton}
          >
            <Icon name="orders" size={17} color={colors.textSoft} />
            <Text style={s.manageQuickText}>Orders</Text>
          </Pressable>
        </View>
        <View style={s.roleTabs}>
          {['All', 'Live', 'Draft', 'Low stock'].map(item => (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              style={[s.roleTab, item === tab && s.roleTabActive]}
            >
              <Text
                style={[s.roleTabText, item === tab && s.roleTabTextActive]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.body}>
          <View style={s.searchMock}>
            <Icon name="search" color={colors.textMuted} />
            <Text style={s.searchText}>Search your catalogue...</Text>
            <Icon name="filter" color={colors.accent} />
          </View>
          {catalogProducts.slice(0, 12).map((product, index) => (
            <View key={product.id} style={s.productLine}>
              <View style={[s.productArt, { backgroundColor: product.color }]}>
                <ProductMedia image={product.images?.[0]} fallbackArt={product.art} size={67} />
              </View>
              <View style={s.flex}>
                <Text numberOfLines={2} style={s.productName}>
                  {product.title}
                </Text>
                <Text style={s.productSku}>
                  SKU {product.sku || `LRF-${1024 + index}`} · {money(product.price)}
                </Text>
                <View style={s.productMeta}>
                  <StatusPill
                    text={product.status?.toUpperCase() || (fixtureMode ? 'LIVE' : 'PENDING')}
                    tone={index === 2 ? 'warning' : 'success'}
                  />
                  <Text style={s.stockText}>
                    {product.stock ?? (index === 2 ? 3 : 18 + index * 7)} in stock
                  </Text>
                </View>
              </View>
              <Pressable style={s.moreButton}>
                <Text style={s.moreText}>•••</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
      <SellerBottomNav active="SellerProducts" navigation={navigation} />
    </Screen>
  );
}

export function SellerOrdersScreen({ navigation }: ScreenProps) {
  const [tab, setTab] = useState('To pack');
  const orders = [
    {
      id: '#LRF-1048',
      buyer: 'Rafiqul Islam',
      total: '৳7,220',
      items: 2,
      status: 'PACK BY 4 PM',
    },
    {
      id: '#LRF-1046',
      buyer: 'Maliha Noor',
      total: '৳3,590',
      items: 1,
      status: 'PACK BY 6 PM',
    },
    {
      id: '#LRF-1041',
      buyer: 'Hasan Mahmud',
      total: '৳12,880',
      items: 3,
      status: 'READY',
    },
  ];
  return (
    <Screen scroll={false}>
      <Header title="Seller Orders" navigation={navigation} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.roleTabs}>
          {['To pack', 'Ready', 'Shipped', 'Returns'].map(item => (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              style={[s.roleTab, item === tab && s.roleTabActive]}
            >
              <Text
                style={[s.roleTabText, item === tab && s.roleTabTextActive]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.body}>
          {orders.map((order, index) => (
            <View key={order.id} style={s.sellerOrder}>
              <View style={s.orderHead}>
                <View>
                  <Text style={s.orderId}>Order {order.id}</Text>
                  <Text style={s.orderBuyer}>
                    {order.buyer} · {order.items} items
                  </Text>
                </View>
                <StatusPill
                  text={order.status}
                  tone={index === 2 ? 'success' : 'warning'}
                />
              </View>
              <View style={s.orderProductRow}>
                {products.slice(index, index + order.items).map(product => (
                  <View
                    key={product.id}
                    style={[
                      s.orderProductArt,
                      { backgroundColor: product.color },
                    ]}
                  >
                    <ProductArt type={product.art} size={49} />
                  </View>
                ))}
              </View>
              <View style={s.orderFoot}>
                <Text style={s.orderTotal}>{order.total}</Text>
                <Pressable style={s.outlineMini}>
                  <Text style={s.outlineMiniText}>View</Text>
                </Pressable>
                <Pressable style={s.primaryMini}>
                  <Text style={s.primaryMiniText}>
                    {index === 2 ? 'Handover' : 'Pack now'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <SellerBottomNav active="SellerOrders" navigation={navigation} />
    </Screen>
  );
}

export function SellerUploadScreen({ navigation }: ScreenProps) {
  const {publishProduct} = useCatalog();
  const {activeSeller}=useSeller();
  const [publishing,setPublishing]=useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('');
  const [sold, setSold] = useState('0');
  const [sizes, setSizes] = useState('36, 38, 40, 42');
  const [returnDays, setReturnDays] = useState('3');
  const [exchangeDays, setExchangeDays] = useState('3');
  const [deliveryMin, setDeliveryMin] = useState('2');
  const [deliveryMax, setDeliveryMax] = useState('3');
  const [codAvailable, setCodAvailable] = useState(true);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([
    {name: 'Red', swatch: '#F5164B', imageIds: []},
    {name: 'Blue', swatch: '#2E6FF2', imageIds: []},
    {name: 'Black', swatch: '#071120', imageIds: []},
  ]);
  const [activeVariant, setActiveVariant] = useState(0);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#7F56D9');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pickerError, setPickerError] = useState('');
  const [saved, setSaved] = useState(false);
  const pickImages = async () => {
    setPickerError('');
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: Math.max(1, 8 - images.length),
      quality: 0.9,
    });
    if (result.didCancel) {
      return;
    }
    if (result.errorCode) {
      setPickerError(
        result.errorCode === 'permission'
          ? 'Photo permission is required to select product images.'
          : result.errorMessage || 'Could not open the photo gallery.',
      );
      return;
    }
    const picked = (result.assets || [])
      .filter(asset => Boolean(asset.uri))
      .map((asset, index) => ({
        id: `seller-image-${Date.now()}-${index}`,
        uri: asset.uri,
        color: '#EEF1F6',
      }));
    setImages(current => [...current, ...picked].slice(0, 8));
  };
  const toggleVariantImage = (imageId: string) => {
    setVariants(current =>
      current.map((variant, index) =>
        index !== activeVariant
          ? variant
          : {
              ...variant,
              imageIds: variant.imageIds.includes(imageId)
                ? variant.imageIds.filter(id => id !== imageId)
                : [...variant.imageIds, imageId],
            },
      ),
    );
  };
  const addVariant = () => {
    const name = newColorName.trim();
    if (!name || !/^#[0-9A-F]{6}$/i.test(newColorHex)) {
      setErrors(current => ({
        ...current,
        color: 'Enter a color name and a valid 6-digit HEX value.',
      }));
      return;
    }
    setVariants(current => [
      ...current,
      {name, swatch: newColorHex.toUpperCase(), imageIds: []},
    ]);
    setActiveVariant(variants.length);
    setNewColorName('');
    setErrors(current => ({...current, color: ''}));
  };
  const validateAndPublish = async () => {
    if(publishing)return;
    const next: Record<string, string> = {};
    const regular = Number(regularPrice);
    const sale = salePrice ? Number(salePrice) : 0;
    const stockCount = Number(stock);
    if (!title.trim()) next.title = 'Product title is required.';
    if (!description.trim()) next.description = 'Add a product description.';
    if (!category.trim()) next.category = 'Category is required.';
    if (!sku.trim()) next.sku = 'SKU is required.';
    if (!regularPrice || !Number.isFinite(regular) || regular <= 0)
      next.regularPrice = 'Enter a valid regular price.';
    if (salePrice && (!Number.isFinite(sale) || sale <= 0 || sale >= regular))
      next.salePrice = 'Sale price must be lower than regular price.';
    if (!stock || !Number.isInteger(stockCount) || stockCount < 0)
      next.stock = 'Enter a valid whole-number stock quantity.';
    if (!images.length) next.images = 'Add at least one product image.';
    if (variants.some(variant => !variant.imageIds.length))
      next.variants = 'Assign at least one image to every color.';
    if (Number(deliveryMax) < Number(deliveryMin))
      next.delivery = 'Maximum delivery day cannot be lower than minimum.';
    setErrors(next);
    if (Object.keys(next).length) return;
    const imageWithVariants = images.map(image => ({
      ...image,
      variantName: variants.find(variant => variant.imageIds.includes(image.id))
        ?.name,
    }));
    const product: Product = {
      id: `seller-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      sku: sku.trim(),
      price: sale || regular,
      oldPrice: sale ? regular : undefined,
      stock: stockCount,
      sold: String(Math.max(0, Number(sold) || 0)),
      rating: 5,
      art: 'watch',
      color: variants[0]?.swatch ? `${variants[0].swatch}20` : '#EEF1F6',
      badge: sale ? 'SALE' : 'NEW',
      sizes: sizes.split(',').map(item => item.trim()).filter(Boolean),
      images: imageWithVariants,
      variants,
      returnDays: Math.max(0, Number(returnDays) || 0),
      exchangeDays: Math.max(0, Number(exchangeDays) || 0),
      deliveryMinDays: Math.max(0, Number(deliveryMin) || 0),
      deliveryMaxDays: Math.max(0, Number(deliveryMax) || 0),
      codAvailable,
      sellerCreated: true,
    };
    setPublishing(true);
    try {await publishProduct(product,activeSeller?.id);setSaved(true);Alert.alert('Product submitted','Your product will appear after administrator approval.');}
    catch(error){Alert.alert('Product',error instanceof Error?error.message:'Product could not be submitted.');}
    finally{setPublishing(false);}
  };
  const field = (
    key: string,
    label: string,
    value: string,
    setter: (value: string) => void,
    placeholder: string,
    numeric = false,
  ) => (
    <View style={s.uploadField}>
      <Text style={s.uploadLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={setter}
        keyboardType={numeric ? 'numeric' : 'default'}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[s.uploadInput, errors[key] && s.uploadInputError]}
      />
      {Boolean(errors[key]) && <Text style={s.uploadError}>{errors[key]}</Text>}
    </View>
  );
  return (
    <Screen scroll={false}>
      <Header title="Upload Product" navigation={navigation} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.uploadBody}
      >
        <View style={s.uploadIntro}>
          <View style={s.uploadIntroIcon}>
            <Icon name="sparkles" color={colors.white} size={25} />
          </View>
          <View style={s.flex}>
            <Text style={s.uploadIntroTitle}>Add a new product</Text>
            <Text style={s.uploadIntroText}>
              Add complete listing details, then map every color to its photos.
            </Text>
          </View>
        </View>
        {saved && (
          <View style={s.uploadSuccess}>
            <Icon name="check" color={colors.success} size={20} />
            <Text style={s.uploadSuccessText}>
              Product published and is now visible to buyers.
            </Text>
          </View>
        )}
        <View style={s.uploadCard}>
          <Text style={s.uploadLabel}>PRODUCT PHOTOS</Text>
          <Pressable onPress={pickImages} style={s.photoUpload}>
            <View style={s.photoUploadIcon}>
              <Icon name="plus" color={colors.accent} />
            </View>
            <Text style={s.photoUploadTitle}>
              {images.length ? 'Add more photos' : 'Choose from phone gallery'}
            </Text>
            <Text style={s.photoUploadText}>Up to 8 images · JPG or PNG</Text>
          </Pressable>
          {Boolean(pickerError || errors.images) && (
            <Text style={s.uploadError}>{pickerError || errors.images}</Text>
          )}
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.uploadPhotos}>
              {images.map((image, index) => (
                <View key={image.id} style={s.uploadPhotoWrap}>
                  <Image source={{uri: image.uri}} style={s.uploadPhoto} />
                  {index === 0 && <Text style={s.coverBadge}>COVER</Text>}
                </View>
              ))}
            </ScrollView>
          )}
          {field('title', 'PRODUCT TITLE', title, setTitle, 'What are you selling?')}
          {field('sku', 'SKU', sku, setSku, 'LRF-WATCH-001')}
          {field('category', 'CATEGORY', category, setCategory, 'Fashion, Electronics...')}
          <View style={s.uploadInputRow}>
            {field('regularPrice', 'REGULAR PRICE', regularPrice, setRegularPrice, '৳ 0', true)}
            {field('salePrice', 'SALE PRICE', salePrice, setSalePrice, 'Optional', true)}
          </View>
          <View style={s.uploadInputRow}>
            {field('stock', 'STOCK', stock, setStock, '0', true)}
            {field('sold', 'SOLD COUNT', sold, setSold, '0', true)}
          </View>
          <Text style={s.uploadLabel}>DESCRIPTION</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Describe quality, material and key features..."
            placeholderTextColor={colors.textMuted}
            style={[s.uploadInput, s.uploadDescription, errors.description && s.uploadInputError]}
          />
          {Boolean(errors.description) && <Text style={s.uploadError}>{errors.description}</Text>}
          {field('sizes', 'SIZES (COMMA SEPARATED)', sizes, setSizes, 'S, M, L, XL')}
          <View style={s.uploadSectionHead}>
            <View>
              <Text style={s.uploadLabel}>COLOR & IMAGE MAPPING</Text>
              <Text style={s.mappingHelp}>Select a color, then tap all matching photos.</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.variantTabs}>
            {variants.map((variant, index) => (
              <Pressable key={`${variant.name}-${index}`} onPress={() => setActiveVariant(index)} style={[s.variantMapChip, activeVariant === index && s.variantMapChipActive]}>
                <View style={[s.variantMapDot, {backgroundColor: variant.swatch}]} />
                <Text style={[s.variantMapText, activeVariant === index && s.variantMapTextActive]}>{variant.name} · {variant.imageIds.length}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={s.mappingImages}>
            {images.map(image => {
              const selected = variants[activeVariant]?.imageIds.includes(image.id);
              return (
                <Pressable key={`map-${image.id}`} onPress={() => toggleVariantImage(image.id)} style={[s.mappingImage, selected && s.mappingImageSelected]}>
                  <Image source={{uri: image.uri}} style={s.mappingImageAsset} />
                  {selected && <View style={s.mappingCheck}><Icon name="check" size={12} color={colors.white} /></View>}
                </Pressable>
              );
            })}
          </View>
          {Boolean(errors.variants) && <Text style={s.uploadError}>{errors.variants}</Text>}
          <View style={s.addColorRow}>
            <TextInput value={newColorName} onChangeText={setNewColorName} placeholder="Color name" placeholderTextColor={colors.textMuted} style={[s.uploadInput, s.flex]} />
            <TextInput value={newColorHex} onChangeText={setNewColorHex} autoCapitalize="characters" placeholder="#000000" placeholderTextColor={colors.textMuted} style={[s.uploadInput, s.hexInput]} />
            <Pressable onPress={addVariant} style={s.addColorButton}><Icon name="plus" size={17} color={colors.white} /></Pressable>
          </View>
          {Boolean(errors.color) && <Text style={s.uploadError}>{errors.color}</Text>}
          <Text style={s.uploadLabel}>FULFILMENT & POLICY</Text>
          <View style={s.uploadInputRow}>
            {field('returnDays', 'RETURN DAYS', returnDays, setReturnDays, '3', true)}
            {field('exchangeDays', 'EXCHANGE DAYS', exchangeDays, setExchangeDays, '3', true)}
          </View>
          <View style={s.uploadInputRow}>
            {field('delivery', 'DELIVERY MIN', deliveryMin, setDeliveryMin, '2', true)}
            {field('delivery', 'DELIVERY MAX', deliveryMax, setDeliveryMax, '3', true)}
          </View>
          <View style={s.codRow}>
            <View><Text style={s.codTitle}>Cash on Delivery</Text><Text style={s.codSub}>Allow buyers to pay on delivery</Text></View>
            <Switch value={codAvailable} onValueChange={setCodAvailable} trackColor={{false: colors.line, true: '#F9A0B7'}} thumbColor={codAvailable ? colors.accent : colors.textMuted} />
          </View>
          <View style={s.publishStatus}><View style={s.publishDot} /><Text style={s.publishStatusText}>Status: Published immediately</Text></View>
          <Pressable
            onPress={validateAndPublish}
            style={s.publishButton}
          >
            <Icon name="package" color={colors.white} size={19} />
            <Text style={s.publishButtonText}>Publish Product</Text>
          </Pressable>
        </View>
      </ScrollView>
      <SellerBottomNav active="SellerUpload" navigation={navigation} />
    </Screen>
  );
}

export function SellerInboxScreen({ navigation }: ScreenProps) {
  const conversations = [
    ['RI', 'Rafiqul Islam', 'Is this available in black?', 'Now', '2'],
    ['MN', 'Maliha Noor', 'Please confirm today’s delivery.', '10:36 AM', '1'],
    ['HM', 'Hasan Mahmud', 'Thank you, I received the item.', 'Yesterday', ''],
  ];
  return (
    <Screen scroll={false}>
      <Header
        title="Seller Chat"
        navigation={navigation}
        right={
          <View style={s.sellerOnline}>
            <View style={s.sellerOnlineDot} />
            <Text style={s.sellerOnlineText}>Online</Text>
          </View>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.sellerInboxBody}
      >
        <View style={s.sellerInboxLead}>
          <Text style={s.sellerInboxTitle}>Customer conversations</Text>
          <Text style={s.sellerInboxSub}>
            Reply quickly to improve your seller score.
          </Text>
        </View>
        {conversations.map(item => (
          <Pressable
            key={item[1]}
            onPress={() => navigation.push('Chat', { name: item[1] })}
            style={s.sellerChatRow}
          >
            <View style={s.sellerChatAvatar}>
              <Text style={s.sellerChatAvatarText}>{item[0]}</Text>
            </View>
            <View style={s.flex}>
              <View style={s.sellerChatTop}>
                <Text style={s.sellerChatName}>{item[1]}</Text>
                <Text style={s.sellerChatTime}>{item[3]}</Text>
              </View>
              <Text numberOfLines={1} style={s.sellerChatPreview}>
                {item[2]}
              </Text>
            </View>
            {!!item[4] && (
              <View style={s.sellerChatBadge}>
                <Text style={s.sellerChatBadgeText}>{item[4]}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
      <SellerBottomNav active="SellerInbox" navigation={navigation} />
    </Screen>
  );
}

export function DeliveryDashboardScreen({ navigation }: ScreenProps) {
  const [online, setOnline] = useState(true);
  const jobs = [
    {
      id: 'LRF-1048',
      from: 'Dhanmondi Seller Hub',
      to: 'Road 5, Dhanmondi',
      pay: '৳85',
      distance: '2.8 km',
      status: 'PICKUP',
    },
    {
      id: 'LRF-1046',
      from: 'Banani Collection Point',
      to: 'Gulshan 1, Dhaka',
      pay: '৳110',
      distance: '4.2 km',
      status: 'NEXT',
    },
  ];
  return (
    <Screen>
      <Header
        title="Delivery Partner"
        navigation={navigation}
        right={
          <Pressable style={s.darkButton}>
            <Icon name="bell" color={colors.white} />
          </Pressable>
        }
      />
      <View style={s.deliveryTop}>
        <View style={s.deliveryStatus}>
          <View>
            <Text style={s.deliveryHello}>Good afternoon, Arif</Text>
            <Text style={s.deliverySub}>Ready for a smooth route?</Text>
          </View>
          <Pressable
            onPress={() => setOnline(!online)}
            style={[s.onlineSwitch, online && s.onlineSwitchActive]}
          >
            <View style={[s.onlineThumb, online && s.onlineThumbActive]} />
            <Text style={[s.onlineText, online && s.onlineTextActive]}>
              {online ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </Pressable>
        </View>
        <View style={s.deliveryMetrics}>
          <View>
            <Text style={s.deliveryMetricValue}>৳1,240</Text>
            <Text style={s.deliveryMetricLabel}>Today’s earnings</Text>
          </View>
          <View style={s.deliveryMetricRule} />
          <View>
            <Text style={s.deliveryMetricValue}>14</Text>
            <Text style={s.deliveryMetricLabel}>Delivered</Text>
          </View>
          <View style={s.deliveryMetricRule} />
          <View>
            <Text style={s.deliveryMetricValue}>4.9</Text>
            <Text style={s.deliveryMetricLabel}>Rating</Text>
          </View>
        </View>
      </View>
      <View style={s.body}>
        <View style={s.routeCard}>
          <View style={s.routeMap}>
            <View style={s.routeRoad} />
            <View style={s.routeStart}>
              <Icon name="package" color={colors.white} size={18} />
            </View>
            <View style={s.routeEnd}>
              <Icon name="pin" color={colors.white} size={18} />
            </View>
          </View>
          <View style={s.routeSummary}>
            <View>
              <Text style={s.routeKicker}>ACTIVE ROUTE</Text>
              <Text style={s.routeTitle}>2 stops · 7.0 km</Text>
            </View>
            <Pressable style={s.routeGo}>
              <Icon name="chevron" color={colors.white} />
            </Pressable>
          </View>
        </View>
        <SectionHeader title="Assigned deliveries" action="Route order" />
        {jobs.map((job, index) => (
          <View key={job.id} style={s.jobCard}>
            <View style={s.jobTop}>
              <StatusPill
                text={job.status}
                tone={index === 0 ? 'accent' : 'info'}
              />
              <Text style={s.jobId}>#{job.id}</Text>
              <Text style={s.jobPay}>{job.pay}</Text>
            </View>
            <View style={s.addressRoute}>
              <View style={s.routeRail}>
                <View style={s.fromDot} />
                <View style={s.routeLine} />
                <View style={s.toDot} />
              </View>
              <View style={s.flex}>
                <Text style={s.routeLabel}>PICK UP FROM</Text>
                <Text style={s.routeAddress}>{job.from}</Text>
                <Text style={[s.routeLabel, { marginTop: 14 }]}>
                  DELIVER TO
                </Text>
                <Text style={s.routeAddress}>{job.to}</Text>
              </View>
              <Text style={s.distance}>{job.distance}</Text>
            </View>
            <View style={s.jobActions}>
              <View style={s.flex}>
                <PrimaryButton title="Call" outline icon="phone" />
              </View>
              <View style={s.flex}>
                <PrimaryButton
                  title={index === 0 ? 'Start pickup' : 'View stop'}
                  icon="chevron"
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  sellerNavSafe: { backgroundColor: colors.white },
  sellerNav: {
    height: chrome.navHeight,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  sellerNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sellerNavIcon: {
    width: 31,
    height: 25,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerNavIconActive: { backgroundColor: colors.accent },
  sellerNavLabel: {
    fontSize: 8,
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: 3,
  },
  sellerNavLabelActive: { color: colors.accent, fontWeight: '900' },
  darkButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#FFFFFF12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTop: {
    backgroundColor: colors.ink,
    padding: 18,
    paddingBottom: 21,
    overflow: 'hidden',
  },
  roleTopGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 110,
    backgroundColor: '#1B3C65',
    opacity: 0.3,
    right: -70,
    top: -90,
  },
  roleBadge: {
    position: 'absolute',
    right: 17,
    top: 17,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  roleBadgeText: {
    fontSize: 7,
    color: colors.white,
    letterSpacing: 1,
    fontWeight: '800',
  },
  roleIdentity: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  roleAvatar: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleName: { fontSize: 18, color: colors.white, fontWeight: '800' },
  roleStatus: { fontSize: 9.5, color: colors.success, marginTop: 5 },
  body: { padding: 16, paddingBottom: 40 },
  metrics: { flexDirection: 'row', gap: 8 },
  chartCard: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 14,
  },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between' },
  chartTitle: { fontSize: 14, color: colors.text, fontWeight: '800' },
  chartSub: { fontSize: 9, color: colors.success, marginTop: 4 },
  chart: {
    height: 122,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  barColumn: { height: 115, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 18, borderRadius: 8, backgroundColor: '#DDE3EB' },
  barActive: { backgroundColor: colors.accent },
  barLabel: { fontSize: 8, color: colors.textMuted, marginTop: 7 },
  quickRow: { flexDirection: 'row', gap: 11 },
  quickCard: {
    ...shadow,
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 15,
  },
  quickIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '800',
    marginTop: 13,
  },
  quickSub: { fontSize: 8.5, color: colors.textSoft, marginTop: 4 },
  alertCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  alertTitle: { fontSize: 11.5, color: colors.text, fontWeight: '800' },
  alertText: { fontSize: 8.5, color: colors.textSoft, marginTop: 4 },
  addButton: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageQuickRow: {
    flexDirection: 'row',
    gap: 9,
    backgroundColor: colors.ink,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  manageQuickActive: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  manageQuickButton: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.inkCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  manageQuickActiveText: {
    fontSize: 9.5,
    color: colors.accent,
    fontWeight: '900',
  },
  manageQuickText: {
    fontSize: 9.5,
    color: colors.textMuted,
    fontWeight: '800',
  },
  roleTabs: {
    height: 54,
    flexDirection: 'row',
    backgroundColor: colors.ink,
    paddingHorizontal: 10,
  },
  roleTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  roleTabActive: { borderBottomColor: colors.accent },
  roleTabText: { fontSize: 9.5, color: '#93A1B4' },
  roleTabTextActive: { color: colors.white, fontWeight: '800' },
  searchMock: {
    height: 49,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginBottom: 13,
    ...shadow,
  },
  searchText: {
    fontSize: 10.5,
    color: colors.textMuted,
    flex: 1,
    marginLeft: 9,
  },
  productLine: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },
  productArt: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  productName: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.text,
    fontWeight: '700',
    paddingRight: 15,
  },
  productSku: { fontSize: 8, color: colors.textSoft, marginTop: 4 },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },
  stockText: { fontSize: 8.5, color: colors.textSoft },
  moreButton: { position: 'absolute', top: 9, right: 9, padding: 5 },
  moreText: { color: colors.textMuted, fontWeight: '800' },
  sellerOrder: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 13,
  },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between' },
  orderId: { fontSize: 12, color: colors.text, fontWeight: '800' },
  orderBuyer: { fontSize: 8.5, color: colors.textSoft, marginTop: 4 },
  orderProductRow: { flexDirection: 'row', gap: 7, marginTop: 13 },
  orderProductArt: {
    width: 58,
    height: 58,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderFoot: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 11,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderTotal: { fontSize: 13, color: colors.text, fontWeight: '800', flex: 1 },
  outlineMini: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  outlineMiniText: { fontSize: 9, color: colors.accent, fontWeight: '700' },
  primaryMini: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  primaryMiniText: { fontSize: 9, color: colors.white, fontWeight: '700' },
  uploadBody: { padding: 16, paddingBottom: 30 },
  uploadIntro: {
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    minHeight: 104,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadIntroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  uploadIntroTitle: { color: colors.white, fontSize: 16, fontWeight: '900' },
  uploadIntroText: {
    color: '#AEB9C9',
    fontSize: 8.5,
    lineHeight: 13,
    marginTop: 5,
  },
  uploadSuccess: {
    minHeight: 45,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    marginTop: 12,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadSuccessText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
  },
  uploadCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 15,
    marginTop: 13,
    ...shadow,
  },
  uploadLabel: {
    color: colors.textSoft,
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: '900',
    marginTop: 13,
    marginBottom: 7,
  },
  photoUpload: {
    height: 128,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F6A1B7',
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadTitle: {
    color: colors.text,
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 8,
  },
  photoUploadText: { color: colors.textMuted, fontSize: 8, marginTop: 3 },
  uploadPhotos: {gap: 9, paddingTop: 10, paddingBottom: 2},
  uploadPhotoWrap: {position: 'relative'},
  uploadPhoto: {width: 76, height: 76, borderRadius: 13, backgroundColor: colors.surfaceAlt},
  coverBadge: {
    position: 'absolute', left: 5, bottom: 5, backgroundColor: colors.ink,
    color: colors.white, fontSize: 6.5, fontWeight: '900', paddingHorizontal: 5,
    paddingVertical: 3, borderRadius: radius.pill,
  },
  uploadField: {flex: 1},
  uploadInput: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
    color: colors.text,
    fontSize: 11,
    paddingHorizontal: 12,
  },
  uploadInputRow: { flexDirection: 'row', gap: 10 },
  uploadInputError: {borderColor: colors.accent, backgroundColor: '#FFF7F9'},
  uploadError: {fontSize: 8.5, lineHeight: 12, color: colors.accent, marginTop: 4},
  uploadDescription: { height: 86, paddingTop: 12, textAlignVertical: 'top' },
  uploadSectionHead: {marginTop: 3, flexDirection: 'row', justifyContent: 'space-between'},
  mappingHelp: {fontSize: 8.5, color: colors.textMuted, marginBottom: 8},
  variantTabs: {gap: 7, paddingBottom: 10},
  variantMapChip: {
    minHeight: 36, borderRadius: radius.pill, paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.line,
  },
  variantMapChipActive: {borderColor: colors.accent, backgroundColor: colors.accentSoft},
  variantMapDot: {width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#CDD2DA'},
  variantMapText: {fontSize: 9, color: colors.textSoft, fontWeight: '700'},
  variantMapTextActive: {color: colors.accent, fontWeight: '900'},
  mappingImages: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  mappingImage: {
    width: 62, height: 62, borderRadius: 12, overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent', position: 'relative',
  },
  mappingImageSelected: {borderColor: colors.success},
  mappingImageAsset: {width: '100%', height: '100%'},
  mappingCheck: {
    position: 'absolute', right: 3, bottom: 3, width: 20, height: 20,
    borderRadius: 10, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center',
  },
  addColorRow: {flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10},
  hexInput: {width: 98},
  addColorButton: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  codRow: {
    minHeight: 64, borderRadius: radius.md, backgroundColor: colors.canvas,
    paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 4,
  },
  codTitle: {fontSize: 11, color: colors.text, fontWeight: '800'},
  codSub: {fontSize: 8, color: colors.textMuted, marginTop: 3},
  publishStatus: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13},
  publishDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success},
  publishStatusText: {fontSize: 8.5, color: colors.success, fontWeight: '700'},
  publishButton: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  publishButtonDisabled: { backgroundColor: colors.textMuted },
  publishButtonText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  sellerOnline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sellerOnlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  sellerOnlineText: { color: colors.white, fontSize: 8.5, fontWeight: '700' },
  sellerInboxBody: { padding: 15, paddingBottom: 30 },
  sellerInboxLead: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: 15,
    marginBottom: 12,
  },
  sellerInboxTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  sellerInboxSub: { color: colors.textSoft, fontSize: 8.5, marginTop: 4 },
  sellerChatRow: {
    minHeight: 74,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 11,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  sellerChatAvatar: {
    width: 47,
    height: 47,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sellerChatAvatarText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  sellerChatTop: { flexDirection: 'row', justifyContent: 'space-between' },
  sellerChatName: { color: colors.text, fontSize: 11.5, fontWeight: '800' },
  sellerChatTime: { color: colors.textMuted, fontSize: 7.5 },
  sellerChatPreview: { color: colors.textSoft, fontSize: 9, marginTop: 5 },
  sellerChatBadge: {
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sellerChatBadgeText: { color: colors.white, fontSize: 8, fontWeight: '900' },
  deliveryTop: { backgroundColor: colors.ink, padding: 18, paddingBottom: 22 },
  deliveryStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryHello: { fontSize: 19, color: colors.white, fontWeight: '800' },
  deliverySub: { fontSize: 9, color: '#9BA9BB', marginTop: 5 },
  onlineSwitch: {
    width: 92,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: '#253247',
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineSwitchActive: { backgroundColor: '#194D3D' },
  onlineThumb: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.textMuted,
  },
  onlineThumbActive: { backgroundColor: colors.success },
  onlineText: {
    fontSize: 7,
    color: '#A0ACBC',
    fontWeight: '800',
    marginLeft: 6,
  },
  onlineTextActive: { color: colors.white },
  deliveryMetrics: {
    height: 76,
    borderRadius: radius.md,
    backgroundColor: '#111F33',
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  deliveryMetricValue: { fontSize: 16, color: colors.white, fontWeight: '800' },
  deliveryMetricLabel: { fontSize: 7.5, color: '#8D9DB1', marginTop: 4 },
  deliveryMetricRule: { width: 1, height: 30, backgroundColor: '#2A394D' },
  routeCard: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  routeMap: { height: 120, backgroundColor: '#E7ECF2', overflow: 'hidden' },
  routeRoad: {
    position: 'absolute',
    width: 430,
    height: 31,
    backgroundColor: colors.white,
    top: 45,
    left: -20,
    transform: [{ rotate: '-8deg' }],
  },
  routeStart: {
    position: 'absolute',
    left: 80,
    top: 51,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeEnd: {
    position: 'absolute',
    right: 63,
    top: 24,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeSummary: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeKicker: {
    fontSize: 7.5,
    color: colors.accent,
    letterSpacing: 1.1,
    fontWeight: '800',
  },
  routeTitle: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '800',
    marginTop: 5,
  },
  routeGo: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobCard: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 13,
  },
  jobTop: { flexDirection: 'row', alignItems: 'center' },
  jobId: { fontSize: 9, color: colors.textSoft, marginLeft: 8, flex: 1 },
  jobPay: { fontSize: 14, color: colors.success, fontWeight: '800' },
  addressRoute: { flexDirection: 'row', marginTop: 15 },
  routeRail: { width: 30, alignItems: 'center' },
  fromDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
  routeLine: { height: 41, width: 2, backgroundColor: colors.line },
  toDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  routeLabel: {
    fontSize: 7,
    color: colors.textMuted,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  routeAddress: {
    fontSize: 10.5,
    color: colors.text,
    fontWeight: '700',
    marginTop: 3,
  },
  distance: { fontSize: 9, color: colors.textSoft },
  jobActions: { flexDirection: 'row', gap: 9, marginTop: 16 },
});
