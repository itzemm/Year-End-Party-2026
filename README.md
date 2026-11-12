# Winter Wonderland — Year End Party 2026 ❄️⛄

A Winter Wonderland themed party site with four tabs:

| Tab | What it does |
| --- | --- |
| **Registration** (`/`) | Enter a guest's ticket details (name, team, table, character, message). Generates a ticket with a **unique QR code** and a **lucky draw number** (`WL26-0001`, `WL26-0002`, …). Download the QR as a PNG, open the ticket page, or print. Includes a searchable guest list with Export / Import. |
| **My Ticket** (`/my-ticket`) | Guests log in with their **email or ticket number + access code** to see their ticket and QR, save the QR to their phone, and see if they won anything in the lucky draw. |
| **Games** (`/games`) | **Guess the Item** (zoom-out picture game for the big screen) and **Smallest Unique Number** (everyone plays on their phone). See below. |
| **Lucky Draw** (`/lucky-draw`) | Draws from the registered ticket numbers, with a rolling animation, confetti, a prize label, a winners' roll and a full-screen mode for the projector. Previous winners are excluded unless you tick the box. |

Scanning a guest's QR code opens `/ticket?t=…`, which shows their ticket on any phone. The ticket details are carried in the QR link itself, so guests never need the organisers' passcode.

## Games

### Guess the Item (host on the big screen)

The picture starts as an extreme close-up and zooms out one clue at a time (6 clues). Guests shout out guesses, and the earlier they get it, the more points it's worth.

- Buttons or presenter keys: **Space** = zoom out, **Enter** = reveal answer, **→** = next picture. **Big screen** makes it full-screen.
- Comes with 24 built-in winter pictures. Under **Manage pictures** you can add your own photos (the answer comes from the file name and can be edited) and turn the built-in set off.
- Your own photos are saved in that laptop's browser, so add them on the laptop that runs the projector.

### Smallest Unique Number (everyone on their phones)

Everyone picks a whole number, and the **smallest number nobody else picked** wins.

1. The host opens Games → Smallest Unique Number → **Host controls** (organiser passcode), sets the range (default 1–100) and clicks **Start round 1**. Put this on the big screen: it shows a QR code to join and a live count of entries.
2. Guests scan the QR (or open Games on their phone), log in with their ticket details if they haven't already, and lock in a number. They can change it until the round closes. One entry per guest.
3. The host clicks **Close round & reveal**. Everyone sees the winner and a chart of how many people picked each number. Each guest also sees how they did. Then click **Start next round**.

Load-tested locally with 120 players entering at the same moment.

## Guest accounts

Every guest gets a 6-character **access code** when you register them (shown under their ticket and in the guest list's *Code* column).

1. Register the guest, then click **Copy invite message**. It copies a ready-to-send message with the My Ticket link, their login (email, or ticket number if no email) and their code. Paste it into email, Slack, WhatsApp, etc.
2. The guest opens `/my-ticket`, logs in, and stays logged in on that device for 60 days.
3. Lost or leaked code? Click **View** on the guest, then **New code**. The old code stops working and any device logged in with it is logged out.

Security notes: login is limited to 8 wrong tries per email/ticket number per 15 minutes, sessions are signed httpOnly cookies, and guests can only ever see their own ticket. Set `SESSION_SECRET` in Vercel to a long random string (otherwise one is derived from the database token).

## Shared database

The guest list, ticket numbers and lucky draw winners are stored in **Upstash Redis**, so every device (registration desk, phones, the lucky draw laptop) sees the same data. Ticket numbers are issued by an atomic counter, so two desks registering at once never get the same number. The lucky draw winner is picked on the server, so every screen agrees on who won.

Without a database connected (e.g. plain `npm run dev`), the app still works but keeps data in server memory. It shows a banner and resets on restart.

## Deploy to Vercel

1. Push this repo to GitHub, then in Vercel: **Add New → Project** and import it (Next.js is auto-detected).
2. In the project, open **Storage → Create Database → Upstash → Redis** (free tier is plenty) and connect it to the project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
3. *(Recommended)* **Settings → Environment Variables**: add `ADMIN_PASSCODE` with a secret phrase. The Registration and Lucky Draw tabs then ask for it once per browser, so guests who scan their QR code can't see or change the guest list. Ticket pages and Games stay open to everyone.
4. *(Recommended)* Add `SESSION_SECRET` with a long random string (e.g. the output of `openssl rand -hex 32`). It signs guest logins.
5. **Redeploy** so the new variables take effect.

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
| `/api/guests/:id/reset-code` | POST | issue a new access code |
| `/api/login` / `/api/logout` | POST | guest login (`{ identifier, code }`) / logout |
| `/api/me` | GET | the logged-in guest's ticket and lucky draw wins |
| `/api/sun` | GET | Smallest Unique Number: current round + entry count (public) |
| `/api/sun/me` | GET | the logged-in guest's entry for the current round |
| `/api/sun/entry` | POST | submit / change a number (`{ n }`, guest login required) |
| `/api/sun/round` | POST | host: `{ action: "open", max }` or `{ action: "close" }` |
| `/api/draw` | POST | pick a winner (`{ prize, allowRepeat }`) |
| `/api/winners` | GET / DELETE | list / clear winners |

Organiser routes require the `x-admin-passcode` header when `ADMIN_PASSCODE` is set. `/api/status`, `/api/login`, `/api/logout`, `/api/me` and the guest game routes (`/api/sun`, `/api/sun/me`, `/api/sun/entry`) never need it.

## Project layout

```
app/
  layout.js          header, tabs, background
  page.js            Registration tab
  games/page.js      Games tab
  lucky-draw/page.js Lucky Draw tab
  my-ticket/page.js  guest login + their own ticket
  ticket/page.js     page opened by scanning a QR code
  globals.css        Winter Wonderland theme
components/          TicketCard, NavTabs, Snowfall, ZoomGuess, SmallestUnique, AdminGate
lib/zoomItems.js     built-in pictures for Guess the Item
public/zoom/         built-in pictures (Twemoji, CC-BY 4.0 — see CREDITS.txt)
app/api/             API routes (guests, draw, winners, status)
lib/db.js            server-side storage (Upstash Redis or in-memory fallback)
lib/auth.js          optional admin passcode check
lib/session.js       guest login sessions (signed cookie)
lib/store.js         client-side API calls + QR payload encoding
lib/useStore.js      React hook that loads and polls the shared data
```
