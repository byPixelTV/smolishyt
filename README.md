# smolishyt

smolishyt is an automated uploader that takes YouTube videos and uploads them to smolish.com.

## Install with Bun

Install [Bun](https://bun.sh/), then install the dependencies:

```bash
bun install
```

## Configure your .env file

Use this template to configure your environmental variables:

```bash
# Extract your Smolish cookie from network requests for authentication
COOKIE=
# Include a channel ID if you want to upload videos from a specific YouTube channel
CHANNEL_ID=
# Optional: paths to the yt-dlp and ffmpeg executables if they are not on PATH
BINARY_PATH=
FFMPEG_PATH=
# Optional compression controls (higher VIDEO_CRF means smaller/lower quality)
VIDEO_CRF=28
VIDEO_AUDIO_BITRATE=64k
# Caps video bitrate to keep account storage predictable
VIDEO_MAX_VIDEO_BITRATE=900k
# Source download quality (480p keeps uploads smaller while remaining watchable)
VIDEO_QUALITY=480p
# Videos longer than this are skipped before upload
VIDEO_MAX_DURATION_SECONDS=60
# Optional: path to Node.js used for the Cloudflare-compatible Smolish transport
NODE_BINARY_PATH=
# Optional: set this to the user-agent of the browser session used to copy COOKIE
BROWSER_USER_AGENT=
```

## Upload Shorts from YouTube

1. Make sure you have your ```COOKIE``` configured
2. Run ```bun run upload```

## Upload Shorts from a specific YouTube channel

1. Make sure you have your ```COOKIE``` and target ```CHANNEL_ID``` configured
2. Run ```bun run channel:upload```

`channel:upload` uploads one available unprocessed video and exits. Use `bun run channel:dev` to process multiple videos.

The automatic channel runner checks for new videos every five minutes by default and logs when it is waiting for the next scan. Each scan starts with the newest two pages, then expands the scan by two older pages on every subsequent run. Newer pages are always processed first, while processed video URLs remain stored in `.smolishyt/processed.json` so rescanning history does not upload duplicates. Pagination progress is stored in `.smolishyt/channel-state.json`.

## Run with Docker

Build the image and run the automatic channel uploader:

```bash
docker compose up --build
```

The image includes Bun, Node.js, FFmpeg, FFprobe, and yt-dlp. It processes all available unprocessed channel videos and persists state in the local `.smolishyt` directory. Compose runs the container with the permissions needed for the bind-mounted state directory on Docker Desktop and gives it 30 seconds to finish the current operation during shutdown. To run only one channel upload instead:

```bash
docker compose run --rm smolishyt bun --env-file=.env ./dist/channel.js --once
```

To run the random YouTube uploader instead, override the command:

```bash
docker compose run --rm smolishyt bun --env-file=.env ./dist/index.js
```

## Disclaimer

This script is for educational purposes. Do not attempt to bypass Smolish's rate limits with this.

## License

smolishyt is licensed under Apache 2.0. Check [LICENSE](./LICENSE) for more details.

© 2026 Ethan Lee, byPixelTV