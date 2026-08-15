#!/usr/bin/env node
/**
 * একটি আয়াতের জন্য সব প্রামাণ্য উৎস এক জায়গায় এনে দেখায় — যাচাইয়ের কাঁচামাল।
 *
 *   node scripts/fetch-sources.mjs 2 255
 *   node scripts/fetch-sources.mjs 2 255 --json > scripts/.work/2-255.json
 *
 * এতে কোনো কনটেন্ট লেখা হয় না; শুধু উৎস দেখানো হয়। ব্যাখ্যা মানুষ/সম্পাদক লেখেন,
 * এবং content/verses/*.json-এ প্রতিটি দাবির সাথে sources[] যুক্ত থাকে।
 *
 * শেষে তিলাওয়াতের ঠিকানাও দেখায় — নতুন আয়াত যোগ করার সময় শুনে যাচাই করা বাধ্যতামূলক।
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = 'https://raw.githubusercontent.com';

/** অনুবাদ ও আরবি মূল পাঠ — fawazahmed0/quran-api */
const TEXTS = [
  { key: 'arabic',      label: 'আরবি (উসমানী লিপি)',                edition: 'ara-quranuthmanienc' },
  { key: 'bn_zakaria',  label: 'বাংলা — ড. আবু বকর মুহাম্মাদ যাকারিয়া (কিং ফাহাদ কমপ্লেক্স)', edition: 'ben-abubakrzakaria' },
  { key: 'bn_khan',     label: 'বাংলা — মুহিউদ্দীন খান',            edition: 'ben-muhiuddinkhan' },
  { key: 'bn_hoque',    label: 'বাংলা — জহুরুল হক',                  edition: 'ben-zohurulhoque' },
  { key: 'en_saheeh',   label: 'English — Saheeh International',      edition: 'eng-ummmuhammad' },
  { key: 'en_khattab',  label: 'English — Dr. Mustafa Khattab',       edition: 'eng-mustafakhattaba' },
];

/** তাফসীর — spa5k/tafsir_api (quran.com ও qul.tarteel.ai-এর সংকলন) */
const TAFSIRS = [
  { key: 'bn_fathul_majid', label: 'তাফসীর ফাতহুল মাজীদ (বাংলা)',            slug: 'bn-tafisr-fathul-majid' },
  { key: 'bn_mukhtasar',    label: 'আল-মুখতাসার — সংক্ষিপ্ত তাফসীর (বাংলা)', slug: 'bengali-mokhtasar' },
  { key: 'en_ibn_kathir',   label: 'Tafsir Ibn Kathir (English)',             slug: 'en-tafisr-ibn-kathir' },
  { key: 'en_mukhtasar',    label: 'Al-Mukhtasar (English)',                  slug: 'en-tafsir-al-mukhtasar' },
  { key: 'en_asbab',        label: "Asbab al-Nuzul — al-Wahidi (English)",    slug: 'en-asbab-al-nuzul-by-al-wahidi' },
  { key: 'en_jalalayn',     label: 'Tafsir al-Jalalayn (English)',            slug: 'en-al-jalalayn' },
];

async function getJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const [surah, ayah, ...flags] = process.argv.slice(2);
if (!surah || !ayah) {
  console.error('ব্যবহার: node scripts/fetch-sources.mjs <সূরা> <আয়াত> [--json]');
  process.exit(1);
}

const out = { surah: Number(surah), ayah: Number(ayah), texts: {}, tafsirs: {} };

await Promise.all([
  ...TEXTS.map(async (t) => {
    const d = await getJson(`${RAW}/fawazahmed0/quran-api/1/editions/${t.edition}/${surah}/${ayah}.json`);
    if (d?.text) out.texts[t.key] = { label: t.label, edition: t.edition, text: d.text };
  }),
  ...TAFSIRS.map(async (t) => {
    const d = await getJson(`${RAW}/spa5k/tafsir_api/main/tafsir/${t.slug}/${surah}/${ayah}.json`);
    if (d?.text) out.tafsirs[t.key] = { label: t.label, slug: t.slug, text: d.text };
  }),
]);

out.links = {
  quranCom: `https://quran.com/${surah}/${ayah}`,
  tanzil: `https://tanzil.net/#${surah}:${ayah}`,
  qurancomplex: `https://qurancomplex.gov.sa/`,
};

/** তিলাওয়াত — assets/js/audio.js যে ঠিকানাগুলো বাজায়, হুবহু সেগুলোই। */
out.recitation = { reciter: 'মিশারী রাশিদ আল-আফাসী', urls: recitationUrls(+surah, +ayah) };

function recitationUrls(s, a) {
  const pad3 = (n) => String(n).padStart(3, '0');
  const urls = [];
  try {
    const { surahs } = JSON.parse(readFileSync(join(ROOT, 'data/surahs.json'), 'utf8'));
    let n = 0;
    for (const x of surahs) { if (x.number === s) { n += a; break; } n += x.ayahCount; }
    urls.push(`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${n}.mp3`);
  } catch {
    /* data/surahs.json না থাকলে শুধু দ্বিতীয় ঠিকানাটাই দেখাই */
  }
  urls.push(`https://everyayah.com/data/Alafasy_128kbps/${pad3(s)}${pad3(a)}.mp3`);
  return urls;
}

if (flags.includes('--json')) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`\n════ সূরা ${surah} : আয়াত ${ayah} ════\n`);
  for (const [, v] of Object.entries(out.texts)) console.log(`── ${v.label}\n${v.text}\n`);
  for (const [, v] of Object.entries(out.tafsirs)) console.log(`── ${v.label}\n${v.text}\n`);
  console.log(`── লিংক\n${Object.values(out.links).join('\n')}\n`);
  console.log(`── তিলাওয়াত — ক্বারী ${out.recitation.reciter}`);
  console.log('   (নতুন আয়াত যোগ করার পর একবার শুনে মিলিয়ে নিন)');
  console.log(`${out.recitation.urls.map((u) => '   ' + u).join('\n')}\n`);
}
