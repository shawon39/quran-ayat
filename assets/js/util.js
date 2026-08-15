/** ছোট ছোট সহায়ক ফাংশন। */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** ইংরেজি সংখ্যা → বাংলা সংখ্যা। ৪২ → "৪২" */
export function bn(n) {
  return String(n).replace(/\d/g, (d) => BN_DIGITS[+d]);
}

/** বাংলা (ও আরবি-ইন্ডিক) সংখ্যা → ইংরেজি সংখ্যা, খোঁজার সময় দরকার হয়। */
export function toAsciiDigits(s) {
  return String(s)
    .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/** HTML-এ বসানোর আগে নিরাপদ করা। */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * সীমিত ইনলাইন মার্কআপ: **গাঢ়** ও _হেলানো_।
 * আগে esc() চালানো হয়, তাই কাঁচা HTML ঢুকতে পারে না।
 */
export function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

/** টুকরো দেখানোর আগে **গাঢ়** / _হেলানো_ চিহ্নগুলো তুলে ফেলা। */
export function stripMarks(s) {
  return String(s ?? '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/_(.+?)_/g, '$1');
}

/** খোঁজার জন্য লেখা স্বাভাবিক করা — ছোট হাতের, সংখ্যা ASCII, বাড়তি ফাঁকা মুছে। */
export function norm(s) {
  return toAsciiDigits(String(s ?? ''))
    .toLowerCase()
    .replace(/[‌‍]/g, '')      // জিরো-উইড্‌থ জয়েনার
    .replace(/[’'‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** "২:২৫৫" / "2:255" / "2 255" / "সূরা ২ আয়াত ২৫৫" থেকে রেফারেন্স বের করা। */
export function parseRef(q) {
  const t = toAsciiDigits(q).trim();
  const m = t.match(/(?:^|\D)(\d{1,3})\s*[:：.\-–\s]\s*(\d{1,3})(?:\D|$)/);
  if (!m) return null;
  const surah = +m[1], ayah = +m[2];
  if (surah < 1 || surah > 114 || ayah < 1) return null;
  return { surah, ayah };
}

/** নির্দিষ্ট সময় পরে একবার চালানো। */
export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

let toastTimer;
/** নিচে ছোট বার্তা দেখানো। */
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

/** সেকেন্ড → বাংলা সময়: ৭৫ → "১:১৫" */
export function clock(sec) {
  const t = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  return `${bn(Math.floor(t / 60))}:${bn(String(t % 60).padStart(2, '0'))}`;
}

/** আয়াতের রেফারেন্স বাংলায়: {surah:2, ayah:255} → "২:২৫৫" */
export function refText(v) {
  const a = v.ayahEnd && v.ayahEnd !== v.ayah ? `${bn(v.ayah)}–${bn(v.ayahEnd)}` : bn(v.ayah);
  return `${bn(v.surah)}:${a}`;
}

/** আয়াতের পাতার লিংক। */
export function ayahHref(v) {
  return `#/ayat/${v.surah}/${v.ayah}`;
}
