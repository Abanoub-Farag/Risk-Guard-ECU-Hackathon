import type { FileValidationResult } from '../types/refill.types'

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const

const JPEG_MAGIC_BYTES = [0xff, 0xd8, 0xff]
const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/**
 * Performs fast synchronous validation of file size and MIME type.
 */
export function validateFileBasics(file: File): FileValidationResult {
  if (!file) {
    return { isValid: false, error: 'No file provided.' }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds 10MB limit (${formatFileSize(file.size)}).`,
    }
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File is empty.',
    }
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      isValid: false,
      error: 'Unsupported file type. Allowed formats: JPEG, PNG.',
    }
  }

  return {
    isValid: true,
    fileType: file.type as 'image/jpeg' | 'image/png',
  }
}

/**
 * Deep inspection of the file's magic bytes to prevent file extension spoofing.
 */
export async function validateFileContent(file: File): Promise<FileValidationResult> {
  const basicCheck = validateFileBasics(file)
  if (!basicCheck.isValid) {
    return basicCheck
  }

  try {
    const buffer = await file.slice(0, 8).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Check JPEG signature (FF D8 FF)
    const isJpeg =
      bytes.length >= 3 &&
      bytes[0] === JPEG_MAGIC_BYTES[0] &&
      bytes[1] === JPEG_MAGIC_BYTES[1] &&
      bytes[2] === JPEG_MAGIC_BYTES[2]

    // Check PNG signature (89 50 4E 47 0D 0A 1A 0A)
    const isPng =
      bytes.length >= 8 &&
      PNG_MAGIC_BYTES.every((magicByte, idx) => bytes[idx] === magicByte)

    if (isJpeg) {
      return { isValid: true, fileType: 'image/jpeg' }
    }

    if (isPng) {
      return { isValid: true, fileType: 'image/png' }
    }

    return {
      isValid: false,
      error: 'Corrupted or spoofed image file. Magic bytes do not match JPEG or PNG standards.',
    }
  } catch {
    return {
      isValid: false,
      error: 'Failed to read file content for security validation.',
    }
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
