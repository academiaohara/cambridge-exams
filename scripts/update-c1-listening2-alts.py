#!/usr/bin/env python3
"""Add conservative single-word alternatives to C1 listening2.json answers."""

import json
import glob
import os
from copy import deepcopy

# Primary answer -> additional accepted shorter form(s).
# Only cases where the modifier adds precision but the noun alone is clear in context.
ACCEPT_ALTS = {
    "3D model": "model",
    "3D printing": "printing",
    "AI-guided plan": "plan",
    "advance guard": "guard",
    "agricultural pesticides": "pesticides",
    "agricultural waste": "waste",
    "air quality": "quality",
    "alphabet blocks": "blocks",
    "alternative containers": "containers",
    "ash content": "content",
    "average temperature": "temperature",
    "background chatter": "chatter",
    "battery recycling": "recycling",
    "battery storage": "storage",
    "behavioral cues": "cues",
    "benefit-sharing agreements": "agreements",
    "bicycle frame": "frame",
    "biological necessity": "necessity",
    "biting insects": "insects",
    "black coffee": "coffee",
    "black-and-white photos": "photos",
    "blog series": "series",
    "blue light": "light",
    "blueprint drawings": "drawings",
    "book chapter": "chapter",
    "botanical garden": "garden",
    "broken umbrella": "umbrella",
    "buoyancy system": "system",
    "calm temperament": "temperament",
    "car ownership": "ownership",
    "certification program": "program",
    "chemical analysis": "analysis",
    "chemical fumes": "fumes",
    "chemical smells": "smells",
    "circular floorplan": "floorplan",
    "circular polarizer": "polarizer",
    "city guide": "guide",
    "climate clock": "clock",
    "clogged gills": "gills",
    "cognitive function": "function",
    "color intensity": "intensity",
    "community apprenticeship": "apprenticeship",
    "community volunteers": "volunteers",
    "consistent texture": "texture",
    "constant daylight": "daylight",
    "consumer education": "education",
    "consumer prejudice": "prejudice",
    "cool temperature": "temperature",
    "cover crops": "crops",
    "crushed beetles": "beetles",
    "cultural shift": "shift",
    "cylindrical rods": "rods",
    "dark-colored rocks": "rocks",
    "dehydration techniques": "techniques",
    "dense foliage": "foliage",
    "deployment timing": "timing",
    "digital archive": "archive",
    "digital archiving": "archiving",
    "digital database": "database",
    "documentary script": "script",
    "educational campaigns": "campaigns",
    "emotional connection": "connection",
    "emotional core": "core",
    "environmental footprint": "footprint",
    "environmental studies": "studies",
    "evaporation rate": "rate",
    "excellent concentration": "concentration",
    "excessive moisture": "moisture",
    "exhaust fumes": "fumes",
    "fire resistance": "resistance",
    "floral diversity": "diversity",
    "food fraud": "fraud",
    "food preservation": "preservation",
    "food security": "security",
    "forgotten diary": "diary",
    "gene editing": "editing",
    "genetic diversity": "diversity",
    "giant tubeworms": "tubeworms",
    "global moratorium": "moratorium",
    "global shortage": "shortage",
    "glowing jellyfish": "jellyfish",
    "government regulations": "regulations",
    "grand cathedral": "cathedral",
    "graphic designers": "designers",
    "grassland restoration": "restoration",
    "green barriers": "barriers",
    "guest column": "column",
    "gym facilities": "facilities",
    "habitat loss": "loss",
    "hairline crack": "crack",
    "handmade candles": "candles",
    "hard surfaces": "surfaces",
    "harvesting drones": "drones",
    "heat signature": "signature",
    "heavy equipment": "equipment",
    "heavy hailstorm": "hailstorm",
    "heavy raincoat": "raincoat",
    "heavy snowfall": "snowfall",
    "heavy storms": "storms",
    "heavy-lift vessel": "vessel",
    "hidden landscape": "landscape",
    "high cost": "cost",
    "historical accuracy": "accuracy",
    "historical scents": "scents",
    "honey extraction": "extraction",
    "human presence": "presence",
    "humidity fluctuations": "fluctuations",
    "humidity level": "level",
    "hydration levels": "levels",
    "indigenous knowledge": "knowledge",
    "industry trend": "trend",
    "internal ladder": "ladder",
    "internal temperature": "temperature",
    "international cooperation": "cooperation",
    "invisible bridge": "bridge",
    "junction design": "design",
    "leaf density": "density",
    "leather bag": "bag",
    "leather boot": "boot",
    "legal framework": "framework",
    "legal meetings": "meetings",
    "legal permits": "permits",
    "lighting design": "design",
    "lightning photos": "photos",
    "lime trees": "trees",
    "limited supply": "supply",
    "local details": "details",
    "local fisherman": "fisherman",
    "local fishermen": "fishermen",
    "long queue": "queue",
    "low-frequency hums": "hums",
    "low-frequency rumbles": "rumbles",
    "magnifying glass": "glass",
    "market report": "report",
    "market saturation": "saturation",
    "mass production": "production",
    "medical images": "images",
    "medicinal plants": "plants",
    "meltwater lakes": "lakes",
    "mental fatigue": "fatigue",
    "mentorship program": "program",
    "micro-suction tool": "tool",
    "museum guide": "guide",
    "natural resin": "resin",
    "natural ventilation": "ventilation",
    "neural pruning": "pruning",
    "nutrient exchange": "exchange",
    "nutrient solution": "solution",
    "oak moss": "moss",
    "ocean currents": "currents",
    "oil paintings": "paintings",
    "online workshop": "workshop",
    "oxygen absorbers": "absorbers",
    "oxygen levels": "levels",
    "pencil indentations": "indentations",
    "permafrost preservation": "preservation",
    "personalized medicine": "medicine",
    "photography competition": "competition",
    "physical coordination": "coordination",
    "pickled fish": "fish",
    "pineapple leaves": "leaves",
    "policy brief": "brief",
    "policy document": "document",
    "porcelain bowl": "bowl",
    "postgraduate course": "course",
    "practical guide": "guide",
    "privacy invasion": "invasion",
    "probiotic benefits": "benefits",
    "proximity sensors": "sensors",
    "public awareness": "awareness",
    "public perception": "perception",
    "quiet atmosphere": "atmosphere",
    "reaction times": "times",
    "reclaimed wood": "wood",
    "reconstructed hull": "hull",
    "reconstruction project": "project",
    "recycled sawdust": "sawdust",
    "recycled steel": "steel",
    "research paper": "paper",
    "reverberation time": "time",
    "ripening speed": "speed",
    "rubber pads": "pads",
    "safety certification": "certification",
    "safety protocol": "protocol",
    "safety seminar": "seminar",
    "salt concentration": "concentration",
    "sandy seabed": "seabed",
    "satellite imagery": "imagery",
    "scent intensity": "intensity",
    "scent memory": "memory",
    "school curriculum": "curriculum",
    "scientific paper": "paper",
    "seam placement": "placement",
    "seasonal picker": "picker",
    "secure storage": "storage",
    "sediment cloud": "cloud",
    "self-repairing fabrics": "fabrics",
    "shattered windows": "windows",
    "silver coin": "coin",
    "skin chemistry": "chemistry",
    "slurping technique": "technique",
    "software tool": "tool",
    "soil composition": "composition",
    "solar panels": "panels",
    "solar-powered freezers": "freezers",
    "solar-powered heaters": "heaters",
    "sonar interference": "interference",
    "sonar map": "map",
    "spicy food": "food",
    "spider’s web": "web",
    "stone amphitheatre": "amphitheatre",
    "strawberry crops": "crops",
    "stricter regulations": "regulations",
    "stuffed dodo": "dodo",
    "summer internship": "internship",
    "surface texture": "texture",
    "synthetic resins": "resins",
    "tactile experience": "experience",
    "technical manual": "manual",
    "termite mound": "mound",
    "textile manufacturers": "manufacturers",
    "thread tension": "tension",
    "time-lapse video": "video",
    "tool temperature": "temperature",
    "torsional stiffness": "stiffness",
    "total silence": "silence",
    "touring exhibition": "exhibition",
    "touring gallery": "gallery",
    "traffic congestion": "congestion",
    "training manual": "manual",
    "training module": "module",
    "tyre noise": "noise",
    "ultraviolet light": "light",
    "urban biodiversity": "biodiversity",
    "variable visibility": "visibility",
    "vibration sensors": "sensors",
    "visual aids": "aids",
    "visual evidence": "evidence",
    "waiting list": "list",
    "water features": "features",
    "water stress": "stress",
    "weekend workshop": "workshop",
    "weekly inspection": "inspection",
    "wind exposure": "exposure",
    "wind speed": "speed",
    "window thickness": "thickness",
    "wooden windbreaks": "windbreaks",
    "biodegradable leather": "leather",
    "data privacy": "privacy",
    "intensive farming": "farming",
    "popping sounds": "sounds",
}

