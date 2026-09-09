import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Icon } from '../components/Icon';
import {Text} from '../components/Typography';
import { ProductArt } from '../components/ProductArt';
import {
  BottomNav,
  Header,
  PrimaryButton,
  ProductMedia,
  Screen,
  StatusPill,
} from '../components/UI';
import { money, products } from '../data';
import { colors, radius, shadow } from '../theme';
import { Product, ScreenProps } from '../types';
import { CartLine, useCart } from '../cart';
import {api,fixtureMode} from '../api';
import {useAuth} from '../auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

function SummaryRow({
  label,
  value,
  strong = false,
  accent = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={s.summaryRow}>
      <Text style={[s.summaryLabel, strong && s.summaryStrong]}>{label}</Text>
      <Text
        style={[s.summaryValue, strong && s.summaryStrong, accent && s.accent]}
      >
        {value}
      </Text>
    </View>
  );
}

function MiniProduct({
  item,
  qty,
  onMinus,
  onPlus,
  onRemove,
}: {
  item: Product | CartLine;
  qty: number;
  onMinus?: () => void;
  onPlus?: () => void;
  onRemove?: () => void;
}) {
  const selectedVariant = 'selectedColor' in item
    ? item.variants?.find(variant => variant.name === item.selectedColor)
    : undefined;
  const image = item.images?.find(photo => photo.id === selectedVariant?.imageIds[0])
    || item.images?.[0];
  const variantLabel = [
    'selectedColor' in item ? item.selectedColor : undefined,
    'selectedSize' in item && item.selectedSize ? `Size ${item.selectedSize}` : undefined,
  ].filter(Boolean).join(' · ');
  return (
    <View style={s.cartLine}>
      <View style={[s.lineArt, { backgroundColor: item.color }]}>
        <ProductMedia image={image} fallbackArt={item.art} size={74} />
      </View>
      <View style={s.lineInfo}>
        <Text numberOfLines={2} style={s.lineTitle}>
          {item.title}
        </Text>
        <Text style={s.lineMeta}>
          {variantLabel || 'Loveraf verified'}
        </Text>
        <Text style={s.linePrice}>{money(item.price)}</Text>
        <View style={s.stepper}>
          {onMinus && (
            <Pressable
              accessibilityLabel={`Decrease quantity of ${item.title}, ${variantLabel}`}
              onPress={onMinus} style={s.stepButton}>
              <Icon name="minus" size={14} />
            </Pressable>
          )}
          <Text style={s.qty}>{qty}</Text>
          {onPlus && (
            <Pressable
              accessibilityLabel={`Increase quantity of ${item.title}, ${variantLabel}`}
              onPress={onPlus} style={s.stepButton}>
              <Icon name="plus" size={14} />
            </Pressable>
          )}
        </View>
      </View>
      {onRemove && (
        <Pressable
          accessibilityLabel={`Remove ${item.title}, ${variantLabel}`}
          onPress={onRemove} style={s.remove}>
          <Icon name="trash" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

export function CartScreen({ navigation }: ScreenProps) {
  const { lines, itemCount, changeQty, removeItem } = useCart();
  const subtotal = useMemo(
    () => lines.reduce((sum, item) => sum + item.price * item.qty, 0),
    [lines],
  );
  return (
    <Screen scroll={false}>
      <Header
        title="My Cart"
        navigation={navigation}
        right={<Text style={s.headerAction}>Edit</Text>}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.cartBody}
      >
        <View style={s.cartLead}>
          <Text style={s.cartLeadTitle}>{itemCount} items ready</Text>
          <View style={s.deliveryPill}>
            <Icon name="truck" size={15} color={colors.success} />
            <Text style={s.deliveryPillText}>Free delivery unlocked</Text>
          </View>
        </View>
        {lines.map(item => (
          <MiniProduct
            key={item.lineId}
            item={item}
            qty={item.qty}
            onMinus={() => changeQty(item.lineId, -1)}
            onPlus={() => changeQty(item.lineId, 1)}
            onRemove={() => removeItem(item.lineId)}
          />
        ))}
        <Pressable
          onPress={() => navigation.push('PromoBalance')}
          style={s.promoCard}
        >
          <View style={s.promoIcon}>
            <Icon name="sparkles" color={colors.accent} />
          </View>
          <View style={s.flex}>
            <Text style={[s.promoTitle, s.promoCardText]}>
              Promo Balance available: ৳200
            </Text>
            <Text style={[s.promoSub, s.promoCardSub]}>
              Save up to 10% on eligible product value
            </Text>
          </View>
          <Icon name="chevron" color={colors.accent} />
        </Pressable>
        <View style={s.summaryCard}>
          <SummaryRow
            label={`Subtotal (${itemCount} items)`}
            value={money(subtotal)}
          />
          <SummaryRow label="Delivery" value="FREE" accent />
          <SummaryRow label="Service protection" value="৳40" />
          <View style={s.rule} />
          <SummaryRow
            label="Total"
            value={money(subtotal + 40)}
            strong
            accent
          />
        </View>
      </ScrollView>
      <View style={s.sticky}>
        <View style={s.totalMini}>
          <Text style={s.totalMiniLabel}>Total</Text>
          <Text style={s.totalMiniValue}>{money(subtotal + 40)}</Text>
        </View>
        <View style={s.stickyButton}>
          <PrimaryButton
            title="Checkout"
            icon="chevron"
            disabled={!lines.length}
            onPress={() => navigation.push('Checkout')}
          />
        </View>
      </View>
      <BottomNav active="Cart" navigation={navigation} />
    </Screen>
  );
}

export function CheckoutScreen({ navigation, params }: ScreenProps) {
  const [payment, setPayment] = useState<'cod' | 'card' | 'bkash'>('cod');
  const [promo, setPromo] = useState(false);
  const {lines}=useCart();
  const [address,setAddress]=useState<any>();
  const [quote,setQuote]=useState<any>();
  const [busy,setBusy]=useState(false);
  const buyNow=params?.buyNow;
  const checkoutInput=useMemo(()=>({addressId:address?.id,paymentMethod:payment,promo,...(buyNow?{buyNow}:{})}),[address?.id,payment,promo,buyNow]);
  useEffect(()=>{if(!fixtureMode)api<any[]>('/me/addresses').then(items=>setAddress(items.find(a=>a.isDefault)||items[0])).catch(e=>Alert.alert('Checkout',e.message));},[]);
  useEffect(()=>{if(!fixtureMode&&address)api('/checkout/quote','POST',checkoutInput).then(setQuote).catch(e=>{setQuote(undefined);Alert.alert('Checkout',e.message);});},[address,checkoutInput]);
  const subtotal=fixtureMode?products.slice(0,3).reduce((sum,item)=>sum+item.price,0):(quote?.subtotalMinor||lines.reduce((sum,item)=>sum+item.price*item.qty*100,0))/100;
  const discount=fixtureMode&&promo?Math.min(200,Math.round(subtotal*0.1)):(quote?.discountMinor||0)/100;
  const confirm=async()=>{if(fixtureMode){navigation.replace('OrderSuccess');return;}if(!address||!quote||busy)return;setBusy(true);try{
    const fingerprint=JSON.stringify({...checkoutInput,lines:buyNow?undefined:lines.map(line=>[line.lineId,line.qty])});
    const stored=await AsyncStorage.getItem('loveraf.checkout-attempt');let attempt: {fingerprint:string;key:string}|undefined;
    try{attempt=stored?JSON.parse(stored):undefined;}catch{attempt=undefined;}
    if(!attempt||attempt.fingerprint!==fingerprint){attempt={fingerprint,key:'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return(c==='x'?n:8+n%4).toString(16);})};await AsyncStorage.setItem('loveraf.checkout-attempt',JSON.stringify(attempt));}
    const result=await api<any>('/orders','POST',checkoutInput,{'Idempotency-Key':attempt.key});
    await AsyncStorage.removeItem('loveraf.checkout-attempt');navigation.replace('OrderSuccess',{orderId:result.id});
  }catch(e){Alert.alert('Order',e instanceof Error?e.message:'Could not place order.');}finally{setBusy(false);}};
  return (
    <Screen>
      <Header title="Secure Checkout" navigation={navigation} />
      <View style={s.checkoutBody}>
        <View style={s.secureStrip}>
          <Icon name="shield" color={colors.success} />
          <View>
            <Text style={s.secureTitle}>Protected checkout</Text>
            <Text style={s.secureSub}>Your order and payment are secured</Text>
          </View>
        </View>
        <Text style={s.blockTitle}>Delivery address</Text>
        <Pressable
          onPress={() => navigation.push('Addresses')}
          style={s.addressCard}
        >
          <View style={s.addressIcon}>
            <Icon name="pin" color={colors.accent} />
          </View>
          <View style={s.flex}>
            <Text style={s.addressName}>
              {address?.name || (fixtureMode ? 'Rafiqul Islam' : 'Add delivery address')} {address?.isDefault && <Text style={s.defaultTag}>DEFAULT</Text>}
            </Text>
            <Text style={s.addressText}>
              {address ? `${address.details}\n${address.district}, ${address.division} · ${address.mobile}` : fixtureMode ? `House 12, Road 5, Dhanmondi\nDhaka 1205 · 01712345678` : 'Tap Change to add an address'}
            </Text>
          </View>
          <Text style={s.change}>Change</Text>
        </Pressable>
        <Text style={s.blockTitle}>Payment method</Text>
        <View style={s.whiteCard}>
          {[
            {
              id: 'cod',
              icon: 'wallet',
              title: 'Cash on delivery',
              sub: 'Pay when your order arrives',
            },
            {
              id: 'bkash',
              icon: 'phone',
              title: 'Mobile banking',
              sub: 'bKash, Nagad or Rocket',
            },
            {
              id: 'card',
              icon: 'card',
              title: 'Debit / credit card',
              sub: 'Visa, Mastercard or Amex',
            },
          ].map(item => (
            <Pressable
              key={item.id}
              onPress={() => item.id === 'cod' || fixtureMode ? setPayment(item.id as typeof payment) : Alert.alert('Payment','This payment method is not available yet.')}
              style={s.paymentRow}
            >
              <View style={[s.radio, payment === item.id && s.radioActive]}>
                {payment === item.id && <View style={s.radioDot} />}
              </View>
              <View style={s.paymentIcon}>
                <Icon
                  name={item.icon}
                  size={18}
                  color={payment === item.id ? colors.accent : colors.ink}
                />
              </View>
              <View style={s.flex}>
                <Text style={s.paymentTitle}>{item.title}</Text>
                <Text style={s.paymentSub}>{item.sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>
        <Text style={s.blockTitle}>Promo Balance</Text>
        <View style={s.promoToggle}>
          <View style={s.promoIcon}>
            <Icon name="sparkles" color={colors.accent} />
          </View>
          <View style={s.flex}>
            <Text style={s.promoTitle}>Use ৳{discount} Promo Balance</Text>
            <Text style={s.promoSub}>
              Max 10% of product subtotal · Not withdrawable
            </Text>
          </View>
          <Switch
            value={promo}
            onValueChange={value => fixtureMode ? setPromo(value) : Alert.alert('Promo Balance','Promo rewards are not available yet.')}
            trackColor={{ false: colors.line, true: '#FFA8BD' }}
            thumbColor={promo ? colors.accent : colors.white}
          />
        </View>
        <Text style={s.blockTitle}>Order summary</Text>
        <View style={s.summaryCard}>
          <SummaryRow label="Product subtotal" value={money(subtotal)} />
          <SummaryRow label="Delivery" value="FREE" accent />
          <SummaryRow
            label="Promo discount"
            value={`− ${money(discount)}`}
            accent
          />
          <SummaryRow label="Protection fee" value={money((quote?.feeMinor || (fixtureMode ? 4000 : 0)) / 100)} />
          <View style={s.rule} />
          <SummaryRow
            label="Payable total"
            value={money(quote ? quote.totalMinor / 100 : subtotal - discount + (fixtureMode ? 40 : 0))}
            strong
            accent
          />
        </View>
        <PrimaryButton
          title={busy ? 'Confirming...' : 'Confirm Order'}
          icon="lock"
          onPress={confirm}
        />
        <Text style={s.terms}>
          By placing your order, you agree to Loveraf Terms and Buyer Protection
          Policy.
        </Text>
      </View>
    </Screen>
  );
}

export function OrderSuccessScreen({ navigation, params }: ScreenProps) {
  const {user}=useAuth();
  return (
    <Screen>
      <View style={s.successPage}>
        <View style={s.successGlow} />
        <View style={s.successMark}>
          <Icon name="check" size={49} color={colors.white} strokeWidth={2.4} />
        </View>
        <Text style={s.successTitle}>Order confirmed!</Text>
        <Text style={s.successText}>
          Thank you, {user?.name || 'Rafiqul'}. Your order is safely placed and the seller is
          preparing it.
        </Text>
        <View style={s.orderNumber}>
          <Text style={s.orderNumberLabel}>ORDER NUMBER</Text>
          <Text style={s.orderNumberValue}>#{String(params?.orderId || 'LRF-260826-1048').slice(0, 18)}</Text>
        </View>
        <View style={s.successTimeline}>
          <View style={s.successStep}>
            <Icon name="check" size={19} color={colors.success} />
            <Text style={s.successStepText}>Order confirmed</Text>
          </View>
          <View style={s.stepLine} />
          <View style={s.successStep}>
            <Icon name="package" size={19} color={colors.accent} />
            <Text style={s.successStepText}>Preparing</Text>
          </View>
          <View style={s.stepLineMuted} />
          <View style={s.successStep}>
            <Icon name="truck" size={19} color={colors.textMuted} />
            <Text style={s.successStepMuted}>Delivery</Text>
          </View>
        </View>
        <View style={s.successActions}>
          <PrimaryButton
            title="Track my order"
            onPress={() => navigation.replace('Tracking')}
          />
          <PrimaryButton
            title="View all orders"
            outline
            onPress={() => navigation.replace('Orders')}
          />
          <Pressable onPress={() => navigation.reset('Home')}>
            <Text style={s.continueText}>Continue shopping</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const orderData = [
  {
    id: '#LRF-1048',
    date: 'Aug 26, 2026',
    total: '৳16,210',
    status: 'Preparing',
    tone: 'warning' as const,
    arts: products.slice(0, 3),
  },
  {
    id: '#LRF-1031',
    date: 'Aug 20, 2026',
    total: '৳8,990',
    status: 'Shipped',
    tone: 'info' as const,
    arts: products.slice(2, 3),
  },
  {
    id: '#LRF-0984',
    date: 'Aug 08, 2026',
    total: '৳6,080',
    status: 'Delivered',
    tone: 'success' as const,
    arts: products.slice(4, 6),
  },
];

export function OrdersScreen({ navigation }: ScreenProps) {
  const [tab, setTab] = useState('All');
  const [serverOrders,setServerOrders]=useState<any[]>([]);
  useEffect(()=>{if(!fixtureMode)api<any[]>('/orders').then(setServerOrders).catch(e=>Alert.alert('Orders',e.message));},[]);
  const visibleOrders=fixtureMode?orderData:serverOrders.filter(order=>tab==='All'||order.status.toLowerCase()===tab.toLowerCase()).map(order=>({
    id:order.id,date:new Date(order.created_at).toLocaleDateString(),total:money(order.total_minor/100),status:order.status,
    tone:order.status==='cancelled'?'accent' as const:'warning' as const,arts:[] as Product[],
  }));
  return (
    <Screen>
      <Header title="My Orders" navigation={navigation} />
      <View style={s.tabs}>
        {['All', 'Pending', 'Shipped', 'Delivered'].map(name => (
          <Pressable
            key={name}
            onPress={() => setTab(name)}
            style={[s.tab, tab === name && s.tabActive]}
          >
            <Text style={[s.tabText, tab === name && s.tabTextActive]}>
              {name}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={s.ordersBody}>
        {visibleOrders.map(order => (
          <Pressable
            key={order.id}
            onPress={() =>
              navigation.push('OrderDetails', { orderId: order.id })
            }
            style={s.orderCard}
          >
            <View style={s.orderTop}>
              <View>
                <Text style={s.orderId}>Order {order.id}</Text>
                <Text style={s.orderDate}>{order.date}</Text>
              </View>
              <StatusPill text={order.status} tone={order.tone} />
            </View>
            <View style={s.orderArts}>
              {order.arts.map(product => (
                <View
                  key={product.id}
                  style={[s.orderArt, { backgroundColor: product.color }]}
                >
                  <ProductArt type={product.art} size={54} />
                </View>
              ))}
            </View>
            <View style={s.orderBottom}>
              <Text style={s.orderTotal}>Total: {order.total}</Text>
              <View style={s.detailsLink}>
                <Text style={s.detailsText}>View details</Text>
                <Icon name="chevron" size={16} color={colors.accent} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const stages = [
  { title: 'Order confirmed', text: 'Aug 26 · 10:48 AM', icon: 'check' },
  { title: 'Seller is preparing', text: 'Aug 26 · 12:15 PM', icon: 'package' },
  { title: 'Handed to courier', text: 'Expected today', icon: 'truck' },
  { title: 'Out for delivery', text: 'Expected Aug 28', icon: 'pin' },
  { title: 'Delivered', text: 'Estimated by Aug 28', icon: 'gift' },
];

function TrackingTimeline({ active = 1 }: { active?: number }) {
  return (
    <View style={s.timeline}>
      {stages.map((stage, index) => (
        <View key={stage.title} style={s.timelineRow}>
          <View style={s.timelineRail}>
            <View
              style={[s.timelineDot, index <= active && s.timelineDotActive]}
            >
              <Icon
                name={index < active ? 'check' : stage.icon}
                size={16}
                color={index <= active ? colors.white : colors.textMuted}
              />
            </View>
            {index < stages.length - 1 && (
              <View
                style={[s.timelineLine, index < active && s.timelineLineActive]}
              />
            )}
          </View>
          <View style={s.timelineText}>
            <Text style={[s.timelineTitle, index > active && s.timelineMuted]}>
              {stage.title}
            </Text>
            <Text style={s.timelineSub}>{stage.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function OrderDetailsScreen({ navigation,params }: ScreenProps) {
  const [serverOrder,setServerOrder]=useState<any>();
  useEffect(()=>{if(!fixtureMode)api(`/orders/${params?.orderId}`).then(setServerOrder).catch(e=>Alert.alert('Order',e.message));},[params?.orderId]);
  const orderItems:Product[]=fixtureMode?products.slice(0,2):(serverOrder?.lines||[]).map((line:any)=>({
    id:line.id,title:line.snapshot.title,price:line.unit_minor/100,rating:0,sold:'0',art:'watch',color:'#EEF1F6',
    images:line.snapshot.image?[{id:line.id,uri:line.snapshot.image}]:undefined,
  }));
  return (
    <Screen>
      <Header title="Order details" navigation={navigation} />
      <View style={s.orderHero}>
        <View>
          <Text style={s.orderHeroLabel}>ORDER #{String(serverOrder?.id||'LRF-1048').slice(0,18)}</Text>
          <Text style={s.orderHeroTitle}>{serverOrder?.status || 'Preparing your package'}</Text>
          <Text style={s.orderHeroSub}>Estimated delivery · Aug 28, 2026</Text>
        </View>
        <View style={s.orderHeroIcon}>
          <Icon name="package" size={32} color={colors.white} />
        </View>
      </View>
      <View style={s.checkoutBody}>
        <Text style={s.blockTitle}>Items</Text>
        {orderItems.map(product => (
          <MiniProduct key={product.id} item={product} qty={1} />
        ))}
        <Pressable
          onPress={() => navigation.push('Tracking')}
          style={s.trackCard}
        >
          <View>
            <Text style={s.trackKicker}>LIVE DELIVERY</Text>
            <Text style={s.trackTitle}>Track order progress</Text>
            <Text style={s.trackSub}>Seller is preparing your items</Text>
          </View>
          <View style={s.trackArrow}>
            <Icon name="chevron" color={colors.white} />
          </View>
        </Pressable>
        <Text style={s.blockTitle}>Delivery & payment</Text>
        <View style={s.whiteCard}>
          <View style={s.infoRow}>
            <Icon name="pin" color={colors.accent} />
            <Text style={s.infoText}>
              {serverOrder?.address?.details || 'House 12, Road 5, Dhanmondi, Dhaka 1205'}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Icon name="wallet" color={colors.info} />
            <Text style={s.infoText}>{serverOrder ? `${serverOrder.payment_method} · Pay ${money(serverOrder.total_minor/100)}` : 'Cash on delivery · Pay ৳7,220'}</Text>
          </View>
        </View>
        <View style={s.actionPair}>
          <View style={s.flex}>
            <PrimaryButton
              title="Get help"
              outline
              onPress={() => navigation.push('Help')}
            />
          </View>
          <View style={s.flex}>
            <PrimaryButton
              title="Return / refund"
              outline
              onPress={() => navigation.push('ReturnRefund')}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

export function TrackingScreen({ navigation }: ScreenProps) {
  return (
    <Screen>
      <Header title="Track order" navigation={navigation} />
      <View style={s.trackMap}>
        <View style={s.mapRoadOne} />
        <View style={s.mapRoadTwo} />
        <View style={s.mapPin}>
          <Icon name="truck" color={colors.white} size={24} />
        </View>
        <View style={s.mapHome}>
          <Icon name="pin" color={colors.accent} size={24} />
        </View>
        <View style={s.mapLabel}>
          <Text style={s.mapLabelTop}>LRF EXPRESS</Text>
          <Text style={s.mapLabelTitle}>Courier pickup pending</Text>
        </View>
      </View>
      <View style={s.checkoutBody}>
        <View style={s.trackingHeader}>
          <View>
            <Text style={s.trackingKicker}>ESTIMATED ARRIVAL</Text>
            <Text style={s.trackingDate}>Friday, Aug 28</Text>
          </View>
          <StatusPill text="ON TIME" tone="success" />
        </View>
        <TrackingTimeline />
        <View style={s.courierCard}>
          <View style={s.courierAvatar}>
            <Icon name="user" color={colors.white} />
          </View>
          <View style={s.flex}>
            <Text style={s.courierName}>Courier assigned soon</Text>
            <Text style={s.courierSub}>
              Contact becomes available after pickup
            </Text>
          </View>
          <View style={s.callDisabled}>
            <Icon name="phone" color={colors.textMuted} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

export function ReturnRefundScreen({ navigation }: ScreenProps) {
  const [reason, setReason] = useState('Size or fit issue');
  const [submitted, setSubmitted] = useState(false);
  if (submitted)
    return (
      <Screen>
        <Header title="Return request" navigation={navigation} />
        <View style={s.returnSuccess}>
          <View style={s.successMark}>
            <Icon name="check" size={44} color={colors.white} />
          </View>
          <Text style={s.successTitle}>Request submitted</Text>
          <Text style={s.successText}>
            Return request #RTN-8421 is now under review. We will update you
            within 24 hours.
          </Text>
          <StatusPill text="UNDER REVIEW" tone="warning" />
          <View style={s.fullWidth}>
            <PrimaryButton
              title="Back to order"
              onPress={() => navigation.replace('OrderDetails')}
            />
          </View>
        </View>
      </Screen>
    );
  return (
    <Screen>
      <Header title="Return & refund" navigation={navigation} />
      <View style={s.checkoutBody}>
        <View style={s.policyCard}>
          <Icon name="shield" color={colors.success} />
          <View style={s.flex}>
            <Text style={s.policyTitle}>Eligible for easy return</Text>
            <Text style={s.policyText}>
              Request within 7 days of delivery. Keep original packaging.
            </Text>
          </View>
        </View>
        <Text style={s.blockTitle}>Select product</Text>
        <MiniProduct item={products[1]} qty={1} />
        <Text style={s.blockTitle}>Why are you returning it?</Text>
        <View style={s.whiteCard}>
          {[
            'Size or fit issue',
            'Product damaged',
            'Wrong item received',
            'Changed my mind',
          ].map(item => (
            <Pressable
              key={item}
              onPress={() => setReason(item)}
              style={s.reasonRow}
            >
              <View style={[s.radio, reason === item && s.radioActive]}>
                {reason === item && <View style={s.radioDot} />}
              </View>
              <Text style={s.reasonText}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.blockTitle}>Refund method</Text>
        <View style={s.refundCard}>
          <View style={s.promoIcon}>
            <Icon name="wallet" color={colors.info} />
          </View>
          <View style={s.flex}>
            <Text style={s.promoTitle}>Original payment method</Text>
            <Text style={s.promoSub}>
              Estimated processing: 3–7 business days
            </Text>
          </View>
          <Icon name="check" color={colors.success} />
        </View>
        <PrimaryButton
          title="Submit return request"
          onPress={() => setSubmitted(true)}
        />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  accent: { color: colors.accent },
  headerAction: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  cartBody: { padding: 16, paddingBottom: 120 },
  cartLead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  cartLeadTitle: { fontSize: 13, color: colors.text, fontWeight: '700' },
  deliveryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deliveryPillText: { fontSize: 9, color: colors.success, fontWeight: '700' },
  cartLine: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 12,
    flexDirection: 'row',
    marginBottom: 12,
    minHeight: 126,
  },
  lineArt: {
    width: 92,
    height: 100,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineInfo: { flex: 1, paddingLeft: 12 },
  lineTitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    fontWeight: '700',
    paddingRight: 16,
  },
  lineMeta: { fontSize: 9, color: colors.textSoft, marginTop: 4 },
  linePrice: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '800',
    marginTop: 7,
  },
  remove: { position: 'absolute', top: 11, right: 10, padding: 5 },
  stepper: {
    alignSelf: 'flex-start',
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  stepButton: {
    width: 31,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },
  promoCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  promoToggle: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginRight: 11,
  },
  promoTitle: { fontSize: 12, color: colors.text, fontWeight: '700' },
  promoCardText: { color: colors.white },
  promoSub: {
    fontSize: 9.5,
    color: colors.textSoft,
    lineHeight: 14,
    marginTop: 4,
  },
  promoCardSub: { color: '#9FAEC2' },
  summaryCard: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
  },
  summaryLabel: { fontSize: 11, color: colors.textSoft },
  summaryValue: { fontSize: 11, color: colors.text, fontWeight: '700' },
  summaryStrong: { fontSize: 16, color: colors.text, fontWeight: '800' },
  rule: { height: 1, backgroundColor: colors.line, marginVertical: 8 },
  sticky: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalMini: { width: 112 },
  totalMiniLabel: { fontSize: 9, color: colors.textSoft },
  totalMiniValue: {
    fontSize: 17,
    color: colors.accent,
    fontWeight: '800',
    marginTop: 2,
  },
  stickyButton: { flex: 1 },
  checkoutBody: { padding: 16, paddingBottom: 40 },
  secureStrip: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secureTitle: { fontSize: 12, color: colors.success, fontWeight: '700' },
  secureSub: { fontSize: 9, color: colors.textSoft, marginTop: 2 },
  blockTitle: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '800',
    marginTop: 23,
    marginBottom: 11,
  },
  addressCard: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
  },
  addressIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addressName: { fontSize: 12.5, color: colors.text, fontWeight: '800' },
  defaultTag: { fontSize: 7, color: colors.accent },
  addressText: {
    fontSize: 10,
    lineHeight: 16,
    color: colors.textSoft,
    marginTop: 5,
  },
  change: { fontSize: 10, color: colors.accent, fontWeight: '700' },
  whiteCard: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  paymentRow: {
    minHeight: 69,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioActive: { borderColor: colors.accent },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  paymentIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  paymentTitle: { fontSize: 12, color: colors.text, fontWeight: '700' },
  paymentSub: { fontSize: 9, color: colors.textSoft, marginTop: 3 },
  terms: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 22,
    marginTop: 12,
  },
  successPage: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 68,
    overflow: 'hidden',
  },
  successGlow: {
    position: 'absolute',
    top: -130,
    width: 380,
    height: 300,
    borderRadius: 190,
    backgroundColor: colors.accentSoft,
    opacity: 0.65,
  },
  successMark: {
    width: 94,
    height: 94,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  successTitle: {
    fontSize: 28,
    color: colors.text,
    fontWeight: '800',
    marginTop: 24,
  },
  successText: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSoft,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 320,
  },
  orderNumber: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    width: '100%',
    alignItems: 'center',
    padding: 15,
    marginTop: 22,
  },
  orderNumberLabel: {
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  orderNumberValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '800',
    marginTop: 5,
  },
  successTimeline: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
  },
  successStep: { alignItems: 'center', width: 76 },
  successStepText: {
    fontSize: 8,
    color: colors.text,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  successStepMuted: { fontSize: 8, color: colors.textMuted, marginTop: 6 },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.accent,
    marginTop: -17,
  },
  stepLineMuted: {
    flex: 1,
    height: 2,
    backgroundColor: colors.line,
    marginTop: -17,
  },
  successActions: { width: '100%', gap: 10, marginTop: 33 },
  continueText: {
    fontSize: 12,
    color: colors.textSoft,
    textAlign: 'center',
    padding: 9,
  },
  tabs: {
    height: 52,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.accent },
  tabText: { fontSize: 10, color: '#98A5B8', fontWeight: '600' },
  tabTextActive: { color: colors.white, fontWeight: '800' },
  ordersBody: { padding: 16 },
  orderCard: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 15,
    marginBottom: 14,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between' },
  orderId: { fontSize: 12, color: colors.text, fontWeight: '800' },
  orderDate: { fontSize: 9, color: colors.textSoft, marginTop: 4 },
  orderArts: { flexDirection: 'row', marginTop: 14, gap: 8 },
  orderArt: {
    width: 61,
    height: 61,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBottom: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderTotal: { fontSize: 12, color: colors.text, fontWeight: '800' },
  detailsLink: { flexDirection: 'row', alignItems: 'center' },
  detailsText: { fontSize: 10, color: colors.accent, fontWeight: '700' },
  orderHero: {
    backgroundColor: colors.ink,
    padding: 22,
    paddingBottom: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderHeroLabel: {
    fontSize: 8,
    letterSpacing: 1.4,
    color: colors.accent,
    fontWeight: '800',
  },
  orderHeroTitle: {
    fontSize: 20,
    color: colors.white,
    fontWeight: '800',
    marginTop: 7,
  },
  orderHeroSub: { fontSize: 9, color: '#A4B2C4', marginTop: 6 },
  orderHeroIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: 18,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackKicker: {
    fontSize: 8,
    color: colors.accent,
    letterSpacing: 1.3,
    fontWeight: '800',
  },
  trackTitle: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '800',
    marginTop: 6,
  },
  trackSub: { fontSize: 9, color: '#9EADBF', marginTop: 4 },
  trackArrow: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  infoText: { fontSize: 11, color: colors.textSoft, flex: 1, lineHeight: 16 },
  actionPair: { flexDirection: 'row', gap: 10, marginTop: 18 },
  trackMap: { height: 215, backgroundColor: '#E9EEF4', overflow: 'hidden' },
  mapRoadOne: {
    position: 'absolute',
    width: 470,
    height: 38,
    backgroundColor: colors.white,
    top: 84,
    left: -35,
    transform: [{ rotate: '-12deg' }],
  },
  mapRoadTwo: {
    position: 'absolute',
    width: 40,
    height: 260,
    backgroundColor: colors.white,
    top: -20,
    left: 105,
    transform: [{ rotate: '22deg' }],
  },
  mapPin: {
    position: 'absolute',
    left: '42%',
    top: 82,
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHome: {
    position: 'absolute',
    right: 52,
    bottom: 36,
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  mapLabel: {
    position: 'absolute',
    left: 16,
    top: 17,
    backgroundColor: colors.white,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 10,
    ...shadow,
  },
  mapLabelTop: {
    fontSize: 7,
    color: colors.accent,
    letterSpacing: 1,
    fontWeight: '800',
  },
  mapLabelTitle: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '700',
    marginTop: 3,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackingKicker: { fontSize: 8, color: colors.textSoft, letterSpacing: 1.1 },
  trackingDate: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '800',
    marginTop: 5,
  },
  timeline: { marginTop: 24 },
  timelineRow: { height: 72, flexDirection: 'row' },
  timelineRail: { width: 48, alignItems: 'center' },
  timelineDot: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotActive: { backgroundColor: colors.accent },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.line },
  timelineLineActive: { backgroundColor: colors.accent },
  timelineText: { paddingTop: 4 },
  timelineTitle: { fontSize: 12, color: colors.text, fontWeight: '700' },
  timelineMuted: { color: colors.textMuted },
  timelineSub: { fontSize: 9, color: colors.textSoft, marginTop: 5 },
  courierCard: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  courierAvatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  courierName: { fontSize: 12, color: colors.text, fontWeight: '700' },
  courierSub: { fontSize: 9, color: colors.textSoft, marginTop: 4 },
  callDisabled: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  policyTitle: { fontSize: 12, color: colors.success, fontWeight: '800' },
  policyText: {
    fontSize: 9.5,
    color: colors.textSoft,
    lineHeight: 14,
    marginTop: 4,
  },
  reasonRow: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  reasonText: { fontSize: 11.5, color: colors.text, fontWeight: '600' },
  refundCard: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 22,
  },
  returnSuccess: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 78,
  },
  fullWidth: { width: '100%', marginTop: 28 },
});
