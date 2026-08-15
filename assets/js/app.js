/** রাউটিং, ইভেন্ট ও শুরু করার কাজ। */

import { load } from './data.js';
import { favourites } from './store.js';
import { recitation, init as initRecitation } from './audio.js';
import { bn, clock, toast, debounce, refText } from './util.js';
import * as views from './views.js';

const view = document.getElementById('view');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('q');
const favCount = document.getElementById('fav-count');

let db = null;
/** সূরা তালিকার পাতার অবস্থা — পাতা বদলালে আবার ডিফল্টে ফেরে। */
let surahListState = { filter: '', only: 'all' };

/* ───────────── রাউট পড়া ───────────── */

function currentRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
  return { parts, raw };
}

function render() {
  if (!db) { view.innerHTML = views.loading(); return; }

  const { parts } = currentRoute();
  const [head, a, b] = parts;
  let html, title = 'আয়াত — কুরআনের গুরুত্বপূর্ণ আয়াতের বাংলা ব্যাখ্যা';

  switch (head) {
    case undefined:
      html = views.home(db);
      break;

    case 'surah':
      if (a === undefined) {
        html = views.surahList(db, surahListState);
        title = 'সূরা তালিকা — আয়াত';
      } else {
        const n = Number(a);
        html = views.surahPage(db, n);
        title = `${db.bySurahNumber.get(n)?.bn ?? 'সূরা'} — আয়াত`;
      }
      break;

    case 'ayat': {
      const s = Number(a), v = Number(b);
      html = views.ayahPage(db, s, v);
      const surah = db.bySurahNumber.get(s);
      title = surah ? `${surah.bn} ${bn(s)}:${bn(v)} — আয়াত` : title;
      break;
    }

    case 'khoj':
      html = views.searchPage(db, a ?? '');
      title = `“${a ?? ''}” — খোঁজার ফলাফল`;
      if (searchInput && document.activeElement !== searchInput) searchInput.value = a ?? '';
      break;

    case 'priyo':
      html = views.favouritesPage(db);
      title = 'প্রিয় আয়াত — আয়াত';
      break;

    case 'bishoy':
      html = views.tagPage(db, a ?? '');
      title = `${a ?? ''} — বিষয়`;
      break;

    case 'about':
      html = views.aboutPage(db);
      title = 'পরিচিতি — আয়াত';
      break;

    default:
      html = views.notFound();
      title = 'পাওয়া যায়নি — আয়াত';
  }

  view.innerHTML = html;
  document.title = title;
  markNav(head);
  wirePage(head);
  paintRecitation(recitation.state());
}

function markNav(head) {
  for (const link of document.querySelectorAll('.nav a')) {
    const on = link.dataset.nav === head;
    if (on) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

/* ───────────── পাতাভিত্তিক ইভেন্ট ───────────── */

function wirePage(head) {
  if (head === 'surah' && currentRoute().parts.length === 1) {
    const filter = document.getElementById('surah-filter');
    filter?.addEventListener('input', debounce((e) => {
      surahListState.filter = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const next = document.getElementById('surah-filter');
      next?.focus();
      next?.setSelectionRange(pos, pos);
    }, 160));

    for (const btn of document.querySelectorAll('[data-only]')) {
      btn.addEventListener('click', () => {
        surahListState.only = btn.dataset.only;
        render();
      });
    }
  }

  const jump = document.getElementById('jump-form');
  if (jump) {
    jump.addEventListener('submit', (e) => {
      e.preventDefault();
      const surah = Number(currentRoute().parts[1]);
      const raw = document.getElementById('jump-ayah').value;
      const ayah = Number(String(raw).replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d))).trim());
      if (!ayah || ayah < 1) { toast('আয়াত নম্বর লিখুন'); return; }
      const max = db.bySurahNumber.get(surah)?.ayahCount ?? 286;
      if (ayah > max) { toast(`এই সূরায় ${bn(max)}টি আয়াত আছে`); return; }
      location.hash = `#/ayat/${surah}/${ayah}`;
    });
  }
}

/* ───────────── সবখানে কাজ করে এমন ইভেন্ট ───────────── */

