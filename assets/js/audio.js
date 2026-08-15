/**
 * তিলাওয়াত — ক্বারী মিশারী রাশিদ আল-আফাসীর কণ্ঠে আয়াতের অডিও।
 *
 * রিপোজিটরিতে কোনো অডিও ফাইল রাখা হয়নি; দুটি প্রকাশ্য CDN থেকে সরাসরি বাজে।
 * প্রথমটিতে না পাওয়া গেলে নিজে থেকেই দ্বিতীয়টিতে চেষ্টা করা হয়।
 *
 * পাতায় একটি মাত্র প্লেয়ার থাকে — তাই পুরো মডিউলটি একটাই অবস্থা (state) রাখে,
 * আর বদল হলে onChange()-এ নিবন্ধিত সবাইকে জানায়। DOM-এর কাজ app.js করে।
 */

import { bn } from './util.js';

/** কার কণ্ঠ — একজায়গায়, যেন পরে বদলানো সহজ হয়। */
export const RECITER = {
  bn: 'মিশারী রাশিদ আল-আফাসী',
  arabic: 'مشاري راشد العفاسي',
  style: 'মুরাত্তাল · হাফস ‘আন ‘আসিম',
};

/** ১২৮ kbps মুরাত্তাল — দুটি স্বতন্ত্র উৎস, একটির বদলে আরেকটি। */
const CDN = {
  /** আল-কুরআন ক্লাউড — গোটা কুরআনের ধারাবাহিক আয়াত নম্বর (১–৬২৩৬) লাগে। */
  islamicNetwork: (globalAyah) =>
    `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyah}.mp3`,
  /** এভরিআয়াহ — সূরা ও আয়াত দুটিই তিন অঙ্কে, যেমন 002255.mp3 */
  everyAyah: (surah, ayah) =>
    `https://everyayah.com/data/Alafasy_128kbps/${pad3(surah)}${pad3(ayah)}.mp3`,
};

const pad3 = (n) => String(n).padStart(3, '0');

/** সূরার নম্বর → তার আগে মোট কত আয়াত, এবং সূরার বাংলা নাম। */
let before = null;
let names = null;

/** data/surahs.json এলে একবার ডাকা হয় — এতেই ধারাবাহিক আয়াত নম্বর বের করা যায়। */
export function init(surahs) {
  before = new Map();
  names = new Map();
  let total = 0;
  for (const s of surahs) {
    before.set(s.number, total);
    names.set(s.number, s.bn);
    total += s.ayahCount;
  }
}

/** সূরা+আয়াত → গোটা কুরআনের ধারাবাহিক নম্বর। ২:২৫৫ → ২৬২ */
function globalAyah(surah, ayah) {
  const n = before?.get(surah);
  return n === undefined ? null : n + ayah;
}

/** একটি আয়াতের জন্য চেষ্টা করার মতো ঠিকানাগুলো, পছন্দের ক্রমে। */
export function sources(surah, ayah) {
  const list = [];
  const g = globalAyah(surah, ayah);
  if (g) list.push(CDN.islamicNetwork(g));
  list.push(CDN.everyAyah(surah, ayah));
  return list;
}

/* ───────────── অবস্থা ───────────── */

const listeners = new Set();

let audio = null;      // <audio> — প্রথম ক্লিকেই তৈরি হয় (iOS-এর জন্য জরুরি)
let queue = [];        // [{ surah, ayah }] — পরিসর হলে একাধিক
let at = 0;            // queue-র কোনটি বাজছে
let tried = 0;         // sources()-এর কত নম্বর ঠিকানা চেষ্টা করা হয়েছে
let repeat = false;

const state = {
  key: '',             // "সূরা:শুরু:শেষ" — কোন ব্লকটি বাজছে
  status: 'idle',      // idle | loading | playing | paused | error
  surah: 0,
  ayah: 0,
  index: 0,            // পরিসরের কত নম্বর আয়াত
  total: 0,
  position: 0,
  duration: 0,
};

function snapshot() { return { ...state, repeat }; }
function emit() { for (const fn of listeners) fn(snapshot()); }
function set(patch) { Object.assign(state, patch); emit(); }

/* ───────────── বাজানো ───────────── */

