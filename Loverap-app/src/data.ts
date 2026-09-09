import {Product} from './types';

export const categories = [
  {id: 'fashion', name: "Men's Fashion", art: 'hoodie' as const, color: '#DDE7FF'},
  {id: 'women', name: "Women's Fashion", art: 'dress' as const, color: '#FFE1EA'},
  {id: 'electronics', name: 'Electronics', art: 'headphones' as const, color: '#E6E9EF'},
  {id: 'home', name: 'Home & Living', art: 'chair' as const, color: '#FFF0DB'},
  {id: 'beauty', name: 'Beauty & Care', art: 'beauty' as const, color: '#F3E4FF'},
  {id: 'sports', name: 'Sports & Outdoor', art: 'shoe' as const, color: '#DFF7EF'},
  {id: 'groceries', name: 'Groceries', art: 'grocery' as const, color: '#FFF4D5'},
];

export const products: Product[] = [
  {id: 'p1', title: 'AeroBeat Pro Headphones', price: 4990, oldPrice: 6290, rating: 4.8, sold: '2.4k', art: 'headphones', color: '#E9ECF3', badge: '20% OFF'},
  {id: 'p2', title: 'Midnight Essential Hoodie', price: 2190, oldPrice: 2790, rating: 4.7, sold: '980', art: 'hoodie', color: '#E7E9EE', badge: 'NEW'},
  {id: 'p3', title: 'Nova Smart Watch S8', price: 8990, oldPrice: 10990, rating: 4.9, sold: '1.6k', art: 'watch', color: '#E7F2F5', badge: 'TOP'},
  {id: 'p4', title: 'Nordic Lounge Chair', price: 6490, rating: 4.6, sold: '620', art: 'chair', color: '#F7EBDD'},
  {id: 'p5', title: 'Satin Rose Evening Dress', price: 3590, oldPrice: 4290, rating: 4.7, sold: '740', art: 'dress', color: '#FCE8EF'},
  {id: 'p6', title: 'Loveraf One Smartphone', price: 32990, oldPrice: 34990, rating: 4.8, sold: '410', art: 'phone', color: '#E4E9F6', badge: 'EXCLUSIVE'},
  {id: 'p7', title: 'CloudRun Street Sneaker', price: 3890, rating: 4.5, sold: '1.1k', art: 'shoe', color: '#E8F5EF'},
  {id: 'p8', title: 'Velvet Glow Gift Set', price: 1790, oldPrice: 2190, rating: 4.9, sold: '860', art: 'beauty', color: '#F5E7FA'},
];

export const money = (value: number) => `৳${value.toLocaleString('en-US')}`;
