import type { Reporter } from 'workers-logger';

export const makeReporter = (): Reporter => {
	return (events, _context) => {
		for (const log of events) {
			switch (log.level) {
				case 'log':
					console.log('[log] ' + log.message);
					break;
				case 'info':
					console.info('[info] ' + log.message);
					break;
				case 'warn':
					console.warn('[warn] ' + log.message);
					break;
				case 'debug':
					console.debug('[debug] ' + log.message);
					break;

				case 'fatal':
				case 'error':
					console.error('[error] ' + log.message);
					console.error(JSON.stringify(log.error));
					return;
			}
			if (log.extra.length > 0) {
				console.log(JSON.stringify(log.extra));
			}
		}
	};
};
