import type { Context as WorktopContext } from 'worktop';
import type { KV } from 'worktop/cfw.kv';
import type { Context as ReporterContext } from './reporter';

export interface Context extends WorktopContext, ReporterContext {
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

    USE_LOGFLARE: string;
    LOGFLARE_SOURCE?: string;
    LOGFLARE_API_KEY?: string;
  };
}
