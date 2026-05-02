# Azərbaycan Radio

A free static Azerbaijani radio player styled like a 2000s car audio head unit.

## What it does

- Loads Azerbaijani radio stations from Radio Browser
- Uses only free public resources
- Plays stations in the browser
- Car audio head-unit inspired interface
- Blue display and spectrum animation
- Station logo inside the display
- Preset memory buttons 1–6
- Curated Azerbaijani station mode
- Search
- Favorites
- Recently played
- Night mode
- PWA support
- Runs on GitHub Pages
- No backend
- No login
- No paid services

## Project structure

```text
azerbaycan-radio/
  index.html
  style.css
  app.js
  README.md
  icon.svg
  manifest.json
  service-worker.js
```

## Deploy on GitHub Pages

1. Create a public GitHub repository called `azerbaycan-radio`.
2. Upload all files to the root of the repository.
3. Go to **Settings**.
4. Go to **Pages**.
5. Select:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Save.

Your app will be available at:

```text
https://yourusername.github.io/azerbaycan-radio/
```

## Notes

This is an aesthetic tribute to 2000s car audio head units that were popular in Azerbaijan. It is not affiliated with Pioneer or any audio brand.

Some stations may not play because public radio streams can be broken, blocked, or changed.


## v1.1 CSS loading fix

This version uses versioned local asset filenames:

```text
style-v1-1.css
app-v1-1.js
```

The original `style.css` and `app.js` are also included as fallback copies.

If the page appears unstyled, make sure all files are uploaded to the root of the GitHub repository, not inside an extra folder.
