# Pokémon: Wildbound

A playable browser RPG set in Aurelian, an original region of nine connected landscapes. Walk, explore, catch Pokémon, build a team, and uncover why the eight beacons have gone quiet.

## Play locally

1. Install the latest **Node.js 24 LTS** from [nodejs.org](https://nodejs.org/), then reopen your terminal. npm is included.
2. Download and **extract** the repository ZIP, or clone the repository.
3. Open a terminal in the game folder (the folder containing `package.json`). On Windows, you can open that folder in File Explorer, type `cmd` in the address bar, and press Enter.
4. Run:

```sh
npm ci
npm start
```

The game opens in your browser at http://localhost:5173. If the browser does not open automatically, visit that address yourself. Keep the terminal open while playing; press Ctrl+C there to stop the game. On later launches, run `npm start` in the same folder; you only need `npm ci` again after downloading an updated version.

**Do not double-click `index.html`** (including the one in `dist`). The game needs its local server to load TypeScript and game assets. No backend account or API key is needed.

Click the current objective at the bottom of the screen to walk to Professor Fern and choose your starter. Eevee is already traveling with you. Press **Esc** or tap **Menu / Start** to open the in-game menu; Pokémon, Pokédex, bag, map, journal, saving, options, and controls are all inside it.

### Startup troubleshooting

| What you see                                 | What to do                                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `node` or `npm` is not recognized            | Install Node.js 24 LTS and reopen the terminal. Check `node --version` and `npm --version`.                             |
| PowerShell says `npm.ps1` cannot be loaded   | Use Command Prompt (`cmd`) as described above, or run `npm.cmd ci` and `npm.cmd start` in PowerShell.                   |
| `ENOENT` / cannot find `package.json`        | Open the terminal in the extracted game folder containing `package.json`.                                               |
| Missing script: `start`                      | Update your copy of the game, or use `npm run dev -- --port 5173` with an older copy.                                   |
| `vite` is not recognized / missing a package | Run `npm ci` in the game folder. Install dependencies on your own PC; do not copy `node_modules` from another computer. |
| Unsupported engine / `crypto.hash` error     | Check `node --version` and install the latest Node.js 24 LTS.                                                           |
| Port 5173 is already in use                  | If the game is already running, open http://localhost:5173. Otherwise stop the application using that port and retry.   |
| Blank page after opening an HTML file        | Run `npm start` and open http://localhost:5173 instead.                                                                 |

Use the same browser and address each time: saves belong to that browser and origin (including its port). Export your save from the in-game Options menu before changing either. If startup still fails, include your operating system, Node version, command, and complete terminal error when reporting it.

## The adventure

- Nine freely connected regions: Verdant Hollow, Whispering Woods, Amber Coast, Sunstone Mesa, Emberfall, Moonveil Marsh, Frostpeak, Stormhaven, and Aurelian Summit.
- An original eight-chapter story about the beacons, a missing scientist, and a director trying to protect the world by stopping it from changing.
- 87 obtainable Pokémon, with local encounter tables, rare shinies, automatic level-based evolution, shared team experience, and up to four moves per companion.
- Turn-based battles with type strengths, resistances, immunities, speed, PP, poison, sleep, healing, Protect, switching, catching, and defeat recovery.
- Eight beacon keepers, your rival Ivy with a team that grows with the story, 36 trail wardens with repeatable rematches, 36 hidden supply chests, and eight research projects.
- A six-Pokémon team, storage, searchable Pokédex, regional travel, shops, free rest houses, and a journal that records your discoveries and story revelations.
- Local autosaving, JSON backup export/import, touch controls, reduced motion, optional synthesized music, and an advancing field clock.
- Continued exploration, collecting, and rematches after the story ends.

For each story chapter: read its briefing in the journal, catch a Pokémon in that region, beat two different local wardens, then visit the beacon northeast of town. Regions are open from the start, but their levels rise from 3 to 46. Your entire healthy party shares battle experience. A defeat returns you to a rest house with your team restored.

### Controls

| Input               | Action                                       |
| ------------------- | -------------------------------------------- |
| WASD / Arrow keys   | Move                                         |
| Shift               | Run                                          |
| E / Space           | Interact                                     |
| Click the map scene | Walk to a tile or interactable               |
| M                   | World map                                    |
| P                   | Team and storage                             |
| B                   | Bag                                          |
| J                   | Story, research, and memories                |
| H                   | Help                                         |
| Escape / Enter      | Open game menu; Escape returns from submenus |

Mobile has a directional pad and an interaction button. Fast travel works only after discovering a region on foot. Red roofs are rest houses; blue roofs are shops.

## Saves

Progress is stored under `wildbound-save-v1` in browser local storage. The game saves periodically and after important milestones. Battle turns are not persisted until the encounter ends; refreshing during a battle returns to the previous save. Export backups in Settings before switching browsers or clearing browser data. Imports are validated before replacing the active save and require a confirmation click. If an existing save cannot be read, its original content is retained as `wildbound-save-recovery` when storage permits.

## Development

```sh
npm test          # Engine, progression, content and world-connectivity tests
npm run build     # TypeScript check and production bundle
npm run preview   # Serve the built production bundle
```

- `src/data.ts`: Pokémon, moves, type matchups, items, regions, story and research content.
- `src/world.ts`: Deterministic terrain, world entities, collision, and pathfinding.
- `src/engine.ts`: Serializable game state and battle/progression rules, independent of the UI.
- `src/renderer.ts`: Pixel-art scenery, animation, camera, characters, and regional landscape artwork.
- `src/main.ts`: Controls, interface, dialogs, music, and save management.
- `tests/game.test.ts`: Deterministic tests covering combat, all eight chapters, all 87 obtainable species, save validation, rewards and reachability of every interaction.

Vite serves a client-only TypeScript application. No backend, API key, account, or external game service is required. Pokémon sprites are bundled locally; Pixel fonts and UI sprites are also bundled locally. Pokémon mechanics are adapted for this standalone adventure: evolutions are level-based, moves unlock automatically, and each species uses one battle type.

## Art and attribution

The pixel world, interface, landscape illustrations, characters, story, and ambient music are created for this project. Pokémon front/back sprites and inventory item sprites are sourced from [PokeAPI/sprites](https://github.com/PokeAPI/sprites). Pokémon names and character designs belong to their respective owners, including Nintendo, Game Freak, and Creatures. This is an unofficial fan project.

## Verification scope

Automated tests check the complete story state machine and data integrity. Browser checks cover the opening quest, starter choice, travel, menus, wild combat and catching, healing, save reload/import, and desktop/mobile presentation. A complete human playthrough and real-world completion-time measurement remain future balancing work.

### Game interface

The overworld fills the viewport with a compact location/party/objective HUD. The Start menu supports Up/Down and Enter navigation. Party management uses six slots and a selected Pokémon summary; trainers speak through pixel-framed dialogue boxes, and encounters use a full-screen battle view. Menus pause player movement and keep keyboard focus within the active screen. Touch players have a directional pad, A interaction button, and Start menu button. Pixelify Sans and Press Start 2P are bundled under their SIL Open Font License; see `public/fonts/`.
