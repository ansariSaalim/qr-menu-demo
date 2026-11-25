# Updating the demo videos

The videos keep the original recording (music, timing, transitions) and replace only the scenes that changed.
These scripts were run from `/tmp/vid` (copy this folder there first).

1. `entry.js` → bundle React for offline testing: `esbuild entry.js --bundle --outfile=/tmp/rbuild/react-umd.js` (htm stand-in: `htm-mini.js`).
2. `shots.py` (+ `mock2.js`) → fresh app screenshots of Demo Kitchen (desktop 1280×900 @2x, phone 390×800 @3x).
3. `assets.py` (+ `cap.py`, `endcard.py`) → step captions, end card and screen crops. **Prices, trial days and the web address are set in `NEW_END` in `assets.py`.**
4. `compose.py d` / `compose.py m` → writes the new desktop / mobile video with the original audio.
5. `findsw.py` → OCR check that no outdated words (Swiggy, Zomato, SMS, old prices) remain.

Scene times (both videos): step 5 33–39 s · step 9 60–66 s · step 11 72–78 s · step 23 144–150 s · step 28 174–180 s · end card 180–186 s.

## Second update (Nov 2026): online orders, languages, three plans

Run from `/tmp/vid2`, on top of the videos made above.

1. `shots2.py` (+ `mock3.js`) → the online ordering page in English, Hindi, Gujarati and Tamil, the cart and UPI steps, and the kitchen screen with a delivery order.
2. `assets2.py` (+ `endcard2.py`, `cap.py` from above) → captions for steps 26 and 27, their screens, and the three-plan end card. **Plan prices are in `PLANS` in `assets2.py`.**
3. `compose2.py d` / `compose2.py m` → patches the videos in place, original audio kept.

Scene times: step 26 161.75–167.7 s · step 27 167.7–173.7 s · step 28 173.7–179.75 s · end card 179.75–186 s.
