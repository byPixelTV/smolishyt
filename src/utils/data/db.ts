import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import path from "path";

const home = homedir();
const processedFilePath = path.join(home, '.smolishyt', 'processed.json');

export async function getProcessedVideos(): Promise<string[]> {
	try {
		if (!existsSync(processedFilePath)) {
			return [];
		}

		const fileText = await readFile(processedFilePath, 'utf8');
		const processed: string[] = JSON.parse(fileText);
		return processed;
	} catch (error) {
		console.error(`error: ${(error as Error).message}`);
		return [];
	}
}

export async function setProcessedVideos(videos: string[]) {
	try {
		await mkdir(path.dirname(processedFilePath), { recursive: true });
		await writeFile(processedFilePath, JSON.stringify(videos));
	} catch (error) {
		console.error(`error: ${(error as Error).message}`);
	}
}