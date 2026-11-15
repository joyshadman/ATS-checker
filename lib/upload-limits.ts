/**
 * Upload size limits shared by the parser (server) and the upload forms (client).
 *
 * Vercel Functions reject request bodies larger than 4.5 MB
 * (`FUNCTION_PAYLOAD_TOO_LARGE`), and Next.js Server Actions default to 1 MB.
 * `next.config.ts` raises the action limit to 4mb, which fits inside the
 * platform ceiling while leaving room for multipart boundaries and headers.
 */
export const MAX_UPLOAD_MB = 4;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
export const MAX_UPLOAD_MESSAGE = `File size exceeds ${MAX_UPLOAD_MB} MB limit`;
