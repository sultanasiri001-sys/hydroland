import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
const source=await readFile(new URL('../src/hydroland-i18n.js',import.meta.url),'utf8');
function fixture(){
 const document={querySelectorAll:()=>[],documentElement:{},dispatchEvent(){},addEventListener(){}};
 const context={window:{},document,CustomEvent:class{}};vm.runInNewContext(source,context);
 const i18n=context.window.HydrolandI18n;
 const scope=i18n.createScope('boundary-test',{'عنوان':'Title','الاسم':'Name','إغلاق':'Close','جاهز':'Ready','تم حفظ {0}':'Saved {0}','أ & ب':'A & B'});
 return {i18n,scope,document};
}
test('authored HTML localizes literals while preserving opaque slots and exact attribute structure',()=>{
 const {i18n,scope}=fixture();i18n.setLocale('en');
 const output=scope.html`<button ${'disabled'} data-route="${'عنوان'}" aria-label="${'الاسم'}" title="عنوان"><b>×</b> إغلاق ${'__HL_I18N_SLOT_0__'}</button>`;
 assert.match(output,/<button disabled data-route="عنوان" aria-label="الاسم" title="Title"/);
 assert.match(output,/<b>×<\/b><!--hl-i18n:boundary-test\|[^>]+--> Close <!--\/hl-i18n-->__HL_I18N_SLOT_0__/);
 assert.doesNotMatch(output,/data-hl-i18n-aria-label/);
});
test('non-display attributes, raw element contents and quoted payloads stay outside translation',()=>{
 const {i18n,scope}=fixture();i18n.setLocale('en');
 const output=scope.html`<style>.x::before{content:'عنوان'}</style><textarea>عنوان</textarea><div data-raw=' aria-label="عنوان" ' title="عنوان">أ &amp; ب</div>`;
 assert.match(output,/<style>\.x::before\{content:'عنوان'\}<\/style><textarea>عنوان<\/textarea>/);
 assert.match(output,/data-raw=' aria-label="عنوان" '/);
 assert.match(output,/title="Title"/);assert.match(output,/>A &amp; B<!--\/hl-i18n-->/);
});
test('explicit local status labels escape unknown data and retain a source marker only for known authored keys',()=>{
 const {i18n,scope}=fixture();i18n.setLocale('en');
 assert.match(scope.label('جاهز'),/>Ready<!--\/hl-i18n-->/);
 assert.equal(scope.label('<provider text>'),'&lt;provider text&gt;');
 assert.equal(scope.format('تم حفظ {0}',['عنوان <opaque>']),'Saved عنوان <opaque>');
 assert.match(scope.label('تم حفظ {0}',['عنوان <opaque>']),/>Saved عنوان &lt;opaque&gt;<!--\/hl-i18n-->/);
 assert.throws(()=>scope.html(['عنوان']),/tagged template literal/);
 assert.throws(()=>i18n.createScope('boundary-test',{'عنوان':'Changed'}),/already registered/);
});
test('explicit dynamic text and accessible attributes switch without reviving controller-replaced content',()=>{
 const {i18n,scope}=fixture();
 const attributes={},element={isConnected:true,firstChild:null,set textContent(value){this.firstChild={nodeType:3,nodeValue:value,isConnected:true}},get textContent(){return this.firstChild?.nodeValue},setAttribute(key,value){attributes[key]=value},getAttribute(key){return attributes[key]??null}};
 scope.setText(element,'تم حفظ {0}',['عنوان']);scope.setAttribute(element,'aria-label','تم حفظ {0}',['الاسم']);
 i18n.setLocale('en');assert.equal(element.textContent,'Saved عنوان');assert.equal(attributes['aria-label'],'Saved الاسم');
 element.firstChild.nodeValue='new controller state';i18n.setLocale('ar');assert.equal(element.textContent,'new controller state');
 assert.equal(attributes['aria-label'],'تم حفظ الاسم');assert.throws(()=>scope.setAttribute(element,'value','عنوان'),/Unsupported/);
});
test('mixed message helpers require descriptor identity and keep server text opaque even when it equals a source key',()=>{
 const {i18n,scope}=fixture();const element={isConnected:true,firstChild:null,set textContent(value){this.firstChild={nodeType:3,nodeValue:String(value),isConnected:true}},get textContent(){return this.firstChild?.nodeValue}};
 scope.setMessage(element,scope.message('تم حفظ {0}',['عنوان']));i18n.setLocale('en');assert.equal(element.textContent,'Saved عنوان');
 scope.setMessage(element,'عنوان');i18n.setLocale('ar');i18n.setLocale('en');assert.equal(element.textContent,'عنوان');
 scope.setMessage(element,{toString:()=> 'عنوان'});i18n.setLocale('ar');assert.equal(element.textContent,'عنوان');
});
test('explicit dynamic accessible attributes preserve opaque parameters and reject route or form-value names',()=>{
 const {i18n,scope}=fixture();i18n.setLocale('en');
 assert.match(scope.attribute('aria-label','تم حفظ {0}',['عنوان <private>']),/^aria-label="Saved عنوان &lt;private&gt;" data-hl-i18n-aria-label=/);
 assert.throws(()=>scope.attribute('value','عنوان'),/Unsupported/);
 assert.throws(()=>scope.attribute('href','عنوان'),/Unsupported/);
});
test('mixed inline messages translate only branded source and nested source descriptors retain explicit marker metadata',()=>{
 const {i18n,scope}=fixture();i18n.setLocale('en');
 assert.equal(scope.messageHTML('عنوان <provider>'),'عنوان &lt;provider&gt;');
 assert.match(scope.messageHTML(scope.message('عنوان')),/>Title<!--\/hl-i18n-->/);
 const markup=scope.label('تم حفظ {0}',[scope.message('جاهز')]);assert.match(markup,/>Saved Ready<!--\/hl-i18n-->/);assert.match(decodeURIComponent(markup),/"scope":"boundary-test","source":"جاهز"/);
});

