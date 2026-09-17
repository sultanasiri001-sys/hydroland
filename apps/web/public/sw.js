const CACHE='hydroland-ui-v2';
const scope=new URL(self.registration.scope);
const asset=path=>new URL(path,scope).toString();
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest'].map(asset);

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==scope.origin||url.pathname.includes('/api/'))return;
  event.respondWith(
    fetch(request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
      return response;
    }).catch(async()=>{
      const match=await caches.match(request);if(match)return match;
      if(request.mode==='navigate')return caches.match(asset('./index.html'));
      return Response.error();
    })
  );
});