import { YouTube } from "youtube-sr";
import type { YoutubeVideo } from "../../types/YoutubeVideo.js";
import { config } from "../smolish/config.js";

function getRandomSearchQuery(addNoise: boolean = true): { query: string; baseQuery: string } {
    const randomWords = config.tags;

	const word = randomWords[Math.floor(Math.random() * randomWords.length)];

    if (addNoise) {
        const noise = Math.random().toString(36).substring(2, 5);
        return { query: `${word} ${noise}`, baseQuery: word || 'viral' };
    } else {
        return { query: word || 'viral', baseQuery: word || 'viral' };
    }
}

export async function getVideo(addNoise: boolean = true, queryAttempts: number = 0, defaultQuery?: string): Promise<YoutubeVideo | null> {
    try {
        queryAttempts += 1;

        let query = '';

        let fullQuery = '';
        let baseQuery = '';

        if (!defaultQuery) {
            const generatedQuery = getRandomSearchQuery(addNoise);
            fullQuery = generatedQuery.query;
            baseQuery = generatedQuery.baseQuery;
            query = `${fullQuery} #shorts`;
        } else {
            query = defaultQuery;
            baseQuery = defaultQuery.replace(" #shorts", "");
        }

		console.log(`log: query ${query}`);

        const results = await YouTube.search(query, {
            limit: 10,
            type: "video"
        });

        const shorts = results.filter((video) => video.duration > 0 && video.duration <= 60000);

        const noShorts = shorts.length === 0;
        if (noShorts) {
            if (queryAttempts === 1) {
                return getVideo(false, queryAttempts, `${baseQuery} #shorts`);
            } else if (queryAttempts === 2) {
                return getVideo(true, queryAttempts);
            }
        }
        const short = shorts[Math.floor(Math.random() * shorts.length)];

		if (!short) {
			return null;
		}

		const url = `https://youtube.com/watch?v=${short.id}`;

		console.info(`info: found video at ${url}`);

        queryAttempts = 0;

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