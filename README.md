# One Bullet Arena

A fast 2D top-down browser action game built around a single rule: **you only have one bullet, and every shot must be recovered before you can fire again.**

## Current playable build

The first vertical slice includes:

- Keyboard movement and mouse aiming.
- One recoverable ricochet bullet.
- Dash movement with invulnerability frames.
- Three enemy archetypes: Scout, Brute, and Sniper.
- Five escalating waves.
- Health, score, combo, pause, victory, and game-over states.
- Local high-score and best-wave persistence.
- Responsive browser presentation.
- Automated verification and GitHub Pages deployment workflows.

## Controls

| Action | Input |
| --- | --- |
| Move | `WASD` or arrow keys |
| Aim | Mouse |
| Fire | Left click |
| Dash | `Space` or `Shift` |
| Pause | `P` |
| Restart | `R`, `Enter`, or click |

## Run locally

The game has no runtime dependencies and can be served by any static HTTP server.

```bash
npx serve .
```

Verification uses Node's built-in syntax checker and test runner:

```bash
npm run verify
```

## Project status

See [`STATUS.md`](./STATUS.md) for the single source of truth on implementation progress and next work.
