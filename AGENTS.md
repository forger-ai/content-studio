# AGENTS

## Source of Truth

This file is the main functional and operational context source for Content
Studio.

If `manifest.json` exists, use it for installation, service, MCP, script,
agents, and catalog metadata. Do not use it as the complete list of
user-visible capabilities.

The agent must distinguish between:

- user-visible capabilities
- internal agent tools

Internal tools can execute tasks, but they must not be presented as the normal
interface or as steps the user must run manually.

## Product Identity

- id: `content-studio`
- visible name: `Content Studio`
- stack: `vite-fastapi-sqlite`
- status: beta local Forger app

## Functional Goal

Content Studio helps one person plan social and marketing content in a local
monthly calendar. It keeps posts, categories, captions, content structure, video
posted state, and attached media references inside the app workspace.

## Semantic Data Model

### Post

A post is the calendar item the user plans to publish or prepare. Its date
controls where it appears in the monthly calendar. Its name is the short title
shown in calendar labels. Its description is internal planning context. Its
medium is the target channel. Its caption is the publication text or post copy
ready to adapt for the selected medium. Captions can contain Markdown when it
helps structure drafts.

### PostCategory

A category is a user-defined grouping for posts, such as a campaign, pillar,
theme, or content series. Its color is visual metadata and paints the post label
in the calendar. Category names and colors are user-facing planning aids, not
publishing metadata.

### ImageContent

Image content describes the visual direction for an image or carousel post.
Visual guidance explains composition, style, scene, screenshot needs, or design
direction. Carousel guidance explains slide order, narrative structure, or
per-slide notes. Post media can hold attached local files, filenames, URLs, or
external reference text related to the image or carousel.

### VideoContent

Video content describes a planned video post. Hook is the opening idea or first
attention-grabbing line. Script is the textual script: the exact spoken,
narrated, or on-screen words for the video. Script can contain Markdown and is
rendered as formatted Markdown in post detail. Visual guidance describes how the
video should look. Shot list describes the sequence of shots or scenes.
Duration and aspect ratio are planning constraints. Posted records whether the
video has already been published.

### PostMedia

Post media stores one or more media items related to a post. A media item can be
an attached local file saved inside the app workspace or a reference such as a
URL, filename, screenshot note, brief, image, video, or external asset. Attached
files keep metadata such as original filename, MIME type, size, and a local app
URL for opening the file. Position controls ordering when multiple media items
are attached.

## User-Visible Capabilities

### Calendar Planning

The user can:

- view posts in a monthly calendar;
- move to the previous or next month;
- see the current day highlighted;
- create a post from the create button or from a calendar day;
- move a post to another day by dragging its calendar pill;
- open a post detail view from the calendar;
- go back from detail to the calendar.

### Post Management

The user can create, edit, view, and delete posts with:

- date;
- name;
- description;
- medium;
- caption;
- category;
- image or video content type;
- media references or locally attached files.

Supported media options are:

- `linkedin`
- `instagram`
- `tiktok`
- `x`
- `facebook`
- `youtube`
- `blog`
- `email`
- `other`

### Categories

The user can create custom categories with colors. The category color is used to
paint post labels in the calendar. If a category is deleted internally, posts
that used it remain present and become uncategorized.

### Image Content

Image posts include:

- visual guidance;
- carousel guidance;
- one or more media references or attached files through post media.

### Video Content

Video posts include:

- hook;
- script as the textual spoken, narrated, or on-screen guion for the video;
- visual guidance;
- shot list;
- duration in seconds;
- aspect ratio;
- posted state;
- media references or attached files.

### Content Strategist Agent

The Planificador view exposes a chat interface backed by Forger's app
conversation bridge. It uses the `content-strategist` Agent declared in
`manifest.json`.

The first message in that Agent thread includes the Agent initial prompt. Later
messages continue the same thread without re-sending the initial prompt.

The user can ask the Agent to:

- plan posts for a week;
- create posts from a topic, tone, mediums, and count;
- rewrite a post caption toward a different tone;
- review the current month;
- adjust post structure or media notes.

## Capabilities You Must Not Assume

Do not claim the app supports these functions unless they are explicitly added:

- publishing to social networks;
- cloud sync;
- multi-user collaboration;
- analytics;
- approvals;
- reminders or notifications;
- recurring posts;
- external calendar integration.

The app stores attached files only when the user selects them through the app UI.
It does not scan external folders or read arbitrary files outside the app
workspace.

## Internal Agent Tools

These tools are for internal operation:

- `list_posts`
- `get_post`
- `create_post`
- `update_post`
- `delete_post`
- `list_categories`
- `create_category`
- `update_category`
- `plan_week_content`
- `rewrite_post_tone`

The agent should translate tool results into functional impact for the user:

- what posts were created or changed;
- which dates and channels were affected;
- what remains missing;
- whether a proposed rewrite was applied or only drafted.

## Stack Contract

The app uses the shared `vite-fastapi-sqlite` commons submodule. Docker Compose
mounts shared helpers over local fallbacks:

- `backend/src/app/database.py`
- `backend/src/app/health.py`
- `backend/src/app/cors.py`
- `frontend/src/api/client.ts`

App-specific models and initialization live in local backend modules. Database
initialization must call `app.database_ext.init_app_db()`.

## Verification

Internal checks:

```bash
cd backend && uv run pytest
cd ../frontend && npm run verify
```

These commands are internal agent tools. Do not present them as normal user
steps unless the user explicitly asks for technical details.
