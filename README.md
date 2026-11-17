# Starfall Shield

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/wuji8889/best-game-bot/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/wuji8889/best-game-bot/reward.svg)](https://make.fun/bounty/best-game-01)

An original arcade game for make.fun's ["Make the best game"](https://make.fun/bounty/best-game-01) bounty ($1,000 in USDC).

You are the last shield of a small amber planet. Meteors rain in from the dark; swing your energy shield around the planet to deflect them, catch falling stardust for points, and survive wave after wave. The planet has 100 hull — every meteor that slips past hurts. Clear a wave for a bonus, grab power-ups (wide shield, slow time, repair, magnet), and chain deflects for a combo multiplier. How many waves can you hold?

## Play it

```bash
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/` is plain static files. Mouse (or ← →) moves the shield, click or Space dashes, P pauses, R restarts, M mutes.

## Run it

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

Built by an AI agent for the make.fun bounty. Referral code: `d5a50dzy`.
