#!/usr/bin/env python3
"""
Generate src/data/*.json from a checkout of the Quest Helper RuneLite plugin
(https://github.com/Zoinkwiz/quest-helper) and the WikiSync API
(https://github.com/weirdgloop/wikisync-api).

The Java source is only read as text; nothing is compiled or executed.

Usage:
  git clone --depth 1 https://github.com/Zoinkwiz/quest-helper /tmp/qh
  git clone --depth 1 https://github.com/weirdgloop/wikisync-api /tmp/ws
  python3 scripts/extract_quest_data.py /tmp/qh /tmp/ws
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "src", "data")

SKILLS = {
    "ATTACK": "Attack", "STRENGTH": "Strength", "DEFENCE": "Defence", "RANGED": "Ranged",
    "PRAYER": "Prayer", "MAGIC": "Magic", "RUNECRAFT": "Runecraft", "CONSTRUCTION": "Construction",
    "HITPOINTS": "Hitpoints", "AGILITY": "Agility", "HERBLORE": "Herblore", "THIEVING": "Thieving",
    "CRAFTING": "Crafting", "FLETCHING": "Fletching", "SLAYER": "Slayer", "HUNTER": "Hunter",
    "MINING": "Mining", "SMITHING": "Smithing", "FISHING": "Fishing", "COOKING": "Cooking",
    "FIREMAKING": "Firemaking", "WOODCUTTING": "Woodcutting", "FARMING": "Farming", "SAILING": "Sailing",
}

DIARY_NAMES = {
    "ARDOUGNE": "Ardougne", "DESERT": "Desert", "FALADOR": "Falador", "FREMENNIK": "Fremennik",
    "KANDARIN": "Kandarin", "KARAMJA": "Karamja", "KOUREND": "Kourend & Kebos",
    "LUMBRIDGE": "Lumbridge & Draynor", "MORYTANIA": "Morytania", "VARROCK": "Varrock",
    "WESTERN": "Western Provinces", "WILDERNESS": "Wilderness",
}


# Quest Helper labels for Recipe for Disaster parts that differ from WikiSync's names.
RFD_LABELS = {
    "RFD - Start": "Recipe for Disaster - Another Cook's Quest",
    "RFD - Finale": "Recipe for Disaster - Culinaromancer",
}


def norm(name):
    return re.sub(r"[^A-Z0-9]", "", name.upper())


def balanced(text, start, open_ch="(", close_ch=")"):
    """Return index just past the bracket that closes the one at text[start]."""
    depth = 0
    i = start
    in_str = None
    while i < len(text):
        c = text[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == in_str:
                in_str = None
        elif c in "\"'":
            in_str = c
        elif c == open_ch:
            depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return len(text)


def strip_comments(src):
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return re.sub(r"//[^\n]*", "", src)


def parse_enum(qh):
    path = os.path.join(qh, "src/main/java/com/questhelper/questinfo/QuestHelperQuest.java")
    src = strip_comments(open(path).read())
    entries = []
    for m in re.finditer(r"\n\s*([A-Z0-9_]+)\(new (\w+)\(\)", src):
        end = balanced(src, m.start(0) + src[m.start(0):].index("("))
        body = src[m.start(0):end]
        name_m = re.search(r"\(\),\s*(?:Quest\.([A-Z0-9_]+)(?:\.getId\(\),\s*\"([^\"]+)\")?|\"([^\"]+)\")", body)
        type_m = re.search(r"QuestDetails\.Type\.(\w+)", body)
        entries.append({
            "enum": m.group(1),
            "cls": m.group(2),
            "questConst": name_m.group(1) if name_m and not name_m.group(2) else None,
            "label": (name_m.group(2) or name_m.group(3)) if name_m else None,
            "type": type_m.group(1) if type_m else None,
        })
    return entries


def index_helpers(qh):
    files = {}
    for d, _, fs in os.walk(os.path.join(qh, "src/main/java/com/questhelper/helpers")):
        for f in fs:
            if f.endswith(".java"):
                files.setdefault(f[:-5], []).append(os.path.join(d, f))
    return files


def method_body(src, name):
    m = re.search(r"\b" + name + r"\s*\(\s*\)\s*\{", src)
    if not m:
        return None
    start = m.end() - 1
    return src[start:balanced(src, start, "{", "}")]


def assignments(src):
    out = {}
    for m in re.finditer(r"\b(\w+)\s*=\s*(new \w+\s*\()", src):
        end = balanced(src, m.end(2) - 1)
        out.setdefault(m.group(1), src[m.start(2):end])
    return out


def drop_or_groups(text):
    # Requirements that can be satisfied in more than one way are left out:
    # the planner only tracks hard requirements.
    out = text
    for pat in (r"new ComplexRequirement\(\s*LogicType\.OR", r"new Conditions\(\s*LogicType\.OR", r"\bor\("):
        while True:
            m = re.search(pat, out)
            if not m:
                break
            start = out.index("(", m.start())
            out = out[:m.start()] + out[balanced(out, start):]
    return out


def expand(text, assigns, depth=0):
    if depth > 4:
        return text

    def sub(m):
        word = m.group(0)
        if word in assigns:
            return expand(assigns[word], assigns, depth + 1)
        return word

    return re.sub(r"\b[a-z]\w*\b", sub, text)


def extract_reqs(src, enum_to_name):
    src = strip_comments(src)
    body = method_body(src, "getGeneralRequirements")
    if body is None:
        return None
    text = drop_or_groups(expand(body, assignments(src)))
    skills, quests, other = {}, {}, {}
    for m in re.finditer(r"SkillRequirement\(\s*Skill\.(\w+)\s*,\s*(\d+)\s*(?:,\s*(true|false))?", text):
        skill = SKILLS.get(m.group(1))
        if not skill:
            continue
        lvl = int(m.group(2))
        boost = m.group(3) == "true"
        prev = skills.get(skill)
        if not prev or lvl > prev["level"]:
            skills[skill] = {"level": lvl, "boostable": boost}
    for m in re.finditer(r"QuestRequirement\(\s*QuestHelperQuest\.(\w+)\s*,\s*QuestState\.(\w+)", text):
        name = enum_to_name.get(m.group(1))
        if not name:
            continue
        state = "finished" if m.group(2) == "FINISHED" else "started"
        if quests.get(name) != "finished":
            quests[name] = state
    # Some prerequisites are written as raw quest varbit checks, e.g. a Recipe for Disaster part.
    for m in re.finditer(r"VarbitRequirement\(\s*QuestVarbits\.QUEST_(\w+)\.getId\(\)[^\"]*\"([^\"]*)\"", text):
        name = enum_to_name.get(m.group(1))
        if name and name not in quests:
            quests[name] = "finished" if re.search(r"inish|omplet", m.group(2)) else "started"
    m = re.search(r"QuestPointRequirement\(\s*(\d+)", text)
    if m:
        other["questPointsRequired"] = int(m.group(1))
    m = re.search(r"CombatLevelRequirement\(\s*(\d+)", text)
    if m:
        other["combatLevel"] = int(m.group(1))
    return {
        "skills": [{"skill": k, **v} for k, v in sorted(skills.items())],
        "quests": [{"name": k, "state": v} for k, v in quests.items()],
        **other,
    }


def rewards(src):
    src = strip_comments(src)
    xp = [
        {"skill": SKILLS[m.group(1)], "xp": int(m.group(2).replace("_", "")), **({"choice": True} if m.group(3) == "true" else {})}
        for m in re.finditer(r"new ExperienceReward\(\s*Skill\.(\w+)\s*,\s*([\d_]+)\s*(?:,\s*(true|false))?", src)
        if m.group(1) in SKILLS
    ]
    items = []
    for m in re.finditer(r"new ItemReward\(\s*\"([^\"]+)\"\s*,\s*[\w.]+\s*(?:,\s*(\d+))?", src):
        items.append(f"{m.group(2)} x {m.group(1)}" if m.group(2) and m.group(2) != "1" else m.group(1))
    unlocks = re.findall(r"new UnlockReward\(\s*\"((?:[^\"\\]|\\.)*)\"", src)
    out = {}
    if xp:
        out["xp"] = xp
    if items:
        out["items"] = items
    if unlocks:
        out["unlocks"] = [u.replace('\\"', '"') for u in unlocks]
    return out


def qp_reward(src):
    m = re.search(r"new QuestPointReward\(\s*(\d+)", src)
    return int(m.group(1)) if m else 0


def main(qh, ws):
    wiki_names = set(json.load(open(os.path.join(ws, "src/runelite/data/questVarbits.json"))))
    wiki_names |= set(json.load(open(os.path.join(ws, "src/runelite/data/questVarps.json"))))
    wiki_names.discard(".")
    by_norm = {norm(n): n for n in wiki_names}

    entries = parse_enum(qh)
    helpers = index_helpers(qh)

    enum_to_name = {}
    for e in entries:
        if e["type"] in ("P2P", "F2P", "MINIQUEST"):
            label = e["label"] or ""
            label = RFD_LABELS.get(label, label.replace("RFD - ", "Recipe for Disaster - "))
            key = norm(e["questConst"] or label)
            name = by_norm.get(key)
            if name:
                enum_to_name[e["enum"]] = name

    quests, diaries, missing = {}, {}, []
    for e in entries:
        files = helpers.get(e["cls"]) or []
        src = "\n".join(open(f).read() for f in files)
        if e["enum"] in enum_to_name:
            name = enum_to_name[e["enum"]]
            reqs = extract_reqs(src, enum_to_name) if src else None
            if reqs is None:
                missing.append(name)
                reqs = {"skills": [], "quests": []}
            quests[name] = {
                "name": name,
                "miniquest": e["type"] == "MINIQUEST",
                "members": e["type"] != "F2P",
                "questPoints": qp_reward(src) if e["type"] != "MINIQUEST" else 0,
                **reqs,
                "rewards": rewards(src),
            }
        elif e["type"] == "ACHIEVEMENT_DIARY":
            m = re.match(r"([A-Z]+)_(EASY|MEDIUM|HARD|ELITE)$", e["enum"])
            if not m or m.group(1) not in DIARY_NAMES:
                continue
            reqs = extract_reqs(src, enum_to_name) or {"skills": [], "quests": []}
            diary = DIARY_NAMES[m.group(1)]
            diaries.setdefault(diary, {})[m.group(2).capitalize()] = {**reqs, "rewards": rewards(src)}

    # Quests Quest Helper has no helper for; hand-maintained.
    overrides = json.load(open(os.path.join(ROOT, "scripts", "quest_overrides.json")))
    for q in overrides:
        quests.setdefault(q["name"], q)
    # "Recipe for Disaster" in WikiSync is the whole quest; its parts carry the requirements and
    # quest points, so the parent only stands for "Culinaromancer finished".
    rfd_parts = [n for n in quests if n.startswith("Recipe for Disaster - ") and not n.endswith("Culinaromancer")]
    culinaromancer = quests["Recipe for Disaster - Culinaromancer"]
    have = {r["name"] for r in culinaromancer["quests"]}
    culinaromancer["quests"] += [{"name": n, "state": "finished"} for n in sorted(rfd_parts) if n not in have]
    quests["Recipe for Disaster"] = {
        "name": "Recipe for Disaster", "miniquest": False, "members": True, "questPoints": 0,
        "aggregate": True, "skills": [],
        "quests": [{"name": "Recipe for Disaster - Culinaromancer", "state": "finished"}],
    }

    order_src = open(os.path.join(qh, "src/main/java/com/questhelper/panel/questorders/IronmanOptimalQuestGuide.java")).read()
    order = [enum_to_name[x] for x in re.findall(r"QuestHelperQuest\.(\w+)", order_src) if x in enum_to_name]

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "quests.json"), "w") as f:
        json.dump(sorted(quests.values(), key=lambda q: q["name"]), f, indent=1, ensure_ascii=False)
    with open(os.path.join(OUT_DIR, "diaries.json"), "w") as f:
        json.dump(diaries, f, indent=1, ensure_ascii=False)
    with open(os.path.join(OUT_DIR, "ironmanQuestOrder.json"), "w") as f:
        json.dump(order, f, indent=1, ensure_ascii=False)

    print(f"{len(quests)} quests, {sum(len(d) for d in diaries.values())} diary tiers, {len(order)} ordered")
    print("WikiSync names without Quest Helper data:", sorted(wiki_names - set(quests)))
    print("No getGeneralRequirements():", missing)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
