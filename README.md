# OSRS Ironman Helper

A static website that reads your Old School RuneScape progress from
[WikiSync](https://oldschool.runescape.wiki/w/RuneScape:WikiSync) and tells you what to do next as an ironman:

- **What next**: quests you can start right now (in the wiki's ironman optimal quest order), the skill levels
  that unlock the most, key unlocks within reach, and the diary tiers you're closest to.
- **Quests**: the full ironman quest path with each quest's status, requirements and rewards, plus the skill
  levels still needed for the quest cape.
- **Key unlocks**: ironman milestones (fairy rings, Barrows gloves, Fossil Island, Piety, Prifddinas, …) with the
  quests still needed for each, in order.
- **Diaries**: all 48 tiers, with task progress, missing requirements and rewards.
- **Skills**: best levels to train for unlocks, combat, closest 99s, lagging skills and every diary's levels.

## Using it

1. Install the **WikiSync** plugin from the RuneLite Plugin Hub and log in once.
2. Open the site and enter your RuneScape name. Data is fetched straight from
   `https://sync.runescape.wiki/runelite/player/<name>/STANDARD`.
3. If that fails, use **Paste JSON**: open the URL above in a browser, copy the result and paste it in.

Your last lookup is remembered in the browser and refreshed when you come back. `?rsn=Your Name` in the URL
loads a player directly.

## How it works

Everything runs in the browser; there is no backend. All requirement data is bundled into the site at build
time (`src/data/*.json`) and the advice is computed from your WikiSync data on page load
(`src/lib/advice.ts`).

WikiSync only reports levels, not XP, so XP estimates assume you're at the start of your current level.

## Development

```sh
npm install
npm run dev     # local dev server
npm test        # unit tests for the advice engine
npm run build   # production build in dist/
```

## Updating quest data

`src/data/` is generated from the [Quest Helper](https://github.com/Zoinkwiz/quest-helper) plugin's source
(requirements, rewards and the ironman quest order) and the
[WikiSync API](https://github.com/weirdgloop/wikisync-api) (quest names). The script only reads the source as
text.

```sh
git clone --depth 1 https://github.com/Zoinkwiz/quest-helper /tmp/qh
git clone --depth 1 https://github.com/weirdgloop/wikisync-api /tmp/ws
python3 scripts/extract_quest_data.py /tmp/qh /tmp/ws
```

Quests Quest Helper doesn't cover go in `scripts/quest_overrides.json`. The curated milestones live in
`src/lib/milestones.ts`.

## Deploying

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to the default branch. Enable it once
under **Settings → Pages → Build and deployment → Source: GitHub Actions**.
