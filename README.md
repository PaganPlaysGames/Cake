# CakeScape (RuneScape-inspired MMO foundation)

This repository now contains a **playable 3D vertical slice** of an MMORPG-style game loop inspired by classic RuneScape systems:

- 3D WebGL world rendering with Three.js
- Stylized 3D mesh models for humanoids, trees, rocks, and fish nodes
- Tile-based overworld movement
- Gathering resources with dedicated functions (chop trees, mine rocks, fish at pond)
- Inventory + stackable items
- Skills with XP + level progression (Woodcutting, Mining, Fishing)
- A simple NPC quest flow with requirements and rewards
- RuneScape-style HUD with minimap, orbs, tabbed side panel, and action bar
- Character and world animations (walk cycles, gather/talk actions, ambient node motion)

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Scope and roadmap

Building a full RuneScape-scale game requires multiple dedicated services and years of content creation. This project starts with a realistic foundation and can be expanded in phases:

1. **Core client loop** (done): movement, resource interaction, inventory, skills, quest
2. **Combat & entities**: enemy AI, hit splats, equipment stats, death/respawn rules
3. **Server-authoritative multiplayer**: websocket world state, login/session, anti-cheat boundaries
4. **Persistence**: accounts, inventory bank, quest logs, skill progress
5. **Content pipeline**: map editor, quest DSL, item/NPC data packs
6. **Economy systems**: shops, player trading, GE-style market
7. **Social systems**: chat, friends, clans, grouping

## Next expansion ideas

- Add a second zone with level-gated nodes and enemy patrols
- Add smelting/crafting loops to create equipment from gathered resources
- Add combat skills and equipment bonuses
- Move game state to a backend service with periodic snapshots