test('whitespace-bearing authored keys interpolate and rebind their values without losing the exact catalog key',()=>{
 const {i18n,document}=fixture();
 const scope=i18n.createScope('inline-spacing',{' · يرفع إلى {0}':' · Reports to {0}',' · التكليفات التدريبية: {0}':' · Training assignments: {0}','جاهز':'Ready'});
 const markup=scope.messageHTML(scope.message(' · يرفع إلى {0}',['جاهز']));
 assert.match(markup,/> · يرفع إلى جاهز<!--\/hl-i18n-->$/);
 assert.match(scope.label(' · التكليفات التدريبية: {0}',[4]),/> · التكليفات التدريبية: 4<!--\/hl-i18n-->$/);
 const marker=markup.match(/^<!--(.*?)-->/)[1],text={nodeType:3,nodeValue:' · يرفع إلى جاهز',isConnected:true,nextSibling:{nodeType:8,nodeValue:'/hl-i18n'}};
 let next={nodeType:8,nodeValue:marker,nextSibling:text};document.createTreeWalker=()=>({nextNode(){const node=next;next=null;return node}});
 scope.bind({querySelectorAll:()=>[]});i18n.setLocale('en');assert.equal(text.nodeValue,' · Reports to جاهز');
 assert.match(scope.label(' · التكليفات التدريبية: {0}',[4]),/> · Training assignments: 4<!--\/hl-i18n-->$/);
 i18n.setLocale('ar');assert.equal(text.nodeValue,' · يرفع إلى جاهز');
});

test('exact authored whitespace keys take precedence while surrounding layout whitespace remains intact',()=>{
 const {i18n}=fixture();const scope=i18n.createScope('spacing-precedence',{'عنوان':'Title',' عنوان ':' Exact title '});i18n.setLocale('en');
 assert.match(scope.html`<button title=" عنوان "> عنوان </button>`,/title=" Exact title "/);
 assert.match(scope.label(' عنوان '),/> Exact title <!--\/hl-i18n-->$/);
 assert.match(scope.label('\nعنوان\n'),/>\nTitle\n<!--\/hl-i18n-->$/);
 assert.match(scope.attribute('aria-label',' عنوان '),/^aria-label=" Exact title " data-hl-i18n-aria-label=/);
 assert.match(scope.attribute('aria-label','\nعنوان\n'),/^aria-label="\nTitle\n" data-hl-i18n-aria-label=/);
});
