import type { Reporter } from 'workers-logger';
import { format } from 'workers-logger';

type Config = {
	debug?: boolean,
	source: string,
	apiKey: string,
};

export const makeReporter = ({
	debug = false,
	source,
	apiKey,
}: Config): Reporter => {
	const logflareReport: Reporter = (events, { req, res }) => {
		const url = new URL(req.url);

		const metadata = {
			method: req.method,
			pathname: url.pathname,
			headers: Object.fromEntries(req.headers),
			response: {
				status: res.status,
				headers: Object.fromEntries(res.headers),
			},
			log: events
				.filter(log => debug || log.level !== 'debug')
				.map(log => ({
					level: log.level,
					message: format(log.message, ...log.extra),
				})),
		};

		// prettier-ignore
		const message = `${req.headers.get('cf-connecting-ip')} (${req.headers.get('cf-ray')}) ${req.method} ${req.url} ${res.status}`;

		return fetch('https://api.logflare.app/logs', {
			method: 'POST',
			headers: {
				'X-API-KEY': apiKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				source,
				log_entry: message,
				metadata,
			}),
		});
	};

	return logflareReport;
};

