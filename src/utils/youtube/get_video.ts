import { YouTube } from "youtube-sr";
import type { YoutubeVideo } from "../../types/YoutubeVideo.js";

function getRandomSearchQuery(): string {
    const randomWords = [
        "vlog", "edit", "build", "review", "clip", "fail", "setup",
        "stream", "setup", "animation", "cover", "speedrun", "asmr",
		"facedev", "tech", "code", "ai-turtle", "reddit"
    ];

    if (Math.random() > 0.5) {
        const word = randomWords[Math.floor(Math.random() * randomWords.length)];
        const noise = Math.random().toString(36).substring(2, 5);
        return `${word} ${noise}`;
    } else {
        return Math.random().toString(36).substring(2, 6);
    }
}

export async function getVideo(): Promise<YoutubeVideo | null> {
    try {
        const query = `${getRandomSearchQuery()} #shorts`;

        const results = await YouTube.search(query, {
            limit: 10,
            type: "video"
        });

        const shorts = results.filter((video) => video.duration > 0 && video.duration <= 60000);

        if (shorts.length === 0) {
            return getVideo();
        }

        const short = shorts[Math.floor(Math.random() * shorts.length)];

		if (!short) {
			return null;
		}

		const url = `https://youtube.com/watch?v=${short.id}`;

		console.info(`info: found video at ${url}`);

        return {
			title: short.title || 'Untitled Video',
			description: short.description || '',
			channel: short.channel?.name || 'Unknown Channel',
			url,
        };
    } catch (error) {
        console.error("Failed to fetch random short:", error);
        return null;
    }
}