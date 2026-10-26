# OSRS Ironman Helper

A static website that shows your Old School RuneScape stats and tells you what to do next as an ironman:

- **What next**: quests you can do right now (in the wiki's ironman optimal quest order), the skill levels
  that unlock the most, key unlocks within reach, and the diary tiers you're closest to.
- **Quests**: the full ironman quest path with each quest's status, requirements and rewards, plus the skill
  levels still needed for the quest cape.
- **Key unlocks**: ironman milestones (fairy rings, Barrows gloves, Fossil Island, Piety, Prifddinas, …) with the
  quests still needed for each, in order.
- **Diaries**: all 48 tiers, with task progress, missing requirements and rewards.
- **Skills**: best levels to train for unlocks, combat, closest 99s, lagging skills and every diary's levels.

## Where the data comes from

- **Levels and XP** come from the official Hiscores through [Wise Old Man](https://wiseoldman.net), fetched
  when you enter your name. `?rsn=Your Name` in the URL loads a player directly.
- **Quest and diary progress** starts from `src/data/myProgress.json` (read from in-game screenshots) and is
  updated on the site: mark quests done in the Quests tab and count diary tasks in the Diaries tab. Changes are
  saved in the browser; use *Download backup* to keep a copy or move it to another device.

WikiSync isn't used: the OSRS Wiki blocks it for third-party sites.

## How it works

Everything runs in the browser; there is no backend. All requirement data is bundled into the site at build
time (`src/data/*.json`) and the advice is computed on page load (`src/lib/advice.ts`).

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
