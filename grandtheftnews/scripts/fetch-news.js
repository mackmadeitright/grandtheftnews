#!/usr/bin/env node
/*
 * GrandTheftNews — RSS aggregator
 * Pulls gaming-news RSS feeds, keeps only GTA 6 / Rockstar / Take-Two stories,
 * dedupes, sorts newest-first, and writes assets/news.json.
 *
 * No API keys required. Runs on a schedule via GitHub Actions.
 */

const fs = require("fs");
const path = require("path");

// Feeds to pull from. Add or remove freely — anything with a standard RSS/Atom feed works.
const FEEDS = [
  { src: "GameSpot",   url: "https://www.gamespot.com/feeds/news/" },
  { src: "IGN",        url: "https://feeds.ign.com/ign/games-all" },
  { src: "Eurogamer",  url: "https://www.eurogamer.net/feed" },
  { src: "PC Gamer",   url: "https://www.pcgamer.com/rss/" },
  { src: "Polygon",    url: "https://www.polygon.com/rss/index.xml" },
  { src: "Kotaku",     url: "https://kotaku.com/rss" },
  { src: "VG247",      url: "https://www.vg247.com/feed/news" },
  { src: "GamesRadar", url: "https://www.gamesradar.com/rss/" }
];

// A story is kept only if its title or summary matches one of these.
const KEYWORDS = [
  "gta 6", "gta vi", "grand theft auto 6", "grand theft auto vi",
  "gta6", "gtavi", "vice city" // "vice city" is GTA6's setting; Rockstar/Take-Two below are broader
];
// Broader terms only count if "gta" also appears, to avoid unrelated Rockstar/Take-Two news.
const SOFT_KEYWORDS = ["rockstar", "take-two", "take two"];

const MAX_ITEMS = 24;
const OUT_PATH = path.join(__dirname, "..", "assets", "news.json");

function decode(s = "") {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
}

// Atom <link href="..."/> or RSS <link>...</link>
function link(block) {
  const href = block.match(/<link[^>]*href="([^"]+)"/i);
  if (href) return href[1];
  const txt = tag(block, "link");
  return decode(txt);
}

function parseItems(xml) {
  const out = [];
  const re = /<(item|entry)[\s\S]*?<\/\1>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[0];
    const title = decode(tag(b, "title"));
    let summary = decode(tag(b, "description") || tag(b, "summary") || tag(b, "content"));
    if (summary.length > 320) summary = summary.slice(0, 317).trimEnd() + "…";
    const url = link(b);
    const dateRaw = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated");
    const date = dateRaw ? new Date(decode(dateRaw)) : null;
    if (title && url) out.push({ title, summary, url, date });
  }
  return out;
}

function relevant(item) {
  const hay = (item.title + " " + item.summary).toLowerCase();
  if (KEYWORDS.some((k) => hay.includes(k))) return true;
  if (SOFT_KEYWORDS.some((k) => hay.includes(k)) && hay.includes("gta")) return true;
  return false;
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "GrandTheftNews/1.0 (+https://github.com)" },
      signal: AbortSignal.timeout(20000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseItems(xml)
      .filter(relevant)
      .map((it) => ({ ...it, src: feed.src }));
  } catch (e) {
    console.error(`  ! ${feed.src} failed: ${e.message}`);
    return [];
  }
}

(async () => {
  console.log("Fetching feeds…");
  const batches = await Promise.all(FEEDS.map(fetchFeed));
  let items = batches.flat();
  console.log(`  collected ${items.length} matching stories`);

  // Dedupe by normalized title
  const seen = new Set();
  items = items.filter((it) => {
    const key = it.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort newest first; undated sink to the bottom
  items.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  items = items.slice(0, MAX_ITEMS);

  if (items.length) items[0].lead = true;

  const payload = {
    updated: new Date().toISOString(),
    count: items.length,
    items: items.map((it) => ({
      lead: !!it.lead,
      src: it.src,
      title: it.title,
      summary: it.summary || "Read the full story at the source.",
      url: it.url,
      date: it.date ? it.date.toISOString() : null
    }))
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${items.length} stories to assets/news.json`);

  // If a run returns nothing (all feeds down), keep the previous file rather than blanking the site.
  if (items.length === 0) {
    console.warn("No stories found — site will fall back to last good feed / seed data.");
    process.exitCode = 0;
  }
})();
