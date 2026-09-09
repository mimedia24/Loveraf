import React, { useEffect, useState } from 'react';
import {
  Modal,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import {Text, TextInput} from '../components/Typography';
import { Icon } from '../components/Icon';
import { ProductArt } from '../components/ProductArt';
import {
  BottomNav,
  Header,
  MenuRow,
  MetricCard,
  PrimaryButton,
  Screen,
  SectionHeader,
  StatusPill,
} from '../components/UI';
import { money, products } from '../data';
import { colors, radius, shadow } from '../theme';
import { MessageActivityCategory, ScreenProps } from '../types';
import { useSeller } from '../seller';
import {api,fixtureMode} from '../api';
import {useAuth} from '../auth';

function BalanceHero({
  eyebrow,
  amount,
  subtitle,
  icon = 'wallet',
  accent = false,
}: {
  eyebrow: string;
  amount: string;
  subtitle: string;
  icon?: string;
  accent?: boolean;
}) {
  return (
    <View style={[s.balanceHero, accent && s.balanceHeroAccent]}>
      <View style={s.heroOrb} />
      <View style={s.balanceHeroTop}>
        <View>
          <Text style={s.heroEyebrow}>{eyebrow}</Text>
          <Text style={s.heroAmount}>{amount}</Text>
          <Text style={s.heroSubtitle}>{subtitle}</Text>
        </View>
        <View style={s.heroIcon}>
          <Icon name={icon} size={29} color={colors.white} />
        </View>
      </View>
    </View>
  );
}

function Transaction({
  icon,
  title,
  date,
  amount,
  positive = false,
}: {
  icon: string;
  title: string;
  date: string;
  amount: string;
  positive?: boolean;
}) {
  return (
    <View style={s.transaction}>
      <View
        style={[
          s.transactionIcon,
          {
            backgroundColor: positive ? colors.successSoft : colors.surfaceAlt,
          },
        ]}
      >
        <Icon
          name={icon}
          size={19}
          color={positive ? colors.success : colors.ink}
        />
      </View>
      <View style={s.flex}>
        <Text style={s.transactionTitle}>{title}</Text>
        <Text style={s.transactionDate}>{date}</Text>
      </View>
      <Text style={[s.transactionAmount, positive && s.positive]}>
        {amount}
      </Text>
    </View>
  );
}

function CardTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={s.cardTitle}>
      <Text style={s.cardTitleText}>{title}</Text>
      {sub && <Text style={s.cardTitleSub}>{sub}</Text>}
    </View>
  );
}

