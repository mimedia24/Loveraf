import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import {Text} from './Typography';
import Svg, {Polygon} from 'react-native-svg';
import {colors, radius} from '../theme';

export type DiscountOctagonProps = {
  discounts: string[];
  size?: number;
  fillColor?: string;
  accentColor?: string;
  animationDuration?: number;
  animationType?: 'float' | 'pulse' | 'rotate';
  textAngle?: number;
  textOffsetX?: number;
};

export function DiscountOctagon({
  discounts,
  size = 86,
  fillColor = colors.accent,
  accentColor = '#FF7395',
  animationDuration = 2200,
  animationType = 'float',
  textAngle = -11,
  textOffsetX = -12,
}: DiscountOctagonProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [discountIndex, setDiscountIndex] = useState(0);
  const validDiscounts = discounts.filter(item => Boolean(item?.trim()));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {toValue: 1, duration: animationDuration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
        Animated.timing(progress, {toValue: 0, duration: animationDuration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [animationDuration, progress]);

  useEffect(() => {
    if (validDiscounts.length < 2) return;
    const timer = setInterval(
      () => setDiscountIndex(current => (current + 1) % validDiscounts.length),
      Math.max(2800, animationDuration * 2),
    );
    return () => clearInterval(timer);
  }, [animationDuration, validDiscounts.length]);

  if (!validDiscounts.length) return null;
  const transform =
    animationType === 'rotate'
      ? [{rotate: progress.interpolate({inputRange: [0, 1], outputRange: ['-2deg', '5deg']})}]
      : animationType === 'pulse'
        ? [{scale: progress.interpolate({inputRange: [0, 1], outputRange: [0.96, 1.04]})}]
        : [{translateY: progress.interpolate({inputRange: [0, 1], outputRange: [2, -4]})}];

  return (
    <View style={styles.row} testID="discount-octagon">
      <View style={styles.copy}>
        <Text style={styles.kicker}>TODAY'S SPECIAL</Text>
        <Text style={styles.title}>Fresh deals are live</Text>
        <Text style={styles.subtitle}>Swipe down to discover more</Text>
      </View>
      <Animated.View style={{width: size, height: size, transform}}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Polygon points="30,3 70,3 97,30 97,70 70,97 30,97 3,70 3,30" fill={accentColor} />
          <Polygon points="31,8 69,8 92,31 92,69 69,92 31,92 8,69 8,31" fill={fillColor} />
        </Svg>
        <View style={[styles.discountTextWrap, {left: size * 0.2 + textOffsetX, transform: [{rotate: `${textAngle}deg`}]}]}>
          <Text
            numberOfLines={2}
            style={[styles.discountText, {fontSize: size * 0.16, lineHeight: size * 0.18}]}
          >
            {validDiscounts[discountIndex]}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {minHeight: 94, marginTop: 11, borderRadius: radius.lg, backgroundColor: '#132137', borderWidth: 1, borderColor: '#263953', paddingLeft: 15, paddingRight: 8, flexDirection: 'row', alignItems: 'center', overflow: 'hidden'},
  copy: {flex: 1},
  kicker: {fontSize: 7.5, letterSpacing: 1.4, color: '#F98EAA', fontWeight: '900'},
  title: {fontSize: 15, color: colors.white, fontWeight: '900', marginTop: 4},
  subtitle: {fontSize: 8.5, color: '#AEB9C9', marginTop: 4},
  discountTextWrap: {position: 'absolute', top: '31%', width: '67%', alignItems: 'flex-start'},
  discountText: {lineHeight: 17, color: colors.white, fontWeight: '900', textAlign: 'left'},
});
