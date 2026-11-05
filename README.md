# Down the Rabbit Hole — Year End Party 2026 🎩🐇

An Alice in Wonderland themed party site with three tabs:

| Tab | What it does |
| --- | --- |
| **Registration** (`/`) | Enter a guest's ticket details (name, team, table, character, message). Generates a ticket with a **unique QR code** and a **lucky draw number** (`WL26-0001`, `WL26-0002`, …). Download the QR as a PNG, open the ticket page, or print. Includes a searchable guest list with Export / Import. |
| **Games** (`/games`) | *Teacup Shuffle* (find the Dormouse under the cups — gets faster with every win) and *Hatter's Riddles* (Wonderland trivia). |
| **Lucky Draw** (`/lucky-draw`) | Draws from the registered ticket numbers, with a rolling animation, confetti, a prize label, a winners' roll and a full-screen mode for the projector. Previous winners are excluded unless you tick the box. |

Scanning a guest's QR code opens `/ticket?t=…`, which shows their ticket on any phone. The ticket details are carried in the QR link itself, so this works without a database.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo. Vercel detects Next.js automatically — no settings needed.
3. Click **Deploy**.

(Or run `npx vercel` from this folder.)

## Draft limitations — where data lives

This draft stores the guest list and winners in the **browser's localStorage**, so the data is per-device:

- Register guests and run the lucky draw on the **same laptop**, or
- Use **Export** on the registration device and **Import** on the lucky-draw device.

To make the guest list shared across devices, replace the functions in `lib/store.js` with API calls backed by a database (e.g. Vercel Postgres / Neon, Upstash Redis, or Supabase). The UI only talks to `lib/store.js`, so nothing else needs to change.

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
lib/store.js         storage, ticket numbers, QR payload
```
