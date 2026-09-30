import { gotScraping } from "got-scraping";

interface HttpRequest {
	url: string;
	method: "POST" | "PUT" | "PATCH";
	headers: Record<string, string>;
	body: string;
}

async function main(): Promise<void> {
	let input = "";
	for await (const chunk of process.stdin) input += chunk.toString();
	const request = JSON.parse(input) as HttpRequest;
	const response = await gotScraping(request.url, {
		method: request.method,
		headers: request.headers,
		body: request.body,
		retry: { limit: 0 },
		throwHttpErrors: false,
		followRedirect: false,
	});
	process.stdout.write(JSON.stringify({
		status: response.statusCode,
		body: response.body,
	}));
}

try {
	await main();
} catch (error) {
	process.stdout.write(JSON.stringify({
		error: error instanceof Error ? error.message : String(error),
	}));
	process.exitCode = 1;
}
