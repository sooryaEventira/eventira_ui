import { API_ENDPOINTS } from '../config/env'
import { showToast } from '../utils/toast'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'

export interface CreateFolderRequest {
  name: string
  event_uuid: string
  parent?: string // Optional parent folder UUID for nested folders
}

export interface CreateFolderResponse {
  uuid: string
  name: string
  event_uuid: string
  [key: string]: any
}

export interface FolderData {
  uuid: string
  name: string
  event_uuid: string
  parent?: string | null
  created_at?: string
  updated_at?: string
  [key: string]: any
}

export interface UploadFileRequest {
  file: File
  event_uuid: string
  parent?: string | null // Optional parent folder UUID
}

export interface UploadFileResponse {
  uuid: string
  folder: string | null
  file: string // File URL
  name: string
  size: number
  content_type: string
  created_date: string
  [key: string]: any
}

export interface FileData {
  uuid: string
  folder: string | null
  file: string // File URL
  name: string
  size: number
  content_type: string
  created_date: string
  [key: string]: any
}

export const createFolder = async (request: CreateFolderRequest): Promise<CreateFolderResponse> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please log in again.', undefined, 'Authentication required. Please log in again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is required. Please set up your organization first.', undefined, 'Organization UUID is required. Please set up your organization first.')
      throw new Error(errorMessage)
    }

    const requestBody: { name: string; event_uuid: string; parent?: string } = {
      name: request.name,
      event_uuid: request.event_uuid,
    }
    
    if (request.parent) {
      requestBody.parent = request.parent
    }
    
    const response = await fetch(API_ENDPOINTS.RESOURCE.CREATE_FOLDER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    
    if (!response.ok) {
      let errorData: any = null
      
      try {
        errorData = JSON.parse(responseText)
      } catch {
        // If parsing fails, handle as text error
      }
      
      const errorMessage = handleApiError(errorData || responseText, response, 'An error occurred. Please try again.')
      throw new Error(errorMessage)
    }

    let responseData: any
    try {
      responseData = JSON.parse(responseText)
    } catch {
      const errorMessage = handleParseError('Invalid response format from server. Please try again.')
      throw new Error(errorMessage)
    }

    let folderData: any
    if (responseData.status === 'success' && responseData.data) {
      folderData = responseData.data
    } else if (responseData.uuid) {
      folderData = responseData
    } else {
      const errorMessage = handleParseError('Invalid response format from server. Please try again.')
      throw new Error(errorMessage)
    }
    
    return folderData
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Failed to')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.'
    handleApiError(errorMessage, undefined, 'An error occurred. Please try again.')
    throw new Error(errorMessage)
  }
}

export const deleteFolder = async (folderUuid: string, eventUuid: string): Promise<void> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please log in again.', undefined, 'Authentication required. Please log in again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is required. Please set up your organization first.', undefined, 'Organization UUID is required. Please set up your organization first.')
      throw new Error(errorMessage)
    }

    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required to delete folder.', undefined, 'Event UUID is required to delete folder.')
      throw new Error(errorMessage)
    }

    const url = new URL(API_ENDPOINTS.RESOURCE.DELETE_FOLDER(folderUuid))
    url.searchParams.append('event_uuid', eventUuid)

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
    })

    if (!response.ok) {
      const responseText = await response.text()
      let errorData: any = null
      
      try {
        errorData = JSON.parse(responseText)
      } catch {
        // If parsing fails, handle as text error
      }
      
      const errorMessage = handleApiError(errorData || responseText, response, 'Failed to delete folder. Please try again.')
      throw new Error(errorMessage)
    }

    showToast.success('Folder deleted successfully')
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Event UUID') ||
        error.message.includes('Failed to')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete folder. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to delete folder. Please try again.')
    throw new Error(errorMessage)
  }
}

export const fetchFolders = async (eventUuid: string, parentFolderId?: string | null): Promise<FolderData[]> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please log in again.', undefined, 'Authentication required. Please log in again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is required. Please set up your organization first.', undefined, 'Organization UUID is required. Please set up your organization first.')
      throw new Error(errorMessage)
    }

    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required to fetch folders.', undefined, 'Event UUID is required to fetch folders.')
      throw new Error(errorMessage)
    }

    const response = await fetch(API_ENDPOINTS.RESOURCE.LIST_FOLDERS(eventUuid, parentFolderId), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
    })

    if (!response.ok) {
      const responseText = await response.text()
      let errorData: any = null
      
      try {
        errorData = JSON.parse(responseText)
      } catch {
        // If parsing fails, handle as text error
      }
      
      const errorMessage = handleApiError(errorData || responseText, response, 'An error occurred. Please try again.')
      throw new Error(errorMessage)
    }

    const responseText = await response.text()
    let responseData: any
    
    try {
      responseData = JSON.parse(responseText)
    } catch {
      const errorMessage = handleParseError('Invalid response format from server. Please try again.')
      throw new Error(errorMessage)
    }

    let folders: FolderData[]
    if (responseData.status === 'success' && responseData.data && Array.isArray(responseData.data)) {
      folders = responseData.data
    } else if (Array.isArray(responseData)) {
      folders = responseData
    } else if (responseData.results && Array.isArray(responseData.results)) {
      folders = responseData.results
    } else {
      return []
    }

    return folders
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Event UUID') ||
        error.message.includes('Failed to')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch folders. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to fetch folders. Please try again.')
    throw new Error(errorMessage)
  }
}

