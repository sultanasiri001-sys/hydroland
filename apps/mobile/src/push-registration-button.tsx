import {useEffect, useRef, useState} from 'react';
import {Button, Text, View} from 'react-native';
import {registerDevicePush} from './register-push';
import {subscribeSession} from './session';

const messages = {
  enabled: 'تم تسجيل هذا الجهاز لإشعارات حسابك.',
  denied: 'اسمح بالإشعارات من إعدادات الجهاز ثم أعد المحاولة.',
  guest: 'سجّل الدخول أولًا لتفعيل إشعارات حسابك.',
  unavailable: 'إشعارات الجهاز غير متاحة في هذه النسخة.',
  error: 'تعذّر تسجيل الجهاز. أعد المحاولة.',
};

export function PushRegistrationButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const active = useRef(0);
  const running = useRef(false);
  useEffect(() => {
    const reset = () => { active.current++; running.current = false; setBusy(false); setMessage(''); };
    const unsubscribe = subscribeSession(reset);
    return () => { active.current++; running.current = false; unsubscribe(); };
  }, []);
  async function enable() {
    if (running.current) return;
    const attempt = ++active.current;
    running.current = true;
    setBusy(true);
    try {
      const result = await registerDevicePush();
      if (attempt === active.current) setMessage(messages[result]);
    } catch {
      if (attempt === active.current) setMessage(messages.error);
    } finally {
      if (attempt === active.current) { running.current = false; setBusy(false); }
    }
  }
  return <View><Button title="تفعيل إشعارات هذا الجهاز" onPress={enable} disabled={busy}/>
    {message ? <Text accessibilityLiveRegion="polite" style={{color:'white', textAlign:'right'}}>{message}</Text> : null}</View>;
}
