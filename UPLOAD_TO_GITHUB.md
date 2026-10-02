# How to put IND-QUANT on GitHub (3 easy ways)

This project now has only **about 80 files**. The 224 small market-data files are packed into **one** file
(`data-snapshot/public-data.zip`), and GitHub Actions builds the website for you. So the GitHub
website's **100-files-per-upload limit is no longer a problem**.

---

## Way 1: Upload through the GitHub website (no software needed)

1. **Unzip** `IND-Quant-v4.1-GitHub-Upload.zip` on your computer. You will get a folder `IND-Quant-v4.1`.
2. On GitHub, click **New repository**. Give it a name (for example `ind-quant`) and make it **Public**.
   Tick **nothing** else, then click **Create repository**.
3. On the empty repository page, click the link **"uploading an existing file"**.
4. Open the unzipped folder. Select **everything inside it** (Ctrl+A on Windows, Cmd+A on Mac) and
   **drag it all** into the GitHub upload box. Drag the *contents*, not the outer folder.
5. Wait until all files are listed. Then click **Commit changes**.
6. **Check the hidden `.github` folder arrived.** In the repository you should see a folder named `.github`.
   - On **Mac**, Finder hides folders that start with a dot. Press **Cmd + Shift + .** in Finder to show
     them, then drag `.github` in as well.
   - If it is still missing, click **Add file → Create new file**. Type the name
     `.github/workflows/ci-and-pages.yml` (typing the `/` creates the folders). Paste in the content of that
     file from the unzipped folder and click **Commit changes**.
7. Turn on the website: go to **Settings → Pages → Build and deployment → Source**.
   **Either option works now:**
   - **Deploy from a branch** → Branch `main`, folder `/ (root)` → Save. The site uses the ready-built app in the
     `site/` folder, so it works straight away.
   - **GitHub Actions**: the site is rebuilt and deployed by the workflow each time.
8. After 1–5 minutes, open `https://<your-username>.github.io/<repo-name>/`.
   The **Actions** tab also runs the workflow "Refresh NSE data, test & publish" (press **Run workflow** if it
   did not start). It refreshes the market data every weekday evening.

> If GitHub ever says "too many files", upload in two batches. First upload the `src` folder, then
> everything else. Each batch must have fewer than 100 files.

---

## Way 2: GitHub Desktop (easiest for future updates, no file limit)

1. Install **GitHub Desktop** from desktop.github.com and sign in.
2. **File → Add local repository →** choose the unzipped `IND-Quant-v4.1` folder.
   If it says "not a git repository", click **create a repository** there.
3. Click **Publish repository**. Untick "Keep this code private" if you want a free public Pages site.
4. Then do steps 7–8 from Way 1 (Settings → Pages → GitHub Actions).

Later, after you edit any file, open GitHub Desktop, type a short message, click **Commit**, then **Push**.

---

## Way 3: Command line (git)

```bash
cd IND-Quant-v4.1
git init
git add .
git commit -m "IND-QUANT v4.1"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```
Then do steps 7–8 from Way 1.

---

## After it is online

* **Data updates by itself** every weekday evening (18:30 and 21:00 IST). You don't need to do anything.
  The workflow saves the fresh data into `data-snapshot/` and the website loads it from there.
* **News headlines: unlimited.** A second workflow, **"Refresh news headlines (hourly, unlimited archive)"**,
  checks 38 news sources every hour. These include Economic Times, Mint, Business Standard, BusinessLine,
  CNBC-TV18, Moneycontrol, official NSE company filings, SEBI and RBI. Every new headline is saved in
  `data-snapshot/news/` forever. On the site, use **Show more**, **Show all** and **Load older headlines** to go back
  as far as you like. To fill it straight away: **Actions → Refresh news headlines → Run workflow**.
* **Open pages update themselves.** The site checks for a new version or new data every 5 minutes, and whenever
  you return to the tab. It then shows a green "New … available" bar and refreshes after 30 seconds. You can
  turn this off under **Data & Sources → Settings**. The **Refresh** button at the top always loads the newest
  version and skips the browser cache.
* If NSE cannot be reached on some day, the site uses the bundled snapshot. It never breaks.
* **Before sharing the link**, edit **`site-config.json`** on GitHub (click the file, then the ✏️ pencil icon).
  Put in your name, contact e-mail and city, then **Commit changes**. The change shows on the site within about
  10 minutes. No rebuild is needed.

## Running it on your own computer (optional)

```bash
npm install
npm run dev        # opens http://localhost:5173 (the data snapshot is unpacked automatically)
npm run data       # optional: download the very latest NSE data
```

---

## Troubleshooting: "I still see the old page / a help box"

* Click the **Refresh** button at the top of the site, or add `?refresh=1` to the end of the address.
* Make sure the **`site`** folder (`site/app.js`, `site/app.css`, `site/version.json`) and **`index.html`** from this
  zip are in the repository. When Pages is set to "Deploy from a branch", these files are the website.
* Delete any old **`docs/`** or **`dist/`** folders from the repository. They contain old versions.
* GitHub Pages can take up to 10 minutes to show a new upload.
