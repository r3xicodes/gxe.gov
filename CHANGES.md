CHANGES
=======

Summary of edits made to prepare the site for GitHub Pages and add quick search

- Normalized asset and internal links
  - Replaced leading-slash absolute paths (e.g. `/assets/...`) with project-relative paths (e.g. `assets/...`) across HTML, JS, and CSS.
  - Files updated: top-level HTML files (index.html, about.html, contact.html, departments.html, diversity.html, login.html, privacy.html, terms.html, stop-alien-deportation.html, travel.html, dashboard.html, admin.html, accessibility.html, etc.), `assets/js/site.js`, `assets/css/styles.css`.

- Fixed HTML structural issues
  - Repaired malformed head/body in `contact.html` and cleaned duplicate manifest/script insertions where present.

- Added quick-search feature
  - `assets/js/site.js` now injects a keyboard-accessible quick-search overlay that scans the current page and the JSON feeds `assets/news.json` and `assets/events.json`.
  - `assets/css/styles.css` includes styles for the quick-search overlay.

- Misc
  - `assets/manifest.json` start_url was confirmed to be `index.html`.

Notes and next steps
- Commit and push the changes locally to trigger repository publishing (GitHub Pages). See instructions below.
- Optional: run an HTML validator and accessibility checks.

Recommended commit and push commands (run locally from project root):

```powershell
# Stage all edits
git add -A
# Commit with a clear message
git commit -m "Normalize asset and page links for project hosting; fix HTML structure; add quick search overlay"
# Push to main
git push origin main
```

After pushing, verify the GitHub Actions/Pages workflow and check the published site URL.

If you want, I can also create a pull request description or split changes into multiple commits; tell me your preference.
