import { getProcessedVideos, setProcessedVideos } from "./utils/data/db.js";
import { uploadToSmolish } from "./utils/smolish/upload.js";
import { downloadVideo } from "./utils/youtube/download_video.js";
import { getChannelVideos } from "./utils/youtube/get_channel_videos.js";
import { setTimeout as sleep } from "node:timers/promises";

const uploadOnce = process.argv.includes("--once");
const pollIntervalMs = Number(process.env.CHANNEL_POLL_INTERVAL_MS || 300_000);

if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs <= 0) {
	throw new Error("CHANNEL_POLL_INTERVAL_MS must be a positive integer");
}

async function processChannel(): Promise<boolean> {
	const allVideos = await getChannelVideos();

	const processedVideos = await getProcessedVideos();
	let uploaded = false;

	for (const video of allVideos) {
		if (processedVideos.includes(video.url)) {
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
			await uploadToSmolish(downloaded, video, false);
			console.info(`info: successfully published video '${video.title}'`);
			processedVideos.push(video.url);
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
	do {
		let uploaded = false;
		try {
			uploaded = await processChannel();
		} catch (error: unknown) {
			console.error(`error: channel scan failed: ${(error as Error).message}`);
		}
		if (uploadOnce) {
			return;
		}
		console.log(`log: channel scan complete (${uploaded ? "uploaded new video" : "no new videos"}); checking again in ${pollIntervalMs}ms`);
		await sleep(pollIntervalMs);
	} while (true);
}

main().catch((error: unknown) => {
	console.error(`error: ${(error as Error).message}`);
	process.exitCode = 1;
});