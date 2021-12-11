import type { KV } from 'worktop/kv';

import type { Search, SearchParameters, SearchResult } from '../search';
import type { ErrorMetadata } from '../error';
import { InvalidArgumentsError, UnauthorizedError, ServiceError } from '../error';

/**
 * 도로명주소 API Confirm Key
 *
 * @see https://www.juso.go.kr/addrlink/devAddrLinkRequestWrite.do?returnFn=write&cntcMenu=URL
 *
 * wrangler secret 커맨드로 관리합니다.
 *
 * @See https://developers.cloudflare.com/workers/cli-wrangler/commands#secret
 */
declare var JUSO_CONFIRM_KEY: string;

const API_ENDPOINT = 'https://www.juso.go.kr/addrlink/addrLinkApi.do';

// Fixed size for indexing
const PER_PAGE = 10;

type Config = {
  namespace: KV.Namespace,
  cacheFirst?: boolean,
};

export const makeSearch = ({
  namespace,
  cacheFirst = true,
}: Config): Search => {
  async function* search({
    keyword,
    offset = 0,
  }: SearchParameters): AsyncGenerator<SearchResult> {
    let page = offset / PER_PAGE + 1 | 0;
    let iterCount = offset;

    // eager validations
    if (!keyword) {
      throw new InvalidArgumentsError(errors['E0005']);
    }
    if (keyword.length < 2) {
      throw new InvalidArgumentsError(errors['E0008']);
    }
    if (keyword.length > 80) {
      throw new InvalidArgumentsError(errors['E0010']);
    }
    if (!/[a-zA-Z가-힣]/.test(keyword)) {
      throw new InvalidArgumentsError(errors['E0012']);
    }
    if (/[\%\=\>\<\[\]]/.test(keyword)) {
      throw new InvalidArgumentsError(errors['E0013']);
    }

    while (true) {
      let result: JusoSearchResult | null = null;

      const cacheKey = `juso:${keyword}:${page}:result`;
      if (cacheFirst) {
        const cache = await namespace.get<JusoSearchResult>(cacheKey, { type: 'json' });
        if (cache) {
          result = cache;
        }
      }

      if (!result) {
        const url = new URL(API_ENDPOINT);
        url.searchParams.set('confmKey', JUSO_CONFIRM_KEY);
        url.searchParams.set('resultType', 'json');
        url.searchParams.set('countPerPage', PER_PAGE.toString());
        url.searchParams.set('currentPage', page.toString());
        url.searchParams.set('keyword', keyword);

        const response = await fetch(url.toString());
        const body = await response.json() as JusoSearchResult;

        const errorCode = body.results.common.errorCode;
        const error = errors[errorCode];
        switch (errorCode) {
          case '-999':
            throw new ServiceError(error);
          case 'E0001':
            throw new UnauthorizedError(error);
          case 'E0005':
          case 'E0006':
          case 'E0008':
          case 'E0009':
            throw new InvalidArgumentsError(error);
          case 'E0010':
          case 'E0011':
          case 'E0012':
          case 'E0013':
            throw new InvalidArgumentsError(error);
          case 'E0014':
            throw new UnauthorizedError(error);
          case 'E0015':
            throw new ServiceError(error);
        }

        namespace.put(cacheKey, JSON.stringify(body), { expirationTtl: 60 * 60 * 24 });
        result = body;
      }

      const { results: response } = result;

      for (const juso of response.juso) {
        yield {
          address: juso.roadAddrPart1,
          enAddress: juso.engAddr,
          jibunAddress: juso.jibunAddr,
          zipCode: juso.zipNo,
        };
      }

      iterCount += response.juso.length;
      if (+response.common.totalCount <= iterCount) {
        break;
      }

      page++;
    }
  }

  return search;
};

/**
 * @see https://www.juso.go.kr/addrlink/devAddrLinkRequestGuide.do?menu=roadApi
 */
