import Constants from 'expo-constants';
import {Platform} from 'react-native';
import {productApi} from './product-client';
import {SessionChangedError} from './session';
export async function unregisterCurrentDevice(current: () => boolean) {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (Platform.OS === 'web' || typeof projectId !== 'string' || !projectId) throw new Error('Push is unavailable in this build.');
  const notifications = await import('expo-notifications');
  if (!current()) throw new SessionChangedError();
  const {data: token} = await notifications.getExpoPushTokenAsync({projectId});
  if (!current()) throw new SessionChangedError();
  return productApi.unregisterDevice(token);
}
