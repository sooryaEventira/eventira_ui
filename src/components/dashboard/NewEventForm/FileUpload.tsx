import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Upload01, X } from '@untitled-ui/icons-react'

interface UploadedFile {
  file: File
  progress: number
  status: 'uploading' | 'complete' | 'error'
}

interface FileUploadProps {
  label: string
  accept?: string
  maxSize?: string
  value: File | null
  onChange: (file: File | null) => void
  maxWidth?: string
  maxHeight?: string
  /** Logo: preview fills height. Banner: preview fills width (`object-contain`, never cropped). */
  previewVariant?: 'logo' | 'banner'
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = 'image/*',
  maxSize = '800×400px',
  value,
  onChange,
  maxWidth: _maxWidth,
  maxHeight: _maxHeight,
  previewVariant = 'logo',
}) => {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current)
        uploadIntervalRef.current = null
      }
    }
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    // Clear any existing interval before starting a new upload
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current)
      uploadIntervalRef.current = null
    }

    onChange(file)
    
    // Create preview URL for image files
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    
    // Simulate upload progress
    const uploadFile: UploadedFile = {
      file,
      progress: 0,
      status: 'uploading'
    }
    setUploadedFile(uploadFile)

    // Simulate upload progress
    uploadIntervalRef.current = setInterval(() => {
      setUploadedFile((prev) => {
        if (!prev) {
          // If prev is null, clear interval and return null
          if (uploadIntervalRef.current) {
            clearInterval(uploadIntervalRef.current)
            uploadIntervalRef.current = null
          }
          return null
        }
        
        const newProgress = Math.min(prev.progress + 10, 100)
        const newStatus = newProgress >= 100 ? 'complete' : 'uploading'
        
        if (newProgress >= 100) {
          // Clear interval when upload completes
          if (uploadIntervalRef.current) {
            clearInterval(uploadIntervalRef.current)
            uploadIntervalRef.current = null
          }
        }
        
        return {
          ...prev,
          progress: newProgress,
          status: newStatus
        }
      })
    }, 200)
  }, [onChange])

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set isDragging to false if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      // Validate file type
      if (accept && accept !== '*/*' && accept !== 'image/*') {
        const acceptedTypes = accept.split(',').map(t => t.trim())
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
        if (!acceptedTypes.some(type => type.includes(fileExtension) || type.includes('image/*'))) {
          return
        }
      }
      handleFileSelect(file)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDelete = () => {
    // Clear any running upload interval
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current)
      uploadIntervalRef.current = null
    }
    
    onChange(null)
    setUploadedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toUpperCase() || ''
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Label */}
      <label className="text-sm font-medium text-slate-700">
        {label}
      </label>
      
      {/* Upload Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`self-stretch px-6 py-4 bg-white rounded-xl outline outline-1 outline-offset-[-1px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors min-h-[180px] ${
          isDragging 
            ? 'outline-[#6938EF] outline-2 bg-[#6938EF]/5' 
            : 'outline-[#D5D7DA]'
        }`}
      >
        {/* Show Preview or Upload UI */}
        {previewUrl && accept?.includes('image') ? (
          previewVariant === 'banner' ? (
            <div className="flex w-full max-w-full items-center justify-center py-2">
              <img
                src={previewUrl}
                alt={uploadedFile?.file.name ?? 'Banner preview'}
                className="h-auto w-full max-h-48 object-contain"
              />
            </div>
          ) : (
            <div className="flex h-28 w-full items-center justify-center">
              <img
                src={previewUrl}
                alt={uploadedFile?.file.name ?? 'Logo preview'}
                className="h-full max-h-28 w-auto max-w-full object-contain"
              />
            </div>
          )
        ) : (
          <div className="self-stretch flex flex-col items-center gap-3">
            {/* Icon Container */}
            <div className="w-10 h-10 relative bg-white shadow-[0px_1px_2px_rgba(10,12.67,18,0.05)] rounded-lg outline outline-1 outline-[#D5D7DA] outline-offset-[-1px] flex items-center justify-center">
              <div className="w-5 h-5 relative overflow-hidden">
                <Upload01 className="w-[16.67px] h-[15px] text-[#414651]" strokeWidth={1.67} />
              </div>
            </div>

            {/* Text Section */}
            <div className="self-stretch flex flex-col items-center gap-1">
              <div className="self-stretch flex justify-center items-start gap-1">
                <div className="text-[#5925DC] text-sm font-semibold leading-5">
                  Click to upload
                </div>
                <div className="text-[#535862] text-sm font-normal leading-5">
                  or drag and drop
                </div>
              </div>
              <div className="self-stretch text-center text-[#535862] text-xs font-normal leading-[18px]">
                SVG, PNG, JPG or GIF (max. {maxSize})
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Uploaded File Details */}
      {value && uploadedFile && (
        <div className="self-stretch flex flex-col gap-3">
          <div className="self-stretch p-4 relative bg-white rounded-xl outline outline-1 outline-[#E9EAEB] outline-offset-[-1px] flex items-start">
            <div className="flex-1 flex items-start gap-3">
              {/* File Icon Preview */}
              <div className="w-10 h-10 relative flex-shrink-0">
                <div className="w-8 h-10 left-[7px] top-0 absolute">
                  <div className="w-8 h-10 left-0 top-0 absolute rounded border-[1.5px] border-[#D5D7DA]" />
                  <div className="w-[11.5px] h-[11.5px] left-[20px] top-[0.5px] absolute rounded border-[1.5px] border-[#D5D7DA]" />
                </div>
                <div className="px-[3px] py-[2px] left-[1px] top-[18px] absolute bg-[#6938EF] rounded justify-start items-start inline-flex">
                  <div className="text-center text-white text-[10px] font-bold">
                    {getFileExtension(uploadedFile.file.name)}
                  </div>
                </div>
              </div>

              {/* File Info and Progress */}
              <div className="flex-1 flex flex-col gap-1">
                <div className="self-stretch flex flex-col gap-0.5">
                  <div className="self-stretch text-[#414651] text-sm font-medium leading-5">
                    {uploadedFile.file.name}
                  </div>
                  <div className="self-stretch flex items-center gap-2">
                    <div className="text-[#535862] text-sm font-normal leading-5">
                      {formatFileSize((uploadedFile.file.size * uploadedFile.progress) / 100)} of {formatFileSize(uploadedFile.file.size)}
                    </div>
                    {uploadedFile.status === 'uploading' && (
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 relative overflow-hidden">
                          <div className="w-[13.33px] h-3 left-[1.33px] top-0.5 absolute">
                            <div className="w-[13.33px] h-3 border-[1.5px] border-[#A4A7AE] rounded-full animate-spin" />
                          </div>
                        </div>
                        <div className="text-[#717680] text-sm font-medium leading-5">Uploading...</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {uploadedFile.status === 'uploading' && (
                  <div className="self-stretch flex items-center gap-3">
                    <div className="flex-1 h-2 relative rounded-lg">
                      <div className="w-full h-2 absolute left-0 top-0 bg-[#E9EAEB] rounded-full" />
                      <div
                        className="h-2 absolute left-0 top-0 bg-[#6938EF] rounded-full transition-all duration-300"
                        style={{ width: `${uploadedFile.progress}%` }}
                      />
                    </div>
                    <div className="text-[#414651] text-sm font-medium leading-5">
                      {uploadedFile.progress}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Delete Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              className="absolute top-2 right-2 p-1.5 rounded-md flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4 text-[#A4A7AE]" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload

