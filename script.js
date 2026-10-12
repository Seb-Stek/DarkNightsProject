const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Wrap storage so the site still works in private windows / blocked storage
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

/* ---------- Motion ---------- */
// Animation here is for showing what changed: a new page arriving, numbers that matter,
// a list re-sorting, a sky clearing. All of it is skipped for reduced motion.
const motion = !reducedMotion && "IntersectionObserver" in window && "animate" in Element.prototype;
if (motion) document.documentElement.classList.add("js-motion");
const EASE_OUT = "cubic-bezier(.2, .8, .2, 1)";

// Restart a one-shot CSS animation class, e.g. a pop on a button that just changed
function replay(el, cls = "pop") {
  if (!motion || !el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // reflow, so removing and re-adding the class restarts the animation
  el.classList.add(cls);
}

// Swap in a status message with a short fade
function say(el, text) {
  el.textContent = text;
  if (text) replay(el, "text-in");
}

// Count a stat up from zero, keeping its prefix and suffix ("~30%", "600+", "1,452")
function countUp(el) {
  // Remember the real value, in case the page is left and reopened mid-count
  const final = (el.dataset.final ||= el.textContent.trim());
  const m = final.match(/^(\D*?)(\d[\d,]*)(\D*)$/);
  if (!motion || !m || /^(19|20)\d\d$/.test(m[2])) return; // years don't count up
  const [, pre, digits, post] = m;
  const target = Number(digits.replace(/,/g, ""));
  const start = performance.now();
  cancelAnimationFrame(el._count);
  (function tick(now) {
    const p = Math.min(1, (now - start) / 1100);
    const v = Math.round(target * (1 - (1 - p) ** 3));
    el.textContent = pre + (digits.includes(",") ? v.toLocaleString() : v) + post;
    if (p < 1) el._count = requestAnimationFrame(tick);
  })(start);
}

// Content eases up into place as it scrolls into view. It replays whenever a page is
// opened, which also serves as the page transition.
const REVEAL = [
  ".hero h1", ".hero .lede", ".hero .next", ".overview a",
  ".page-head > *", ".section-label", ".section-body > .intro", ".section-body > cite", ".prose p",
  ".scene", ".fade-chart", ".fixture", ".principles li", "#network-stats", ".star-map", ".action",
  ".sim", ".levels li", ".measure-steps li", ".orion", ".near",
  ".steps li", ".adapt", ".timeline li", ".programs > div",
  ".figures > div", ".effects > div", ".pledge-list label", ".pledge-meter", ".tiers li",
  ".host > div", ".host-form", ".staff li", ".faq details", ".pager a",
].join(", ");
// Pieces with a longer inner animation (a line drawing itself) keep their state longer
const SLOW_REVEAL = ".fade-chart, .adapt, .orion";

let revealerAlive = false; // set once the observer reports anything at all
const revealer = motion && new IntersectionObserver((entries) => {
  revealerAlive = true;
  for (const { target: el, isIntersecting } of entries) {
    if (!isIntersecting) continue;
    el.classList.add("in");
    revealer.unobserve(el);
    el.querySelectorAll(":scope > dt, :scope > div > dd").forEach(countUp);
    // Once settled, drop the classes so hover and other transitions behave normally
    const settle = (el.matches(SLOW_REVEAL) ? 3200 : 1000) + Number(el.style.getPropertyValue("--d") || 0) * 80;
    clearTimeout(el._settle);
    el._settle = setTimeout(() => el.classList.remove("reveal", "in"), settle);
  }
}, { rootMargin: "0px 0px -6% 0px", threshold: 0.12 });

function prepareReveal(root) {
  if (!motion || !root) return;
  root.querySelectorAll(REVEAL).forEach((el) => {
    clearTimeout(el._settle);
    // Stagger siblings: each one starts a beat after the one before
    const sibs = [...el.parentElement.children].filter((c) => c.matches(REVEAL));
    el.style.setProperty("--d", Math.min(sibs.indexOf(el), 6));
    el.classList.add("reveal");
    el.classList.remove("in");
    revealer.observe(el);
  });
}
window.addEventListener("pagechange", (e) => {
  prepareReveal(e.detail);
  prepareReveal(document.getElementById("pager"));
});
// Safety net: if the observer never reports (some embedded or unusual browsers), never
// leave content hidden. Just show it all without animation.
if (motion) {
  const failsafe = () => { if (!revealerAlive) document.documentElement.classList.remove("js-motion"); };
  // Background tabs don't report until they're shown, so start counting once visible
  const arm = () => setTimeout(failsafe, 2500);
  if (document.visibilityState === "visible") arm();
  else document.addEventListener("visibilitychange", arm, { once: true });
}

/* ---------- Hero starfield ---------- */
(function heroSky() {
  const canvas = document.getElementById("sky");
  const ctx = canvas.getContext("2d");
  let stars = [], w = 0, h = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = canvas.offsetWidth; h = canvas.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round((w * h) / 3800) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() < 0.04 ? 1.3 : Math.random() * 0.8 + 0.25,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.0012 + 0.0003,
      color: Math.random() < 0.3 ? "#ecc05a" : "#ffffff", // some stars are warm yellow
    }));
    if (reducedMotion) draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = reducedMotion ? 0.6 : 0.35 + 0.35 * Math.sin(t * s.speed + s.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reducedMotion) requestAnimationFrame(draw);
  }

  new ResizeObserver(resize).observe(canvas);
  if (!reducedMotion) requestAnimationFrame(draw);
})();

/* ---------- Mobile nav ---------- */
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
function setMenu(open) {
  navLinks.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", open);
  navToggle.textContent = open ? "Close" : "Menu";
}
navToggle.addEventListener("click", () => setMenu(!navLinks.classList.contains("open")));
navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") setMenu(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && navLinks.classList.contains("open")) { setMenu(false); navToggle.focus(); }
});
document.addEventListener("click", (e) => {
  if (navLinks.classList.contains("open") && !e.target.closest(".nav")) setMenu(false);
});

