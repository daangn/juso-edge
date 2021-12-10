import { Router, listen } from 'worktop';
import * as Cache from 'worktop/cache';
import * as CORS from 'worktop/cors';
import type { KV } from 'worktop/kv';

import { InvalidArgumentsError, ServiceError } from './error';
import type { SearchResult } from './search';
import { makeSearch } from './impl/juso.go.kr';

declare var INDEX: KV.Namespace;

const API = new Router();

API.prepare = CORS.preflight();

API.add('GET', '/search/:keyword', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword);
  const searchParams = new URLSearchParams(req.search);
  const page = parseInt(searchParams.get('page') as string) || 1;
  const perPage = parseInt(searchParams.get('perPage') as string) || 10;
  const proxy = searchParams.get('proxy') === 'true';
  const cacheFirst = !proxy;

  const search = makeSearch({ namespace: INDEX, cacheFirst });
  try {
    const items: SearchResult[] = [];
    const offset = (page - 1) * perPage;
    for await (const item of search({ keyword, offset })) {
      items.push(item);
      if (items.length === perPage) {
        break;
      }
    }
    if (cacheFirst) {
      res.setHeader('Cache-Control', `public, max-age=${60 * 60 * 24}`);
    } else {
      res.setHeader('Cache-Control', `must-revalidate`);
    }
    return res.send(200, { items });
  } catch (error) {
    if (error instanceof InvalidArgumentsError) {
      return res.send(400, error.message);
    } else if (error instanceof ServiceError) {
      console.error(error);
      return res.send(500, error.message);
    } else {
      console.error(error);
      return res.send(500, 'Internal Server Error');
    }
  }
});

Cache.listen(API.run);
