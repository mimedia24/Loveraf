import React, { useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/AppNavigator';
import { CartProvider } from './src/cart';
import { CatalogProvider } from './src/catalog';
import { SellerProvider } from './src/seller';
import { Route, RouteName } from './src/types';
import {AuthProvider,useAuth} from './src/auth';
import {fixtureMode} from './src/api';

export default function App() {
  return <SafeAreaProvider><AuthProvider><Application /></AuthProvider></SafeAreaProvider>;
}

function Application() {
  const {user,logout}=useAuth();
  const [stack, setStack] = useState<Route[]>([{ name: 'Splash' }]);

  const navigation = useMemo(
    () => ({
      push: (name: RouteName, params?: Route['params']) => {
        const readyRoutes:RouteName[]=['Splash','Onboarding','Login','Register','Verification','Home','Categories','Catalog','ProductDetails','Cart','Checkout','OrderSuccess','Orders','OrderDetails','Profile','Settings','Addresses','AddAddress','SellerAccess','SellerProducts','SellerUpload','SellerOrders','Messages','Chat'];
        if(!fixtureMode && !readyRoutes.includes(name)) {Alert.alert('Loveraf','This feature is not available yet.');return;}
        const privateRoutes:RouteName[]=['Checkout','OrderSuccess','Orders','OrderDetails','Profile','Settings','Addresses','AddAddress','SellerAccess','SellerProducts','SellerUpload','SellerOrders','Messages','Chat'];
        if(!fixtureMode && !user && privateRoutes.includes(name)) {setStack(current=>[...current,{name:'Login'}]);return;}
        setStack(current => [...current, { name, params }]);
      },
      replace: (name: RouteName, params?: Route['params']) =>
        setStack(current => [...current.slice(0, -1), { name, params }]),
      reset: (name: RouteName, params?: Route['params']) => {
        if(name==='Login'&&user)logout().catch(()=>{});
        setStack([{ name, params }]);
      },
      back: () =>
        setStack(current =>
          current.length > 1 ? current.slice(0, -1) : current,
        ),
    }),
    [user,logout],
  );

  const route = stack[stack.length - 1];

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (stack.length <= 1) {
          return false;
        }
        setStack(current => current.slice(0, -1));
        return true;
      },
    );
    return () => subscription.remove();
  }, [stack.length]);

  return (
      <CatalogProvider>
        <CartProvider>
          <SellerProvider>
          <StatusBar barStyle="light-content" />
          <AppNavigator
            route={route}
            navigation={navigation}
            goHome={() => navigation.reset('Home')}
          />
          </SellerProvider>
        </CartProvider>
      </CatalogProvider>
  );
}
