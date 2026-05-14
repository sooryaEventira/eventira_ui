import React, { useEffect, useState } from 'react'
import { XClose, File01 } from '@untitled-ui/icons-react'
import { fetchAllFolders, fetchFiles, type FileData, type FolderData } from '../../../services/resourceService'

const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'm4v']
const VIDEO_CONTENT_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv']

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'heic', 'tif', 'tiff']

function isVideoFile(file: FileData): boolean {
  const ext = (file.name || '').split('.').pop()?.toLowerCase() ?? ''
  const ct = String(file.content_type || '').toLowerCase()
  return VIDEO_EXTENSIONS.includes(ext) || VIDEO_CONTENT_TYPES.some((t) => ct.includes(t))
}

function isImageFile(file: FileData): boolean {
  const ext = (file.name || '').split('.').pop()?.toLowerCase() ?? ''
  const ct = String(file.content_type || '').toLowerCase()
  if (IMAGE_EXTENSIONS.includes(ext)) return true
  if (ct.startsWith('image/')) return true
  return false
}

interface ResourceVideoPickerModalProps {
  isOpen: boolean
  onClose: () => void
  eventUuid: string
  onSelect: (url: string, name: string) => void
  /** When `image`, lists image files from Resource Management (default: `video`). */
  mediaType?: 'video' | 'image'
}

const ResourceVideoPickerModal: React.FC<ResourceVideoPickerModalProps> = ({
  isOpen,
  onClose,
  eventUuid,
  onSelect,
  mediaType = 'video'
}) => {
  const [folders, setFolders] = useState<FolderData[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [files, setFiles] = useState<FileData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !eventUuid) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setFiles([])

    ;(async () => {
      try {
        const allFolders = await fetchAllFolders(eventUuid)
        if (cancelled) return
        setFolders(allFolders)

        let merged: FileData[]
        if (selectedFolderId) {
          merged = await fetchFiles(selectedFolderId)
        } else {
          // Do not call fetchFiles() without a folder — that lists unscoped org files.
          // Only list files that live under this event's folders.
          if (allFolders.length === 0) {
            merged = []
          } else {
            const batches = await Promise.all(allFolders.map((f) => fetchFiles(f.uuid)))
            if (cancelled) return
            const byId = new Map<string, FileData>()
            for (const batch of batches) {
              for (const file of batch) {
                byId.set(file.uuid, file)
              }
            }
            merged = Array.from(byId.values())
          }
        }

        if (cancelled) return
        const filtered = merged.filter(mediaType === 'image' ? isImageFile : isVideoFile)
        setFiles(filtered)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load files')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isOpen, eventUuid, selectedFolderId, mediaType])

  const handleSelect = (file: FileData) => {
    const url = file.file ?? (file as any).url ?? ''
    const name = file.name ?? (mediaType === 'image' ? 'Image' : 'Video')
    if (url) {
      onSelect(url, name)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-base font-semibold text-slate-900">
            {mediaType === 'image'
              ? 'Select image from Resource Management'
              : 'Select video from Resource Management'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <XClose className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Folder</label>
            <select
              value={selectedFolderId ?? ''}
              onChange={(e) => setSelectedFolderId(e.target.value || null)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All folders (this event)</option>
              {folders.map((f) => (
                <option key={f.uuid} value={f.uuid}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
          ) : files.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-600">No files found</div>
          ) : (
            <ul className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {files.map((file) => (
                <li key={file.uuid}>
                  <button
                    type="button"
                    onClick={() => handleSelect(file)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <File01 className="h-5 w-5 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{file.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResourceVideoPickerModal
