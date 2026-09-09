import { describe, expect, it } from 'vitest'
import {
  formatFileSize,
  MAX_FILE_SIZE_BYTES,
  validateFileBasics,
  validateFileContent,
} from '../utils/file-upload.validator'

describe('File Upload Validator', () => {
  // Helper to generate a dummy file with specific headers
  const createMockFile = (
    name: string,
    type: string,
    size: number,
    magicBytes?: number[]
  ): File => {
    const buffer = new Uint8Array(Math.max(size, magicBytes ? magicBytes.length : 0))
    if (magicBytes) {
      magicBytes.forEach((byte, idx) => {
        buffer[idx] = byte
      })
    }
    return new File([buffer], name, { type })
  }

  describe('validateFileBasics (Synchronous)', () => {
    it('accepts valid JPEG file within size limit', () => {
      const file = createMockFile('reading.jpg', 'image/jpeg', 2 * 1024 * 1024)
      const result = validateFileBasics(file)
      expect(result.isValid).toBe(true)
      expect(result.fileType).toBe('image/jpeg')
    })

    it('accepts valid PNG file within size limit', () => {
      const file = createMockFile('meter.png', 'image/png', 5 * 1024 * 1024)
      const result = validateFileBasics(file)
      expect(result.isValid).toBe(true)
      expect(result.fileType).toBe('image/png')
    })

    it('rejects files exceeding 10MB limit', () => {
      const oversized = createMockFile('huge.jpg', 'image/jpeg', 11 * 1024 * 1024)
      const result = validateFileBasics(oversized)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('File size exceeds 10MB limit')
    })

    it('rejects empty files (0 bytes)', () => {
      const emptyFile = createMockFile('empty.png', 'image/png', 0)
      const result = validateFileBasics(emptyFile)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('File is empty.')
    })

    it('rejects PDF documents', () => {
      const pdfFile = createMockFile('report.pdf', 'application/pdf', 1024 * 1024)
      const result = validateFileBasics(pdfFile)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Unsupported file type. Allowed formats: JPEG, PNG.')
    })

    it('rejects text files', () => {
      const textFile = createMockFile('notes.txt', 'text/plain', 512)
      const result = validateFileBasics(textFile)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Unsupported file type')
    })
  })

  describe('validateFileContent (Magic Bytes Security Inspection)', () => {
    it('approves legitimate JPEG with FF D8 FF header', async () => {
      const file = createMockFile('bp_scan.jpg', 'image/jpeg', 1024, [0xff, 0xd8, 0xff, 0xe0])
      const result = await validateFileContent(file)
      expect(result.isValid).toBe(true)
      expect(result.fileType).toBe('image/jpeg')
    })

    it('approves legitimate PNG with 89 50 4E 47 0D 0A 1A 0A header', async () => {
      const file = createMockFile(
        'glucose_scan.png',
        'image/png',
        1024,
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      )
      const result = await validateFileContent(file)
      expect(result.isValid).toBe(true)
      expect(result.fileType).toBe('image/png')
    })

    it('detects spoofed extension (text payload with .jpg filename and image/jpeg MIME)', async () => {
      // Magic bytes for ASCII "HELLO WORLD"
      const spoofed = createMockFile('spoofed.jpg', 'image/jpeg', 1024, [
        0x48, 0x45, 0x4c, 0x4c, 0x4f, 0x20, 0x57, 0x4f,
      ])
      const result = await validateFileContent(spoofed)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Magic bytes do not match JPEG or PNG standards')
    })
  })

  describe('formatFileSize', () => {
    it('formats bytes, kilobytes, and megabytes accurately', () => {
      expect(formatFileSize(500)).toBe('500 B')
      expect(formatFileSize(1500)).toBe('1.5 KB')
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.50 MB')
    })
  })

  it('exposes MAX_FILE_SIZE_BYTES as exactly 10MB', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024)
  })
})
