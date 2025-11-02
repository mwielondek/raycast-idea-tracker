# Idea Tracker

Capture project ideas, append feature bullets in seconds, and export the latest thinking as Markdown without leaving Raycast.

## Features
- Two-pane list with live detail preview and Markdown rendering.
- Filter projects by tags using the search bar dropdown.
- Add projects with context, comma-separated tags, and starter feature bullets.
- Append feature bullets with the default Enter shortcut or open a full detail view.
- Export the selected project or all projects as Markdown; data stays local in Raycast storage.

## Commands
- **List Projects** – Main view to browse, filter, and append features quickly.
- **Add Project** – Capture a new project with tags and initial feature notes.
- **Append Feature** – Pick a project and append a feature bullet from anywhere in Raycast.

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
