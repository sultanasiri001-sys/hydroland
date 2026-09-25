(()=>{
  const DEFAULT_API_BASE=/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)?'http://localhost:3001/api/v1':'https://hydroland.onrender.com/api/v1';
  const API_BASE=(window.HYDROLAND_API_BASE||DEFAULT_API_BASE).replace(/\/$/,'');
  const params=new URL(window.location.href).searchParams;
  const state={mode:'login',refreshPromise:null,resetToken:params.get('reset_token')||null};
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2600)};
  const login=()=>document.querySelector('.hl-login');
  const emitAuthChanged=()=>document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));
  const isGuestMode=()=>sessionStorage.getItem('hl-guest-mode')==='1';
  const clearSession=()=>{sessionStorage.removeItem('hl-access-token');sessionStorage.removeItem('hl-refresh-token');sessionStorage.removeItem('hl-preview-seen');sessionStorage.removeItem('hl-guest-mode')};
  const clearProtectedView=()=>{window.HydrolandProfileData=undefined;const consoleEl=document.getElementById('role-console');if(consoleEl)consoleEl.hidden=true;document.querySelector('.hl-role-dashboard')?.remove()};
  const showLogin=message=>{sessionStorage.removeItem('hl-guest-mode');clearProtectedView();const root=login();if(root){root.classList.remove('hidden');root.style.display='';root.removeAttribute('hidden');const actions=root.querySelector('.hl-login-actions');if(actions)actions.hidden=false;const panel=root.querySelector('.hl-auth-panel');if(panel)panel.hidden=true}if(message)toast(message)};
  const setAuthUi=authenticated=>{const root=login();if(!root)return;if(authenticated){sessionStorage.removeItem('hl-guest-mode');root.classList.add('hidden');return}if(isGuestMode()){root.classList.add('hidden');return}showLogin()};
  const syncAuthUi=()=>setAuthUi(Boolean(sessionStorage.getItem('hl-refresh-token')));
  const storeTokens=body=>{const accessToken=typeof body?.accessToken==='string'?body.accessToken.trim():'',refreshToken=typeof body?.refreshToken==='string'?body.refreshToken.trim():'';if(!accessToken||!refreshToken){clearSession();throw new Error('استجابة الجلسة غير صالحة')}sessionStorage.setItem('hl-access-token',accessToken);sessionStorage.setItem('hl-refresh-token',refreshToken);sessionStorage.setItem('hl-preview-seen','1');sessionStorage.removeItem('hl-guest-mode')};
  const cleanLinkParam=name=>{const url=new URL(window.location.href);url.searchParams.delete(name);history.replaceState(null,'',`${url.pathname}${url.search}${url.hash}`)};
  const postPublic=async(path,body)=>{const response=await fetch(`${API_BASE}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.message||'تعذر تنفيذ الطلب');return payload};
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
    if(!access){
      if(!sessionStorage.getItem('hl-refresh-token'))throw new Error('AUTH_REQUIRED');
      access=await refreshSession();
    }
    let response=await execute(access);
    if(response.status!==401)return response;
    access=await refreshSession();
    response=await execute(access);
    if(response.status===401){clearSession();emitAuthChanged();showLogin('انتهت الجلسة، سجّل الدخول من جديد')}
    return response;
  };
  const configurePanel=panel=>{
    const emailLabel=panel.querySelector('.hl-auth-email');
    const password=panel.querySelector('input[name="password"]');
    const submit=panel.querySelector('.hl-auth-submit');
    const forgot=panel.querySelector('.hl-auth-forgot');
    const resend=panel.querySelector('.hl-auth-resend');
    const reset=state.mode==='reset';
    emailLabel.hidden=reset;
    password.autocomplete=state.mode==='login'?'current-password':'new-password';
    submit.textContent=reset?'تعيين كلمة مرور جديدة':state.mode==='register'?'إنشاء الحساب':'دخول آمن';
    forgot.hidden=state.mode!=='login';
    resend.hidden=state.mode!=='login';
  };
  const ensurePanel=()=>{
    const root=login();if(!root)return null;
    let panel=root.querySelector('.hl-auth-panel');if(panel){configurePanel(panel);return panel}
    panel=document.createElement('form');panel.className='hl-auth-panel';panel.hidden=true;panel.innerHTML=`<label class="hl-auth-email">البريد الإلكتروني<input name="email" type="email" autocomplete="email" required placeholder="name@example.com"></label><label>كلمة المرور<input name="password" type="password" autocomplete="current-password" minlength="12" maxlength="128" required placeholder="12 حرفًا على الأقل"></label><button class="hl-auth-submit" type="submit">دخول آمن</button><div class="hl-auth-recovery"><button class="hl-auth-forgot" type="button">نسيت كلمة المرور؟</button><button class="hl-auth-resend" type="button">إعادة إرسال رابط التفعيل</button></div><button class="hl-auth-cancel" type="button">رجوع</button><small class="hl-auth-note">تُدار الجلسات والتحقق من الحساب عبر خادم HYDROLAND. إرسال رسائل البريد يتم عبر موصل الإشعارات عند تفعيله.</small>`;
    root.querySelector('.hl-login-actions')?.insertAdjacentElement('afterend',panel);
    const style=document.createElement('style');style.textContent=`.hl-auth-panel{width:min(420px,100%);display:grid;gap:.7rem;margin:1rem auto 0;padding:1rem;border:1px solid rgba(120,191,224,.2);border-radius:18px;background:rgba(3,25,39,.86)}.hl-auth-panel[hidden],.hl-auth-panel [hidden]{display:none!important}.hl-auth-panel label{display:grid;gap:.35rem;text-align:right;color:#dcebf3;font-weight:700}.hl-auth-panel input{width:100%;box-sizing:border-box;border:1px solid rgba(120,191,224,.22);border-radius:12px;background:rgba(255,255,255,.05);color:#fff;padding:.8rem}.hl-auth-submit,.hl-auth-cancel,.hl-auth-recovery button{border-radius:12px;padding:.75rem;font-weight:800}.hl-auth-submit{border:0;background:linear-gradient(135deg,#f4d18c,#e5b45f);color:#102131}.hl-auth-cancel,.hl-auth-recovery button{border:1px solid rgba(120,191,224,.2);background:transparent;color:#dcebf3}.hl-auth-recovery{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}.hl-auth-note{color:#9cb7c7;line-height:1.6}`;document.head.appendChild(style);
    panel.querySelector('.hl-auth-cancel').addEventListener('click',()=>{state.mode='login';state.resetToken=null;cleanLinkParam('reset_token');panel.hidden=true;root.querySelector('.hl-login-actions').hidden=false;configurePanel(panel)});
    const requestFor=async purpose=>{
      const email=String(new FormData(panel).get('email')||'').trim();
      if(!email){toast('أدخل البريد الإلكتروني أولًا');return}
      const button=panel.querySelector(purpose==='reset'?'.hl-auth-forgot':'.hl-auth-resend');button.disabled=true;
      try{await postPublic(purpose==='reset'?'/auth/password-reset/request':'/auth/email-verification/request',{email});toast(purpose==='reset'?'إذا كان الحساب صالحًا فسيُجهز رابط الاستعادة':'إذا كان الحساب يحتاج تفعيلًا فسيُجهز رابط التحقق')}
      catch(error){toast(error instanceof Error?error.message:'تعذر تنفيذ الطلب')}
      finally{button.disabled=false}
    };
    panel.querySelector('.hl-auth-forgot').addEventListener('click',()=>void requestFor('reset'));
    panel.querySelector('.hl-auth-resend').addEventListener('click',()=>void requestFor('verify'));
    panel.addEventListener('submit',async event=>{
      event.preventDefault();const submit=panel.querySelector('.hl-auth-submit');const data=new FormData(panel);const email=String(data.get('email')||'').trim();const password=String(data.get('password')||'');
      submit.disabled=true;submit.textContent='جارٍ الاتصال...';
      try{
        if(state.mode==='reset'){
          if(!state.resetToken)throw new Error('رابط الاستعادة غير صالح');
          const body=await postPublic('/auth/password-reset/confirm',{token:state.resetToken,password});
          if(body.passwordReset!==true)throw new Error('تعذر تغيير كلمة المرور');
          state.resetToken=null;cleanLinkParam('reset_token');clearSession();emitAuthChanged();state.mode='login';showLogin('تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.');return;
        }
        const response=await fetch(`${API_BASE}/auth/${state.mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
        const body=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(body.message||'تعذر تسجيل الدخول');
        if(state.mode==='register'&&body.verificationRequired===true){clearSession();emitAuthChanged();state.mode='login';panel.hidden=true;root.querySelector('.hl-login-actions').hidden=false;toast('تم إنشاء الحساب. أكمل التحقق من البريد قبل تسجيل الدخول.');return}
        storeTokens(body);setAuthUi(true);emitAuthChanged();toast('تم تسجيل الدخول إلى HYDROLAND');
      }catch(error){toast(error instanceof Error?error.message:'تعذر الاتصال بخادم HYDROLAND');}
      finally{submit.disabled=false;configurePanel(panel);}
    });
    configurePanel(panel);return panel;
  };
  const processEmailVerificationLink=async()=>{
    const token=new URL(window.location.href).searchParams.get('verify_email');if(!token)return;
    try{const body=await postPublic('/auth/email-verification/confirm',{token});storeTokens(body);setAuthUi(true);emitAuthChanged();toast('تم التحقق من البريد وتفعيل الحساب')}
    catch(error){clearSession();emitAuthChanged();showLogin(error instanceof Error?error.message:'رابط التحقق غير صالح')}
    finally{cleanLinkParam('verify_email')}
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('.hl-login-primary,.hl-login-secondary');if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();sessionStorage.removeItem('hl-guest-mode');const root=login();state.mode=button.classList.contains('hl-login-secondary')?'register':'login';const panel=ensurePanel();if(!root||!panel)return;configurePanel(panel);root.querySelector('.hl-login-actions').hidden=true;panel.hidden=false;panel.querySelector('input[name="email"]').focus();
  },true);
  const terminateSession=()=>{
    const refreshToken=sessionStorage.getItem('hl-refresh-token');
    clearSession();clearProtectedView();
    setTimeout(emitAuthChanged,0);
    return refreshToken;
  };
  const logout=()=>{
    const refreshToken=terminateSession();
    showLogin();
    if(refreshToken){setTimeout(()=>{try{fetch(`${API_BASE}/auth/logout`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken}),keepalive:true}).catch(()=>{})}catch{}},0)}
  };
  window.addEventListener('pageshow',syncAuthUi);
  document.addEventListener('hydroland:guest-mode',syncAuthUi);
  syncAuthUi();
  if(state.resetToken){state.mode='reset';queueMicrotask(()=>{const root=login(),panel=ensurePanel();if(root&&panel){root.querySelector('.hl-login-actions').hidden=true;panel.hidden=false;configurePanel(panel);panel.querySelector('input[name="password"]').focus()}})}
  queueMicrotask(()=>void processEmailVerificationLink());
  document.addEventListener('click',event=>{const button=event.target.closest?.('[data-hl-action="logout"]');if(!button)return;event.preventDefault();button.disabled=true;document.getElementById('profile-dialog')?.close();void logout()});
  window.HydrolandAuth={apiBase:API_BASE,setAuthUi,syncAuthUi,getAccessToken:()=>sessionStorage.getItem('hl-access-token'),getRefreshToken:()=>sessionStorage.getItem('hl-refresh-token'),isAuthenticated:()=>Boolean(sessionStorage.getItem('hl-refresh-token')),isGuestMode,refreshSession,authorizedFetch,terminateSession,logout,requestEmailVerification:email=>postPublic('/auth/email-verification/request',{email}),requestPasswordReset:email=>postPublic('/auth/password-reset/request',{email}),confirmEmailVerification:token=>postPublic('/auth/email-verification/confirm',{token}),resetPassword:(token,password)=>postPublic('/auth/password-reset/confirm',{token,password})};
})();