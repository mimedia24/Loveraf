import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

type Props = {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({
  name,
  size = 22,
  color = '#101725',
  strokeWidth = 1.9,
}: Props) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  let content: React.ReactNode;
  switch (name) {
    case 'menu':
      content = (
        <>
          <Line x1="4" y1="7" x2="20" y2="7" {...common} />
          <Line x1="4" y1="12" x2="20" y2="12" {...common} />
          <Line x1="4" y1="17" x2="20" y2="17" {...common} />
        </>
      );
      break;
    case 'home':
      content = (
        <>
          <Path d="M3 10.8 12 3l9 7.8" {...common} />
          <Path d="M5 9.6V21h14V9.6M9 21v-7h6v7" {...common} />
        </>
      );
      break;
    case 'grid':
      content = (
        <>
          <Rect x="3" y="3" width="7" height="7" rx="2" {...common} />
          <Rect x="14" y="3" width="7" height="7" rx="2" {...common} />
          <Rect x="3" y="14" width="7" height="7" rx="2" {...common} />
          <Rect x="14" y="14" width="7" height="7" rx="2" {...common} />
        </>
      );
      break;
    case 'cart':
      content = (
        <>
          <Circle cx="9" cy="20" r="1" fill={color} />
          <Circle cx="19" cy="20" r="1" fill={color} />
          <Path
            d="M3 4h2l2.3 10.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6"
            {...common}
          />
        </>
      );
      break;
    case 'heart':
      content = (
        <Path
          d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"
          {...common}
        />
      );
      break;
    case 'user':
      content = (
        <>
          <Circle cx="12" cy="8" r="4" {...common} />
          <Path d="M4 21a8 8 0 0 1 16 0" {...common} />
        </>
      );
      break;
    case 'search':
      content = (
        <>
          <Circle cx="11" cy="11" r="7" {...common} />
          <Line x1="16.2" y1="16.2" x2="21" y2="21" {...common} />
        </>
      );
      break;
    case 'bell':
      content = (
        <>
          <Path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
            {...common}
          />
          <Path d="M10 21h4" {...common} />
        </>
      );
      break;
    case 'back':
      content = (
        <>
          <Polyline points="15 18 9 12 15 6" {...common} />
          <Line x1="9" y1="12" x2="21" y2="12" {...common} />
        </>
      );
      break;
    case 'exchange':
      content = (
        <>
          <Path d="M4 8h13l-3-3M20 16H7l3 3" {...common} />
          <Path d="m14 5 3 3-3 3M10 13l-3 3 3 3" {...common} />
        </>
      );
      break;
    case 'chevron':
      content = <Polyline points="9 18 15 12 9 6" {...common} />;
      break;
    case 'bag':
      content = (
        <>
          <Path d="M5 8h14l-1 13H6L5 8Z" {...common} />
          <Path d="M9 9V6a3 3 0 0 1 6 0v3" {...common} />
        </>
      );
      break;
    case 'wallet':
      content = (
        <>
          <Path
            d="M3 6.5A2.5 2.5 0 0 1 5.5 4H20v16H5.5A2.5 2.5 0 0 1 3 17.5v-11Z"
            {...common}
          />
          <Path d="M15 10h7v5h-7a2.5 2.5 0 0 1 0-5Z" {...common} />
          <Circle cx="16" cy="12.5" r=".7" fill={color} />
        </>
      );
      break;
    case 'gift':
      content = (
        <>
          <Rect x="3" y="9" width="18" height="12" rx="2" {...common} />
          <Path
            d="M12 9v12M3 13h18M12 9H8.5A2.5 2.5 0 1 1 11 6.5V9ZM12 9h3.5A2.5 2.5 0 1 0 13 6.5V9Z"
            {...common}
          />
        </>
      );
      break;
    case 'orders':
      content = (
        <>
          <Rect x="5" y="4" width="14" height="17" rx="2" {...common} />
          <Path d="M9 4V2h6v2M9 10h6M9 15h6" {...common} />
        </>
      );
      break;
    case 'star':
      content = (
        <Path
          d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z"
          {...common}
        />
      );
      break;
    case 'pin':
      content = (
        <>
          <Path
            d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"
            {...common}
          />
          <Circle cx="12" cy="10" r="2.4" {...common} />
        </>
      );
      break;
    case 'card':
      content = (
        <>
          <Rect x="3" y="5" width="18" height="14" rx="2" {...common} />
          <Line x1="3" y1="10" x2="21" y2="10" {...common} />
          <Line x1="7" y1="15" x2="11" y2="15" {...common} />
        </>
      );
      break;
    case 'message':
      content = (
        <Path d="M21 12a8 8 0 0 1-8 8H5l-3 2 1-5a9 9 0 1 1 18-5Z" {...common} />
      );
      break;
    case 'chat':
      content = (
        <>
          <Path
            d="M20.5 11.5a8 8 0 0 1-8 8H6l-4 2 1.2-4.5A8.5 8.5 0 1 1 20.5 11.5Z"
            {...common}
          />
          <Circle cx="8" cy="12" r="1" fill={color} />
          <Circle cx="12" cy="12" r="1" fill={color} />
          <Circle cx="16" cy="12" r="1" fill={color} />
        </>
      );
      break;
    case 'phone':
      content = (
        <>
          <Rect x="6" y="2" width="12" height="20" rx="3" {...common} />
          <Line x1="10" y1="5" x2="14" y2="5" {...common} />
          <Circle cx="12" cy="18.5" r=".8" fill={color} />
        </>
      );
      break;
    case 'settings':
      content = (
        <>
          <Circle cx="12" cy="12" r="3" {...common} />
          <Path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3.1 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3.1V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z"
            {...common}
          />
        </>
      );
      break;
    case 'help':
      content = (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path
            d="M9.8 9a2.4 2.4 0 1 1 3.3 2.2c-.8.4-1.1.9-1.1 1.8"
            {...common}
          />
          <Circle cx="12" cy="17" r=".8" fill={color} />
        </>
      );
      break;
    case 'shield':
      content = (
        <>
          <Path
            d="M12 2 20 5v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5l8-3Z"
            {...common}
          />
          <Path d="m8.5 12 2.2 2.2 4.8-5" {...common} />
        </>
      );
      break;
    case 'share':
      content = (
        <>
          <Circle cx="18" cy="5" r="2.5" {...common} />
          <Circle cx="6" cy="12" r="2.5" {...common} />
          <Circle cx="18" cy="19" r="2.5" {...common} />
          <Path d="m8.2 10.8 7.5-4.4M8.2 13.2l7.5 4.4" {...common} />
        </>
      );
      break;
    case 'close':
      content = (
        <>
          <Line x1="6" y1="6" x2="18" y2="18" {...common} />
          <Line x1="18" y1="6" x2="6" y2="18" {...common} />
        </>
      );
      break;
    case 'more':
      content = (
        <>
          <Circle cx="5" cy="12" r="1.5" fill={color} />
          <Circle cx="12" cy="12" r="1.5" fill={color} />
          <Circle cx="19" cy="12" r="1.5" fill={color} />
        </>
      );
      break;
    case 'filter':
      content = (
        <>
          <Line x1="4" y1="6" x2="20" y2="6" {...common} />
          <Circle cx="9" cy="6" r="2" fill={color} />
          <Line x1="4" y1="12" x2="20" y2="12" {...common} />
          <Circle cx="15" cy="12" r="2" fill={color} />
          <Line x1="4" y1="18" x2="20" y2="18" {...common} />
          <Circle cx="11" cy="18" r="2" fill={color} />
        </>
      );
      break;
    case 'truck':
      content = (
        <>
          <Path d="M3 6h11v11H3V6Zm11 4h4l3 3v4h-7v-7Z" {...common} />
          <Circle cx="7" cy="19" r="2" {...common} />
          <Circle cx="18" cy="19" r="2" {...common} />
        </>
      );
      break;
    case 'check':
      content = (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="m8 12 2.7 2.7L16.5 9" {...common} />
        </>
      );
      break;
    case 'clock':
      content = (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M12 7v5l3 2" {...common} />
        </>
      );
      break;
    case 'trash':
      content = (
        <>
          <Path
            d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"
            {...common}
          />
        </>
      );
      break;
    case 'plus':
      content = (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" {...common} />
          <Line x1="5" y1="12" x2="19" y2="12" {...common} />
        </>
      );
      break;
    case 'minus':
      content = <Line x1="5" y1="12" x2="19" y2="12" {...common} />;
      break;
    case 'lock':
      content = (
        <>
          <Rect x="5" y="10" width="14" height="11" rx="2" {...common} />
          <Path d="M8 10V7a4 4 0 0 1 8 0v3" {...common} />
        </>
      );
      break;
    case 'globe':
      content = (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path
            d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"
            {...common}
          />
        </>
      );
      break;
    case 'coupon':
      content = (
        <Path
          d="M3 7a2 2 0 0 0 0 4v6h18v-6a2 2 0 0 0 0-4V5H3v2ZM12 5v2M12 11v2M12 17v-2"
          {...common}
        />
      );
      break;
    case 'sparkles':
      content = (
        <>
          <Path
            d="m12 2 1.2 4.2L17 8l-3.8 1.8L12 14l-1.2-4.2L7 8l3.8-1.8L12 2Z"
            {...common}
          />
          <Path
            d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z"
            {...common}
          />
        </>
      );
      break;
    case 'store':
      content = (
        <>
          <Path d="M4 9h16l-1-5H5L4 9Zm1 0v11h14V9M9 20v-6h6v6" {...common} />
          <Path
            d="M4 9a3 3 0 0 0 5 2 3 3 0 0 0 6 0 3 3 0 0 0 5-2"
            {...common}
          />
        </>
      );
      break;
    case 'package':
      content = (
        <>
          <Path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z" {...common} />
          <Path d="m4 7 8 4 8-4M12 11v10M8 5l8 4" {...common} />
        </>
      );
      break;
    default:
      content = <Circle cx="12" cy="12" r="8" {...common} />;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {content}
    </Svg>
  );
}
