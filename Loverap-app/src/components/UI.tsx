import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { money } from '../data';
import { chrome, colors, radius, shadow } from '../theme';
import { Navigation, Product, ProductImage, RouteName } from '../types';
import { BrandLogo } from './BrandLogo';
import { Icon } from './Icon';
import { ProductArt } from './ProductArt';
import { useCart } from '../cart';
import {Text, TextInput} from './Typography';

export function Screen({
  children,
  style,
  scroll = true,
  dark = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scroll?: boolean;
  dark?: boolean;
}) {
  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, style]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, style]}>{children}</View>
  );
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, dark && styles.darkSafe]}
    >
      {content}
    </SafeAreaView>
  );
}

export function Header({
  title,
  navigation,
  right,
  logo = false,
  leftExtra,
}: {
  title?: string;
  navigation?: Navigation;
  right?: React.ReactNode;
  logo?: boolean;
  leftExtra?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerGlow} />
      {navigation ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={navigation.back}
          style={styles.headerIcon}
        >
          <Icon name="back" size={20} color={colors.white} />
        </Pressable>
      ) : logo ? (
        <BrandLogo compact />
      ) : (
        <View style={styles.headerIcon} />
      )}
      {leftExtra}
      {logo ? (
        <View style={styles.headerTitle} />
      ) : (
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
      )}
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

const tabs: { name: string; icon: string; route: RouteName }[] = [
  { name: 'Home', icon: 'home', route: 'Home' },
  { name: 'Categories', icon: 'grid', route: 'Categories' },
  { name: 'Cart', icon: 'cart', route: 'Cart' },
  { name: 'Chat', icon: 'chat', route: 'Messages' },
  { name: 'Profile', icon: 'user', route: 'Profile' },
];

export function BottomNav({
  active,
  navigation,
}: {
  active: RouteName;
  navigation: Navigation;
}) {
  const { itemCount } = useCart();
  return (
    <SafeAreaView edges={['bottom']} style={styles.navSafe}>
      <View style={styles.bottomNav}>
        {tabs.map(tab => {
          const selected = active === tab.route;
          return (
            <Pressable
              key={tab.route}
              onPress={() => {
                if (!selected) {
                  navigation.push(tab.route);
                }
              }}
              style={styles.navItem}
            >
              <View style={[styles.navIcon, selected && styles.navIconActive]}>
                <Icon
                  name={tab.icon}
                  size={18}
                  color={selected ? colors.white : colors.textMuted}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[styles.navLabel, selected && styles.navLabelActive]}
              >
                {tab.name}
              </Text>
              {tab.route === 'Cart' && itemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.badgeText}>{itemCount}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search products...',
  onPress,
  compact = false,
}: {
  value?: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  onPress?: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.search, compact && styles.searchCompact]}
    >
      <Icon name="search" size={compact ? 18 : 20} color={colors.textSoft} />
      <TextInput
        editable={!onPress}
        pointerEvents={onPress ? 'none' : 'auto'}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.searchInput, compact && styles.searchInputCompact]}
      />
      <View
        style={[styles.searchAction, compact && styles.searchActionCompact]}
      >
        <Icon name="filter" size={17} color={colors.white} />
      </View>
    </Pressable>
  );
}

export function PrimaryButton({
  title,
  onPress,
  outline = false,
  icon,
  disabled = false,
}: {
  title: string;
  onPress?: () => void;
  outline?: boolean;
  icon?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        outline && styles.buttonOutline,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon && (
        <Icon
          name={icon}
          size={19}
          color={outline ? colors.accent : colors.white}
        />
      )}
      <Text style={[styles.buttonText, outline && styles.buttonTextOutline]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <View style={styles.miniRule} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action && (
        <Pressable onPress={onPress}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ProductCard({
  product,
  navigation,
  compact = false,
}: {
  product: Product;
  navigation: Navigation;
  compact?: boolean;
}) {
  const cover = product.images?.[0];
  return (
    <Pressable
      onPress={() =>
        navigation.push('ProductDetails', { productId: product.id })
      }
      style={[styles.productCard, compact && styles.productCompact]}
    >
      <View style={[styles.productArt, { backgroundColor: product.color }]}>
        {product.badge && (
          <View style={styles.productBadge}>
            <Text style={styles.productBadgeText}>{product.badge}</Text>
          </View>
        )}
        <Pressable style={styles.heartButton}>
          <Icon name="heart" size={17} color={colors.ink} />
        </Pressable>
        <ProductMedia
          image={cover}
          fallbackArt={product.art}
          size={compact ? 82 : 105}
        />
      </View>
      <Text numberOfLines={1} style={styles.productTitle}>
        {product.title}
      </Text>
      <View style={styles.ratingRow}>
        <Icon name="star" size={13} color={colors.warning} />
        <Text numberOfLines={1} style={styles.ratingText}>
          {product.rating} · {product.sold} sold
        </Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{money(product.price)}</Text>
        {product.oldPrice && (
          <Text style={styles.oldPrice}>{money(product.oldPrice)}</Text>
        )}
      </View>
    </Pressable>
  );
}

export function ProductMedia({
  image,
  fallbackArt,
  size,
}: {
  image?: ProductImage;
  fallbackArt: Product['art'];
  size: number;
}) {
  if (image?.uri) {
    return (
      <Image
        source={{uri: image.uri}}
        resizeMode="cover"
        style={{width: size, height: size, borderRadius: Math.max(10, size / 10)}}
      />
    );
  }
  return <ProductArt type={image?.art || fallbackArt} size={size} />;
}

export function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  accent,
  right,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  accent?: string;
  right?: React.ReactNode;
}) {
  const tint = accent || colors.ink;
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <View style={[styles.menuIcon, { backgroundColor: `${tint}12` }]}>
        <Icon name={icon} size={20} color={tint} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
      {right || <Icon name="chevron" size={19} color={colors.textMuted} />}
    </Pressable>
  );
}

