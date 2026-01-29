import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Upload01, Download01, XClose, File01 } from '@untitled-ui/icons-react'
import Button from './untitled/Button'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload?: (files: File[]) => Promise<void> | void
  onAttachFiles?: (files: File[]) => void // Deprecated: use onUpload instead
  // Customization props
  title?: string
  description?: string
  uploadText?: string
  accept?: string
  multiple?: boolean
  showTemplate?: boolean
  templateLabel?: string
  onDownloadTemplate?: () => void
  buttonText?: string
  cancelButtonText?: string
  instructions?: string[]
  maxFileSize?: number // in bytes
}

const UploadModal: React.FC<UploadModalProps> = ({ 
  isOpen, 
  onClose, 
  onUpload,
  onAttachFiles, // For backward compatibility
  title = 'Upload and attach files',
  description,
  uploadText = 'Click to upload, drag and drop xlsx',
  accept = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  multiple = true,
  showTemplate = true,
  templateLabel = 'Template',
  onDownloadTemplate,
  buttonText = 'Attach files',
  cancelButtonText = 'Cancel',
  instructions,
  maxFileSize
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileExtension = (name: string) => {
    const ext = String(name || '').split('.').pop() || ''
    return ext.toLowerCase()
  }

  const isExcelFile = (file: File) => {
    const ext = getFileExtension(file.name)
    const ct = String(file.type || '').toLowerCase()
    return ['xls', 'xlsx', 'xlsm', 'xlsb'].includes(ext) || ct.includes('spreadsheet')
  }

  const isWordFile = (file: File) => {
    const ext = getFileExtension(file.name)
    const ct = String(file.type || '').toLowerCase()
    return ['doc', 'docx', 'docm'].includes(ext) || ct.includes('document')
  }

  const isPdfFile = (file: File) => {
    const ext = getFileExtension(file.name)
    const ct = String(file.type || '').toLowerCase()
    return ext === 'pdf' || ct.includes('pdf')
  }

  const isImageFile = (file: File) => {
    const ct = String(file.type || '').toLowerCase()
    const ext = getFileExtension(file.name)
    return ct.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
  }

  const isVideoFile = (file: File) => {
    const ct = String(file.type || '').toLowerCase()
    const ext = getFileExtension(file.name)
    return ct.startsWith('video/') || ['mp4', 'mov', 'webm', 'm4v', 'avi'].includes(ext)
  }

  const FileTypeIcon = ({ file }: { file: File }) => {
    const ext = (getFileExtension(file.name) || 'FILE').toUpperCase()

    // Image thumbnails for a nicer preview (matches Resource Management expectation)
    if (isImageFile(file)) {
      return <ImageThumb file={file} />
    }

    // Excel files - green icon
    if (isExcelFile(file)) {
      return (
        <div className="relative h-8 w-8 flex-shrink-0">
          <div className="absolute left-0.5 top-0 h-8 w-7">
            <div className="absolute left-0 top-0 h-8 w-7 bg-[#079455]" />
            <div className="absolute left-4 top-0 h-2.5 w-2.5 bg-white opacity-30" />
          </div>
          <div className="absolute left-0.5 top-[18px] w-7 text-center text-[8px] font-bold leading-none text-white" style={{ fontFamily: 'Inter' }}>
            {ext}
          </div>
        </div>
      )
    }

    // Word files - blue icon
    if (isWordFile(file)) {
      return (
        <div className="relative h-8 w-8 flex-shrink-0">
          <div className="absolute left-0.5 top-0 h-8 w-7">
            <div className="absolute left-0 top-0 h-8 w-7 bg-[#2B579A]" />
            <div className="absolute left-4 top-0 h-2.5 w-2.5 bg-white opacity-30" />
          </div>
          <div className="absolute left-0.5 top-[18px] w-7 text-center text-[8px] font-bold leading-none text-white" style={{ fontFamily: 'Inter' }}>
            {ext}
          </div>
        </div>
      )
    }

    // PDF files - red icon
    if (isPdfFile(file)) {
      return (
        <div className="relative h-8 w-8 flex-shrink-0">
          <div className="absolute left-0.5 top-0 h-8 w-7">
            <div className="absolute left-0 top-0 h-8 w-7 bg-[#E11D48]" />
            <div className="absolute left-4 top-0 h-2.5 w-2.5 bg-white opacity-30" />
          </div>
          <div className="absolute left-0.5 top-[18px] w-7 text-center text-[8px] font-bold leading-none text-white" style={{ fontFamily: 'Inter' }}>
            PDF
          </div>
        </div>
      )
    }

    // Video / other files: show generic icon (don’t mislabel as XLSX)
    if (isVideoFile(file)) {
      return <File01 className="h-8 w-8 text-slate-400" />
    }
    return <File01 className="h-8 w-8 text-slate-400" />
  }

  const ImageThumb = ({ file }: { file: File }) => {
    const url = useMemo(() => URL.createObjectURL(file), [file])
    useEffect(() => {
      return () => {
        try {
          URL.revokeObjectURL(url)
        } catch {
          // ignore
        }
      }
    }, [url])

    return (
      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
        <img src={url} alt={file.name} className="h-full w-full object-cover" />
      </div>
    )
  }
  
  // Use onUpload if provided, otherwise fall back to onAttachFiles for backward compatibility
  const handleUpload = onUpload || onAttachFiles

  // Reset selected files when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFiles([])
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files)
      
      // Filter by max file size if specified
      const validFiles = maxFileSize 
        ? fileArray.filter(file => file.size <= maxFileSize)
        : fileArray
      
      if (validFiles.length < fileArray.length) {
        // Some files were too large
        const invalidCount = fileArray.length - validFiles.length
        alert(`${invalidCount} file(s) exceeded the maximum file size of ${formatFileSize(maxFileSize!)}`)
      }
      
      if (multiple) {
        setSelectedFiles((prev) => [...prev, ...validFiles])
      } else {
        setSelectedFiles(validFiles.slice(0, 1))
      }
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    // Check if we're actually leaving the drop zone
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleClickUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  const handleAttachFiles = async () => {
    if (selectedFiles.length === 0 || !handleUpload) {
      return
    }

    setIsUploading(true)

    try {
      // Call the upload handler (parent component handles the actual upload logic)
      await handleUpload(selectedFiles)
      
      // Clear selected files and close modal on success
      setSelectedFiles([])
      onClose()
    } catch (error) {
      // Error handling is done by parent component
      console.error('Failed to upload files:', error)
      // Don't close modal on error - let parent handle it
    } finally {
      setIsUploading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleBackdropDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleBackdropDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      onDragOver={handleBackdropDragOver}
      onDrop={handleBackdropDrop}
    >
      <div
        className="relative w-full max-w-[400px] overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {/* Modal Header */}
        <div className="relative flex w-full flex-col items-center justify-start">
          <div className="flex w-full flex-col items-start justify-start gap-2 self-stretch px-6 pt-4">
            <div className="flex w-full flex-col items-start justify-start gap-0.5 self-stretch">
              <div className="w-full text-base font-semibold leading-6 text-[#181D27]" style={{ fontFamily: 'Inter' }}>
                {title}
              </div>
              {description && (
                <div className="w-full text-sm font-normal leading-5 text-[#535862]" style={{ fontFamily: 'Inter' }}>
                  {description}
                </div>
              )}
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg p-2"
          >
            <div className="relative h-5 w-5 overflow-hidden">
              <svg
                className="absolute left-1.5 top-1.5 h-3 w-3 text-[#A4A7AE]"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 3L3 9M3 3L9 9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>

          {/* Spacer */}
          <div className="h-3 w-full" />
        </div>

        {/* Modal Content */}
        <div className="flex w-full flex-col items-start justify-start gap-3 px-6">
          <div className="flex w-full flex-col items-start justify-start gap-3 self-stretch">
            {/* Template Download Section - Only show if enabled */}
            {showTemplate && (
              <div className="flex w-full flex-col items-start justify-start gap-2 self-stretch">
                <div 
                  className={`relative flex w-full items-start justify-start gap-1 overflow-hidden rounded-xl border border-[#E9EAEB] bg-white p-4 outline outline-1 outline-[#E9EAEB] outline-offset-[-1px] ${onDownloadTemplate ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
                  onClick={onDownloadTemplate ? (e) => {
                    e.stopPropagation()
                    onDownloadTemplate()
                  } : undefined}
                >
                  <div className="flex flex-1 items-start justify-start gap-3">
                    {/* XLSX Icon */}
                    <div className="relative h-10 w-10 flex-shrink-0">
                      <div className="absolute left-1 top-0 h-10 w-8">
                        <div className="absolute left-0 top-0 h-10 w-8 bg-[#079455]" />
                        <div className="absolute left-5 top-0 h-3 w-3 bg-white opacity-30" />
                      </div>
                      <div className="absolute left-1 top-[23px] w-8 text-center text-[9px] font-bold leading-none text-white" style={{ fontFamily: 'Inter' }}>
                        XLSX
                      </div>
                    </div>

                    {/* Template Info */}
                    <div className="flex flex-1 flex-col items-start justify-start gap-1">
                      <div className="flex w-full flex-col items-start justify-start gap-0.5 self-stretch">
                        <div className="w-full text-base font-semibold leading-6 text-[#181D27]" style={{ fontFamily: 'Inter' }}>
                          {templateLabel}
                        </div>
                        <div className="inline-flex w-full items-center justify-start gap-2 self-stretch">
                          <span className={`text-sm font-normal leading-5 ${onDownloadTemplate ? 'text-[#5925DC] hover:underline cursor-pointer' : 'text-[#535862]'}`} style={{ fontFamily: 'Inter' }}>
                            Download template
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Download Button */}
                  {onDownloadTemplate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDownloadTemplate()
                      }}
                      className="absolute right-2 top-2 flex items-center justify-center overflow-hidden rounded-md p-1.5 hover:bg-slate-100 transition-colors"
                    >
                      <div className="relative h-4 w-4 overflow-hidden">
                        <Download01 className="absolute left-0.5 top-0.5 h-3 w-3 text-[#A4A7AE]" strokeWidth={1.5} />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* File Upload Area */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClickUpload}
              className={`flex w-full cursor-pointer flex-col items-center justify-start gap-1 self-stretch rounded-xl border-2 border-dashed bg-white px-6 py-6 outline outline-2 outline-offset-[-2px] transition-colors ${
                isDragging
                  ? 'border-[#7A5AF8] outline-[#7A5AF8] bg-purple-50'
                  : 'border-[#7A5AF8] outline-[#7A5AF8] hover:bg-slate-50'
              }`}
            >
              <div className="flex w-full flex-col items-center justify-start gap-2 self-stretch pointer-events-none">
                {/* Upload Icon - Circular with arrow up */}
                <div className="relative h-10 w-10 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-white border-2 border-[#7A5AF8]" />
                  <Upload01 className="relative h-5 w-5 text-[#7A5AF8]" strokeWidth={2} />
                </div>

                {/* Upload Text */}
                <div className="flex w-full flex-col items-center justify-start gap-1 self-stretch">
                  <div className="inline-flex w-full items-start justify-center gap-1 self-stretch">
                    {uploadText.includes(' or ') ? (
                      <>
                        <span className="text-sm font-semibold leading-5 text-[#5925DC] pointer-events-auto cursor-pointer" style={{ fontFamily: 'Inter' }} onClick={handleClickUpload}>
                          {uploadText.split(' or ')[0]}
                        </span>
                        <span className="text-sm font-normal leading-5 text-[#535862]" style={{ fontFamily: 'Inter' }}>
                          {' or ' + uploadText.split(' or ')[1]}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold leading-5 text-[#5925DC] pointer-events-auto cursor-pointer" style={{ fontFamily: 'Inter' }} onClick={handleClickUpload}>
                        {uploadText}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple={multiple}
              accept={accept}
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="flex w-full flex-col items-start justify-start gap-2 self-stretch">
                <div className="text-sm font-medium leading-5 text-[#181D27]" style={{ fontFamily: 'Inter' }}>
                  Selected files ({selectedFiles.length})
                </div>
                <div className="flex w-full flex-col items-start justify-start gap-2 self-stretch max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex flex-1 items-center justify-start gap-2 min-w-0">
                        <FileTypeIcon file={file} />
                        <div className="flex flex-1 flex-col items-start justify-start gap-0.5 min-w-0">
                          <div className="w-full truncate text-sm font-medium leading-5 text-[#181D27]" style={{ fontFamily: 'Inter' }}>
                            {file.name}
                          </div>
                          <div className="text-xs font-normal leading-4 text-[#535862]" style={{ fontFamily: 'Inter' }}>
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                        aria-label="Remove file"
                      >
                        <XClose className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {instructions && instructions.length > 0 && (
              <div className="flex w-full flex-col items-start justify-start gap-1 self-stretch">
                {instructions.map((instruction, index) => (
                  <div key={index} className="text-sm font-normal leading-5 text-[#535862]" style={{ fontFamily: 'Inter' }}>
                    {instruction}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex w-full flex-col items-start justify-start pt-4">
          <div className="inline-flex w-full items-start justify-start gap-3 self-stretch px-6 pb-4">
            {/* Cancel Button */}
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onClose}
              className="flex-1"
              style={{ fontFamily: 'Inter' }}
            >
              {cancelButtonText}
            </Button>

            {/* Attach Files Button */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleAttachFiles}
              disabled={selectedFiles.length === 0 || isUploading || !handleUpload}
              className="flex-1"
              style={{ fontFamily: 'Inter' }}
            >
              {isUploading ? 'Uploading...' : buttonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadModal
