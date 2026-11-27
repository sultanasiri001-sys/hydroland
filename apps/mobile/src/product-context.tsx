import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {AppState} from 'react-native';
import {ApiError} from './api';
import {getSessionScope, sessionGeneration, SessionChangedError, subscribeSession} from './session';
import {productApi} from './product-client';
import {authorityFingerprint, Profile} from './product-model';
import {clearProductFiles} from './product-native-files';
import {clearOfflineLeases} from './offline-access';

type Context = {
  locale: 'ar' | 'en'; setLocale: (locale: 'ar' | 'en') => void;
  profile: Profile | null; checking: boolean; foreground: boolean; authKey: string;
  refreshProfile: () => Promise<Profile | null>; ensureCurrent: (key: string) => Promise<void>;
  current: (key: string) => boolean; t: (ar: string, en: string) => string;
};
const ProductContext = createContext<Context | null>(null);
export function ProductProvider({children}: {children: ReactNode}) {
  const [locale, setLocale] = useState<'ar' | 'en'>('ar');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authKey, setAuthKey] = useState(String(sessionGeneration()));
  const [checking, setChecking] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const key = useRef(authKey), sequence = useRef(0), active = useRef(true);
  const verifiedAuthority = useRef<{generation: number; fingerprint: string} | null>(null);
  const pendingProfile = useRef<{generation: number; promise: Promise<Profile | null>} | null>(null);
  const commit = useCallback((next: Profile | null) => {
    const nextKey = String(sessionGeneration()) + ':' + (next ? authorityFingerprint(next) : 'guest');
    key.current = nextKey; setAuthKey(nextKey); setProfile(next); setChecking(false);
  }, []);
  const refreshProfile = useCallback(() => {
    const generation = sessionGeneration();
    if (pendingProfile.current?.generation === generation) return pendingProfile.current.promise;
    const ticket = ++sequence.current;
    const promise = (async () => {
    try {
      const scope = await getSessionScope();
      if (!active.current || ticket !== sequence.current || generation !== sessionGeneration()) throw new SessionChangedError();
      if (!scope) {commit(null); return null;}
      const next = await productApi.me();
      if (!active.current || ticket !== sequence.current || generation !== sessionGeneration()) throw new SessionChangedError();
      if (next.id !== scope.accountId || next.status !== 'ACTIVE') {clearOfflineLeases(); verifiedAuthority.current = null; throw new SessionChangedError();}
      const fingerprint = authorityFingerprint(next), previous = verifiedAuthority.current;
      // A known role/account change invalidates TripDay's in-memory read lease too.
      // A transport failure hides online product data but does not invent revocation.
      if (previous && (previous.generation !== generation || previous.fingerprint !== fingerprint)) clearOfflineLeases();
      verifiedAuthority.current = {generation, fingerprint};
      commit(next); return next;
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status) && generation === sessionGeneration()) {clearOfflineLeases(); verifiedAuthority.current = null;}
      if (active.current && ticket === sequence.current && generation === sessionGeneration()) commit(null);
      throw error;
    }
    })();
    pendingProfile.current = {generation, promise};
    void promise.finally(() => {if (pendingProfile.current?.promise === promise) pendingProfile.current = null;}).catch(() => {});
    return promise;
  }, [commit]);
  useEffect(() => {
    active.current = true;
    clearProductFiles();
    const clear = () => {sequence.current++; pendingProfile.current = null; verifiedAuthority.current = null; clearOfflineLeases(); clearProductFiles(); commit(null);};
    const unsubscribe = subscribeSession(clear);
    void refreshProfile().catch(() => {});
    const listener = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state === 'active') void refreshProfile().catch(() => {});
    });
    return () => {active.current = false; sequence.current++; unsubscribe(); listener.remove();};
  }, [commit, refreshProfile]);
  const current = useCallback((expected: string) => active.current && key.current === expected && expected.startsWith(String(sessionGeneration()) + ':'), []);
  const ensureCurrent = useCallback(async (expected: string) => {
    if (!current(expected)) throw new SessionChangedError();
    const next = await refreshProfile();
    if (!next || !current(expected)) throw new SessionChangedError();
  }, [current, refreshProfile]);
  const value = useMemo<Context>(() => ({locale, setLocale, profile: authKey.startsWith(String(sessionGeneration()) + ':') ? profile : null,
    checking, foreground, authKey, refreshProfile, ensureCurrent, current, t: (ar, en) => locale === 'ar' ? ar : en}),
  [locale, profile, checking, foreground, authKey, refreshProfile, ensureCurrent, current]);
  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}
export function useProduct() {
  const value = useContext(ProductContext);
  if (!value) throw new Error('ProductProvider is required.');
  return value;
}
export function productError(error: unknown, locale: 'ar' | 'en'): string {
  const ar = locale === 'ar';
  if (error instanceof SessionChangedError) return ar ? 'تغيرت الجلسة أو صلاحيات الحساب. افتح الصفحة من جديد.' : 'Your session or access changed. Open this page again.';
  if (error instanceof ApiError) {
    if ([400, 422].includes(error.status)) return ar ? 'راجع القيم المدخلة وصيغتها وأطوالها، ثم حاول الحفظ مجددًا.' : 'Review the entered values, formats and lengths, then try saving again.';
    if (error.status === 401) return ar ? 'سجّل الدخول للتحقق من حسابك.' : 'Sign in to verify your account.';
    if (error.status === 403) return ar ? 'لا تتوفر صلاحية هذا الإجراء لحسابك الحالي.' : 'This action is unavailable to your current account.';
    if (error.status === 404) return ar ? 'السجل غير متاح لهذا الحساب. حدّث الصفحة.' : 'This record is unavailable to your account. Refresh the page.';
    if (error.status === 409) return ar ? 'تغير السجل أو يحتاج مراجعة. حدّث البيانات وراجع الشروط قبل المحاولة.' : 'The record changed or needs review. Refresh and review its terms before trying again.';
    if (error.status === 429) return ar ? 'بلغت حد المحاولات. انتظر قبل المحاولة مجددًا.' : 'Too many attempts. Wait before trying again.';
    if (error.status >= 500) return ar ? 'الخدمة غير متاحة حاليًا. لم نفترض نجاح العملية؛ تحقق من حالتها قبل إعادة المحاولة.' : 'The service is unavailable. Success has not been assumed; check the record before retrying.';
  }
  return ar ? 'تعذر إكمال الطلب. تحقق من الاتصال وحدّث البيانات قبل المحاولة.' : 'The request could not be completed. Check your connection and refresh before trying again.';
}
