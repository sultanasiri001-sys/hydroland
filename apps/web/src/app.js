const $=id=>document.getElementById(id);
const workspaces={diver:{},instructor:{},center:{},boat:{},organization:{},admin:{}};
const toast=$('toast');
function notify(message){toast.textContent=message;toast.classList.add('visible');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>toast.classList.remove('visible'),2600)}
$('menu').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item[href]').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));link.classList.add('active');document.querySelector('.sidebar').classList.remove('open')}));
document.querySelectorAll('[data-toast]').forEach(button=>button.addEventListener('click',()=>notify(button.dataset.toast)));
$('search-form').addEventListener('submit',event=>{event.preventDefault();notify('سيتم البحث في الرحلات والدورات والمعدات')});
const dialog=$('role-dialog');
$('role-switch').addEventListener('click',()=>dialog.showModal());
$('close-dialog').addEventListener('click',()=>dialog.close());
dialog.querySelectorAll('.role-options button').forEach(button=>button.addEventListener('click',()=>{notify(`تم اختيار واجهة ${button.textContent}`);dialog.close()}));
$('language').addEventListener('click',()=>notify('الواجهة الإنجليزية جاهزة للمرحلة التالية'));
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
