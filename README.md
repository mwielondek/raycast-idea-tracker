# Raycast Idea Tracker

Capture project ideas, append feature bullets in seconds, and export the latest thinking as Markdown without leaving Raycast.

## Features
- Browse all projects in a two-pane list with live detail preview, sorted by last update.
- Pin high-priority projects to the top and archive completed ones without losing history.
- Filter projects by tags directly from the search bar dropdown.
- Add projects with context, comma-separated tags, and optional seed features.
- Append new feature bullets with an Enter-first shortcut, or expand to a full detail view.
- Copy a single project or your entire backlog as Markdown for sharing.
- Data persists locally using Raycast's encrypted `LocalStorage`.

## Commands
- `List Projects`: main command with list/detail layout, tag filtering, pin/archive controls, quick append, and exports.
- `Add Project`: dedicated form for capturing a new project with tags and starter features.
- `Append Feature`: select a project and append a feature bullet from anywhere.

## Requirements
- Raycast 1.81 or newer with the Developer Tools enabled.
- Node.js 18+ and npm/yarn/pnpm (examples below use npm).

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/mwielondek/raycast-idea-tracker.git
   cd raycast-idea-tracker/idea-tracker
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Load the Extension into Raycast
1. Open Raycast and run `Extensions` → `Import Extension`.
2. Choose the `idea-tracker` folder inside the cloned repository.
3. Raycast will add the extension. Launch **List Projects** to review projects, or use **Add Project** / **Append Feature** as needed.

Changes you make to the source files are reflected immediately when you re-run the command.

## Development Scripts
- Type check: `npm run typecheck`
- Run tests: `npm test`

Tests cover the Markdown export helpers and feature parsing to ensure consistent output across updates.

## Data Storage
All ideas are stored locally inside Raycast’s encrypted storage. Removing the command via Raycast will also remove the stored data.
