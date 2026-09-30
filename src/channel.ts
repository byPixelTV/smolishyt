import { getProcessedVideos, getYoutubeVideoKey, setProcessedVideos } from "./utils/data/db.js";
import { SmolishRateLimitError, uploadToSmolish } from "./utils/smolish/upload.js";
import { downloadVideo } from "./utils/youtube/download_video.js";
import { getChannelVideos } from "./utils/youtube/get_channel_videos.js";
import { setTimeout as sleep } from "node:timers/promises";

const uploadOnce = process.argv.includes("--once");
const pollIntervalMs = Number(process.env.CHANNEL_POLL_INTERVAL_MS || 300_000);
const maxRateLimitRetries = 3;
const shutdownController = new AbortController();
let shuttingDown = false;

if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs <= 0) {
	throw new Error("CHANNEL_POLL_INTERVAL_MS must be a positive integer");
}

function requestShutdown(signal: NodeJS.Signals) {
	if (shuttingDown) {
		return;
	}
	shuttingDown = true;
	console.log(`log: received ${signal}; finishing the current operation before stopping`);
	shutdownController.abort();
}

process.once("SIGINT", () => requestShutdown("SIGINT"));
process.once("SIGTERM", () => requestShutdown("SIGTERM"));

async function processChannel(): Promise<boolean> {
	const allVideos = await getChannelVideos();

	const processedVideos = await getProcessedVideos();
	let uploaded = false;

	for (const video of allVideos) {
		if (shuttingDown) {
			break;
		}
		if (processedVideos.includes(getYoutubeVideoKey(video.url))) {
			console.log(`log: already processed video '${video.title}'`);
			continue;
		}

		console.log(`log: processing next video '${video.title}'`);
		const downloaded = await downloadVideo(video);
		if (!downloaded) {
			console.warn(`warn: could not download video '${video.title}'`);
			console.log(`log: continuing to next video after download failure`);
			continue;
		}

		try {
			let rateLimitRetries = 0;
			while (true) {
				try {
					await uploadToSmolish(downloaded, video, false);
					break;
				} catch (error) {
					if (!(error instanceof SmolishRateLimitError) || rateLimitRetries >= maxRateLimitRetries || shuttingDown) {
						throw error;
					}
					rateLimitRetries += 1;
					console.warn(`warn: rate limited; retrying '${video.title}' in ${error.retryAfterSeconds}s (attempt ${rateLimitRetries}/${maxRateLimitRetries})`);
					await sleep(error.retryAfterSeconds * 1000, undefined, { signal: shutdownController.signal });
				}
			}
			console.info(`info: successfully published video '${video.title}'`);
			processedVideos.push(getYoutubeVideoKey(video.url));
			await setProcessedVideos(processedVideos);
			uploaded = true;
			if (uploadOnce) {
				break;
			}
		} catch (error) {
			console.warn(`warn: failed to publish video '${video.title}': ${(error as Error).message}`);
			console.log(`log: continuing to next video after upload failure`);
		}
	}

	return uploaded;
}

async function main() {
	while (!shuttingDown) {
		let uploaded = false;
		try {
			uploaded = await processChannel();
		} catch (error: unknown) {
			console.error(`error: channel scan failed: ${(error as Error).message}`);
		}
		if (uploadOnce || shuttingDown) {
			return;
		}
		console.log(`log: channel scan complete (${uploaded ? "uploaded new video" : "no new videos"}); checking again in ${pollIntervalMs}ms`);
		try {
			await sleep(pollIntervalMs, undefined, { signal: shutdownController.signal });
		} catch (error) {
			if (!shuttingDown) {
				throw error;
			}
		}
	}
	console.log("log: channel uploader stopped");
}

main().catch((error: unknown) => {
	console.error(`error: ${(error as Error).message}`);
	process.exitCode = 1;
});