export function ProfileScreen({ navigation }: ScreenProps) {
  const {user}=useAuth();
  return (
    <Screen scroll={false}>
      <View style={s.profileHero}>
        <View style={s.profileGlow} />
        <BrandLogo compact />
        <Pressable
          onPress={() => navigation.push('Settings')}
          style={s.profileSettings}
        >
          <Icon name="settings" color={colors.white} />
        </Pressable>
        <View style={s.profileIdentity}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>RI</Text>
            <View style={s.verified}>
              <Icon name="check" size={12} color={colors.white} />
            </View>
          </View>
          <View>
            <Text style={s.profileName}>{user?.name || 'Guest'}</Text>
            <Text style={s.profileEmail}>{user?.email || ''}</Text>
            <StatusPill text={user?.email_verified || user?.phone_verified ? 'VERIFIED MEMBER' : 'VERIFY ACCOUNT'} tone="success" />
          </View>
        </View>
        <View style={s.profileStats}>
          <View style={s.profileStat}>
            <Text style={s.profileStatValue}>12</Text>
            <Text style={s.profileStatLabel}>Orders</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.profileStat}>
            <Text style={s.profileStatValue}>8</Text>
            <Text style={s.profileStatLabel}>Wishlist</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.profileStat}>
            <Text style={s.profileStatValue}>320</Text>
            <Text style={s.profileStatLabel}>Points</Text>
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={s.profileBody}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => navigation.push('Orders')}
          style={s.ordersShortcut}
        >
          <View>
            <Text style={s.shortcutTitle}>My orders</Text>
            <Text style={s.shortcutSub}>Track, return or buy again</Text>
          </View>
          <Text style={s.viewAll}>See all</Text>
        </Pressable>
        <View style={s.orderActions}>
          {[
            ['clock', 'Pending', '1'],
            ['package', 'Shipped', '1'],
            ['check', 'Delivered', '10'],
            ['help', 'Returns', '0'],
          ].map(item => (
            <Pressable
              key={item[1]}
              onPress={() => navigation.push('Orders')}
              style={s.orderAction}
            >
              <View style={s.orderActionIcon}>
                <Icon name={item[0]} size={20} color={colors.accent} />
              </View>
              <Text style={s.orderActionText}>{item[1]}</Text>
              {item[2] !== '0' && (
                <View style={s.miniBadge}>
                  <Text style={s.miniBadgeText}>{item[2]}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
        <View style={s.menuGroup}>
          <MenuRow
            icon="wallet"
            title="Wallet & balances"
            subtitle="Promo ৳200 · Earnings ৳550"
            accent={colors.accent}
            onPress={() => navigation.push('Wallet')}
          />
          <MenuRow
            icon="heart"
            title="Wishlist & activity"
            subtitle="Saved, compared and recently viewed"
            onPress={() => navigation.push('Wishlist')}
          />
          <MenuRow
            icon="pin"
            title="Address book"
            subtitle="2 saved delivery addresses"
            onPress={() => navigation.push('Addresses')}
          />
          <MenuRow
            icon="card"
            title="Payment methods"
            subtitle="Cards and mobile banking"
            onPress={() => navigation.push('PaymentMethods')}
          />
        </View>
        <View style={s.menuGroup}>
          <MenuRow
            icon="gift"
            title="Refer & earn"
            subtitle="Invite friends and unlock rewards"
            accent={colors.purple}
            onPress={() => navigation.push('Referral')}
          />
          <MenuRow
            icon="sparkles"
            title="Loyalty & membership"
            subtitle="320 points · Silver tier"
            accent={colors.warning}
            onPress={() => navigation.push('Loyalty')}
          />
          <MenuRow
            icon="help"
            title="Help & support"
            subtitle="FAQs and live chat"
            onPress={() => navigation.push('Help')}
          />
        </View>
        <Pressable onPress={() => navigation.reset('Login')} style={s.logout}>
          <Icon name="back" color={colors.accent} />
          <Text style={s.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
      <BottomNav active="Profile" navigation={navigation} />
    </Screen>
  );
}

export function WalletScreen({ navigation }: ScreenProps) {
  return (
    <Screen>
      <Header title="My Wallet" navigation={navigation} />
      <View style={s.walletTop}>
        <Text style={s.walletLead}>
          One clear place for rewards and earnings
        </Text>
        <View style={s.walletCards}>
          <Pressable
            onPress={() => navigation.push('PromoBalance')}
            style={[s.walletCard, s.walletPromo]}
          >
            <View style={s.walletCardIcon}>
              <Icon name="sparkles" color={colors.accent} />
            </View>
            <Text style={s.walletCardLabel}>PROMO BALANCE</Text>
            <Text style={s.walletCardAmount}>৳200</Text>
            <Text style={s.walletCardRule}>
              Use for up to 10% product discount
            </Text>
            <View style={s.walletLink}>
              <Text style={s.walletLinkText}>Use balance</Text>
              <Icon name="chevron" size={15} color={colors.accent} />
            </View>
          </Pressable>
          <Pressable
            onPress={() => navigation.push('EarningsBalance')}
            style={[s.walletCard, s.walletEarnings]}
          >
            <View
              style={[
                s.walletCardIcon,
                { backgroundColor: colors.successSoft },
              ]}
            >
              <Icon name="wallet" color={colors.success} />
            </View>
            <Text style={s.walletCardLabel}>EARNINGS BALANCE</Text>
            <Text style={s.walletCardAmount}>৳550</Text>
            <Text style={s.walletCardRule}>
              Withdraw, pay or donate earnings
            </Text>
            <View style={s.walletLink}>
              <Text style={[s.walletLinkText, { color: colors.success }]}>
                Manage funds
              </Text>
              <Icon name="chevron" size={15} color={colors.success} />
            </View>
          </Pressable>
        </View>
      </View>
      <View style={s.pageBody}>
        <SectionHeader title="Quick actions" />
        <View style={s.quickGrid}>
          {[
            ['gift', 'Refer & Earn', 'Referral'],
            ['share', 'Affiliate', 'Affiliate'],
            ['coupon', 'Coupons', 'Coupons'],
            ['heart', 'Donate', 'Donation'],
          ].map(item => (
            <Pressable
              key={item[1]}
              onPress={() => navigation.push(item[2] as never)}
              style={s.quickItem}
            >
              <View style={s.quickIcon}>
                <Icon name={item[0]} color={colors.accent} />
              </View>
              <Text style={s.quickText}>{item[1]}</Text>
            </Pressable>
          ))}
        </View>
        <SectionHeader title="Recent activity" action="View all" />
        <View style={s.whiteGroup}>
          <Transaction
            icon="gift"
            title="Referral reward"
            date="Today · New member joined"
            amount="+ ৳100"
            positive
          />
          <Transaction
            icon="bag"
            title="Order promo discount"
            date="Aug 24 · #LRF-0984"
            amount="− ৳180"
          />
          <Transaction
            icon="share"
            title="Affiliate commission"
            date="Aug 21 · Approved"
            amount="+ ৳75"
            positive
          />
        </View>
      </View>
    </Screen>
  );
}

export function PromoBalanceScreen({ navigation }: ScreenProps) {
  return (
    <Screen>
      <Header title="Promo Balance" navigation={navigation} />
      <View style={s.pageBody}>
        <BalanceHero
          eyebrow="AVAILABLE PROMO BALANCE"
          amount="৳200"
          subtitle="Reward money for product discounts"
          icon="sparkles"
          accent
        />
        <View style={s.rulePanel}>
          <View style={s.rulePanelHead}>
            <Text style={s.rulePanelTitle}>How it works</Text>
            <StatusPill text="DISCOUNT ONLY" tone="accent" />
          </View>
          {[
            ['10%', 'Maximum discount on an eligible product'],
            ['৳200', 'Your current available reward balance'],
            ['∞', 'Use across multiple eligible orders'],
          ].map(item => (
            <View key={item[1]} style={s.ruleLine}>
              <View style={s.ruleNumber}>
                <Text style={s.ruleNumberText}>{item[0]}</Text>
              </View>
              <Text style={s.ruleLineText}>{item[1]}</Text>
            </View>
          ))}
          <View style={s.important}>
            <Icon name="lock" size={18} color={colors.warning} />
            <Text style={s.importantText}>
              Promo Balance is not cash and cannot be withdrawn, transferred or
              used for delivery fees.
            </Text>
          </View>
        </View>
        <View style={s.exampleCard}>
          <Text style={s.exampleKicker}>QUICK EXAMPLE</Text>
          <Text style={s.exampleTitle}>
            A ৳2,000 product allows up to ৳200 off
          </Text>
          <View style={s.exampleBar}>
            <View style={s.exampleFill} />
          </View>
          <View style={s.exampleLegend}>
            <Text>Pay ৳1,800</Text>
            <Text style={s.accentText}>Save ৳200 (10%)</Text>
          </View>
        </View>
        <PrimaryButton
          title="Shop eligible products"
          onPress={() => navigation.push('Catalog')}
        />
        <SectionHeader title="Promo history" />
        <View style={s.whiteGroup}>
          <Transaction
            icon="gift"
            title="Signup reward"
            date="Aug 26 · Valid for 90 days"
            amount="+ ৳200"
            positive
          />
        </View>
      </View>
    </Screen>
  );
}

export function EarningsBalanceScreen({ navigation }: ScreenProps) {
  const [withdraw, setWithdraw] = useState(false);
  return (
    <Screen>
      <Header title="Earnings Balance" navigation={navigation} />
      <View style={s.pageBody}>
        <BalanceHero
          eyebrow="AVAILABLE BALANCE"
          amount="৳550"
          subtitle="৳120 pending after delivery"
        />
        <View style={s.earnMetrics}>
          <MetricCard
            label="Total earned"
            value="৳1,480"
            icon="sparkles"
            tone={colors.success}
          />
          <MetricCard
            label="Pending"
            value="৳120"
            icon="clock"
            tone={colors.warning}
          />
        </View>
        {withdraw ? (
          <View style={s.withdrawCard}>
            <CardTitle
              title="Withdraw earnings"
              sub="Minimum withdrawal ৳500"
            />
            <Text style={s.fieldLabel}>Amount</Text>
            <TextInput
              defaultValue="550"
              keyboardType="number-pad"
              style={s.field}
            />
            <Text style={s.fieldLabel}>Destination</Text>
            <Pressable
              onPress={() => navigation.push('PaymentMethods')}
              style={s.destination}
            >
              <Icon name="phone" color={colors.accent} />
              <View style={s.flex}>
                <Text style={s.destinationTitle}>bKash · 01•••••7890</Text>
                <Text style={s.destinationSub}>Verified mobile wallet</Text>
              </View>
              <Icon name="chevron" color={colors.textMuted} />
            </Pressable>
            <PrimaryButton
              title="Review withdrawal"
              onPress={() => setWithdraw(false)}
            />
          </View>
        ) : (
          <>
            <View style={s.fundActions}>
              <View style={s.flex}>
                <PrimaryButton
                  title="Withdraw"
                  onPress={() => setWithdraw(true)}
                />
              </View>
              <View style={s.flex}>
                <PrimaryButton
                  title="Pay"
                  outline
                  onPress={() => navigation.push('Catalog')}
                />
              </View>
            </View>
            <View style={s.donateStrip}>
              <Icon name="heart" color={colors.accent} />
              <View style={s.flex}>
                <Text style={s.donateTitle}>Make an impact</Text>
                <Text style={s.donateSub}>
                  Donate any amount from your earnings
                </Text>
              </View>
              <Pressable onPress={() => navigation.push('Donation')}>
                <Text style={s.viewAll}>Donate</Text>
              </Pressable>
            </View>
          </>
        )}
        <SectionHeader title="Earnings activity" />
        <View style={s.whiteGroup}>
          <Transaction
            icon="share"
            title="Affiliate commission"
            date="Aug 25 · Order #LRF-2441"
            amount="+ ৳75"
            positive
          />
          <Transaction
            icon="gift"
            title="Referral reward"
            date="Aug 23 · Sumi joined"
            amount="+ ৳100"
            positive
          />
          <Transaction
            icon="wallet"
            title="Previous withdrawal"
            date="Aug 12 · bKash"
            amount="− ৳500"
          />
        </View>
      </View>
    </Screen>
  );
}

export function ReferralScreen({ navigation }: ScreenProps) {
  return (
    <Screen>
      <Header title="Refer & Earn" navigation={navigation} />
      <View style={s.referralHero}>
        <View style={s.referralArt}>
          <Icon name="gift" size={48} color={colors.white} />
        </View>
        <Text style={s.referralTitle}>Give ৳100, get ৳100</Text>
        <Text style={s.referralText}>
          Your friend gets Promo Balance after signup. You receive Earnings
          Balance after their first delivered order.
        </Text>
        <View style={s.codeCard}>
          <View>
            <Text style={s.codeLabel}>YOUR REFERRAL CODE</Text>
            <Text style={s.code}>LOVERAF100</Text>
          </View>
          <Pressable style={s.copyButton}>
            <Text style={s.copyText}>COPY</Text>
          </Pressable>
        </View>
        <PrimaryButton title="Share invite link" icon="share" />
      </View>
      <View style={s.pageBody}>
        <View style={s.refStats}>
          <MetricCard label="Invited" value="12" icon="user" />
          <MetricCard
            label="Qualified"
            value="7"
            icon="check"
            tone={colors.success}
          />
          <MetricCard
            label="Earned"
            value="৳700"
            icon="wallet"
            tone={colors.purple}
          />
        </View>
        <SectionHeader title="Three simple steps" />
        {[
          [
            '01',
            'Share your invite',
            'Send your code or personal invite link.',
          ],
          ['02', 'Friend shops', 'They sign up and place their first order.'],
          [
            '03',
            'Both get rewarded',
            'Rewards unlock after successful delivery.',
          ],
        ].map(item => (
          <View key={item[0]} style={s.stepCard}>
            <Text style={s.stepNumber}>{item[0]}</Text>
            <View>
              <Text style={s.stepTitle}>{item[1]}</Text>
              <Text style={s.stepText}>{item[2]}</Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

export function AffiliateScreen({ navigation }: ScreenProps) {
  return (
    <Screen>
      <Header title="Affiliate Center" navigation={navigation} />
      <View style={s.pageBody}>
        <View style={s.affiliateHero}>
          <Text style={s.affiliateEyebrow}>THIS MONTH</Text>
          <Text style={s.affiliateAmount}>৳1,280 earned</Text>
          <View style={s.affiliateStats}>
            <View>
              <Text style={s.affiliateStatValue}>1.8K</Text>
              <Text style={s.affiliateStatLabel}>Clicks</Text>
            </View>
            <View>
              <Text style={s.affiliateStatValue}>42</Text>
              <Text style={s.affiliateStatLabel}>Orders</Text>
            </View>
            <View>
              <Text style={s.affiliateStatValue}>3.2%</Text>
              <Text style={s.affiliateStatLabel}>Conversion</Text>
            </View>
          </View>
        </View>
        <SectionHeader title="Share & earn" action="How it works" />
        {products.slice(0, 4).map(product => (
          <View key={product.id} style={s.shareProduct}>
            <View style={[s.shareArt, { backgroundColor: product.color }]}>
              <ProductArt type={product.art} size={64} />
            </View>
            <View style={s.flex}>
              <Text numberOfLines={2} style={s.shareName}>
                {product.title}
              </Text>
              <Text style={s.sharePrice}>{money(product.price)}</Text>
              <Text style={s.commission}>
                Earn up to ৳{Math.round(product.price * 0.04)}
              </Text>
            </View>
            <Pressable style={s.shareButton}>
              <Icon name="share" color={colors.white} size={19} />
            </Pressable>
          </View>
        ))}
        <View style={s.affiliateNote}>
          <Icon name="shield" color={colors.info} />
          <Text style={s.affiliateNoteText}>
            Commission becomes withdrawable after the referred order is
            delivered and the return window closes.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

export function CouponsScreen({ navigation }: ScreenProps) {
  const coupons = [
    {
      code: 'WELCOME10',
      title: '10% off your next order',
      sub: 'Minimum spend ৳1,000 · Max ৳500',
      tone: colors.accent,
    },
    {
      code: 'FREESHIP',
      title: 'Free nationwide delivery',
      sub: 'Selected sellers · Ends Aug 31',
      tone: colors.info,
    },
    {
      code: 'BEAUTY200',
      title: '৳200 off Beauty & Care',
      sub: 'Minimum spend ৳1,500',
      tone: colors.purple,
    },
  ];
  return (
    <Screen>
      <Header title="My Coupons" navigation={navigation} />
      <View style={s.pageBody}>
        <View style={s.couponTabs}>
          <Text style={s.couponTabActive}>Available (3)</Text>
          <Text style={s.couponTab}>Used</Text>
          <Text style={s.couponTab}>Expired</Text>
        </View>
        {coupons.map(item => (
          <View key={item.code} style={s.couponCard}>
            <View style={[s.couponEdge, { backgroundColor: item.tone }]} />
            <View style={s.couponIcon}>
              <Icon name="coupon" color={item.tone} size={27} />
            </View>
            <View style={s.flex}>
              <Text style={s.couponTitle}>{item.title}</Text>
              <Text style={s.couponSub}>{item.sub}</Text>
              <Text style={[s.couponCode, { color: item.tone }]}>
                {item.code}
              </Text>
            </View>
            <Pressable
              style={[s.couponUse, { borderColor: item.tone }]}
              onPress={() => navigation.push('Catalog')}
            >
              <Text style={[s.couponUseText, { color: item.tone }]}>USE</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}

export function DonationScreen({ navigation }: ScreenProps) {
  const [amount, setAmount] = useState(100);
  return (
    <Screen>
      <Header title="Donate with Love" navigation={navigation} />
      <View style={s.donationHero}>
        <Icon name="heart" size={42} color={colors.white} />
        <Text style={s.donationTitle}>Small giving, real impact</Text>
        <Text style={s.donationText}>
          Donate securely from your Earnings Balance. Every contribution is
          tracked transparently.
        </Text>
      </View>
      <View style={s.pageBody}>
        <CardTitle title="Choose a cause" sub="Verified campaigns" />
        <View style={s.causeCard}>
          <View style={s.causeVisual}>
            <Icon name="gift" size={34} color={colors.purple} />
          </View>
          <View style={s.flex}>
            <StatusPill text="VERIFIED" tone="success" />
            <Text style={s.causeTitle}>Meals for flood-affected families</Text>
            <Text style={s.causeSub}>72% funded · 6 days left</Text>
            <View style={s.causeProgress}>
              <View style={s.causeFill} />
            </View>
          </View>
        </View>
        <CardTitle title="Select amount" sub="Available earnings: ৳550" />
        <View style={s.amounts}>
          {[50, 100, 200, 500].map(item => (
            <Pressable
              key={item}
              onPress={() => setAmount(item)}
              style={[s.amountChip, amount === item && s.amountChipActive]}
            >
              <Text
                style={[s.amountText, amount === item && s.amountTextActive]}
              >
                ৳{item}
              </Text>
            </Pressable>
          ))}
        </View>
        <PrimaryButton title={`Donate ৳${amount}`} icon="heart" />
        <Text style={s.donationFoot}>
          You will receive a digital donation receipt in the app.
        </Text>
      </View>
    </Screen>
  );
}

export function NotificationsScreen({ navigation }: ScreenProps) {
  const notices = [
    [
      'package',
      'Your order is being prepared',
      '#LRF-1048 · 12 minutes ago',
      colors.accent,
      true,
    ],
    [
      'sparkles',
      'You received ৳100 reward',
      'Referral reward added to Earnings',
      colors.success,
      true,
    ],
    [
      'coupon',
      'A coupon expires soon',
      'WELCOME10 expires in 2 days',
      colors.purple,
      false,
    ],
    [
      'truck',
      'Order delivered successfully',
      '#LRF-0984 · Aug 08',
      colors.info,
      false,
    ],
  ];
  return (
    <Screen scroll={false}>
      <Header
        title="Notifications"
        navigation={navigation}
        right={<Text style={s.headerAction}>Read all</Text>}
      />
      <View style={s.noticeBody}>
        <Text style={s.noticeGroup}>TODAY</Text>
        {notices.map((item, index) => (
          <View key={index} style={s.notice}>
            <View style={[s.noticeIcon, { backgroundColor: `${item[3]}18` }]}>
              <Icon name={item[0] as string} color={item[3] as string} />
            </View>
            <View style={s.flex}>
              <Text style={s.noticeTitle}>{item[1]}</Text>
              <Text style={s.noticeSub}>{item[2]}</Text>
            </View>
            {item[4] && <View style={s.unread} />}
          </View>
        ))}
      </View>
    </Screen>
  );
}

export function MessagesScreen({ navigation }: ScreenProps) {
  const [filter, setFilter] = useState<MessageActivityCategory | null>(null);
  const demoActivities: {
    id: string;
    category: MessageActivityCategory;
    title: string;
    text: string;
    time: string;
    timestamp: number;
    icon: string;
    tone: string;
    unread?: number;
    productId?: string;
  }[] = [
    {
      id: 'a1',
      category: 'alert',
      title: 'Your parcel is arriving today',
      text: 'LRF Express will contact you before delivery.',
      time: 'Now',
      timestamp: 8,
      icon: 'bell',
      tone: colors.warning,
      unread: 1,
    },
    {
      id: 'o1',
      category: 'order',
      title: 'Order #LRF-1048 is preparing',
      text: 'The seller has started packing your items.',
      time: '10:48 AM',
      timestamp: 7,
      icon: 'orders',
      tone: colors.info,
      unread: 2,
    },
    {
      id: 'c1',
      category: 'chat',
      title: 'Loveraf Support',
      text: 'We are here to help with your order.',
      time: '10:42 AM',
      timestamp: 6,
      icon: 'help',
      tone: colors.success,
      unread: 2,
    },
    {
      id: 'p1',
      category: 'promo',
      title: 'Tech Super Sale · Up to 35% off',
      text: 'Smart gadgets, free delivery and exclusive vouchers.',
      time: 'Today',
      timestamp: 5,
      icon: 'gift',
      tone: colors.accent,
      productId: 'p1',
    },
    {
      id: 'c2',
      category: 'chat',
      title: 'Nova Electronics',
      text: 'Your product has been packed.',
      time: 'Yesterday',
      timestamp: 4,
      icon: 'store',
      tone: colors.ink,
    },
    {
      id: 'p2',
      category: 'promo',
      title: 'Fresh Style Weekend',
      text: 'Fashion picks with special member prices.',
      time: 'Yesterday',
      timestamp: 3,
      icon: 'sparkles',
      tone: colors.purple,
      productId: 'p5',
    },
  ];
  const [activities,setActivities]=useState(demoActivities);
  useEffect(()=>{
    if(fixtureMode)return;
    api<{items:any[]}>('/activities').then(result=>setActivities(result.items.map(item=>({
      id:item.id,category:item.category,title:item.payload.title||'Loveraf',text:item.payload.text||'',
      time:new Date(item.created_at).toLocaleString(),timestamp:new Date(item.created_at).getTime(),
      icon:item.payload.icon||({chat:'chat',order:'orders',alert:'bell',promo:'gift'} as any)[item.category],
      tone:({chat:colors.success,order:colors.info,alert:colors.warning,promo:colors.accent} as any)[item.category],
      unread:item.read_at?undefined:1,productId:item.payload.productId,conversationId:item.payload.conversationId,orderId:item.payload.orderId,
    })))).catch(e=>Alert.alert('Messages',e.message));
  },[]);
  const tabs: {
    id: MessageActivityCategory;
    label: string;
    icon: string;
    tone: string;
  }[] = [
    { id: 'chat', label: 'Chats', icon: 'chat', tone: colors.success },
    { id: 'order', label: 'Orders', icon: 'orders', tone: colors.info },
    { id: 'alert', label: 'Alerts', icon: 'bell', tone: colors.warning },
    { id: 'promo', label: 'Promos', icon: 'gift', tone: colors.accent },
  ];
  const visible = activities
    .filter(item => !filter || item.category === filter)
    .sort((a, b) => b.timestamp - a.timestamp);
  const openActivity = (item: (typeof activities)[number]) => {
    if (item.category === 'chat') {
      navigation.push('Chat', { name: item.title, conversationId:(item as any).conversationId });
    } else if (item.category === 'order') {
      navigation.push('OrderDetails', { orderId:(item as any).orderId });
    } else if (item.category === 'promo') {
      navigation.push('ProductDetails', { productId: item.productId });
    } else {
      navigation.push('Notifications');
    }
  };
  return (
    <Screen scroll={false}>
      <Header
        title="Messages"
        navigation={navigation}
        right={<Pressable onPress={()=>{if(!fixtureMode)api('/activities/read','POST',{}).then(()=>setActivities(current=>current.map(i=>({...i,unread:undefined})))).catch(e=>Alert.alert('Messages',e.message));}}><Text style={s.headerAction}>Mark read</Text></Pressable>}
      />
      <View style={s.messageHubTabs}>
        {tabs.map(tab => {
          const count = activities.filter(
            item => item.category === tab.id && item.unread,
          ).length;
          const active = filter === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() =>
                setFilter(current => (current === tab.id ? null : tab.id))
              }
              style={s.messageHubTab}
            >
              <View
                style={[
                  s.messageHubIcon,
                  { backgroundColor: active ? tab.tone : `${tab.tone}18` },
                ]}
              >
                <Icon
                  name={tab.icon}
                  size={21}
                  color={active ? colors.white : tab.tone}
                />
                {count > 0 && (
                  <View style={s.messageHubBadge}>
                    <Text style={s.messageHubBadgeText}>{count}</Text>
                  </View>
                )}
              </View>
              <Text style={[s.messageHubLabel, active && { color: tab.tone }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.activityBody}>
          <Text style={s.activityHeading}>
            {filter
              ? `${tabs.find(tab => tab.id === filter)?.label} only`
              : 'Latest updates'}
          </Text>
          {visible.map(item => (
            <Pressable
              key={item.id}
              onPress={() => openActivity(item)}
              style={s.activityCard}
            >
              <View
                style={[s.activityIcon, { backgroundColor: `${item.tone}18` }]}
              >
                <Icon name={item.icon} color={item.tone} />
              </View>
              <View style={s.flex}>
                <View style={s.activityTitleRow}>
                  <Text numberOfLines={1} style={s.activityTitle}>
                    {item.title}
                  </Text>
                  <Text style={s.activityTime}>{item.time}</Text>
                </View>
                <Text style={s.activityText}>{item.text}</Text>
                {item.category === 'promo' && item.productId && (
                  <View
                    style={[
                      s.promoActivityBanner,
                      { backgroundColor: `${item.tone}12` },
                    ]}
                  >
                    <ProductArt
                      type={
                        products.find(product => product.id === item.productId)
                          ?.art || 'headphones'
                      }
                      size={68}
                    />
                    <View style={s.flex}>
                      <Text style={s.promoActivityKicker}>LOVERAF DEAL</Text>
                      <Text style={s.promoActivityTitle}>
                        Shop the offer now
                      </Text>
                    </View>
                    <Icon name="chevron" color={item.tone} />
                  </View>
                )}
              </View>
              {!!item.unread && <View style={s.unread} />}
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <BottomNav active="Messages" navigation={navigation} />
    </Screen>
  );
}

export function ChatScreen({ navigation, params }: ScreenProps) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [messages,setMessages]=useState<any[]>([]);
  const [conversationId,setConversationId]=useState(String(params?.conversationId||''));
  useEffect(()=>{
    if(fixtureMode)return;
    const load=async()=>{
      let key=String(params?.conversationId||'');
      if(!key){const created=await api<{id:string}>('/conversations','POST',{kind:'support'});key=created.id;setConversationId(key);}
      setMessages(await api<any[]>(`/conversations/${key}/messages`));await api(`/conversations/${key}/read`,'POST',{});
    };
    load().catch(e=>Alert.alert('Chat',e.message));
  },[params?.conversationId]);
  const send=()=>{
    if(fixtureMode){setSent(true);return;}
    if(!text.trim()||!conversationId)return;
    api<any>(`/conversations/${conversationId}/messages`,'POST',{body:text.trim()})
      .then(message=>{setMessages(current=>[...current,message]);setText('');}).catch(e=>Alert.alert('Chat',e.message));
  };
  return (
    <Screen scroll={false}>
      <Header
        title={(params?.name as string) || 'Loveraf Support'}
        navigation={navigation}
        right={<View style={s.onlineDot} />}
      />
      <ScrollView contentContainerStyle={s.messages}>
        <View style={s.chatDate}>
          <Text style={s.chatDateText}>TODAY</Text>
        </View>
        <View style={s.inBubble}>
          <Text style={s.bubbleText}>
            Hello Rafiqul! How can we help you today?
          </Text>
          <Text style={s.bubbleTime}>10:40 AM</Text>
        </View>
        <View style={s.outBubble}>
          <Text style={s.outBubbleText}>
            Can you tell me when order #LRF-1048 will arrive?
          </Text>
          <Text style={s.outBubbleTime}>10:41 AM · ✓✓</Text>
        </View>
        <View style={s.inBubble}>
          <Text style={s.bubbleText}>
            It is being prepared now and is expected by Friday, Aug 28.
          </Text>
          <Text style={s.bubbleTime}>10:42 AM</Text>
        </View>
        {sent && (
          <View style={s.outBubble}>
            <Text style={s.outBubbleText}>{text || 'Thank you!'}</Text>
            <Text style={s.outBubbleTime}>Now · ✓</Text>
          </View>
        )}
        {!fixtureMode&&messages.map(message=><View key={message.id} style={s.outBubble}><Text style={s.outBubbleText}>{message.body}</Text><Text style={s.outBubbleTime}>{new Date(message.created_at).toLocaleTimeString()}</Text></View>)}
      </ScrollView>
      <View style={s.composer}>
        <Pressable style={s.attach}>
          <Icon name="plus" color={colors.textSoft} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write a message..."
          placeholderTextColor={colors.textMuted}
          style={s.composerInput}
        />
        <Pressable onPress={send} style={s.send}>
          <Icon name="chevron" color={colors.white} />
        </Pressable>
      </View>
    </Screen>
  );
}

export function LegacyAddressesScreen({ navigation }: ScreenProps) {
  type Address = {
    id: string;
    title: string;
    name: string;
    mobile: string;
    division: string;
    district: string;
    details: string;
    isDefault: boolean;
  };
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: 'a1',
      title: 'Home',
      name: 'Rafiqul Islam',
      mobile: '+880 1234-567890',
      division: 'Dhaka',
      district: 'Dhaka',
      details: 'House 12, Road 5, Dhanmondi, Dhaka 1205',
      isDefault: true,
    },
    {
      id: 'a2',
      title: 'Office',
      name: 'Rafiqul Islam',
      mobile: '+880 1234-567890',
      division: 'Dhaka',
      district: 'Dhaka',
      details: 'Level 8, Tower B, Banani, Dhaka 1213',
      isDefault: false,
    },
  ]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string>();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [details, setDetails] = useState('');
  const [divisionOpen, setDivisionOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const divisionOptions = [
    'Dhaka',
    'Chattogram',
    'Sylhet',
    'Rajshahi',
    'Khulna',
    'Barishal',
    'Rangpur',
    'Mymensingh',
  ];
  const districtOptions: Record<string, string[]> = {
    Dhaka: ['Dhaka', 'Gazipur', 'Narayanganj', 'Tangail'],
    Chattogram: ['Chattogram', 'Cox’s Bazar', 'Cumilla', 'Lakshmipur'],
    Sylhet: ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj'],
    Rajshahi: ['Rajshahi', 'Bogura', 'Pabna', 'Natore'],
    Khulna: ['Khulna', 'Jashore', 'Satkhira', 'Kushtia'],
    Barishal: ['Barishal', 'Patuakhali', 'Bhola', 'Jhalokathi'],
    Rangpur: ['Rangpur', 'Dinajpur', 'Kurigram', 'Gaibandha'],
    Mymensingh: ['Mymensingh', 'Jamalpur', 'Netrokona', 'Sherpur'],
  };
  const resetForm = () => {
    setEditId(undefined);
    setName('');
    setMobile('');
    setDivision('');
    setDistrict('');
    setDetails('');
  };
  const openNew = () => {
    if (formOpen && !editId) {
      setFormOpen(false);
      resetForm();
      return;
    }
    resetForm();
    setFormOpen(true);
  };
  const editAddress = (item: Address) => {
    setEditId(item.id);
    setName(item.name);
    setMobile(item.mobile);
    setDivision(item.division);
    setDistrict(item.district);
    setDetails(item.details);
    setFormOpen(true);
  };
  const saveAddress = () => {
    if (
      !name.trim() ||
      !mobile.trim() ||
      !division ||
      !district ||
      !details.trim()
    ) {
      return;
    }
    if (editId) {
      setAddresses(current =>
        current.map(item =>
          item.id === editId
            ? {
                ...item,
                name: name.trim(),
                mobile: mobile.trim(),
                division,
                district,
                details: details.trim(),
              }
            : item,
        ),
      );
    } else {
      setAddresses(current => [
        ...current,
        {
          id: `a${Date.now()}`,
          title: current.length ? 'Other' : 'Home',
          name: name.trim(),
          mobile: mobile.trim(),
          division,
          district,
          details: details.trim(),
          isDefault: current.length === 0,
        },
      ]);
    }
    resetForm();
    setFormOpen(false);
  };
  return (
    <Screen scroll={false}>
      <Header title="Address Book" navigation={navigation} />
      <ScrollView
        contentContainerStyle={s.addressBookBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {addresses.map(item => (
          <View key={item.id} style={s.addressFull}>
            <View style={s.addressFullTop}>
              <View style={s.addressIcon}>
                <Icon
                  name={item.title === 'Home' ? 'home' : 'store'}
                  color={colors.accent}
                />
              </View>
              <View style={s.flex}>
                <Text style={s.addressLabel}>
                  {item.title}{' '}
                  {item.isDefault && <Text style={s.defaultTag}> DEFAULT</Text>}
                </Text>
                <Text style={s.addressPerson}>
                  {item.name} · {item.mobile}
                </Text>
              </View>
              <Pressable onPress={() => editAddress(item)}>
                <Text style={s.change}>Edit</Text>
              </Pressable>
            </View>
            <Text style={s.addressFullText}>
              {item.details}
              {`\n`}
              {item.district}, {item.division}
            </Text>
            <View style={s.addressActions}>
              <Pressable
                onPress={() =>
                  setAddresses(current =>
                    current.map(address => ({
                      ...address,
                      isDefault: address.id === item.id,
                    })),
                  )
                }
              >
                <Text style={s.addressActionText}>
                  {item.isDefault ? 'Delivery address' : 'Set as delivery'}
                </Text>
              </Pressable>
              <Pressable
                disabled={item.isDefault}
                onPress={() =>
                  setAddresses(current =>
                    current.filter(address => address.id !== item.id),
                  )
                }
              >
                <Text
                  style={[
                    s.addressActionRemove,
                    item.isDefault && s.addressActionDisabled,
                  ]}
                >
                  Remove
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
        {formOpen && (
          <View style={s.addressForm}>
            <View style={s.addressFormHead}>
              <View>
                <Text style={s.addressFormTitle}>
                  {editId ? 'Edit Shipping Address' : 'Add Shipping Address'}
                </Text>
                <Text style={s.addressFormSub}>
                  Enter the delivery information below.
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                style={s.addressFormClose}
              >
                <Icon name="plus" size={18} color={colors.textSoft} />
              </Pressable>
            </View>
            <Text style={s.addressFieldLabel}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter full name"
              placeholderTextColor={colors.textMuted}
              style={s.addressField}
            />
            <Text style={s.addressFieldLabel}>Mobile Number</Text>
            <TextInput
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              placeholder="01XXXXXXXXX"
              placeholderTextColor={colors.textMuted}
              style={s.addressField}
            />
            <Text style={s.addressFieldLabel}>Division</Text>
            <Pressable
              onPress={() => setDivisionOpen(!divisionOpen)}
              style={s.addressSelect}
            >
              <Text
                style={[s.addressSelectText, !division && s.addressPlaceholder]}
              >
                {division || 'Select division'}
              </Text>
              <Icon name="chevron" size={17} color={colors.textMuted} />
            </Pressable>
            {divisionOpen && (
              <View style={s.addressOptionList}>
                {divisionOptions.map(item => (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setDivision(item);
                      setDistrict('');
                      setDivisionOpen(false);
                    }}
                    style={s.addressOption}
                  >
                    <Text
                      style={[
                        s.addressOptionText,
                        division === item && s.addressOptionTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                    {division === item && (
                      <Icon name="check" size={16} color={colors.accent} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
            <Text style={s.addressFieldLabel}>District</Text>
            <Pressable
              disabled={!division}
              onPress={() => setDistrictOpen(!districtOpen)}
              style={[s.addressSelect, !division && s.addressSelectDisabled]}
            >
              <Text
                style={[s.addressSelectText, !district && s.addressPlaceholder]}
              >
                {district ||
                  (division ? 'Select district' : 'Select division first')}
              </Text>
              <Icon name="chevron" size={17} color={colors.textMuted} />
            </Pressable>
            {districtOpen && division && (
              <View style={s.addressOptionList}>
                {districtOptions[division].map(item => (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setDistrict(item);
                      setDistrictOpen(false);
                    }}
                    style={s.addressOption}
                  >
                    <Text
                      style={[
                        s.addressOptionText,
                        district === item && s.addressOptionTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                    {district === item && (
                      <Icon name="check" size={16} color={colors.accent} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
            <Text style={s.addressFieldLabel}>Area, Road & House Details</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              multiline
              placeholder="House, road, area and nearby landmark"
              placeholderTextColor={colors.textMuted}
              style={[s.addressField, s.addressDetails]}
            />
            <Pressable onPress={saveAddress} style={s.saveAddressButton}>
              <Text style={s.saveAddressText}>Save Address</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <View style={s.addAddressFooter}>
        <PrimaryButton
          title={formOpen && !editId ? 'Close Address Form' : 'Add New Address'}
          icon={formOpen && !editId ? undefined : 'plus'}
          onPress={openNew}
        />
      </View>
    </Screen>
  );
}

type SavedAddress = {
  id: string;
  title: string;
  name: string;
  mobile: string;
  division: string;
  district: string;
  details: string;
  isDefault: boolean;
};

let savedAddresses: SavedAddress[] = [
  {
    id: 'a1',
    title: 'Home',
    name: 'Rafiqul Islam',
    mobile: '01712345678',
    division: 'Dhaka',
    district: 'Dhaka',
    details: 'House 12, Road 5, Dhanmondi, Dhaka 1205',
    isDefault: true,
  },
  {
    id: 'a2',
    title: 'Office',
    name: 'Rafiqul Islam',
    mobile: '01812345678',
    division: 'Dhaka',
    district: 'Dhaka',
    details: 'Level 8, Tower B, Banani, Dhaka 1213',
    isDefault: false,
  },
];

export function AddressesScreen({ navigation }: ScreenProps) {
  const [addresses, setAddresses] = useState(() => fixtureMode ? [...savedAddresses] : []);
  useEffect(()=>{if(!fixtureMode)api<SavedAddress[]>('/me/addresses').then(setAddresses).catch(e=>Alert.alert('Addresses',e.message));},[]);
  const commit = async (next: SavedAddress[]) => {
    if(!fixtureMode){
      try {
        const removed=addresses.find(a=>!next.some(n=>n.id===a.id));
        if(removed)await api(`/me/addresses/${removed.id}`,'DELETE');
        else {
          const changed=next.find(a=>a.isDefault&&!addresses.find(old=>old.id===a.id)?.isDefault);
          if(changed){const {id:addressId,...data}=changed;await api(`/me/addresses/${addressId}`,'PATCH',data);}
        }
        setAddresses(await api<SavedAddress[]>('/me/addresses'));
      }catch(error){Alert.alert('Addresses',error instanceof Error?error.message:'Could not save address.');}
      return;
    }
    savedAddresses = next;
    setAddresses(next);
  };
  return (
    <Screen scroll={false}>
      <Header title="Address Book" navigation={navigation} />
      <ScrollView
        contentContainerStyle={s.addressBookBody}
        showsVerticalScrollIndicator={false}
      >
        {addresses.map(item => (
          <View key={item.id} style={s.addressFull}>
            <View style={s.addressFullTop}>
              <View style={s.addressIcon}>
                <Icon
                  name={item.title === 'Home' ? 'home' : 'store'}
                  color={colors.accent}
                />
              </View>
              <View style={s.flex}>
                <Text style={s.addressLabel}>
                  {item.title}{' '}
                  {item.isDefault && <Text style={s.defaultTag}> DEFAULT</Text>}
                </Text>
                <Text style={s.addressPerson}>
                  {item.name} · {item.mobile}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  navigation.push('AddAddress', { addressId: item.id, address: item })
                }
              >
                <Text style={s.change}>Edit</Text>
              </Pressable>
            </View>
            <Text style={s.addressFullText}>
              {item.details}
              {`\n`}
              {item.district}, {item.division}
            </Text>
            <View style={s.addressActions}>
              <Pressable
                onPress={() =>
                  commit(
                    addresses.map(address => ({
                      ...address,
                      isDefault: address.id === item.id,
                    })),
                  )
                }
              >
                <Text style={s.addressActionText}>
                  {item.isDefault ? 'Delivery address' : 'Set as delivery'}
                </Text>
              </Pressable>
              <Pressable
                disabled={item.isDefault}
                onPress={() =>
                  commit(addresses.filter(address => address.id !== item.id))
                }
              >
                <Text
                  style={[
                    s.addressActionRemove,
                    item.isDefault && s.addressActionDisabled,
                  ]}
                >
                  Remove
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={s.addAddressFooter}>
        <PrimaryButton
          title="Add New Address"
          icon="plus"
          onPress={() => navigation.push('AddAddress')}
        />
      </View>
    </Screen>
  );
}

const divisionOptions = [
  'Dhaka',
  'Chattogram',
  'Sylhet',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Rangpur',
  'Mymensingh',
];
const districtOptions: Record<string, string[]> = {
  Dhaka: ['Dhaka', 'Gazipur', 'Narayanganj', 'Tangail'],
  Chattogram: ['Chattogram', 'Cox’s Bazar', 'Cumilla', 'Lakshmipur'],
  Sylhet: ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj'],
  Rajshahi: ['Rajshahi', 'Bogura', 'Pabna', 'Natore'],
  Khulna: ['Khulna', 'Jashore', 'Satkhira', 'Kushtia'],
  Barishal: ['Barishal', 'Patuakhali', 'Bhola', 'Jhalokathi'],
  Rangpur: ['Rangpur', 'Dinajpur', 'Kurigram', 'Gaibandha'],
  Mymensingh: ['Mymensingh', 'Jamalpur', 'Netrokona', 'Sherpur'],
};

export function AddAddressScreen({ navigation, params }: ScreenProps) {
  const editing = fixtureMode ? savedAddresses.find(item => item.id === params?.addressId) : params?.address as SavedAddress | undefined;
  const [name, setName] = useState(editing?.name || '');
  const [mobile, setMobile] = useState(editing?.mobile || '');
  const [division, setDivision] = useState(editing?.division || '');
  const [district, setDistrict] = useState(editing?.district || '');
  const [details, setDetails] = useState(editing?.details || '');
  const [divisionOpen, setDivisionOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const mobileDigits = mobile.replace(/\D/g, '');
  const mobileValid = /^01\d{9}$/.test(mobileDigits);
  const valid = Boolean(
    name.trim() && mobileValid && division && district && details.trim(),
  );
  const saveAddress = async () => {
    setSubmitAttempted(true);
    if (!valid) {
      return;
    }
    if(!fixtureMode){
      try {
        await api(editing?`/me/addresses/${editing.id}`:'/me/addresses',editing?'PATCH':'POST',{
          title:editing?.title||'Home',name:name.trim(),mobile:mobileDigits,division,district,details:details.trim(),isDefault:editing?.isDefault||false,
        });navigation.back();
      }catch(error){Alert.alert('Shipping address',error instanceof Error?error.message:'Could not save address.');}
      return;
    }
    if (editing) {
      savedAddresses = savedAddresses.map(item =>
        item.id === editing.id
          ? {
              ...item,
              name: name.trim(),
              mobile: mobile.trim(),
              division,
              district,
              details: details.trim(),
            }
          : item,
      );
    } else {
      savedAddresses = [
        ...savedAddresses,
        {
          id: `a${Date.now()}`,
          title: savedAddresses.length ? 'Other' : 'Home',
          name: name.trim(),
          mobile: mobile.trim(),
          division,
          district,
          details: details.trim(),
          isDefault: savedAddresses.length === 0,
        },
      ];
    }
    navigation.back();
  };
  return (
    <Screen scroll={false}>
      <Header
        title={editing ? 'Edit Shipping Address' : 'Add Shipping Address'}
        navigation={navigation}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.addressPageBody}
      >
        <View style={s.addressPageIntro}>
          <View style={s.addressPageIcon}>
            <Icon name="pin" color={colors.accent} size={24} />
          </View>
          <View style={s.flex}>
            <Text style={s.addressFormTitle}>
              {editing ? 'Update delivery details' : 'Where should we deliver?'}
            </Text>
            <Text style={s.addressFormSub}>
              Add your contact and complete Bangladesh delivery address.
            </Text>
          </View>
        </View>
        <View style={s.addressForm}>
          <Text style={s.addressFieldLabel}>Full Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter full name"
            placeholderTextColor={colors.textMuted}
            style={[
              s.addressField,
              submitAttempted && !name.trim() && s.addressFieldError,
            ]}
          />
          {submitAttempted && !name.trim() && (
            <Text style={s.addressErrorText}>Please enter your full name.</Text>
          )}
          <Text style={s.addressFieldLabel}>Mobile Number</Text>
          <TextInput
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            placeholder="01XXXXXXXXX"
            placeholderTextColor={colors.textMuted}
            maxLength={11}
            style={[
              s.addressField,
              submitAttempted && !mobileValid && s.addressFieldError,
            ]}
          />
          {submitAttempted && !mobileValid && (
            <Text style={s.addressErrorText}>
              Enter a valid 11-digit mobile number (01XXXXXXXXX).
            </Text>
          )}
          <Text style={s.addressFieldLabel}>Division</Text>
          <Pressable
            onPress={() => setDivisionOpen(!divisionOpen)}
            style={[
              s.addressSelect,
              submitAttempted && !division && s.addressFieldError,
            ]}
          >
            <Text
              style={[s.addressSelectText, !division && s.addressPlaceholder]}
            >
              {division || 'Select division'}
            </Text>
            <Icon name="chevron" size={17} color={colors.textMuted} />
          </Pressable>
          {submitAttempted && !division && (
            <Text style={s.addressErrorText}>Please select your division.</Text>
          )}
          {divisionOpen && (
            <View style={s.addressOptionList}>
              {divisionOptions.map(item => (
                <Pressable
                  key={item}
                  onPress={() => {
                    setDivision(item);
                    setDistrict('');
                    setDivisionOpen(false);
                    setDistrictOpen(false);
                  }}
                  style={s.addressOption}
                >
                  <Text
                    style={[
                      s.addressOptionText,
                      division === item && s.addressOptionTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                  {division === item && (
                    <Icon name="check" size={16} color={colors.accent} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
          <Text style={s.addressFieldLabel}>District</Text>
          <Pressable
            disabled={!division}
            onPress={() => setDistrictOpen(!districtOpen)}
            style={[
              s.addressSelect,
              !division && s.addressSelectDisabled,
              submitAttempted && !district && s.addressFieldError,
            ]}
          >
            <Text
              style={[s.addressSelectText, !district && s.addressPlaceholder]}
            >
              {district ||
                (division ? 'Select district' : 'Select division first')}
            </Text>
            <Icon name="chevron" size={17} color={colors.textMuted} />
          </Pressable>
          {submitAttempted && !district && (
            <Text style={s.addressErrorText}>Please select your district.</Text>
          )}
          {districtOpen && division && (
            <View style={s.addressOptionList}>
              {districtOptions[division].map(item => (
                <Pressable
                  key={item}
                  onPress={() => {
                    setDistrict(item);
                    setDistrictOpen(false);
                  }}
                  style={s.addressOption}
                >
                  <Text
                    style={[
                      s.addressOptionText,
                      district === item && s.addressOptionTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                  {district === item && (
                    <Icon name="check" size={16} color={colors.accent} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
          <Text style={s.addressFieldLabel}>Area, Road & House Details</Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            multiline
            placeholder="House, road, area and nearby landmark"
            placeholderTextColor={colors.textMuted}
            style={[
              s.addressField,
              s.addressDetails,
              submitAttempted && !details.trim() && s.addressFieldError,
            ]}
          />
          {submitAttempted && !details.trim() && (
            <Text style={s.addressErrorText}>
              Please enter your area, road and house details.
            </Text>
          )}
          <Pressable onPress={saveAddress} style={s.saveAddressButton}>
            <Text style={s.saveAddressText}>Save Address</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

export function PaymentMethodsScreen({ navigation }: ScreenProps) {
  return (
    <Screen>
      <Header title="Payment Methods" navigation={navigation} />
      <View style={s.pageBody}>
        <View style={s.paymentWallet}>
          <Text style={s.paymentWalletLabel}>SAVED CARD</Text>
          <Text style={s.paymentWalletBrand}>VISA</Text>
          <Text style={s.paymentWalletNumber}>•••• •••• •••• 4289</Text>
          <View style={s.paymentWalletFoot}>
            <Text style={s.paymentWalletName}>RAFIQUL ISLAM</Text>
            <Text style={s.paymentWalletName}>08/29</Text>
          </View>
        </View>
        <SectionHeader title="Mobile banking" />
        <View style={s.whiteGroup}>
          <MenuRow
            icon="phone"
            title="bKash"
            subtitle="01•••••7890 · Verified"
            right={<StatusPill text="DEFAULT" tone="accent" />}
          />
          <MenuRow
            icon="phone"
            title="Nagad"
            subtitle="Connect a Nagad account"
            accent={colors.warning}
          />
        </View>
        <View style={s.addMethod}>
          <PrimaryButton title="Add payment method" outline icon="plus" />
        </View>
        <View style={s.secureNote}>
          <Icon name="shield" color={colors.success} />
          <Text style={s.secureNoteText}>
            Payment details are encrypted and never shared with sellers.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

export function HelpScreen({ navigation }: ScreenProps) {
  const [query, setQuery] = useState('');
  return (
    <Screen>
      <Header title="Help & Support" navigation={navigation} />
      <View style={s.helpHero}>
        <Text style={s.helpTitle}>How can we help?</Text>
        <View style={s.helpSearch}>
          <Icon name="search" color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search help topics..."
            placeholderTextColor={colors.textMuted}
            style={s.flex}
          />
        </View>
      </View>
      <View style={s.pageBody}>
        <View style={s.helpGrid}>
          {[
            ['orders', 'Orders'],
            ['truck', 'Delivery'],
            ['wallet', 'Payments'],
            ['package', 'Returns'],
          ].map(item => (
            <Pressable key={item[1]} style={s.helpItem}>
              <Icon name={item[0]} color={colors.accent} />
              <Text style={s.helpItemText}>{item[1]}</Text>
            </Pressable>
          ))}
        </View>
        <SectionHeader title="Popular questions" />
        <View style={s.whiteGroup}>
          {[
            'How do I track my order?',
            'How is Promo Balance used?',
            'Can I change my delivery address?',
            'When will I receive my refund?',
          ].map(item => (
            <MenuRow key={item} icon="help" title={item} />
          ))}
        </View>
        <Pressable
          onPress={() => navigation.push('Chat', { name: 'Loveraf Support' })}
          style={s.supportCard}
        >
          <View style={s.supportIcon}>
            <Icon name="message" color={colors.white} />
          </View>
          <View style={s.flex}>
            <Text style={s.supportTitle}>Chat with Loveraf Support</Text>
            <Text style={s.supportSub}>
              Average reply time · under 2 minutes
            </Text>
          </View>
          <Icon name="chevron" color={colors.white} />
        </Pressable>
      </View>
    </Screen>
  );
}

export function SettingsScreen({ navigation }: ScreenProps) {
  const [push, setPush] = useState(true);
  const [offers, setOffers] = useState(true);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { identities, activeIdentity, activeSeller, switchIdentity } =
    useSeller();
  const chooseIdentity = (id: 'personal' | string) => {
    switchIdentity(id);
    setSwitcherOpen(false);
    navigation.push(id === 'personal' ? 'Profile' : 'SellerProducts');
  };
  return (
    <Screen>
      <Header
        title="Settings"
        navigation={navigation}
        right={
          <Pressable
            accessibilityLabel="Open account switcher"
            onPress={() => setSwitcherOpen(true)}
            style={activeSeller ? s.settingsSellerAvatar : s.settingsMenuButton}
          >
            {activeSeller ? (
              <Text style={s.settingsSellerAvatarText}>
                {activeSeller.name.slice(0, 2).toUpperCase()}
              </Text>
            ) : (
              <Icon name="menu" color={colors.white} />
            )}
          </Pressable>
        }
      />
      <View style={s.pageBody}>
        <Text style={s.groupLabel}>ACCOUNT</Text>
        <View style={s.whiteGroup}>
          <MenuRow
            icon="globe"
            title="Language"
            subtitle="English"
            onPress={() => navigation.push('Language')}
          />
          <MenuRow
            icon="shield"
            title="Privacy & security"
            subtitle="Password and devices"
            onPress={() => navigation.push('Security')}
          />
          <MenuRow
            icon="pin"
            title="Saved addresses"
            onPress={() => navigation.push('Addresses')}
          />
        </View>
        <Text style={s.groupLabel}>NOTIFICATIONS</Text>
        <View style={s.whiteGroup}>
          <MenuRow
            icon="bell"
            title="Push notifications"
            subtitle="Order and account updates"
            right={
              <Switch
                value={push}
                onValueChange={setPush}
                trackColor={{ true: '#FFA8BD' }}
                thumbColor={push ? colors.accent : colors.white}
              />
            }
          />
          <MenuRow
            icon="sparkles"
            title="Offers & rewards"
            subtitle="Sales, coupons and balance"
            right={
              <Switch
                value={offers}
                onValueChange={setOffers}
                trackColor={{ true: '#FFA8BD' }}
                thumbColor={offers ? colors.accent : colors.white}
              />
            }
          />
        </View>
        <Text style={s.groupLabel}>MORE</Text>
        <View style={s.whiteGroup}>
          <MenuRow icon="help" title="Terms & policies" />
          <MenuRow
            icon="user"
            title="About Loveraf"
            subtitle="Version 1.0.0 UI Demo"
          />
        </View>
        <Pressable style={s.logout}>
          <Icon name="back" color={colors.accent} />
          <Text style={s.logoutText}>Log out</Text>
        </Pressable>
      </View>
      <Modal
        visible={switcherOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSwitcherOpen(false)}
      >
        <View style={s.identityBackdrop}>
          <Pressable
            onPress={() => setSwitcherOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.identityPanel}>
            <View style={s.identityHandle} />
            <View style={s.identityPanelHead}>
              <View>
                <Text style={s.identityTitle}>Switch profile</Text>
                <Text style={s.identitySub}>Personal and seller accounts</Text>
              </View>
              <Pressable
                onPress={() => setSwitcherOpen(false)}
                style={s.identityClose}
              >
                <Icon name="close" size={18} color={colors.textSoft} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => chooseIdentity('personal')}
              style={s.identityRow}
            >
              <View style={[s.identityAvatar, { backgroundColor: colors.ink }]}>
                <Text style={s.identityAvatarText}>RI</Text>
              </View>
              <View style={s.flex}>
                <Text style={s.identityName}>Rafiqul Islam</Text>
                <Text style={s.identityMeta}>Personal profile</Text>
              </View>
              {activeIdentity === 'personal' && (
                <Icon name="check" color={colors.success} />
              )}
            </Pressable>
            {identities.map(identity => (
              <Pressable
                key={identity.id}
                onPress={() => chooseIdentity(identity.id)}
                style={s.identityRow}
              >
                <View
                  style={[s.identityAvatar, { backgroundColor: colors.accent }]}
                >
                  <Text style={s.identityAvatarText}>
                    {identity.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={s.flex}>
                  <Text style={s.identityName}>{identity.name}</Text>
                  <Text style={s.identityMeta}>
                    {identity.handle} · {identity.category}
                  </Text>
                </View>
                {activeIdentity === identity.id && (
                  <Icon name="check" color={colors.success} />
                )}
              </Pressable>
            ))}
            {!identities.length && (
              <View style={s.noSellerState}>
                <Icon name="store" color={colors.accent} size={28} />
                <Text style={s.noSellerTitle}>No seller account yet</Text>
                <Text style={s.noSellerText}>
                  Create or log in to manage a store from this profile switcher.
                </Text>
              </View>
            )}
            <View style={s.identityActions}>
              <Pressable
                onPress={() => {
                  setSwitcherOpen(false);
                  navigation.push('SellerAccess', { mode: 'create' });
                }}
                style={s.identityPrimary}
              >
                <Icon name="plus" size={17} color={colors.white} />
                <Text style={s.identityPrimaryText}>Create Seller Account</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSwitcherOpen(false);
                  navigation.push('SellerAccess', { mode: 'login' });
                }}
                style={s.identitySecondary}
              >
                <Icon name="store" size={17} color={colors.accent} />
                <Text style={s.identitySecondaryText}>Seller Login</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

export function SellerAccessScreen({ navigation, params }: ScreenProps) {
  const [mode, setMode] = useState<'create' | 'login'>(
    params?.mode === 'login' ? 'login' : 'create',
  );
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [category, setCategory] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [attempted, setAttempted] = useState(false);
  const { createSeller, loginSeller } = useSeller();
  const createValid = Boolean(
    name.trim() && handle.trim() && category.trim() && password.length >= 6,
  );
  const loginValid = Boolean(login.trim() && password.length >= 6);
  const submit = async () => {
    setAttempted(true);
    try {
    if (mode === 'create') {
      if (!createValid) return;
      await createSeller({
        name: name.trim(),
        handle: handle.trim().replace(/\s+/g, ''),
        category: category.trim(),
      },password);
    } else {
      if (!loginValid) return;
      await loginSeller(login,password);
    }
    navigation.replace('SellerProducts');
    }catch(error){Alert.alert('Seller account',error instanceof Error?error.message:'Please try again.');}
  };
  return (
    <Screen>
      <Header title="Seller Account" navigation={navigation} />
      <View style={s.sellerAccessBody}>
        <View style={s.sellerAccessHero}>
          <View style={s.sellerAccessIcon}>
            <Icon name="store" color={colors.white} size={29} />
          </View>
          <View style={s.flex}>
            <Text style={s.sellerAccessTitle}>Grow with Loveraf</Text>
            <Text style={s.sellerAccessSub}>
              Create a store identity and switch profiles anytime.
            </Text>
          </View>
        </View>
        <View style={s.sellerModeTabs}>
          {(['create', 'login'] as const).map(item => (
            <Pressable
              key={item}
              onPress={() => {
                setMode(item);
                setAttempted(false);
              }}
              style={[s.sellerModeTab, mode === item && s.sellerModeTabActive]}
            >
              <Text
                style={[
                  s.sellerModeText,
                  mode === item && s.sellerModeTextActive,
                ]}
              >
                {item === 'create' ? 'Create account' : 'Seller login'}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.sellerForm}>
          {mode === 'create' ? (
            <>
              <Text style={s.addressFieldLabel}>Store Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your store name"
                placeholderTextColor={colors.textMuted}
                style={[
                  s.addressField,
                  attempted && !name.trim() && s.addressFieldError,
                ]}
              />
              {attempted && !name.trim() && (
                <Text style={s.addressErrorText}>Store name is required.</Text>
              )}
              <Text style={s.addressFieldLabel}>Seller ID</Text>
              <TextInput
                value={handle}
                onChangeText={setHandle}
                autoCapitalize="none"
                placeholder="@yourstore"
                placeholderTextColor={colors.textMuted}
                style={[
                  s.addressField,
                  attempted && !handle.trim() && s.addressFieldError,
                ]}
              />
              {attempted && !handle.trim() && (
                <Text style={s.addressErrorText}>Choose a seller ID.</Text>
              )}
              <Text style={s.addressFieldLabel}>Business Category</Text>
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="Fashion, Electronics, Beauty..."
                placeholderTextColor={colors.textMuted}
                style={[
                  s.addressField,
                  attempted && !category.trim() && s.addressFieldError,
                ]}
              />
              {attempted && !category.trim() && (
                <Text style={s.addressErrorText}>
                  Business category is required.
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={s.addressFieldLabel}>Seller ID or Email</Text>
              <TextInput
                value={login}
                onChangeText={setLogin}
                autoCapitalize="none"
                placeholder="@seller or seller@email.com"
                placeholderTextColor={colors.textMuted}
                style={[
                  s.addressField,
                  attempted && !login.trim() && s.addressFieldError,
                ]}
              />
              {attempted && !login.trim() && (
                <Text style={s.addressErrorText}>
                  Enter your seller ID or email.
                </Text>
              )}
            </>
          )}
          <Text style={s.addressFieldLabel}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Minimum 6 characters"
            placeholderTextColor={colors.textMuted}
            style={[
              s.addressField,
              attempted && password.length < 6 && s.addressFieldError,
            ]}
          />
          {attempted && password.length < 6 && (
            <Text style={s.addressErrorText}>
              Password must be at least 6 characters.
            </Text>
          )}
          <Pressable onPress={submit} style={s.sellerSubmit}>
            <Text style={s.sellerSubmitText}>
              {mode === 'create' ? 'Create & Switch' : 'Login & Switch'}
            </Text>
            <Icon name="chevron" color={colors.white} size={18} />
          </Pressable>
          <Text style={s.sellerDemoNote}>
            UI demo mode · Account data remains available during this app
            session.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

export function LanguageScreen({ navigation }: ScreenProps) {
  const [language, setLanguage] = useState('English');
  return (
    <Screen>
      <Header title="App Language" navigation={navigation} />
      <View style={s.pageBody}>
        <View style={s.languageHero}>
          <Icon name="globe" size={36} color={colors.accent} />
          <Text style={s.languageTitle}>Choose your language</Text>
          <Text style={s.languageSub}>
            The interface preview updates after a future backend/localization
            integration.
          </Text>
        </View>
        <View style={s.whiteGroup}>
          {[
            'English',
            'বাংলা (Bengali)',
            'हिन्दी (Hindi)',
            'العربية (Arabic)',
          ].map(item => (
            <Pressable
              key={item}
              onPress={() => setLanguage(item)}
              style={s.languageRow}
            >
              <Text style={s.languageName}>{item}</Text>
              <View style={[s.radio, language === item && s.radioActive]}>
                {language === item && <View style={s.radioDot} />}
              </View>
            </Pressable>
          ))}
        </View>
        <View style={s.saveButton}>
          <PrimaryButton title="Save language" onPress={navigation.back} />
        </View>
      </View>
    </Screen>
  );
}

export function SecurityScreen({ navigation }: ScreenProps) {
  const [bio, setBio] = useState(false);
  return (
    <Screen>
      <Header title="Privacy & Security" navigation={navigation} />
      <View style={s.pageBody}>
        <View style={s.securityScore}>
          <View style={s.securityIcon}>
            <Icon name="shield" size={33} color={colors.success} />
          </View>
          <View style={s.flex}>
            <Text style={s.securityTitle}>Your account is protected</Text>
            <Text style={s.securitySub}>Security score · Excellent</Text>
          </View>
          <StatusPill text="92%" tone="success" />
        </View>
        <Text style={s.groupLabel}>SIGN-IN SECURITY</Text>
        <View style={s.whiteGroup}>
          <MenuRow
            icon="lock"
            title="Change password"
            subtitle="Last changed 30 days ago"
          />
          <MenuRow
            icon="phone"
            title="Two-step verification"
            subtitle="Verified mobile number"
            right={<StatusPill text="ON" tone="success" />}
          />
          <MenuRow
            icon="user"
            title="Biometric unlock"
            subtitle="Use fingerprint or Face ID"
            right={
              <Switch
                value={bio}
                onValueChange={setBio}
                trackColor={{ true: '#FFA8BD' }}
                thumbColor={bio ? colors.accent : colors.white}
              />
            }
          />
        </View>
        <Text style={s.groupLabel}>DEVICES</Text>
        <View style={s.whiteGroup}>
          <MenuRow
            icon="phone"
            title="This Android device"
            subtitle="Dhaka · Active now"
            right={<StatusPill text="CURRENT" tone="info" />}
          />
          <MenuRow
            icon="globe"
            title="Chrome on Windows"
            subtitle="Dhaka · Yesterday"
          />
        </View>
      </View>
    </Screen>
  );
}

export function LoyaltyScreen({ navigation }: ScreenProps) {
  return (
    <Screen>
      <Header title="Loveraf Rewards" navigation={navigation} />
      <View style={s.loyaltyHero}>
        <Text style={s.loyaltyTier}>SILVER MEMBER</Text>
        <Text style={s.loyaltyPoints}>320</Text>
        <Text style={s.loyaltyLabel}>reward points</Text>
        <View style={s.tierProgress}>
          <View style={s.tierFill} />
        </View>
        <Text style={s.tierHint}>180 more points to Gold</Text>
      </View>
      <View style={s.pageBody}>
        <View style={s.loyaltyBenefits}>
          {[
            ['sparkles', '1 point', 'per ৳100 spent'],
            ['gift', 'Birthday', 'special reward'],
            ['truck', 'Priority', 'campaign access'],
          ].map(item => (
            <View key={item[1]} style={s.benefit}>
              <Icon name={item[0]} color={colors.accent} />
              <Text style={s.benefitValue}>{item[1]}</Text>
              <Text style={s.benefitLabel}>{item[2]}</Text>
            </View>
          ))}
        </View>
        <SectionHeader title="Explore rewards" />
        <View style={s.whiteGroup}>
          <MenuRow
            icon="gift"
            title="Gift cards"
            subtitle="Send or redeem Loveraf value"
            onPress={() => navigation.push('GiftCards')}
          />
          <MenuRow
            icon="star"
            title="Loveraf+ membership"
            subtitle="Premium delivery and early access"
            accent={colors.purple}
            onPress={() => navigation.push('Membership')}
          />
          <MenuRow
            icon="coupon"
            title="Member coupons"
            subtitle="3 offers available"
            onPress={() => navigation.push('Coupons')}
          />
        </View>
        <SectionHeader title="Point history" />
        <View style={s.whiteGroup}>
          <Transaction
            icon="bag"
            title="Order #LRF-0984"
            date="Aug 08 · Purchase points"
            amount="+ 61"
            positive
          />
          <Transaction
            icon="gift"
            title="Welcome bonus"
            date="Aug 01"
            amount="+ 259"
            positive
          />
        </View>
      </View>
    </Screen>
  );
}

export function GiftCardsScreen({ navigation }: ScreenProps) {
  const [selected, setSelected] = useState(1000);
  return (
    <Screen>
      <Header title="Gift Cards" navigation={navigation} />
      <View style={s.pageBody}>
        <View style={s.giftCardVisual}>
          <BrandLogo compact />
          <Text style={s.giftCardText}>
            A little love,{`\n`}beautifully delivered.
          </Text>
          <Text style={s.giftCardValue}>{money(selected)}</Text>
          <Text style={s.giftCardCode}>LOVERAF DIGITAL GIFT</Text>
        </View>
        <CardTitle title="Choose gift value" sub="Delivered instantly in-app" />
        <View style={s.amounts}>
          {[500, 1000, 2000, 5000].map(item => (
            <Pressable
              key={item}
              onPress={() => setSelected(item)}
              style={[s.amountChip, selected === item && s.amountChipActive]}
            >
              <Text
                style={[s.amountText, selected === item && s.amountTextActive]}
              >
                {money(item)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.fieldLabel}>Recipient name</Text>
        <TextInput
          placeholder="Enter name"
          placeholderTextColor={colors.textMuted}
          style={s.field}
        />
        <Text style={s.fieldLabel}>Personal message</Text>
        <TextInput
          placeholder="Write something lovely..."
          placeholderTextColor={colors.textMuted}
          style={[s.field, s.messageField]}
          multiline
        />
        <PrimaryButton
          title={`Send ${money(selected)} gift card`}
          icon="gift"
        />
      </View>
    </Screen>
  );
}

export function MembershipScreen({ navigation }: ScreenProps) {
  const [annual, setAnnual] = useState(true);
  return (
    <Screen>
      <Header title="Loveraf+" navigation={navigation} />
      <View style={s.membershipHero}>
        <View style={s.plusMark}>
          <Icon name="star" size={34} color={colors.white} />
        </View>
        <Text style={s.membershipTitle}>More value in every order.</Text>
        <Text style={s.membershipSub}>
          Unlimited priority delivery, member prices and early access.
        </Text>
        <View style={s.planSwitch}>
          <Pressable
            onPress={() => setAnnual(false)}
            style={[s.planOption, !annual && s.planActive]}
          >
            <Text style={[s.planText, !annual && s.planTextActive]}>
              Monthly
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setAnnual(true)}
            style={[s.planOption, annual && s.planActive]}
          >
            <Text style={[s.planText, annual && s.planTextActive]}>
              Annual · Save 30%
            </Text>
          </Pressable>
        </View>
        <Text style={s.membershipPrice}>
          {annual ? '৳1,990 / year' : '৳239 / month'}
        </Text>
      </View>
      <View style={s.pageBody}>
        <SectionHeader title="Everything included" />
        {[
          ['truck', 'Priority delivery', 'Faster delivery on eligible orders'],
          ['coupon', 'Member-only prices', 'Extra savings across campaigns'],
          ['sparkles', 'Early access', 'Shop premium drops before everyone'],
          [
            'help',
            'Priority support',
            'Move to the front of the support queue',
          ],
        ].map(item => (
          <View key={item[1]} style={s.memberBenefit}>
            <View style={s.memberIcon}>
              <Icon name={item[0]} color={colors.accent} />
            </View>
            <View>
              <Text style={s.memberBenefitTitle}>{item[1]}</Text>
              <Text style={s.memberBenefitSub}>{item[2]}</Text>
            </View>
          </View>
        ))}
        <PrimaryButton title="Start 7-day free trial" icon="sparkles" />
        <Text style={s.donationFoot}>
          Cancel anytime before renewal. Demo UI only—no charge will occur.
        </Text>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  accentText: { color: colors.accent, fontWeight: '700' },
  positive: { color: colors.success },
  headerAction: { fontSize: 10, color: colors.accent, fontWeight: '700' },
  headerAdd: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHero: {
    backgroundColor: colors.ink,
    padding: 18,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  profileGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#1A3A61',
    opacity: 0.3,
    right: -100,
    top: -90,
  },
  profileSettings: {
    position: 'absolute',
    right: 17,
    top: 17,
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: '#FFFFFF12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 25,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 23, color: colors.white, fontWeight: '800' },
  verified: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 23,
    height: 23,
    borderRadius: 9,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { fontSize: 20, color: colors.white, fontWeight: '800' },
  profileEmail: { fontSize: 10, color: '#9AA9BC', marginVertical: 5 },
  profileStats: {
    height: 64,
    backgroundColor: '#101F33',
    borderRadius: radius.md,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileStat: { flex: 1, alignItems: 'center' },
  profileStatValue: { fontSize: 17, color: colors.white, fontWeight: '800' },
  profileStatLabel: { fontSize: 8, color: '#91A1B6', marginTop: 3 },
  statDivider: { width: 1, height: 28, backgroundColor: '#2B3B51' },
  profileBody: { padding: 16, paddingBottom: 28 },
  ordersShortcut: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shortcutTitle: { fontSize: 16, color: colors.text, fontWeight: '800' },
  shortcutSub: { fontSize: 9, color: colors.textSoft, marginTop: 3 },
  viewAll: { fontSize: 10, color: colors.accent, fontWeight: '700' },
  orderActions: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginTop: 12,
    padding: 12,
    flexDirection: 'row',
  },
  orderAction: { flex: 1, alignItems: 'center' },
  orderActionIcon: {
    width: 37,
    height: 37,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderActionText: {
    fontSize: 8.5,
    color: colors.text,
    marginTop: 7,
    fontWeight: '600',
  },
  miniBadge: {
    position: 'absolute',
    right: 10,
    top: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBadgeText: { fontSize: 7, color: colors.white, fontWeight: '800' },
  menuGroup: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: 14,
  },
  demoRoleLabel: {
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 1.4,
    fontWeight: '700',
    marginTop: 22,
  },
  roleButtons: { flexDirection: 'row', gap: 10, marginTop: 9 },
  walletTop: { backgroundColor: colors.ink, padding: 16, paddingBottom: 22 },
  walletLead: { fontSize: 11, color: '#A6B3C4', marginBottom: 14 },
  walletCards: { flexDirection: 'row', gap: 11 },
  walletCard: {
    flex: 1,
    minHeight: 206,
    borderRadius: radius.lg,
    padding: 14,
    justifyContent: 'space-between',
  },
  walletPromo: { backgroundColor: colors.white },
  walletEarnings: { backgroundColor: '#EFFBF5' },
  walletCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCardLabel: {
    fontSize: 7.5,
    color: colors.textSoft,
    letterSpacing: 0.7,
    fontWeight: '700',
    marginTop: 12,
  },
  walletCardAmount: { fontSize: 26, color: colors.text, fontWeight: '800' },
  walletCardRule: {
    fontSize: 9.5,
    color: colors.textSoft,
    lineHeight: 14,
    minHeight: 30,
  },
  walletLink: { flexDirection: 'row', alignItems: 'center' },
  walletLinkText: { fontSize: 9.5, color: colors.accent, fontWeight: '700' },
  pageBody: { padding: 16, paddingBottom: 40 },
  quickGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickItem: { width: '23%', alignItems: 'center' },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: {
    fontSize: 9,
    color: colors.text,
    fontWeight: '600',
    marginTop: 7,
    textAlign: 'center',
  },
  whiteGroup: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  transaction: {
    minHeight: 68,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  transactionTitle: { fontSize: 11.5, color: colors.text, fontWeight: '700' },
  transactionDate: { fontSize: 8.5, color: colors.textSoft, marginTop: 4 },
  transactionAmount: { fontSize: 11, color: colors.text, fontWeight: '800' },
  balanceHero: {
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    minHeight: 192,
    padding: 22,
    overflow: 'hidden',
  },
  balanceHeroAccent: { backgroundColor: '#B90F3A' },
  heroOrb: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 110,
    backgroundColor: '#FFFFFF12',
    right: -50,
    top: -75,
  },
  balanceHeroTop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroEyebrow: {
    fontSize: 8,
    color: '#FFB5C7',
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  heroAmount: {
    fontSize: 39,
    color: colors.white,
    fontWeight: '800',
    marginTop: 10,
  },
  heroSubtitle: { fontSize: 10, color: '#CED6E2', marginTop: 6 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#FFFFFF18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rulePanel: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginTop: 16,
    padding: 16,
  },
  rulePanelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rulePanelTitle: { fontSize: 16, color: colors.text, fontWeight: '800' },
  ruleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  ruleNumber: {
    width: 46,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ruleNumberText: { fontSize: 12, color: colors.accent, fontWeight: '800' },
  ruleLineText: { fontSize: 10.5, color: colors.textSoft, flex: 1 },
  important: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  importantText: {
    fontSize: 9.5,
    lineHeight: 14,
    color: colors.textSoft,
    flex: 1,
  },
  exampleCard: {
    backgroundColor: '#EEF3FF',
    borderRadius: radius.lg,
    padding: 16,
    marginVertical: 16,
  },
  exampleKicker: {
    fontSize: 8,
    color: colors.info,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  exampleTitle: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
    marginTop: 6,
  },
  exampleBar: {
    height: 10,
    backgroundColor: colors.white,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 14,
  },
  exampleFill: { width: '90%', height: '100%', backgroundColor: colors.info },
  exampleLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  earnMetrics: { flexDirection: 'row', gap: 11, marginTop: 14 },
  fundActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  donateStrip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    gap: 10,
  },
  donateTitle: { fontSize: 11.5, color: colors.text, fontWeight: '700' },
  donateSub: { fontSize: 8.5, color: colors.textSoft, marginTop: 3 },
  withdrawCard: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 15,
  },
  cardTitle: { marginTop: 22, marginBottom: 12 },
  cardTitleText: { fontSize: 16, color: colors.text, fontWeight: '800' },
  cardTitleSub: { fontSize: 9.5, color: colors.textSoft, marginTop: 4 },
  fieldLabel: {
    fontSize: 9,
    color: colors.textSoft,
    fontWeight: '700',
    marginBottom: 7,
    marginTop: 12,
  },
  field: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 14,
    fontSize: 13,
    color: colors.text,
  },
  destination: {
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  destinationTitle: { fontSize: 11, color: colors.text, fontWeight: '700' },
  destinationSub: { fontSize: 8.5, color: colors.textSoft, marginTop: 3 },
  referralHero: {
    backgroundColor: colors.ink,
    padding: 24,
    alignItems: 'center',
  },
  referralArt: {
    width: 88,
    height: 88,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralTitle: {
    fontSize: 25,
    color: colors.white,
    fontWeight: '800',
    marginTop: 18,
  },
  referralText: {
    fontSize: 10.5,
    lineHeight: 17,
    color: '#AAB6C7',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 330,
  },
  codeCard: {
    width: '100%',
    backgroundColor: '#14243A',
    borderRadius: radius.md,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 18,
  },
  codeLabel: { fontSize: 7, color: '#8999AE', letterSpacing: 1 },
  code: {
    fontSize: 17,
    color: colors.white,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 4,
  },
  copyButton: {
    backgroundColor: colors.accent,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  copyText: { fontSize: 9, color: colors.white, fontWeight: '800' },
  refStats: { flexDirection: 'row', gap: 8 },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 13,
    ...shadow,
  },
  stepNumber: {
    fontSize: 22,
    color: colors.accent,
    fontWeight: '800',
    width: 52,
  },
  stepTitle: { fontSize: 12, color: colors.text, fontWeight: '700' },
  stepText: { fontSize: 9, color: colors.textSoft, marginTop: 4 },
  affiliateHero: {
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: 22,
  },
  affiliateEyebrow: {
    fontSize: 8,
    color: colors.accent,
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  affiliateAmount: {
    fontSize: 28,
    color: colors.white,
    fontWeight: '800',
    marginTop: 7,
  },
  affiliateStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  affiliateStatValue: { fontSize: 16, color: colors.white, fontWeight: '800' },
  affiliateStatLabel: { fontSize: 8, color: '#8F9DB0', marginTop: 3 },
  shareProduct: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },
  shareArt: {
    width: 77,
    height: 77,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  shareName: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.text,
    fontWeight: '700',
  },
  sharePrice: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '800',
    marginTop: 3,
  },
  commission: { fontSize: 8.5, color: colors.success, marginTop: 3 },
  shareButton: {
    width: 41,
    height: 41,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affiliateNote: {
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: 13,
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  affiliateNoteText: {
    fontSize: 9,
    lineHeight: 14,
    color: colors.textSoft,
    flex: 1,
  },
  couponTabs: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  couponTab: { fontSize: 10, color: colors.textSoft },
  couponTabActive: { fontSize: 10, color: colors.accent, fontWeight: '800' },
  couponCard: {
    ...shadow,
    minHeight: 124,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    overflow: 'hidden',
    marginBottom: 13,
  },
  couponEdge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  couponIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  couponTitle: { fontSize: 12, color: colors.text, fontWeight: '800' },
  couponSub: { fontSize: 8.5, color: colors.textSoft, marginTop: 4 },
  couponCode: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 8,
  },
  couponUse: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  couponUseText: { fontSize: 8, fontWeight: '800' },
  donationHero: {
    backgroundColor: '#651A44',
    padding: 28,
    alignItems: 'center',
  },
  donationTitle: {
    fontSize: 24,
    color: colors.white,
    fontWeight: '800',
    marginTop: 13,
  },
  donationText: {
    fontSize: 10.5,
    lineHeight: 17,
    color: '#DEBFD1',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 330,
  },
  causeCard: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 13,
    flexDirection: 'row',
  },
  causeVisual: {
    width: 82,
    height: 100,
    borderRadius: radius.md,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  causeTitle: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
    marginTop: 7,
  },
  causeSub: { fontSize: 8.5, color: colors.textSoft, marginTop: 5 },
  causeProgress: {
    height: 7,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 9,
  },
  causeFill: { height: '100%', width: '72%', backgroundColor: colors.purple },
  amounts: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  amountChip: {
    flex: 1,
    minHeight: 45,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  amountChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  amountText: { fontSize: 11, color: colors.text, fontWeight: '700' },
  amountTextActive: { color: colors.white },
  donationFoot: {
    fontSize: 8.5,
    color: colors.textMuted,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: 11,
  },
  noticeBody: { padding: 16 },
  messageHubTabs: {
    height: 78,
    backgroundColor: colors.white,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    ...shadow,
  },
  messageHubTab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageHubIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageHubBadge: {
    position: 'absolute',
    right: -5,
    top: -5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.white,
  },
  messageHubBadgeText: { color: colors.white, fontSize: 8, fontWeight: '900' },
  messageHubLabel: {
    fontSize: 8.5,
    color: colors.textSoft,
    fontWeight: '700',
    marginTop: 4,
  },
  activityBody: { padding: 14 },
  activityHeading: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: 10,
  },
  activityCard: {
    ...shadow,
    minHeight: 82,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityTitle: {
    flex: 1,
    fontSize: 11.5,
    color: colors.text,
    fontWeight: '800',
  },
  activityTime: { fontSize: 7.5, color: colors.textMuted },
  activityText: {
    fontSize: 9.5,
    lineHeight: 14,
    color: colors.textSoft,
    marginTop: 5,
  },
  promoActivityBanner: {
    minHeight: 78,
    borderRadius: radius.md,
    marginTop: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoActivityKicker: {
    fontSize: 7,
    color: colors.accent,
    letterSpacing: 1,
    fontWeight: '900',
  },
  promoActivityTitle: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '800',
    marginTop: 4,
  },
  noticeGroup: {
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 1.3,
    fontWeight: '700',
    marginBottom: 10,
  },
  notice: {
    ...shadow,
    minHeight: 78,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  noticeTitle: { fontSize: 11.5, color: colors.text, fontWeight: '700' },
  noticeSub: { fontSize: 9, color: colors.textSoft, marginTop: 4 },
  unread: {
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  chatRow: {
    ...shadow,
    minHeight: 82,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: 11,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  chatNameRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chatName: { fontSize: 12.5, color: colors.text, fontWeight: '800' },
  chatTime: { fontSize: 8, color: colors.textMuted },
  chatPreview: { fontSize: 9.5, color: colors.textSoft, marginTop: 6 },
  chatUnread: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  chatUnreadText: { fontSize: 8, color: colors.white, fontWeight: '800' },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  messages: { padding: 16, paddingBottom: 30 },
  chatDate: { alignItems: 'center', marginBottom: 18 },
  chatDateText: { fontSize: 7.5, color: colors.textMuted, letterSpacing: 1.2 },
  inBubble: {
    alignSelf: 'flex-start',
    maxWidth: '78%',
    backgroundColor: colors.white,
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    padding: 13,
    marginBottom: 12,
    ...shadow,
  },
  outBubble: {
    alignSelf: 'flex-end',
    maxWidth: '78%',
    backgroundColor: colors.ink,
    borderRadius: 18,
    borderBottomRightRadius: 5,
    padding: 13,
    marginBottom: 12,
  },
  bubbleText: { fontSize: 11.5, lineHeight: 17, color: colors.text },
  bubbleTime: { fontSize: 7.5, color: colors.textMuted, marginTop: 6 },
  outBubbleText: { fontSize: 11.5, lineHeight: 17, color: colors.white },
  outBubbleTime: {
    fontSize: 7.5,
    color: '#9EAABC',
    marginTop: 6,
    textAlign: 'right',
  },
  composer: {
    height: 70,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attach: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    height: 45,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 13,
    fontSize: 12,
    color: colors.text,
  },
  send: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressFull: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 15,
    marginBottom: 13,
  },
  addressFullTop: { flexDirection: 'row', alignItems: 'center' },
  addressIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addressLabel: { fontSize: 13, color: colors.text, fontWeight: '800' },
  defaultTag: { fontSize: 7, color: colors.accent },
  addressPerson: { fontSize: 8.5, color: colors.textSoft, marginTop: 4 },
  change: { fontSize: 9, color: colors.accent, fontWeight: '700' },
  addressFullText: {
    fontSize: 10,
    color: colors.textSoft,
    lineHeight: 16,
    marginTop: 12,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 22,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 11,
    marginTop: 11,
  },
  addressActionText: { fontSize: 9, color: colors.accent, fontWeight: '700' },
  addressActionRemove: { fontSize: 9, color: colors.textMuted },
  addressBookBody: { padding: 16, paddingBottom: 25 },
  addressActionDisabled: { opacity: 0.4 },
  addAddressFooter: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    padding: 12,
  },
  addressPageBody: { padding: 16, paddingBottom: 30 },
  addressPageIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  addressPageIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addressForm: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  addressFormHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  addressFormTitle: { fontSize: 18, color: colors.text, fontWeight: '900' },
  addressFormSub: { fontSize: 9, color: colors.textSoft, marginTop: 4 },
  addressFormClose: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  addressFieldLabel: {
    fontSize: 9,
    color: colors.textSoft,
    fontWeight: '800',
    marginTop: 13,
    marginBottom: 7,
  },
  addressField: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
    paddingHorizontal: 13,
    color: colors.text,
    fontSize: 12,
  },
  addressFieldError: { borderColor: colors.accent, borderWidth: 1.5 },
  addressErrorText: {
    fontSize: 9,
    lineHeight: 14,
    color: colors.accent,
    marginTop: 5,
  },
  addressDetails: { height: 88, paddingTop: 13, textAlignVertical: 'top' },
  addressSelect: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressSelectDisabled: { opacity: 0.55 },
  addressSelectText: { flex: 1, color: colors.text, fontSize: 12 },
  addressPlaceholder: { color: colors.textMuted },
  addressOptionList: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    marginTop: 6,
    overflow: 'hidden',
  },
  addressOption: {
    height: 43,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressOptionText: { flex: 1, fontSize: 10.5, color: colors.textSoft },
  addressOptionTextActive: { color: colors.accent, fontWeight: '800' },
  saveAddressButton: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  saveAddressButtonDisabled: { backgroundColor: colors.textMuted },
  saveAddressText: { fontSize: 13, color: colors.white, fontWeight: '900' },
  paymentWallet: {
    height: 200,
    borderRadius: radius.xl,
    backgroundColor: colors.ink,
    padding: 22,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  paymentWalletLabel: { fontSize: 8, color: '#92A0B3', letterSpacing: 1.3 },
  paymentWalletBrand: {
    position: 'absolute',
    right: 22,
    top: 19,
    fontSize: 20,
    color: colors.white,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  paymentWalletNumber: {
    fontSize: 19,
    color: colors.white,
    letterSpacing: 2.3,
    fontWeight: '600',
    marginTop: 48,
  },
  paymentWalletFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  paymentWalletName: { fontSize: 8, color: '#B6C1CF', letterSpacing: 1 },
  addMethod: { marginTop: 16 },
  secureNote: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: 12,
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },
  secureNoteText: {
    fontSize: 9,
    lineHeight: 14,
    color: colors.textSoft,
    flex: 1,
  },
  helpHero: { backgroundColor: colors.ink, padding: 20, paddingBottom: 24 },
  helpTitle: {
    fontSize: 24,
    color: colors.white,
    fontWeight: '800',
    marginBottom: 15,
  },
  helpSearch: {
    height: 51,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  helpGrid: { flexDirection: 'row', gap: 8 },
  helpItem: {
    ...shadow,
    flex: 1,
    minHeight: 82,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpItemText: {
    fontSize: 9,
    color: colors.text,
    fontWeight: '600',
    marginTop: 7,
  },
  supportCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  supportIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  supportTitle: { fontSize: 12, color: colors.white, fontWeight: '700' },
  supportSub: { fontSize: 8.5, color: '#99A7BA', marginTop: 4 },
  groupLabel: {
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 1.3,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  logout: {
    height: 55,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  logoutText: { fontSize: 12, color: colors.accent, fontWeight: '800' },
  settingsMenuButton: {
    width: 38,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF10',
    marginRight: 2,
  },
  settingsSellerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  settingsSellerAvatarText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  identityBackdrop: {
    flex: 1,
    backgroundColor: '#07142688',
    justifyContent: 'flex-end',
  },
  identityPanel: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  identityHandle: {
    width: 42,
    height: 4,
    borderRadius: 3,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: 18,
  },
  identityPanelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  identityTitle: { fontSize: 20, color: colors.text, fontWeight: '900' },
  identitySub: { fontSize: 9.5, color: colors.textSoft, marginTop: 4 },
  identityClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityRow: {
    minHeight: 70,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  identityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  identityAvatarText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  identityName: { fontSize: 12.5, color: colors.text, fontWeight: '800' },
  identityMeta: { fontSize: 8.5, color: colors.textSoft, marginTop: 4 },
  noSellerState: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 10,
  },
  noSellerTitle: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '800',
    marginTop: 8,
  },
  noSellerText: {
    fontSize: 8.5,
    lineHeight: 13,
    color: colors.textSoft,
    textAlign: 'center',
    marginTop: 4,
  },
  identityActions: { gap: 9, marginTop: 4 },
  identityPrimary: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  identityPrimaryText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  identitySecondary: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  identitySecondaryText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
  },
  sellerAccessBody: { padding: 16 },
  sellerAccessHero: {
    minHeight: 108,
    borderRadius: radius.xl,
    backgroundColor: colors.ink,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAccessIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  sellerAccessTitle: { color: colors.white, fontSize: 18, fontWeight: '900' },
  sellerAccessSub: {
    color: '#AEB9C9',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 5,
  },
  sellerModeTabs: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    padding: 4,
    flexDirection: 'row',
    marginTop: 14,
  },
  sellerModeTab: {
    flex: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerModeTabActive: { backgroundColor: colors.white, ...shadow },
  sellerModeText: { color: colors.textSoft, fontSize: 10, fontWeight: '700' },
  sellerModeTextActive: { color: colors.accent, fontWeight: '900' },
  sellerForm: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 15,
    marginTop: 13,
    ...shadow,
  },
  sellerSubmit: {
    height: 51,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sellerSubmitText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  sellerDemoNote: {
    color: colors.textMuted,
    fontSize: 8,
    textAlign: 'center',
    marginTop: 10,
  },
  languageHero: { alignItems: 'center', padding: 20 },
  languageTitle: {
    fontSize: 19,
    color: colors.text,
    fontWeight: '800',
    marginTop: 13,
  },
  languageSub: {
    fontSize: 9.5,
    lineHeight: 15,
    color: colors.textSoft,
    textAlign: 'center',
    marginTop: 7,
  },
  languageRow: {
    height: 61,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  languageName: { fontSize: 12, color: colors.text, fontWeight: '600' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.accent },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  saveButton: { marginTop: 18 },
  securityScore: {
    ...shadow,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  securityTitle: { fontSize: 12.5, color: colors.text, fontWeight: '800' },
  securitySub: { fontSize: 9, color: colors.success, marginTop: 4 },
  loyaltyHero: {
    backgroundColor: '#31195F',
    padding: 26,
    alignItems: 'center',
  },
  loyaltyTier: {
    fontSize: 8,
    color: '#D9C9FF',
    letterSpacing: 2,
    fontWeight: '800',
  },
  loyaltyPoints: {
    fontSize: 51,
    color: colors.white,
    fontWeight: '800',
    marginTop: 8,
  },
  loyaltyLabel: { fontSize: 10, color: '#C3B4E4' },
  tierProgress: {
    width: '100%',
    maxWidth: 320,
    height: 8,
    borderRadius: 5,
    backgroundColor: '#FFFFFF20',
    overflow: 'hidden',
    marginTop: 20,
  },
  tierFill: { width: '64%', height: '100%', backgroundColor: '#FFBE3D' },
  tierHint: { fontSize: 8.5, color: '#C3B4E4', marginTop: 8 },
  loyaltyBenefits: { flexDirection: 'row', gap: 9 },
  benefit: {
    ...shadow,
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    minHeight: 110,
    padding: 12,
  },
  benefitValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '800',
    marginTop: 12,
  },
  benefitLabel: {
    fontSize: 8,
    lineHeight: 12,
    color: colors.textSoft,
    marginTop: 3,
  },
  giftCardVisual: {
    height: 230,
    borderRadius: radius.xl,
    backgroundColor: '#531532',
    padding: 22,
    overflow: 'hidden',
  },
  giftCardText: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.white,
    fontWeight: '800',
    marginTop: 28,
  },
  giftCardValue: {
    position: 'absolute',
    right: 20,
    bottom: 37,
    fontSize: 25,
    color: colors.white,
    fontWeight: '800',
  },
  giftCardCode: {
    position: 'absolute',
    left: 22,
    bottom: 20,
    fontSize: 7.5,
    color: '#DFAAC1',
    letterSpacing: 1.4,
  },
  messageField: {
    height: 84,
    paddingTop: 13,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  membershipHero: {
    backgroundColor: colors.ink,
    padding: 25,
    alignItems: 'center',
  },
  plusMark: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipTitle: {
    fontSize: 25,
    color: colors.white,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
  },
  membershipSub: {
    fontSize: 10,
    lineHeight: 16,
    color: '#AAB6C7',
    textAlign: 'center',
    marginTop: 8,
  },
  planSwitch: {
    width: '100%',
    height: 48,
    backgroundColor: '#15253A',
    borderRadius: radius.md,
    padding: 4,
    flexDirection: 'row',
    marginTop: 20,
  },
  planOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  planActive: { backgroundColor: colors.accent },
  planText: { fontSize: 9, color: '#91A0B3', fontWeight: '600' },
  planTextActive: { color: colors.white, fontWeight: '800' },
  membershipPrice: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '700',
    marginTop: 15,
  },
  memberBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  memberIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberBenefitTitle: { fontSize: 12.5, color: colors.text, fontWeight: '800' },
  memberBenefitSub: { fontSize: 9, color: colors.textSoft, marginTop: 4 },
});
