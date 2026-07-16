# Veresta Render Worker

On-demand Remotion renderer for the private Veresta Command Center. It claims the next queued render, downloads prepared assets, renders a 1080x1920 MP4, uploads the preview, and returns the job to the human approval queue.

## Operating model

- Runs only when manually dispatched in GitHub Actions.
- Uses the prepared script, voice, images, subtitles, and manifest from Command Center.
- Makes no paid AI calls during rendering.
- Does not approve or publish videos automatically.
- Does not store secrets, downloaded media, or rendered videos in Git.

## Required GitHub Actions secrets

Configure these under **Settings → Secrets and variables → Actions**:

- `VERESTA_BASE_URL` — the private Command Center base URL.
- `VERESTA_SITES_TOKEN` — the private token accepted by the Command Center API.

Never place either value in source code, workflow inputs, logs, issues, or documentation.

## Run the worker

Open **Actions → Veresta Render Worker → Run workflow**. The default `render` mode processes one queued render. `dry-run` renders a short local preview in the runner without changing queue state or uploading it.

The workflow uses GitHub concurrency controls so only one worker can claim the render queue at a time. Render output and temporary assets are deleted with the disposable runner.

## Local development

```bash
npm ci
npm run typecheck
VERESTA_BASE_URL="..." VERESTA_SITES_TOKEN="..." npm run worker:dry
```

Before commercial rollout, confirm the Remotion license that applies to Veresta's team and rendering setup.
