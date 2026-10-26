import type { SkillReq } from './data';

export interface Milestone {
  id: string;
  title: string;
  /** OSRS Wiki page about the unlock itself. */
  wiki: string;
  why: string;
  stage: 'early' | 'mid' | 'late';
  /** Quests that must be finished. */
  quests: string[];
  /** Quests that only have to be started. */
  start?: string[];
  /** Extra levels needed beyond the quests' own requirements. */
  skills?: SkillReq[];
  /** Something WikiSync can't see (e.g. Kudos, a minigame); shown as a reminder. */
  note?: string;
}

/** Unlocks that matter most to an ironman, roughly in the order they are usually chased. */
export const MILESTONES: Milestone[] = [
  {
    id: 'waterfall',
    title: 'Waterfall Quest',
    wiki: 'Waterfall Quest',
    why: 'Free 13,750 Attack and Strength XP (1 → 30 in both) for a short, low-level quest.',
    stage: 'early',
    quests: ['Waterfall Quest'],
  },
  {
    id: 'morytania',
    title: 'Morytania access',
    wiki: 'Morytania',
    why: 'Opens Canifis, Barrows, the Slayer Tower and the rest of Morytania.',
    stage: 'early',
    quests: ['Priest in Peril'],
  },
  {
    id: 'spirit-trees',
    title: 'Spirit trees',
    wiki: 'Spirit tree',
    why: 'Fast travel between the Grand Tree, Tree Gnome Village, the Battlefield and the Gnome Stronghold.',
    stage: 'early',
    quests: ['Tree Gnome Village', 'The Grand Tree'],
  },
  {
    id: 'fairy-rings',
    title: 'Fairy rings',
    wiki: 'Fairy ring',
    why: 'The best transport network in the game; used on almost every trip.',
    stage: 'early',
    quests: ['Fairytale I - Growing Pains'],
    start: ['Fairytale II - Cure a Queen'],
    note: 'Start Fairytale II and talk to the Fairy Godfather. The skill requirements are only needed to finish it.',
  },
  {
    id: 'lost-city',
    title: 'Zanaris & dragon weapons',
    wiki: 'Zanaris',
    why: 'Wield the dragon dagger and longsword, and reach Zanaris (cosmic altar, fairy ring hub).',
    stage: 'early',
    quests: ['Lost City'],
  },
  {
    id: 'eagles-peak',
    title: 'Box traps',
    wiki: 'Box trap',
    why: 'Eagles’ Peak teaches box traps, which you need for chinchompas and many Hunter creatures.',
    stage: 'early',
    quests: ["Eagles' Peak"],
  },
  {
    id: 'ectophial',
    title: 'Ectophial',
    wiki: 'Ectophial',
    why: 'Unlimited teleport to Port Phasmatys, close to the Morytania farm patch.',
    stage: 'early',
    quests: ['Ghosts Ahoy'],
  },
  {
    id: 'sailing',
    title: 'Sailing',
    wiki: 'Sailing',
    why: 'Pandemonium unlocks the Sailing skill and your first boat.',
    stage: 'early',
    quests: ['Pandemonium'],
  },
  {
    id: 'varlamore',
    title: 'Varlamore',
    wiki: 'Varlamore',
    why: 'Children of the Sun opens Civitas illa Fortis, the quetzal transport network and Varlamore’s content.',
    stage: 'early',
    quests: ['Children of the Sun'],
  },
  {
    id: 'dragon-slayer-1',
    title: 'Rune & dragonhide bodies',
    wiki: 'Dragon Slayer I',
    why: 'Dragon Slayer I lets you wear the rune platebody and green d’hide body.',
    stage: 'early',
    quests: ['Dragon Slayer I'],
  },
  {
    id: 'avas',
    title: 'Ava’s accumulator',
    wiki: "Ava's accumulator",
    why: 'Picks up your arrows and gives a ranged boost. Ironmen live in it until the assembler.',
    stage: 'early',
    quests: ['Animal Magnetism'],
    skills: [{ skill: 'Ranged', level: 50, boostable: false }],
  },
  {
    id: 'gotr',
    title: 'Guardians of the Rift',
    wiki: 'Guardians of the Rift',
    why: 'The best Runecraft training for ironmen, plus essence pouches, rune rewards and the Raiments.',
    stage: 'early',
    quests: ['Temple of the Eye'],
  },
  {
    id: 'fossil-island',
    title: 'Fossil Island & birdhouses',
    wiki: 'Fossil Island',
    why: 'Birdhouse runs give passive Hunter XP and bird nests (seeds). Also hardwood trees and Volcanic Mine.',
    stage: 'mid',
    quests: ['Bone Voyage'],
    note: 'Bone Voyage needs 100 Kudos from the Varrock Museum.',
  },
  {
    id: 'miscellania',
    title: 'Kingdom of Miscellania',
    wiki: 'Managing Miscellania',
    why: 'Passive resources every day: herbs, seeds, maple logs, coal, fish and more.',
    stage: 'mid',
    quests: ['Throne of Miscellania'],
    note: 'Royal Trouble afterwards lets you employ more workers.',
  },
  {
    id: 'monkey-madness',
    title: 'Ape Atoll & dragon scimitar',
    wiki: 'Monkey Madness I',
    why: 'Monkey Madness I lets you wield the dragon scimitar and gives big Attack/Defence XP.',
    stage: 'mid',
    quests: ['Monkey Madness I'],
  },
  {
    id: 'fremennik',
    title: 'Fremennik Province',
    wiki: 'Fremennik Province',
    why: 'Rellekka, Waterbirth (Dagannoth Kings) and the route to Lunar Isle and Neitiznot.',
    stage: 'mid',
    quests: ['The Fremennik Trials'],
  },
  {
    id: 'ancients',
    title: 'Ancient Magicks',
    wiki: 'Ancient Magicks',
    why: 'Ice barrage and blood spells for bursting and bossing.',
    stage: 'mid',
    quests: ['Desert Treasure I'],
  },
  {
    id: 'lunars',
    title: 'Lunar spellbook',
    wiki: 'Lunar spellbook',
    why: 'NPC Contact, Humidify, Plank Make, Fertile Soil and more utility spells.',
    stage: 'mid',
    quests: ['Lunar Diplomacy'],
  },
  {
    id: 'piety',
    title: 'Piety & Chivalry',
    wiki: 'Piety',
    why: 'The best melee prayers until Prifddinas.',
    stage: 'mid',
    quests: ["King's Ransom"],
    skills: [
      { skill: 'Prayer', level: 70, boostable: false },
      { skill: 'Defence', level: 70, boostable: false },
    ],
    note: 'After King’s Ransom, finish Knight Waves Training Grounds in Camelot.',
  },
  {
    id: 'barrows-gloves',
    title: 'Barrows gloves',
    wiki: 'Barrows gloves',
    why: 'Best-in-slot gloves for most of the game, plus the Culinaromancer’s Chest.',
    stage: 'mid',
    quests: ['Recipe for Disaster - Culinaromancer'],
  },
  {
    id: 'thralls',
    title: 'Thralls',
    wiki: 'Thrall',
    why: 'A Kingdom Divided gives the Book of the Dead, which unlocks Arceuus thralls (free extra damage).',
    stage: 'mid',
    quests: ['A Kingdom Divided'],
  },
  {
    id: 'mage-arena-2',
    title: 'Imbued god cape',
    wiki: 'Mage Arena II',
    why: 'Mage Arena II gives the best mage cape until very late.',
    stage: 'mid',
    quests: ['Mage Arena II'],
  },
  {
    id: 'darkmeyer',
    title: 'Darkmeyer',
    wiki: 'Darkmeyer',
    why: 'Sins of the Father opens Darkmeyer, blisterwood, and Hallowed Sepulchre (Agility) after that.',
    stage: 'late',
    quests: ['Sins of the Father'],
  },
  {
    id: 'ds2',
    title: 'Vorkath & dragon platebody',
    wiki: 'Vorkath',
    why: 'Dragon Slayer II unlocks Vorkath (Ava’s assembler, steady loot) and the dragon platebody.',
    stage: 'late',
    quests: ['Dragon Slayer II'],
  },
  {
    id: 'zenytes',
    title: 'Demonic gorillas',
    wiki: 'Demonic gorilla',
    why: 'Monkey Madness II unlocks demonic gorillas, the ironman source of zenyte jewellery.',
    stage: 'late',
    quests: ['Monkey Madness II'],
  },
  {
    id: 'prifddinas',
    title: 'Prifddinas',
    wiki: 'Prifddinas',
    why: 'Song of the Elves opens the elf city: Gauntlet, Zalcano, crystal equipment and a bank next to everything.',
    stage: 'late',
    quests: ['Song of the Elves'],
  },
  {
    id: 'dt2',
    title: 'Desert Treasure II bosses',
    wiki: 'Desert Treasure II - The Fallen Empire',
    why: 'The four DT2 bosses give the ring upgrades and Soulreaper axe.',
    stage: 'late',
    quests: ['Desert Treasure II - The Fallen Empire'],
  },
];
