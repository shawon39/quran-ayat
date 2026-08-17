#!/usr/bin/env node
/**
 * content/verses/*.json → data/verses.json
 *
 * লেখার উৎস একটাই: content/verses/ ফোল্ডারের প্রতিটি আয়াতের নিজস্ব ফাইল।
 * ব্রাউজার পড়ে শুধু data/verses.json — তাই সাইটে একটাই অনুরোধ যায়।
 *
 *   node scripts/build-content.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateVerse } from './validate-content.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'content/verses');

const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
const verses = [];
const problems = [];

for (const file of files) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  } catch (err) {
    problems.push(`${file}: JSON পড়া গেল না — ${err.message}`);
    continue;
  }
  const errs = validateVerse(raw, file);
  if (errs.length) { problems.push(...errs.map((e) => `${file}: ${e}`)); continue; }

  verses.push({ ...raw, id: `${raw.surah}-${raw.ayah}` });
}

if (problems.length) {
  console.error('\n✗ কনটেন্টে সমস্যা:\n' + problems.map((p) => '  · ' + p).join('\n') + '\n');
  process.exit(1);
}

const seen = new Set();
for (const v of verses) {
  if (seen.has(v.id)) { console.error(`✗ একই আয়াত দুবার: ${v.id}`); process.exit(1); }
  seen.add(v.id);
}

verses.sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);

/**
 * “সর্বশেষ হালনাগাদ” — কনটেন্ট থেকেই নেওয়া হয়, বিল্ড চালানোর দিন থেকে নয়।
 *
 * আগে এখানে আজকের তারিখ বসত। ফলে কোনো আয়াত যোগ বা বদল না করলেও প্রতিদিন
 * data/verses.json বদলে যেত, আর CI (যেটি বিল্ড চালিয়ে ফাইলটি মিলিয়ে দেখে)
 * পরদিন থেকেই অকারণে ফেল করত। এখন তারিখটি বদলায় কেবল কনটেন্ট বদলালে।
 */
const updatedAt = verses
  .map((v) => v.addedOn ?? v.verifiedOn ?? '')
  .filter(Boolean)
  .sort()
  .at(-1) ?? '';

writeFileSync(
  join(ROOT, 'data/verses.json'),
  JSON.stringify({
    generatedBy: 'scripts/build-content.mjs',
    generatedAt: updatedAt,
    count: verses.length,
    verses,
  }, null, 2) + '\n',
);

console.log(`✓ data/verses.json — ${verses.length}টি আয়াত (${new Set(verses.map(v => v.surah)).size}টি সূরা)`);
