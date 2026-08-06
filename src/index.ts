import { uploadToSmolish } from "./utils/smolish/upload.js";
import { downloadVideo } from "./utils/youtube/download_video.js";
import { getVideo } from "./utils/youtube/get_video.js";

async function main() {
	const video = await getVideo();
	if (!video) {
		console.error('error: failed to fetch video');
		process.exit(1);
	}

	const videoFile = await downloadVideo(video);
	if (!videoFile) {
		console.error('error: failed to download video');
		process.exit(1);
	}

	await uploadToSmolish(videoFile, video);
}

main();