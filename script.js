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
    }));
    if (reducedMotion) draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    for (const s of stars) {
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
navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", open);
  navToggle.textContent = open ? "Close" : "Menu";
});
navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", false);
    navToggle.textContent = "Menu";
  }
});

/* ---------- Pages ---------- */
// Each top-level section is its own page; the URL hash picks which one is shown.
(function pages() {
  const pages = [...document.querySelectorAll(".page")];
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
      document.querySelectorAll(".nav-links a").forEach((a) => {
        a.toggleAttribute("aria-current", a.getAttribute("href") === "#" + page.id);
        if (a.hasAttribute("aria-current")) a.setAttribute("aria-current", "page");
      });
      document.title = page.id === "home" ? "Dark Nights Project" : `${page.dataset.title} · Dark Nights Project`;
      renderPager(pages.indexOf(page));
    }

    if (target !== page) target.scrollIntoView({ behavior: changed ? "instant" : "smooth" });
    else if (changed) window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderPager(i) {
    pager.innerHTML = "";
    if (i === 0) return; // home has its own overview links
    const link = (p, cls, label) => {
      const a = document.createElement("a");
      a.href = "#" + p.id;
      a.className = cls;
      a.innerHTML = `<span class="label"></span><span class="pager-title"></span>`;
      a.querySelector(".label").textContent = label;
      a.querySelector(".pager-title").textContent = p.dataset.title;
      pager.appendChild(a);
    };
    if (i > 1) link(pages[i - 1], "prev-page", "← Previous");
    if (i < pages.length - 1) link(pages[i + 1], "next-page", "Next →");
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
    { name: "Excellent dark site", count: 7500, desc: "The Milky Way is bright enough to cast faint shadows. You can barely see your own hand." },
    { name: "Typical dark site", count: 5000, desc: "The Milky Way shows detailed structure. Clouds look like black holes cut out of the stars." },
    { name: "Rural sky", count: 3000, desc: "A little glow from towns on the horizon. Overhead, the Milky Way still looks textured." },
    { name: "Rural to suburban", count: 1500, desc: "Glow from towns in several directions. The Milky Way is visible but flat and washed out." },
    { name: "Suburban sky", count: 800, desc: "The Milky Way is faint overhead and gone near the horizon. Clouds are brighter than the sky behind them." },
    { name: "Bright suburban sky", count: 450, desc: "The Milky Way is only visible straight up, if at all. The horizon glows grey." },
    { name: "Suburban to urban", count: 250, desc: "The whole sky has a grey-orange cast. The Milky Way is gone." },
    { name: "City sky", count: 100, desc: "The sky glows. You can trace the brightest constellations and not much else. This is where most people live." },
    { name: "City centre", count: 30, desc: "The Moon, a few planets and a handful of the brightest stars." },
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
    render();
  }

  function render() {
    const level = Number(slider.value);
    const info = BORTLE[level];
    const pollution = (level - 1) / 8; // 0..1

    // Sky goes from black to the dull warm grey of a lit-up city sky
    const top = mix([2, 2, 4], [52, 50, 48], pollution);
    const bottom = mix([6, 6, 10], [170, 150, 128], pollution);
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

    // Stars
    ctx.fillStyle = "#fff";
    const visible = Math.round(SIM_STARS * (info.count / 7500));
    for (let i = 0; i < visible; i++) {
      const s = stars[i];
      ctx.globalAlpha = Math.min(1, 0.35 + s.b);
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

    document.getElementById("sim-class").textContent = "Bortle " + level;
    document.getElementById("sim-name").textContent = info.name;
    document.getElementById("sim-desc").textContent = info.desc;
    document.getElementById("sim-count").textContent = info.count.toLocaleString();
    slider.setAttribute("aria-valuetext", `Bortle ${level}, ${info.name}`);
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
      render();
      syncLevels();
      document.getElementById("simulator").scrollIntoView({ behavior: "smooth" });
    });
    document.getElementById("levels").appendChild(li);
    return btn;
  });
  function syncLevels() {
    levelButtons.forEach((b, i) => b.setAttribute("aria-pressed", i + 1 === Number(slider.value)));
  }

  slider.addEventListener("input", () => { render(); syncLevels(); });
  syncLevels();
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
];

