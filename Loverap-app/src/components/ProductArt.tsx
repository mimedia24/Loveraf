import React from 'react';
import Svg, {Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import {ProductArtType} from '../types';

export function ProductArt({type, size = 110}: {type: ProductArtType; size?: number}) {
  const common = {stroke: '#172033', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  let art: React.ReactNode = null;
  switch (type) {
    case 'headphones': art = <><Path d="M23 49a27 27 0 0 1 54 0" fill="none" {...common}/><Rect x="16" y="45" width="18" height="31" rx="9" fill="#171B24" {...common}/><Rect x="66" y="45" width="18" height="31" rx="9" fill="#171B24" {...common}/><Path d="M27 48a23 23 0 0 1 46 0" fill="none" stroke="#F5164B" strokeWidth="4"/><Circle cx="25" cy="60" r="4" fill="#F5164B"/><Circle cx="75" cy="60" r="4" fill="#F5164B"/></>; break;
    case 'hoodie': art = <><Path d="M36 31c1-11 27-11 28 0l15 12-10 15-7-6v31H38V52l-7 6-10-15 15-12Z" fill="#151A24" {...common}/><Path d="M40 30c3 12 17 12 20 0M50 43v20" fill="none" stroke="#5C6575" strokeWidth="2"/></>; break;
    case 'watch': art = <><Rect x="39" y="8" width="22" height="84" rx="11" fill="#262D39"/><Rect x="28" y="27" width="44" height="48" rx="14" fill="#101725" {...common}/><Rect x="33" y="32" width="34" height="38" rx="10" fill="url(#screen)"/><Circle cx="50" cy="51" r="9" fill="none" stroke="#F5164B" strokeWidth="3"/><Path d="M50 42v9l6 4" fill="none" stroke="#fff" strokeWidth="2"/></>; break;
    case 'chair': art = <><Path d="M27 22h38c8 0 12 6 10 14l-7 28H30l-9-28c-2-8-1-14 6-14Z" fill="#B47A4D" {...common}/><Rect x="23" y="57" width="54" height="17" rx="8" fill="#C98C5A" {...common}/><Path d="M30 73 25 91M70 73l5 18" fill="none" {...common}/></>; break;
    case 'dress': art = <><Path d="M41 10h18l3 18 19 55H19l19-55 3-18Z" fill="url(#pink)" {...common}/><Path d="M41 10c1 10 17 10 18 0M38 29h24" fill="none" stroke="#BD3158" strokeWidth="2"/></>; break;
    case 'phone': art = <><Rect x="29" y="8" width="42" height="84" rx="10" fill="#121A2A" {...common}/><Rect x="34" y="15" width="32" height="66" rx="6" fill="url(#screen)"/><Circle cx="50" cy="86" r="2" fill="#98A2B3"/><Circle cx="42" cy="23" r="5" fill="#172033"/><Circle cx="58" cy="23" r="5" fill="#172033"/></>; break;
    case 'shoe': art = <><Path d="M17 60c17 1 24-16 26-31 9 13 15 20 31 24 8 2 12 7 10 15-2 8-11 11-23 11H25c-11 0-15-4-13-11l5-8Z" fill="#FFFFFF" {...common}/><Path d="M14 68h69M41 48l13 9M36 55l12 8" fill="none" stroke="#F5164B" strokeWidth="3"/></>; break;
    case 'beauty': art = <><Rect x="23" y="35" width="25" height="48" rx="5" fill="#F9A8C1" {...common}/><Rect x="27" y="22" width="17" height="14" rx="2" fill="#CF6686" {...common}/><Rect x="55" y="25" width="23" height="58" rx="8" fill="#7F56D9" {...common}/><Path d="M60 25V14h13v11" fill="none" {...common}/><Circle cx="66.5" cy="55" r="6" fill="#FDE7EF"/></>; break;
    case 'grocery': art = <><Path d="M22 37h56l-5 48H27l-5-48Z" fill="#D59A2D" {...common}/><Path d="M34 37c0-14 32-14 32 0" fill="none" {...common}/><Path d="M35 23c-6-12 4-18 13-11-2 8-6 12-13 11ZM56 25c1-12 12-15 18-7-4 7-10 9-18 7Z" fill="#42A878" stroke="#267654" strokeWidth="2"/></>; break;
  }
  return <Svg width={size} height={size} viewBox="0 0 100 100"><Defs><LinearGradient id="screen" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#253D62"/><Stop offset="1" stopColor="#071120"/></LinearGradient><LinearGradient id="pink" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FF8BAC"/><Stop offset="1" stopColor="#D93667"/></LinearGradient></Defs>{art}<Ellipse cx="50" cy="93" rx="32" ry="4" fill="#101725" opacity=".08"/></Svg>;
}
