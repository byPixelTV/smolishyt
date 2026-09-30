FROM oven/bun:alpine AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN bun run build

FROM oven/bun:alpine

RUN apk add --no-cache ffmpeg nodejs python3 py3-pip \
    && python3 -m venv /opt/yt-dlp \
    && /opt/yt-dlp/bin/pip install --no-cache-dir "yt-dlp[default]" \
    && ln -s /opt/yt-dlp/bin/yt-dlp /usr/local/bin/yt-dlp

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist

ENV BINARY_PATH=/usr/local/bin/yt-dlp \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    FFPROBE_PATH=/usr/bin/ffprobe \
    NODE_BINARY_PATH=/usr/bin/node

RUN mkdir -p /app/.smolishyt \
    && chown -R bun:bun /app

USER bun

CMD ["bun", "--env-file=.env", "./dist/channel.js"]
