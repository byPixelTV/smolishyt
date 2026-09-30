import type { YoutubeVideo } from "../../types/YoutubeVideo.js";
import { config, headers } from "./config.js";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const jsonHeaders = {
	...headers,
	"Content-Type": "application/json",
};

interface HttpResult {
	status: number;
	body: string;
}

function smolishRequest(
	url: string,
	method: "POST" | "PUT" | "PATCH",
	body: string,
): Promise<HttpResult> {
	return new Promise((resolve, reject) => {
		const worker = fileURLToPath(new URL(
			import.meta.url.endsWith(".ts") ? "./http.ts" : "./http.js",
			import.meta.url,
		));
		const child = spawn(process.env.NODE_BINARY_PATH || "node", ["--experimental-strip-types", worker], {
			stdio: ["pipe", "pipe", "pipe"],
			windowsHide: true,
		});
		const output: Buffer[] = [];
		const errors: Buffer[] = [];
		child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
		child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
		child.stdin.on("error", reject);
		child.once("error", reject);
		child.once("close", (code) => {
			try {
				const rawOutput = Buffer.concat(output).toString("utf8");
				if (!rawOutput) {
					const detail = Buffer.concat(errors).toString("utf8").trim();
					reject(new Error(`Smolish HTTP worker exited with code ${code}${detail ? `: ${detail}` : ""}`));
					return;
				}
				const parsed = JSON.parse(rawOutput) as
					{ status: number; body: string } | { error: string };
				if ("error" in parsed) reject(new Error(parsed.error));
				else if (code !== 0) reject(new Error(`Smolish HTTP worker exited with code ${code}`));
				else resolve({ status: parsed.status, body: parsed.body });
			} catch (error) {
				reject(error);
			}
		});
		child.stdin.end(JSON.stringify({ url, method, headers: jsonHeaders, body }));
	});
}

function assertSuccessfulResponse(response: { ok: boolean; statusCode: number; body: string }, step: string): void {
	if (!response.ok) {
		if (response.statusCode === 403) {
			throw new Error(`${step} was rejected by Cloudflare (403). Refresh COOKIE and BROWSER_USER_AGENT from the same Smolish browser session.`);
		}

		throw new Error(`${step} failed with status ${response.statusCode}: ${response.body}`);
	}
}

function shorten(value: string, maxLength: number): string {
	const trimmed = value.trim();
	if (trimmed.length <= maxLength) return trimmed;
	return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildMetadata(video: YoutubeVideo): { title: string; description: string } {
	const title = shorten(video.title || "Untitled Video", 99);
	return {
		title,
		description: `Source: ${video.url}\n\nAutomated`,
	};
}

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
		const metadata = buildMetadata(youtubeVideo);
		const buffer = await video.arrayBuffer();
		const bytes = new Uint8Array(buffer);

		const create = await smolishRequest(
			`${config.baseUrl}/api/videos`,
			"POST",
			JSON.stringify({
				filename: video.name,
				sizeBytes: video.size,
				contentType: video.type,
			}),
		);

		assertSuccessfulResponse({ ok: create.status >= 200 && create.status < 300, statusCode: create.status, body: create.body }, "create video");

		const createJson = JSON.parse(create.body) as {
			video: { id: string };
			partSize: number;
			partCount: number;
			urls: Record<string, string>;
		};

		const videoId = createJson.video.id;
		const partSize = createJson.partSize;

		console.log(`log: video id ${videoId}`);

		result.videoId = videoId;

		for (let partNumber = 1; partNumber <= createJson.partCount; partNumber++) {
			console.log(`log: uploading part ${partNumber} of ${createJson.partCount}`);

			const start = (partNumber - 1) * partSize;
			const end = Math.min(
				start + partSize,
				bytes.length,
			);

			const chunk = bytes.subarray(start, end);
			const uploadUrl = createJson.urls[String(partNumber)];
			if (!uploadUrl) {
				throw new Error(`create video did not return an upload URL for part ${partNumber}`);
			}

			console.log('log: uploading to R2');

			const upload = await fetch(uploadUrl, {
				method: "PUT",
				body: chunk,
				headers: { "Content-Length": chunk.length.toString() },
			});

			if (!upload.ok) {
				throw new Error(`upload part ${partNumber} failed with status ${upload.status}: ${await upload.text()}`);
			}
			const etag = upload.headers.get("etag");

			const confirm = await smolishRequest(
				`${config.baseUrl}/api/videos/${videoId}/parts`,
				"PUT",
				JSON.stringify({
					partNumber,
					etag,
					sizeBytes: chunk.length,
				}),
			);
			assertSuccessfulResponse({ ok: confirm.status >= 200 && confirm.status < 300, statusCode: confirm.status, body: confirm.body }, `confirm part ${partNumber}`);

			result.parts.push({
				partNumber,
				etag: etag || null,
				sizeBytes: chunk.length,
			});

		}

		console.log('log: completeing upload');

		const complete = await smolishRequest(`${config.baseUrl}/api/videos/${videoId}/complete`, "POST", "{}");

		assertSuccessfulResponse({ ok: complete.status >= 200 && complete.status < 300, statusCode: complete.status, body: complete.body }, "complete video upload");
		const privateMetadata = await smolishRequest(
			`${config.baseUrl}/api/videos/${videoId}`,
			"PATCH",
			JSON.stringify({ ...metadata, visibility: "private" }),
		);

		assertSuccessfulResponse({ ok: privateMetadata.status >= 200 && privateMetadata.status < 300, statusCode: privateMetadata.status, body: privateMetadata.body }, "set video metadata");

		await sleep(1000);

		const publish = await smolishRequest(
			`${config.baseUrl}/api/videos/${videoId}`,
			"PATCH",
			JSON.stringify({ ...metadata, visibility: "public" }),
		);

		assertSuccessfulResponse({ ok: publish.status >= 200 && publish.status < 300, statusCode: publish.status, body: publish.body }, "publish video");

		console.info(`info: video '${metadata.title}' published successfully!`);

		result.steps.publish = {
			success: true,
			response: JSON.parse(publish.body),
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