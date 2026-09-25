(()=>{
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2600)};
  const auth=()=>window.HydrolandAuth;
  const waitForAuth=()=>new Promise((resolve,reject)=>{let tries=0;const tick=()=>{if(auth()?.apiBase)return resolve(auth());if(++tries>100)return reject(new Error('AUTH_RUNTIME_UNAVAILABLE'));setTimeout(tick,50)};tick()});

  const verificationTokenFromFragment=()=>{const prefix='#verify-email=';if(!location.hash.startsWith(prefix))return null;const encoded=location.hash.slice(prefix.length);history.replaceState(null,'',location.pathname+location.search);try{return decodeURIComponent(encoded)}catch{return null}};

  const verifyFromFragment=async()=>{
    const token=verificationTokenFromFragment();if(!token)return false;
    try{
      const runtime=await waitForAuth();
      const response=await fetch(`${runtime.apiBase}/auth/email-verification/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.message||'رابط التحقق غير صالح أو منتهي');
      runtime.syncAuthUi();toast('تم تأكيد البريد الإلكتروني. يمكنك تسجيل الدخول الآن.');return true;
    }catch(error){toast(error instanceof Error?error.message:'تعذر تأكيد البريد الإلكتروني');return false}
  };

  const resend=async email=>{
    const clean=String(email||'').trim();if(!/^\S+@\S+\.\S+$/.test(clean)){toast('أدخل بريدًا إلكترونيًا صحيحًا أولًا');return}
    try{
      const runtime=await waitForAuth();
      const response=await fetch(`${runtime.apiBase}/auth/email-verification/resend`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:clean})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.message||'تعذر طلب رابط تحقق جديد');
      if(body?.delivery==='UNAVAILABLE'){toast('خدمة إرسال البريد غير مفعلة حاليًا. يمكنك استخدام تسجيل الدخول بحساب Google.');return}
      toast('إذا كان الحساب بحاجة للتحقق فسيصل رابط جديد إلى البريد المسجل.');
    }catch(error){toast(error instanceof Error?error.message:'تعذر طلب رابط تحقق جديد')}
  };

  const bindResend=()=>{
    const panel=document.querySelector('.hl-auth-panel');if(!panel||panel.querySelector('[data-email-verification-resend]'))return false;
    const button=document.createElement('button');button.type='button';button.className='hl-auth-cancel';button.dataset.emailVerificationResend='1';button.textContent='إعادة إرسال رابط التحقق';
    const note=panel.querySelector('.hl-auth-note');note?.insertAdjacentElement('beforebegin',button);
    button.addEventListener('click',()=>void resend(panel.querySelector('input[name="email"]')?.value));return true;
  };

  const observer=new MutationObserver(()=>{if(bindResend())observer.disconnect()});observer.observe(document.documentElement,{childList:true,subtree:true});bindResend();
  void verifyFromFragment();
  window.HydrolandEmailVerification={verifyFromFragment,resend};
})();
