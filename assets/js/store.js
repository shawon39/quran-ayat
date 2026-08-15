/** প্রিয় আয়াতের তালিকা — ব্রাউজারেই থাকে (localStorage), কোনো সার্ভার নেই। */

const KEY = 'ayat:favourites:v1';
const listeners = new Set();

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* বেসরকারি মোডে লেখা না-ও যেতে পারে — চুপচাপ ছেড়ে দিই */
  }
  listeners.forEach((fn) => fn(list));
}

let cache = read();

export const favourites = {
  all: () => [...cache],
  count: () => cache.length,
  has: (id) => cache.includes(id),

  toggle(id) {
    cache = cache.includes(id) ? cache.filter((x) => x !== id) : [id, ...cache];
    write(cache);
    return cache.includes(id);
  },

  /** অন্য ট্যাবে বদলালে বা তারকা চাপলে জানানো। */
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

window.addEventListener('storage', (e) => {
  if (e.key === KEY) { cache = read(); listeners.forEach((fn) => fn(cache)); }
});
