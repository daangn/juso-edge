# Juso @ Edge ⚡

## ⚠️ 사용 주의

캐시되지 않은 대부분의 요청이 타임아웃 에러(408)와 함께 실패하고 있습니다. Cloudflare Workers에서 사용하는 대부분의 IP가 차단되고 있는 것으로 보입니다. Cloudflare Workers는 IP를 특정할 수 없어 방화벽 등록 요청에도 어려움을 겪고 있습니다. 혹시 이와 같은 서비스가 필요한 경우 IP를 특정하기 쉬운 서버에 포팅해서 사용하시길 권장드립니다.

아마 Cloudflare Magic NAT 베타 서비스 신청해서 완화할 수 있을 것 같습니다. ([#1](https://github.com/daangn/juso-edge/issues/1))

-------

Reliable edge proxy to the [Juso API](https://www.juso.go.kr/addrlink/devAddrLinkRequestGuide.do?menu=roadApi)

- Global CDN powered by Cloudflare
- HTTP/2 & HTTP/3 enabled
- Constant & Fast response time
- Cache-first

## Usage

e.g. Request URL for `신논현` is [`https://juso-edge.karrot.workers.dev/search/신논현`](https://juso-edge.karrot.workers.dev/search/신논현)

```http
GET "https://juso-edge.karrot.workers.dev/search/%EC%8B%A0%EB%85%BC%ED%98%84"
```

See [CodeSandbox](https://codesandbox.io/s/juso-react-ki87i) demo

### Options

| Param     | Format         | Description                              | Default Value    |
| :-------- | :------------- | :--------------------------------------- | ---------------: |
| `page`    | Integer (>  0) | number of page                           |            `"1"` |
| `perPage` | Integer (>= 0) | max item count per page                  |           `"10"` |
| `proxy`   | Boolean        | opt-out all downstream cache behavior    |        `"false"` |

### Response

```ts
type Response = {
  hasNext: boolean,

  items: {
    /**
     * 도로명 주소
     */
    address: string,

    /**
     * 도로명 주소 (영문)
     */
    enAddress: string,

    /**
     * 지번 주소
     */
    jibunAddress: string,
    
    /**
     * 우편번호
     */
    zipCode: string,
  }[],
}
```

### LICENSE

MIT
