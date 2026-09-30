import { YtDlp } from 'ytdlp-nodejs';
import type { YoutubeVideo } from '../../types/YoutubeVideo.js';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const ytdlp = new YtDlp({
    binaryPath: process.env.BINARY_PATH || 'yt-dlp',
    ...(process.env.FFMPEG_PATH ? { ffmpegPath: process.env.FFMPEG_PATH } : {}),
});
const execFileAsync = promisify(execFile);
type VideoQuality = 'best' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p' | '240p' | '144p' | 'highest' | 'lowest';
const videoQualities = new Set<VideoQuality>([
    'best',
    '2160p',
    '1440p',
    '1080p',
    '720p',
    '480p',
    '360p',
    '240p',
    '144p',
    'highest',
    'lowest',
]);
const configuredVideoQuality = process.env.VIDEO_QUALITY?.trim() || '720p';
if (!videoQualities.has(configuredVideoQuality as VideoQuality)) {
    throw new Error(`VIDEO_QUALITY must be one of: ${[...videoQualities].join(', ')}`);
}
const videoQuality = configuredVideoQuality as VideoQuality;
const maxDurationSeconds = Number(process.env.VIDEO_MAX_DURATION_SECONDS || 60);
if (!Number.isFinite(maxDurationSeconds) || maxDurationSeconds <= 0) {
    throw new Error('VIDEO_MAX_DURATION_SECONDS must be a positive number');
}

async function compressVideo(inputPath: string, outputPath: string): Promise<string> {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const crf = process.env.VIDEO_CRF || '32';
    const audioBitrate = process.env.VIDEO_AUDIO_BITRATE || '64k';

    console.log('log: compressing video');
    await execFileAsync(ffmpegPath, [
        '-y',
        '-i', inputPath,
        '-map', '0:v:0',
        '-map', '0:a:0?',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', crf,
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', audioBitrate,
        '-movflags', '+faststart',
        '-shortest',
        outputPath,
    ]);

    const [original, compressed] = await Promise.all([stat(inputPath), stat(outputPath)]);
    console.log(`log: compression complete (${(original.size / 1024 / 1024).toFixed(2)} MB -> ${(compressed.size / 1024 / 1024).toFixed(2)} MB)`);
    return compressed.size < original.size ? outputPath : inputPath;
}

export async function downloadVideo(video: YoutubeVideo): Promise<File | null> {
    let durationSeconds = video.durationSeconds;
    if (durationSeconds === undefined) {
        try {
            console.log(`log: checking duration for '${video.title}' before download`);
            const info = await ytdlp.getInfoAsync<'video'>(video.url);
            durationSeconds = info.duration;
        } catch (error) {
            console.error(`error: could not check duration for '${video.title}': ${(error as Error).message}`);
            return null;
        }
    }

    const resolvedDurationSeconds = durationSeconds;
    if (resolvedDurationSeconds === undefined || !Number.isFinite(resolvedDurationSeconds) || resolvedDurationSeconds <= 0) {
        console.warn(`warn: skipping '${video.title}' because its duration could not be determined`);
        return null;
    }
    if (resolvedDurationSeconds > maxDurationSeconds) {
        console.warn(`warn: skipping '${video.title}' before download (${resolvedDurationSeconds.toFixed(1)}s exceeds ${maxDurationSeconds}s limit)`);
        return null;
    }
    console.log(`log: source duration ${resolvedDurationSeconds.toFixed(1)}s`);

    const directory = await mkdtemp(join(tmpdir(), 'smolishyt-'));
    try {
        console.log(`log: downloading '${video.title}'`);
        const download = await ytdlp
            .download(video.url)
            .format({ filter: 'mergevideo', quality: videoQuality, type: 'mp4' })
            .output(directory)
            .on('progress', (progress) => {
                if (progress.percentage_str) {
                    console.log(`log: download ${progress.percentage_str}`);
                }
            })
            .run();
        console.log('log: download and merge complete');
        const outputPath = download.filePaths.find((path) => path.toLowerCase().endsWith('.mp4'));
        if (!outputPath) {
            throw new Error('yt-dlp did not produce an MP4 file');
        }

        const durationProbe = await execFileAsync(process.env.FFPROBE_PATH || 'ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            outputPath,
        ]);
        const downloadedDurationSeconds = Number.parseFloat(durationProbe.stdout.trim());
        if (!Number.isFinite(downloadedDurationSeconds)) {
            throw new Error('Could not determine downloaded video duration');
        }
        if (downloadedDurationSeconds > maxDurationSeconds) {
            throw new Error(`Video is ${downloadedDurationSeconds.toFixed(1)}s; the maximum allowed duration is ${maxDurationSeconds}s`);
        }

        const selectedPath = await compressVideo(outputPath, join(directory, 'compressed.mp4'));

        console.log('log: validating video track');
        const probe = await execFileAsync(process.env.FFPROBE_PATH || 'ffprobe', [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_type',
            '-of', 'csv=p=0',
            selectedPath,
        ]);
        if (!probe.stdout.trim()) {
            throw new Error('Downloaded file has no video track');
        }

        const buffer = await readFile(selectedPath);

        const filename = `${video.title.replace(/[^\w.-]+/g, '_')}.mp4`;
        const file = new File([buffer], filename, { type: 'video/mp4' });
        console.log(`log: created compressed video blob (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
        return file;
    } catch (error) {
        console.error(`error: ${(error as Error).message}`);
        return null;
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
}