const rsvps = new Set(store.get("dn-rsvps", []));
const hostedEvents = store.get("dn-hosted", []);
let origin = null; // { lat, lon, label } once the visitor searches for a town

// Miles for US/UK visitors, kilometres for everyone else
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

// Free, keyless geocoder: https://open-meteo.com/en/docs/geocoding-api
async function geocode(query) {
  // The API matches on place name only, so drop any ", State" / ", Country" suffix
  const name = query.split(",")[0].trim();
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&format=json&name=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const { results = [] } = await res.json();
  if (!results.length) return null;

  // If the visitor typed a state or country after the comma, prefer a match on it
  const hint = query.split(",").slice(1).join(" ").trim().toLowerCase();
  const best = (hint && results.find((r) =>
    [r.admin1, r.country, r.country_code].some((v) => v && (v.toLowerCase() === hint || v.toLowerCase().startsWith(hint)))
  )) || results[0];
  return {
    lat: best.latitude,
    lon: best.longitude,
    label: [best.name, best.admin1, best.country].filter(Boolean).join(", "),
  };
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

function renderEvents() {
  const list = document.getElementById("events-list");
  const events = allEvents();
  list.innerHTML = "";
  events.forEach((e, i) => {
    const going = rsvps.has(e.id);
    const row = document.createElement("li");
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
      renderEvents();
    });
    list.appendChild(row);
  });
  document.getElementById("events-empty").hidden = events.length > 0;
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
    if (!o) { status.textContent = ""; return; }
    const closest = allEvents()[0];
    status.textContent = closest && closest.km !== Infinity
      ? `Closest to ${o.label}: ${closest.city}, ${formatDistance(closest.km)} away.`
      : `Sorted by distance from ${o.label}.`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    status.textContent = "Looking up " + q + "…";
    try {
      const place = await geocode(q);
      if (place) setOrigin(place);
      else status.textContent = `Couldn't find a town called "${q}". Try adding the state or country.`;
    } catch {
      status.textContent = "Couldn't look that town up right now. Check your connection and try again.";
    }
  });

  document.getElementById("near-locate").addEventListener("click", () => {
    if (!navigator.geolocation) { status.textContent = "Your browser doesn't support location."; return; }
    status.textContent = "Finding your location…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        input.value = "";
        setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "your location" });
      },
      () => { status.textContent = "Couldn't get your location. Type your town instead."; },
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
    sky.appendChild(s);
  }

  boxes.forEach((b) => (b.checked = saved.has(b.value)));

  function update() {
    const checked = boxes.filter((b) => b.checked);
    const t = checked.length / boxes.length;
    sky.style.setProperty("--haze", (1 - t) * 0.95);
    document.getElementById("meter-pct").textContent = checked.length;
    document.getElementById("meter-msg").textContent = messages[checked.length];
    document.getElementById("pledge-total").textContent = (BASE_TOTAL + (checked.length ? 1 : 0)).toLocaleString();
    store.set("dn-pledge", checked.map((b) => b.value));
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
    note.textContent = "Saving…";
    try {
      const loc = await geocode(event.city);
      if (loc) Object.assign(event, { lat: loc.lat, lon: loc.lon });
    } catch {}
    hostedEvents.push(event);
    store.set("dn-hosted", hostedEvents);
    rsvps.add(event.id);
    store.set("dn-rsvps", [...rsvps]);
    renderEvents();
    note.textContent = `Thanks, ${data.name.trim()}. ${event.city} is now on the events list.`;
    form.reset();
  });
})();

/* ---------- Donate (simulated) ---------- */
document.getElementById("donate-btn").addEventListener("click", () => {
  document.getElementById("donate-note").textContent = "This is a demo site, so no payment is taken.";
});
