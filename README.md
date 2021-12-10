# Juso @ Edge ⚡

Reliable edge proxy to the [Juso API](https://www.juso.go.kr/addrlink/devAddrLinkRequestGuide.do?menu=roadApi)

## Usage

```http
GET https://juso-edge.karrot.workers.dev/search/{keyword}
```

### Options

| Param     | Format         | Default Value    | Description |
| :-------- | :------------- | ---------------: | :---------- |
| `page`    | Integer (>  0) |            `"1"` | 시작 페이지 |
| `perPage` | Integer (>= 0) |           `"10"` | 페이지 당 최대 아이템 갯수 |
| `proxy`   | Boolean        |        `"false"` | Proxy 모드 활성화 시 모든 캐시 동작이 opt-out 됨 |

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
  }[],
}
```

### LICENSE

MIT
