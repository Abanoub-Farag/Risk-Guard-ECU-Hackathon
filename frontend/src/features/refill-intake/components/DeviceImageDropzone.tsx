import { useRef, type ChangeEvent, type DragEvent, type ReactNode } from 'react'

interface DeviceImageDropzoneProps {
  isDragging: boolean
  isValidating: boolean
  error?: string | null
  disabled?: boolean
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void
  onDrop: (e: DragEvent<HTMLDivElement>) => void
  onFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void
}

export function DeviceImageDropzone({
  isDragging,
  isValidating,
  error,
  disabled = false,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
}: DeviceImageDropzoneProps): ReactNode {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleZoneClick = () => {
    if (!disabled && !isValidating) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
        Medical Device Screen Capture Scan
      </label>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleZoneClick}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault()
            handleZoneClick()
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
            : error
              ? 'border-red-300 bg-red-50/30 hover:border-red-400'
              : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={onFileInputChange}
          disabled={disabled || isValidating}
          className="hidden"
          aria-label="Upload medical device screen capture"
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-3">
          {isValidating ? (
            <svg
              className="h-6 w-6 animate-spin text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>

        <p className="text-sm font-semibold text-slate-800">
          {isValidating ? (
            'Validating image headers…'
          ) : (
            <>
              <span className="text-blue-600 underline">Click to upload</span> or drag and drop
            </>
          )}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          JPEG or PNG image file of LCD screen reading (maximum 10MB)
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200"
        >
          <svg
            className="h-4 w-4 shrink-0 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
