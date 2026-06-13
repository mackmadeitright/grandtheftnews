# GrandTheftNews — The Vice City Dispatch

An auto-updating Grand Theft Auto VI news site. A free GitHub Action pulls GTA 6
stories from gaming RSS feeds every few hours, writes them to `assets/news.json`,
and commits the result. The static site (hosted free on GitHub Pages) reads that
JSON on load. No server, no API keys, no monthly cost.

```
grandtheftnews/
├── index.html              the site
├── assets/
│   ├── news.json           the feed (auto-updated by the Action)
│   ├── logo.svg / .png      full logo lockup
│   ├── emblem.svg / .png    standalone GTN mark
│   └── favicon.png          browser-tab icon
├── scripts/
│   └── fetch-news.js       the RSS aggregator (Node, no dependencies)
└── .github/workflows/
    └── update-news.yml     the scheduled GitHub Action
```

## One-time setup

You'll need a free GitHub account. Everything below is point-and-click except
two git commands to upload the files.

### 1. Create the repository
1. Go to https://github.com/new
2. Name it whatever you want (e.g. `grandtheftnews`). Set it to **Public**
   (Pages is free for public repos). Don't add a README — you already have one.
3. Click **Create repository**.

### 2. Upload these files
The easiest no-terminal way:
1. On the new empty repo page, click **uploading an existing file**.
2. Drag in the entire contents of this folder (the `index.html`, `assets`,
   `scripts`, `.github` folders — keep the structure).
3. Commit.

Or, with git on your computer, from inside this folder:
```bash
git init
git add .
git commit -m "Initial GrandTheftNews site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/grandtheftnews.git
git push -u origin main
```

### 3. Turn on GitHub Pages
1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)`. Save.
4. Wait ~1 minute. Your site appears at
   `https://YOUR-USERNAME.github.io/grandtheftnews/`

### 4. Let the Action write to the repo
The workflow already requests write permission, but confirm it's allowed:
1. **Settings → Actions → General**.
2. Under **Workflow permissions**, select **Read and write permissions**. Save.

### 5. Run the first update
1. Go to the **Actions** tab.
2. If prompted, click **I understand my workflows, enable them**.
3. Pick **Update GTA 6 News** on the left, then **Run workflow → Run workflow**.
4. After it finishes (about a minute), `assets/news.json` is refreshed with live
   stories and the site shows them. From now on it runs automatically every 3 hours.

That's it. The site is live and self-updating.

## Customizing

**How often it updates** — edit the `cron` line in
`.github/workflows/update-news.yml`. `0 */3 * * *` is every 3 hours.
`0 */6 * * *` would be every 6. (GitHub may delay scheduled runs at peak times;
that's normal for the free tier.)

**Which sources it pulls from** — edit the `FEEDS` array at the top of
`scripts/fetch-news.js`. Any site with a standard RSS/Atom feed works; just add
`{ src: "Name", url: "https://…/feed" }`.

**What counts as a GTA 6 story** — adjust `KEYWORDS` / `SOFT_KEYWORDS` in the
same file. Right now it keeps anything mentioning GTA 6 / Grand Theft Auto VI /
Vice City, plus Rockstar/Take-Two items that also mention GTA.

**The look** — all styling is inline in `index.html`. Colors live in the
`:root` block at the top (`--pink`, `--cyan`, `--orange`, etc.).

**Run it locally to preview** — from this folder:
```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
To test the fetcher locally (needs Node 18+ for built-in fetch):
```bash
node scripts/fetch-news.js
```

## How the pieces fit together

- The browser never calls any news API directly — it only reads a static JSON
  file, so the site is fast and can't leak keys or hit rate limits.
- The GitHub Action is the only thing that touches the internet for news. It runs
  on GitHub's servers on a schedule, regenerates `news.json`, and commits it.
- If every feed is unreachable on a given run, the script leaves the previous
  `news.json` in place rather than blanking the site.

## Legal / fair use

GrandTheftNews is a fan-made aggregator. It links to original reporting and shows
short, reworded summaries with clear source attribution — it does not republish
full articles. "Grand Theft Auto" and "GTA" are trademarks of Rockstar Games /
Take-Two Interactive; this project is not affiliated with or endorsed by them.
If any publisher asks to be removed from the feed, delete their entry from the
`FEEDS` array.