function element() {
  if (audio) return audio;

  audio = new Audio();
  audio.preload = 'auto';

  audio.addEventListener('playing', () => set({ status: 'playing' }));
  audio.addEventListener('waiting', () => set({ status: 'loading' }));
  audio.addEventListener('pause', () => {
    if (state.status !== 'idle' && !audio.ended) set({ status: 'paused' });
  });
  audio.addEventListener('loadedmetadata', () => set({ duration: audio.duration || 0 }));
  audio.addEventListener('timeupdate', () => {
    set({ position: audio.currentTime, duration: audio.duration || state.duration });
  });
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('error', onError);

  return audio;
}

function onError() {
  if (state.status === 'idle') return;         // থামানোর সময় src মুছলেও error আসে
  const list = sources(state.surah, state.ayah);
  tried += 1;
  if (tried < list.length) { start(list[tried]); return; }
  set({ status: 'error' });
}

function onEnded() {
  if (at + 1 < queue.length) { playAt(at + 1); return; }   // পরিসরের পরের আয়াত
  if (repeat) { playAt(0); return; }
  set({ status: 'idle', position: 0 });
}

function start(url) {
  const el = element();
  el.src = url;
  set({ status: 'loading' });
  el.play().catch((err) => {
    // দ্রুত src বদলালে ব্রাউজার আগের play()-কে AbortError দিয়ে বাতিল করে — সেটি সমস্যা নয়
    if (err?.name === 'AbortError') return;
    if (state.status === 'loading') set({ status: 'error' });
  });
}

function playAt(i) {
  const item = queue[i];
  if (!item) return;
  at = i;
  tried = 0;
  set({ surah: item.surah, ayah: item.ayah, index: i, position: 0, duration: 0 });
  describeToSystem(item);
  start(sources(item.surah, item.ayah)[0]);
}

/** ফোনের লক-স্ক্রিন বা হেডফোনের বোতামে যেন ঠিক তথ্য ও নিয়ন্ত্রণ থাকে। */
function describeToSystem({ surah, ayah }) {
  if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `সূরা ${names?.get(surah) ?? bn(surah)} — আয়াত ${bn(ayah)}`,
      artist: RECITER.bn,
      album: 'আয়াত — কুরআনের আলো, বাংলায়',
    });
    navigator.mediaSession.setActionHandler('play', () => { audio?.play().catch(() => {}); });
    navigator.mediaSession.setActionHandler('pause', () => { audio?.pause(); });
    navigator.mediaSession.setActionHandler('stop', () => { recitation.stop(); });
  } catch {
    /* কোনো ব্রাউজারে না থাকলে চুপচাপ ছেড়ে দিই */
  }
}

/* ───────────── বাইরের জন্য ───────────── */

export const recitation = {
  state: snapshot,
  isRepeat: () => repeat,

  /** অবস্থা বদলালে জানানো। ফেরত আসা ফাংশনটি ডাকলে নিবন্ধন বাতিল। */
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /** একই আয়াত বারবার — মুখস্থ করার জন্য। */
  toggleRepeat() { repeat = !repeat; emit(); return repeat; },

  /**
   * একটি আয়াত (বা `from`–`to` পরিসর) বাজানো / থামানো।
   * একই আয়াতে আবার চাপলে থামে, তারপর আবার চাপলে যেখানে ছিল সেখান থেকেই চলে।
   */
  toggle(surah, from, to = from) {
    const key = `${surah}:${from}:${to}`;

    if (key === state.key && state.status === 'playing') { audio?.pause(); return; }
    if (key === state.key && state.status === 'loading') { this.stop(); return; }
    if (key === state.key && state.status === 'paused') {
      audio?.play().catch(() => set({ status: 'error' }));
      return;
    }

    queue = [];
    for (let a = from; a <= to; a += 1) queue.push({ surah, ayah: a });
    state.key = key;
    set({ total: queue.length });
    playAt(0);
  },

  /** পুরোপুরি থামানো — পাতা বদলালে ডাকা হয়। */
  stop() {
    Object.assign(state, {
      key: '', status: 'idle', surah: 0, ayah: 0,
      index: 0, total: 0, position: 0, duration: 0,
    });
    queue = []; at = 0; tried = 0;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      try { audio.load(); } catch { /* অগ্রাহ্য */ }
    }
    emit();
  },
};
