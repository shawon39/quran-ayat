/** প্রতিটি পাতার HTML এখানেই তৈরি হয়। কোনো ফ্রেমওয়ার্ক নেই — শুধু স্ট্রিং ও DOM। */

import { bn, esc, inline, stripMarks, refText, ayahHref } from './util.js';
import { favourites } from './store.js';
import { search, excerpt, highlight } from './search.js';
import { RECITER, recitation } from './audio.js';

const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z"/></svg>';

const ICON = {
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2z"/><path d="M8 3v18"/></svg>',
  play: '<svg class="icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5l11 6.5-11 6.5z"/></svg>',
  pause: '<svg class="icon-pause" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.4" y="5" width="3.6" height="14" rx="1.2"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11V9a4 4 0 014-4h9"/><path d="M14 2.5L17.5 5 14 7.5"/><path d="M20 13v2a4 4 0 01-4 4H7"/><path d="M10 21.5L6.5 19 10 16.5"/></svg>',
};

/** তারকা বোতাম। data-fav-এ আয়াতের আইডি থাকে; ক্লিক ধরা হয় app.js-এ। */
function starButton(v) {
  const on = favourites.has(v.id);
  return `<button class="star-btn" type="button" data-fav="${esc(v.id)}"
    aria-pressed="${on}" title="${on ? 'প্রিয় তালিকা থেকে সরান' : 'প্রিয় তালিকায় রাখুন'}"
    aria-label="${on ? 'প্রিয় তালিকা থেকে সরান' : 'প্রিয় তালিকায় রাখুন'}">${STAR}</button>`;
}

/**
 * তিলাওয়াতের বার। শুরুতে সবসময় থেমে থাকা অবস্থায় আঁকা হয় —
 * বাজতে থাকলে app.js এর paintRecitation() লেখা ও অবস্থা হালনাগাদ করে।
 */
function recitationBar(v) {
  const to = v.ayahEnd && v.ayahEnd > v.ayah ? v.ayahEnd : v.ayah;
  const count = to - v.ayah + 1;
  const idle = count > 1
    ? `${bn(count)}টি আয়াত একটানা`
    : `আয়াত ${bn(v.ayah)} · ${RECITER.style}`;
  const on = recitation.isRepeat();

  return `
  <div class="recitation" data-recite="${v.surah}:${v.ayah}:${to}" data-status="idle"
       data-recite-idle="${esc(idle)}">
    <button class="recite-play" type="button" data-recite-toggle
            aria-pressed="false" aria-label="তিলাওয়াত শুনুন" title="তিলাওয়াত শুনুন">
      ${ICON.play}${ICON.pause}
    </button>
    <div class="recite-body">
      <span class="recite-label">তিলাওয়াত — ক্বারী ${esc(RECITER.bn)}</span>
      <div class="recite-track"><span class="recite-fill" data-recite-fill></span></div>
      <div class="recite-status">
        <span class="recite-note" data-recite-note aria-live="polite">${esc(idle)}</span>
        <span class="recite-time" data-recite-time></span>
      </div>
    </div>
    <button class="recite-repeat" type="button" data-recite-repeat aria-pressed="${on}"
            aria-label="বারবার বাজান" title="বারবার বাজান">${ICON.repeat}</button>
  </div>`;
}

/** তালিকায় দেখানো একটি আয়াতের কার্ড। */
function verseCard(v, { query = '', showArabic = true } = {}) {
  const snippet = query
    ? highlight(esc(stripMarks(excerpt(v, query))), query)
    : inline(v.summary ?? '');
  const heading = v.title
    ? (query ? highlight(esc(v.title), query) : esc(v.title))
    : `${esc(v.surahInfo?.bn ?? '')} — আয়াত ${bn(v.ayah)}`;

  return `
  <li class="verse-card">
    <div class="verse-card-head">
      <span class="ref">${esc(refText(v))}</span>
      <h3><a class="verse-link" href="${ayahHref(v)}">${heading}</a></h3>
      ${starButton(v)}
    </div>
    ${showArabic && v.arabic ? `<p class="arabic-peek" dir="rtl" lang="ar">${esc(v.arabic)}</p>` : ''}
    <p class="snippet">${snippet}</p>
  </li>`;
}

