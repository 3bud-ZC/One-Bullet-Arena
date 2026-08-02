# One Bullet Arena — حلبة الطلقة الواحدة

A fast Arabic 2D browser action game built around one rule: **you have one bullet, and every shot must be recovered before you can fire again.**

## Current build — v0.2.0

- Full Arabic RTL interface using the Changa display font.
- Five escalating waves across five distinct arena layouts.
- Solid and breakable obstacles, damage hazards, and explosive arena nodes.
- Eight stackable between-wave upgrades without breaking the one-bullet rule.
- Five core enemy archetypes plus mini and elite variants.
- Three-phase **Core Warden** boss encounter.
- Procedural music and sound effects with persistent music, SFX, and mute settings.
- Hit-stop, slow motion, telegraphs, knockback, floating combat text, particles, and screen shake.
- Desktop controls and mobile landscape touch controls.
- Local high-score, best-wave, and audio-setting persistence.
- Automated syntax checks and eight deterministic tests.

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Move | `WASD` or arrow keys | Drag the left virtual stick |
| Aim | Mouse | Tap the target position |
| Fire | Left click | Tap on the right side |
| Dash | `Space` or `Shift` | Tap the dash circle |
| Magnetic recall | `Q` after unlocking it | Use desktop keyboard for this build |
| Pause | `P` or `Escape` | Browser back is not intercepted |
| Select an upgrade | Click or `1`, `2`, `3` | Tap an upgrade card |
| Mute | `M` or Settings | Settings |

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