/* ---------- Shooting star on first scroll ---------- */
// At the top of the home page, the first downward scroll is held for a moment
// while a shooting star crosses the empty sky above the headline.
(function shootingStar() {
  const star = document.getElementById("shooting-star");
  const home = document.getElementById("home");
  const hero = star && star.closest(".hero");
  if (!star || reducedMotion) return;

  const DURATION = 1300;
  const SCROLL_KEYS = ["ArrowDown", "PageDown", " ", "End"];
  let state = "ready"; // ready → playing → done (re-armed when back at the top)
  let touchY = null;

  const atTop = () => !home.hidden && window.scrollY < 12;

  const ctx = star.getContext("2d");
  const TAIL = 0.22; // tail length, as a fraction of the whole path

  function play() {
    state = "playing";
    const dpr = window.devicePixelRatio || 1;
    const w = star.offsetWidth;
    const h = star.offsetHeight;
    star.width = w * dpr;
    star.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // A quadratic curve that rises from the left, peaks high in the empty band
    // above the headline, and comes back down on the right
    const band = parseFloat(getComputedStyle(hero.querySelector(".hero-inner")).paddingTop);
    const p0 = { x: w * (0.04 + Math.random() * 0.08), y: band * (0.6 + Math.random() * 0.1) };
    const p2 = { x: w * (0.84 + Math.random() * 0.1), y: band * (0.65 + Math.random() * 0.1) };
    const peak = band * (0.14 + Math.random() * 0.06);
    // Control point chosen so the curve's highest point lands at `peak`
    const p1 = { x: (p0.x + p2.x) / 2, y: (4 * peak - p0.y - p2.y) / 2 };
    const at = (t) => ({
      x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
      y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
    });
    const ease = (t) => 1 - (1 - t) ** 1.6; // quick start, gentle finish

    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / DURATION);
      const head = ease(p); // keeps moving the whole time; fades out before the end
      const fade = p < 0.1 ? p / 0.1 : p > 0.6 ? (1 - p) / 0.4 : 1;
      ctx.clearRect(0, 0, w, h);

      // Tail: short segments along the curve, thinner and fainter toward the back
      const SEGMENTS = 40;
      for (let i = 0; i < SEGMENTS; i++) {
        const t0 = head - TAIL * (1 - i / SEGMENTS);
        const t1 = head - TAIL * (1 - (i + 1) / SEGMENTS);
        if (t1 < 0 || t0 > 1) continue;
        const a = at(Math.max(0, t0));
        const b = at(Math.min(1, t1));
        const k = (i + 1) / SEGMENTS;
        ctx.strokeStyle = `rgba(236, 192, 90, ${0.85 * k * k * fade})`;
        ctx.lineWidth = 0.4 + 2 * k;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Head with a soft yellow glow
      if (head <= 1) {
        const { x, y } = at(head);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 14);
        glow.addColorStop(0, `rgba(255, 255, 255, ${fade})`);
        glow.addColorStop(0.25, `rgba(236, 192, 90, ${0.7 * fade})`);
        glow.addColorStop(1, "rgba(236, 192, 90, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      if (p < 1) requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, w, h); state = "done"; }
    }
    requestAnimationFrame(frame);
    // Never hold scrolling longer than the animation, even if frames stall
    setTimeout(() => { if (state === "playing") state = "done"; }, DURATION + 300);
  }

  // Swallow the scroll (and start the star) while it's ready or still flying
  function intercept(e) {
    if (state === "playing") { e.preventDefault(); return; }
    if (state === "ready" && atTop()) { e.preventDefault(); play(); }
  }

  window.addEventListener("wheel", (e) => { if (e.deltaY > 0 && !e.ctrlKey) intercept(e); }, { passive: false }); // ctrlKey = pinch-zoom

  window.addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    // Finger moving up means the page would scroll down
    if (touchY !== null && touchY - e.touches[0].clientY > 4) intercept(e);
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (!SCROLL_KEYS.includes(e.key) || e.target.closest("input, textarea, select, button, [contenteditable]")) return;
    intercept(e);
  });

  // Back at the top of the home page: the next scroll plays it again
  window.addEventListener("scroll", () => { if (state === "done" && atTop()) state = "ready"; }, { passive: true });
  window.addEventListener("hashchange", () => { if (state === "done") state = "ready"; });
})();

/* ---------- Pages ---------- */
// Each top-level section is its own page; the URL hash picks which one is shown.
(function pages() {
  const pages = [...document.querySelectorAll(".page")];
  // Footer pages (About, Staff, FAQ) sit outside the Previous / Next sequence
  const sequence = pages.filter((p) => !p.hasAttribute("data-footer"));
  const pager = document.getElementById("pager");
  let current = null;

  function show() {
    const hash = decodeURIComponent(location.hash.slice(1));
    const target = (hash && document.getElementById(hash)) || pages[0];
    const page = target.closest(".page") || pages[0];
    const changed = page !== current;

    if (changed) {
      current = page;
      pages.forEach((p) => (p.hidden = p !== page));
      document.querySelectorAll(".nav-links a, .footer-links a").forEach((a) => {
        a.toggleAttribute("aria-current", a.getAttribute("href") === "#" + page.id);
        if (a.hasAttribute("aria-current")) a.setAttribute("aria-current", "page");
      });
      document.title = page.id === "home" ? "Dark Nights Project" : `${page.dataset.title} · Dark Nights Project`;
      renderPager(sequence.indexOf(page));
      window.dispatchEvent(new CustomEvent("pagechange", { detail: page }));
    }

    if (target !== page) target.scrollIntoView({ behavior: changed ? "instant" : "smooth" });
    else if (changed) window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderPager(i) {
    pager.innerHTML = "";
    if (i <= 0) return; // home has its own overview links; footer pages have none
    const link = (p, cls, label) => {
      const a = document.createElement("a");
      a.href = "#" + p.id;
      a.className = cls;
      a.innerHTML = `<span class="label"></span><span class="pager-title"></span>`;
      a.querySelector(".label").textContent = label;
      a.querySelector(".pager-title").textContent = p.dataset.title;
      pager.appendChild(a);
    };
    if (i > 1) link(sequence[i - 1], "prev-page", "← Previous");
    if (i < sequence.length - 1) link(sequence[i + 1], "next-page", "Next →");
  }

  window.addEventListener("hashchange", show);
  show();
})();

/* ---------- New moon dates → Dark Night dates ---------- */
// Dark Nights are held on the Saturday nearest each new moon, starting at 9 PM local time.
const SYNODIC_MONTH = 29.530588853; // days
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // reference new moon
const DAY = 86400000;

function upcomingDarkNights(count) {
  const now = Date.now();
  const cyclesSince = Math.floor((now - KNOWN_NEW_MOON) / (SYNODIC_MONTH * DAY));
  const nights = [];
  for (let i = cyclesSince; nights.length < count; i++) {
    const newMoon = new Date(KNOWN_NEW_MOON + i * SYNODIC_MONTH * DAY);
    const sat = new Date(newMoon.getFullYear(), newMoon.getMonth(), newMoon.getDate(), 21, 0, 0);
    const offset = (6 - sat.getDay() + 7) % 7; // days to next Saturday
    sat.setDate(sat.getDate() + (offset > 3 ? offset - 7 : offset)); // nearest Saturday
    if (sat.getTime() > now) nights.push(sat);
  }
  return nights;
}

const darkNights = upcomingDarkNights(4);
const fmtLong = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const fmtShort = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });

