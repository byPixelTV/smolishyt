import { getProcessedVideos, setProcessedVideos } from "./utils/data/db.js";
import { uploadToSmolish } from "./utils/smolish/upload.js";
import { downloadVideo } from "./utils/youtube/download_video.js";
import { getChannelVideos } from "./utils/youtube/get_channel_videos.js";

async function main() {
	const allVideos = await getChannelVideos();

	const processedVideos = await getProcessedVideos();

	for (const video of allVideos) {
		if (processedVideos.includes(video.url)) {
			console.log(`log: already processed video '${video.title}'`);
			continue;
		}

		const downloaded = await downloadVideo(video);
		if (!downloaded) {
			console.warn(`warn: could not download video '${video.title}'`);
			continue;
		}

		try {
			await uploadToSmolish(downloaded, video, false);
			console.info(`info: successfully published video '${video.title}'`);
			processedVideos.push(video.url);
			await setProcessedVideos(processedVideos);
		} catch (error) {
			console.warn(`warn: failed to publish video '${video.title}'`);
		}
	}
}

main();