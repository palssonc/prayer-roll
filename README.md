# Prayer Roll

Prayer Roll is a local-first, static Progressive Web App for keeping a prayer roll on your phone. It runs entirely in the browser, stores data locally on the device, and can be published with GitHub Pages.

## Features

- Two-screen flow: `Add Names` and `Prayer Roll`
- Two prayer rhythms:
  - `Daily for a week`
  - `Once a week for two months`
- Missed dates stay visible without duplicating the same name
- Finished runs are surfaced for renewal so they do not get lost
- Offline-friendly PWA shell for installable phone use

## Local Use

Open [index.html](./index.html) in a browser, or serve the folder with a simple static server if your browser blocks service workers from `file:` URLs.

## Tests

```bash
npm test
```

## GitHub Pages

1. Create a GitHub repository named `prayer-roll`.
2. Push the contents of this folder to the repository.
3. In GitHub, open `Settings` -> `Pages`.
4. Set the source to deploy from the main branch root.
5. Visit the published Pages URL once it is live.

## Install on Phone

### iPhone

1. Open the GitHub Pages URL in Safari.
2. Tap `Share`.
3. Tap `Add to Home Screen`.

### Android

1. Open the GitHub Pages URL in Chrome.
2. Tap the browser menu.
3. Tap `Install app` or `Add to Home screen`.

## Data Storage

Prayer entries are stored in browser local storage on the device where you use the app. Clearing site data or uninstalling the browser storage can remove that data.
