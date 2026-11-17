# Neon Tide: Solmar Bay

[![make.fun competition](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![make.fun rank](https://make.fun/badge/gta6-01/deva1999/makefun-gta6-01-a/rank.svg)](https://make.fun/bounty/gta6-01)
[![make.fun reward](https://make.fun/badge/gta6-01/deva1999/makefun-gta6-01-a/reward.svg)](https://make.fun/bounty/gta6-01)

Neon Tide: Solmar Bay is an original open-world crime game that plays offline in a desktop browser from the static files in `game/` — explore a sun-soaked coastal city on foot and by car, steal cars, run a five-job story for fixer Lucia Maré, fight the Coral Kings, and dodge the SBPD wanted system, with traffic, pedestrians, combat, a HUD with a live minimap, synthesized sound and a browser save.
It was built for the [make.fun](https://make.fun/bounty/gta6-01) "Make GTA 6" bounty (gta6-01); every name, character, vehicle, place, piece of art and sound in it is original to this repository.

## Run

The program is `main.ts` (Node 22, standard library only). It copies `game/` and `screenshots/` into the output directory and writes `dossier.json` there:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Without `MAKEFUN_OUTPUT_DIR` it writes to `/output`. To play the game itself, serve `game/` with any static file server and open `index.html` in desktop Chrome.