function verseList(list, opts) {
  return `<ul class="verse-list">${list.map((v) => verseCard(v, opts)).join('')}</ul>`;
}

function empty(title, body, action = '') {
  return `<div class="empty"><span class="mark" aria-hidden="true">۞</span>
    <h2>${esc(title)}</h2><p>${esc(body)}</p>${action}</div>`;
}

/**
 * সূরা তালিকায় “যেখানে আয়াত আছে” ছাঁকনির ঠিকানা — `#/surah/সংরক্ষিত`।
 * ঠিকানায় বাংলা শব্দ রাখা হলো, কারণ `#/bishoy/তাওহীদ`-ও একই রকম।
 */
export const SURAH_SAVED = 'সংরক্ষিত';

/* ─────────────────────────── হোম ─────────────────────────── */

export function home(db) {
  const recent = [...db.verses].sort((a, b) => (b.addedOn ?? '').localeCompare(a.addedOn ?? '')).slice(0, 6);
  const surahsCovered = db.bySurah.size;

  return `
  <section class="hero">
    <p class="bismillah" dir="rtl" lang="ar">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
    <h1>কুরআনের আলো, বাংলায়</h1>
    <p>গুরুত্বপূর্ণ আয়াতগুলোর নির্ভরযোগ্য অর্থ, শব্দে শব্দে বিশ্লেষণ আর বিস্তারিত ব্যাখ্যা —
       একাধিক প্রামাণ্য তাফসীর মিলিয়ে যাচাই করা, সূত্রসহ।</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="#/surah">সূরা থেকে খুঁজুন</a>
      <a class="btn" href="#/priyo">প্রিয় আয়াত</a>
    </div>
  </section>

  <div class="stats">
    <a class="stat" href="#/ayat"><b>${bn(db.verses.length)}</b><span>সংরক্ষিত আয়াত</span></a>
    <a class="stat" href="#/surah/${encodeURIComponent(SURAH_SAVED)}"><b>${bn(surahsCovered)}</b><span>সূরা ছোঁয়া হয়েছে</span></a>
    <a class="stat" href="#/bishoy"><b>${bn(db.tags.length)}</b><span>বিষয়</span></a>
    <a class="stat" href="#/priyo"><b>${bn(favourites.count())}</b><span>আপনার প্রিয়</span></a>
  </div>

  ${db.tags.length ? `
  <div class="section-head"><h2>বিষয় ধরে</h2>
    ${db.tags.length > 14 ? '<a href="#/bishoy">সব বিষয় দেখুন</a>' : ''}
  </div>
  <div class="toolbar">
    ${db.tags.slice(0, 14).map(([t, n]) =>
      `<a class="chip" href="#/bishoy/${encodeURIComponent(t)}">${esc(t)} <span class="muted">${bn(n)}</span></a>`).join('')}
  </div>` : ''}

  <div class="section-head">
    <h2>সাম্প্রতিক সংযোজন</h2>
    ${db.verses.length > 6 ? '<a href="#/surah">সব সূরা দেখুন</a>' : ''}
  </div>
  ${recent.length
    ? verseList(recent)
    : empty('এখনো কোনো আয়াত যোগ করা হয়নি', 'প্রথম আয়াতটি যোগ হলে এখানে দেখা যাবে।')}
  `;
}

/* ─────────────────────────── সব আয়াত এক জায়গায় ─────────────────────────── */