/* ---------- Countdown ---------- */
(function countdown() {
  const target = darkNights[0];
  document.getElementById("next-date").textContent = fmtLong.format(target) + ", 9 pm";
  const out = document.getElementById("next-in");
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  function tick() {
    const diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / DAY);
    const h = Math.floor((diff % DAY) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    out.textContent = d > 0
      ? `In ${plural(d, "day")}, ${plural(h, "hour")}`
      : diff > 0 ? `Tonight, in ${plural(h, "hour")} ${plural(m, "minute")}` : "Happening now";
  }
  tick();
  setInterval(tick, 30000);
})();

/* ---------- Bortle scale simulator ---------- */
(function simulator() {
  const BORTLE = [
    null,
    { name: "Excellent Dark Site", count: 7500, desc: "The Milky Way is bright enough to cast faint shadows. You can barely see your own hand." },
    { name: "Typical Dark Site", count: 5000, desc: "The Milky Way shows detailed structure. Clouds look like black holes cut out of the stars." },
    { name: "Rural Sky", count: 3000, desc: "A little glow from towns on the horizon. Overhead, the Milky Way still looks textured." },
    { name: "Rural to Suburban", count: 1500, desc: "Glow from towns in several directions. The Milky Way is visible but flat and washed out." },
    { name: "Suburban Sky", count: 800, desc: "The Milky Way is faint overhead and gone near the horizon. Clouds are brighter than the sky behind them." },
    { name: "Bright Suburban Sky", count: 450, desc: "The Milky Way is only visible straight up, if at all. The horizon glows gray." },
    { name: "Suburban to Urban", count: 250, desc: "The whole sky has a gray-orange cast. The Milky Way is gone." },
    { name: "City Sky", count: 100, desc: "The sky glows. You can trace the brightest constellations and not much else. This is where most people live." },
    { name: "City Center", count: 30, desc: "The Moon, a few planets and a handful of the brightest stars." },
  ];

  const canvas = document.getElementById("sim-canvas");
  const ctx = canvas.getContext("2d");
  const slider = document.getElementById("bortle");
  let w = 0, h = 0;

  // Stars sorted brightest-first; higher Bortle levels draw only the brightest slice.
  const SIM_STARS = 2400;
  const stars = Array.from({ length: SIM_STARS }, () => {
    const inBand = Math.random() < 0.45;
    const x = Math.random();
    // Milky Way band runs diagonally across the frame
    const y = inBand ? 0.9 - x * 0.75 + (Math.random() - 0.5) * 0.22 : Math.random();
    return { x, y, b: Math.pow(Math.random(), 3) };
  }).sort((a, b) => b.b - a.b);

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = canvas.offsetWidth; h = canvas.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(shown);
  }

  // The level being drawn. It glides toward the slider's value, so stars fade in and out
  // instead of jumping, and is fractional partway through a glide.
  let shown = Number(slider.value);
  let glide = 0;

  // Star counts run from 30 to 7,500, so blend between levels on a log scale
  function countAt(lv) {
    const lo = Math.floor(lv), hi = Math.min(9, lo + 1), f = lv - lo;
    return Math.exp(Math.log(BORTLE[lo].count) * (1 - f) + Math.log(BORTLE[hi].count) * f);
  }

  function draw(lv) {
    const pollution = (lv - 1) / 8; // 0..1

    // Sky goes from deep navy to the dull warm gray of a lit-up city sky
    const top = mix([6, 10, 24], [52, 50, 48], pollution);
    const bottom = mix([19, 33, 63], [170, 150, 128], pollution);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgb(top));
    g.addColorStop(1, rgb(bottom));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Milky Way glow (fades out by Bortle 5-6)
    const mwAlpha = Math.max(0, 1 - pollution * 1.9) * 0.28;
    if (mwAlpha > 0) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.atan2(0.75 * h, w));
      const band = ctx.createLinearGradient(0, -h * 0.18, 0, h * 0.18);
      band.addColorStop(0, "rgba(235,232,225,0)");
      band.addColorStop(0.5, `rgba(235,232,225,${mwAlpha})`);
      band.addColorStop(1, "rgba(235,232,225,0)");
      ctx.fillStyle = band;
      ctx.fillRect(-w, -h * 0.18, w * 2, h * 0.36);
      ctx.restore();
    }

    // Stars: a mix of white and warm yellow. The last one partly drawn, so stars fade in one by one.
    const visible = SIM_STARS * (countAt(lv) / 7500);
    for (let i = 0; i < Math.ceil(visible); i++) {
      const s = stars[i];
      ctx.fillStyle = i % 3 === 0 ? "#ecc05a" : "#ffffff";
      ctx.globalAlpha = Math.min(1, 0.35 + s.b) * Math.min(1, visible - i);
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, 0.4 + s.b * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Skyglow dome above the skyline
    if (pollution > 0) {
      const dome = ctx.createRadialGradient(w / 2, h * 1.1, 0, w / 2, h * 1.1, h * 0.95);
      dome.addColorStop(0, `rgba(220,190,150,${0.7 * pollution})`);
      dome.addColorStop(1, "rgba(220,190,150,0)");
      ctx.fillStyle = dome;
      ctx.fillRect(0, 0, w, h);
    }
  }

  const countEl = document.getElementById("sim-count");
  const descEl = document.getElementById("sim-desc");

  function showLevel(level) {
    const info = BORTLE[level];
    document.getElementById("sim-class").textContent = "Bortle " + level;
    document.getElementById("sim-name").textContent = info.name;
    if (descEl.textContent !== info.desc) say(descEl, info.desc);
    slider.setAttribute("aria-valuetext", `Bortle ${level}, ${info.name}`);
    levelButtons.forEach((b, i) => b.setAttribute("aria-pressed", i + 1 === level));

    // Glide from wherever the sky is now; the star count rolls along with it
    cancelAnimationFrame(glide);
    const from = shown, start = performance.now();
    const duration = motion ? 300 + 120 * Math.abs(level - from) : 0;
    (function step(now) {
      const p = duration ? Math.min(1, (now - start) / duration) : 1;
      shown = from + (level - from) * (1 - (1 - p) ** 3);
      draw(shown);
      countEl.textContent = (p < 1 ? Math.round(countAt(shown)) : info.count).toLocaleString();
      if (p < 1) glide = requestAnimationFrame(step);
    })(start);
  }

  function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
  function rgb(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }

  // Clickable list of every level, kept in sync with the slider
  const levelButtons = BORTLE.slice(1).map((info, i) => {
    const level = i + 1;
    const li = document.createElement("li");
    li.innerHTML = `<button type="button"><span class="lvl-num"></span><span class="lvl-name"></span><span class="lvl-desc"></span><span class="lvl-count"></span></button>`;
    const btn = li.querySelector("button");
    btn.querySelector(".lvl-num").textContent = level;
    btn.querySelector(".lvl-name").textContent = info.name;
    btn.querySelector(".lvl-desc").textContent = info.desc;
    btn.querySelector(".lvl-count").textContent = `~${info.count.toLocaleString()} stars`;
    btn.addEventListener("click", () => {
      slider.value = level;
      document.getElementById("simulator").scrollIntoView({ behavior: motion ? "smooth" : "auto" });
      // Let the scroll land first so the change happens where it can be seen
      setTimeout(() => showLevel(level), motion ? 350 : 0);
    });
    document.getElementById("levels").appendChild(li);
    return btn;
  });

  slider.addEventListener("input", () => showLevel(Number(slider.value)));
  showLevel(shown);
  new ResizeObserver(resize).observe(canvas);
})();

