import {useEffect, useRef, useState} from 'react';
import {router, useLocalSearchParams} from 'expo-router';
import {cancelMfaLogin, completeMfaLogin, startLogin} from '../src/session';
import {safeReturnTo} from '../src/navigation';
import {productApi} from '../src/product-client';
import {productError, useProduct} from '../src/product-context';
import {Button, Card, Choices, Field, Notice, Paragraph, Screen} from '../src/product-ui';

type Mode = 'LOGIN' | 'REGISTER' | 'RESET' | 'VERIFY';
export default function Login() {
  const {returnTo} = useLocalSearchParams<{returnTo?: string | string[]}>();
  const {t, locale, refreshProfile} = useProduct();
  const [mode, setMode] = useState<Mode>('LOGIN');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [token, setToken] = useState('');
  const [code, setCode] = useState(''), [challenge, setChallenge] = useState<{token: string; expiresAt?: string} | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const active = useRef(true), pending = useRef(false), attempt = useRef(0);
  useEffect(() => {active.current = true; return () => {active.current = false; attempt.current++; cancelMfaLogin();};}, []);
  const changeMode = (next: string) => {attempt.current++; cancelMfaLogin(); setChallenge(null); setCode(''); setToken(''); setPassword(''); setError(''); setMessage(''); setMode(next as Mode);};
  async function submit(confirmToken = false) {
    if (pending.current) return;
    pending.current = true; const ticket = ++attempt.current;
    const current = () => active.current && attempt.current === ticket;
    setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'LOGIN') {
        if (challenge) {
          if (challenge.expiresAt && Date.parse(challenge.expiresAt) <= Date.now()) {cancelMfaLogin(); setChallenge(null); setCode(''); throw new Error(t('انتهى تحدي الدخول. ابدأ تسجيل الدخول مرة أخرى.', 'This sign-in challenge expired. Start sign-in again.'));}
          await completeMfaLogin(challenge.token, code, current);
        } else {
          const result = await startLogin(email.trim(), password, current);
          if (!current()) return;
          setPassword('');
          if (result.kind === 'MFA') {setChallenge({token: result.challengeToken, expiresAt: result.expiresAt}); return;}
        }
        if (!current()) return;
        await refreshProfile();
        if (current()) {setCode(''); setChallenge(null); router.replace(safeReturnTo(returnTo) as never);}
      } else if (mode === 'REGISTER') {
        await productApi.register(email.trim(), password);
        if (current()) {setPassword(''); setMessage(t('تم إنشاء الحساب. اطلب رسالة التحقق ثم سجّل الدخول بعد تفعيل الحساب.', 'Account created. Request verification and sign in after account activation.'));}
      } else if (mode === 'RESET') {
        if (confirmToken) await productApi.confirmPasswordReset(token.trim(), password);
        else await productApi.requestPasswordReset(email.trim());
        if (current()) {setPassword(''); if (confirmToken) setToken(''); setMessage(confirmToken ? t('تم تحديث كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.', 'Password updated. Sign in with your new password.') : t('إذا كان البريد مؤهلًا فستصله تعليمات الاستعادة. يمكنك إدخال رمز الرابط أدناه.', 'If eligible, this email will receive recovery instructions. Enter the link token below.'));}
      } else {
        if (confirmToken) await productApi.confirmEmailVerification(token.trim());
        else await productApi.requestEmailVerification(email.trim());
        if (current()) {if (confirmToken) setToken(''); setMessage(confirmToken ? t('تم تأكيد البريد. يمكنك تسجيل الدخول.', 'Email confirmed. You can sign in.') : t('إذا كان البريد مؤهلًا فستصله رسالة التحقق.', 'If eligible, this email will receive a verification message.'));}
      }
    } catch (failure) {if (current()) setError(productError(failure, locale));}
    finally {pending.current = false; if (active.current) setBusy(false);}
  }
  return <Screen testID="login-screen" backTestID="login-back" title={t('تسجيل الدخول', 'Sign in')} subtitle={t('استخدم حساب HYDROLAND نفسه على الويب والجوال.', 'Use the same HYDROLAND account on web and mobile.')}>
    {!challenge ? <Choices testID="auth-mode" label={t('إدارة الدخول', 'Account access')} value={mode} onChange={changeMode} options={[{value: 'LOGIN', label: t('دخول', 'Sign in')}, {value: 'REGISTER', label: t('حساب جديد', 'Create account')}, {value: 'RESET', label: t('استعادة كلمة المرور', 'Reset password')}, {value: 'VERIFY', label: t('تأكيد البريد', 'Verify email')}]}/> : null}
    <Card>
      {!challenge ? <><Field testID="login-email" label={t('البريد الإلكتروني', 'Email address')} keyboard="email-address" value={email} onChange={setEmail} maxLength={254} editable={!busy}/>
        {mode === 'LOGIN' || mode === 'REGISTER' ? <Field testID="login-password" label={t('كلمة المرور', 'Password')} secure value={password} onChange={setPassword} maxLength={1024} editable={!busy}/> : null}</> : <><Paragraph>{t('أدخل رمز تطبيق المصادقة أو أحد رموز الاسترداد.', 'Enter your authenticator code or a recovery code.')}</Paragraph><Field testID="login-mfa-code" label={t('رمز المصادقة', 'Authentication code')} value={code} onChange={setCode} secure maxLength={32} editable={!busy}/></>}
      <Notice testID="login-error" error={error}/><Notice testID="login-message" message={message}/>
      <Button testID="login-submit" busy={busy} label={challenge ? t('تأكيد الدخول', 'Verify sign-in') : mode === 'LOGIN' ? t('دخول آمن', 'Sign in securely') : mode === 'REGISTER' ? t('إنشاء حساب', 'Create account') : t('إرسال التعليمات', 'Send instructions')} onPress={() => void submit()}/>
      {challenge ? <Button testID="login-mfa-cancel" kind="quiet" label={t('إلغاء التحدي والبدء مجددًا', 'Cancel challenge and start again')} onPress={() => changeMode('LOGIN')}/> : null}
    </Card>
    {!challenge && (mode === 'RESET' || mode === 'VERIFY') ? <Card title={t('لديك رابط التأكيد؟', 'Already have the confirmation link?')}>
      <Paragraph muted>{t('انسخ قيمة الرمز من رابط HYDROLAND. يبقى الرمز في هذه الصفحة فقط.', 'Copy the token value from your HYDROLAND link. It stays only on this page.')}</Paragraph>
      <Field testID="auth-token" label={t('رمز الرابط', 'Link token')} value={token} onChange={setToken} secure maxLength={4096} editable={!busy}/>
      {mode === 'RESET' ? <Field testID="reset-password" label={t('كلمة المرور الجديدة', 'New password')} value={password} onChange={setPassword} secure maxLength={1024} editable={!busy}/> : null}
      <Button testID="auth-token-confirm" busy={busy} disabled={!token} label={t('تأكيد الرمز', 'Confirm token')} onPress={() => void submit(true)}/>
    </Card> : null}
  </Screen>;
}
