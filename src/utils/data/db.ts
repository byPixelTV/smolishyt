import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const processedFilePath = path.join(process.cwd(), '.smolishyt', 'processed.json');
const channelStateFilePath = path.join(process.cwd(), '.smolishyt', 'channel-state.json');

export function getYoutubeVideoKey(url: string): string {
	try {
		const parsed = new URL(url);
		const id = parsed.searchParams.get('v')
			|| parsed.pathname.match(/\/(?:shorts|embed|live)\/([^/?]+)/)?.[1]
			|| (parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1).split('/')[0] : undefined);
		return id || url;
	} catch {
		return url;
	}
}

function normalizeProcessedVideos(values: unknown[]): string[] {
	return [...new Set(values
		.filter((value): value is string => typeof value === 'string')
		.map(getYoutubeVideoKey))];
}

export async function getProcessedVideos(): Promise<string[]> {
	try {
		if (!existsSync(processedFilePath)) {
			return [];
		}

		const fileText = await readFile(processedFilePath, 'utf8');
		const parsed: unknown = JSON.parse(fileText);
		if (Array.isArray(parsed)) {
			return normalizeProcessedVideos(parsed);
		}
		if (parsed && typeof parsed === 'object') {
			const legacy = parsed as { videos?: unknown; processed?: unknown };
			const values = Array.isArray(legacy.videos)
				? legacy.videos
				: Array.isArray(legacy.processed)
					? legacy.processed
					: [];
			return normalizeProcessedVideos(values);
		}
		return [];
	} catch (error) {
		console.error(`error: ${(error as Error).message}`);
		return [];
	}
}

export async function setProcessedVideos(videos: string[]) {
	try {
		await mkdir(path.dirname(processedFilePath), { recursive: true });
		await writeFile(processedFilePath, JSON.stringify(normalizeProcessedVideos(videos)));
	} catch (error) {
		console.error(`error: ${(error as Error).message}`);
	}
}

export async function getChannelFetchPages(channelId: string): Promise<number> {
	try {
		if (!existsSync(channelStateFilePath)) {
			return 2;
		}

		const fileText = await readFile(channelStateFilePath, 'utf8');
		const parsed: unknown = JSON.parse(fileText);
		if (
			parsed &&
			typeof parsed === 'object' &&
			'channelId' in parsed &&
			'pages' in parsed &&
			(parsed as { channelId: unknown }).channelId === channelId &&
			Number.isSafeInteger((parsed as { pages: unknown }).pages) &&
			(parsed as { pages: number }).pages >= 2
		) {
			return (parsed as { pages: number }).pages;
		}
		return 2;
	} catch (error) {
		console.error(`error: ${(error as Error).message}`);
		return 2;
	}
}

export async function setChannelFetchPages(channelId: string, pages: number) {
	try {
		await mkdir(path.dirname(channelStateFilePath), { recursive: true });
		await writeFile(channelStateFilePath, JSON.stringify({ channelId, pages }));
	} catch (error) {
		console.error(`error: ${(error as Error).message}`);
	}
}