/* ---------- Events ---------- */
const BASE_EVENTS = [
  { city: "Flagstaff, AZ", place: "Buffalo Park", region: "United States", lat: 35.198, lon: -111.651, baseRsvp: 412 },
  { city: "Toronto, ON", place: "Trinity Bellwoods Park", region: "Canada", lat: 43.653, lon: -79.383, baseRsvp: 287 },
  { city: "Austin, TX", place: "Zilker Park, Great Lawn", region: "United States", lat: 30.267, lon: -97.743, baseRsvp: 198 },
  { city: "Bristol", place: "Brandon Hill", region: "United Kingdom", lat: 51.455, lon: -2.588, baseRsvp: 156 },
  { city: "Portland, OR", place: "Mt. Tabor summit", region: "United States", lat: 45.515, lon: -122.678, baseRsvp: 233 },
  { city: "Utrecht", place: "Griftpark", region: "Netherlands", lat: 52.091, lon: 5.121, baseRsvp: 141 },
  { city: "Denver, CO", place: "Cheesman Park", region: "United States", lat: 39.739, lon: -104.990, baseRsvp: 175 },
  { city: "Melbourne", place: "Royal Park", region: "Australia", lat: -37.814, lon: 144.963, baseRsvp: 264 },
  // Around Princeton, NJ
  { city: "Princeton, NJ", place: "Princeton Battlefield State Park", region: "United States", lat: 40.330, lon: -74.677, baseRsvp: 126 },
  { city: "Princeton, NJ", place: "Herrontown Woods, upper meadow", region: "United States", lat: 40.383, lon: -74.640, baseRsvp: 58 },
  { city: "West Windsor, NJ", place: "Mercer County Park, Festival Grounds", region: "United States", lat: 40.268, lon: -74.633, baseRsvp: 203 },
  { city: "Titusville, NJ", place: "Washington Crossing State Park", region: "United States", lat: 40.312, lon: -74.866, baseRsvp: 94 },
];

const rsvps = new Set(store.get("dn-rsvps", []));
const hostedEvents = store.get("dn-hosted", []);
let origin = null; // { lat, lon, label } once the visitor searches for a town

// Miles for US/UK visitors, kilometers for everyone else
const useMiles = /-(US|GB|LR|MM)$/i.test(navigator.language);
const formatDistance = (km) => useMiles
  ? `${Math.round(km * 0.621371).toLocaleString()} mi`
  : `${Math.round(km).toLocaleString()} km`;

function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// US state and Canadian province abbreviations, as people type them after a town name
const REGION_ABBR = Object.fromEntries(Object.entries({
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick",
  NL: "Newfoundland and Labrador", NS: "Nova Scotia", ON: "Ontario", PE: "Prince Edward Island",
  QC: "Quebec", SK: "Saskatchewan",
}).map(([abbr, name]) => [abbr.toLowerCase(), name.toLowerCase()]));

// Free, keyless geocoder: https://open-meteo.com/en/docs/geocoding-api
// Returns every town matching the name, biggest first.
async function searchPlaces(query, count = 10) {
  // The API matches on place name only, so drop any ", State" / ", Country" suffix
  const name = query.split(",")[0].trim();
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=${count}&language=en&format=json&name=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const { results = [] } = await res.json();

  // If the visitor typed a state or country after the comma, put matches on it first.
  // "NJ" -> "new jersey", so abbreviations match the API's full state names.
  const typed = query.split(",").slice(1).join(" ").trim().toLowerCase();
  const hint = REGION_ABBR[typed] || typed;
  const matchesHint = (r) => [r.admin1, r.country, r.country_code]
    .some((v) => v && (v.toLowerCase() === hint || v.toLowerCase().startsWith(hint)));
  if (hint) results.sort((a, b) => matchesHint(b) - matchesHint(a));

  const seen = new Set();
  return results
    .map((r) => ({
      lat: r.latitude,
      lon: r.longitude,
      name: r.name,
      // County is what tells apart same-named towns within one state
      detail: [r.admin2, r.admin1, r.country].filter((v, i, arr) => v && v !== r.name && arr.indexOf(v) === i).join(", "),
      label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    }))
    .filter((p) => {
      const key = p.name + "|" + p.detail;
      return !seen.has(key) && seen.add(key);
    });
}

