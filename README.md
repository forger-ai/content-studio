# Content Studio

Content Studio is a local Forger app for planning posts by date, channel,
category, caption, and content format.

It uses the `vite-fastapi-sqlite` stack:

- FastAPI backend
- SQLite local database
- Vite + React frontend
- MUI visual system
- MCP tools for Forger agents

## Functional Scope

- Monthly calendar view with previous and next month controls.
- Local post creation, editing, detail viewing, deletion, and drag-and-drop date
  changes.
- Custom categories with colors used in the calendar.
- Image content with visual and carousel guidance.
- Video content with script, hook, shot list, visual guidance, duration, aspect
  ratio, and posted state.
- Media references attached to posts.
- Content Strategist agent for content planning from inside the app.

## Development

The app follows the shared stack contract through `commons/`.

```bash
docker compose up --build
```

Services:

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5182`
- Health: `GET http://localhost:8000/api/health`

Local checks:

```bash
cd backend && uv run pytest
cd ../frontend && npm run verify
```
