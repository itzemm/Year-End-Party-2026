# Winter Wonderland — Year End Party 2026 ❄️⛄

A party site for ~120 guests: tickets with QR codes, two live phone games, and a lucky-draw wheel. Deploys to Vercel.

## Who sees what

| Page | Who | What it does |
| --- | --- | --- |
| **My Ticket** (`/my-ticket`, the home page) | Guests | Guests **find their name** (first name, then last name), enter their **access code**, and see their ticket, QR code and any lucky draw win. The round **?** button explains who to ask for help. |
| **Games** (`/games`) | Guests | Shows **only the game the host has put live**, and switches automatically. Playing needs a login. |
| **Lucky Draw** (`/lucky-draw`) | Guests | Shows the winner when the wheel stops. |
| **Registration** (`/desk`, the scanner icon, top left) | Registration staff (`registration123`) | Register guests, look up access codes, export/import the guest list. |
| **Admin** (`/admin`, the snow globe, top right) | Admins (admin password) | Running the games on the big screen and the lucky draw wheel. |

## Registration (front desk)

Click the scanner icon in the top-left corner and enter the registration password: **`registration123`** (set `REGISTRATION_PASSCODE` in Vercel to change it). Registration and the game admin are **completely separate**: each has its own password, sign-in and **Log out** button, and neither password opens the other area.

Type the guest's **first name** and **last name** → **Create ticket**. The name is saved as “First Last”, which is how guests find themselves on My Ticket. Each guest gets a ticket with a QR code, a lucky draw number (`WL26-0001`…) and a 6-character **access code**. **Copy invite message** copies a ready-to-send message with their login details. **New code** replaces a lost code.

**⬇ Export to Excel** downloads the guest list (.xlsx). **⬆ Import** accepts that export (restores/updates guests, keeping tickets and codes), any Excel list of names (a “Name” column, “First name” + “Last name” columns, or names in column A), or old .json backups.

## Admin area

Click the snow globe in the top-right corner and enter the admin password (`ADMIN_PASSCODE`). The games run in this order: **Spotlight → Guess the Item → Smallest Unique Number**, then the **Lucky Draw**.

**⛶ Big screen** (on every game and the lucky draw) goes full screen and scales the whole view up to fill about 90% of the projector, so all text is very large. Admin-only controls are hidden on the big screen, and keyboard shortcuts keep working.

### What guests see (the live switch)
At the top of every admin section: **📱 Guests' Games tab shows: Nothing / Spotlight / Guess the Item / Smallest Unique Number**. Starting a game switches it live automatically.

### 1. Spotlight (on stage)
1. **🎲 Draw 5 names**: 5 random guests are called up on stage, and their phones say “You're on stage!”. **Nobody is drawn twice** (until *Start over*). **↻ not here** swaps someone out.
2. **🎲 Reveal a random question** (short and quick to judge, e.g. “Who has the longest hair?”), **Different question**, or type your own.
3. Tap the winner(s) and **🏆 Confirm**. **Next round** draws 5 new names.

### 2. Guess the Item (5 rounds)
1. Upload 5 pictures and type each answer (add other accepted answers with commas). Click a picture to choose where the close-up starts, then **Save** each round.
2. **Start game**. Each picture **zooms out every 10 seconds, 3 times**, then stays fully zoomed out for **15 more seconds**. Then answers lock and the answer is revealed.
3. **Show top 3 →** shows the leaderboard (🥇🥈🥉), then **Next picture →**. After picture 5 it shows **the 3 winners**: most correct answers, then fastest total time.

