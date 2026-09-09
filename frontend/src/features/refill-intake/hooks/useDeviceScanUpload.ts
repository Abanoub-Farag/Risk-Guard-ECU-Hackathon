import { useCallback, useEffect, useState, type ChangeEvent, type DragEvent } from 'react'
import type { DeviceType } from '../types/refill.types'
import { validateFileContent } from '../utils/file-upload.validator'

export interface UseDeviceScanUploadReturn {
  deviceType: DeviceType
  stagedFile: File | null
  previewUrl: string | null
  isDragging: boolean
  isValidating: boolean
  validationError: string | null
  setDeviceType: (type: DeviceType) => void
  handleFile: (file: File) => Promise<boolean>
  clearFile: () => void
  handleDragOver: (e: DragEvent<HTMLDivElement>) => void
  handleDragLeave: (e: DragEvent<HTMLDivElement>) => void
  handleDrop: (e: DragEvent<HTMLDivElement>) => void
  handleFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void
}

export function useDeviceScanUpload(
  initialDeviceType: DeviceType = 'BLOOD_PRESSURE'
): UseDeviceScanUploadReturn {
  const [deviceType, setDeviceType] = useState<DeviceType>(initialDeviceType)
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const clearFile = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setStagedFile(null)
    setPreviewUrl(null)
    setValidationError(null)
  }, [previewUrl])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFile = useCallback(
    async (file: File): Promise<boolean> => {
      setIsValidating(true)
      setValidationError(null)

      const result = await validateFileContent(file)
      setIsValidating(false)

      if (!result.isValid) {
        setValidationError(result.error ?? 'Invalid file selected.')
        return false
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      const url = URL.createObjectURL(file)
      setStagedFile(file)
      setPreviewUrl(url)
      setValidationError(null)
      return true
    },
    [previewUrl]
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        const file = files[0]
        if (file) {
          await handleFile(file)
        }
      }
    },
    [handleFile]
  )

  const handleFileInputChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        const file = files[0]
        if (file) {
          await handleFile(file)
        }
      }
      // Reset input value so same file can be re-selected if removed
      e.target.value = ''
    },
    [handleFile]
  )

  return {
    deviceType,
    stagedFile,
    previewUrl,
    isDragging,
    isValidating,
    validationError,
    setDeviceType,
    handleFile,
    clearFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
  }
}
