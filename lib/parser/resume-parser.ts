import mammoth from "mammoth";

export async function parseResumeFile(
  file: File
): Promise<{ text: string; fileName: string }> {
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File size exceeds 10 MB limit");
  }

  const fileName = file.name;
  const ext = fileName.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "txt":
      return { text: await file.text(), fileName };
    case "pdf":
      return { text: await parsePDF(file), fileName };
    case "docx":
      return { text: await parseDOCX(file), fileName };
    default:
      throw new Error("Unsupported file format. Supported: PDF, DOCX, TXT");
  }
}

async function parsePDF(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  // Polyfill DOMMatrix for pdfjs-dist in Node.js.
  // pdfjs-dist v5 ships a browser build that references DOMMatrix (browser API).
  // Its built-in Node.js compat code (process.getBuiltinModule -> @napi-rs/canvas)
  // fails in Next.js/Turbopack's bundled server context, causing:
  //   ReferenceError: DOMMatrix is not defined
  // We provide a minimal JS-only polyfill — sufficient for text extraction.
  if (typeof globalThis.DOMMatrix === "undefined") {
    class DOMMatrixPolyfill {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      constructor(init?: Float64Array | number[] | string) {
        if (typeof init === "string") {
          const match = init.match(/matrix\(([^)]+)\)/);
          if (match) {
            const values = match[1].split(",").map(Number);
            if (values.length >= 6)
              [this.a, this.b, this.c, this.d, this.e, this.f] = values;
          }
        } else if (init) {
          const arr = Array.from(init);
          if (arr.length >= 6)
            [this.a, this.b, this.c, this.d, this.e, this.f] = arr;
        }
      }
      multiplySelf(o: DOMMatrixPolyfill) {
        const a = this.a * o.a + this.c * o.b;
        const b = this.b * o.a + this.d * o.b;
        const c = this.a * o.c + this.c * o.d;
        const d = this.b * o.c + this.d * o.d;
        const e = this.a * o.e + this.c * o.f + this.e;
        const f = this.b * o.e + this.d * o.f + this.f;
        this.a = a; this.b = b; this.c = c; this.d = d; this.e = e; this.f = f;
        return this;
      }
      preMultiplySelf(o: DOMMatrixPolyfill) {
        const a = o.a * this.a + o.c * this.b;
        const b = o.b * this.a + o.d * this.b;
        const c = o.a * this.c + o.c * this.d;
        const d = o.b * this.c + o.d * this.d;
        const e = o.a * this.e + o.c * this.f + o.e;
        const f = o.b * this.e + o.d * this.f + o.f;
        this.a = a; this.b = b; this.c = c; this.d = d; this.e = e; this.f = f;
        return this;
      }
      invertSelf() {
        const det = this.a * this.d - this.b * this.c;
        if (det === 0) return this;
        [this.a, this.b, this.c, this.d, this.e, this.f] = [
          this.d / det,
          -this.b / det,
          -this.c / det,
          this.a / det,
          (this.c * this.f - this.d * this.e) / det,
          (this.b * this.e - this.a * this.f) / det,
        ];
        return this;
      }
      translate(tx: number, ty: number) {
        return this.multiplySelf(
          new DOMMatrixPolyfill([1, 0, 0, 1, tx, ty])
        );
      }
      scale(sx: number, sy: number) {
        return this.multiplySelf(
          new DOMMatrixPolyfill([sx, 0, 0, sy, 0, 0])
        );
      }
      get is2D() {
        return true;
      }
    }
    (globalThis as Record<string, unknown>).DOMMatrix = DOMMatrixPolyfill;
  }

  // Pre-load the worker module and register it as the main-thread handler
  // so pdfjs-dist's fake worker setup uses it directly instead of
  // attempting its own dynamic import(workerSrc) which Turbopack
  // cannot resolve during SSR bundling.
  const worker: { WorkerMessageHandler: unknown } = await import(
    // @ts-expect-error -- pdfjs-dist ships no types for the worker entry
    "pdfjs-dist/legacy/build/pdf.worker.mjs"
  );
  (globalThis as Record<string, unknown>).pdfjsWorker = {
    WorkerMessageHandler: worker.WorkerMessageHandler,
  };

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = (content.items as Array<{ str?: string }>)
      .map((item) => item.str ?? "")
      .join(" ");
    pages.push(text);
    page.cleanup();
  }

  doc.destroy();
  return pages.join("\n\n");
}

async function parseDOCX(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value;
}
