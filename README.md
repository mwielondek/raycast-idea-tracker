# Raycast Idea Tracker

Capture project ideas, append feature bullets in seconds, and export the latest thinking as Markdown without leaving Raycast.

## Features
- Browse all ideas in a fast list, automatically sorted by most recently updated.
- Add new ideas with optional context and seed feature bullets (each line becomes a feature).
- Append feature bullets to the selected idea via a single-field form (`⌘⇧F`).
- View the complete idea rendered as Markdown and copy either one idea or the full backlog to the clipboard.
- Data persists locally using Raycast's encrypted `LocalStorage`.

## Requirements
- Raycast 1.81 or newer with the Developer Tools enabled.
- Node.js 18+ and npm/yarn/pnpm (examples below use npm).

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/mwielondek/raycast-idea-tracker.git
   cd raycast-idea-tracker
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Load the Extension into Raycast
1. Open Raycast and run `Extensions` → `Import Extension`.
2. Choose the `raycast-idea-tracker` folder you cloned.
3. Raycast will add the extension. Launch it via `Idea Tracker` or the command palette entry **Open Idea Tracker**.

Changes you make to the source files are reflected immediately when you re-run the command.

## Development Scripts
- Type check: `npm run typecheck`
- Run tests: `npm test`

Tests cover the Markdown export helpers and feature parsing to ensure consistent output across updates.

## Data Storage
All ideas are stored locally inside Raycast’s encrypted storage. Removing the command via Raycast will also remove the stored data.
