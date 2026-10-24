# Bastion development

- Read docs/ROADMAP.md and docs/ARCHITECTURE.md before implementing the next stage.
- Work only on the stage requested by the user. Keep unfinished features visibly identified.
- Preserve the board-first design, Russian interface, original raster pieces, and keyboard access.
- Keep chess rules and engine communication out of view components.
- Never represent scripted playback as a live engine or planned courses as published lessons.
- Run pnpm test and pnpm build for behavior changes. Check affected layouts in the browser.
- Commit coherent changes with descriptive messages. Do not manufacture empty commits or rewrite existing history.
- Never store credentials in tracked files. Remote repository is private unless the user changes that decision.
