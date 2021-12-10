export type SearchParameters = {
  keyword: string,
  offset?: number,
};

export type SearchResult = {
  address: string,
  enAddress: string,
  jibunAddress: string,
  zipCode: string,
};

export type Search = (params: SearchParameters) => AsyncGenerator<SearchResult>;
