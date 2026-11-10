(() => {
  'use strict';

  const BLOCKED_KEY = 'rdx_blocked_ads_list';
  const SETTINGS_KEY = 'rdx_settings';

  // تنظیمات پیش‌فرض
  const DEFAULT_SETTINGS = {
    idealDepMin: 150, idealDepMax: 250, idealRentMin: 15, idealRentMax: 25,
    nextDepMin: 250, nextDepMax: 300, nextRentMin: 20, nextRentMax: 30,
    belowDepMax: 100, belowRentMax: 15
  };

  let currentSettings = { ...DEFAULT_SETTINGS };

  const CONFIG = {
    hidePatterns: [/هم\s*خونه/, /هم\s*خانه/, /متقاضی/],
    singleRestrictedPatterns: [
      /(?:فقط|صرفا|صرفاً|مخصوص|مناسب|ویژه)\s*زوج/,
      /زوج\s*فقط/,
      /(?:بدون|عدم)\s*(?:پذیرش\s*)?مجرد/,
      /مجرد\s*(?:نمی|ممنوع|پذیرفته\s*نمی|قبول\s*نمی)/,
    ],
    singleAllowedPatterns: [
      /موجه/,
      /(?:زوج|خانواده)\s*(?:و|یا|،)\s*مجرد/,
      /مجرد\s*(?:و|یا|،)\s*(?:زوج|خانواده)/,
      /حتی\s*مجرد/,
      /مجرد\s*(?:هم\s*)?اوکی/,
      /مجرد\s*مجاز/,
    ],
    suitePattern: /سو(?:ئ)?ی+ت/,
    furnishedPattern: /مبل/,
    notFurnishedPattern: /بدون\s*مبل/,
    regions: {
      'غرب': ['شهرک نفت', 'شهرک غرب', 'سعادت‌آباد', 'پونک', 'مرزداران', 'باغ فیض', 'سردارجنگل', 'گیشا', 'المهدی', 'شهر زیبا', 'سازمان برنامه شمالی', 'ستارخان', 'شهرک پاسداران', 'اوین', 'کاج'],
      'شرق': ['شمس‌آباد', 'کرمان', 'هروی', 'دبستان', 'بنی‌هاشم', 'جهاد'],
      'شمال': ['مینی‌سیتی', 'شهرک گلها', 'شهرک محلاتی', 'دزاشیب', 'نیاوران', 'تجریش', 'ولنجک', 'زعفرانیه', 'فرمانیه', 'قیطریه', 'کامرانیه', 'اقدسیه', 'ازگل', 'سوهانک', 'دارآباد', 'جماران', 'صاحبقرانیه', 'حکمت'],
      'مرکز': ['زرگنده', 'ونک', 'ده‌ونک', 'نیلوفر', 'آرژانتین', 'فاطمی', 'یوسف‌آباد', 'میرداماد', 'ظفر', 'جردن', 'الهیه', 'گاندی', 'سید خندان', 'عباس‌آباد', 'بهجت‌آباد', 'چیذر']
    }
  };

  const PDP_CONFIG = {
    noParkingPatterns: [/پارکینگ[\s:،\-–—]*(?:ندارد|نداره|نداریم|نمی\s*باشد|نمیباشد|نیست)/, /(?:بدون|فاقد)\s*پارکینگ/],
    parkingExemptionPatterns: [/موتور/, /متور/],
    parkingExemptionNegativePatterns: [/(?:بدون|فاقد)\s*(?:جای\s*)?موتور/, /پارکینگ\s*موتور\s*(?:ندارد|نداره|نیست)/],
    undergroundPatterns: [/زیر\s*همکف/, /زیرهمکف/, /طبقه\s*منفی/, /منفی\s*(?:یک|۱|1)/],
    singleRestrictedPatterns: [
      /مجرد\s*(?:نمی|ممنوع|پذیرفته\s*نمی|قبول\s*نمی|نباش)/,
      /(?:بدون|عدم\s*پذیرش)\s*مجرد/,
      /(?:فقط|صرفا|صرفاً|مخصوص|مناسب|ویژه)\s*زوج/,
      /زوج\s*فقط/,
      /(?:فقط|صرفا|صرفاً|مخصوص|مناسب|ویژه)\s*(?:خانم|آقا|مرد|زن|دختر|پسر)/,
      /(?:خانواده|خانوده)\s*(?:و|یا|،)\s*زوج/,
      /زوج\s*(?:و|یا|،)\s*(?:خانواده|خانوده)/,
      /(?:خانواده|خانوده)\s*(?:[0-9۰-۹]+\s*نفره\s*)?(?:یا|و)\s*زوج/,
    ],
    singleAllowedPatterns: [
      /موجه/, /(?:زوج|خانواده)\s*(?:و|یا|،)\s*مجرد/, /مجرد\s*(?:و|یا|،)\s*(?:زوج|خانواده)/, /حتی\s*مجرد/, /مجرد\s*(?:هم\s*)?اوکی/, /مجرد\s*مجاز/,
    ],
  };

  const CARD_SEL = 'article.kt-post-card';
  const TITLE_SEL = 'h2.kt-post-card__title';

  let removedTitles = new Map();
  let removedBoxTimer;
  const NOTES_KEY = 'rdx_notes';
  const FOLLOW_KEY = 'rdx_followups';
  const AUTO_REVEAL_KEY = 'rdx_auto_reveal';
  const readData = (key, fallback = {}) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const writeData = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let showLegend = true;

  // ═══════════════════════════════════════
  //  توابع کمکی
  // ═══════════════════════════════════════
  const normalize = (str) => (str || '').replace(/[\u200c\u200e\u200f\u0640]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').trim();
  
  const getTokenFromUrl = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0];
  };

  const loadSettings = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      if (saved) currentSettings = { ...DEFAULT_SETTINGS, ...saved };
    } catch(e) {}
  };

  const getBlockedAds = () => {
    try { return JSON.parse(localStorage.getItem(BLOCKED_KEY)) || []; } catch(e) { return []; }
  };

  const blockAd = (token) => {
    if (!token) return;
    const blocked = getBlockedAds();
    if (!blocked.includes(token)) {
      blocked.push(token);
      localStorage.setItem(BLOCKED_KEY, JSON.stringify(blocked));
    }
  };

  const extractNumber = (text) => {
    const fa = '۰۱۲۳۴۵۶۷۸۹';
    const en = '0123456789';
    let norm = '';
    for (const ch of text) {
      const idx = fa.indexOf(ch);
      norm += idx >= 0 ? en[idx] : ch;
    }
    const m = norm.match(/\d{1,3}(?:[,٬]\d{3})+|\d+/);
    if (!m) return null;
    const n = parseInt(m[0].replace(/[,٬]/g, ''), 10);
    return isNaN(n) ? null : n;
  };

  const formatPrice = (num) => num.toLocaleString('fa-IR');

  const parsePrices = (card) => {
    const descs = card.querySelectorAll('.kt-post-card__description');
    let deposit = null, rent = null;
    for (const d of descs) {
      const text = normalize(d.textContent);
      const num = extractNumber(text);
      if (num === null) continue;
      if (/ودیعه|بیعانه/.test(text)) deposit = num;
      else if (/اجاره/.test(text)) rent = num;
    }
    return { deposit, rent };
  };

  // هر ۱۰۰ میلیون تومان ودیعه معادل ۳ میلیون تومان اجاره ماهانه است.
  // کمیسیون: نصف اجاره کامل یک ماه پس از تبدیل کل ودیعه به اجاره (رهن صفر).
  const calculateMortgageData = (deposit, rent) => {
    if (deposit === null || rent === null || deposit < 0 || rent < 0) return null;

    const DEPOSIT_BASE = 100_000_000;
    const RENT_PER_BASE = 3_000_000;

    // تبدیل کل ودیعه به اجاره: به‌ازای هر ۱۰۰ میلیون، ۳ میلیون به اجاره افزوده می‌شود.
    const fullRent = rent + (deposit / DEPOSIT_BASE) * RENT_PER_BASE;

    // تبدیل کل اجاره به ودیعه: به‌ازای هر ۳ میلیون، ۱۰۰ میلیون به ودیعه افزوده می‌شود.
    const fullMortgage = deposit + (rent / RENT_PER_BASE) * DEPOSIT_BASE;

    const commission = fullRent / 2;
    return {
      fullRent: Math.round(fullRent),
      fullMortgage: Math.round(fullMortgage),
      commission: Math.round(commission)
    };
  };

  const getRegion = (card) => {
    const bottomText = card.querySelector('.kt-post-card__bottom-description')?.textContent || '';
    let district = '';
    if (bottomText.includes('،')) {
      district = bottomText.split('،').pop().replace('در', '').trim();
    } else {
      const match = bottomText.match(/در\s+(.+)/);
      district = match ? match[1].trim() : '';
    }
    for (const [regionName, list] of Object.entries(CONFIG.regions)) {
      if (list.some(w => district.includes(w))) return regionName;
    }
    return 'سایر';
  };

  // ═══════════════════════════════════════
  //  منطق پردازش کارت‌ها
  // ═══════════════════════════════════════
  function classifyPrice(deposit, rent) {
    if (deposit === null || rent === null) return null;
    const d = deposit / 1e6, r = rent / 1e6;
    const s = currentSettings;

    if (d >= s.idealDepMin && d <= s.idealDepMax && r >= s.idealRentMin && r <= s.idealRentMax) return 'ideal';
    if (d >= s.nextDepMin && d <= s.nextDepMax && r >= s.nextRentMin && r <= s.nextRentMax) return 'next';
    if (d > 0 && d < s.belowDepMax && r > 0 && r < s.belowRentMax) return 'below';
    if (d <= s.idealDepMax && r <= s.idealRentMax) return 'next'; // موارد مرزی
    
    return null;
  }

  function classifyTitle(title) {
    const t = normalize(title);
    if (CONFIG.hidePatterns.some(re => re.test(t))) return 'hide';
    const restricted = CONFIG.singleRestrictedPatterns.some(re => re.test(t));
    const allowed = CONFIG.singleAllowedPatterns.some(re => re.test(t));
    if (restricted && !allowed) return 'hide';
    
    if (CONFIG.suitePattern.test(t)) {
      const noFurn = CONFIG.notFurnishedPattern.test(t);
      const hasFurn = CONFIG.furnishedPattern.test(t);
      return hasFurn && !noFurn ? 'furnished' : 'plain';
    }
    return null;
  }

  function cardSnapshot() {
    return {
      blocked: new Set(getBlockedAds()),
      followups: readData(FOLLOW_KEY),
      notes: readData(NOTES_KEY),
      autoReveal: new Set(readData(AUTO_REVEAL_KEY, []))
    };
  }

  function processCard(card, state = cardSnapshot()) {
    const titleEl = card.querySelector(TITLE_SEL) || card.querySelector('h2');
    if (!titleEl) return;
    const titleText = titleEl.textContent;
    const link = card.querySelector('a.kt-post-card__action')?.getAttribute('href');
    const identity = JSON.stringify([titleText, link]);
    if (card.dataset.rdxProcessed) {
      if (card.dataset.rdxIdentity === identity) return;
      if (removedTitles.delete(card.dataset.rdxKey)) scheduleRemovedBoxUpdate();
      resetCard(card);
    }
    card.dataset.rdxProcessed = 'true';
    card.dataset.rdxIdentity = identity;
    const token = getTokenFromUrl(link);
    const col = card.closest('[class*="widget-col"]');
    const target = col && col.querySelectorAll(CARD_SEL).length === 1 ? col : card;

    const key = token || titleText;
    card.dataset.rdxKey = key;
    const record = { token, title: titleText, link: link || '', reason: '' };
    const hide = (reason) => {
      card.classList.add('rdx-hidden');
      if (target !== card) target.classList.add('rdx-hidden-col');
      removedTitles.set(key, { ...record, reason });
      scheduleRemovedBoxUpdate();
    };
    addCardTools(card, record, () => hide('manual'), state.notes);
    if (token && state.followups[token]) { hide('follow'); return; }
    if (token && state.blocked.has(token)) { hide('manual'); return; }

    const { deposit, rent } = parsePrices(card);

    // نمایش معادل اجاره کامل، رهن کامل و کمیسیون (فوتر)
    if (deposit !== null && rent !== null && !card.querySelector('.rdx-commission-badge')) {
      const data = calculateMortgageData(deposit, rent);
      if (data) {
        const badge = document.createElement('div');
        badge.className = 'rdx-commission-badge';
        badge.innerHTML = `اجاره کامل (رهن صفر): ${formatPrice(data.fullRent)} تومان<br>رهن کامل (اجاره صفر): ${formatPrice(data.fullMortgage)} تومان<br>کمیسیون: ${formatPrice(data.commission)} تومان`;
        card.appendChild(badge);
      }
    }

    // برچسب محله
    const region = getRegion(card);
    if (region && !card.querySelector('.rdx-region-tag')) {
      const badge = document.createElement('div');
      badge.className = 'rdx-region-tag';
      badge.textContent = region;
      (card.querySelector('.kt-post-card__body') || card).appendChild(badge);
    }

    const verdict = classifyTitle(titleText);
    if (verdict === 'hide' && !state.autoReveal.has(key)) {
      hide('auto');
      return;
    }

    let suiteKind = verdict === 'furnished' ? 'furnished' : (verdict === 'plain' ? 'plain' : null);
    const priceKind = classifyPrice(deposit, rent);

    if (suiteKind && priceKind) {
      card.setAttribute('data-rdx-striped', 'true');
      card.setAttribute('data-rdx-stripe-1', priceKind);
      card.setAttribute('data-rdx-stripe-2', suiteKind);
    } else if (suiteKind) {
      card.classList.add('rdx-' + suiteKind);
    } else if (priceKind) {
      card.classList.add('rdx-price-' + priceKind);
    }
  }

  // ═══════════════════════════════════════
  //  رابط کاربری
  // ═══════════════════════════════════════
  function scheduleRemovedBoxUpdate() {
    if (!removedBoxTimer) removedBoxTimer = setTimeout(updateRemovedBox, 50);
  }

  function updateRemovedBox() {
    clearTimeout(removedBoxTimer); removedBoxTimer = null;
    let box = document.getElementById('rdx-removed-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'rdx-removed-box';
      box.className = 'rdx-removed-box';
      document.body.appendChild(box);
    }
    const groups = [['manual', 'هاید دستی'], ['auto', 'هاید خودکار'], ['follow', 'منتقل‌شده به پیگیری ویژه']];
    const open = [...box.querySelectorAll('details[open]')].map(el => el.dataset.group);
    box.innerHTML = groups.map(([reason, label]) => {
      const entries = [...removedTitles.entries()].filter(([, item]) => item.reason === reason);
      return `<details data-group="${reason}" ${open.includes(reason) ? 'open' : ''}><summary>${label} (${entries.length.toLocaleString('fa-IR')})</summary>${entries.map(([key, item]) => `<div class="rdx-hidden-row"><span>${escapeHTML(item.title)}</span><button data-restore="${escapeHTML(key)}">بازگردانی</button></div>`).join('')}</details>`;
    }).join('');
    box.querySelectorAll('[data-restore]').forEach(btn => btn.onclick = () => {
      const key = btn.dataset.restore;
      const item = removedTitles.get(key);
      if (item.reason === 'auto') writeData(AUTO_REVEAL_KEY, [...new Set([...readData(AUTO_REVEAL_KEY, []), key])]);
      else if (item.reason === 'follow') {
        const followups = readData(FOLLOW_KEY); delete followups[key]; writeData(FOLLOW_KEY, followups);
      } else writeData(BLOCKED_KEY, getBlockedAds().filter(token => token !== key));
      refreshCards();
    });
  }

  function resetCard(card) {
    delete card.dataset.rdxProcessed;
    delete card.dataset.rdxIdentity;
    delete card.dataset.rdxKey;
    card.classList.remove('rdx-hidden', 'rdx-furnished', 'rdx-plain', 'rdx-price-ideal', 'rdx-price-next', 'rdx-price-below');
    const col = card.closest('[class*="widget-col"]');
    if (col && col.querySelectorAll(CARD_SEL).length === 1) col.classList.remove('rdx-hidden-col', 'rdx-hidden');
    ['data-rdx-striped','data-rdx-stripe-1','data-rdx-stripe-2'].forEach(name => card.removeAttribute(name));
    card.querySelectorAll('.rdx-card-tools, .rdx-note-preview, .rdx-commission-badge, .rdx-region-tag').forEach(node => node.remove());
  }

  function refreshCards() {
    removedTitles.clear();
    const state = cardSnapshot();
    document.querySelectorAll(CARD_SEL).forEach(card => {
      resetCard(card);
      processCard(card, state);
    });
    updateRemovedBox();
    if (document.getElementById('rdx-best-popup')) renderPopup(collectBest());
  }

  function addCardTools(card, record, hideManual, notes) {
    if (card.querySelector('.rdx-card-tools') || !record.token) return;
    const tools = document.createElement('div');
    tools.className = 'rdx-card-tools';
    const add = (label, action) => {
      const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = label;
      btn.onclick = event => { event.preventDefault(); event.stopPropagation(); action(); };
      tools.appendChild(btn);
    };
    add('🚫 هاید', () => { blockAd(record.token); hideManual(); });
    add('📝 یادداشت', () => editNote(record));
    add('⭐ پیگیری و هاید', () => {
      const records = readData(FOLLOW_KEY);
      records[record.token] = { ...record, savedAt: new Date().toISOString() };
      writeData(FOLLOW_KEY, records); refreshCards();
    });
    card.prepend(tools);
    const note = notes[record.token];
    if (note) {
      const preview = document.createElement('div'); preview.className = 'rdx-note-preview';
      preview.textContent = '📝 ' + note; card.appendChild(preview);
    }
  }

  function makePanel(title) {
    document.getElementById('rdx-manager')?.remove();
    const panel = document.createElement('section'); panel.id = 'rdx-manager'; panel.className = 'rdx-manager';
    const head = document.createElement('header');
    const label = document.createElement('strong'); label.textContent = title;
    const close = document.createElement('button'); close.textContent = 'بستن'; close.onclick = () => panel.remove();
    head.append(label, close); panel.appendChild(head); document.body.appendChild(panel); return panel;
  }

  function editNote(record) {
    const panel = makePanel('یادداشت: ' + record.title);
    const input = document.createElement('textarea'); input.rows = 5; input.maxLength = 5000;
    input.placeholder = 'یادداشت شما درباره این آگهی…'; input.value = readData(NOTES_KEY)[record.token] || '';
    const save = document.createElement('button'); save.textContent = 'ذخیره یادداشت';
    save.onclick = () => {
      const notes = readData(NOTES_KEY);
      if (input.value.trim()) notes[record.token] = input.value.trim(); else delete notes[record.token];
      writeData(NOTES_KEY, notes); panel.remove(); refreshCards();
    };
    panel.append(input, save); input.focus();
  }

  function showFollowups() {
    const panel = makePanel('پیگیری ویژه');
    const records = Object.values(readData(FOLLOW_KEY)).sort((a,b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
    if (!records.length) { const empty = document.createElement('p'); empty.textContent = 'هنوز آگهی‌ای برای پیگیری ذخیره نشده است.'; panel.appendChild(empty); }
    records.forEach(record => {
      const row = document.createElement('div'); row.className = 'rdx-follow-row';
      const a = document.createElement('a'); a.href = 'https://divar.ir/v/' + encodeURIComponent(record.token);
      a.textContent = record.title; a.target = '_blank'; a.rel = 'noopener noreferrer';
      const note = document.createElement('p'); note.textContent = readData(NOTES_KEY)[record.token] || 'بدون یادداشت';
      const edit = document.createElement('button'); edit.textContent = 'یادداشت'; edit.onclick = () => editNote(record);
      const restore = document.createElement('button'); restore.textContent = 'خروج از پیگیری و بازگردانی';
      restore.onclick = () => {
        const records = readData(FOLLOW_KEY); delete records[record.token]; writeData(FOLLOW_KEY, records);
        writeData(BLOCKED_KEY, getBlockedAds().filter(token => token !== record.token));
        const key = record.token;
        writeData(AUTO_REVEAL_KEY, [...new Set([...readData(AUTO_REVEAL_KEY, []), key])]);
        refreshCards(); showFollowups();
      };
      row.append(a, note, edit, restore); panel.appendChild(row);
    });
  }

  function showDataTools() {
    const panel = makePanel('پاک‌سازی و ریست');
    const text = document.createElement('p');
    text.textContent = 'این ابزار فقط داده‌های همین اکستنشن را پاک می‌کند. کش و کوکی‌های دیوار و ورود حساب شما تغییری نمی‌کند.';
    panel.appendChild(text);
    const actions = [
      ['بازسازی نمایش / پاک‌کردن وضعیت موقت', () => { document.getElementById('rdx-best-popup')?.remove(); refreshCards(); }],
      ['پاک‌کردن هایدهای دستی', () => { localStorage.removeItem(BLOCKED_KEY); refreshCards(); }],
      ['ریست استثناهای هاید خودکار', () => { localStorage.removeItem(AUTO_REVEAL_KEY); refreshCards(); }],
      ['بازنشانی تنظیمات قیمت', () => { localStorage.removeItem(SETTINGS_KEY); currentSettings = {...DEFAULT_SETTINGS}; refreshCards(); }],
      ['حذف همه یادداشت‌ها', () => { localStorage.removeItem(NOTES_KEY); refreshCards(); }],
      ['خالی‌کردن پیگیری ویژه', () => { localStorage.removeItem(FOLLOW_KEY); refreshCards(); }],
      ['ریست کامل داده‌های اکستنشن', () => {
        window.dispatchEvent(new Event('rdx-reset-chat')); 
        [BLOCKED_KEY, SETTINGS_KEY, NOTES_KEY, FOLLOW_KEY, AUTO_REVEAL_KEY].forEach(key => localStorage.removeItem(key));
        currentSettings = {...DEFAULT_SETTINGS}; refreshCards();
      }]
    ];
    actions.forEach(([label, run], index) => {
      const btn = document.createElement('button'); btn.textContent = label;
      btn.onclick = () => { if (index && !confirm(label + '؟ این عملیات قابل برگشت نیست.')) return; run(); panel.remove(); };
      panel.appendChild(btn);
    });
  }

  function showToolbar() {
    if (document.getElementById('rdx-toolbar')) return;
    const bar = document.createElement('div'); bar.id = 'rdx-toolbar'; bar.className = 'rdx-toolbar';
    [['⭐ بهترین گزینه‌ها', () => renderPopup(collectBest())], ['📌 پیگیری ویژه', showFollowups], ['↻ پاک‌سازی / ریست', showDataTools]].forEach(([label, action]) => {
      const btn = document.createElement('button'); btn.textContent = label; btn.onclick = action; bar.appendChild(btn);
    }); document.body.appendChild(bar);
  }

  function showSettingsGear() {
    if (document.getElementById('rdx-gear')) return;
    const gear = document.createElement('div');
    gear.id = 'rdx-gear';
    gear.className = 'rdx-gear';
    gear.innerHTML = '⚙️';
    gear.onclick = () => {
      const panel = document.getElementById('rdx-settings-panel');
      if (panel) { panel.remove(); return; }
      
      const p = document.createElement('div');
      p.id = 'rdx-settings-panel';
      p.className = 'rdx-settings-panel';
      p.innerHTML = `
        <div class="rdx-settings-title">تنظیمات قیمت (میلیون تومان)</div>
        <div class="rdx-settings-row">
          <label>ایده‌آل (ودیعه):</label>
          <input type="number" id="s-idealDepMin" value="${currentSettings.idealDepMin}"> تا
          <input type="number" id="s-idealDepMax" value="${currentSettings.idealDepMax}">
        </div>
        <div class="rdx-settings-row">
          <label>ایده‌آل (اجاره):</label>
          <input type="number" id="s-idealRentMin" value="${currentSettings.idealRentMin}"> تا
          <input type="number" id="s-idealRentMax" value="${currentSettings.idealRentMax}">
        </div>
        <hr style="border:0; border-top:1px solid #eee; margin:8px 0;">
        <div class="rdx-settings-row">
          <label>رنج بالا (ودیعه):</label>
          <input type="number" id="s-nextDepMin" value="${currentSettings.nextDepMin}"> تا
          <input type="number" id="s-nextDepMax" value="${currentSettings.nextDepMax}">
        </div>
        <div class="rdx-settings-row">
          <label>رنج بالا (اجاره):</label>
          <input type="number" id="s-nextRentMin" value="${currentSettings.nextRentMin}"> تا
          <input type="number" id="s-nextRentMax" value="${currentSettings.nextRentMax}">
        </div>
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button id="rdx-save-settings" style="background:#10b981; color:white; flex:1;">ذخیره و اعمال</button>
          <button id="rdx-clear-blocks" style="background:#ef4444; color:white; flex:1;">پاک کردن بلاک‌ها</button>
        </div>
      `;
      document.body.appendChild(p);
      addPriceAxes(p);

      document.getElementById('rdx-save-settings').onclick = () => {
        const updated = {...currentSettings};
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
          const input = document.getElementById('s-' + key);
          if (!input) continue;
          const value = input.value.trim() === '' ? NaN : Number(input.value);
          if (!Number.isFinite(value) || value < 0) { alert('قیمت باید عددی نامنفی باشد.'); return; }
          updated[key] = value;
        }
        for (const prefix of ['idealDep', 'idealRent', 'nextDep', 'nextRent']) {
          if (updated[prefix + 'Min'] > updated[prefix + 'Max']) { alert('ابتدای بازه نباید از انتهای آن بزرگ‌تر باشد.'); return; }
        }
        currentSettings = updated;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
        p.remove();
        refreshCards();
      };

      document.getElementById('rdx-clear-blocks').onclick = () => {
        localStorage.removeItem(BLOCKED_KEY);
        p.remove();
        refreshCards();
      };
    };
    document.body.appendChild(gear);
  }

  function showLegendUI() {
    if (document.getElementById('rdx-legend') || !location.pathname.startsWith('/s/')) return;
    const legend = document.createElement('div');
    legend.id = 'rdx-legend';
    legend.className = 'rdx-legend';
    legend.style.display = showLegend ? 'block' : 'none';
    legend.innerHTML = `
      <div class="rdx-legend-title">راهنمای رنگ‌ها</div>
      <div class="rdx-legend-item"><span class="rdx-legend-color bg-ideal"></span> ایده‌آل</div>
      <div class="rdx-legend-item"><span class="rdx-legend-color bg-next"></span> رنج بالاتر</div>
      <div class="rdx-legend-item"><span class="rdx-legend-color bg-below"></span> زیر بازه</div>
      <div class="rdx-legend-item"><span class="rdx-legend-color bg-furnished"></span> سوییت مبله</div>
      <div class="rdx-legend-item"><span class="rdx-legend-color bg-unfurnished"></span> سوییت ساده</div>
    `;
    document.body.appendChild(legend);
  }

  // ═══════════════════════════════════════
  //  پاپ‌آپ و PDP
  // ═══════════════════════════════════════
  function collectBest() {
    const best = [];
    document.querySelectorAll(CARD_SEL).forEach(card => {
      if (card.closest('.rdx-hidden, .rdx-hidden-col')) return;
      const isIdeal = card.classList.contains('rdx-price-ideal') || card.getAttribute('data-rdx-stripe-1') === 'ideal';
      const isNext = card.classList.contains('rdx-price-next') || card.getAttribute('data-rdx-stripe-1') === 'next';
      const isFurnished = card.classList.contains('rdx-furnished') || card.getAttribute('data-rdx-stripe-2') === 'furnished';
      
      if (isIdeal || isNext || isFurnished) {
        best.push({ card, isIdeal, isNext, isFurnished });
      }
    });
    return best;
  }

  function renderPopup(best) {
    document.getElementById('rdx-best-popup')?.remove();
    const grouped = { 'شمال': [], 'غرب': [], 'شرق': [], 'مرکز': [], 'سایر': [] };
    best.forEach(item => {
      const region = item.card.querySelector('.rdx-region-tag')?.textContent || 'سایر';
      if (grouped[region]) grouped[region].push(item);
      else grouped['سایر'].push(item);
    });

    let html = '';
    for (const [region, items] of Object.entries(grouped)) {
      if (items.length === 0) continue;
      html += `<div class="rdx-popup-group-title">📍 ${region}</div>`;
      items.sort((a, b) => ((b.isIdeal?3:0)+(b.isNext?2:0)+(b.isFurnished?1:0)) - ((a.isIdeal?3:0)+(a.isNext?2:0)+(a.isFurnished?1:0)));
      html += items.map(({ card, isIdeal, isNext, isFurnished }) => {
        const title = escapeHTML(card.querySelector(TITLE_SEL)?.textContent || '');
        const priceText = escapeHTML(Array.from(card.querySelectorAll('.kt-post-card__description')).map(d => d.textContent).join(' • '));
        const link = escapeHTML(card.querySelector('a.kt-post-card__action')?.getAttribute('href') || '#');
        const img = escapeHTML(card.querySelector('img')?.getAttribute('src') || '');
        
        let badges = '';
        if (isIdeal) badges += '<span class="rdx-badge rdx-badge-ideal">⭐ ایده‌آل</span>';
        if (isNext) badges += '<span class="rdx-badge rdx-badge-next">🔵 رنج بالا</span>';
        if (isFurnished) badges += '<span class="rdx-badge rdx-badge-furnished">🛋️ مبله</span>';
        
        return `<a class="rdx-best-item" href="${link}">${img ? `<img src="${img}" alt="">` : '<div class="rdx-best-thumb"></div>'}<div class="rdx-best-info"><div class="rdx-best-title">${title}</div><div class="rdx-best-price">${priceText}</div><div class="rdx-best-badges">${badges}</div></div></a>`;
      }).join('');
    }

    const popup = document.createElement('div');
    popup.id = 'rdx-best-popup';
    popup.className = 'rdx-best-popup';
    popup.innerHTML = `<div class="rdx-best-header"><span>⭐ ${best.length} آگهی برتر</span><button class="rdx-best-close">✕</button></div><div class="rdx-best-body">${html || '<p>در آگهی‌های بارگذاری‌شده، گزینه‌ای مطابق معیارها پیدا نشد.</p>'}</div>`;
    document.body.appendChild(popup);
    popup.querySelector('.rdx-best-close').onclick = () => popup.remove();
  }

  let warnedPdp = '';
  function checkPdp() {
    if (!location.pathname.startsWith('/v/')) {
      document.getElementById('rdx-pdp-overlay')?.remove();
      document.getElementById('rdx-pdp-block-btn')?.remove();
      return;
    }
    const token = getTokenFromUrl(location.pathname);
    if (!document.getElementById('rdx-pdp-block-btn')) {
      const blockBtn = document.createElement('button');
      blockBtn.id = 'rdx-pdp-block-btn';
      blockBtn.className = 'rdx-pdp-block-btn';
      blockBtn.innerHTML = '🚫 بلاک کردن این آگهی';
      blockBtn.onclick = () => {
        blockAd(token);
        blockBtn.innerHTML = '✅ بلاک شد! در حال بازگشت...';
        blockBtn.style.background = '#16a34a';
        setTimeout(() => history.back(), 1000);
      };
      document.body.appendChild(blockBtn);
    }

    const headings = Array.from(document.querySelectorAll('h2.kt-title-row__title'));
    const descHeading = headings.find((h) => normalize(h.textContent).includes('توضیحات'));
    let section = descHeading ? descHeading.closest('section') : null;
    if (!section) {
      const sections = Array.from(document.querySelectorAll('section.post-page__section--padded'));
      section = sections.reverse().find((s) => s.querySelector('p.kt-description-row__text--primary')) || null;
    }
    const text = section?.querySelector('p.kt-description-row__text--primary')?.textContent || '';
    if (!text || text.length < 10) return;
    
    const t = normalize(text);
    const issues = [];
    const noParking = PDP_CONFIG.noParkingPatterns.some(re => re.test(t));
    const hasMotor = PDP_CONFIG.parkingExemptionPatterns.some(re => re.test(t));
    const noMotor = PDP_CONFIG.parkingExemptionNegativePatterns.some(re => re.test(t));
    if (noParking && (!hasMotor || noMotor)) issues.push('پارکینگ ندارد');
    if (PDP_CONFIG.undergroundPatterns.some(re => re.test(t))) issues.push('طبقه زیر همکف / منفی');
    const singleBlocked = PDP_CONFIG.singleRestrictedPatterns.some(re => re.test(t));
    const singleAllowed = PDP_CONFIG.singleAllowedPatterns.some(re => re.test(t));
    if (singleBlocked && !singleAllowed) issues.push('محدودیت جنسیت / مجرد');

    if (issues.length > 0 && warnedPdp !== location.pathname && !document.getElementById('rdx-pdp-overlay')) {
      warnedPdp = location.pathname;
      const overlay = document.createElement('div');
      overlay.id = 'rdx-pdp-overlay';
      overlay.className = 'rdx-pdp-overlay';
      overlay.innerHTML = `<div class="rdx-pdp-modal"><div class="rdx-pdp-header"><span class="rdx-pdp-icon">⚠️</span><h2>این آگهی مناسب نیست</h2></div><div class="rdx-pdp-body"><ul>${issues.map(i => `<li>${i}</li>`).join('')}</ul></div><div class="rdx-pdp-footer"><button class="rdx-pdp-close">متوجه شدم</button></div></div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('.rdx-pdp-close').onclick = () => overlay.remove();
    }
  }

  // ═══════════════════════════════════════
  //  راه‌اندازی و SPA Tracker
  // ═══════════════════════════════════════
  function addPriceAxes(panel) {
    panel.querySelectorAll('.rdx-settings-row').forEach(row => {
      const inputs = [...row.querySelectorAll('input[type="number"]')];
      if (inputs.length !== 2) return;
      const axis = document.createElement('div'); axis.className = 'rdx-price-axis';
      const isDeposit = inputs[0].id.includes('Dep');
      const max = Math.max(isDeposit ? 2000 : 100, ...inputs.map(input => Number(input.value) * 2));
      inputs.forEach((input, index) => {
        input.min = '0'; input.step = '1';
        const range = document.createElement('input'); range.type = 'range'; range.min = '0'; range.max = String(max); range.step = '1'; range.value = input.value;
        range.setAttribute('aria-label', row.querySelector('label').textContent + (index ? ' انتهای بازه' : ' ابتدای بازه'));
        const output = document.createElement('output');
        const syncOutput = () => { output.textContent = (index ? 'تا ' : 'از ') + Number(range.value).toLocaleString('fa-IR'); };
        range.oninput = () => {
          input.value = range.value;
          const other = inputs[1-index];
          if ((index === 0 && Number(input.value) > Number(other.value)) || (index === 1 && Number(input.value) < Number(other.value))) {
            other.value = input.value; other.dispatchEvent(new Event('input'));
          }
          syncOutput();
        };
        input.addEventListener('input', () => { range.max = String(Math.max(max, Number(input.value))); range.value = input.value; syncOutput(); });
        syncOutput(); axis.append(output, range);
      }); row.appendChild(axis);
    });
  }

  function showChatSuggestions() {
    const input = document.querySelector('textarea#chat-input');
    if (!input) { document.getElementById('rdx-chat-suggestions')?.remove(); return; }
    const host = input.closest('.kt-chat-input')?.parentElement;
    if (!host) return;
    const adTitle = normalize(document.querySelector('.kt-post-preview-bar__title')?.textContent || '');
    const isHousing = /رهن|اجاره|ودیعه|آپارتمان|سوئیت|سوییت|خانه|اتاق|ملک|مسکونی|[0-9۰-۹]+\s*متر(?:\s*\/\s*[0-9۰-۹]+\s*خ|.*خواب)/.test(adTitle);
    const chatId = location.pathname.match(/^\/chat\/([^/]+)/)?.[1] || document.querySelector('[conversationid]')?.getAttribute('conversationid') || '';
    const key = JSON.stringify([chatId, adTitle, isHousing]);
    let bar = document.getElementById('rdx-chat-suggestions');
    if (!bar) { bar = document.createElement('div'); bar.id = 'rdx-chat-suggestions'; bar.className = 'rdx-chat-suggestions'; }
    if (bar.dataset.contextKey === key && bar.nextElementSibling === host) return;
    bar.dataset.contextKey = key;
    bar.replaceChildren();
    const title = document.createElement('span'); title.className = 'rdx-chat-suggestions-title';
    title.textContent = 'پیشنهادهای پیام';
    const hint = document.createElement('small'); hint.textContent = 'برای درج در کادر و ویرایش پیش از ارسال';
    title.appendChild(hint); bar.appendChild(title);
    const list = document.createElement('div'); list.className = 'rdx-chat-suggestions-list'; bar.appendChild(list);
    const suggestions = isHousing ? [
      'سلام، وقت بخیر. آگهی هنوز موجود است؟', 'سلام، برای مجرد موجه امکان اجاره دارد؟',
      'سلام، جای پارک امن برای موتور دارد؟', 'ودیعه و اجاره قابل تبدیل است؟',
      'چه ساعتی برای بازدید مناسب است؟', 'واحد در کدام طبقه است؟ آسانسور دارد؟',
      'واحد چه زمانی آماده تحویل است؟', 'امکان ارسال عکس‌های بیشتر از واحد هست؟'
    ] : [
      'سلام، وقت بخیر. هنوز موجود است؟', 'قیمت نهایی چقدر است؟',
      'امکان بازدید هست؟', 'چه زمانی می‌توانم بیایم؟',
      'قابل مذاکره است؟', 'چه مدت استفاده شده است؟', 'امکان ارسال عکس‌های بیشتر هست؟'
    ];
    const addSuggestion = (label, message, featured = false) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      if (featured) {
        button.className = 'rdx-chat-suggestion-featured';
        button.title = message;
        button.setAttribute('aria-label', 'درج شرایط کلی من در کادر پیام');
      }
      button.onclick = () => {
        const current = document.querySelector('textarea#chat-input'); if (!current || current.disabled || current.readOnly) return;
        const value = current.value.trim() ? current.value + '\n' + message : message;
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(current, value);
        current.dispatchEvent(new Event('input', {bubbles:true})); current.focus();
      }; list.appendChild(button);
    };
    if (isHousing) {
      addSuggestion('✦ شرایط کلی من',
        'سلام، وقت بخیر. دنبال خانه‌ای هستم که مبلغ رهن کامل آن کمتر از ۱ میلیارد تومان باشد. می‌توانم حدود ۲۰۰ تا ۳۰۰ میلیون تومان ودیعه بدهم و باقی مبلغ را به اجاره ماهانه تبدیل کنم. فاصله تا میدان آرژانتین حداکثر ۳۰ دقیقه باشد. جای پارک موتور برایم لازم است و ساختمان از نظر ظاهر و وضعیت کلی آبرومند باشد. داشتن سرویس فرنگی، شوفاژ و گاز هم عالی است؛ موارد دیگر برایم اولویت زیادی ندارند. اگر مورد مناسبی دارید، لطفاً شرایط ودیعه و اجاره را بفرمایید.', true);
    }
    suggestions.forEach(text => addSuggestion(text, text));
    host.before(bar);
  }

  function initPage() {
    loadSettings();
    if (/^\/chat(?:\/|$)/.test(location.pathname)) showChatSuggestions();
    if (location.pathname.startsWith('/s/')) {
      showSettingsGear();
      showToolbar();
      updateRemovedBox();
      showLegendUI();
      const state = cardSnapshot();
      document.querySelectorAll(CARD_SEL).forEach(card => processCard(card, state));
      // بهترین گزینه‌ها از دکمه ابزار به‌صورت دستی باز می‌شود.
    } else if (location.pathname.startsWith('/v/')) {
      checkPdp();
    }
  }

  const pendingCards = new Set();
  let pendingChat = false, pendingPdp = false, timeout;
  const ownCardNode = node => node.nodeType === 1 && node.matches('.rdx-card-tools, .rdx-note-preview, .rdx-commission-badge, .rdx-region-tag');
  const includesSelector = (node, selector) => node.nodeType === 1 && (node.matches(selector) || Boolean(node.querySelector(selector)));
  const affects = (mutation, selector) => {
    const target = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
    if (target?.closest(selector)) return true;
    return [...mutation.addedNodes].some(node => includesSelector(node, selector));
  };
  const observer = new MutationObserver(mutations => {
    const path = location.pathname;
    if (path.startsWith('/s/')) {
      for (const mutation of mutations) {
        const target = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
        if (target?.closest('.rdx-card-tools, .rdx-note-preview, .rdx-commission-badge, .rdx-region-tag')) continue;
        const card = target?.closest(CARD_SEL);
        for (const node of mutation.addedNodes) {
          if (ownCardNode(node)) continue;
          if (card) pendingCards.add(card);
          if (node.nodeType !== 1) continue;
          if (node.matches(CARD_SEL)) pendingCards.add(node);
          else node.querySelectorAll(CARD_SEL).forEach(item => pendingCards.add(item));
        }
      }
    } else if (/^\/chat(?:\/|$)/.test(path)) {
      pendingChat ||= mutations.some(m => affects(m, 'textarea#chat-input, .kt-post-preview-bar__title'));
    } else if (path.startsWith('/v/')) {
      pendingPdp ||= mutations.some(m => affects(m, 'h2.kt-title-row__title, section.post-page__section--padded'));
    }
    if (!pendingCards.size && !pendingChat && !pendingPdp || timeout) return;
    timeout = setTimeout(() => {
      timeout = null;
      const cards = [...pendingCards]; pendingCards.clear();
      const chat = pendingChat, pdp = pendingPdp;
      pendingChat = pendingPdp = false;
      if (location.pathname.startsWith('/s/') && cards.length) {
        const state = cardSnapshot();
        cards.forEach(card => { if (card.isConnected) processCard(card, state); });
      } else if (/^\/chat(?:\/|$)/.test(location.pathname) && chat) showChatSuggestions();
      else if (location.pathname.startsWith('/v/') && pdp) checkPdp();
    }, 80);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // پشتیبانی از تغییر صفحات در SPA دیوار
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      clearTimeout(timeout); timeout = null;
      pendingCards.clear(); pendingChat = pendingPdp = false;
      ['rdx-toolbar', 'rdx-manager', 'rdx-chat-suggestions'].forEach(id => document.getElementById(id)?.remove());
      document.getElementById('rdx-gear')?.remove();
      document.getElementById('rdx-legend')?.remove();
      document.getElementById('rdx-removed-box')?.remove();
      document.getElementById('rdx-best-popup')?.remove();
      document.getElementById('rdx-pdp-block-btn')?.remove();
      document.getElementById('rdx-pdp-overlay')?.remove();
      document.getElementById('rdx-settings-panel')?.remove();
      warnedPdp = '';
      removedTitles.clear();
      initPage();
    }
  }, 500);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPage, {once: true});
  else initPage();
})();