async function geocode(query) {
  const [best] = await searchPlaces(query);
  return best || null;
}

function allEvents() {
  const generated = BASE_EVENTS.map((e, i) => ({
    ...e,
    id: "base-" + i,
    date: darkNights[i % 2], // spread across the next two Dark Nights
  }));
  const hosted = hostedEvents.map((e) => ({ ...e, date: new Date(e.date), baseRsvp: 0, region: "Hosted by you" }));
  const events = [...hosted, ...generated];

  if (!origin) return events.sort((a, b) => a.date - b.date);
  // Closest first; anything we couldn't locate goes to the end
  for (const e of events) e.km = e.lat != null ? distanceKm(origin, e) : Infinity;
  return events.sort((a, b) => a.km - b.km || a.date - b.date);
}

// `pop`: id of an event whose RSVP just changed. `flash`: id of a newly added event.
function renderEvents({ pop, flash } = {}) {
  const list = document.getElementById("events-list");
  const events = allEvents();
  // Remember where each row was, so rows can glide to their new places (FLIP)
  const before = new Map();
  const visible = motion && list.offsetParent !== null;
  if (visible) list.querySelectorAll(".event").forEach((r) => before.set(r.dataset.id, r.getBoundingClientRect().top));
  const focused = document.activeElement?.closest?.(".event")?.dataset.id;
  list.innerHTML = "";
  events.forEach((e, i) => {
    const going = rsvps.has(e.id);
    const row = document.createElement("li");
    row.dataset.id = e.id;
    row.className = "event" + (origin && i === 0 && e.km !== Infinity ? " is-closest" : "");
    row.innerHTML = `
      <span class="event-date"></span>
      <span class="event-city"><span></span><small></small></span>
      <span class="event-place"></span>
      <span class="event-count"></span>
      <button class="btn btn-line" type="button"></button>`;
    // user-entered text goes in via textContent
    row.querySelector(".event-date").textContent = fmtShort.format(e.date);
    row.querySelector(".event-city span").textContent = e.city;
    row.querySelector(".event-city small").textContent =
      origin && e.km !== Infinity ? `${e.region} · ${formatDistance(e.km)} away` : e.region;
    row.querySelector(".event-place").textContent = e.place;
    row.querySelector(".event-count").textContent = `${(e.baseRsvp + (going ? 1 : 0)).toLocaleString()} going`;
    const btn = row.querySelector("button");
    btn.textContent = going ? "Going" : "RSVP";
    btn.classList.toggle("is-on", going);
    btn.setAttribute("aria-pressed", going);
    btn.addEventListener("click", () => {
      rsvps.has(e.id) ? rsvps.delete(e.id) : rsvps.add(e.id);
      store.set("dn-rsvps", [...rsvps]);
      renderEvents({ pop: e.id });
    });
    list.appendChild(row);
  });
  document.getElementById("events-empty").hidden = events.length > 0;

  const rowFor = (id) => list.querySelector(`.event[data-id="${CSS.escape(id)}"]`);
  // Re-rendering replaces the buttons, so put keyboard focus back where it was
  if (focused) rowFor(focused)?.querySelector("button").focus({ preventScroll: true });
  if (pop) replay(rowFor(pop)?.querySelector("button"));
  if (flash) replay(rowFor(flash), "is-new");

  if (!visible || !before.size) return;
  list.querySelectorAll(".event").forEach((row) => {
    const old = before.get(row.dataset.id);
    if (old === undefined) return;
    const dy = old - row.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) {
      row.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }],
        { duration: Math.min(900, 450 + Math.abs(dy) / 4), easing: EASE_OUT });
    }
  });
}

(function nearSearch() {
  const form = document.getElementById("near-form");
  const input = document.getElementById("near-input");
  const status = document.getElementById("near-status");
  const clearBtn = document.getElementById("near-clear");

  function setOrigin(o) {
    origin = o;
    clearBtn.hidden = !o;
    renderEvents();
    if (!o) { say(status, ""); return; }
    const closest = allEvents()[0];
    say(status, closest && closest.km !== Infinity
      ? `Closest to ${o.label}: ${closest.city}, ${formatDistance(closest.km)} away.`
      : `Sorted by distance from ${o.label}.`);
  }

  /* Suggestions dropdown: every town matching what's typed */
  const listbox = document.getElementById("near-suggestions");
  let suggestions = [];
  let active = -1;
  let debounce = null;
  let requestId = 0;

  function closeSuggestions() {
    listbox.hidden = true;
    listbox.innerHTML = "";
    suggestions = [];
    active = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function highlight(i) {
    active = i;
    [...listbox.children].forEach((li, j) => li.setAttribute("aria-selected", j === i));
    if (i >= 0) {
      input.setAttribute("aria-activedescendant", listbox.children[i].id);
      listbox.children[i].scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function choose(place) {
    input.value = place.label;
    closeSuggestions();
    setOrigin(place);
  }

  function showSuggestions(places) {
    suggestions = places;
    listbox.innerHTML = "";
    if (!places.length) {
      const li = document.createElement("li");
      li.className = "near-none";
      li.textContent = "No towns found with that name";
      listbox.appendChild(li);
    }
    places.forEach((p, i) => {
      const li = document.createElement("li");
      li.id = "near-option-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      li.innerHTML = `<span class="near-name"></span><span class="near-detail"></span>`;
      li.querySelector(".near-name").textContent = p.name;
      li.querySelector(".near-detail").textContent = p.detail;
      // mousedown fires before the input loses focus, so the click isn't lost
      li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(p); });
      li.addEventListener("mousemove", () => active !== i && highlight(i));
      listbox.appendChild(li);
    });
    listbox.hidden = false;
    input.setAttribute("aria-expanded", "true");
    active = -1;
  }

  input.addEventListener("input", () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    if (q.length < 2) { closeSuggestions(); return; }
    debounce = setTimeout(async () => {
      const id = ++requestId;
      try {
        const places = await searchPlaces(q, 20);
        if (id === requestId && input.value.trim() === q) showSuggestions(places);
      } catch {
        closeSuggestions(); // the Find closest button still reports connection problems
      }
    }, 250);
  });

  input.addEventListener("keydown", (e) => {
    if (listbox.hidden || !suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); highlight((active + 1) % suggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight(active <= 0 ? suggestions.length - 1 : active - 1); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(suggestions[active]); }
    else if (e.key === "Escape") { e.preventDefault(); closeSuggestions(); }
  });

  input.addEventListener("blur", closeSuggestions);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearTimeout(debounce);
    requestId++; // drop any suggestions still loading
    closeSuggestions();
    const q = input.value.trim();
    if (!q) return;
    say(status, "Looking up " + q + "…");
    try {
      const place = await geocode(q);
      if (place) setOrigin(place);
      else say(status, `Couldn't find a town called "${q}". Try adding the state or country.`);
    } catch {
      say(status, "Couldn't look that town up right now. Check your connection and try again.");
    }
  });

  document.getElementById("near-locate").addEventListener("click", () => {
    if (!navigator.geolocation) { say(status, "Your browser doesn't support location."); return; }
    say(status, "Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        input.value = "";
        setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "your location" });
      },
      () => { say(status, "Couldn't get your location. Type your town instead."); },
      { timeout: 10000 }
    );
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    setOrigin(null);
  });
})();

