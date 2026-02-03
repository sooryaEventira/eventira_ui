import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import EventHubNavbar from '../EventHubNavbar'
import EventHubSidebar from '../EventHubSidebar'
import { defaultCards, ContentCard } from '../EventHubContent'
import { InfoCircle, CodeBrowser, Globe01, Folder, Upload01, Plus, DotsVertical, ChevronRight, File01, SearchLg, FilterLines } from '@untitled-ui/icons-react'
import { Button } from '../../ui/untitled'
import ResourceContextMenu from './ResourceContextMenu'
import MoveToFolderModal from './MoveToFolderModal'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import GalleryShortcutModal from './GalleryShortcutModal'
import RestrictAccessModal from './RestrictAccessModal'
import CreateFolderModal from './CreateFolderModal'
import { UploadModal } from '../../ui'
import { fetchFolders, fetchAllFolders, uploadFile, fetchFiles } from '../../../services/resourceService'
import { showToast } from '../../../utils/toast'

export interface MediaFile {
  id: string
  name: string
  type: 'image' | 'document' | 'video' | 'other'
  file: File | null // Can be null for files loaded from API
  preview?: string
  url?: string
  folderId?: string | null
}

export interface MediaFolder {
  id: string
  name: string
  files: string[] // Array of file IDs
  parentId?: string | null
}

interface ResourceManagementPageProps {
  eventName?: string
  isDraft?: boolean
  onBackClick?: () => void
  userAvatarUrl?: string
  onCardClick?: (cardId: string) => void
  hideNavbarAndSidebar?: boolean
}

