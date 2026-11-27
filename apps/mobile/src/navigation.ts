/** Authentication resumes only a native route and its single documented record selector. */
const destinations: Record<string, string | null> = {'/': null, '/account': null, '/credentials': 'credentialId', '/trips': 'tripId', '/bookings': 'bookingId', '/training': 'enrollmentId', '/finance': 'paymentId', '/notifications': null, '/trip-day': 'tripId'};
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || value.length > 800 || /[\u0000-\u001f\u007f#]/.test(value)) return '/';
  const [path, query, extra] = value.split('?');
  if (!path || !(path in destinations) || extra !== undefined) return '/';
  if (query === undefined) return path;
  const name = destinations[path];
  if (!name || !query || !query.startsWith(name + '=') || query.includes('&')) return '/';
  try {const record = decodeURIComponent(query.slice(name.length + 1));
    return record && record.length <= 200 && !/[\u0000-\u001f\u007f]/.test(record) ? path + '?' + name + '=' + encodeURIComponent(record) : '/';
  } catch {return '/';}
}
