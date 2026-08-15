#!/usr/bin/env node
/**
 * প্রতিটি আয়াত-ফাইলের গঠন পরীক্ষা।
 * নিজে চালালে সব ফাইল যাচাই করে:  node scripts/validate-content.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const isStr = (x) => typeof x === 'string' && x.trim().length > 0;
const isArrOf = (x, fn) => Array.isArray(x) && x.every(fn);

/** @returns {string[]} সমস্যার তালিকা — ফাঁকা মানে সব ঠিক আছে */
export function validateVerse(v, file = '') {
  const e = [];
  const req = (cond, msg) => { if (!cond) e.push(msg); };

  req(Number.isInteger(v.surah) && v.surah >= 1 && v.surah <= 114, 'surah ১–১১৪-এর মধ্যে পূর্ণসংখ্যা হতে হবে');
  req(Number.isInteger(v.ayah) && v.ayah >= 1, 'ayah পূর্ণসংখ্যা হতে হবে');
  if (v.ayahEnd !== undefined) {
    req(Number.isInteger(v.ayahEnd) && v.ayahEnd >= v.ayah, 'ayahEnd ≥ ayah হতে হবে');
  }

  req(isStr(v.arabic), 'arabic (মূল আরবি পাঠ) লাগবে');
  req(isStr(v.uccharon), 'uccharon (বাংলা উচ্চারণ) লাগবে');
  req(isStr(v.summary), 'summary (এক নজরে) লাগবে');

  req(Array.isArray(v.translations) && v.translations.length >= 2,
    'translations-এ অন্তত দুটি স্বতন্ত্র অনুবাদ লাগবে');
  if (Array.isArray(v.translations)) {
    v.translations.forEach((t, i) => {
      if (!isStr(t?.by)) e.push(`translations[${i}].by লাগবে`);
      if (!isStr(t?.text)) e.push(`translations[${i}].text লাগবে`);
    });
  }

  req(Array.isArray(v.sections) && v.sections.length >= 1, 'sections-এ অন্তত একটি ব্যাখ্যা-বিভাগ লাগবে');
  if (Array.isArray(v.sections)) {
    v.sections.forEach((s, i) => {
      if (!isStr(s?.heading)) e.push(`sections[${i}].heading লাগবে`);
      if (!isArrOf(s?.body, isStr) || !s.body.length) e.push(`sections[${i}].body অনুচ্ছেদের তালিকা হতে হবে`);
    });
  }

  req(isArrOf(v.lessons, isStr) && v.lessons.length >= 2, 'lessons-এ অন্তত দুটি শিক্ষা লাগবে');
  req(isArrOf(v.application, isStr) && v.application.length >= 2, 'application-এ অন্তত দুটি প্রয়োগ লাগবে');
  req(isArrOf(v.tags, isStr) && v.tags.length >= 1, 'অন্তত একটি tag লাগবে');

  req(Array.isArray(v.sources) && v.sources.length >= 2,
    'sources-এ অন্তত দুটি প্রামাণ্য উৎস লাগবে (একাধিক উৎসে যাচাই বাধ্যতামূলক)');
  if (Array.isArray(v.sources)) {
    v.sources.forEach((s, i) => { if (!isStr(s?.label)) e.push(`sources[${i}].label লাগবে`); });
  }

  req(/^\d{4}-\d{2}-\d{2}$/.test(v.verifiedOn ?? ''), 'verifiedOn YYYY-MM-DD আকারে লাগবে');

  if (v.words !== undefined) {
    if (!Array.isArray(v.words)) e.push('words একটি তালিকা হতে হবে');
    else v.words.forEach((w, i) => {
      if (!isStr(w?.ar)) e.push(`words[${i}].ar লাগবে`);
      if (!isStr(w?.bn)) e.push(`words[${i}].bn লাগবে`);
    });
  }

  if (v.hadith !== undefined) {
    if (!Array.isArray(v.hadith)) e.push('hadith একটি তালিকা হতে হবে');
    else v.hadith.forEach((h, i) => {
      if (!isStr(h?.text)) e.push(`hadith[${i}].text লাগবে`);
      if (!isStr(h?.source)) e.push(`hadith[${i}].source লাগবে (সংকলন ও নম্বরসহ)`);
    });
  }

  if (v.related !== undefined) {
    if (!Array.isArray(v.related)) e.push('related একটি তালিকা হতে হবে');
    else v.related.forEach((r, i) => {
      if (!isStr(r?.ref)) e.push(`related[${i}].ref লাগবে`);
      if (!isStr(r?.note)) e.push(`related[${i}].note লাগবে`);
    });
  }

  const expected = `${String(v.surah).padStart(3, '0')}-${String(v.ayah).padStart(3, '0')}.json`;
  if (file && file !== expected) e.push(`ফাইলের নাম "${expected}" হওয়া উচিত`);

  return e;
}

/* সরাসরি চালালে সব ফাইল যাচাই করে */
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = join(ROOT, 'content/verses');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  let bad = 0;
  for (const f of files) {
    let errs;
    try {
      errs = validateVerse(JSON.parse(readFileSync(join(dir, f), 'utf8')), f);
    } catch (err) {
      errs = [`JSON পড়া গেল না — ${err.message}`];
    }
    if (errs.length) { bad++; console.error(`✗ ${f}\n` + errs.map((x) => '   · ' + x).join('\n')); }
  }
  if (bad) { console.error(`\n${bad}টি ফাইলে সমস্যা।`); process.exit(1); }
  console.log(`✓ ${files.length}টি ফাইল — সব ঠিক আছে।`);
}
