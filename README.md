# Winter Wonderland — Year End Party 2026 ❄️⛄

A party site for ~120 guests: tickets with QR codes, two live phone games, and a lucky-draw wheel. Deploys to Vercel.

## Who sees what

| Page | Who | What it does |
| --- | --- | --- |
| **My Ticket** (`/my-ticket`, the home page) | Guests | Log in with **name (or ticket number) + access code**. Shows their ticket, QR code and any lucky-draw wins. |
| **Games** (`/games`) | Guests | Play **Guess the Item** and **Smallest Unique Number** on their phone (must be logged in). |
| **Lucky Draw** (`/lucky-draw`) | Guests | Shows the prize being drawn for and who won. |
| **Admin** (`/admin`, the ❄ snow globe, top right) | Admins (password) | Registration, running both games on the big screen, prizes and the wheel. |

## Admin area

Click the snow globe in the top-right corner and enter the admin password (`ADMIN_PASSCODE`). The browser remembers it until you click **Log out**.

### Registration
Type a guest's name → **Create ticket**. Each guest gets a ticket with a QR code, a lucky-draw number (`WL26-0001`…) and a 6-character **access code**. **Copy invite message** copies a ready-to-send message with their login details. **New code** replaces a lost code and logs out the old one. Export/Import backs up the guest list.

### Guess the Item (5 rounds)
1. Upload 5 pictures and type each answer. Add other accepted answers with commas (“mug, coffee cup”). Small typos, plurals and “a/the” are accepted automatically. Click a picture to choose where the close-up starts.
2. Put the admin page on the projector (**Big screen**), ask guests to open Games → Guess the Item, then click **Start game**.
3. Each round: the picture starts zoomed in and **zooms out every 10 seconds, 3 times**. After it's fully zoomed out, guests get **15 more seconds**. Then answers lock and the answer is revealed. Guests can change their answer until then. Their time counts from their last answer.
4. Click **Show leaderboard →**, then **Next picture →** (or press → / N, or use a presenter clicker). After picture 5 it shows the **final leaderboard**.

**■ Stop game** ends it straight away: everyone sees the final leaderboard for the pictures already revealed (the picture in progress doesn't count and its answer stays hidden). **Reset game** clears everything back to the start.

**Ranking:** most correct answers, then the lowest total time on those correct answers. Phones only ever receive the zoom levels the timer has reached, so nobody can peek at the full picture early.

### Smallest Unique Number
1. Click **Start 2-minute round**. Guests pick a number from **1 to 100** on their phones and can change it until the timer ends. Then phones lock.
2. Click **Start opening chests**. Chests are opened **50 → 1** (click the glowing chest, or press Space / →). Each one shows who picked that number. The banner always shows the **current smallest unique number**.
3. **■ Stop round** cancels the round at any point (while the timer runs or during the reveal). Picks lock and no winner is declared. Start a new round when ready.
4. If someone in 1–50 picked a number nobody else did, the smallest one wins. Otherwise click **Next page** and open **51 → 100**. Guests' phones follow along live.

### Broken Telephone (3 teams of 5)
1. **🎲 Generate teams**: 3 random teams of 5 from the registered guests, shown as a table. Each team's current player is highlighted. **↻** swaps someone (e.g. not here) for another random guest who isn't on a team.
2. Set the **secret sentence**: type one or press **🎲 Random**. It stays hidden on the big screen unless you click Show.
3. **Start game**. Team players open Games → Broken Telephone on their phones (logged in).
4. Press **▶ Start timer** for each turn (all 3 teams play at the same time):
   - Player 1 sees the sentence and **draws it**: 1 minute.
   - Players 2–4 see the previous drawing and **copy it**: 30 seconds each.
   - Player 5 sees the last drawing and **writes what they think it is**: 30 seconds.

   When time's up, whatever is on the phone is sent automatically and the highlight jumps to the next player. If someone doesn't draw, the next person gets the drawing before them.
5. **Reveal every team's drawings & answers**, then **Reveal the secret sentence**. Everyone's phone shows the reveal too. **Stop game** ends it at any time (teams and sentence are kept).

Nobody can see the sentence or anyone's drawing except the player whose turn it is, until the reveal.

### Lucky Draw
1. Add prizes with a name and photo.
2. Click **Draw this** on a prize: every guest's Lucky Draw page now shows that prize.
3. Click **Spin the wheel!** The wheel spins through every eligible guest and lands on the winner. Guests' phones reveal the winner when the wheel stops. Previous winners sit out unless you tick “Let previous winners win again”. Drawing a prize again (e.g. the winner wasn't there) replaces its winner.

## Deploy to Vercel

1. In Vercel: **Add New → Project**, import this repo, **Deploy**.
2. **Storage → Create Database → Upstash → Redis** (free plan) and connect it to the project. **Required**: without it nothing is saved.
3. **Settings → Environment Variables**:
   - `ADMIN_PASSCODE`: the admin password (**required**, otherwise anyone can open the admin area). Use something long.
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
  admin/                                     admin area (behind the snow globe)
  api/                                       API routes (see below)
components/
  admin/      AdminApp, RegistrationAdmin, ZoomAdmin, SunAdmin, TelAdmin, LuckyAdmin, PrizeWheel, JoinQr
  games/      ZoomPlayer, ZoomStage, Leaderboard, SunPlayer, ChestGrid, TelPlayer, TelTeams, TelReveal, DrawingPad, LoginPrompt
lib/
  kv.js         storage (Upstash Redis, or in-memory for local dev)
  db.js         guests, logins, prizes, lucky draw
  zoomGame.js   Guess the Item server logic
  sunGame.js    Smallest Unique Number server logic
  telGame.js    Broken Telephone server logic
  rules.js      shared timings, answer matching and scoring
  imageTools.js resizing and zoom-level cropping (in the admin's browser)
  hooks.js      server clock, polling
```

### API

| Route | Who | Purpose |
| --- | --- | --- |
| `/api/login`, `/api/logout`, `/api/me` | guests | log in with name/ticket + code; own ticket and wins |
| `/api/zoom` · `/api/zoom/me` · `/api/zoom/answer` · `/api/zoom/image` | guests | Guess the Item state, own result, answer, pictures (time-gated) |
| `/api/sun` · `/api/sun/me` · `/api/sun/entry` | guests | Smallest Unique Number state, own pick, pick a number |
| `/api/tel` · `/api/tel/me` · `/api/tel/submit` · `/api/tel/image` | guests | Broken Telephone state, own turn (sentence or previous drawing), send drawing/guess, revealed drawings |
| `/api/lucky` (GET) | guests | current prize and revealed winner |
| `/api/time` | anyone | server clock for countdowns |
| `/api/guests…`, `/api/zoom/admin`, `/api/sun/admin`, `/api/tel/admin`, `/api/prizes…`, `/api/lucky` (POST), `/api/lucky/draw`, `/api/winners` | admin | require the `x-admin-passcode` header |
