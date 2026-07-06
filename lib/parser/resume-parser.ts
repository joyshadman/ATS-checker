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

  // Pre-load the worker module and register it as the main-thread handler
  // so pdfjs-dist's fake worker setup uses it directly instead of
  // attempting its own dynamic import(workerSrc) which Turbopack
  // cannot resolve during SSR bundling.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const worker: { WorkerMessageHandler: unknown } = await import(
    // @ts-expect-error -- pdfjs-dist ships no types for the worker entry
    "pdfjs-dist/legacy/build/pdf.worker.mjs"
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
