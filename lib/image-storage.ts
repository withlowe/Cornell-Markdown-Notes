/**
 * Image storage utility using IndexedDB
 * This provides a "folder-like" storage for images separate from the note content
 */

// Define the database structure
interface ImageRecord {
  id: string
  data: string // Base64/data URL of the image
  fileName?: string
  mimeType?: string
  createdAt: number
}

// Database name and version
const DB_NAME = "cornell-notes-images"
const DB_VERSION = 1
const STORE_NAME = "images"

// Open the database connection
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = (event) => {
      console.error("Error opening IndexedDB:", event)
      reject(new Error("Could not open image database"))
    }

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create the image store with an index on createdAt
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
        store.createIndex("createdAt", "createdAt", { unique: false })
      }
    }
  })
}

// Generate a unique ID for an image
function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Extract MIME type from a data URL
function getMimeTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/)
  return match ? match[1] : "image/jpeg" // Default to JPEG if not found
}

// Store an image and return its ID
export async function storeImage(imageData: string, fileName?: string): Promise<string> {
  try {
    // Validate that imageData is a data URL
    if (!imageData.startsWith("data:")) {
      throw new Error("Image data must be a data URL")
    }

    const db = await openDB()
    const id = generateImageId()
    const mimeType = getMimeTypeFromDataUrl(imageData)

    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    const imageRecord: ImageRecord = {
      id,
      data: imageData,
      fileName,
      mimeType,
      createdAt: Date.now(),
    }

    return new Promise((resolve, reject) => {
      const request = store.add(imageRecord)

      request.onsuccess = () => {
        console.log(`Image stored with ID: ${id}`)
        resolve(id)
      }

      request.onerror = (event) => {
        console.error("Error storing image:", event)
        reject(new Error("Failed to store image"))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error("Error in storeImage:", error)
    throw error
  }
}

// Retrieve an image by its ID
export async function getImage(id: string): Promise<string | null> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readonly")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(id)

      request.onsuccess = () => {
        const record = request.result as ImageRecord | undefined
        db.close()

        if (record) {
          resolve(record.data)
        } else {
          console.warn(`Image with ID ${id} not found`)
          resolve(null)
        }
      }

      request.onerror = (event) => {
        console.error("Error retrieving image:", event)
        db.close()
        reject(new Error("Failed to retrieve image"))
      }
    })
  } catch (error) {
    console.error("Error in getImage:", error)
    return null
  }
}

// Delete an image by its ID
export async function deleteImage(id: string): Promise<boolean> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log(`Image ${id} deleted`)
        resolve(true)
      }

      request.onerror = (event) => {
        console.error("Error deleting image:", event)
        reject(new Error("Failed to delete image"))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error("Error in deleteImage:", error)
    return false
  }
}

// Delete unused images (not referenced in any notes)
export async function cleanupUnusedImages(usedImageIds: string[]): Promise<number> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    // Get all image IDs
    const allImageIds: string[] = await new Promise((resolve, reject) => {
      const request = store.getAllKeys()

      request.onsuccess = () => {
        resolve(request.result as string[])
      }

      request.onerror = () => {
        reject(new Error("Failed to get image keys"))
      }
    })

    // Find unused images
    const unusedImageIds = allImageIds.filter((id) => !usedImageIds.includes(id))

    // Delete each unused image
    let deletedCount = 0
    for (const id of unusedImageIds) {
      try {
        await new Promise<void>((resolve, reject) => {
          const deleteRequest = store.delete(id)

          deleteRequest.onsuccess = () => {
            deletedCount++
            resolve()
          }

          deleteRequest.onerror = () => {
            reject(new Error(`Failed to delete image ${id}`))
          }
        })
      } catch (error) {
        console.error(`Error deleting image ${id}:`, error)
      }
    }

    transaction.oncomplete = () => {
      db.close()
    }

    return deletedCount
  } catch (error) {
    console.error("Error in cleanupUnusedImages:", error)
    return 0
  }
}

// Get all images (for export/backup)
export async function getAllImages(): Promise<Record<string, string>> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readonly")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.getAll()

      request.onsuccess = () => {
        const records = request.result as ImageRecord[]
        const result: Record<string, string> = {}

        records.forEach((record) => {
          result[record.id] = record.data
        })

        db.close()
        resolve(result)
      }

      request.onerror = (event) => {
        console.error("Error retrieving all images:", event)
        db.close()
        reject(new Error("Failed to retrieve all images"))
      }
    })
  } catch (error) {
    console.error("Error in getAllImages:", error)
    return {}
  }
}

// Import images (for restore/import)
export async function importImages(images: Record<string, string>): Promise<number> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    let importedCount = 0

    for (const [id, data] of Object.entries(images)) {
      try {
        const mimeType = getMimeTypeFromDataUrl(data)

        const imageRecord: ImageRecord = {
          id,
          data,
          mimeType,
          createdAt: Date.now(),
        }

        await new Promise<void>((resolve, reject) => {
          const request = store.put(imageRecord)

          request.onsuccess = () => {
            importedCount++
            resolve()
          }

          request.onerror = (event) => {
            console.error(`Error importing image ${id}:`, event)
            reject(new Error(`Failed to import image ${id}`))
          }
        })
      } catch (error) {
        console.error(`Error processing image ${id}:`, error)
      }
    }

    transaction.oncomplete = () => {
      db.close()
    }

    return importedCount
  } catch (error) {
    console.error("Error in importImages:", error)
    return 0
  }
}
