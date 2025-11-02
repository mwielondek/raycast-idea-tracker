# Idea Tracker

Capture project ideas, append feature bullets in seconds, and export the latest thinking as Markdown without leaving Raycast.

## Features
- Fast list of all ideas sorted by last update.
- Add ideas with optional context and seed feature bullets (one per line).
- Append new feature bullets via a single-field form (`⌘⇧F`).
- View the complete idea rendered as Markdown and copy the current idea or all ideas at once.
- Data persists locally using Raycast's encrypted storage.

## Requirements
- Raycast 1.81 or newer with Developer Tools.
- Node.js 18+ and npm (or yarn/pnpm).

## Setup
```bash
git clone https://github.com/mwielondek/raycast-idea-tracker.git
cd raycast-idea-tracker/idea-tracker
npm install
```

## Local Development
- Run the command in Raycast: `npm run dev` (uses `ray develop`).
- Build for distribution: `npm run build`.
- Type-check: `npm run typecheck`.
- Tests: `npm test` (Vitest).

## Import into Raycast
1. Open Raycast → run `Extensions`.
2. Choose `Import Extension`.
3. Select the `idea-tracker` folder from this repository.
4. Launch **Open Idea Tracker** from Raycast and start capturing ideas.

Changes in the source refresh automatically when you rerun the command in development mode.

## Data Storage
Ideas are stored locally using Raycast's encrypted `LocalStorage`. Removing the extension removes its stored data.*** End Patch
