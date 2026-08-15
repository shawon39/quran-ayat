/**
 * খোঁজা — ছোট সংগ্রহের জন্য সরল, পূর্বানুমেয় ও যথেষ্ট দ্রুত।
 *
 * তিনভাবে মেলানো হয়:
 *   ১) সরাসরি রেফারেন্স — "২:২৫৫", "2:255"
 *   ২) সূরার নাম / বিষয়-ট্যাগ
 *   ৩) অনুবাদ ও ব্যাখ্যার ভেতরের যেকোনো শব্দ
 */

import { norm, parseRef } from './util.js';

/** প্রতিটি শব্দের জন্য নম্বর — শিরোনামে মিললে বেশি, ব্যাখ্যায় মিললে কম। */
function score(v, tokens, nq) {
  const title = norm(v.title ?? '');
  const surah = norm([v.surahInfo?.bn, v.surahInfo?.translit, ...(v.surahInfo?.aliases ?? [])].join(' '));
  const summary = norm(v.summary ?? '');
  const tags = norm((v.tags ?? []).join(' '));
  const trans = norm((v.translations?.[0]?.text) ?? '');

  let total = 0;
  for (const t of tokens) {
    let s = 0;
    if (title.includes(t)) s += 12;
    if (surah.includes(t)) s += 8;
    if (tags.includes(t)) s += 7;
    if (summary.includes(t)) s += 5;
    if (trans.includes(t)) s += 4;
    if (v.haystack.includes(t)) s += 2;
    if (s === 0) return 0;                 // প্রতিটি শব্দই কোথাও না কোথাও থাকতে হবে
    total += s;
  }
  if (title && title === nq) total += 40;
  if (nq && title.startsWith(nq)) total += 15;
  return total;
}

/**
 * @returns {{items: object[], exact: object|null, ref: object|null}}
 */
export function search(query, verses) {
  const nq = norm(query);
  if (!nq) return { items: [], exact: null, ref: null };

  const ref = parseRef(query);
  let exact = null;
  if (ref) {
    exact = verses.find((v) => v.surah === ref.surah
      && ref.ayah >= v.ayah && ref.ayah <= (v.ayahEnd ?? v.ayah)) ?? null;
  }

  const tokens = nq.split(' ').filter((t) => t.length > 0);
  const items = verses
    .map((v) => ({ v, s: score(v, tokens, nq) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.v.surah - b.v.surah || a.v.ayah - b.v.ayah)
    .map((x) => x.v);

  // "13-28", "13.28", "surah 2:255"-এর মতো লেখায় রেফারেন্স ঠিকই ধরা পড়ে (parseRef),
  // কিন্তু শব্দ-মেলানো স্কোরিং সেই বানানে মেলে না — তাই সরাসরি সবার উপরে বসিয়ে দেওয়া হয়।
  if (exact && !items.includes(exact)) items.unshift(exact);

  return { items, exact, ref };
}

/** ফলাফলে কোন অংশটা মিলেছে, তার এক টুকরো — মিলে যাওয়া শব্দ হাইলাইট করা। */
export function excerpt(v, query, maxLen = 190) {
  const tokens = norm(query).split(' ').filter(Boolean);
  const pool = [v.summary, v.translations?.[0]?.text, ...(v.sections ?? []).flatMap((s) => s.body ?? [])]
    .filter(Boolean);

  let best = pool[0] ?? '';
  let at = -1;
  for (const text of pool) {
    const n = norm(text);
    for (const t of tokens) {
      const i = n.indexOf(t);
      if (i >= 0) { best = text; at = i; break; }
    }
    if (at >= 0) break;
  }

  let out = best;
  if (at > 60) out = '…' + best.slice(Math.max(0, at - 50));
  if (out.length > maxLen) out = out.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
  return out;
}

/** নিরাপদে হাইলাইট করা — escape করা লেখার উপর <mark> বসানো হয়। */
export function highlight(escapedText, query) {
  const tokens = [...new Set(norm(query).split(' ').filter((t) => t.length > 1))];
  if (!tokens.length) return escapedText;
  const pattern = tokens
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length)
    .join('|');
  try {
    return escapedText.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>');
  } catch {
    return escapedText;
  }
}
