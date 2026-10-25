# Bastion development

- Read docs/ROADMAP.md and docs/ARCHITECTURE.md before implementing the next stage.
- Work only on the stage requested by the user. Keep unfinished features visibly identified.
- Preserve the board-first design, Russian interface, the unmodified classic Lichess Cburnett 2D pieces, and keyboard access.
- Do not introduce 3D pieces, homemade replacement artwork, decorative board textures, or screenshot galleries.
- Keep chess rules and engine communication out of view components.
- Never represent scripted playback as a live engine or planned courses as published lessons.
- Run pnpm test and pnpm build for behavior changes. Check affected layouts in the browser.
- Commit coherent changes with descriptive messages. Do not manufacture empty commits or rewrite existing history.
- Never store credentials in tracked files. Remote repository is private unless the user changes that decision.

- Product targets are the web and mobile. Keep core chess/match/engine modules reusable; do not add a desktop-only dependency without a reason.
- The live game is implemented. Preserve numeric native Elo / Skill controls and clearly label the uncalibrated training scale.
- Keep coordinates outside the squares. Preserve pointer, touch, keyboard and reduced-motion behavior.
- Do not put file import/export controls back on the main game screen unless the owner asks.
- Read docs/SECURITY.md before adding accounts, a database, remote APIs or user content. Never claim frontend validation protects a future server.

- Lesson content lives in src/learning/lessons.json. Run pnpm lessons:validate after edits; bump a lesson revision for changes that invalidate saved solutions.
- Keep StepSession and learning progress independent from React. Never identify a scripted teaching reply as a live engine decision.
- Distinguish completed with assistance from independently solved. Preserve the repeat queue, resume cursor, notes and accessibility when changing lesson UI.
