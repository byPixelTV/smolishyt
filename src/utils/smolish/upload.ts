import type { YoutubeVideo } from "../../types/YoutubeVideo.js";
import { config, headers } from "./config.js";
import { gotScraping } from "got-scraping";

export async function uploadToSmolish(video: File, youtubeVideo: YoutubeVideo, exitOnceDone: boolean = true) {
	const result: {
		success: boolean;
		videoId: string | null;
		parts: {
			partNumber: number;
			etag: string | null;
			sizeBytes: number;
		}[];
		steps: {
			publish: {
				success: boolean;
				response: any;
			};
		};
	} = {
        success: false,
        videoId: null,
        parts: [],
		steps: {
			publish: {
				success: false,
				response: null,
			},
		},
    };
	
	try {
		const buffer = await video.arrayBuffer();
		const bytes = new Uint8Array(buffer);

		const create = await gotScraping.post(`${config.baseUrl}/api/videos`, {
			body: JSON.stringify({
				filename: video.name,
				sizeBytes: video.size,
				contentType: video.type,
			}),
			headers: headers,
		});

		if (!create.ok) {
			console.error(`error: create status ${create.statusCode} ${create.body}`);
			if (exitOnceDone) process.exit(1);
		}

		const createJson = JSON.parse(create.body);
		console.log('log: create json', createJson);

		const videoId = createJson.video.id;
		const partSize = createJson.partSize;

		console.log(`log: video id ${videoId}`);
		console.log(`log: part size: ${partSize}`);

		result.videoId = videoId;

		const parts = await gotScraping.get(`${config.baseUrl}/api/videos/${videoId}/parts`, {
			headers: headers,
		});

		const partsJson = JSON.parse(parts.body);

		console.log(`log: missing parts ${partsJson.missing}`);

		for (const partNumber of partsJson.missing) {
			console.log(`log: uploading part ${partNumber} of ${partsJson.partCount}`);

			const start = (partNumber - 1) * partSize;
			const end = Math.min(
				start + partSize,
				bytes.length,
			);

			const chunk = bytes.subarray(start, end);

			console.log(`log: start ${start}`);
			console.log(`log: end ${end}`);
			console.log(`log: buffer length ${bytes.length}`);

			const uploadRequest = await gotScraping.post(`${config.baseUrl}/api/videos/${videoId}/parts`, {
				body: JSON.stringify({
					partNumber,
				}),
				headers: headers,
			});

			const uploadJson = JSON.parse(uploadRequest.body);

			const uploadUrl = uploadJson.url;

			console.log('log: uploading to R2');

			const upload = await gotScraping.put(uploadUrl, {
				body: chunk,
				headers: {
					'Content-Length': chunk.length.toString(),
				},
			});

			const etag = upload.headers.etag;

			console.log(`log: uploaded ${partNumber} ${etag}`);

			await gotScraping.put(`${config.baseUrl}/api/videos/${videoId}/parts`, {
				body: JSON.stringify({
					partNumber,
					etag,
					sizeBytes: chunk.length,
				}),
				headers: {
					...headers,
					'Content-Type': 'application/json',
				},
			});

			result.parts.push({
				partNumber,
				etag: etag || null,
				sizeBytes: chunk.length,
			});

			console.log('log: part confirmed');
		}

		console.log('log: completeing upload');

		const complete = await gotScraping.post(`${config.baseUrl}/api/videos/${videoId}/complete`, {
			headers: headers,
		});

		const completeJson = JSON.parse(complete.body);

		console.log('log: complete json', completeJson);

		console.log('log: publishing video');

		console.log(`log: title ${youtubeVideo.title}`);
		console.log(`log: description ${youtubeVideo.description}`);
		console.log(`log: channel: ${youtubeVideo.channel}`);

		const publish = await gotScraping.patch(`${config.baseUrl}/api/videos/${videoId}`, {
			body: JSON.stringify({
				title: youtubeVideo.title,
				description: youtubeVideo.description + `\nOriginally uploaded on YouTube by ${youtubeVideo.channel}`,
				visibility: 'public',
			}),
			headers: headers,
		});

		const publishJson = JSON.parse(publish.body);

		console.info(`info: video '${youtubeVideo.title}' published successfully!`);

		result.steps.publish = {
			success: true,
			response: publishJson,
		};

		if (exitOnceDone) {
			process.exit(0);
		}
	} catch (error) {
		console.error(`error: ${(error as Error).message}`);
		
		if (exitOnceDone) {
			process.exit(1);
		}

		throw error;
	}
}