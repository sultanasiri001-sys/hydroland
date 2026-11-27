import {ReactNode} from 'react';
import {router} from 'expo-router';
import {ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View} from 'react-native';
import {useProduct} from './product-context';

export const colors = {background: '#061826', surface: '#0B2534', edge: '#245366', accent: '#44D7E8', button: '#087F95', text: '#F4FAFC', muted: '#B7CDD7', error: '#FFB4AB', success: '#96E6BC'};
export function Screen({title, subtitle, children, testID, back = true, backTestID}: {title: string; subtitle?: string; children: ReactNode; testID: string; back?: boolean; backTestID?: string}) {
  const {locale, setLocale, foreground, t} = useProduct();
  return <SafeAreaView testID={testID} style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page} accessibilityElementsHidden={!foreground} importantForAccessibility={foreground ? 'auto' : 'no-hide-descendants'}>
      <View style={styles.header}>{back ? <Button testID={backTestID ?? testID + '-back'} label={t('الرئيسية', 'Home')} kind="quiet" onPress={() => router.replace('/')}/> : <Text style={styles.brand}>HYDROLAND</Text>}
        <Button testID="change-language" label={locale === 'ar' ? 'English' : 'العربية'} kind="quiet" onPress={() => setLocale(locale === 'ar' ? 'en' : 'ar')}/></View>
      <Text accessibilityRole="header" style={[styles.title, {textAlign: locale === 'ar' ? 'right' : 'left'}]}>{title}</Text>
      {subtitle ? <Paragraph muted>{subtitle}</Paragraph> : null}
      {children}
      <Text style={styles.footer}>HYDROLAND</Text>
    </ScrollView>
  </KeyboardAvoidingView>{!foreground ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.privacy}><Text style={styles.brand}>HYDROLAND</Text></View> : null}</SafeAreaView>;
}
export function Card({title, children, testID}: {title?: string; children: ReactNode; testID?: string}) {
  return <View testID={testID} style={styles.card}>{title ? <Heading>{title}</Heading> : null}{children}</View>;
}
export function Heading({children}: {children: ReactNode}) {
  const {locale} = useProduct(); return <Text accessibilityRole="header" style={[styles.heading, {textAlign: locale === 'ar' ? 'right' : 'left'}]}>{children}</Text>;
}
export function Paragraph({children, muted = false, testID}: {children: ReactNode; muted?: boolean; testID?: string}) {
  const {locale} = useProduct(); return <Text testID={testID} selectable style={[styles.paragraph, {color: muted ? colors.muted : colors.text, textAlign: locale === 'ar' ? 'right' : 'left'}]}>{children}</Text>;
}
export function Button({label, onPress, disabled = false, busy = false, kind = 'primary', testID}: {label: string; onPress: () => void; disabled?: boolean; busy?: boolean; kind?: 'primary' | 'quiet' | 'danger'; testID: string}) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled: disabled || busy, busy}}
    disabled={disabled || busy} onPress={onPress} style={({pressed}) => [styles.button, kind === 'quiet' && styles.quiet, kind === 'danger' && styles.danger, (disabled || busy) && styles.disabled, pressed && styles.pressed]}>
    {busy ? <ActivityIndicator color={colors.text}/> : null}<Text style={[styles.buttonText, kind === 'quiet' && {color: colors.accent}]}>{label}</Text>
  </Pressable>;
}
export function Field({label, value, onChange, testID, placeholder, secure = false, multiline = false, keyboard = 'default', maxLength = 500, editable = true}: {
  label: string; value: string; onChange: (value: string) => void; testID: string; placeholder?: string; secure?: boolean; multiline?: boolean; keyboard?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad'; maxLength?: number; editable?: boolean;
}) {
  const {locale} = useProduct();
  return <View style={styles.field}><Text style={[styles.label, {textAlign: locale === 'ar' ? 'right' : 'left'}]}>{label}</Text>
    <TextInput testID={testID} accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#87A4B2"
      autoCapitalize="none" autoCorrect={false} secureTextEntry={secure} multiline={multiline} keyboardType={keyboard} maxLength={maxLength} editable={editable}
      style={[styles.input, multiline && styles.multiline, {textAlign: locale === 'ar' && keyboard === 'default' && !secure ? 'right' : 'left'}]}/></View>;
}
export function Toggle({label, value, onChange, disabled = false, testID}: {label: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean; testID: string}) {
  return <View style={styles.toggle}><Text style={[styles.paragraph, styles.flex]}>{label}</Text><Switch testID={testID} accessibilityLabel={label} value={value} onValueChange={onChange} disabled={disabled} trackColor={{false: '#3B5662', true: '#087F95'}} thumbColor={value ? colors.accent : '#CCD9DF'}/></View>;
}
export function Choices({label, value, options, onChange, testID}: {label: string; value: string; options: Array<{value: string; label: string}>; onChange: (value: string) => void; testID: string}) {
  return <View style={styles.field}><Paragraph>{label}</Paragraph><View style={styles.choices}>{options.map(option => <Button key={option.value} testID={testID + '-' + option.value} kind={value === option.value ? 'primary' : 'quiet'} label={option.label} onPress={() => onChange(option.value)}/>)}</View></View>;
}
export function Notice({error, message, testID = 'action-notice'}: {error?: string; message?: string; testID?: string}) {
  return error || message ? <Text testID={testID} accessibilityLiveRegion="polite" style={[styles.notice, {color: error ? colors.error : colors.success}]}>{error || message}</Text> : null;
}
export function Resource({loading, error, empty, retry, children}: {loading: boolean; error: string; empty?: boolean; retry: () => void; children: ReactNode}) {
  const {t} = useProduct();
  if (loading) return <View style={styles.card}><ActivityIndicator color={colors.accent}/><Paragraph>{t('جاري تحميل بياناتك…', 'Loading your records…')}</Paragraph></View>;
  if (error) return <Card><Notice error={error}/><Button testID="resource-retry" label={t('إعادة المحاولة', 'Try again')} onPress={retry}/></Card>;
  if (empty) return <Card><Paragraph muted>{t('لا توجد سجلات لعرضها حاليًا.', 'There are no records to show yet.')}</Paragraph></Card>;
  return <>{children}</>;
}
export function SignIn({returnTo}: {returnTo: string}) {
  const {t} = useProduct();
  return <Card title={t('حسابك يحفظ تقدمك', 'Your account keeps your progress')}><Paragraph>{t('سجّل الدخول للوصول إلى سجلات حسابك والعمليات المتاحة لك.', 'Sign in to access your records and available actions.')}</Paragraph>
    <Button testID="sign-in-required" label={t('تسجيل الدخول', 'Sign in')} onPress={() => router.push({pathname: '/login', params: {returnTo}})}/></Card>;
}
const styles = StyleSheet.create({
  flex: {flex: 1}, safe: {flex: 1, backgroundColor: colors.background}, page: {padding: 20, paddingBottom: 36, gap: 16, maxWidth: 760, width: '100%', alignSelf: 'center'},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12}, brand: {color: colors.accent, fontWeight: '800', letterSpacing: 2, fontSize: 18},
  title: {fontSize: 30, lineHeight: 40, fontWeight: '800', color: colors.text}, heading: {fontSize: 20, lineHeight: 29, fontWeight: '700', color: colors.text},
  paragraph: {fontSize: 16, lineHeight: 25, color: colors.text}, card: {padding: 18, gap: 13, backgroundColor: colors.surface, borderColor: colors.edge, borderWidth: 1, borderRadius: 20},
  field: {gap: 7}, label: {fontSize: 15, fontWeight: '600', color: colors.muted}, input: {minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: colors.text, borderWidth: 1, borderColor: colors.edge, borderRadius: 12, backgroundColor: '#081F2C'},
  multiline: {minHeight: 110, textAlignVertical: 'top'}, button: {minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.button, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8},
  buttonText: {fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center'}, quiet: {backgroundColor: 'transparent', borderColor: colors.edge, borderWidth: 1}, danger: {backgroundColor: '#713D42'}, disabled: {opacity: 0.5}, pressed: {opacity: 0.75},
  choices: {flexDirection: 'row', flexWrap: 'wrap', gap: 8}, toggle: {flexDirection: 'row', alignItems: 'center', gap: 14}, notice: {fontSize: 15, lineHeight: 24, textAlign: 'auto'},
  footer: {color: '#7898A8', fontSize: 12, textAlign: 'center', marginTop: 12}, privacy: {position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center'},
});
