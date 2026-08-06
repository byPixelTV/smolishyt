import type { SmolishConfig } from "../../types/SmolishConfig.js";

export const config: SmolishConfig = {
	baseUrl: 'https://smolish.com',
};

export const headers: Record<string, string> = {
	Cookie: process.env.COOKIE || '',
	Origin: 'https://smolish.com',
	Referer: 'https://smolish.com/studio',
};