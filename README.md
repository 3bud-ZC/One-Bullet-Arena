# One Bullet Arena — حلبة الطلقة الواحدة

A fast Arabic 2D browser action game built around one rule: **you have one bullet, and every shot must be recovered before you can fire again.**

## Current build — v0.3.0

- Full Arabic RTL interface using Changa for Arabic display text and Inter for stable game statistics.
- Compact redesigned combat HUD with wave, score, health, bullet, dash, ricochet, combo, and boss states.
- Direction indicator when the recoverable bullet is far from the player.
- Anime-inspired wave banners, boss intro, speed lines, screen transitions, hit-stop, and slow motion.
- Redesigned victory and defeat screens with six stat cards and S/A/B/C performance ranking.
- Redesigned upgrade cards with icons, categories, current/next levels, and measurable effect summaries.
- Fullscreen focus mode with responsive 16:9 scaling and the `F` keyboard shortcut.
- Presentation and accessibility preferences for screen shake, reduced motion, damage numbers, numeral style, and high contrast.
- Five escalating waves across five distinct arena layouts.
- Solid and breakable obstacles, damage hazards, and explosive arena nodes.
- Eight stackable between-wave upgrades without breaking the one-bullet rule.
- Five core enemy archetypes plus mini and elite variants.
- Three-phase **Core Warden** boss encounter.
- Procedural music and sound effects with persistent music, SFX, and mute settings.
- Desktop controls that work across Arabic and English keyboard layouts.
- Mobile landscape touch movement, firing, and dash controls.
- Local high-score, best-wave, audio-setting, and presentation-setting persistence.
- Automated JavaScript syntax checks and thirteen deterministic tests.

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Move | `WASD` or arrow keys | Drag the left virtual stick |
| Aim | Mouse | Tap the target position |
| Fire | Left click | Tap on the right side |
| Dash | `Space` or `Shift` | Tap the dash circle |
| Magnetic recall | `Q` after unlocking it | Dedicated mobile control pending |
| Pause | `P` or `Escape` | Browser back is not intercepted |
| Select an upgrade | Click or `1`, `2`, `3` | Tap an upgrade card |
| Mute | `M` or Settings | Settings |
| Fullscreen | `F` or the presentation toolbar | Presentation toolbar |

## Boss rule

The Core Warden's first shield phase only takes bullet damage **after the bullet has ricocheted at least once**. Later phases introduce radial attacks, charge attacks, and faster projectile patterns.

## Run locally

The game has no runtime dependencies and can be served by any static HTTP server.

```bash
npx serve .
```

Run the full verification suite:

```bash
npm run verify
```

## Project status

[`STATUS.md`](./STATUS.md) is the single source of truth for completion, verification, known limitations, and the next milestone.
