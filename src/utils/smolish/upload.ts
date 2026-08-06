import type { YoutubeVideo } from "../../types/YoutubeVideo.js";
import { config, headers } from "./config.js";

export async function uploadToSmolish(video: File, youtubeVideo: YoutubeVideo) {
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

		const create = await fetch(`${config.baseUrl}/api/videos`, {
			method: 'POST',
			body: JSON.stringify({
				filename: video.name,
				sizeBytes: video.size,
				contentType: video.type,
			}),
			headers: headers,
		});

		const createJson = await create.json() as any;
		console.log('log: create json', createJson);

		const videoId = createJson.video.id;
		const partSize = createJson.partSize;

		console.log(`log: video id ${videoId}`);
		console.log(`log: part size: ${partSize}`);

		result.videoId = videoId;

		const parts = await fetch(`${config.baseUrl}/api/videos/${videoId}/parts`, {
			method: 'GET',
			headers: headers,
		});

		const partsJson = await parts.json() as any;

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

			const uploadRequest = await fetch(`${config.baseUrl}/api/videos/${videoId}/parts`, {
				method: 'POST',
				body: JSON.stringify({
					partNumber,
				}),
				headers: headers,
			});

			const uploadJson = await uploadRequest.json() as any;

			const uploadUrl = uploadJson.url;

			console.log('log: uploading to R2');

			const upload = await fetch(uploadUrl, {
				method: 'PUT',
				body: chunk,
				headers: {
					'Content-Length': chunk.length.toString(),
				},
			});

			const etag = upload.headers.get('etag');

			console.log(`log: uploaded ${partNumber} ${etag}`);

			await fetch(`${config.baseUrl}/api/videos/${videoId}/parts`, {
				method: 'PUT',
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
				etag,
				sizeBytes: chunk.length,
			});

			console.log('log: part confirmed');
		}

		console.log('log: completeing upload');

		const complete = await fetch(`${config.baseUrl}/api/videos/${videoId}/complete`, {
			method: 'POST',
			headers: headers,
		});

		const completeJson = await complete.json();

		console.log('log: complete json', completeJson);

		console.log('log: publishing video');

		console.log(`log: title ${youtubeVideo.title}`);
		console.log(`log: description ${youtubeVideo.description}`);
		console.log(`log: channel: ${youtubeVideo.channel}`);

		const publish = await fetch(`${config.baseUrl}/api/videos/${videoId}`, {
			method: 'PATCH',
			body: JSON.stringify({
				title: youtubeVideo.title,
				description: youtubeVideo.description + `\nOriginally uploaded on YouTube by ${youtubeVideo.channel}`,
				visibility: 'public',
			}),
			headers: headers,
		});

		const publishJson = await publish.json();

		console.info(`info: video '${youtubeVideo.title}' published successfully!`);

		result.steps.publish = {
			success: true,
			response: publishJson,
		};

		process.exit(0);
	} catch (error) {
		console.error(`error: ${(error as Error).message}`);
		process.exit(1);
	}
}