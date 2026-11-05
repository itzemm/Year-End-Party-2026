# Down the Rabbit Hole — Year End Party 2026 🎩🐇

An Alice in Wonderland themed party site with three tabs:

| Tab | What it does |
| --- | --- |
| **Registration** (`/`) | Enter a guest's ticket details (name, team, table, character, message). Generates a ticket with a **unique QR code** and a **lucky draw number** (`WL26-0001`, `WL26-0002`, …). Download the QR as a PNG, open the ticket page, or print. Includes a searchable guest list with Export / Import. |
| **Games** (`/games`) | *Teacup Shuffle* (find the Dormouse under the cups — gets faster with every win) and *Hatter's Riddles* (Wonderland trivia). |
| **Lucky Draw** (`/lucky-draw`) | Draws from the registered ticket numbers, with a rolling animation, confetti, a prize label, a winners' roll and a full-screen mode for the projector. Previous winners are excluded unless you tick the box. |

Scanning a guest's QR code opens `/ticket?t=…`, which shows their ticket on any phone. The ticket details are carried in the QR link itself, so guests never need the organisers' passcode.

## Shared database

The guest list, ticket numbers and lucky draw winners are stored in **Upstash Redis**, so every device (registration desk, phones, the lucky draw laptop) sees the same data. Ticket numbers are issued by an atomic counter, so two desks registering at once never get the same number. The lucky draw winner is picked on the server, so every screen agrees on who won.

Without a database connected (e.g. plain `npm run dev`), the app still works but keeps data in server memory. It shows a banner and resets on restart.

## Deploy to Vercel

1. Push this repo to GitHub, then in Vercel: **Add New → Project** and import it (Next.js is auto-detected).
2. In the project, open **Storage → Create Database → Upstash → Redis** (free tier is plenty) and connect it to the project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
3. *(Recommended)* **Settings → Environment Variables**: add `ADMIN_PASSCODE` with a secret phrase. The Registration and Lucky Draw tabs then ask for it once per browser, so guests who scan their QR code can't see or change the guest list. Ticket pages and Games stay open to everyone.
4. **Redeploy** so the new variables take effect.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: paste your Upstash credentials + passcode
npm run dev                  # http://localhost:3000
```

## Moving data around

**Export** on the Registration tab downloads the guest list and winners as JSON. **Import** merges an exported file into the database, keeping existing ticket numbers. New tickets continue after the highest imported number. Use this to bring over guests registered with the earlier offline draft.

## API

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/status` | GET | storage mode and whether a passcode is needed |
| `/api/guests` | GET / POST | list guests / register a guest |
| `/api/guests/:id` | DELETE | remove a guest |
| `/api/guests/import` | POST | merge an exported guest list |
| `/api/draw` | POST | pick a winner (`{ prize, allowRepeat }`) |
| `/api/winners` | GET / DELETE | list / clear winners |

All except `/api/status` require the `x-admin-passcode` header when `ADMIN_PASSCODE` is set.

## Project layout

```
app/
  layout.js          header, tabs, background
  page.js            Registration tab
  games/page.js      Games tab
  lucky-draw/page.js Lucky Draw tab
  ticket/page.js     page opened by scanning a QR code
  globals.css        Wonderland theme
components/          TicketCard, NavTabs, TeacupShuffle, RiddleQuiz
app/api/             API routes (guests, draw, winners, status)
lib/db.js            server-side storage (Upstash Redis or in-memory fallback)
lib/auth.js          optional admin passcode check
lib/store.js         client-side API calls + QR payload encoding
lib/useStore.js      React hook that loads and polls the shared data
```
