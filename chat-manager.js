(() => {
  'use strict';
  const KEY = 'rdx_chat_manager_v1';
  const OWN = '[data-rdx-chat-owned]';
  const presets = ['منتظر پاسخ', 'منتظر فایل جدید', 'بازدید هماهنگ شد', 'بازدید انجام شد', 'نیاز به پیگیری', 'فعلاً مورد مناسب ندارد', 'مشاور املاک؛ ارتباط حفظ شود', 'گفتگو تمام شد'];
  let records = {}, dirty = false, timer, revision = 0;
  const text = (node, selector) => node.querySelector(selector)?.textContent.trim() || '';
  const el = (tag, value, className) => { const n = document.createElement(tag); if (value) n.textContent = value; if (className) n.className = className; return n; };
  const owned = node => { node.dataset.rdxChatOwned = 'true'; return node; };
  function load() {
    try { const data = JSON.parse(localStorage.getItem(KEY)); records = data && typeof data === 'object' && !Array.isArray(data) ? data : {}; } catch { records = {}; }
  }
  load();
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(records)); dirty = false; }
    catch { alert('ذخیره داده‌های چت ممکن نشد؛ فضای ذخیره مرورگر را بررسی کنید.'); }
  }
  function idFromHref(href) {
    try { const u = new URL(href, location.origin); return u.origin === location.origin ? u.pathname.match(/^\/chat\/([\w-]+)\/?$/)?.[1] || null : null; } catch { return null; }
  }
  function record(id, meta = {}) {
    if (!records[id]) { records[id] = { id, title: '', name: '', notes: [], pinned: false, shelved: false }; dirty = true; }
    const r = records[id];
    for (const [key, value] of Object.entries(meta)) if (value && r[key] !== value) { r[key] = value; dirty = true; }
    if (!Array.isArray(r.notes)) r.notes = [];
    return r;
  }
  function change(id, fn) { fn(record(id)); revision++; persist(); scan(); }
  function button(label, fn) {
    const b = el('button', label); b.type = 'button';
    b.onclick = event => { event.preventDefault(); event.stopPropagation(); fn(); }; return b;
  }
  function refreshSavedPanel() {
    const p = document.getElementById('rdxc-panel');
    if (p?.dataset.view === 'saved') showSaved(p.querySelector('select').value, p.querySelector('input').value);
  }
  function togglePin(r) {
    change(r.id, item => { item.pinned = !item.pinned; if (item.pinned) item.shelved = false; });
    refreshSavedPanel();
  }
  function toggleShelf(r) {
    change(r.id, item => { item.shelved = !item.shelved; if (item.shelved) item.pinned = false; });
    refreshSavedPanel();
  }
  function actions(r) {
    const box = el('div', '', 'rdxc-actions');
    box.append(button(r.pinned ? '📌 برداشتن پین' : '📌 پین', () => togglePin(r)),
      button(r.shelved ? '↩ بازگردانی به اصلی' : '📂 کنارگذاری و حفظ ارتباط', () => toggleShelf(r)),
      button('📝 یادداشت / وضعیت', () => showNotes(r.id)));
    return box;
  }
  function noteSummary(r) { const last = r.notes.at(-1); return last ? last.text : ''; }
  function deletionNotice() {
    const warnings = document.querySelectorAll('.kt-statement--warning .kt-statement__description');
    for (const warning of warnings) {
      const message = warning.textContent.replace(/\s+/g, ' ').trim();
      if (!message.includes('آگهی حذف شده')) continue;
      const expiry = message.match(/قبل از تاریخ\s+(.{1,40}?)\s+که\s+این\s+چت\s+غیرفعال/);
      return { message, expiry: expiry?.[1]?.trim() || '' };
    }
    return null;
  }
  function removePanel() { document.getElementById('rdxc-panel')?.remove(); }
  function panel(title) {
    removePanel(); const root = owned(el('section', '', 'rdxc-panel')); root.id = 'rdxc-panel'; root.setAttribute('role','dialog'); root.setAttribute('aria-label',title);
    const header = el('header'); header.append(el('strong',title),button('بستن',removePanel)); root.append(header); document.body.append(root); return root;
  }
  const dateText = value => new Date(value).toLocaleString('fa-IR', {timeZone:'Asia/Tehran',dateStyle:'short',timeStyle:'short'});
  function historyList(r) {
    const list = el('div', '', 'rdxc-history');
    if (!r.notes.length) list.append(el('p','هنوز یادداشتی ثبت نشده است.'));
    [...r.notes].reverse().forEach(note => {
      const item = el('div','','rdxc-note'); item.append(el('small', dateText(note.createdAt)), el('p',note.text));
      item.append(button('ویرایش', () => {
        const p = panel('ویرایش یادداشت'); const input = el('textarea'); input.value = note.text; input.maxLength = 5000; input.rows = 4;
        p.append(input, button('ذخیره تغییر', () => {
          if (!input.value.trim()) return;
          change(r.id, item => { const n = item.notes.find(n=>n.id===note.id); if (n) { n.text=input.value.trim(); n.editedAt=new Date().toISOString(); } }); showNotes(r.id);
        })); input.focus();
      }), button('حذف', () => {
        if (!confirm('این یادداشت حذف شود؟')) return;
        change(r.id, item=>{ item.notes=item.notes.filter(n=>n.id!==note.id); }); showNotes(r.id);
      })); list.append(item);
    }); return list;
  }
  function showNotes(id) {
    const r = record(id); const p = panel('سوابق گفتگو: ' + (r.name || r.title || id));
    p.append(el('p',r.title),el('small','یادداشت‌ها فقط برای شما ذخیره می‌شوند و در چت ارسال نمی‌شوند.'));
    const input = el('textarea'); input.placeholder='نتیجه صحبت یا نکته پیگیری…'; input.maxLength=5000; input.rows=3;
    const options = el('div','','rdxc-presets');
    presets.forEach(value => options.append(button(value,()=>{ input.value = input.value.trim() ? input.value + '\n' + value : value; input.focus(); })));
    p.append(options, input, button('ثبت یادداشت جدید',()=>{
      if (!input.value.trim()) { input.focus(); return; }
      change(id,item=>item.notes.push({id:crypto.randomUUID(),text:input.value.trim(),createdAt:new Date().toISOString()})); showNotes(id);
    }),historyList(r)); input.focus();
  }
  function chatLink(r) { const link=el('a',r.title || r.name || r.id); link.href='/chat/'+encodeURIComponent(r.id); return link; }
  function showSaved(initial='shelved', query='') {
    const p=panel('مدیریت گفتگوها'); p.dataset.view='saved';
    const filter=el('select'); [['shelved','ارتباط‌های نگه‌داشته‌شده'],['pinned','پین‌شده‌ها'],['notes','دارای یادداشت'],['all','همه گفتگوهای شناخته‌شده']].forEach(([value,title])=>{ const o=el('option',title);o.value=value;filter.append(o); }); filter.value=initial;
    const search=el('input'); search.type='search';search.value=query;search.placeholder='جستجوی نام، آگهی و یادداشت…';
    const list=el('div');
    const render=()=>{
      list.replaceChildren(); const q=search.value.trim().toLocaleLowerCase();
      const matches=Object.values(records).filter(r=> (filter.value==='all' || (filter.value==='notes' ? r.notes.length > 0 : Boolean(r[filter.value]))) && [r.title,r.name,...r.notes.map(n=>n.text)].join(' ').toLocaleLowerCase().includes(q));
      matches.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(b.notes.at(-1)?.createdAt || '').localeCompare(a.notes.at(-1)?.createdAt || ''));
      if (!matches.length) list.append(el('p','گفتگویی در این بخش نیست.'));
      matches.forEach(r=>{ const row=el('div','','rdxc-saved-row');row.append(chatLink(r),el('small',r.name));
        if (r.deleted) row.append(el('small','⚠️ آگهی حذف شده است.','rdxc-deleted-label'));
        row.append(el('p',noteSummary(r)),actions(r));list.append(row); });
    };
    search.oninput=render; filter.onchange=render;
    p.append(filter,search,el('small','فقط گفتگوهایی که فهرست یا صفحه آن‌ها در این مرورگر بارگذاری شده، در این بخش شناخته می‌شوند.'),list);
    const reset=button('ریست مدیریت چت‌ها',()=>{
      if (!confirm('پین‌ها، کنارگذاری‌ها و همه یادداشت‌های گفتگو حذف شوند؟ پیام‌های دیوار تغییری نمی‌کنند.')) return;
      records={};revision++;persist();removePanel();scan();
    }); p.append(reset); render();
  }
  function rowInfo(conversation) {
    const a=conversation.closest('a[href]'); const id=idFromHref(a?.getAttribute('href'));
    if (!id || id==='postchi') return null;
    const r=record(id,{title:text(conversation,'.kt-conversation__body'),name:text(conversation,'.kt-conversation__name')});
    const unread=Boolean(conversation.querySelector('.kt-conversation__icon--new-message'));
    const signal=JSON.stringify([unread,text(conversation,'.kt-conversation__message'),text(conversation,'.kt-conversation__time')]);
    if (r.shelved && unread && r.signal && r.signal!==signal) { r.shelved=false; revision++;dirty=true; }
    if (r.signal!==signal) {r.signal=signal;dirty=true;}
    return {r,a,outer:a.closest('[data-indexincache]') || a};
  }
  function scanRows() {
    document.querySelectorAll('.kt-conversation:not(.kt-conversation--postman)').forEach(conversation=>{
      if (conversation.closest(OWN)) return;
      const info=rowInfo(conversation);if(!info)return; const {r,a,outer}=info;
      if (outer.classList.contains('rdxc-shelved-row')!==Boolean(r.shelved)) outer.classList.toggle('rdxc-shelved-row',Boolean(r.shelved));
      const stamp=JSON.stringify([r.id,r.pinned,r.shelved,noteSummary(r),r.notes.length,Boolean(r.deleted)]);
      let tools=outer.querySelector(':scope > .rdxc-row-tools');
      if (!tools || tools.dataset.stamp!==stamp) {
        tools?.remove();tools=owned(el('div','','rdxc-row-tools'));tools.dataset.stamp=stamp;
        tools.append(actions(r)); const note=noteSummary(r); if(note)tools.append(el('div',note,'rdxc-summary'));
        if (r.deleted) tools.append(el('div','⚠️ آگهی حذف شده است.','rdxc-deleted-label'));
        // Place our controls outside the native navigation anchor/context-menu trigger.
        if(outer===a) a.after(tools);else outer.append(tools);
      }
    });
  }
  function scanSidebar() {
    const first=document.querySelector('.kt-conversation');
    const host=first?.closest('.sfc32e') || first?.closest('.sef05d');
    if(!host)return;
    let bar=host.querySelector('#rdxc-sidebar');
    if(!bar){bar=owned(el('section','','rdxc-sidebar'));bar.id='rdxc-sidebar';host.prepend(bar);}
    const pinned=Object.values(records).filter(r=>r.pinned&&!r.shelved);
    const stamp=JSON.stringify([revision,Object.values(records).filter(r=>r.shelved).length,pinned.map(r=>[r.id,r.title,r.name,noteSummary(r)])]);
    if(bar.dataset.stamp===stamp)return;bar.dataset.stamp=stamp;bar.replaceChildren();
    const nav=el('div','','rdxc-actions');nav.append(button('📂 نگه‌داشته‌شده‌ها ('+Object.values(records).filter(r=>r.shelved).length.toLocaleString('fa-IR')+')',()=>showSaved()),button('📝 مدیریت گفتگوها',()=>showSaved('all')));bar.append(nav);
    if(pinned.length){const details=el('details');details.open=true;details.append(el('summary','📌 گفتگوهای پین‌شده'));
      pinned.forEach(r=>{const row=el('div','','rdxc-pinned');row.append(chatLink(r),el('small',r.name),actions(r));details.append(row);});bar.append(details);}
  }
  function activeInfo() {
    if(!document.querySelector('#chat-input'))return null;
    const routeId=idFromHref(location.href);
    const nativeId=document.querySelector('.kt-scrollable__items-wrapper [conversationid]')?.getAttribute('conversationid');
    // During SPA navigation, the URL can change before the old conversation DOM is replaced.
    if(routeId && nativeId && routeId!==nativeId)return null;
    const id=routeId || nativeId;
    if(!id||id==='postchi')return null;
    return record(id,{name:document.querySelector('h2.kt-chat-nav-bar__title')?.textContent.trim()||'',title:document.querySelector('.kt-post-preview-bar__title')?.textContent.trim()||''});
  }
  function scanActive() {
    const r=activeInfo(); const nav=document.querySelector('h2.kt-chat-nav-bar__title')?.closest('.kt-chat-nav-bar');
    if(!r||!nav){document.getElementById('rdxc-active')?.remove();document.getElementById('rdxc-deleted-warning')?.remove();return;}
    const notice=deletionNotice();
    if (notice && (!r.deleted || r.deleted.message!==notice.message)) {
      r.deleted={...notice,detectedAt:new Date().toISOString()};dirty=true;revision++;
    }
    let warning=document.getElementById('rdxc-deleted-warning');
    const preview=document.querySelector('a.kt-post-preview-bar');
    if (r.deleted && preview) {
      const message=r.deleted.expiry
        ? `⚠️ آگهی حذف شده است؛ طبق پیام دیوار، چت از ${r.deleted.expiry} غیرفعال می‌شود.`
        : '⚠️ دیوار اعلام کرده است که این آگهی حذف شده است.';
      if (!warning) { warning=owned(el('div','','rdxc-deleted-warning')); warning.id='rdxc-deleted-warning'; }
      if (warning.textContent!==message) warning.textContent=message;
      if (warning.previousElementSibling!==preview) preview.after(warning);
    } else warning?.remove();
    let bar=document.getElementById('rdxc-active');
    const stamp=JSON.stringify([r.id,r.pinned,r.shelved,r.notes]);
    if(bar?.dataset.stamp===stamp&&bar.previousElementSibling===nav)return;
    bar?.remove();bar=owned(el('section','','rdxc-active'));bar.id='rdxc-active';bar.dataset.stamp=stamp;
    bar.append(actions(r));
    const history=el('details');history.append(el('summary','سوابق یادداشت‌ها ('+r.notes.length.toLocaleString('fa-IR')+')'));
    const list=el('div','','rdxc-inline-history');
    if(!r.notes.length)list.append(el('p','یادداشتی ثبت نشده است.'));
    [...r.notes].reverse().forEach(n=>{const row=el('div','','rdxc-note');row.append(el('small',dateText(n.createdAt)),el('p',n.text));list.append(row);});
    history.append(list);bar.append(history);nav.after(bar);
    if(!document.getElementById('rdxc-sidebar'))bar.append(button('📂 مدیریت / ارتباط‌های نگه‌داشته‌شده',()=>showSaved()));
  }
  const RELEVANT = '.kt-conversation, .kt-chat-nav-bar, .kt-post-preview-bar, .kt-statement--warning, .kt-chat-input';
  function relevantMutation(m) {
    const target=m.target.nodeType===1 ? m.target : m.target.parentElement;
    if(target?.closest(OWN))return false;
    const changed=[...m.addedNodes,...m.removedNodes];
    if(changed.length && changed.every(node=>node.nodeType===1 && (node.matches(OWN)||node.closest(OWN))))return false;
    if(target?.closest(RELEVANT))return true;
    return changed.some(node=>node.nodeType===1 && (node.matches(RELEVANT)||node.querySelector(RELEVANT)));
  }
  const observer=new MutationObserver(mutations=>{
    if(!mutations.some(relevantMutation))return;
    clearTimeout(timer);timer=setTimeout(scan,150);
  });
  function observe(){
    if(/^\/chat(?:\/|$)/.test(location.pathname))
      observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','href']});
  }
  function scan(){
    observer.disconnect();
    try {
      if(!/^\/chat(?:\/|$)/.test(location.pathname)) {document.querySelectorAll(OWN).forEach(n=>n.remove());return;}
      scanRows();scanSidebar();scanActive();if(dirty)persist();
    } finally {observe();}
  }
  window.addEventListener('storage',event=>{if(event.key===KEY){load();revision++;scan();}});
  window.addEventListener('rdx-reset-chat',()=>{records={};revision++;persist();removePanel();scan();});
  window.addEventListener('keydown',event=>{if(event.key==='Escape')removePanel();});
  let lastUrl=location.href;setInterval(()=>{if(lastUrl!==location.href){lastUrl=location.href;removePanel();scan();}},500);
  scan();
})();