export function allVersesPage(db) {
  const list = [...db.verses].sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);

  return `
  <nav class="breadcrumb"><a href="#/">হোম</a><span>›</span>সংরক্ষিত আয়াত</nav>

  <div class="page-head">
    <span class="eyebrow">পুরো সংগ্রহ</span>
    <h1>সংরক্ষিত আয়াত</h1>
    <p class="lede">এখন পর্যন্ত ${bn(list.length)}টি আয়াত যোগ করা হয়েছে, ${bn(db.bySurah.size)}টি সূরা থেকে।
       নিচে কুরআনের ক্রম অনুসারে সবগুলো একসাথে দেওয়া হলো।</p>
  </div>

  ${list.length
    ? verseList(list)
    : empty('এখনো কোনো আয়াত যোগ করা হয়নি', 'প্রথম আয়াতটি যোগ হলে এখানে দেখা যাবে।')}
  `;
}

/* ─────────────────────────── সব বিষয় ─────────────────────────── */

export function allTagsPage(db) {
  return `
  <nav class="breadcrumb"><a href="#/">হোম</a><span>›</span>বিষয়</nav>

  <div class="page-head">
    <span class="eyebrow">সূচি</span>
    <h1>সব বিষয়</h1>
    <p class="lede">আয়াতগুলো ${bn(db.tags.length)}টি বিষয়ে ভাগ করা আছে; পাশের সংখ্যা বলছে ওই বিষয়ে
       কতটি আয়াত রয়েছে। যেকোনো বিষয়ে চাপ দিলে সেগুলো একসাথে দেখা যাবে।</p>
  </div>

  ${db.tags.length ? `<div class="toolbar">
    ${db.tags.map(([t, n]) => `<a class="chip" href="#/bishoy/${encodeURIComponent(t)}">
      ${esc(t)} <span class="muted">${bn(n)}</span></a>`).join('')}
  </div>` : empty('এখনো কোনো বিষয় নেই', 'আয়াত যোগ হলে তার বিষয়গুলো এখানে জমা হবে।')}
  `;
}

/* ─────────────────────────── সূরা তালিকা ─────────────────────────── */

export function surahList(db, { filter = '', only = 'all' } = {}) {
  const f = filter.trim().toLowerCase();
  const items = db.surahs.filter((s) => {
    if (only === 'saved' && !db.bySurah.has(s.number)) return false;
    if (!f) return true;
    return [s.bn, s.translit, s.meaningBn, String(s.number), ...(s.aliases ?? [])]
      .join(' ').toLowerCase().includes(f);
  });

  const saved = only === 'saved';

  return `
  <div class="page-head">
    <span class="eyebrow">সূচিপত্র</span>
    <h1>${saved ? 'যেসব সূরায় আয়াত আছে' : '১১৪টি সূরা'}</h1>
    <p class="lede">${saved
      ? `${bn(db.bySurah.size)}টি সূরা থেকে আয়াত সংগ্রহে যোগ করা হয়েছে; পাশের সংখ্যা বলছে কোনটিতে কতটি।
         পুরো তালিকা দেখতে নিচের “সব সূরা”-তে চাপ দিন।`
      : `যে সূরায় আয়াত সংরক্ষিত আছে সেগুলোর পাশে সংখ্যা দেখানো হয়েছে।
         যেকোনো সূরায় ঢুকে নির্দিষ্ট আয়াত নম্বরেও যেতে পারবেন।`}</p>
  </div>

  <div class="toolbar">
    <input class="filter-input" id="surah-filter" type="search" placeholder="সূরার নাম বা নম্বর"
           value="${esc(filter)}" aria-label="সূরা ছেঁকে নিন">
    <button class="chip ${only === 'all' ? 'active' : ''}" type="button" data-only="all">সব সূরা</button>
    <button class="chip ${only === 'saved' ? 'active' : ''}" type="button" data-only="saved">যেখানে আয়াত আছে</button>
  </div>

  ${items.length ? `<ul class="surah-grid">${items.map((s) => {
    const n = db.bySurah.get(s.number)?.length ?? 0;
    return `<a class="surah-item ${n ? 'has-verses' : ''}" href="#/surah/${s.number}">
      <span class="surah-num">${bn(s.number)}</span>
      <span class="surah-body">
        <span class="surah-name">${esc(s.bn)}</span>
        <span class="surah-meta">${esc(s.meaningBn)} · ${esc(s.revelation)} · ${bn(s.ayahCount)} আয়াত</span>
      </span>
      ${n ? `<span class="count-pill">${bn(n)}</span>` : ''}
      <span class="surah-arabic" dir="rtl" lang="ar">${esc(s.arabic)}</span>
    </a>`;
  }).join('')}</ul>` : empty('কিছু মিলল না', 'অন্য নাম বা নম্বর দিয়ে চেষ্টা করুন।')}
  `;
}