export const fetchAllFolders = async (eventUuid: string): Promise<FolderData[]> => {
  try {
    const allFolders: FolderData[] = []
    const rootFolders = await fetchFolders(eventUuid, null)
    allFolders.push(...rootFolders)
    
    const fetchNestedFolders = async (parentId: string) => {
      const nestedFolders = await fetchFolders(eventUuid, parentId)
      allFolders.push(...nestedFolders)
      
      for (const folder of nestedFolders) {
        await fetchNestedFolders(folder.uuid)
      }
    }
    
    for (const rootFolder of rootFolders) {
      await fetchNestedFolders(rootFolder.uuid)
    }
    
    return allFolders
  } catch (error) {
    throw error
  }
}

export const uploadFile = async (request: UploadFileRequest): Promise<UploadFileResponse> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please log in again.', undefined, 'Authentication required. Please log in again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is required. Please set up your organization first.', undefined, 'Organization UUID is required. Please set up your organization first.')
      throw new Error(errorMessage)
    }

    if (!request.event_uuid) {
      const errorMessage = handleApiError('Event UUID is required to upload file.', undefined, 'Event UUID is required to upload file.')
      throw new Error(errorMessage)
    }

    const formData = new FormData()
    formData.append('file', request.file)
    formData.append('event_uuid', request.event_uuid)
    
    if (request.parent !== null && request.parent !== undefined && request.parent !== '') {
      formData.append('folder', request.parent)
    }

    const response = await fetch(API_ENDPOINTS.RESOURCE.UPLOAD_FILE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      body: formData,
    })

    if (!response.ok) {
      const responseText = await response.text()
      let errorData: any = null
      
      try {
        errorData = JSON.parse(responseText)
      } catch {
        // If parsing fails, handle as text error
      }
      
      const errorMessage = handleApiError(errorData || responseText, response, 'Failed to upload file. Please try again.')
      throw new Error(errorMessage)
    }

    const responseText = await response.text()
    let responseData: any
    
    try {
      responseData = JSON.parse(responseText)
    } catch {
      const errorMessage = handleParseError('Invalid response format from server. Please try again.')
      throw new Error(errorMessage)
    }

    let fileData: UploadFileResponse
    if (responseData.status === 'success' && responseData.data) {
      fileData = responseData.data
    } else if (responseData.uuid) {
      fileData = responseData
    } else {
      const errorMessage = handleParseError('Invalid response format from server. Please try again.')
      throw new Error(errorMessage)
    }

    return fileData
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Event UUID') ||
        error.message.includes('Failed to')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to upload file. Please try again.')
    throw new Error(errorMessage)
  }
}

/**
 * Fetch files from a folder
 */
export const fetchFiles = async (folderId?: string | null): Promise<FileData[]> => {
  try {
    // Get access token from localStorage
    const accessToken = localStorage.getItem('accessToken')
    
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please log in again.', undefined, 'Authentication required. Please log in again.')
      throw new Error(errorMessage)
    }

    // Get organization UUID from localStorage
    const organizationUuid = localStorage.getItem('organizationUuid')
    
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is required. Please set up your organization first.', undefined, 'Organization UUID is required. Please set up your organization first.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.RESOURCE.LIST_FILES(folderId)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const responseText = await response.text()
      let errorData: any = null
      
      try {
        errorData = JSON.parse(responseText)
      } catch {
        // If parsing fails, handle as text error
      }
      
      const errorMessage = handleApiError(errorData || responseText, response, 'Failed to fetch files. Please try again.')
      throw new Error(errorMessage)
    }

    const responseText = await response.text()
    let responseData: any
    
    try {
      responseData = JSON.parse(responseText)
    } catch {
      const errorMessage = handleParseError('Invalid response format from server. Please try again.')
      throw new Error(errorMessage)
    }

    let files: FileData[]
    if (responseData.status === 'success' && Array.isArray(responseData.data)) {
      files = responseData.data
    } else if (Array.isArray(responseData)) {
      files = responseData
    } else {
      const errorMessage = handleParseError('Invalid response format from server. Please try again.')
      throw new Error(errorMessage)
    }

    return files
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.startsWith('Cannot connect') || 
        error.message.startsWith('Server error') ||
        error.message.startsWith('Invalid response') ||
        error.message.startsWith('Authentication required') ||
        error.message.startsWith('Organization UUID')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch files. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to fetch files. Please try again.')
    throw new Error(errorMessage)
  }
}

/**
 * Delete a file in resource management
 */
export const deleteFile = async (fileUuid: string, eventUuid: string): Promise<void> => {
  try {
    // Get access token from localStorage
    const accessToken = localStorage.getItem('accessToken')
    
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please log in again.', undefined, 'Authentication required. Please log in again.')
      throw new Error(errorMessage)
    }

    // Get organization UUID from localStorage
    const organizationUuid = localStorage.getItem('organizationUuid')
    
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is required. Please set up your organization first.', undefined, 'Organization UUID is required. Please set up your organization first.')
      throw new Error(errorMessage)
    }

    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required to delete file.', undefined, 'Event UUID is required to delete file.')
      throw new Error(errorMessage)
    }

    // Add event_uuid as query parameter
    const url = new URL(API_ENDPOINTS.RESOURCE.DELETE_FILE(fileUuid))
    url.searchParams.append('event_uuid', eventUuid)

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
    })

    if (!response.ok) {
      const responseText = await response.text()
      let errorData: any = null
      
      try {
        errorData = JSON.parse(responseText)
      } catch {
        // If parsing fails, handle as text error
      }
      
      const errorMessage = handleApiError(errorData || responseText, response, 'An error occurred. Please try again.')
      throw new Error(errorMessage)
    }

    showToast.success('File deleted successfully')
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.startsWith('Cannot connect') || 
        error.message.startsWith('Server error') ||
        error.message.startsWith('Authentication required') ||
        error.message.startsWith('Organization UUID') ||
        error.message.startsWith('Event UUID')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete file. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to delete file. Please try again.')
    throw new Error(errorMessage)
  }
}
