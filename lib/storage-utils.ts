import { getAllImages, cleanupUnusedImages } from "./image-storage"

export interface DocumentData {
  id: string
  title: string
  summary?: string
  content: string
  tags: string[]
  createdAt: string
}

// Extract all image IDs from content
function extractImageIds(content: string): string[] {
  const imageIds: string[] = []
  const regex = /cornell-image:\/\/(.*?)["']/g
  let match

  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      imageIds.push(match[1])
    }
  }

  return imageIds
}

// Get all documents from localStorage
export function getAllDocuments(): DocumentData[] {
  if (typeof window === "undefined") return []

  try {
    const docs = localStorage.getItem("cornell-notes-docs")
    return docs ? JSON.parse(docs) : []
  } catch (error) {
    console.error("Error loading documents:", error)
    return []
  }
}

// Get a single document by ID
export function getDocument(id: string): DocumentData | null {
  const docs = getAllDocuments()
  return docs.find((doc) => doc.id === id) || null
}

// Save a document (create or update)
export async function saveDocument(doc: Omit<DocumentData, "id"> & { id?: string }): Promise<string> {
  const docs = getAllDocuments()

  // If id is provided, update existing document
  if (doc.id) {
    const index = docs.findIndex((d) => d.id === doc.id)
    if (index !== -1) {
      docs[index] = { ...doc, id: doc.id } as DocumentData
    } else {
      // If id not found, create new with provided id
      docs.push({ ...doc, id: doc.id } as DocumentData)
    }
    localStorage.setItem("cornell-notes-docs", JSON.stringify(docs))
    return doc.id
  }

  // Create new document with generated id
  const newId = Date.now().toString()
  const newDoc = { ...doc, id: newId } as DocumentData
  docs.push(newDoc)
  localStorage.setItem("cornell-notes-docs", JSON.stringify(docs))
  return newId
}

// Delete a document by ID
export function deleteDocument(id: string): boolean {
  const docs = getAllDocuments()
  const filteredDocs = docs.filter((doc) => doc.id !== id)

  if (filteredDocs.length !== docs.length) {
    localStorage.setItem("cornell-notes-docs", JSON.stringify(filteredDocs))
    return true
  }

  return false
}

// Clean up unused images
export async function cleanupImages(): Promise<number> {
  try {
    // Get all documents
    const docs = getAllDocuments()

    // Extract all image IDs from all documents
    const usedImageIds: string[] = []
    docs.forEach((doc) => {
      const ids = extractImageIds(doc.content)
      usedImageIds.push(...ids)
    })

    // Remove duplicates
    const uniqueImageIds = [...new Set(usedImageIds)]

    // Clean up unused images
    const deletedCount = await cleanupUnusedImages(uniqueImageIds)

    return deletedCount
  } catch (error) {
    console.error("Error cleaning up images:", error)
    return 0
  }
}

// Export all documents and images
export async function exportAllData(): Promise<string> {
  try {
    const docs = getAllDocuments()
    const images = await getAllImages()

    const exportData = {
      documents: docs,
      images,
    }

    return JSON.stringify(exportData)
  } catch (error) {
    console.error("Error exporting data:", error)
    throw new Error("Failed to export data")
  }
}