document.addEventListener('click', async (e) => {
  const fav = e.target.closest('[data-fav]');
  if (fav) {
    e.preventDefault();
    const on = favourites.toggle(fav.dataset.fav);
    fav.setAttribute('aria-pressed', String(on));
    const label = on ? 'প্রিয় তালিকা থেকে সরান' : 'প্রিয় তালিকায় রাখুন';
    fav.setAttribute('aria-label', label);
    fav.title = label;
    toast(on ? 'প্রিয় তালিকায় যোগ হয়েছে' : 'প্রিয় তালিকা থেকে সরানো হয়েছে');
    if (currentRoute().parts[0] === 'priyo') render();
    return;
  }

  const copy = e.target.closest('[data-copy]');
  if (copy) {
    const v = db?.byId.get(copy.dataset.copy);
    if (!v) return;
    const text = [
      v.arabic,
      v.uccharon ? `উচ্চারণ: ${v.uccharon}` : '',
      v.translations?.[0] ? `${v.translations[0].text}\n— ${v.translations[0].by}` : '',
      `(সূরা ${v.surahInfo?.bn ?? ''}, ${refText(v)})`,
    ].filter(Boolean).join('\n\n');
    await writeClipboard(text, 'অনুবাদ কপি হয়েছে');
    return;
  }

  const share = e.target.closest('[data-share]');
  if (share) {
    const v = db?.byId.get(share.dataset.share);
    if (!v) return;
    const url = `${location.origin}${location.pathname}#/ayat/${v.surah}/${v.ayah}`;
    await writeClipboard(url, 'লিংক কপি হয়েছে');
    return;
  }

  const playBtn = e.target.closest('[data-recite-toggle]');
  if (playBtn) {
    const box = playBtn.closest('[data-recite]');
    if (!box) return;
    const [surah, from, to] = box.dataset.recite.split(':').map(Number);
    recitation.toggle(surah, from, to);
    return;
  }

  const repeatBtn = e.target.closest('[data-recite-repeat]');
  if (repeatBtn) {
    const on = recitation.toggleRepeat();
    toast(on ? 'বারবার বাজবে' : 'একবারই বাজবে');
  }
});

async function writeClipboard(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast(okMsg); } catch { toast('কপি করা গেল না'); }
    ta.remove();
  }
}

/* ───────────── তিলাওয়াতের বার আঁকা ───────────── */

/** একই লেখা বারবার বসালে স্ক্রিন-রিডার আবার পড়ে ফেলে — তাই বদলালেই কেবল লিখি। */
function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

/** বারের নিচের ছোট লেখাটি — এই বারটিই বাজছে কি না তার উপর নির্ভর করে। */
function noteFor(box, st, mine) {
  if (!mine) return box.dataset.reciteIdle ?? '';
  if (st.status === 'error') return 'অডিও আনা গেল না — সংযোগ দেখে আবার চেষ্টা করুন';
  if (st.status === 'loading') return 'আসছে…';
  if (st.total > 1) return `আয়াত ${bn(st.ayah)} · ${bn(st.index + 1)}/${bn(st.total)}`;
  return st.status === 'paused' ? 'থেমে আছে' : 'বাজছে…';
}

function paintRecitation(st) {
  for (const box of document.querySelectorAll('[data-recite]')) {
    const mine = box.dataset.recite === st.key;
    const status = mine ? st.status : 'idle';
    box.dataset.status = status;

    const btn = box.querySelector('[data-recite-toggle]');
    if (btn) {
      const on = status === 'playing' || status === 'loading';
      const label = on ? 'তিলাওয়াত থামান' : 'তিলাওয়াত শুনুন';
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', label);
      btn.title = label;
    }

    const fill = box.querySelector('[data-recite-fill]');
    if (fill) {
      const pct = mine && st.duration ? Math.min(100, (st.position / st.duration) * 100) : 0;
      fill.style.width = `${pct}%`;
    }

    setText(box.querySelector('[data-recite-time]'),
      mine && st.duration ? `${clock(st.position)} / ${clock(st.duration)}` : '');
    setText(box.querySelector('[data-recite-note]'), noteFor(box, st, mine));

    box.querySelector('[data-recite-repeat]')?.setAttribute('aria-pressed', String(st.repeat));
  }
}

recitation.onChange(paintRecitation);

searchForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) { location.hash = '#/'; return; }
  location.hash = `#/khoj/${encodeURIComponent(q)}`;
  searchInput.blur();
});

/** "/" চাপলে খোঁজার ঘরে, Escape চাপলে বেরিয়ে আসা। */
document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '');
  if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    searchInput?.focus();
    searchInput?.select();
  } else if (e.key === 'Escape' && document.activeElement === searchInput) {
    searchInput.blur();
  }
});

function updateFavCount(list) {
  if (!favCount) return;
  const n = list?.length ?? favourites.count();
  favCount.textContent = bn(n);
  favCount.hidden = n === 0;
}
favourites.onChange(updateFavCount);

window.addEventListener('hashchange', () => {
  surahListState = { filter: '', only: surahListState.only };
  recitation.stop();   // অন্য পাতায় গেলে নিয়ন্ত্রণের বোতামটাই আর থাকে না
  render();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  document.getElementById('main')?.focus({ preventScroll: true });
});

/* ───────────── শুরু ───────────── */

view.innerHTML = views.loading();
updateFavCount();

load().then((data) => {
  db = data;
  initRecitation(db.surahs);
  const footer = document.getElementById('footer-count');
  if (footer) {
    footer.textContent = `${bn(db.verses.length)}টি আয়াত`
      + (db.updatedAt ? ` · সর্বশেষ হালনাগাদ ${db.updatedAt}` : '');
  }
  render();
}).catch((err) => {
  console.error(err);
  view.innerHTML = `<div class="empty"><span class="mark">۞</span>
    <h2>তথ্য আনা গেল না</h2>
    <p>পাতাটি একবার রিফ্রেশ করে দেখুন। সমস্যা থাকলে ইন্টারনেট সংযোগ পরীক্ষা করুন।</p></div>`;
});
