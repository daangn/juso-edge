import { Router, compose } from 'worktop';
import { reply } from 'worktop/response';
import * as CORS from 'worktop/cors';
import { start } from 'worktop/cfw';
import * as Cache from 'worktop/cfw.cache';

import type { Context } from './context';
import {
  InvalidArgumentsError,
  UnauthorizedError,
  ServiceError,
} from './error';

import type { SearchResult } from './search';
import { makeSearch } from './impl/search/juso.go.kr';

import * as Reporter from './reporter';
import { makeReporter as makeConsoleReporter } from './impl/reporter/console';
import { makeReporter as makeLogflareReporter } from './impl/reporter/logflare';

const API = new Router<Context>();

API.prepare = compose(
  Cache.sync(),
  CORS.preflight(),
  function (request, context) {
    const useLogflare = Boolean(
      context.bindings.USE_LOGFLARE === 'true' &&
      context.bindings.LOGFLARE_SOURCE &&
      context.bindings.LOGFLARE_API_KEY
    );
    const reporter = useLogflare
      ? makeLogflareReporter({
        debug: context.bindings.DEBUG === 'true',
        source: context.bindings.LOGFLARE_SOURCE!,
        apiKey: context.bindings.LOGFLARE_API_KEY!,
      })
      : makeConsoleReporter();

    const handler = Reporter.track(reporter, 'juso-edge');
    return handler(request, context);
  },
);

API.add('GET', '/search/:keyword', async (_req, context) => {
  const keyword = decodeURIComponent(context.params.keyword);
  const { searchParams } = context.url;
  const page = parseInt(searchParams.get('page') as string) || 1;
  const perPage = parseInt(searchParams.get('perPage') as string) || 10;
  const proxy = searchParams.get('proxy') === 'true';
  const cacheFirst = !proxy;

  context.reporter.log(
    'Searching for params %o',
    { keyword, page, perPage, proxy },
  );

  const headers: HeadersInit = {};

  if (page < 0) {
    return reply(400, { message: 'page must be greater than zero' });
  }

  // TODO: allow unlimited pagination with jsonl stream
  const maxPerPage = 100;
  if (perPage > maxPerPage) {
    return reply(400, { message: `perPage must be less than ${maxPerPage}` });
  }

  const search = makeSearch({
    context,
    confirmKey: context.bindings.JUSO_CONFIRM_KEY,
    namespace: context.bindings.INDEX,
    cacheFirst,
  });

  try {
    const items: SearchResult[] = [];
    const offset = (page - 1) * perPage;
    const queryKeyword = keyword.replaceAll(' ', '');
    context.reporter.log(`Query ${perPage} results from page ${page} for "${queryKeyword}"`);

    for await (const item of search({ keyword: queryKeyword, offset })) {
      items.push(item);
      if (items.length === perPage + 1) {
        break;
      }
    }

    if (cacheFirst) {
      headers['Cache-Control'] = `public, max-age=${60 * 60 * 24}`;
    } else {
      headers['Cache-Control'] = `public, must-revalidate`;
    }

    return reply(200, {
      hasNext: items.length > perPage,
      items: items.slice(0, perPage),
    }, headers);

  } catch (error: any) {
    if (error instanceof InvalidArgumentsError) {
      context.reporter.info(error.message);
      return reply(400, { message: error.message });
    } else if (error instanceof UnauthorizedError) {
      context.reporter.info(error.message);
      return reply(401, { message: error.message });
    } else if (error instanceof ServiceError) {
      context.reporter.info(error.message);
      return reply(502, { message: error.message });
    } else if (error.name === 'AbortError') {
      context.reporter.error(error);
      return reply(408, { message: 'Request Timeout' }, { 'Connection': 'close' });
    } else {
      context.reporter.error(error);
      return reply(500, { message: 'Internal Server Error' });
    }
  }
});

export default start(API.run);
