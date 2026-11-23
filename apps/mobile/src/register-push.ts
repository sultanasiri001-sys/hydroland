import Constants from 'expo-constants';
import {Platform} from 'react-native';
import {apiFetch} from './api';
import {assertSessionGeneration, getAccessToken, sessionGeneration} from './session';

export async function registerDevicePush(): Promise<'enabled' | 'guest' | 'denied' | 'unavailable'> {
  const epoch = sessionGeneration();
  const access = await getAccessToken();
  assertSessionGeneration(epoch);
  if (!access) return 'guest';
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (Platform.OS === 'web' || typeof projectId !== 'string' || !projectId) return 'unavailable';
  const notifications = await import('expo-notifications');
  assertSessionGeneration(epoch);
  if (Platform.OS === 'android') {
    await notifications.setNotificationChannelAsync('default', {
      name: 'إشعارات هيدرولاند', importance: notifications.AndroidImportance.DEFAULT,
    });
  }
  let permission = await notifications.getPermissionsAsync();
  assertSessionGeneration(epoch);
  if (!permission.granted && permission.canAskAgain) permission = await notifications.requestPermissionsAsync();
  assertSessionGeneration(epoch);
  if (!permission.granted) return 'denied';
  const {data: token} = await notifications.getExpoPushTokenAsync({projectId});
  assertSessionGeneration(epoch);
  await apiFetch('/notifications/device/register', {
    method: 'POST', body: JSON.stringify({token}),
  }, access);
  assertSessionGeneration(epoch);
  return 'enabled';
}
