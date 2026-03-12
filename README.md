# Apple Refurbished Mac Studio Monitor

This repository monitors refurbished `Mac Studio` listings on the Apple Store for:

- US: `https://www.apple.com/shop/refurbished/mac/mac-studio`
- Canada: `https://www.apple.com/ca/shop/refurbished/mac/mac-studio`
- Taiwan: `https://www.apple.com/tw/shop/refurbished/mac/mac-studio`

It checks the pages every hour in GitHub Actions, stores the last successful snapshot on a dedicated `monitor-state` branch, and sends a Telegram report after the initial baseline is seeded.

## What it tracks

- `new` items: currently listed but not present in the previous successful snapshot for that store
- `old` items: currently listed and already seen in the previous successful snapshot for that store
- returned items: treated as `new` again if they disappeared in an earlier snapshot and later reappeared

## Local commands

- `npm test`
- `npm run monitor`
- `npm run telegram`

Running `npm run monitor` locally writes ignored artifacts to `state/`:

- `state/monitor-state.json`
- `state/latest.json`
- `state/latest.md`

## GitHub setup

1. Initialize this directory as a Git repository if needed.
2. Push it to GitHub.
3. Add these repository secrets:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
4. Enable GitHub Actions for the repository.
5. Run the workflow manually once with `workflow_dispatch`.

The first successful run seeds the baseline and does not send Telegram. Every later run sends a Telegram summary, even if there are no new items.

