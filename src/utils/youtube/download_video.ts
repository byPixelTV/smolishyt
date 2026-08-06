import { YtDlp } from 'ytdlp-nodejs';
import type { YoutubeVideo } from '../../types/YoutubeVideo.js';

const ytdlp = new YtDlp();

export async function downloadVideo(video: YoutubeVideo): Promise<File | null> {
    try {
        const buffer = await ytdlp
            .stream(video.url)
            .filter('audioandvideo')
            .type('mp4')
            .toBuffer();

        const file = new File([buffer as unknown as ArrayBuffer], `${video}.mp4`, { type: 'video/mp4' });
        console.log('log: created video blob');
        return file;
    } catch (error) {
        console.error(`error: ${(error as Error).message}`);
        return null;
    }
}