/* ─────────────────────────── একটি সূরা ─────────────────────────── */

export function surahPage(db, number) {
  const s = db.bySurahNumber.get(number);
  if (!s) return notFound();

  const list = db.bySurah.get(number) ?? [];

  return `
  <nav class="breadcrumb"><a href="#/">হোম</a><span>›</span><a href="#/surah">সূরা</a><span>›</span>${esc(s.bn)}</nav>

  <div class="page-head">
    <span class="eyebrow">সূরা ${bn(s.number)}</span>
    <h1>${esc(s.bn)} <span class="muted" style="font-family:var(--arabic);font-size:.85em" dir="rtl" lang="ar">${esc(s.arabic)}</span></h1>
    <p class="lede">${esc(s.meaningBn)} · ${esc(s.revelation)} · মোট ${bn(s.ayahCount)} আয়াত ·
       এখানে সংরক্ষিত আছে ${bn(list.length)}টি</p>
  </div>

  <form class="toolbar" id="jump-form">
    <label class="muted" for="jump-ayah" style="font-size:.9rem">আয়াত নম্বরে যান</label>
    <input class="filter-input" id="jump-ayah" type="text" inputmode="numeric"
           placeholder="১–${bn(s.ayahCount)}" style="min-width:8rem" aria-label="আয়াত নম্বর">
    <button class="chip active" type="submit">যান</button>
  </form>

  ${list.length
    ? verseList(list)
    : empty('এই সূরার কোনো আয়াত এখনো যোগ করা হয়নি',
        'উপরে আয়াত নম্বর লিখলে সেটি সংগ্রহে আছে কি না দেখা যাবে।')}
  `;
}

/* ─────────────────────────── আয়াতের পাতা ─────────────────────────── */

