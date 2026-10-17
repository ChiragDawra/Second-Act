import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';
import type { DocumentType } from './schema.ts';

/**
 * Safe text extraction for one uploaded resume. The file type is decided from the
 * file's leading bytes, never from the name or declared content type. Nothing is
 * written to disk and the content is never logged.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_PAGES = 12;
export const MAX_TEXT_CHARS = 60_000;

export class DocumentError extends Error {
  readonly code: 'too_large' | 'unsupported' | 'unreadable' | 'no_text';
  constructor(code: DocumentError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

export function detectDocumentType(bytes: Uint8Array): Exclude<DocumentType, 'synthetic_text'> | null {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return 'pdf';
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return 'docx';
  // Plain text: reject anything containing NUL bytes in the first 4 KB (binary).
  const head = bytes.subarray(0, 4096);
  for (const b of head) if (b === 0) return null;
  return 'txt';
}

/** Page boundaries are kept as form-feed characters so sections can span or stop at pages. */
export async function extractDocumentText(bytes: Uint8Array): Promise<{ type: Exclude<DocumentType, 'synthetic_text'>; text: string }> {
  if (bytes.length === 0) throw new DocumentError('no_text', 'The file is empty.');
  if (bytes.length > MAX_UPLOAD_BYTES) throw new DocumentError('too_large', 'The file is larger than 5 MB.');

  const type = detectDocumentType(bytes);
  if (!type) throw new DocumentError('unsupported', 'Upload a PDF, DOCX or plain-text resume.');

  let text: string;
  try {
    if (type === 'pdf') {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      if (pdf.numPages > MAX_PDF_PAGES) throw new DocumentError('too_large', `The PDF has more than ${MAX_PDF_PAGES} pages.`);
      const { text: pages } = await extractText(pdf, { mergePages: false });
      text = pages.join('\n\f\n');
    } else if (type === 'docx') {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      text = result.value;
    } else {
      text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }
  } catch (err) {
    if (err instanceof DocumentError) throw err;
    // Encrypted, corrupt or truncated files land here. The parser message is not echoed (it may quote content).
    throw new DocumentError('unreadable', 'The file could not be read. It may be encrypted or damaged.');
  }

  if (text.length > MAX_TEXT_CHARS) throw new DocumentError('too_large', 'The resume text is too long.');
  if (text.replace(/\s+/g, '').length < 20) {
    throw new DocumentError('no_text', 'No readable text was found. Scanned images need OCR, which is not included.');
  }
  return { type, text };
}

/** Cleans extraction artefacts without changing meaning. */
export function normalizeResumeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/[​-‍﻿­]/g, '')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
