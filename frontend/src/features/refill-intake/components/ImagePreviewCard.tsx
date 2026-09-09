import type { ReactNode } from 'react'
import type { DeviceType } from '../types/refill.types'
import { formatFileSize } from '../utils/file-upload.validator'

interface ImagePreviewCardProps {
  file: File
  previewUrl: string
  deviceType: DeviceType
  onRemove: () => void
  disabled?: boolean
}

export function ImagePreviewCard({
  file,
  previewUrl,
  deviceType,
  onRemove,
  disabled = false,
}: ImagePreviewCardProps): ReactNode {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        <img
          src={previewUrl}
          alt="Device Screen Scan Preview"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex-1 min-w-0 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
            {deviceType === 'BLOOD_PRESSURE' ? 'Blood Pressure Monitor' : 'Glucometer'}
          </span>
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Magic bytes verified
          </span>
        </div>

        <p className="mt-1 truncate text-sm font-semibold text-slate-900" title={file.name}>
          {file.name}
        </p>

        <p className="mt-0.5 text-xs text-slate-500">
          Size: {formatFileSize(file.size)} • Type: {file.type || 'image'}
        </p>
      </div>

      <div className="shrink-0">
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 hover:border-red-300 disabled:opacity-50 transition-colors"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Remove
        </button>
      </div>
    </div>
  )
}
