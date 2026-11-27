import {Stack} from 'expo-router';
import {useEffect, useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {bootstrapSession, BootstrapState} from '../src/bootstrap';
import {ProductProvider} from '../src/product-context';

export default function RootLayout() {
  const [state, setState] = useState<BootstrapState>('LOADING');
  useEffect(() => {let active = true; void bootstrapSession().then(next => {if (active) setState(next);}); return () => {active = false;};}, []);
  if (state === 'LOADING') return <View style={{flex: 1, backgroundColor: '#061826', alignItems: 'center', justifyContent: 'center'}}><ActivityIndicator accessibilityLabel="HYDROLAND"/></View>;
  return <ProductProvider><Stack screenOptions={{headerShown: false, contentStyle: {backgroundColor: '#061826'}}}/></ProductProvider>;
}
