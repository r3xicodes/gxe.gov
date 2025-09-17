# GXE Government (Static GitHub Pages site)

This repository contains a simple, accessible, static website intended as a template for the Great Holy Xanarcica Empire (GXE). It is designed to be published via GitHub Pages.

How to publish

1. Push this repository to GitHub under your account (for example `r3xicodes/gxe.gov`).
2. In the repository Settings → Pages, set Source to the `main` branch and the root directory, then Save.
3. Wait a minute — the site will be published at one of these addresses:
   - If this is a project site: `https://<your-username>.github.io/gxe.gov`
   - If this repo is named `<your-username>.github.io` (user/org site): `https://<your-username>.github.io/`

Notes on link paths

- This template currently uses root-absolute links (for example `/about.html`). That works best if you publish as a user/org site (`<username>.github.io`).
- If you plan to publish as a project site (`<username>.github.io/gxe.gov`), converting links to relative paths (for example `about.html` or `./about.html`) is recommended. I can update links automatically if you want.

Custom domain and HTTPS

- To use a custom domain, add it in the Pages settings or create a `CNAME` file at the repository root with your domain.
- DNS options:
  - Apex domain: add A records pointed to GitHub Pages IPs (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153) and optionally a CNAME for `www`.
  - Subdomain (recommended): add a CNAME record for `www` pointing to `<your-username>.github.io` and configure your DNS provider to redirect the apex domain to `www`.

Extras I can add

- Convert links to project-site friendly relative paths — say "convert links".
- Add a GitHub Actions workflow for PR previews and automatic deployment — say "add preview workflow".
- Create a `CNAME` file and provide DNS configuration for a specific custom domain — provide the domain.

Demo authentication

- This repository includes a demo, client-side-only authentication flow (prompt-based, stored in localStorage) purely for interface demonstration and prototyping. It is NOT secure and should never be used for production authentication, storing PII, or protecting sensitive content.

Recommended production options

- Firebase Authentication: easy-to-integrate, supports email/password, social logins, and provides secure tokens.
- Supabase Auth: open-source alternative built on PostgreSQL; supports JWTs and session management.
- Auth0 / Okta: enterprise-ready identity providers with robust flows and multi-factor options.

If you want, I can replace the demo auth with a secure integration (pick a provider and I will scaffold the wiring and a minimal serverless token verifier or client flow). For GitHub Pages (static hosting), providers like Firebase or Auth0 with client-side SDKs + rules or a small serverless function (on Netlify, Vercel, or Azure Functions) to verify tokens are a common pattern.

Essential docs and templates added

- `privacy.html` — template privacy policy (edit before launch)
- `accessibility.html` — template accessibility statement
- `sitemap.xml` — basic sitemap (update domain)
- `robots.txt` — basic robots file
- `CNAME.example` — example custom domain file; rename to `CNAME` to enable
- `assets/js/firebase-config.js.template` — copy to `assets/js/firebase-config.js` and fill to enable Firebase Auth

Firebase + approval workflow (optional)
------------------------------------

If you want real accounts with an approval workflow, follow these steps.

1. Create a Firebase project at https://console.firebase.google.com/ and enable:
  - Authentication → Sign-in method → Email/Password
  - Firestore Database (start in test mode while developing, but switch to secured rules before production)

2. Copy `assets/js/firebase-config.js.template` to `assets/js/firebase-config.js` and fill in your project's config values. The site attempts to load `assets/js/firebase-config.js` automatically.

3. Deploy Firestore security rules. A recommended example is in `infra/firestore.rules`.
  - Using the Firebase CLI:

```bash
# install and login if necessary
npm install -g firebase-tools
firebase login
firebase init firestore
# replace the generated rules with infra/firestore.rules or copy its contents
firebase deploy --only firestore:rules
```

4. (Optional but recommended) Deploy an admin Cloud Function to perform approvals securely. An example function is in `infra/approve-user-function/index.js`.
  - This function uses the Firebase Admin SDK to update the user doc and set a custom claim `approved`.
  - Deploy with the Firebase CLI (from the `infra/approve-user-function` folder):

```bash
# from project root
cd infra/approve-user-function
npm init -y
npm install firebase-admin
# deploy using firebase-tools after adding functions config
firebase deploy --only functions:approveUser
```

5. Admins and custom claims
  - Use the Admin SDK (or Cloud Function) to set a custom claim on a user indicating admin status or `approved: true`.
  - Update Firestore rules to require `request.auth.token.admin == true` to list or update other users.

Security notes
 - Do NOT rely on client-side checks alone. Use Firestore rules and/or server-side functions to protect sensitive operations.
 - Remove public access (test mode) before launch.

If you'd like, I can:
- Add a small script to create `assets/js/firebase-config.js` automatically from environment variables.
- Scaffold a deployable Cloud Function `package.json` and `firebase.json` to simplify deploying the approval function.

Cloud Functions & email notifications
------------------------------------

This repository includes a `functions/` folder with an example callable function `approveUser` and a Firestore trigger `onUserApproved` that sends emails via SendGrid.

To deploy functions:

1. Install Firebase CLI and login:

```powershell
npm install -g firebase-tools
firebase login
```

2. Set your Firebase project (or update `.firebaserc`):

```powershell
firebase use --add
```

3. Set SendGrid and admin email config (example):

```powershell
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_KEY"
firebase functions:config:set admin.email="admin@yourdomain.tld"
```

Note: automated email sending is optional. By default the functions are configured to NOT send automated approval emails so you can handle notifications manually.
To enable automated emails, set the AUTO_EMAILS flag and provide a SendGrid key (or other provider):

