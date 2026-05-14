# PGA Championship Pick 3 Live Site

This package uses your uploaded PGA Championship spreadsheet.

Imported pool entries: 70

## Vercel setup

You already added the API key. Confirm these environment variables exist in Vercel:

SLASH_GOLF_API_KEY = your Slash Golf / RapidAPI key
SLASH_GOLF_TOURN_ID = 033
SLASH_GOLF_YEAR = 2026

Optional:
SLASH_GOLF_API_HOST = live-golf-data.p.rapidapi.com

## Deploy

1. Unzip this package.
2. Upload the extracted files to GitHub.
3. Vercel will redeploy.
4. Open the Vercel URL.

## How it works

- The API key is protected in `/app/api/leaderboard/route.js`.
- The page fetches `/api/leaderboard`.
- The pool ranks by best current golf position, then next best, then third pick.
- Tied golf positions stay tied and move to the next comparison.
- All pool players remain visible; expand the pool leaderboard to see everyone.
- The best pick cell is highlighted green when it is leading/co-leading the tournament.

## API usage schedule

The app uses conservative browser polling:
- Thu/Fri: hourly
- Saturday: every 20 minutes
- Sunday front-nine window: every 4 minutes
- Sunday finish window: every 2 minutes
- Other times: hourly fallback

This keeps usage low for the free Slash Golf tier.
