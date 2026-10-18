# Games / Rules update verification

`games-rules-check.cjs` is a development-only browser check. It is not loaded by the site and is not a runtime dependency.

It checks all seven pages for horizontal overflow at 375, 768 and 1440 px, then exercises Games and Rules: connected filters, empty/reset states, selection and focus, validation and correction, safe user-text rendering, live counter, valid summary, repeated submission, booking handoff, checklist progress/confirmation/uncheck/reset, and console/resource errors.

The current machine-readable result and source hashes are in `games-rules-update.json`. The provided ZIP's HTML/CSS baseline comparison is in `games-rules-freeze.json`. Actual Git midterm/tag history is not available in the uploaded archive.

To rerun with an installed Node.js, Playwright and Chromium:

```sh
node checks/games-rules-check.cjs
```

Optional environment variables are documented at the top of the script. These QA packages are not included in the website ZIP. Opening index.html requires only a browser.

Historical reports and screenshots shipped with the original ZIP remain historical; they do not prove the current source state. Internal screenshots from this update were used for visual inspection and are not included as additional deliverables.
