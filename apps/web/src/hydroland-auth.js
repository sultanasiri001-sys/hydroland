(()=>{
  const DEFAULT_API_BASE=/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)?'http://localhost:3001/api/v1':'https://hydroland.onrender.com/api/v1';
  const API_BASE=(window.HYDROLAND_API_BASE||DEFAULT_API_BASE).replace(/\/$/,'');
  const state={mode:'login',refreshPromise:null};
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2200)};
  const login=()=>document.querySelector('.hl-login');
  const emitAuthChanged=()=>document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));
  const clearSession=()=>{sessionStorage.removeItem('hl-access-token');sessionStorage.removeItem('hl-refresh-token');sessionStorage.removeItem('hl-preview-seen')};
  const clearProtectedView=()=>{window.HydrolandProfileData=undefined;window.HydrolandPortalAccess?.clearProtectedPortal?.();document.dispatchEvent(new CustomEvent('hydroland:portal-cleared'))};
  const showLogin=message=>{clearProtectedView();const root=login();if(root){root.classList.remove('hidden');const actions=root.querySelector('.hl-login-actions');if(actions)actions.hidden=false;const panel=root.querySelector('.hl-auth-panel');if(panel)panel.hidden=true}if(message)toast(message)};
  const storeTokens=body=>{const accessToken=typeof body?.accessToken==='string'?body.accessToken.trim():'',refreshToken=typeof body?.refreshToken==='string'?body.refreshToken.trim():'';if(!accessToken||!refreshToken){clearSession();throw new Error('استجابة الجلسة غير صالحة')}sessionStorage.setItem('hl-access-token',accessToken);sessionStorage.setItem('hl-refresh-token',refreshToken);sessionStorage.setItem('hl-preview-seen','1')};
  const refreshSession=async()=>{
    if(state.refreshPromise)return state.refreshPromise;
    const refreshToken=sessionStorage.getItem('hl-refresh-token');
    if(!refreshToken){clearSession();emitAuthChanged();showLogin('انتهت الجلسة، سجّل الدخول من جديد');throw new Error('SESSION_EXPIRED')}
    state.refreshPromise=(async()=>{
      try{
        const response=await fetch(`${API_BASE}/auth/refresh`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken})});
        const body=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(body.message||'SESSION_EXPIRED');
        storeTokens(body);emitAuthChanged();return body.accessToken;
      }catch(error){clearSession();emitAuthChanged();showLogin('انتهت الجلسة، سجّل الدخول من جديد');throw error}
      finally{state.refreshPromise=null}
    })();
    return state.refreshPromise;
  };
  const authorizedFetch=async(path,options={})=>{
    const execute=access=>fetch(`${API_BASE}${path}`,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{}),Authorization:`Bearer ${access}`}});
    let access=sessionStorage.getItem('hl-access-token');
    if(!access)access=await refreshSession();
    let response=await execute(access);
    if(response.status!==401)return response;
    access=await refreshSession();
    response=await execute(access);
    if(response.status===401){clearSession();emitAuthChanged();showLogin('انتهت الجلسة، سجّل الدخول من جديد')}
    return response;
  };
  const ensurePanel=()=>{
    const root=login();if(!root)return null;
    let panel=root.querySelector('.hl-auth-panel');if(panel)return panel;
    panel=document.createElement('form');panel.className='hl-auth-panel';panel.hidden=true;panel.innerHTML=`<label>البريد الإلكتروني<input name="email" type="email" autocomplete="email" required placeholder="name@example.com"></label><label>كلمة المرور<input name="password" type="password" autocomplete="current-password" minlength="12" required placeholder="12 حرفًا على الأقل"></label><button class="hl-auth-submit" type="submit">دخول آمن</button><button class="hl-auth-cancel" type="button">رجوع</button><small class="hl-auth-note">يتم الاتصال بخادم HYDROLAND الحقيقي عند توفره. لا يتم اعتبار تسجيل الدخول ناجحًا إذا كان الخادم غير متاح.</small>`;
    root.querySelector('.hl-login-actions')?.insertAdjacentElement('afterend',panel);
    const style=document.createElement('style');style.textContent=`.hl-auth-panel{width:min(420px,100%);display:grid;gap:.7rem;margin:1rem auto 0;padding:1rem;border:1px solid rgba(120,191,224,.2);border-radius:18px;background:rgba(3,25,39,.86)}.hl-auth-panel[hidden]{display:none}.hl-auth-panel label{display:grid;gap:.35rem;text-align:right;color:#dcebf3;font-weight:700}.hl-auth-panel input{width:100%;box-sizing:border-box;border:1px solid rgba(120,191,224,.22);border-radius:12px;background:rgba(255,255,255,.05);color:#fff;padding:.8rem}.hl-auth-submit,.hl-auth-cancel{border-radius:12px;padding:.75rem;font-weight:800}.hl-auth-submit{border:0;background:linear-gradient(135deg,#f4d18c,#e5b45f);color:#102131}.hl-auth-cancel{border:1px solid rgba(120,191,224,.2);background:transparent;color:#dcebf3}.hl-auth-note{color:#9cb7c7;line-height:1.6}`;document.head.appendChild(style);
    panel.querySelector('.hl-auth-cancel').addEventListener('click',()=>{panel.hidden=true;root.querySelector('.hl-login-actions').hidden=false});
    panel.addEventListener('submit',async event=>{
      event.preventDefault();const submit=panel.querySelector('.hl-auth-submit');const data=new FormData(panel);const email=String(data.get('email')||'').trim();const password=String(data.get('password')||'');
      submit.disabled=true;submit.textContent='جارٍ الاتصال...';
      try{
        const response=await fetch(`${API_BASE}/auth/${state.mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
        const body=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(body.message||'تعذر تسجيل الدخول');
        storeTokens(body);root.classList.add('hidden');emitAuthChanged();toast(state.mode==='register'?'تم إنشاء الحساب وتسجيل الدخول':'تم تسجيل الدخول إلى HYDROLAND');
      }catch(error){toast(error instanceof Error?error.message:'تعذر الاتصال بخادم HYDROLAND');}
      finally{submit.disabled=false;submit.textContent=state.mode==='register'?'إنشاء الحساب':'دخول آمن';}
    });
    return panel;
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('.hl-login-primary,.hl-login-secondary');if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();const root=login();const panel=ensurePanel();if(!root||!panel)return;
    state.mode=button.classList.contains('hl-login-secondary')?'register':'login';panel.querySelector('.hl-auth-submit').textContent=state.mode==='register'?'إنشاء الحساب':'دخول آمن';panel.querySelector('input[name="password"]').autocomplete=state.mode==='register'?'new-password':'current-password';root.querySelector('.hl-login-actions').hidden=true;panel.hidden=false;panel.querySelector('input[name="email"]').focus();
  },true);
  const logout=async()=>{
    const refreshToken=sessionStorage.getItem('hl-refresh-token');
    clearSession();clearProtectedView();emitAuthChanged();
    if(refreshToken){try{await fetch(`${API_BASE}/auth/logout`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken}),keepalive:true})}catch{}}
    location.reload();
  };
  window.addEventListener('pageshow',()=>{if(!sessionStorage.getItem('hl-refresh-token')){clearSession();clearProtectedView();showLogin()}});
  document.addEventListener('click',async event=>{const button=event.target.closest?.('[data-hl-action="logout"]');if(!button)return;event.preventDefault();button.disabled=true;document.getElementById('profile-dialog')?.close();await logout()});
  window.HydrolandAuth={apiBase:API_BASE,getAccessToken:()=>sessionStorage.getItem('hl-access-token'),getRefreshToken:()=>sessionStorage.getItem('hl-refresh-token'),isAuthenticated:()=>Boolean(sessionStorage.getItem('hl-refresh-token')),refreshSession,authorizedFetch,logout};
})();