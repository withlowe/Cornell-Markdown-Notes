export interface DocumentData {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
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
export function saveDocument(doc: Omit<DocumentData, "id"> & { id?: string }): string {
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
