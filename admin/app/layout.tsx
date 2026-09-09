import type {ReactNode} from 'react';
import './styles.css';
export const metadata={title:'Loveraf Administration',robots:'noindex,nofollow'};
export default function Layout({children}:{children:ReactNode}) {return <html lang="en"><body>{children}</body></html>;}
