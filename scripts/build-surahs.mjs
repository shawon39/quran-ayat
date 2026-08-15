#!/usr/bin/env node
/**
 * data/surahs.json তৈরি করে।
 *
 * উৎস:
 *  - আরবি নাম, ইংরেজি লিপ্যন্তর, নামের অর্থ (বাংলা), মক্কী/মাদানী, আয়াতসংখ্যা:
 *    risan/quran-json (dist/chapters/bn/index.json), যা quran.com-এর তথ্যভিত্তিক।
 *  - বাংলা নাম: এই ফাইলের BANGLA_NAMES তালিকা (হাতে যাচাই করা)।
 *
 * চালাতে:  node scripts/build-surahs.mjs
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'https://raw.githubusercontent.com/risan/quran-json/main/dist/chapters/bn/index.json';
const CACHE = resolve(ROOT, 'scripts/.cache-chapters-bn.json');

/** ১১৪টি সূরার প্রচলিত বাংলা নাম (ক্রমানুসারে)। */
const BANGLA_NAMES = [
  'আল-ফাতিহা', 'আল-বাকারা', 'আলে ইমরান', 'আন-নিসা', 'আল-মায়িদা',
  "আল-আন'আম", "আল-আ'রাফ", 'আল-আনফাল', 'আত-তাওবা', 'ইউনুস',
  'হুদ', 'ইউসুফ', "আর-রা'দ", 'ইবরাহীম', 'আল-হিজর',
  'আন-নাহল', 'আল-ইসরা', 'আল-কাহফ', 'মারইয়াম', 'ত্ব-হা',
  'আল-আম্বিয়া', 'আল-হাজ্জ', "আল-মু'মিনূন", 'আন-নূর', 'আল-ফুরকান',
  "আশ-শু'আরা", 'আন-নামল', 'আল-কাসাস', 'আল-আনকাবূত', 'আর-রূম',
  'লুকমান', 'আস-সাজদা', 'আল-আহযাব', 'সাবা', 'ফাতির',
  'ইয়াসীন', 'আস-সাফফাত', 'সোয়াদ', 'আয-যুমার', 'গাফির',
  'ফুসসিলাত', 'আশ-শূরা', 'আয-যুখরুফ', 'আদ-দুখান', 'আল-জাসিয়া',
  'আল-আহকাফ', 'মুহাম্মাদ', 'আল-ফাতহ', 'আল-হুজুরাত', 'ক্বাফ',
  'আয-যারিয়াত', 'আত-তূর', 'আন-নাজম', 'আল-ক্বামার', 'আর-রাহমান',
  'আল-ওয়াকিয়া', 'আল-হাদীদ', 'আল-মুজাদালা', 'আল-হাশর', 'আল-মুমতাহিনা',
  'আস-সাফ', "আল-জুমু'আ", 'আল-মুনাফিকূন', 'আত-তাগাবুন', 'আত-তালাক',
  'আত-তাহরীম', 'আল-মুলক', 'আল-ক্বলম', 'আল-হাক্কাহ', "আল-মা'আরিজ",
  'নূহ', 'আল-জিন', 'আল-মুযযাম্মিল', 'আল-মুদ্দাসসির', 'আল-ক্বিয়ামাহ',
  'আল-ইনসান', 'আল-মুরসালাত', 'আন-নাবা', "আন-নাযি'আত", 'আবাসা',
  'আত-তাকভীর', 'আল-ইনফিতার', 'আল-মুতাফফিফীন', 'আল-ইনশিকাক', 'আল-বুরূজ',
  'আত-তারিক', "আল-আ'লা", 'আল-গাশিয়া', 'আল-ফাজর', 'আল-বালাদ',
  'আশ-শামস', 'আল-লাইল', 'আদ-দুহা', 'আশ-শারহ', 'আত-তীন',
  'আল-আলাক', 'আল-ক্বদর', 'আল-বায়্যিনাহ', 'আয-যিলযাল', 'আল-আদিয়াত',
  'আল-ক্বারিয়াহ', 'আত-তাকাসুর', 'আল-আসর', 'আল-হুমাযাহ', 'আল-ফীল',
  'কুরাইশ', "আল-মা'ঊন", 'আল-কাউসার', 'আল-কাফিরূন', 'আন-নাসর',
  'আল-মাসাদ', 'আল-ইখলাস', 'আল-ফালাক', 'আন-নাস',
];

/** কিছু সূরার বহুল প্রচলিত বিকল্প নাম — খোঁজার সময় কাজে লাগে। */
const ALIASES = {
  17: ['বনী ইসরাঈল'], 40: ["আল-মু'মিন"], 41: ['হা-মীম সাজদা'],
  76: ['আদ-দাহর'], 94: ['আলাম নাশরাহ', 'আল-ইনশিরাহ'], 111: ['আল-লাহাব'],
  1: ['উম্মুল কিতাব'], 36: ['ইয়া-সীন'], 112: ['সূরা ইখলাস'],
};

if (BANGLA_NAMES.length !== 114) {
  throw new Error(`BANGLA_NAMES-এ ১১৪টি নাম থাকার কথা, আছে ${BANGLA_NAMES.length}টি`);
}

async function loadChapters() {
  if (existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, 'utf8'));
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`উৎস আনা যায়নি: ${res.status}`);
  const json = await res.json();
  writeFileSync(CACHE, JSON.stringify(json, null, 2));
  return json;
}

const chapters = await loadChapters();
if (chapters.length !== 114) throw new Error('উৎসে ১১৪টি সূরা পাওয়া যায়নি');

const surahs = chapters.map((c, i) => ({
  number: c.id,
  bn: BANGLA_NAMES[i],
  arabic: c.name,
  translit: c.transliteration,
  meaningBn: c.translation,
  revelation: c.type === 'meccan' ? 'মক্কী' : 'মাদানী',
  ayahCount: c.total_verses,
  aliases: ALIASES[c.id] ?? [],
}));

writeFileSync(
  resolve(ROOT, 'data/surahs.json'),
  JSON.stringify({ generatedBy: 'scripts/build-surahs.mjs', source: SRC, surahs }, null, 2) + '\n',
);
console.log(`data/surahs.json লেখা হয়েছে — ${surahs.length}টি সূরা`);
