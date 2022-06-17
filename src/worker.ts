import type { Context } from 'worktop';
import { Router, compose } from 'worktop';
import { reply } from 'worktop/response';
import * as CORS from 'worktop/cors';
import { start } from 'worktop/cfw';
import * as Cache from 'worktop/cfw.cache';
import type { KV } from 'worktop/cfw.kv';

import {
  InvalidArgumentsError,
  UnauthorizedError,
  ServiceError,
} from './error';
import { type SearchResult } from './search';
import { makeSearch } from './impl/juso.go.kr';

interface Bindings extends Context {
  bindings: {
    INDEX: KV.Namespace;

    /**
    * 도로명주소 API Confirm Key
    *
    * @see https://www.juso.go.kr/addrlink/devAddrLinkRequestWrite.do?returnFn=write&cntcMenu=URL
    *
    * wrangler secret 커맨드로 관리합니다.
    *
    * @See https://developers.cloudflare.com/workers/cli-wrangler/commands#secret
    */
    JUSO_CONFIRM_KEY: string;
  };
}

const API = new Router<Bindings>();

API.prepare = compose(
  Cache.sync(),
  CORS.preflight(),
);

API.add('GET', '/search/:keyword', async (_req, context) => {
  const keyword = decodeURIComponent(context.params.keyword).trim();
  const { searchParams } = context.url;
  const page = parseInt(searchParams.get('page') as string) || 1;
  const perPage = parseInt(searchParams.get('perPage') as string) || 10;
  const proxy = searchParams.get('proxy') === 'true';
  const cacheFirst = !proxy;

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
    confirmKey: context.bindings.JUSO_CONFIRM_KEY,
    namespace: context.bindings.INDEX,
    cacheFirst,
  });
  try {
    const items: SearchResult[] = [];
    const offset = (page - 1) * perPage;
    for await (const item of search({ keyword, offset })) {
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
      return reply(400, { message: error.message });
    } else if (error instanceof UnauthorizedError) {
      console.error(error.message || error.toString());
      return reply(401, { message: error.message });
    } else if (error instanceof ServiceError) {
      console.error(error.message || error.toString());
      return reply(502, { message: error.message });
    } else if (error.name === 'AbortError') {
      return reply(408, { message: 'Request Timeout' }, { 'Connection': 'close' });
    } else {
      console.error(error.message || error.toString());
      return reply(500, { message: 'Internal Server Error' });
    }
  }
});

export default start(API.run);
