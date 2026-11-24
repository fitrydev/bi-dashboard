// Module worker: parse + validasi Excel di luar main thread.
// Pakai: new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })  (path relatif dari file pemanggil;
// Turbopack/webpack hanya mengenali pola literal `new URL("…", import.meta.url)`).
// Pesan masuk: { buf: ArrayBuffer (transfer), ctx: ValidateCtx }. Pesan keluar: WorkerResult.
import { parseWorkbook, type ParseError } from "./parse";
import { validateRows, type RowResult, type ValidateCtx } from "./validate";

export type WorkerRequest = { buf: ArrayBuffer; ctx: ValidateCtx };
export type WorkerResult =
  | { ok: true; results: RowResult[]; counts: { assets: number; assessments: number } }
  | { ok: false; error: ParseError };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  let out: WorkerResult;
  try {
    const parsed = parseWorkbook(e.data.buf);
    out = parsed.ok
      ? {
          ok: true,
          results: validateRows(parsed, e.data.ctx),
          counts: { assets: parsed.assets.length, assessments: parsed.assessments.length },
        }
      : parsed;
  } catch {
    out = { ok: false, error: { code: "unreadable", message: "Berkas tidak dapat diproses." } };
  }
  self.postMessage(out);
};
