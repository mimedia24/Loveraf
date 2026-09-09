import React from 'react';
import {Image, StyleSheet} from 'react-native';
import Svg, {Defs, LinearGradient, Path, Stop} from 'react-native-svg';

const fullLogo = require('../assets/fulllogo.png');

export function BrandMark({size = 48}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs><LinearGradient id="brand" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FF496F"/><Stop offset="1" stopColor="#E4003C"/></LinearGradient></Defs>
      <Path d="M12 8h13v16h12c10 0 17 7 17 16S47 56 37 56H25V44h12c3 0 5-2 5-4s-2-4-5-4H25c-7 0-13-6-13-13V8Z" fill="url(#brand)"/>
      <Path d="M22 8h12v12h8c7 0 12 5 12 12v4H42v-3c0-1-1-2-2-2H22V8Z" fill="#FFFFFF" opacity=".96"/>
    </Svg>
  );
}

export function BrandLogo({compact = false}: {light?: boolean; compact?: boolean}) {
  return (
    <Image
      source={fullLogo}
      resizeMode="contain"
      accessibilityLabel="Loveraf"
      style={compact ? styles.compactLogo : styles.logo}
    />
  );
}

const styles = StyleSheet.create({
  logo: {width: 162, height: 45},
  compactLogo: {width: 108, height: 30},
});
