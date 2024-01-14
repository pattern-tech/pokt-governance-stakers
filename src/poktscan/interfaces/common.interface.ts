export interface BaseRetriever<Options, Output> {
  retrieve(options: Options): Promise<Output>;
}
