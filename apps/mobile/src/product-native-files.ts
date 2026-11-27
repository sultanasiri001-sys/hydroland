import * as DocumentPicker from 'expo-document-picker';
import {Directory, File, Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {randomUUID} from 'expo-crypto';
import {SessionChangedError} from './session';

const folder = () => new Directory(Paths.cache, 'hydroland-private-product');
const assertCurrent = (current: () => boolean) => {if (!current()) throw new SessionChangedError();};
export function clearProductFiles() {try {const directory = folder(); if (directory.exists) directory.delete();} catch { /* A future share always uses a new private filename. */ }}
/** Reads only the copy created by the native picker and deletes it after the read. */
export async function pickCredentialFile(current: () => boolean) {
  assertCurrent(current);
  const selection = await DocumentPicker.getDocumentAsync({type: ['application/pdf', 'image/jpeg', 'image/png'], multiple: false, copyToCacheDirectory: true});
  if (selection.canceled) return null;
  const asset = selection.assets[0];
  if (!asset) throw new Error('No document selected.');
  const file = new File(asset.uri);
  try {
    assertCurrent(current);
    if (!file.exists || file.size < 1 || file.size > 10_000_000) throw new Error('الحد الأقصى للوثيقة 10 ميغابايت. / Documents must be at most 10 MB.');
    const mimeType = asset.mimeType || (asset.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : asset.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType)) throw new Error('PDF, JPEG or PNG required.');
    const base64 = await file.base64();
    assertCurrent(current);
    return {originalName: asset.name, mimeType, base64};
  } finally {if (asset.uri.startsWith(Paths.cache.uri) && file.exists) file.delete();}
}
/** Explicit native sharing; source bytes are authenticated and the temporary copy is removed. */
export async function sharePrivateBytes(bytes: Uint8Array, extension: 'pdf' | 'json', current: () => boolean) {
  assertCurrent(current);
  if (!bytes.length || bytes.length > 20_000_000) throw new Error('File size is unavailable.');
  if (!await Sharing.isAvailableAsync()) throw new Error('المشاركة غير متاحة على هذا الجهاز. / Sharing is unavailable on this device.');
  assertCurrent(current);
  const directory = folder(); directory.create({intermediates: true, idempotent: true});
  const file = new File(directory, randomUUID() + '.' + extension);
  try {
    file.write(bytes); assertCurrent(current);
    await Sharing.shareAsync(file.uri, {mimeType: extension === 'pdf' ? 'application/pdf' : 'application/json', dialogTitle: 'HYDROLAND', UTI: extension === 'pdf' ? 'com.adobe.pdf' : 'public.json'});
    assertCurrent(current); return true;
  } finally {if (file.exists) file.delete();}
}
export function sharePrivateJson(value: unknown, current: () => boolean) {
  return sharePrivateBytes(new TextEncoder().encode(JSON.stringify(value, null, 2)), 'json', current);
}
export async function withInvoiceFile<T>(number: string, current: () => boolean, upload: (body: FormData) => Promise<T>): Promise<T | null> {
  assertCurrent(current);
  const selection = await DocumentPicker.getDocumentAsync({type: 'application/pdf', multiple: false, copyToCacheDirectory: true});
  if (selection.canceled) return null;
  const asset = selection.assets[0]; if (!asset) throw new Error('No file selected.');
  const file = new File(asset.uri);
  try {
    assertCurrent(current);
    if (!file.exists || file.size < 1 || file.size > 5_000_000) throw new Error('Invoice PDF must be at most 5 MB.');
    const body = new FormData(); body.append('number', number.trim());
    // React Native reads the private picker copy. The app creates no public media URL.
    body.append('document', {uri: file.uri, name: asset.name, type: 'application/pdf'} as unknown as Blob);
    return await upload(body);
  } finally {if (asset.uri.startsWith(Paths.cache.uri) && file.exists) file.delete();}
}
