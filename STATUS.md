# One Bullet Arena — Status

Last updated: 2026-08-02

## Completion

- Overall project completion: **38%**
- Completed milestone: **Milestone 01 — First Playable Vertical Slice**
- Current milestone: **Milestone 02 — Combat Feel and Arena Progression**
- Milestone 02 implementation: **100%**
- State: **Arabic Milestone 02 build is deployed; desktop keyboard hotfix merged and deployment triggered; owner gameplay acceptance is still required before closing the milestone**

## Milestone 02 implemented

- Full Arabic RTL game interface.
- Arabic Changa display font with system-font fallback.
- Arabic main menu, tutorial, pause, settings, upgrade, boss-intro, defeat, and victory screens.
- Five escalating waves and five distinct arena layouts.
- Solid obstacles, destructible obstacles, damage hazards, and explosive nodes.
- Eight stackable bullet upgrades.
- Core Warden boss with three phases.
- Boss first-phase shield requires a ricocheted shot.
- Scout, Brute, Sniper, Charger, and Splitter enemy archetypes.
- Mini enemies and elite enemy variants.
- Procedural Web Audio music and sound effects.
- Persistent music volume, SFX volume, and mute settings.
- Hit-stop, slow motion, knockback, attack telegraphs, floating combat text, boss health bar, particles, and enhanced screen shake.
- Desktop keyboard/mouse controls.
- Mobile landscape touch movement, firing, and dash controls.
- Run statistics for score, time, shots, hits, ricochets, and kills.
- Updated Arabic public page shell and responsive presentation.

## Desktop keyboard hotfix

- Root cause: the game used `KeyboardEvent.key`, so physical WASD keys reported Arabic characters while the Arabic keyboard layout was active.
- Fix: controls now normalize physical key positions through `KeyboardEvent.code`.
- WASD now works with Arabic, English, and other active keyboard layouts.
- Arrow keys, Space, Shift, Q, P, M, R, Enter, Escape, and upgrade number keys are normalized as well.
- The canvas now receives focus after pointer interaction.
- Pull Request #3 was squash-merged to `main`.
- Hotfix merge commit: `649eaa2224c4dfb7d75a5a89a5a337bdaa59dc86`.

## Verification

- JavaScript syntax checks: **passed** for all runtime modules including the new input module.
- Automated tests: **10/10 passed**.
- GitHub Actions Verify: **passed** for Pull Request #3.
- GitHub Pages deployment: **triggered after the hotfix merge and this status update**.
- Live desktop retest: pending owner confirmation.
- Live full-run gameplay review: pending.

## Acceptance gate

Do not close Milestone 02 until:

1. Desktop movement works using WASD with both Arabic and English keyboard layouts.
2. Arrow-key movement, dash, pause, recall, restart, mute, and upgrade shortcuts work correctly.
3. The Arabic menu, tutorial, settings, and upgrade screens render correctly on GitHub Pages.
4. A full five-wave run reaches and defeats the Core Warden through all three phases.
5. Each upgrade has a visible and measurable gameplay effect.
6. Music, SFX, mute, and saved settings work after a page reload.
7. Mobile landscape controls receive at least one manual device test.
8. The project owner approves combat feel, progression, Arabic presentation, and boss balance.

## Known limitations

- The Changa font is loaded from Google Fonts; system Arabic fonts are used if the network request fails.
- Magnetic Recall currently uses the keyboard `Q` shortcut and does not yet have a dedicated mobile button.
- A real-browser automated gameplay smoke test is still pending.
- Procedural vector visuals are intentional for this phase; production illustration and character art are not integrated.
- Combat and boss values are first-pass balance values and require live playtesting.

## Next milestone after acceptance

**Milestone 03 — Content Expansion and Replayability**

Candidate scope:

- Dedicated mobile Magnetic Recall button.
- Automated browser smoke testing.
- Additional enemies, bosses, arena themes, and elite modifiers.
- Persistent unlocks, challenges, achievements, and run history.
- Gamepad support and control remapping.
- PWA installation and offline caching.
- Final art, release presentation, and balancing passes.
