import type { SmolishConfig } from "../../types/SmolishConfig.js";

export const config: SmolishConfig = {
	baseUrl: 'https://smolish.com',
	tags: [
        "vlog", "edit", "build", "review", "clip", "fail", "setup",
        "stream", "setup", "animation", "cover", "speedrun", "asmr",
		"facedev", "tech", "code", "ai-turtle", "reddit", "sus", "7elevenz",
		"genshin impact", "zzz", "zenless zone zero", "anime", "phonk", "dance",
		"viral", "trending",
    ],
};

export const headers: Record<string, string> = {
	Cookie: process.env.COOKIE || '',
	Origin: 'https://smolish.com',
	Referer: 'https://smolish.com/studio',
};