export function StatusPill({
  text,
  tone = 'info',
}: {
  text: string;
  tone?: 'success' | 'warning' | 'info' | 'accent';
}) {
  const palette =
    tone === 'success'
      ? [colors.successSoft, colors.success]
      : tone === 'warning'
      ? [colors.warningSoft, colors.warning]
      : tone === 'accent'
      ? [colors.accentSoft, colors.accent]
      : [colors.infoSoft, colors.info];
  return (
    <View style={[styles.pill, { backgroundColor: palette[0] }]}>
      <Text style={[styles.pillText, { color: palette[1] }]}>{text}</Text>
    </View>
  );
}

export function MetricCard({
  label,
  value,
  icon,
  tone = colors.accent,
}: {
  label: string;
  value: string;
  icon: string;
  tone?: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: `${tone}18` }]}>
        <Icon name={icon} color={tone} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  onPress,
}: {
  icon: string;
  title: string;
  text: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={34} color={colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {action && (
        <View style={styles.emptyButton}>
          <PrimaryButton title={action} onPress={onPress} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  darkSafe: { backgroundColor: colors.ink },
  flex: { flex: 1 },
  scroll: { paddingBottom: 34 },
  header: {
    height: chrome.headerHeight,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 90,
    backgroundColor: '#17345A',
    opacity: 0.28,
    right: -55,
    top: -95,
  },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: colors.white,
    fontSize: chrome.headerFont,
    fontWeight: '700',
    marginLeft: 3,
  },
  headerRight: { minWidth: 42, alignItems: 'flex-end' },
  navSafe: { backgroundColor: colors.white },
  bottomNav: {
    height: chrome.navHeight,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navIcon: {
    width: 31,
    height: 25,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: { backgroundColor: colors.accent },
  navLabel: {
    fontSize: chrome.navFont,
    color: colors.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },
  navLabelActive: { color: colors.accent, fontWeight: '700' },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 16,
    minWidth: 16,
    height: 16,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  badgeText: { color: colors.white, fontSize: 8, fontWeight: '800' },
  search: {
    ...shadow,
    height: 54,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
  },
  searchAction: {
    width: 52,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  searchCompact: { height: 45, borderRadius: 14, paddingLeft: 14 },
  searchInputCompact: { fontSize: 12 },
  searchActionCompact: { width: 46, height: 45 },
  button: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonOutline: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  buttonTextOutline: { color: colors.accent },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 13,
  },
  miniRule: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 19, color: colors.text, fontWeight: '800' },
  sectionAction: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '700',
    padding: 5,
  },
  productCard: {
    ...shadow,
    width: '49%',
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: 9,
    marginBottom: 14,
  },
  productCompact: { width: 158 },
  productArt: {
    height: 142,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 2,
  },
  productBadgeText: { color: colors.white, fontSize: 8, fontWeight: '800' },
  heartButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#FFFFFFD9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  productTitle: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
    fontWeight: '700',
    marginTop: 8,
    minHeight: 17,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  ratingText: { fontSize: 10, color: colors.textSoft, flexShrink: 1 },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 7,
    marginTop: 7,
  },
  price: { fontSize: 15, fontWeight: '800', color: colors.accent },
  oldPrice: {
    fontSize: 10,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  menuRow: {
    minHeight: 68,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 14,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1, paddingHorizontal: 12 },
  menuTitle: { fontSize: 14, color: colors.text, fontWeight: '600' },
  menuSub: { fontSize: 11, color: colors.textSoft, marginTop: 3 },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { fontSize: 10, fontWeight: '700' },
  metric: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    minHeight: 122,
    justifyContent: 'space-between',
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 21,
    color: colors.text,
    fontWeight: '800',
    marginTop: 10,
  },
  metricLabel: { fontSize: 11, color: colors.textSoft, marginTop: 3 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
    paddingVertical: 70,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSoft,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: { width: '100%', marginTop: 24 },
});
