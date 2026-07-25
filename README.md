# Kheyal Khusi

Handmade art & craft e-commerce website. Built in phases with plain **HTML5, CSS3, and vanilla JavaScript (ES6)** — no frameworks — so it stays easy to read and edit.

## Phase 1 (current): Homepage

Built so far:

```
index.html
css/
  global.css        → design tokens, resets, header, footer, buttons (used site-wide)
  home.css           → styles used only on index.html
  responsive.css      → mobile/tablet/laptop breakpoints (loaded last, overrides the rest)
js/
  app.js             → shared UI behavior: mobile nav, sticky header, search, scroll reveal,
                       back-to-top, toast messages, testimonial slider, newsletter form
  wishlist.js        → heart-icon toggle on product cards (currently saved in the browser
                       only — will move to Firestore once Login/Signup is built)
  firebase.js        → stub with a placeholder config object, ready for Phase "Login & Signup"
README.md
```

## Design tokens (css/global.css → `:root`)

| Token | Value | Use |
|---|---|---|
| `--color-cream` | `#FFF8F2` | Page background |
| `--color-terracotta` | `#C86B4A` | Primary accent, buttons, links |
| `--color-sage` | `#8CA68C` | Secondary accent (newsletter, badges) |
| `--color-gold` | `#C9A227` | Highlights, stars, dividers |
| `--color-brown` | `#4B3621` | Text, footer background |

Fonts: **Playfair Display** (headings) + **Poppins** (body), loaded from Google Fonts in `global.css`.

## Signature detail

Dashed "running stitch" lines (see `.stitch-divider`, `.hero-underline`, `.hero-stitch-ring`) are used as a visual signature throughout the site — a nod to Bengal's traditional **kantha** hand-embroidery, since every product on the site is handmade.

## Before going live

1. **Images** — every `<img>` currently points to a `placehold.co` placeholder with a text label (e.g. "Handmade Pottery"). Replace these with real photos saved in `assets/images/`.
2. **Firebase** — open `js/firebase.js` and follow the instructions inside to connect your own Firebase project (Firestore, Authentication, Storage). Do this before we build Login/Signup.
3. **Razorpay** — no keys are added yet. When we reach the Checkout phase, you'll add your Razorpay Key ID (and Secret, server-side only) in a clearly marked spot.
4. **Favicon** — add a real icon at `assets/icons/favicon.png`.
5. **Contact details** — the footer currently has placeholder phone/email/address text — update with your real details.

## Not built yet

Every other page in the project structure (`shop.html`, `product.html`, `cart.html`, `checkout.html`, `login.html`, the `admin/` section, etc.) will be built one phase at a time, on request.
