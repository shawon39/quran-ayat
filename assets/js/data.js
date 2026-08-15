/** সব তথ্য একবারেই আসে — সংগ্রহটি ছোট, তাই এতে সাইট দ্রুত ও অফলাইন-বান্ধব থাকে। */

import { norm, refText } from './util.js';

let loaded = null;

export function load() {
  if (loaded) return loaded;
  loaded = Promise.all([
    fetch('data/surahs.json').then((r) => r.json()),
    fetch('data/verses.json').then((r) => r.json()),
  ]).then(([s, v]) => {
    const surahs = s.surahs;
    const bySurahNumber = new Map(surahs.map((x) => [x.number, x]));
    const verses = v.verses.map((x) => ({ ...x, surahInfo: bySurahNumber.get(x.surah) }));

    const byId = new Map(verses.map((x) => [x.id, x]));
    const bySurah = new Map();
    for (const x of verses) {
      if (!bySurah.has(x.surah)) bySurah.set(x.surah, []);
      bySurah.get(x.surah).push(x);
    }
    for (const list of bySurah.values()) list.sort((a, b) => a.ayah - b.ayah);

    // খোঁজার জন্য প্রতিটি আয়াতের সব লেখা এক স্ট্রিং-এ
    for (const x of verses) {
      x.haystack = norm([
        x.title, refText(x), `${x.surah}:${x.ayah}`,
        x.surahInfo?.bn, x.surahInfo?.translit, x.surahInfo?.meaningBn,
        ...(x.surahInfo?.aliases ?? []),
        x.summary, x.uccharon,
        ...(x.tags ?? []),
        ...(x.translations ?? []).map((t) => t.text),
        ...(x.sections ?? []).flatMap((sec) => [sec.heading, ...(sec.body ?? [])]),
        ...(x.lessons ?? []), ...(x.application ?? []),
        ...(x.hadith ?? []).map((h) => `${h.text} ${h.source}`),
      ].filter(Boolean).join(' । '));
    }

    const tags = new Map();
    for (const x of verses) for (const t of x.tags ?? []) tags.set(t, (tags.get(t) ?? 0) + 1);

    return {
      surahs, verses, byId, bySurah, bySurahNumber,
      tags: [...tags.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'bn')),
      updatedAt: v.generatedAt,
    };
  });
  return loaded;
}
