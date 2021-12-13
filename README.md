# Juso @ Edge ⚡

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

### Options

| Param     | Format         | Description                                      | Default Value    |
| :-------- | :------------- | :----------------------------------------------- | ---------------: |
| `page`    | Integer (>  0) | 시작 페이지                                      |            `"1"` |
| `perPage` | Integer (>= 0) | 페이지 당 최대 아이템 갯수                       |           `"10"` |
| `proxy`   | Boolean        | Proxy 모드 활성화 시 모든 캐시 동작이 opt-out 됨 |        `"false"` |

### Response

```ts
type Response = {
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