### 3. Smallest Unique Number
1. **Start 1-minute round**. Guests pick a number from **1 to 100** on their phones. When the minute is up (or you press *Everyone's in — lock numbers now*), numbers lock.
2. **Light up the chests**: the 10×10 grid of chests lights up **only the numbers somebody picked**.
3. **Click any lit chest**: it pops open instantly and shows the names of everyone who picked that number. **Click outside** the pop-up to go back to the chests. The banner always shows the current smallest unique number and announces the winner once it's certain.
4. Guests' phones show **only their own number** and how it's doing (“2 others picked 12 too”, “You won!”).

### 4. Lucky Draw
A wheel of **every registered guest's name**, each as large as its slice allows. **Spin the wheel!** It lands on the winner, who appears on the big screen and on everyone's Lucky Draw page. Previous winners sit out unless you tick “Let previous winners win again”. The winners list is below the wheel.

## Deploy to Vercel

1. In Vercel: **Add New → Project**, import this repo, **Deploy**.
2. **Storage → Create Database → Upstash → Redis** (free plan) and connect it to the project. **Required**: without it nothing is saved.
3. **Settings → Environment Variables**:
   - `ADMIN_PASSCODE`: the admin password for the games and the lucky draw (**required**). Use something long.
   - `REGISTRATION_PASSCODE` *(optional)*: the registration password. Defaults to `registration123`.
   - `SESSION_SECRET`: a long random string (e.g. `openssl rand -hex 32`). Signs guest logins.
4. **Deployments → ⋯ → Redeploy** so the settings take effect.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: Upstash credentials + passcode
npm run dev                  # http://localhost:3000
```

Without database credentials the app keeps data in memory (it resets on restart) and the admin page shows a warning.

**Rehearsal mode:** build with `NEXT_PUBLIC_GAME_SPEED=5` to run every game timer 5× faster (e.g. `NEXT_PUBLIC_GAME_SPEED=5 npm run build && npm start`). Never set this on the real deployment.

## Load

Load-tested locally with 120 simultaneous players: logins, picture downloads at each zoom step, answers, number picks, live reveals and lucky-draw polling, with no failed requests. Phones poll the shared game state every 2–3 seconds. That state is cacheable for 1 second on Vercel's CDN, and pictures are cached by URL.

## Project layout

```
app/
  my-ticket/  games/  lucky-draw/  ticket/   guest pages
  desk/                                      registration (behind the scanner icon)
  admin/                                     admin area (behind the snow globe)
  api/                                       API routes (see below)
components/
  desk/       DeskApp, RegistrationDesk
  admin/      AdminApp, LiveSwitch, StageAdmin, ZoomAdmin, SunAdmin, LuckyAdmin, PrizeWheel, JoinQr, useBigScreen
  games/      StagePlayer, ZoomPlayer, ZoomStage, Leaderboard, SunPlayer, ChestGrid, LoginPrompt
lib/
  kv.js         storage (Upstash Redis, or in-memory for local dev)
  db.js         guests, logins, name finder, lucky draw
  stageGame.js  Spotlight server logic
  zoomGame.js   Guess the Item server logic
  sunGame.js    Smallest Unique Number server logic
  live.js       which game guests see
  rules.js      shared timings, answer matching and scoring
  imageTools.js resizing and zoom-level cropping (in the admin's browser)
  hooks.js      server clock, polling
```

### API

| Route | Who | Purpose |
| --- | --- | --- |
| `/api/names?q=` | guests | My Ticket name finder (names only) |
| `/api/login`, `/api/logout`, `/api/me` | guests | log in with name + access code; own ticket and wins |
| `/api/live` (GET) · `/api/stage` | guests | which game is live; Spotlight state |
| `/api/zoom` · `/api/zoom/me` · `/api/zoom/answer` · `/api/zoom/image` | guests | Guess the Item state, own result, answer, pictures (time-gated) |
| `/api/sun` · `/api/sun/me` · `/api/sun/entry` | guests | Smallest Unique Number state, own pick, pick a number |
| `/api/lucky` (GET) | guests | the revealed lucky draw winner |
| `/api/time` | anyone | server clock for countdowns |
| `/api/guests…` | registration | registration password only |
| `/api/winners` (GET) | both | registration or game admin password |
| `/api/lucky/names` | admin | names for the wheel (no access codes) |
| `/api/stage/admin`, `/api/zoom/admin`, `/api/sun/admin`, `/api/live` (POST), `/api/lucky/draw`, `/api/winners` (DELETE) | admin | require the `x-admin-passcode` header |
