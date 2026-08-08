import type { SmolishConfig } from "../../types/SmolishConfig.js";

export const config: SmolishConfig = {
	baseUrl: 'https://smolish.com',
	tags: [
        "vlog", "edit", "build", "review", "clip", "fail", "setup",
        "stream", "setup", "animation", "cover", "speedrun", "asmr",
		"facedev", "tech", "code", "ai-turtle", "reddit", "sus", "7elevenz",
		"genshin impact", "zzz", "zenless zone zero", "anime", "phonk", "dance",
		"viral", "trending", "job", "h1t1", "tyler vitelli", "brazillian phonk",
		"hisytstory", "his story", "zackdfilms", "zack d films", "sambucha", "mrbeast",
		"one piece", "naruto", "ddlc", "miku", "hatsune miku", "coding", "programming",
		"tuff", "tuff edit", "speed", "ishowspeed", "furina genshin impact",
		"wise zenless zone zero", "belle zenless zone zero", "lumine genshin impact",
		"anime jiggle physics", "acelerada", "dia delicia", "no batidao", "sem controle",
    ],
	numShorts: 10,
};

export const headers: Record<string, string> = {
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'en-US,en;q=0.9',
	'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125", "Not=A?Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Linux"',
	'Cookie': process.env.COOKIE || '',
	'Origin': 'https://smolish.com',
	'Referer': 'https://smolish.com/studio',
};