```powershell
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_KEY"
firebase functions:config:set sendgrid.auto_emails="true"
firebase functions:config:set admin.email="admin@yourdomain.tld"
```

Or locally via environment variables when running functions:

```bash
SENDGRID_API_KEY=your_sendgrid_api_key
AUTO_EMAILS=true
```

4. Deploy functions from repository root:

```powershell
cd functions
npm install
cd ..
firebase deploy --only functions
```

How admin approval works (recommended secure flow)
- The `approveUser` callable function requires the caller to be authenticated and have an `admin` custom claim. The function updates the Firestore `users/{uid}` doc and sets an `approved` custom claim.
- `admin.html` currently uses client-side Firestore updates; you should replace that with calls to the callable `approveUser` function or protect updates via Firestore rules.

How to call the callable function from your admin UI (client-side example):

```javascript
// after firebase.initializeApp and firebase.auth
const approve = firebase.functions().httpsCallable('approveUser');
approve({ uid: 'USER_UID', approve: true }).then(res => console.log(res)).catch(err => console.error(err));
```

Next steps I can do for you:
- Replace `admin.html` client-side Firestore updates with a secure callable function call.
- Add example code to set admin custom claims from a server-side script.
- Add SendGrid templating or alternative notification channels.
 - If you prefer to notify users manually, keep `AUTO_EMAILS` disabled and send personalized messages from your email client. The `onUserApproved` trigger will skip sending when AUTO_EMAILS is false.

Continuous integration and previews
---------------------------------

This repo includes a simple GitHub Actions workflow at `.github/workflows/gh-pages.yml` which publishes the repository root to the `gh-pages` branch on pushes to `main`.

To enable:

- Make sure Actions are enabled in your repository Settings.
- The workflow uses the default `GITHUB_TOKEN` so no secret configuration is necessary for publishing to `gh-pages` (the workflow uses `peaceiris/actions-gh-pages`).

If you'd like preview deployments per PR or a separate preview environment, I can add a PR preview workflow that publishes per-branch previews.

Production authentication recommendations
----------------------------------------

For a production-ready site, replace the client-side demo auth with a secure provider. Common and easy-to-integrate options for static sites are:

- Firebase Authentication: client SDKs, secure token handling, and Firestore integration. Good for quick integration and small teams.
- Supabase Auth: open-source, JWT-based auth backed by PostgreSQL; integrates well with server-side verification if you add serverless functions.
- Auth0 / Okta: enterprise-grade providers with more features (MFA, SSO) but more setup.

Recommended pattern for GitHub Pages (static hosting):

1. Use a trusted identity provider (Firebase/Supabase/Auth0) for login and token issuance.
2. Protect server-side operations (approving accounts, sending emails) via Cloud Functions or a small serverless API that verifies the provider-issued token (do not rely on client-side checks).
3. Use Firestore (with rules) or a server-side database for storing user approval state and metadata.

If you want, I can scaffold a secure integration for any of the above providers and wire the admin approval flow to a callable Cloud Function.

Accessibility & keyboard notes
-----------------------------

The overlay menu includes basic Escape-to-close and a simple focus trap. For improved accessibility I recommend:

- Improving the focus trap to use a tested utility (e.g. focus-trap library) for edge cases.
- Ensuring all interactive elements have visible focus outlines (styles included) and clear labels.
- Running Lighthouse/accessibility audits and manual keyboard testing.

Theme semantics
---------------

The site supports five theme options in the overlay settings:

- `auto`: Uses the system preference (prefers-color-scheme). The site will pick `dark` or `light` accordingly.
- `dark`: Dark/navy background with white (or near-white) text and subtle accents. Good for general low-light use.
- `midnight`: True black background (`#000000`) with white text for maximum contrast and minimal light emission.
- `light`: Light/white background with dark text (`#0b1720`) for a classic, high-contrast reading experience.
- `colorblind`: High-contrast, solid colors optimized for users with color-vision differences. Interactive accents use strong, solid hues for clarity.

Switching themes removes previously-applied theme classes and applies only the selected theme. Theme preferences are saved in a cookie (preferred) and in `localStorage` as a fallback.

Hero slides & site pages
------------------------

The homepage hero is a simple slideshow powered by `assets/js/site.js` and the HTML markup in `index.html`.

- To edit slides: open `index.html` and find the `<section class="hero hero-fullbleed">` block. Each slide is a `<div class="slide" data-index="N">` element. Update `h2`, `p.lede`, or background image URL in the child `.slide-bg` element.
- Each slide can link to its own page by changing the CTA anchor `href`. The site already includes three dedicated pages:
  - `/travel.html` — Travel & Tourism
  - `/stop-alien-deportation.html` — STOP ALIEN DEPORTATION article
  - `/diversity.html` — Diversity & Inclusion

LocalStorage keys
-----------------

The site uses a few localStorage keys for demo preferences and state. These are safe to clear in the browser for testing.

- `gxe_newsletter_v1` — newsletter modal opt-in flag
- `gxe_home_poll_v1` — stored poll votes
- `gxe_demo_auth` — demo authentication payload (for the client-side demo login)
- `gxe_clocks` — saved clocks/timezones
- `gxe_theme_pref` — saved theme preference (also stored in a cookie)
- `gxe_reduce_ui` — reduce UI/motion flag (set to `'1'` when enabled)

If you'd like me to wire slide editing to a small admin JSON file (for non-technical editors) or add an admin UI to update slide text, I can scaffold that next.
