import {router} from 'expo-router';
import {useProduct} from '../src/product-context';
import {destinations} from '../src/product-model';
import {Button, Card, Paragraph, Screen} from '../src/product-ui';

export default function Home() {
  const {profile, t} = useProduct();
  return <Screen testID="home-screen" back={false} title={t('منصتك الذكية للغوص والأنشطة البحرية', 'Your diving and marine activities companion')} subtitle={t('خطط لرحلتك، تابع تدريبك، واحتفظ بسجلاتك في مكان واحد.', 'Plan your trip, follow your training and keep your records together.')}>
    <Card title={profile ? t('أهلًا ' + profile.person.firstName, 'Hello ' + profile.person.firstName) : t('ابدأ رحلتك', 'Start your journey')}>
      <Paragraph muted>{profile ? profile.email : t('يمكنك استكشاف الرحلات والدورات، ثم تسجيل الدخول للحجز ومتابعة حسابك.', 'Explore trips and courses, then sign in to book and follow your account.')}</Paragraph>
      {!profile ? <Button testID="home-login" label={t('تسجيل الدخول أو إنشاء حساب', 'Sign in or create an account')} onPress={() => router.push('/login')}/> : <Button testID="home-account" label={t('إدارة الحساب', 'Manage account')} onPress={() => router.push('/account' as never)}/>}
    </Card>
    {destinations.map(destination => <Card key={destination.key}>
      <Button testID={'nav-' + destination.key} label={t(destination.ar, destination.en)} onPress={() => router.push(destination.path as never)}/>
      <Paragraph muted>{t(destination.hintAr, destination.hintEn)}</Paragraph>
    </Card>)}
    <Button testID="nav-trip-day" label={t('وضع يوم الرحلة', 'Trip day mode')} kind="quiet" onPress={() => router.push('/trip-day')}/>
  </Screen>;
}
