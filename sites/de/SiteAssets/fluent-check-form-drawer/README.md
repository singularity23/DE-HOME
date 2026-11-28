# Check Form section drawer

The drawer adapts the inline drawer example from UI Moments
[`gallery/fluent-ui/feedback.jsx`](https://github.com/guanmo-ai/ui-moments/blob/c9eece0fe425ee7dfe97d162d39d1665c3bf9368/gallery/fluent-ui/feedback.jsx).
The readable implementation is `dist/check-form-drawer.js`; it uses native
browser APIs and requires no build or runtime dependencies. The UI Moments
and Fluent UI licenses and the earlier bundle's third-party notices remain in
`LICENSE`, `FLUENT-LICENSE`, and `dist/THIRD_PARTY_LICENSES.md`.

Add content inside `#section-navigation-drawer` in the Check Form HTML.
Deploy `dist` alongside this directory and the Check Form. Saved HTML
snapshots retain the script reference, so the drawer requires the same
relative asset path; the form itself remains usable without it.