export function ayahPage(db, surah, ayah) {
  const list = db.bySurah.get(surah) ?? [];
  const v = list.find((x) => ayah >= x.ayah && ayah <= (x.ayahEnd ?? x.ayah));
  const s = db.bySurahNumber.get(surah);

  if (!v) {
    if (!s) return notFound();
    return `
    <nav class="breadcrumb"><a href="#/">হোম</a><span>›</span><a href="#/surah">সূরা</a><span>›</span>
      <a href="#/surah/${s.number}">${esc(s.bn)}</a><span>›</span>আয়াত ${bn(ayah)}</nav>
    <div class="page-head">
      <span class="eyebrow">সূরা ${bn(s.number)} · আয়াত ${bn(ayah)}</span>
      <h1>${esc(s.bn)} — আয়াত ${bn(ayah)}</h1>
      <p class="lede">এই আয়াতটি এখনো সংগ্রহে যোগ করা হয়নি। এখানে বাছাই করা আয়াত রাখা হয়;
         যোগ হওয়ামাত্র এই ঠিকানাতেই পাওয়া যাবে।</p>
    </div>
    <div class="empty"><span class="mark" aria-hidden="true">۞</span>
      <h2>ইতিমধ্যে দেখে নিতে পারেন</h2>
      <p>${esc(s.bn)} সূরায় এখন ${bn(list.length)}টি আয়াত সংরক্ষিত আছে।</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#/surah/${s.number}">${esc(s.bn)}-এর সংরক্ষিত আয়াত</a>
        <a class="btn" href="https://quran.com/${surah}/${ayah}" rel="noopener">কুরআন.কম-এ মূল পাঠ</a>
      </div>
    </div>
    `;
  }

  const idx = list.indexOf(v);
  const prev = list[idx - 1], next = list[idx + 1];
  const [main, ...others] = v.translations ?? [];

  return `
  <article class="ayah-page">
    <nav class="breadcrumb"><a href="#/">হোম</a><span>›</span><a href="#/surah">সূরা</a><span>›</span>
      <a href="#/surah/${surah}">${esc(s?.bn ?? '')}</a><span>›</span>আয়াত ${bn(v.ayah)}</nav>

    <div class="ayah-hero">
      <div class="ayah-hero-top">
        <div class="titles">
          <h1 class="ayah-title">${esc(v.title || `${s?.bn ?? ''} — আয়াত ${bn(v.ayah)}`)}</h1>
          <p class="ayah-ref">সূরা ${esc(s?.bn ?? '')} (${bn(surah)}) · আয়াত ${esc(refText(v).split(':')[1])}
            · ${esc(s?.revelation ?? '')}</p>
        </div>
        ${starButton(v)}
      </div>

      ${v.arabic ? `<p class="arabic" dir="rtl" lang="ar">${esc(v.arabic)}</p>` : ''}

      ${recitationBar(v)}

      ${v.uccharon ? `<p class="uccharon"><b>উচ্চারণ</b>${esc(v.uccharon)}</p>` : ''}

      ${main ? `<div class="translation">
        <span class="label">অর্থ — ${esc(main.by)}</span>
        <p class="text">${inline(main.text)}</p>
      </div>` : ''}

      ${others.map((t) => `<div class="translation secondary">
        <span class="label">তুলনার জন্য — ${esc(t.by)}</span>
        <p class="text">${inline(t.text)}</p>
      </div>`).join('')}

      ${v.tags?.length ? `<div class="tags">${v.tags.map((t) =>
        `<a class="tag" href="#/bishoy/${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div>` : ''}

      <div class="ayah-actions">
        <button class="btn" type="button" data-copy="${esc(v.id)}">${ICON.copy} অনুবাদ কপি করুন</button>
        <button class="btn" type="button" data-share="${esc(v.id)}">${ICON.link} লিংক কপি করুন</button>
        <a class="btn" href="https://quran.com/${surah}/${v.ayah}" rel="noopener">${ICON.book} কুরআন.কম</a>
      </div>
    </div>

    ${v.summary ? `<section class="section"><h2>এক নজরে</h2>
      <div class="panel"><div class="body"><p>${inline(v.summary)}</p></div></div></section>` : ''}

    ${v.words?.length ? `<section class="section"><h2>শব্দে শব্দে অর্থ</h2>
      <div class="words">${v.words.map((w) => `<div class="word">
        <span class="ar" dir="rtl" lang="ar">${esc(w.ar)}</span>
        <span class="bn">${esc(w.bn)}</span>
        ${w.note ? `<span class="note">${esc(w.note)}</span>` : ''}
      </div>`).join('')}</div></section>` : ''}

    ${(v.sections ?? []).map((sec) => `<section class="section">
      <h2>${esc(sec.heading)}</h2>
      <div class="panel"><div class="body">${(sec.body ?? []).map((p) => `<p>${inline(p)}</p>`).join('')}</div></div>
    </section>`).join('')}

    ${v.hadith?.length ? `<section class="section"><h2>সংশ্লিষ্ট হাদীস</h2>
      ${v.hadith.map((h) => `<blockquote class="quote">${inline(h.text)}
        <cite class="cite">— ${esc(h.source)}</cite></blockquote>`).join('')}</section>` : ''}

    ${v.lessons?.length ? `<section class="section"><h2>মূল শিক্ষা</h2>
      <div class="panel"><ol class="points">${v.lessons.map((l) => `<li>${inline(l)}</li>`).join('')}</ol></div>
    </section>` : ''}

    ${v.application?.length ? `<section class="section"><h2>জীবনে যেভাবে কাজে লাগে</h2>
      <div class="panel"><ul class="points plain">${v.application.map((l) => `<li>${inline(l)}</li>`).join('')}</ul></div>
    </section>` : ''}

    ${v.related?.length ? `<section class="section"><h2>সম্পর্কিত আয়াত</h2>
      <ul class="related-list">${v.related.map((r) => `<li><a href="${r.href ?? `#/ayat/${r.surah}/${r.ayah}`}">
        <span class="ref">${esc(r.ref)}</span><span class="txt">${esc(r.note)}</span></a></li>`).join('')}</ul>
    </section>` : ''}

    ${v.sources?.length ? `<section class="section"><h2>সূত্র</h2>
      <div class="panel"><ul class="sources">${v.sources.map((src) => src.url
        ? `<li><a href="${esc(src.url)}" rel="noopener">${esc(src.label)}</a></li>`
        : `<li>${esc(src.label)}</li>`).join('')}</ul></div>
    </section>` : ''}

    ${v.verifiedOn ? `<p class="verified">সর্বশেষ যাচাই: ${esc(v.verifiedOn)} ·
      একাধিক প্রামাণ্য অনুবাদ ও তাফসীর মিলিয়ে দেখা হয়েছে।</p>` : ''}

    <nav class="pager">
      ${prev ? `<a href="${ayahHref(prev)}"><small>← আগের</small>${esc(prev.title || `আয়াত ${bn(prev.ayah)}`)}</a>` : '<span></span>'}
      ${next ? `<a class="next" href="${ayahHref(next)}"><small>পরের →</small>${esc(next.title || `আয়াত ${bn(next.ayah)}`)}</a>` : '<span></span>'}
    </nav>
  </article>`;
}

/* ─────────────────────────── খোঁজার ফলাফল ─────────────────────────── */

export function searchPage(db, query) {
  const { items, exact, ref } = search(query, db.verses);

  const refNote = ref && !exact
    ? `<div class="empty" style="margin-bottom:1.25rem;padding:1.25rem">
        <p style="margin:0">সূরা ${bn(ref.surah)}, আয়াত ${bn(ref.ayah)} এখনো এই সংগ্রহে যোগ করা হয়নি।
        <a href="#/ayat/${ref.surah}/${ref.ayah}">সূরাটির পাতা দেখুন</a></p></div>`
    : '';

  return `
  <div class="page-head">
    <span class="eyebrow">খোঁজার ফলাফল</span>
    <h1>“${esc(query)}”</h1>
  </div>
  ${refNote}
  ${items.length ? `<p class="result-count">${bn(items.length)}টি আয়াত মিলেছে</p>
    ${verseList(items, { query })}`
   : empty('কিছু পাওয়া গেল না',
      'অন্য শব্দে চেষ্টা করুন, কিংবা সূরার নাম বা “২:২৫৫” ধরনের নম্বর লিখুন।',
      '<div class="hero-actions"><a class="btn btn-primary" href="#/surah">সূরা তালিকা</a></div>')}
  `;
}

/* ─────────────────────────── প্রিয় ─────────────────────────── */

export function favouritesPage(db) {
  const ids = new Set(favourites.all());
  const list = favourites.all().map((id) => db.byId.get(id)).filter(Boolean);

  return `
  <div class="page-head">
    <span class="eyebrow">আপনার সংগ্রহ</span>
    <h1>প্রিয় আয়াত</h1>
    <p class="lede">তারকা চিহ্ন দেওয়া আয়াতগুলো এখানে জমা থাকে। এগুলো শুধু এই ব্রাউজারেই সংরক্ষিত —
       কোথাও পাঠানো হয় না।</p>
  </div>
  ${list.length
    ? verseList(list)
    : empty('এখনো কিছু জমা হয়নি',
        'যেকোনো আয়াতের পাশে তারকা চিহ্নে চাপ দিলে সেটি এখানে জমা হবে।',
        '<div class="hero-actions"><a class="btn btn-primary" href="#/surah">আয়াত খুঁজুন</a></div>')}
  ${ids.size !== list.length && ids.size
    ? '<p class="verified">কিছু সংরক্ষিত আয়াত আর সংগ্রহে নেই, তাই দেখানো হয়নি।</p>' : ''}
  `;
}

/* ─────────────────────────── বিষয় ─────────────────────────── */

export function tagPage(db, tag) {
  const list = db.verses.filter((v) => (v.tags ?? []).includes(tag));
  return `
  <nav class="breadcrumb"><a href="#/">হোম</a><span>›</span>বিষয়</nav>
  <div class="page-head">
    <span class="eyebrow">বিষয়</span>
    <h1>${esc(tag)}</h1>
    <p class="lede">${bn(list.length)}টি আয়াত</p>
  </div>
  ${list.length ? verseList(list) : empty('এই বিষয়ে কিছু নেই', 'অন্য বিষয় দেখুন।')}
  <div class="toolbar" style="margin-top:1.5rem">
    ${db.tags.map(([t, n]) => `<a class="chip ${t === tag ? 'active' : ''}"
      href="#/bishoy/${encodeURIComponent(t)}">${esc(t)} <span class="muted">${bn(n)}</span></a>`).join('')}
  </div>`;
}

/* ─────────────────────────── পরিচিতি ─────────────────────────── */

export function aboutPage(db) {
  return `
  <div class="page-head">
    <span class="eyebrow">পরিচিতি</span>
    <h1>এই সংগ্রহ সম্পর্কে</h1>
  </div>

  <section class="section"><h2>উদ্দেশ্য</h2><div class="panel"><div class="body">
    <p>কুরআনের যে আয়াতগুলো বারবার মনে পড়ে, যেগুলো জীবনের সিদ্ধান্তে কাজে লাগে — সেগুলো এক জায়গায়
       গুছিয়ে রাখা, স্পষ্ট বাংলায় অর্থ ও ব্যাখ্যাসহ। এটি সম্পূর্ণ কুরআন নয়; বাছাই করা আয়াতের সংগ্রহ।</p>
    <p>প্রতিটি আয়াতের সাথে থাকে — মূল আরবি পাঠ, বাংলা উচ্চারণ, একাধিক নির্ভরযোগ্য অনুবাদ,
       শব্দে শব্দে অর্থ, নাযিলের প্রেক্ষাপট, বিস্তারিত ব্যাখ্যা, মূল শিক্ষা, বাস্তব প্রয়োগ এবং সূত্র।</p>
  </div></div></section>

  <section class="section"><h2>যেসব উৎস থেকে যাচাই করা হয়</h2><div class="panel"><div class="body">
    <ul class="points plain">
      <li><strong>আরবি মূল পাঠ</strong> — উসমানী লিপি, কিং ফাহাদ কুরআন মুদ্রণ কমপ্লেক্স-অনুমোদিত পাঠ।</li>
      <li><strong>বাংলা অনুবাদ</strong> — ড. আবু বকর মুহাম্মাদ যাকারিয়া (কিং ফাহাদ কমপ্লেক্স),
          মুহিউদ্দীন খান, এবং প্রয়োজনে জহুরুল হক।</li>
      <li><strong>তাফসীর</strong> — তাফসীর ইবনে কাসীর, তাফসীর ফাতহুল মাজীদ,
          আল-মুখতাসার ফী তাফসীরিল কুরআনিল কারীম, এবং আসবাবুন নুযূল (আল-ওয়াহিদী)।</li>
      <li><strong>হাদীস</strong> — সহীহ বুখারী, সহীহ মুসলিম ও অন্যান্য স্বীকৃত সংকলন, নম্বরসহ।</li>
      <li><strong>তিলাওয়াত</strong> — ক্বারী ${esc(RECITER.bn)}
          (<span dir="rtl" lang="ar">${esc(RECITER.arabic)}</span>), ${esc(RECITER.style)}।
          অডিও এই সাইটে রাখা নেই;
          আল-কুরআন ক্লাউড ও এভরিআয়াহ-র প্রকাশ্য সংগ্রহ থেকে সরাসরি বাজে।</li>
    </ul>
    <p>একটি ব্যাখ্যা তখনই যোগ করা হয়, যখন অন্তত দুটি স্বতন্ত্র প্রামাণ্য উৎসে তা মিলে যায়।
       মতভেদ থাকলে সেটিও লিখে দেওয়া হয় — এক পক্ষকে একমাত্র মত হিসেবে দেখানো হয় না।</p>
  </div></div></section>

  <section class="section"><h2>যেভাবে ব্যবহার করবেন</h2><div class="panel"><div class="body">
    <ul class="points plain">
      <li>উপরের বাক্সে <strong>সূরার নাম</strong>, <strong>“২:২৫৫” ধরনের নম্বর</strong>, কিংবা
          অনুবাদ/ব্যাখ্যার <strong>যেকোনো শব্দ</strong> লিখে খুঁজুন।</li>
      <li>আয়াতের পাতায় আরবি পাঠের নিচের বোতামে চাপ দিলে <strong>তিলাওয়াত</strong> শোনা যায় —
          ক্বারী ${esc(RECITER.bn)}-র কণ্ঠে। পাশের গোল বোতামটি চাপলে আয়াতটি
          <strong>বারবার</strong> বাজে, মুখস্থ করার জন্য।</li>
      <li><strong>সূরা</strong> পাতা থেকে যেকোনো সূরায় ঢুকে নির্দিষ্ট আয়াত নম্বরে যেতে পারবেন।</li>
      <li>হোম পাতার <strong>সংখ্যার ঘরগুলোতে চাপ দেওয়া যায়</strong> —
          <a href="#/ayat">সংরক্ষিত সব আয়াত</a>,
          <a href="#/surah/${encodeURIComponent(SURAH_SAVED)}">যেসব সূরায় আয়াত আছে</a>,
          <a href="#/bishoy">সব বিষয়</a> ও <a href="#/priyo">প্রিয় আয়াত</a> এক চাপেই খুলে যাবে।</li>
      <li>তারকা চিহ্নে চাপ দিলে আয়াতটি <strong>প্রিয়</strong> তালিকায় জমা হয় — এই ব্রাউজারেই থাকে।</li>
      <li>কি-বোর্ডে <strong>/</strong> চাপলে সরাসরি খোঁজার ঘরে যাওয়া যায়।</li>
    </ul>
  </div></div></section>

  <section class="section"><h2>একটি অনুরোধ</h2><div class="panel"><div class="body">
    <p>অনুবাদ ও ব্যাখ্যা মানুষের কাজ, তাই ভুল হতে পারে — কুরআনের মূল আরবি পাঠই চূড়ান্ত।
       কোথাও ভুল চোখে পড়লে জানাবেন; সংশোধন করে দেওয়া হবে।</p>
    <p class="muted">সংগ্রহে এখন ${bn(db.verses.length)}টি আয়াত রয়েছে।</p>
  </div></div></section>`;
}

export function notFound() {
  return empty('পাতাটি পাওয়া গেল না', 'ঠিকানাটি হয়তো ভুল। হোম থেকে আবার শুরু করুন।',
    '<div class="hero-actions"><a class="btn btn-primary" href="#/">হোমে যান</a></div>');
}

export function loading() {
  return '<div class="empty"><span class="mark" aria-hidden="true">۞</span><p>একটু অপেক্ষা করুন…</p></div>';
}