type JusoSearchResult = {
  results: {
    common: {
      totalCount: string,
      currentPage: string,
      countPerPage: string,
      errorCode: string,
      errorMessage: string,
    },

    juso: Array<{

      /**
      * 전체 도로명 주소
      */
      roadAddr: string,

      /**
      * 도로명주소(참고항목 제외)
      */
      roadAddrPart1: string,

      /**
      * 도로명주소 참고항목
      */
      roadAddrPart2: string,

      /**
      * 지번주소
      */
      jibunAddr: string,

      /**
      * 도로명주소(영문)
      */
      engAddr: string,

      /**
      * 우편번호
      */
      zipNo: string,

      /**
      * 행정구역코드
      */
      admCd: string,

      /**
      * 도로명코드
      */
      rnMgtSn: string,

      /**
      * 건물관리번호
      */
      bdMgtSn: string,

      /**
      * 상세건물명
      */
      detBdNmList: string,

      /**
      * 건물명
      */
      bdNm: string,

      /**
      * 공동주택여부 (0: 비공동주택, 1: 공동주택)
      */
      bdKdcd: '0' | '1',

      /**
      * 시도명
      */
      siNm: string,

      /**
      * 시군구명
      */
      sggNm: string,

      /**
      * 읍면동명
      */
      emdNm: string,

      /**
      * 법정리명
      */
      liNm: string,

      /**
      * 도로명
      */
      rn: string,

      /**
      * 지하여부 (0: 지상, 1: 지하)
      */
      udrtYn: '0' | '1',

      /**
      * 건물본번
      */
      buildMnnm: string,

      /**
      * 건물부번
      */
      buildSlno: string,

      /**
      * 산여부 (0: 대지, 1: 산)
      */
      mtYn: string,

      /**
      * 지번본번(번지)
      */
      lnbrMnnm: string,

      /**
      * 지번부번(호)
      */
      lnbrSlno: string,

      /**
      * 읍면동일련번호
      */
      emdNo: string,

      /**
      * 변동이력여부 (0: 현행주소정보, 1: 요청변수의 keyword가 변동된 주소 정보에서 검색된 정보)
      */
      hstryYn?: '0' | '1',

      /**
      * 관련지번
      */
      relJibun?: string,

      /**
      * 관할주민센터
      */
      hemdNm?: string,
    }>,
  },
};

const errors: Record<string, ErrorMetadata> = {
  '-999': {
    by: 'juso.go.kr',
    code: '-999',
    message: '시스템 에러',
    resolution: '도로명주소 도움센터로 문의하시기 바랍니다.',
  },
  'E0001': {
    by: 'juso.go.kr',
    code: 'E0001',
    message: '승인되지 않은 KEY 입니다.',
    resolution: '정확한 승인키를 입력하세요.(팝업API 승인키 사용불가)',
  },
  'E0005': {
    by: 'juso.go.kr',
    code: 'E0005',
    message: '검색어가 입력되지 않았습니다.',
    resolution: '도로명주소 도움센터로 문의하시기 바랍니다.',
  },
  'E0006': {
    by: 'juso.go.kr',
    code: 'E0006',
    message: '주소를 상세히 입력해주시기 바랍니다.',
    resolution: '시도명으로는 검색이 불가합니다.',
  },
  'E0008': {
    by: 'juso.go.kr',
    code: 'E0008',
    message: '검색어는 두 글자 이상 입력되어야 합니다.',
    resolution: '한 글자만으로는 검색이 불가합니다.',
  },
  'E0009': {
    by: 'juso.go.kr',
    code: 'E0009',
    message: '검색어는 문자와 숫자 같이 입력되어야 합니다.',
    resolution: '숫자만으로는 검색이 불가합니다.',
  },
  'E0010': {
    by: 'juso.go.kr',
    code: 'E0010',
    message: '검색어가 너무 깁니다. (한글 40자, 영문, 숫자 80자 이하)',
    resolution: '80글자를 초과한 검색어는 검색이 불가합니다.',
  },
  'E0011': {
    by: 'juso.go.kr',
    code: 'E0011',
    message: '검색어에 너무 긴 숫자가 포함되어 있습니다. (숫자 10자 이하)',
    resolution: '10자리를 초과하는 숫자가 포함된 검색어는 검색이 불가합니다.',
  },
  'E0012': {
    by: 'juso.go.kr',
    code: 'E0012',
    message: '특수문자+숫자만으로는 검색이 불가능 합니다.',
    resolution: '특수문자와 숫자만으로 이루어진 검색어는 검색이 불가합니다.',
  },
  'E0013': {
    by: 'juso.go.kr',
    code: 'E0013',
    message: 'SQL 예약어 또는 특수문자( %,=,>,<,[,] )는 검색이 불가능 합니다.',
    resolution: 'SQL 예약어 또는 특수문자를 제거 후 검색합니다.',
  },
  'E0014': {
    by: 'juso.go.kr',
    code: 'E0014',
    message: '개발승인키 기간이 만료되어 서비스를 이용하실 수 없습니다.',
    resolution: '개발승인키를 다시 발급받아 API 서비스를 호출합니다.',
  },
  'E0015': {
    by: 'juso.go.kr',
    code: 'E0015',
    message: '검색 범위를 초과하였습니다.',
    resolution: '검색결과가 9천건이 초과하는 검색은 불가합니다.',
  },
};
