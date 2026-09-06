/** Narrow structural interfaces for the Cloudflare bindings actually used here.
 * The app has no runtime framework or Node dependency. See docs/ARCHITECTURE.md.
 */
export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<Result<T>>;
  run<T = Record<string, unknown>>(): Promise<Result<T>>;
}
export interface Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: { changes: number; [key: string]: unknown };
}
export interface Database {
  prepare(sql: string): Statement;
  batch<T = Record<string, unknown>>(
    statements: Statement[],
  ): Promise<Result<T>[]>;
  exec(sql: string): Promise<unknown>;
}
export interface Bucket {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  get(key: string): Promise<{
    body: ReadableStream;
    size: number;
    httpEtag?: string;
    arrayBuffer(): Promise<ArrayBuffer>;
  } | null>;
  delete(key: string | string[]): Promise<void>;
}
export interface Env {
  AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> };
  DB: Database;
  PHOTOS: Bucket;
  ASSETS: { fetch(request: Request): Promise<Response> };
  RELEASE_SHA?: string;
  CF_VERSION?: { id: string; tag: string };
  SETUP_KEY?: string;
  TRIP_PHOTO_BUDGET_MB?: string;
  MAINTENANCE?: string;
}
export interface Context {
  waitUntil(promise: Promise<unknown>): void;
}
/** JSON/SQL record used only inside the Worker adapter. Request helpers validate
 * fields before SQL binding; database constraints guard persisted invariants.
 * It is deliberately not an exported client contract.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic D1 projection and JSON fields are narrowed by the adapter's validators.
export type Row = Record<string, any>;
