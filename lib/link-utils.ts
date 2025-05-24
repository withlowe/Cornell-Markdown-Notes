import { getAllDocuments, type DocumentData } from "./storage-utils"

// Export DocumentData type for other components to use
export type { DocumentData }

// Extract all note links from content
export function extractNoteLinks(content: string): string[] {
  // Match [[Note Title]] pattern
  const linkRegex = /\[\[([^\]]+)\]\]/g
  const links: string[] = []
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[1].trim())
  }

  return [...new Set(links)] // Remove duplicates
}

// Find documents that link to a specific document
export function findBacklinks(targetTitle: string): DocumentData[] {
  const allDocs = getAllDocuments()
  const backlinks: DocumentData[] = []

  allDocs.forEach((doc) => {
    const links = extractNoteLinks(doc.content)
    if (links.some((link) => link.toLowerCase() === targetTitle.toLowerCase())) {
      backlinks.push(doc)
    }
  })

  return backlinks
}

// Find documents that are linked from a specific document
export function findForwardLinks(content: string): DocumentData[] {
  const allDocs = getAllDocuments()
  const links = extractNoteLinks(content)
  const linkedDocs: DocumentData[] = []

  links.forEach((linkTitle) => {
    const doc = allDocs.find((d) => d.title.toLowerCase() === linkTitle.toLowerCase())
    if (doc) {
      linkedDocs.push(doc)
    }
  })

  return linkedDocs
}

// Get all related documents (both forward and backward links)
export function getRelatedDocuments(document: DocumentData): {
  forwardLinks: DocumentData[]
  backlinks: DocumentData[]
} {
  const forwardLinks = findForwardLinks(document.content)
  const backlinks = findBacklinks(document.title)

  return {
    forwardLinks,
    backlinks: backlinks.filter((doc) => doc.id !== document.id), // Exclude self
  }
}

// Convert note links in content to clickable links
export function processNoteLinks(content: string, onLinkClick: (title: string) => void): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
    const trimmedTitle = title.trim()
    return `<span class="note-link" data-title="${trimmedTitle}">${trimmedTitle}</span>`
  })
}

// Check if a note title exists
export function noteExists(title: string): boolean {
  const allDocs = getAllDocuments()
  return allDocs.some((doc) => doc.title.toLowerCase() === title.toLowerCase())
}

// Get suggestions for note links based on existing titles
export function getNoteLinkSuggestions(query: string): string[] {
  const allDocs = getAllDocuments()
  const suggestions = allDocs
    .filter((doc) => doc.title.toLowerCase().includes(query.toLowerCase()))
    .map((doc) => doc.title)
    .slice(0, 5) // Limit to 5 suggestions

  return suggestions
}
