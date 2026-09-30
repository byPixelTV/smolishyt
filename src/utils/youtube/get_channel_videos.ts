import Innertube from "youtubei.js";
import type { YoutubeVideo } from "../../types/YoutubeVideo.js";
import { getChannelFetchPages, setChannelFetchPages } from "../data/db.js";

type ChannelVideosPage = {
	videos?: any[];
	has_continuation: boolean;
	getContinuation(): Promise<ChannelVideosPage>;
};

export async function getChannelVideos(): Promise<YoutubeVideo[]> {
	const youtube = await Innertube.create();

	const channelId = process.env.CHANNEL_ID;
	if (!channelId) {
		console.error('error: no channel id found in env file');
		process.exit(1);
	}

	const channel = await youtube.getChannel(channelId);
	const targetPages = await getChannelFetchPages(channelId);
	let videosTab: ChannelVideosPage = await channel.getShorts();
	const videos: any[] = [];
	let page = 1;
	while (page <= targetPages) {
		videos.push(...(videosTab.videos || []));
		if (page === targetPages || !videosTab.has_continuation) {
			break;
		}
		page += 1;
		console.log(`log: fetching older channel videos page ${page}/${targetPages}`);
		videosTab = await videosTab.getContinuation();
	}
	await setChannelFetchPages(channelId, page + 2);

	const allVideos: YoutubeVideo[] = [];

	for (const video of videos) {
		const title = video.overlay_metadata.primary_text.text;
		const channelName = channel.metadata.title || 'Untitled Channel';
		const description = `${title} by ${channelName}`;
		const url = `https://youtube.com${video.on_tap_endpoint.metadata.url}`;
		allVideos.push({
			title: title,
			description: description,
			channel: channelName,
			url: url,
			durationSeconds: typeof video.duration?.seconds === 'number' ? video.duration.seconds : undefined,
		});
		console.log(`log: found video '${title}' by ${channelName}`);
	}

	return allVideos;
}