renderEvents();

/* ---------- Pledge ---------- */
(function pledge() {
  const form = document.getElementById("pledge-form");
  const boxes = [...form.querySelectorAll("input")];
  const sky = document.getElementById("meter-sky");
  const saved = new Set(store.get("dn-pledge", []));
  const BASE_TOTAL = 3842;
  const messages = [
    "Each box you tick clears a little more of the sky.",
    "A few of the brighter stars.",
    "The glow is thinning.",
    "Constellations you can actually trace.",
    "Faint stars filling in the gaps.",
    "Close to a rural sky.",
    "Almost there.",
    "As dark as your street can get. Thank you.",
  ];

  // Stars sit behind a haze layer that thins as boxes are ticked
  for (let i = 0; i < 90; i++) {
    const s = document.createElement("i");
    s.style.left = Math.random() * 100 + "%";
    s.style.top = Math.random() * 100 + "%";
    s.style.opacity = (0.3 + Math.random() * 0.7).toFixed(2);
    if (Math.random() < 0.1) s.style.width = s.style.height = "3px";
    s.style.setProperty("--tw", (-Math.random() * 4).toFixed(2) + "s"); // twinkle out of step
    sky.appendChild(s);
  }

  boxes.forEach((b) => (b.checked = saved.has(b.value)));

  const msg = document.getElementById("meter-msg");
  function update(e) {
    const checked = boxes.filter((b) => b.checked);
    const t = checked.length / boxes.length;
    sky.style.setProperty("--haze", (1 - t) * 0.95);
    document.getElementById("meter-pct").textContent = checked.length;
    if (msg.textContent !== messages[checked.length]) say(msg, messages[checked.length]);
    document.getElementById("pledge-total").textContent = (BASE_TOTAL + (checked.length ? 1 : 0)).toLocaleString();
    store.set("dn-pledge", checked.map((b) => b.value));
    if (e) replay(document.querySelector(".meter-count")); // only when the visitor ticks something
  }

  form.addEventListener("change", update);
  update();
})();

/* ---------- Host form ---------- */
(function host() {
  const form = document.getElementById("host-form");
  const select = document.getElementById("host-date");
  const note = document.getElementById("host-note");

  darkNights.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.toISOString();
    opt.textContent = fmtLong.format(d);
    select.appendChild(opt);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const event = {
      id: "hosted-" + Date.now(),
      city: data.city.trim(),
      place: data.place.trim(),
      date: data.date,
    };
    // Locate the town so it can show up in "closest to me" searches
    say(note, "Saving…");
    try {
      const loc = await geocode(event.city);
      if (loc) Object.assign(event, { lat: loc.lat, lon: loc.lon });
    } catch {}
    hostedEvents.push(event);
    store.set("dn-hosted", hostedEvents);
    rsvps.add(event.id);
    store.set("dn-rsvps", [...rsvps]);
    renderEvents({ flash: event.id });
    say(note, `Thanks, ${data.name.trim()}. ${event.city} is now on the events list.`);
    form.reset();
  });
})();

/* ---------- Donate (simulated) ---------- */
document.getElementById("donate-btn").addEventListener("click", () => {
  say(document.getElementById("donate-note"), "This is a demo site, so no payment is taken.");
});