const ResourceManagementPage: React.FC<ResourceManagementPageProps> = ({
  eventName: propEventName,
  isDraft: propIsDraft,
  onBackClick,
  userAvatarUrl,
  onCardClick,
  hideNavbarAndSidebar = false
}) => {
  // Get eventData and createdEvent from context to maintain consistency with EventHubPage navbar
  const { eventData, createdEvent } = useEventForm()
  
  // Prioritize createdEvent data from API (set when clicking event from dashboard), 
  // fallback to eventData from form, then props
  const eventName = createdEvent?.eventName || eventData?.eventName || propEventName || 'Highly important conference of 2025'
  const isDraft = propIsDraft !== undefined ? propIsDraft : true
  const [allFolders, setAllFolders] = useState<MediaFolder[]>([]) // Store all folders for navigation
  const [folders, setFolders] = useState<MediaFolder[]>([]) // Current level folders for display
  const [files, setFiles] = useState<MediaFile[]>([])
  const [isLoadingFolders, setIsLoadingFolders] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    x: number
    y: number
    type: 'file' | 'folder'
    id: string
  } | null>(null)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [fileToMove, setFileToMove] = useState<MediaFile | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'folder' | 'file' } | null>(null)
  const [showGalleryShortcutModal, setShowGalleryShortcutModal] = useState(false)
  const [fileForShortcut, setFileForShortcut] = useState<MediaFile | null>(null)
  const [showRestrictAccessModal, setShowRestrictAccessModal] = useState(false)
  const [itemForRestriction, setItemForRestriction] = useState<{ id: string; name: string; type: 'folder' | 'file' } | null>(null)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingFileName, setEditingFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const fileRenameInputRef = useRef<HTMLInputElement>(null)
  const folderCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const fileCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const handleSearchClick = () => {
    console.log('Search clicked')
  }

  // Currently only used to drive async behavior; keep for future UI loading indicator.
  void isLoadingFolders

  const handleNotificationClick = () => {
    console.log('Notification clicked')
  }

  const handleProfileClick = () => {
    console.log('Profile clicked')
  }

  // Convert cards to sidebar sub-items
  const sidebarItems = useMemo(() => {
    const eventHubSubItems = defaultCards.map((card: ContentCard) => ({
      id: card.id,
      label: card.title,
      icon: card.icon
    }))

    return [
      { id: 'overview', label: 'Overview', icon: <InfoCircle className="h-5 w-5" /> },
      { id: 'event-website', label: 'Event website', icon: <CodeBrowser className="h-5 w-5" /> },
      {
        id: 'event-hub',
        label: 'Event Hub',
        icon: <Globe01 className="h-5 w-5" />,
        subItems: eventHubSubItems
      }
    ]
  }, [])

  const handleSidebarItemClick = (itemId: string) => {
    if (itemId === 'event-hub' && onBackClick) {
      onBackClick()
      return
    }
    
    if (itemId !== 'resource-management') {
      const isCardId = defaultCards.some((card) => card.id === itemId)
      if (isCardId && onCardClick) {
        onCardClick(itemId)
      }
    }
  }

  // Load all folders from API (for navigation and breadcrumbs)
  const loadAllFolders = useCallback(async () => {
    if (!createdEvent?.uuid) {
      return
    }

    setIsLoadingFolders(true)
    try {
      // Fetch all folders recursively (root and all nested folders)
      const fetchedFolders = await fetchAllFolders(createdEvent.uuid)
      
      // Map API response to MediaFolder interface
      const mappedFolders: MediaFolder[] = fetchedFolders.map((folder) => ({
        id: folder.uuid,
        name: folder.name,
        files: [],
        parentId: folder.parent || null,
      }))
      
      console.log('📁 Loaded all folders from API:', {
        totalCount: mappedFolders.length,
        folders: mappedFolders.map(f => ({ id: f.id, name: f.name, parentId: f.parentId }))
      })
      
      setAllFolders(mappedFolders)
    } catch (error) {
      // Error is already handled by fetchFolders function (toast message)
      console.error('Failed to load folders:', error)
    } finally {
      setIsLoadingFolders(false)
    }
  }, [createdEvent?.uuid])

  // Load folders for current level
  const loadFolders = useCallback(async () => {
    if (!createdEvent?.uuid) {
      return
    }

    setIsLoadingFolders(true)
    try {
      // Fetch folders for the current location (null for root, or currentFolderId for nested)
      const fetchedFolders = await fetchFolders(createdEvent.uuid, currentFolderId)
      
      // Map API response to MediaFolder interface
      const mappedFolders: MediaFolder[] = fetchedFolders.map((folder) => ({
        id: folder.uuid,
        name: folder.name,
        files: [],
        parentId: folder.parent || null,
      }))
      
      console.log('📁 Loaded folders for current level:', {
        currentFolderId,
        fetchedCount: fetchedFolders.length,
        folders: mappedFolders.map(f => ({ id: f.id, name: f.name, parentId: f.parentId }))
      })
      
      setFolders(mappedFolders)
    } catch (error) {
      // Error is already handled by fetchFolders function (toast message)
      console.error('Failed to load folders:', error)
    } finally {
      setIsLoadingFolders(false)
    }
  }, [createdEvent?.uuid, currentFolderId])

  // Load all folders on mount and when event UUID changes (for navigation)
  useEffect(() => {
    loadAllFolders()
  }, [loadAllFolders])

  // Load folders for current level when currentFolderId changes
  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  // Load files for current folder
  const loadFiles = useCallback(async () => {
    if (!createdEvent?.uuid) {
      return
    }

    try {
      // Fetch files for the current folder (null for root, or currentFolderId for nested)
      const fetchedFiles = await fetchFiles(currentFolderId)
      
      // Map API response to MediaFile interface
      const mappedFiles: MediaFile[] = fetchedFiles.map((file) => {
        // Determine file type from content_type or file extension
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
        const contentType = file.content_type || ''
        
        let fileType: 'image' | 'document' | 'video' | 'other' = 'other'
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension) || contentType.startsWith('image/')) {
          fileType = 'image'
        } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(fileExtension) || contentType.includes('pdf') || contentType.includes('document') || contentType.includes('spreadsheet')) {
          fileType = 'document'
        } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(fileExtension) || contentType.startsWith('video/')) {
          fileType = 'video'
        }

        const isPdf = fileType === 'document' && fileExtension === 'pdf'
        return {
          id: file.uuid,
          name: file.name,
          type: fileType,
          file: null, // We don't have the original File object from API
          preview: fileType === 'image' || fileType === 'video' || isPdf ? file.file : undefined, // Use API URL for images/videos/pdfs
          url: file.file, // Keep API URL for copy/share actions
          folderId: file.folder || currentFolderId || null
        }
      })
      
      console.log('📄 Loaded files from API:', {
        folderId: currentFolderId || 'root',
        fileCount: mappedFiles.length,
        files: mappedFiles.map(f => ({ id: f.id, name: f.name, type: f.type }))
      })
      
      setFiles(mappedFiles)
    } catch (error) {
      // Error is already handled by fetchFiles function (toast message)
      console.error('Failed to load files:', error)
    }
  }, [createdEvent?.uuid, currentFolderId])

  // Load files when currentFolderId changes
  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleCreateFolder = () => {
    // Open the create folder modal
    setShowCreateFolderModal(true)
  }

  const handleFolderCreate = (_folderData: { uuid: string; name: string }) => {
    // Reload all folders and current level folders after creation
    // This ensures allFolders is updated for breadcrumb navigation
    loadAllFolders()
    loadFolders()
    setShowCreateFolderModal(false)
  }

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId)
  }

  const handleFolderContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: 'folder',
      id: folderId
    })
  }

  const handleFileContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: 'file',
      id: fileId
    })
  }

  const handleRenameFolder = (folderId: string, newName: string) => {
    if (newName.trim()) {
      setFolders((prev) =>
        prev.map((folder) =>
          folder.id === folderId ? { ...folder, name: newName.trim() } : folder
        )
      )
    }
    setEditingFolderId(null)
    setEditingFolderName('')
  }

  const handleStartRenameFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId)
    if (folder) {
      setEditingFolderId(folderId)
      setEditingFolderName(folder.name)
      setTimeout(() => {
        folderInputRef.current?.focus()
        folderInputRef.current?.select()
      }, 0)
    }
  }

  const handleCancelRename = () => {
    setEditingFolderId(null)
    setEditingFolderName('')
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent, folderId: string) => {
    if (e.key === 'Enter') {
      handleRenameFolder(folderId, editingFolderName)
    } else if (e.key === 'Escape') {
      handleCancelRename()
    }
  }

  // Helper function to recursively get all nested folder IDs
  const getNestedFolderIds = (parentId: string, allFolders: MediaFolder[]): string[] => {
    const nestedIds: string[] = []
    const directChildren = allFolders.filter((folder) => folder.parentId === parentId)
    
    for (const child of directChildren) {
      nestedIds.push(child.id)
      // Recursively get nested folders
      const deeperNested = getNestedFolderIds(child.id, allFolders)
      nestedIds.push(...deeperNested)
    }
    
    return nestedIds
  }

  const handleDeleteFolder = (folderId: string) => {
    // Get all nested folder IDs (recursively) from allFolders
    const nestedFolderIds = getNestedFolderIds(folderId, allFolders)
    
    // Delete the parent folder and all nested folders from local state
    setAllFolders((prev) => 
      prev.filter((folder) => folder.id !== folderId && !nestedFolderIds.includes(folder.id))
    )
    setFolders((prev) => 
      prev.filter((folder) => folder.id !== folderId && !nestedFolderIds.includes(folder.id))
    )
    
    // Delete all files inside the parent folder and all nested folders
    const allFolderIdsToDelete = [folderId, ...nestedFolderIds]
    setFiles((prev) => 
      prev.filter((file) => !allFolderIdsToDelete.includes(file.folderId || ''))
    )
    
    // If we're currently inside a deleted folder or its nested folder, navigate to root
    if (currentFolderId && (currentFolderId === folderId || nestedFolderIds.includes(currentFolderId))) {
      setCurrentFolderId(null)
    }
    
    // Reload folders from API after deletion (backend should handle cascading deletes)
    loadFolders()
  }

  const handleRenameFile = (fileId: string, newName: string) => {
    if (newName.trim()) {
      setFiles((prev) =>
        prev.map((file) => (file.id === fileId ? { ...file, name: newName.trim() } : file))
      )
    }
    setEditingFileId(null)
    setEditingFileName('')
  }

  const handleStartRenameFile = (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (file) {
      setEditingFileId(fileId)
      setEditingFileName(file.name)
      setTimeout(() => {
        fileRenameInputRef.current?.focus()
        fileRenameInputRef.current?.select()
      }, 0)
    }
  }

  const handleCancelRenameFile = () => {
    setEditingFileId(null)
    setEditingFileName('')
  }

  const handleRenameFileKeyDown = (e: React.KeyboardEvent, fileId: string) => {
    if (e.key === 'Enter') {
      handleRenameFile(fileId, editingFileName)
    } else if (e.key === 'Escape') {
      handleCancelRenameFile()
    }
  }

  const handleMoveFile = (fileId: string, targetFolderId: string | null) => {
    setFiles((prev) =>
      prev.map((file) =>
        file.id === fileId ? { ...file, folderId: targetFolderId } : file
      )
    )
  }

  const handleDuplicateFile = (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (file) {
      const duplicatedFile: MediaFile = {
        ...file,
        id: `file-${Date.now()}-${Math.random()}`,
        name: `${file.name.replace(/\.[^/.]+$/, '')} (copy)${file.name.match(/\.[^/.]+$/)?.[0] || ''}`
      }
      setFiles((prev) => [...prev, duplicatedFile])
    }
  }

  const copyTextToClipboard = async (text: string) => {
    // Prefer Clipboard API, fallback for older browsers.
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }

  const handleCopyFileLink = async (file: MediaFile) => {
    const link = (file.url || file.preview || '').trim()
    if (!link) {
      showToast.error('No file link available to copy.')
      return
    }

    try {
      await copyTextToClipboard(link)
      showToast.success('Link copied')
    } catch (err) {
      console.error('Failed to copy link:', err)
      showToast.error('Failed to copy link. Please try again.')
    }
  }

  const handleDeleteFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const breadcrumbs = useMemo(() => {
    const breadcrumbList: Array<{ id: string | null; name: string }> = [
      { id: null, name: 'All media' }
    ]

    if (!currentFolderId) {
      return breadcrumbList
    }

    // Build complete path by traversing up the folder hierarchy
    const buildPath = (folderId: string | null, path: Array<{ id: string | null; name: string }>): Array<{ id: string | null; name: string }> => {
      if (!folderId) {
        return path
      }

      const folder = allFolders.find((f) => f.id === folderId)
      if (!folder) {
        console.warn('Folder not found in allFolders:', folderId, 'Available folders:', allFolders.map(f => ({ id: f.id, name: f.name, parentId: f.parentId })))
        return path
      }

      // Add current folder to path
      path.push({ id: folder.id, name: folder.name })

      // If folder has a parent, continue traversing up
      if (folder.parentId) {
        return buildPath(folder.parentId, path)
      }

      return path
    }

    // Build the path from current folder up to root
    const pathFromCurrent = buildPath(currentFolderId, [])
    
    console.log('🍞 Building breadcrumbs:', {
      currentFolderId,
      allFoldersCount: allFolders.length,
      pathFromCurrent: pathFromCurrent.map(p => ({ id: p.id, name: p.name }))
    })
    
    // Reverse to get root -> ... -> current folder order
    const reversedPath = pathFromCurrent.reverse()
    
    // Combine root breadcrumb with the path
    return [...breadcrumbList, ...reversedPath]
  }, [currentFolderId, allFolders])

  const handleUploadClick = () => {
    setShowUploadModal(true)
  }

  const handleFileUpload = async (uploadedFiles: File[]) => {
    if (!createdEvent?.uuid) {
      console.error('Event UUID is required to upload files')
      return
    }

    // Upload each file to the API
    for (const file of uploadedFiles) {
      try {
        const response = await uploadFile({
          file: file,
          event_uuid: createdEvent.uuid,
          parent: currentFolderId || undefined, // Use undefined instead of null to omit the field
        })

        // Determine file type from content_type or file extension
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
        const contentType = response.content_type || ''
        
        let fileType: 'image' | 'document' | 'video' | 'other' = 'other'
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension) || contentType.startsWith('image/')) {
          fileType = 'image'
        } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(fileExtension) || contentType.includes('pdf') || contentType.includes('document') || contentType.includes('spreadsheet')) {
          fileType = 'document'
        } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(fileExtension) || contentType.startsWith('video/')) {
          fileType = 'video'
        }
        const isPdf = fileType === 'document' && (fileExtension === 'pdf' || contentType.includes('pdf'))

        // Create MediaFile from API response
        const mediaFile: MediaFile = {
          id: response.uuid,
          name: response.name,
          type: fileType,
          file: file, // Keep original file object for preview
          preview: fileType === 'image' || fileType === 'video' || isPdf ? response.file : undefined, // Use API URL for images/videos/pdfs
          url: response.file,
          folderId: response.folder || currentFolderId || null
        }

        setFiles((prev) => [...prev, mediaFile])
      } catch (error) {
        // Error is already handled by uploadFile function (toast message)
        console.error('Failed to upload file:', file.name, error)
        // Continue with other files even if one fails
      }
    }
    
    // Reload files from API after upload to ensure consistency
    loadFiles()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles) return

    Array.from(selectedFiles).forEach((file) => {
      const fileId = `file-${Date.now()}-${Math.random()}`
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
      
      let fileType: 'image' | 'document' | 'video' | 'other' = 'other'
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension)) {
        fileType = 'image'
      } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(fileExtension)) {
        fileType = 'document'
      } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(fileExtension)) {
        fileType = 'video'
      }
      const isPdf = fileType === 'document' && fileExtension === 'pdf'

      const mediaFile: MediaFile = {
        id: fileId,
        name: file.name,
        type: fileType,
        file: file,
        preview: fileType === 'image' || fileType === 'video' || isPdf ? URL.createObjectURL(file) : undefined,
        folderId: currentFolderId
      }

      setFiles((prev) => [...prev, mediaFile])
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragStart = (fileId: string) => {
    setDraggedFileId(fileId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (folderId: string) => {
    if (draggedFileId) {
      setFiles((prev) =>
        prev.map((file) => {
          if (file.id === draggedFileId) {
            return { ...file, folderId }
          }
          return file
        })
      )
      setDraggedFileId(null)
    }
  }

  // Helper function to get file extension
  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || ''
  }

  // Helper function to check if file is Excel
  const isExcelFile = (file: MediaFile): boolean => {
    const ext = getFileExtension(file.name)
    return ['xls', 'xlsx', 'xlsm', 'xlsb'].includes(ext)
  }

  // Helper function to check if file is Word
  const isWordFile = (file: MediaFile): boolean => {
    const ext = getFileExtension(file.name)
    return ['doc', 'docx', 'docm'].includes(ext)
  }

  // Helper function to check if file is PDF
  const isPdfFile = (file: MediaFile): boolean => {
    const ext = getFileExtension(file.name)
    return ext === 'pdf'
  }

  const getFileIcon = (file: MediaFile) => {
    // Don't show icon for images - they will be rendered as <img>
    if (file.type === 'image') {
      return null
    }
    
    // Excel files - green icon
    if (isExcelFile(file)) {
      const ext = getFileExtension(file.name).toUpperCase() || 'XLS'
      return (
        <div className="relative h-12 w-12 flex-shrink-0 flex items-center justify-center">
          <div className="relative h-10 w-8">
            <div className="absolute left-0 top-0 h-10 w-8 bg-[#079455] rounded-sm" />
            <div className="absolute left-5 top-0.5 h-2.5 w-2.5 bg-white opacity-30 rounded-sm" />
            <div className="absolute left-0.5 top-[18px] w-7 text-center text-[8px] font-bold leading-none text-white" style={{ fontFamily: 'Inter' }}>
              {ext}
            </div>
          </div>
        </div>
      )
    }
    
    // Word files - blue icon
    if (isWordFile(file)) {
      const ext = getFileExtension(file.name).toUpperCase() || 'DOC'
      return (
        <div className="relative h-12 w-12 flex-shrink-0 flex items-center justify-center">
          <div className="relative h-10 w-8">
            <div className="absolute left-0 top-0 h-10 w-8 bg-[#2B579A] rounded-sm" />
            <div className="absolute left-5 top-0.5 h-2.5 w-2.5 bg-white opacity-30 rounded-sm" />
            <div className="absolute left-0.5 top-[18px] w-7 text-center text-[8px] font-bold leading-none text-white" style={{ fontFamily: 'Inter' }}>
              {ext}
            </div>
          </div>
        </div>
      )
    }

    // PDF files - red icon
    if (isPdfFile(file)) {
      return (
        <div className="relative h-12 w-12 flex-shrink-0 flex items-center justify-center">
          <div className="relative h-10 w-8">
            <div className="absolute left-0 top-0 h-10 w-8 bg-[#E11D48] rounded-sm" />
            <div className="absolute left-5 top-0.5 h-2.5 w-2.5 bg-white opacity-30 rounded-sm" />
            <div className="absolute left-0.5 top-[18px] w-7 text-center text-[8px] font-bold leading-none text-white" style={{ fontFamily: 'Inter' }}>
              PDF
            </div>
          </div>
        </div>
      )
    }
    
    // Other documents - generic icon
    if (file.type === 'document') {
      return <File01 className="h-12 w-12 text-slate-400" />
    }
    
    // Video files
    if (file.type === 'video') {
      return <File01 className="h-12 w-12 text-slate-400" />
    }
    
    // Default/other files
    return <File01 className="h-12 w-12 text-slate-400" />
  }

  const getContextMenuOptions = () => {
    if (!contextMenu) return []

    if (contextMenu.type === 'folder') {
      const folder = folders.find((f) => f.id === contextMenu.id)
      if (!folder) return []

      return [
        {
          label: 'Rename',
          action: () => {
            handleStartRenameFolder(folder.id)
          }
        },
        {
          label: 'Delete',
          action: () => {
            setItemToDelete({ id: folder.id, name: folder.name, type: 'folder' })
            setShowDeleteModal(true)
          },
          variant: 'destructive' as const
        }
      ]
    } else {
      const file = files.find((f) => f.id === contextMenu.id)
      if (!file) return []

      return [
        {
          label: 'Rename',
          action: () => {
            handleStartRenameFile(file.id)
          }
        },
        {
          label: 'Copy link',
          action: () => {
            void handleCopyFileLink(file)
          }
        },
        {
          label: 'Move to folder',
          action: () => {
            setFileToMove(file)
            setShowMoveModal(true)
          }
        },
        {
          label: 'Duplicate',
          action: () => handleDuplicateFile(file.id)
        },
        {
          label: 'Share/Gallery shortcut',
          action: () => {
            setFileForShortcut(file)
            setShowGalleryShortcutModal(true)
          }
        },
        {
          label: 'Restrict access',
          action: () => {
            setItemForRestriction({ id: file.id, name: file.name, type: 'file' })
            setShowRestrictAccessModal(true)
          }
        },
        {
          label: 'Delete',
          action: () => {
            setItemToDelete({ id: file.id, name: file.name, type: 'file' })
            setShowDeleteModal(true)
          },
          variant: 'destructive' as const
        }
      ]
    }
  }

  const filteredFolders = useMemo(() => {
    // Handle null comparison: if currentFolderId is null, show folders with parentId === null
    // If currentFolderId has a value, show folders with parentId === currentFolderId
    let filtered = folders.filter((folder) => {
      if (currentFolderId === null) {
        return folder.parentId === null || folder.parentId === undefined
      }
      // String comparison for UUIDs
      return String(folder.parentId) === String(currentFolderId)
    })
    
    if (searchQuery) {
      filtered = filtered.filter((folder) =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    console.log('🔍 Filtered folders:', {
      currentFolderId,
      totalFolders: folders.length,
      filteredCount: filtered.length,
      filtered: filtered.map(f => ({ id: f.id, name: f.name, parentId: f.parentId }))
    })
    
    return filtered
  }, [folders, currentFolderId, searchQuery])

  const filteredFiles = useMemo(() => {
    let filtered = files.filter((file) => file.folderId === currentFolderId)
    if (activeTab !== 'all') {
      filtered = filtered.filter((file) => file.type === activeTab)
    }
    if (searchQuery) {
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return filtered
  }, [files, currentFolderId, activeTab, searchQuery])

  const handleFilterClick = () => {
    // TODO: Implement filter functionality
    console.log('Filter clicked')
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {!hideNavbarAndSidebar && (
        <>
          {/* Navbar */}
          <EventHubNavbar
            eventName={eventName}
            isDraft={isDraft}
            onBackClick={onBackClick}
            onSearchClick={handleSearchClick}
            onNotificationClick={handleNotificationClick}
            onProfileClick={handleProfileClick}
            userAvatarUrl={userAvatarUrl}
          />

          {/* Sidebar */}
          <EventHubSidebar
            items={sidebarItems}
            activeItemId="resource-management"
            onItemClick={handleSidebarItemClick}
          />
        </>
      )}

      {/* Main Content */}
      <div className={hideNavbarAndSidebar ? "" : "md:pl-[250px]"}>
        <div className="space-y-6 px-4 pb-12 pt-8 md:px-10 lg:px-16">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <h1 className="text-[26px] font-bold text-primary-dark">Resource management</h1>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleUploadClick}
                iconLeading={<Upload01 className="h-4 w-4" />}
              >
                Upload
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateFolder}
                iconLeading={<Plus className="h-4 w-4" />}
              >
                New folder
              </Button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,video/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Tab, Search and Filter - Outside Border */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 mb-0">
            {/* Tab */}
            <div className="flex items-end -mb-16">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`text-sm font-medium transition-colors pb-2 ${
                  activeTab === 'all'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-slate-600 hover:text-primary'
                }`}
              >
                All media
              </button>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search Input with Button */}
              <div className="flex flex-1 sm:flex-none items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resources"
                  className="px-3 py-2 text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none w-full sm:w-[300px] border-0"
                />
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center bg-primary text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 flex-shrink-0 rounded-none"
                  aria-label="Search"
                >
                  <SearchLg className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              {/* Filter Button */}
              <button
                type="button"
                onClick={handleFilterClick}
                className="inline-flex shrink-0 h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Filter resources"
              >
                <FilterLines className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Content Area with Border */}
          <div className="border border-slate-200 rounded-lg bg-white min-h-[400px]">
            
            {/* Breadcrumbs - only when inside a folder (hide "All media" in content area at root) */}
            {currentFolderId && (
              <div className="px-4 md:px-8 pt-4 pb-2">
                <div className="flex items-center gap-2 text-sm">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.id || 'root'}>
                      {index > 0 && <ChevronRight className="h-4 w-4 text-slate-400" />}
                      <button
                        type="button"
                        onClick={() => setCurrentFolderId(crumb.id)}
                        className={`${
                          index === breadcrumbs.length - 1
                            ? 'text-slate-900 font-medium'
                            : 'text-slate-600 hover:text-primary'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
            
            {/* Content */}
            <div className="p-4 md:p-8">
              {/* Folders */}
              {filteredFolders.length > 0 && (
                <div className="flex flex-wrap gap-4 mb-6">
                  {filteredFolders.map((folder) => (
                    <div
                      key={folder.id}
                      ref={(el) => (folderCardRefs.current[folder.id] = el)}
                      className="group relative inline-flex flex-col items-center gap-2 p-3 hover:bg-primary/10 bg-white  hover:shadow-md transition-all "
                      onContextMenu={(e) => handleFolderContextMenu(e, folder.id)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(folder.id)}
                    >
                      <div 
                        className="w-10 h-10 flex items-center justify-center cursor-pointer"
                        onClick={() => {
                          if (editingFolderId !== folder.id) {
                            handleFolderClick(folder.id)
                          }
                        }}
                      >
                        <Folder className="h-8 w-8 text-primary" />
                      </div>
                      {editingFolderId === folder.id ? (
                        <input
                          ref={folderInputRef}
                          type="text"
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          onBlur={() => handleRenameFolder(folder.id, editingFolderName)}
                          onKeyDown={(e) => handleRenameKeyDown(e, folder.id)}
                          className="text-sm font-medium text-slate-700 text-center max-w-[80px] px-1 py-0.5  focus:outline-none focus:ring-1 focus:ring-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span 
                          className="text-sm font-medium text-slate-700 text-center max-w-[100px] line-clamp-2 cursor-pointer"
                          onClick={() => {
                            if (editingFolderId !== folder.id) {
                              handleFolderClick(folder.id)
                            }
                          }}
                        >
                          {folder.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Files */}
              {filteredFiles.length > 0 && (
                <div className="grid grid-cols-2  sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      ref={(el) => (fileCardRefs.current[file.id] = el)}
                      draggable
                      onDragStart={() => handleDragStart(file.id)}
                      className="group relative flex w-32 cursor-move flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-2 hover:shadow-md transition-all"
                      onContextMenu={(e) => handleFileContextMenu(e, file.id)}
                    >
                      <div className="relative flex h-24 w-full flex-col items-end justify-between rounded-lg overflow-hidden bg-slate-50 flex-shrink-0">
                        {file.type === 'image' && file.preview ? (
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => {
                              // If image fails to load, hide img and show icon instead
                              const target = e.currentTarget
                              target.style.display = 'none'
                              const iconContainer = target.parentElement?.querySelector('.file-icon-fallback') as HTMLElement
                              if (iconContainer) {
                                iconContainer.style.display = 'flex'
                              }
                            }}
                          />
                        ) : null}
                        {file.type === 'video' && (file.preview || file.url) ? (
                          <video
                            src={file.preview || file.url}
                            className="absolute inset-0 h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                            onError={(e) => {
                              const target = e.currentTarget
                              target.style.display = 'none'
                              const iconContainer = target.parentElement?.querySelector('.file-icon-fallback') as HTMLElement
                              if (iconContainer) {
                                iconContainer.style.display = 'flex'
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`absolute inset-0 flex items-center justify-center file-icon-fallback ${
                            (file.type === 'image' && file.preview) ||
                            (file.type === 'video' && (file.preview || file.url))
                              ? 'hidden'
                              : ''
                          }`}
                        >
                          {getFileIcon(file)}
                        </div>
                        <button
                          type="button"
                          className="relative z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-slate-300 p-0 transition-all opacity-0 group-hover:opacity-100 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleFileContextMenu(e, file.id)
                          }}
                          aria-label="More options"
                        >
                          <DotsVertical className="h-4 w-4 text-slate-600" />
                        </button>
                      </div>
                      {editingFileId === file.id ? (
                        <input
                          ref={fileRenameInputRef}
                          type="text"
                          value={editingFileName}
                          onChange={(e) => setEditingFileName(e.target.value)}
                          onBlur={() => handleRenameFile(file.id, editingFileName)}
                          onKeyDown={(e) => handleRenameFileKeyDown(e, file.id)}
                          className="w-full text-xs font-medium text-slate-700 text-center px-1 py-0.5 rounded border border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="w-full break-words text-center text-xs font-medium text-slate-700 line-clamp-2 min-h-[2rem] flex items-center justify-center">
                          {file.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                <div className="flex min-h-[400px] items-center justify-center text-center">
                  <div className="space-y-4">
                    <Folder className="h-16 w-16 text-slate-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-slate-600">No files found</p>
                      <p className="text-sm text-slate-500 mt-1">
                        {searchQuery
                          ? 'Try adjusting your search terms'
                          : 'Upload media files or create folders to get started'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Context Menu */}
          {contextMenu && (
            <ResourceContextMenu
              isOpen={contextMenu.isOpen}
              onClose={() => setContextMenu(null)}
              options={getContextMenuOptions()}
              position={{ x: contextMenu.x, y: contextMenu.y }}
            />
          )}

          {/* Move to Folder Modal */}
          <MoveToFolderModal
            isVisible={showMoveModal}
            onClose={() => {
              setShowMoveModal(false)
              setFileToMove(null)
            }}
            onMove={(folderId) => {
              if (fileToMove) {
                handleMoveFile(fileToMove.id, folderId)
                setFileToMove(null)
              }
            }}
            folders={folders}
            currentFolderId={fileToMove?.folderId || undefined}
            fileName={fileToMove?.name || ''}
          />

          {/* Delete Confirmation Modal */}
          <DeleteConfirmationModal
            isVisible={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false)
              setItemToDelete(null)
            }}
            onConfirm={() => {
              if (itemToDelete) {
                if (itemToDelete.type === 'folder') {
                  // For folders, the API call is handled in the modal
                  // Just update the local state after successful deletion
                  handleDeleteFolder(itemToDelete.id)
                } else {
                  // For files, the API call is handled in the modal
                  // Just update the local state after successful deletion
                  handleDeleteFile(itemToDelete.id)
                  // Reload files from API to ensure consistency
                  loadFiles()
                }
              }
            }}
            itemName={itemToDelete?.name || ''}
            itemType={itemToDelete?.type || 'file'}
            itemId={itemToDelete?.id}
          />

          {/* Gallery/Shortcut Modal */}
          <GalleryShortcutModal
            isVisible={showGalleryShortcutModal}
            onClose={() => {
              setShowGalleryShortcutModal(false)
              setFileForShortcut(null)
            }}
            onSave={(shortcutName, displayType) => {
              // TODO: Implement save shortcut functionality
              console.log('Save shortcut:', { shortcutName, displayType, file: fileForShortcut?.name })
            }}
            fileName={fileForShortcut?.name}
          />

          {/* Restrict Access Modal */}
          <RestrictAccessModal
            isVisible={showRestrictAccessModal}
            onClose={() => {
              setShowRestrictAccessModal(false)
              setItemForRestriction(null)
            }}
            onSave={(visibility, groups, applyToSubFolders) => {
              // TODO: Implement restrict access functionality
              console.log('Restrict access:', { visibility, groups, applyToSubFolders, item: itemForRestriction })
            }}
            itemName={itemForRestriction?.name}
            itemType={itemForRestriction?.type || 'folder'}
          />

          {/* Create Folder Modal */}
          <CreateFolderModal
            isVisible={showCreateFolderModal}
            onClose={() => setShowCreateFolderModal(false)}
            onCreate={handleFolderCreate}
            parentFolderId={currentFolderId}
          />

          {/* Upload Modal */}
          <UploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onUpload={handleFileUpload}
            title="Upload and attach files"
            description="Upload and attach files to this project."
            uploadText="Click to upload or drag and drop"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,video/*"
            multiple={true}
            showTemplate={false}
            buttonText="Attach files"
            cancelButtonText="Cancel"
            instructions={['SVG, PNG, JPG or GIF (max. 800×400px)']}
          />
        </div>
      </div>
    </div>
  )
}

export default ResourceManagementPage

