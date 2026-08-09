import Innertube from "youtubei.js";
import type { YoutubeVideo } from "../../types/YoutubeVideo.js";

export async function getChannelVideos(): Promise<YoutubeVideo[]> {
	const youtube = await Innertube.create();

	const channelId = process.env.CHANNEL_ID;
	if (!channelId) {
		console.error('error: no channel id found in env file');
		process.exit(1);
	}

	const channel = await youtube.getChannel(channelId);
	const videosTab = await channel.getShorts();
	const videos: any[] = videosTab.videos;

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
		});
		console.log(`log: found video '${title}' by ${channelName}`);
	}

	return allVideos.reverse();
}