# Explicitly excluded multi-word answers (conservative review).
EXCLUDED = {
    "3D photogrammetry": "3D specifies the technique; 'photogrammetry' alone is too broad.",
    "3D-printed prosthetics": "The printing method is the key information.",
    "air conditioning": "'conditioning' alone does not complete the sentence meaningfully.",
    "algae-filled panels": "'algae' is the essential distinguishing feature.",
    "augmented reality": "'reality' alone is too vague.",
    "bigger picture": "Idiomatic fixed expression; the full phrase is required.",
    "building ecosystems": "Coined project phrase, not a standard head-noun reduction.",
    "building trust": "Gerund phrase; 'trust' alone does not fit 'time spent (8)'.",
    "citrus notes": "'citrus' is the key distinguishing information.",
    "climate change": "Fixed expression; 'change' alone changes the meaning.",
    "electric vehicles": "'electric' is essential to the safety concern discussed.",
    "electric-bike sharing": "'electric-bike' identifies the specific sharing scheme.",
    "emotional storytelling": "'storytelling' alone is too general.",
    "empowering healers": "Metaphorical phrase; not reducible to a single head noun.",
    "family's restaurant": "Possessive phrase; neither word works alone in the gap.",
    "flavor detectives": "Coined team nickname.",
    "growing up": "Idiomatic expression used as a project slogan.",
    "hydroponic towers": "'hydroponic' identifies the specific technology.",
    "marine biology": "Academic field name; both words are needed.",
    "mental health": "'mental' is essential to the intended meaning.",
    "movie night": "'night' alone is too vague.",
    "polar bear": "'polar' distinguishes the animal in an Arctic context.",
    "polyethylene glycol": "Specific chemical compound; no safe single-word reduction.",
    "purple bark": "'purple' identifies the specific plant source.",
    "rainwater harvesting": "'harvesting' alone does not convey the technique.",
    "reef architects": "Coined professional label; 'architects' is too vague.",
    "rescuing history": "Mission slogan; not a standard noun phrase reduction.",
    "resurrection biology": "Specialist field name.",
    "scent masking": "'masking' alone is too vague outside the full compound.",
    "uncovering stories": "Mission phrase; not reducible conservatively.",
    "vertical gardens": "'vertical' is the key architectural feature (appears twice).",
}


