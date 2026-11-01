# Zestro

Billing, tables, kitchen screen and QR ordering for restaurants, on the phone they already have.

- **Website and app:** https://ansarisaalim.github.io/qr-menu-demo/ (opens https://ansarisaalim.github.io/qr-menu-demo/app/)
- **Try Demo Kitchen:** the "Try Demo Kitchen" button on the website. Anyone can take orders and make bills there; menu and settings changes are not saved.
- **Install as an app:** https://ansarisaalim.github.io/qr-menu-demo/app/#get-app (Android and computers: one-tap Install; iPhone: Share, then Add to Home Screen)
- **Restaurant log in:** owner with mobile number, code and PIN; staff and partners with the restaurant code and their PIN.
- **Our team:** https://ansarisaalim.github.io/qr-menu-demo/app/#team (password kept privately). Every restaurant with Demo / Trial / Paid, devices, installed app or browser, app version, last active; add a restaurant on the spot.

Data lives in Supabase (project `tnffprnunuaukqzpbufy`, see `app/schema.sql`). OTP and payments run on demo codes until SMS and Razorpay are approved.

The old clickable prototype with sample restaurants was retired on 1 Nov 2026; its old links now open the live website. Demo videos: `videos/`.

Built with React 18 and htm from a CDN, with no build step.
