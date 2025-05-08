import JSZip from "jszip"
import { getAllDocuments, saveDocument } from "./storage-utils"

// Helper function to download a blob
function downloadBlob(blob: Blob, filename: string) {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob)

  // Create a temporary link element
  const link = document.createElement("a")
  link.href = url
  link.download = filename

  // Append to the document, click it, and remove it
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Release the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

// Export all notes as markdown files in a zip
export async function exportAllToZip(): Promise<void> {
  const documents = getAllDocuments()

  if (documents.length === 0) {
    throw new Error("No documents to export")
  }

  const zip = new JSZip()

  // Create a folder for the notes
  const notesFolder = zip.folder("notes")

  // Add each document as a markdown file
  documents.forEach((doc) => {
    // Create a safe filename
    const filename = `${doc.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${doc.id.substring(0, 8)}.md`

    // Create markdown content
    let content = `# ${doc.title}\n\n`

    // Add summary if it exists
    if (doc.summary) {
      content += `> ${doc.summary}\n\n`
    }

    // Add tags if they exist
    if (doc.tags && doc.tags.length > 0) {
      content += `Tags: ${doc.tags.join(", ")}\n\n`
    }

    // Add creation date
    content += `Created: ${new Date(doc.createdAt).toLocaleDateString()}\n\n`

    // Add separator
    content += `---\n\n`

    // Add the main content
    content += doc.content

    // Add to zip
    notesFolder?.file(filename, content)
  })

  // Generate the zip file
  const zipBlob = await zip.generateAsync({ type: "blob" })

  // Download the zip file
  downloadBlob(zipBlob, "notes-export.zip")
}

// Import markdown files
export async function importMarkdownFiles(files: FileList): Promise<number> {
  let importedCount = 0

  const importPromises = Array.from(files).map(async (file) => {
    // Only process markdown files
    if (!file.name.endsWith(".md")) return

    try {
      const content = await file.text()

      // Extract title from the first heading or use filename
      let title = file.name.replace(/\.md$/, "")
      const titleMatch = content.match(/^# (.+)$/m)
      if (titleMatch) {
        title = titleMatch[1]
      }

      // Extract summary (optional)
      let summary = ""
      const summaryMatch = content.match(/^> (.+)$/m)
      if (summaryMatch) {
        summary = summaryMatch[1]
      }

      // Extract tags (optional)
      let tags: string[] = []
      const tagsMatch = content.match(/^Tags: (.+)$/m)
      if (tagsMatch) {
        tags = tagsMatch[1].split(",").map((tag) => tag.trim())
      }

      // Remove metadata from content
      const cleanContent = content
        .replace(/^# .+$/m, "") // Remove title
        .replace(/^> .+$/m, "") // Remove summary
        .replace(/^Tags: .+$/m, "") // Remove tags
        .replace(/^Created: .+$/m, "") // Remove created date
        .replace(/^---$/m, "") // Remove separator
        .trim()

      // Save the document
      saveDocument({
        title,
        summary,
        tags,
        content: cleanContent,
        createdAt: new Date().toISOString(),
      })

      importedCount++
    } catch (error) {
      console.error(`Error importing ${file.name}:`, error)
    }
  })

  await Promise.all(importPromises)
  return importedCount
}