def normalize_answer(value):
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [str(value).strip()] if str(value).strip() else []


def update_file(path):
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)

    changes = []
    for extract in data.get("extracts", []):
        for q in extract.get("questions", []):
            current = q.get("answer")
            if isinstance(current, list):
                primary = current[0] if current else ""
                existing_alts = current[1:]
            else:
                primary = str(current or "").strip()
                existing_alts = []

            if not primary:
                continue

            if primary in EXCLUDED:
                continue

            alt = ACCEPT_ALTS.get(primary)
            if not alt:
                continue

            new_answers = [primary]
            if alt not in new_answers:
                new_answers.append(alt)
            for existing in existing_alts:
                if existing not in new_answers:
                    new_answers.append(existing)

            if new_answers == normalize_answer(current):
                continue

            q["answer"] = new_answers
            changes.append({
                "test": os.path.basename(os.path.dirname(path)),
                "number": q.get("number"),
                "original": primary,
                "added": [a for a in new_answers[1:] if a not in existing_alts],
                "all": new_answers,
            })

    if changes:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
            fh.write("\n")

    return changes


def main():
    files = sorted(glob.glob("/workspace/Nivel/C1/Exams/Test*/listening2.json"))
    all_changes = []
    modified_files = []

    for path in files:
        changes = update_file(path)
        if changes:
            modified_files.append(path)
            all_changes.extend(changes)

    print(json.dumps({
        "modified_files": len(modified_files),
        "updated_gaps": len(all_changes),
        "excluded_count": len(EXCLUDED),
        "accepted_unique": len(ACCEPT_ALTS),
        "changes": all_changes,
        "excluded": EXCLUDED,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
