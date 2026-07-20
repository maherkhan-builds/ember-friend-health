# Ember 🔥

**Friendships fade quietly — Ember makes sure you notice.** A friend health tracker for busy adults who lose touch with people they actually love, not because they stopped caring, but because life got loud.

## ✨ Features

- **Friend Health Score** — every friend gets a 0–100% score that cools over time since your last check-in, based on how close you two are (bestie/close/friend/family/acquaintance, or a fully custom cadence)
- **Circle Health dashboard** — your overall average score, how many friendships are thriving, and how many need attention
- **Nudge strip + per-card nudges** — plain-language prompts ("send one text", "float a hangout date") tuned to how cold a friendship has gotten
- **One-tap check-ins** 🔥 — log a text, call, hangout, event, or birthday with an optional note; the score warms right back up
- **Filters** — jump straight to friends who need attention, ones who are thriving, or your archive
- **Report** 📋 — copies a plain-text, ranked check-in list you can paste anywhere (Notes app, reminders, wherever)
- **CSV export** 📊 and **JSON backup/import** 🗄 — your data, portable
- **Archive, don't delete** — someone traveling or in a rough season? Archive them instead of losing their history

## 🧠 How the score works

Each friendship has a cadence (how often you two ideally connect). The score starts at 100% right after a check-in and eases down to ~70% right on schedule, then falls off faster the longer it's overdue — like an ember cooling once you stop tending the fire. Band names: 🔥 Thriving, 🌤️ Steady, 🌥️ Cooling, 🥶 Fading, 🧊 Cold.

## 🔐 Privacy & security

- **100% local.** Everything lives in your browser's `localStorage`. No account, no server, no analytics, no network requests.
- **Strict Content Security Policy** — no external scripts, styles, or images can load.
- **XSS-safe rendering** — all user input is rendered as text, never as HTML.
- Nothing to hack, because nothing is ever sent anywhere. Use the JSON backup to move your circle between devices.

## 🚀 Run it

Static site, no build step, no dependencies.

```bash
npx serve .
# or
python -m http.server 8000
```

Then open the printed URL, or just double-click `index.html`.

> **Note:** data lives in the browser per-origin. If you switch from `file://` to a server (or change ports), export a JSON backup first and import it on the new origin.

## 📄 License

MIT
