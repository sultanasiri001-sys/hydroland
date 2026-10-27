/** Only the implemented local destinations can be resumed after authentication. */
export function safeReturnTo(value:unknown):string{
 if(value==='/'||value==='/trip-day')return value;
 if(typeof value!=='string'||!/^\/trip-day\?tripId=[^&#]+$/.test(value))return '/';
 try{const id=decodeURIComponent(value.slice('/trip-day?tripId='.length));return id?`/trip-day?tripId=${encodeURIComponent(id)}`:'/'}catch{return '/'}
}