/* ---------- Shared SVG helpers ---------- */
const SVG_NS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}
// Seeded random, so decorative skies look the same on every visit
function seededRandom(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

/* ---------- Home: flip the switch ---------- */
(function scene() {
  const fig = document.getElementById("scene");
  const btn = document.getElementById("scene-toggle");
  const note = document.getElementById("scene-note");
  const rand = seededRandom(7);

  // A handful of bright stars make it through the glow
  const bright = document.getElementById("scene-bright");
  for (let i = 0; i < 14; i++) {
    svgEl("circle", { cx: rand() * 1000, cy: rand() * 300, r: 1.4 + rand(), fill: "#fff", opacity: 0.9 }, bright);
  }
  // The faint ones only appear in the dark, bunched along the Milky Way band
  const faint = document.getElementById("scene-faint");
  const slope = Math.tan((18 * Math.PI) / 180);
  for (let i = 0; i < 320; i++) {
    const x = rand() * 1000;
    const inBand = rand() < 0.55;
    const y = inBand ? 150 - slope * (x - 560) + (rand() - 0.5) * 90 : rand() * 340;
    if (y < 0 || y > 345) continue;
    svgEl("circle", { cx: x, cy: y, r: 0.5 + rand() * 0.9, fill: "#e8ecff", opacity: (0.3 + rand() * 0.6).toFixed(2) }, faint);
  }

  // Lights go out one after another down the street, then the glow fades, then the
  // Milky Way comes out: the order it actually happens on a Dark Night.
  function stagger(dark) {
    if (!motion) return;
    const step = dark ? 220 : 120;
    fig.querySelectorAll(".sc-off").forEach((el) => {
      const b = el.getBBox();
      const order = b.width > 600 ? 4 : Math.min(3, Math.floor((b.x + b.width / 2) / 220));
      el.style.transitionDelay = order * step + "ms";
    });
    fig.querySelector(".sc-sign").style.transitionDelay = 3 * step + "ms";
    fig.querySelectorAll(".sc-dark").forEach((el) => (el.style.transitionDelay = dark ? "1100ms" : "0ms"));
  }

  btn.addEventListener("click", () => {
    const dark = !fig.classList.contains("is-dark");
    stagger(dark);
    fig.classList.toggle("is-dark", dark);
    btn.textContent = dark ? "Switch back on" : "Switch off";
    btn.setAttribute("aria-pressed", dark);
    say(note, dark
      ? "Dark Night. Only the shielded streetlight stays on, so the path is still lit and the Milky Way comes back."
      : "Every light on. The glow hides all but a handful of bright stars.");
  });
})();

/* ---------- Home: a sky fading in one childhood ---------- */
// Kyba et al. (2023): a child born where 250 stars are visible would see about 100 by age 18.
(function fadingChart() {
  const box = document.getElementById("fade-chart");
  const START = 250, END = 100, YEARS = 18;
  const starsAt = (age) => START * Math.pow(END / START, age / YEARS);

  const W = 720, H = 300, m = { l: 40, r: 20, t: 24, b: 34 };
  const x = (age) => m.l + (age / YEARS) * (W - m.l - m.r);
  const y = (v) => H - m.b - (v / START) * (H - m.t - m.b);
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img",
    "aria-label": "Line chart: visible stars fall from 250 at birth to about 158 at age 9 and 100 at age 18." }, box);

  const grid = svgEl("g", { class: "grid" }, svg);
  const axis = svgEl("g", { class: "axis" }, svg);
  for (let v = 0; v <= START; v += 50) {
    svgEl("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, grid);
    svgEl("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end" }, axis).textContent = v;
  }
  for (let a = 0; a <= YEARS; a += 3) {
    svgEl("text", { x: x(a), y: H - 10, "text-anchor": a === 0 ? "start" : a === YEARS ? "end" : "middle" }, axis)
      .textContent = a === 0 ? "BORN" : "AGE " + a;
  }

  const pts = [];
  for (let a = 0; a <= YEARS + 1e-9; a += 0.25) pts.push([x(a), y(starsAt(a))]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  svgEl("path", { class: "area", d: `${line} L ${x(YEARS)} ${y(0)} L ${x(0)} ${y(0)} Z` }, svg);
  svgEl("path", { class: "line", d: line, pathLength: 1 }, svg); // pathLength lets CSS draw it in

  // Selective direct labels: start, middle, end
  [[0, "at birth", "start", 10], [9, "age 9", "middle", 0], [18, "age 18", "end", -10]].forEach(([age, sub, anchor, dx]) => {
    const v = Math.round(starsAt(age));
    svgEl("circle", { class: "pt", cx: x(age), cy: y(v), r: 5 }, svg);
    const t = svgEl("text", { class: "pt-label", x: x(age) + dx, y: y(v) - 26, "text-anchor": anchor }, svg);
    t.textContent = v + " stars";
    svgEl("tspan", { class: "sub", x: x(age) + dx, dy: 14 }, t).textContent = sub.toUpperCase();
  });

  // Crosshair + tooltip
  const cross = svgEl("line", { class: "cross", y1: m.t, y2: H - m.b, visibility: "hidden" }, svg);
  const marker = svgEl("circle", { class: "pt", r: 5, visibility: "hidden" }, svg);
  const hit = svgEl("rect", { class: "hit", x: m.l, y: 0, width: W - m.l - m.r, height: H }, svg);
  const tip = document.createElement("div");
  tip.className = "chart-tip";
  tip.hidden = true;
  box.appendChild(tip);

  function show(evt) {
    const r = svg.getBoundingClientRect();
    const scale = r.width / W;
    const vx = (evt.clientX - r.left) / scale;
    const age = Math.max(0, Math.min(YEARS, Math.round(((vx - m.l) / (W - m.l - m.r)) * YEARS)));
    const v = Math.round(starsAt(age));
    for (const el of [cross, marker]) el.setAttribute("visibility", "visible");
    cross.setAttribute("x1", x(age)); cross.setAttribute("x2", x(age));
    marker.setAttribute("cx", x(age)); marker.setAttribute("cy", y(v));
    tip.hidden = false;
    tip.innerHTML = `<span>${age === 0 ? "Born" : "Age " + age}</span><b>${v} stars visible</b>`;
    tip.style.left = x(age) * scale + "px";
    tip.style.top = y(v) * scale + "px";
  }
  function hide() {
    for (const el of [cross, marker]) el.setAttribute("visibility", "hidden");
    tip.hidden = true;
  }
  hit.addEventListener("pointermove", show);
  hit.addEventListener("pointerdown", show);
  hit.addEventListener("pointerleave", hide);

  const tbody = document.querySelector("#fade-table tbody");
  for (let a = 0; a <= YEARS; a += 3) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${a === 0 ? "Birth" : a}</td><td>${Math.round(starsAt(a))}</td>`;
    tbody.appendChild(tr);
  }
})();

/* ---------- Home: every Dark Night, on a real map ---------- */
// Leaflet + Esri's keyless dark-gray basemap, so land, water and place names show.
(function eventMap() {
  const box = document.getElementById("event-map");
  const stats = document.getElementById("network-stats");
  const jumps = document.getElementById("map-jumps");
  const gold = getComputedStyle(document.documentElement).getPropertyValue("--star").trim() || "#ecc05a";
  const CLUSTER_KM = 80; // about 50 miles
  let map = null, layer = null, fitted = false, allBounds = null;

  if (!window.L) {
    box.classList.add("is-offline");
    box.textContent = "The map couldn't load. Check your connection, or see the full list of Dark Nights on the Locations page.";
  }

  function renderStats(events) {
    const going = events.reduce((n, e) => n + e.baseRsvp + (rsvps.has(e.id) ? 1 : 0), 0);
    const countries = new Set(events.map((e) => e.region).filter((r) => r !== "Hosted by you"));
    stats.innerHTML = "";
    [[events.length, "Dark Nights scheduled"], [going.toLocaleString(), "People going"], [countries.size, "Countries"]].forEach(([v, k]) => {
      const div = document.createElement("div");
      div.innerHTML = `<dt class="label"></dt><dd></dd>`;
      div.querySelector("dt").textContent = k;
      div.querySelector("dd").textContent = v;
      stats.appendChild(div);
    });
  }

  function popup(e, going) {
    const el = document.createElement("div");
    el.className = "map-pop";
    el.innerHTML = `<span class="label"></span><strong></strong><span class="map-pop-place"></span><span class="label map-pop-going"></span><a href="#locations">RSVP on the events list</a>`;
    el.querySelector(".label").textContent = fmtShort.format(e.date) + " · 9 pm";
    el.querySelector("strong").textContent = e.city;
    el.querySelector(".map-pop-place").textContent = e.place;
    el.querySelector(".map-pop-going").textContent = `${going.toLocaleString()} going`;
    return el;
  }

  // Quick jumps: everything, each country, and any town with several Dark Nights nearby
  function renderJumps(events) {
    const areas = [["All Dark Nights", events]];
    const byCountry = new Map();
    for (const e of events) {
      if (e.region === "Hosted by you") continue;
      if (!byCountry.has(e.region)) byCountry.set(e.region, []);
      byCountry.get(e.region).push(e);
    }
    for (const [country, list] of byCountry) areas.push([country, list]);
    const clusters = [];
    for (const e of events) {
      const c = clusters.find((c) => distanceKm(c[0], e) < CLUSTER_KM);
      c ? c.push(e) : clusters.push([e]);
    }
    for (const c of clusters) if (c.length > 1) areas.push([`${c[0].city.split(",")[0]} area (${c.length})`, c]);

    jumps.innerHTML = "";
    areas.forEach(([name, list], i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "map-jump";
      b.textContent = name;
      b.setAttribute("aria-pressed", i === 0);
      b.addEventListener("click", () => {
        jumps.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
        const bounds = L.latLngBounds(list.map((e) => [e.lat, e.lon]));
        map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 11, duration: reducedMotion ? 0 : 1.2 });
      });
      jumps.appendChild(b);
    });
  }

  function render() {
    const events = allEvents().filter((e) => e.lat != null);
    renderStats(events);
    if (!window.L) return;

    if (!map) {
      map = L.map(box, { worldCopyJump: true, scrollWheelZoom: false, zoomSnap: 0.5, minZoom: 1.5, maxZoom: 16 });
      const esri = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/";
      L.tileLayer(esri + "World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 16,
        attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors',
      }).addTo(map);
      // Place names sit on their own layer, above the land and water
      L.tileLayer(esri + "World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16, pane: "overlayPane" }).addTo(map);
      // Don't hijack page scrolling: the wheel only zooms after someone clicks into the map
      map.on("click focus", () => map.scrollWheelZoom.enable());
      map.on("mouseout blur", () => map.scrollWheelZoom.disable());
      layer = L.layerGroup().addTo(map);
    }

    layer.clearLayers();
    for (const e of events) {
      const going = e.baseRsvp + (rsvps.has(e.id) ? 1 : 0);
      const r = 5 + Math.sqrt(going) / 3.5;
      L.circleMarker([e.lat, e.lon], { radius: r * 2.2, stroke: false, fillColor: gold, fillOpacity: 0.18, interactive: false }).addTo(layer);
      L.circleMarker([e.lat, e.lon], { radius: r, color: "#0b1020", weight: 2, fillColor: gold, fillOpacity: 1 })
        .bindTooltip(e.city, { direction: "top", offset: [0, -r], className: "map-tip" })
        .bindPopup(popup(e, going), { className: "map-popup", closeButton: true })
        .addTo(layer);
    }
    allBounds = L.latLngBounds(events.map((e) => [e.lat, e.lon]));
    renderJumps(events);
    fit();
  }

  // Leaflet can't measure a hidden page, so size and frame the map once Home is showing
  function fit() {
    if (!map || !box.offsetWidth) return;
    map.invalidateSize();
    if (!fitted && allBounds) {
      map.fitBounds(allBounds, { padding: [30, 30] });
      fitted = true;
    }
  }

  render();
  // Re-draw when someone RSVPs or registers a new Dark Night elsewhere on the site
  window.addEventListener("hashchange", () => requestAnimationFrame(render));
  // Home may be hidden at load (or fade in later), so fit whenever the box actually gets a size
  new ResizeObserver(fit).observe(box);
})();

/* ---------- Orion: faint stars arrive last ---------- */
// They're the stars a darker sky adds, so they fade in one by one after the bright ones
document.querySelectorAll(".orion-faint circle").forEach((c, i) => c.style.setProperty("--n", i));

/* ---------- FAQ: answers slide open and closed ---------- */
document.querySelectorAll(".faq details").forEach((d) => {
  const answer = d.querySelector("p");
  d.addEventListener("toggle", () => d.classList.toggle("is-open", d.open));
  d.querySelector("summary").addEventListener("click", (e) => {
    if (!motion) return; // the browser's own instant open/close
    e.preventDefault();
    if (d._anim) return; // let the current open/close finish
    const closing = d.open;
    if (!closing) d.open = true;
    d.classList.toggle("is-open", !closing);
    const shut = { height: "0px", marginBottom: "0px", opacity: 0 };
    const full = { height: answer.offsetHeight + "px", marginBottom: getComputedStyle(answer).marginBottom, opacity: 1 };
    d._anim = answer.animate(closing ? [full, shut] : [shut, full], { duration: closing ? 240 : 320, easing: EASE_OUT });
    const done = () => {
      if (closing) d.open = false;
      d._anim = null;
    };
    d._anim.finished.then(done, done); // rejects if cancelled; either way, unlock
  });
});
