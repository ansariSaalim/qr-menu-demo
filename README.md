# MenuMitra

QR menu and table ordering for restaurants.

- **Diners** scan the QR on their table, browse the menu, order, track the order and pay by UPI or at the counter. No app, no sign-up.
- **Owners** register, build their menu (photos, portions, add-ons, sold-out switch), print table QR codes, receive orders live with a sound alert, print kitchen tickets, mark payments and see reports.
- **Platform admin** sees every restaurant and can change plans.

## Stack

- Static web app: Preact + htm loaded as ES modules from jsDelivr, no build step.
- Supabase: Postgres with row-level security, auth, realtime, storage for dish photos.
- Hosted on Vercel (`vercel.json` routes every page to `index.html`).

## Routes

| Path | Who | What |
| --- | --- | --- |
| `/` | Public | Landing page and pricing |
| `/signup`, `/login` | Owners | Account |
| `/setup` | Owners | Create the restaurant |
| `/dashboard` | Owners | Live orders |
| `/dashboard/menu`, `/tables`, `/reports`, `/settings` | Owners | Manage the restaurant |
| `/r/<slug>/t/<table>` | Diners | Menu and ordering for one table |
| `/r/<slug>` | Diners | View-only menu |
| `/admin` | Platform team | All restaurants |
| `/demo.html` | Anyone | Clickable prototype with sample data |

Prices are always recalculated in the database (`place_order`), so a diner cannot change what they pay.
