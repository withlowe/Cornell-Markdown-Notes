import JSZip from "jszip"
import { getImage } from "./image-storage"

interface FlashCard {
  front: string
  back: string
  images?: { [key: string]: string } // Store images as base64 data URLs
}

// Helper function to download a blob
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

// Convert markdown tables to HTML tables for Anki
function convertTableToHtml(tableText: string): string {
  const lines = tableText
    .trim()
    .split("\n")
    .filter((line) => line.trim().startsWith("|") && line.trim().endsWith("|"))

  if (lines.length < 2) return tableText

  const headerRow = lines[0]
  const separatorRow = lines[1]
  const dataRows = lines.slice(2)

  // Parse header
  const headers = headerRow
    .split("|")
    .slice(1, -1)
    .map((h) => h.trim())

  // Parse alignment from separator row
  const alignments = separatorRow
    .split("|")
    .slice(1, -1)
    .map((sep) => {
      const trimmed = sep.trim()
      if (trimmed.startsWith(":") && trimmed.endsWith(":")) return "center"
      if (trimmed.endsWith(":")) return "right"
      return "left"
    })

  // Build HTML table with proper styling
  let html = '<table style="border-collapse: collapse; width: 100%; margin: 10px 0; border: 1px solid #ddd;">'

  // Header
  if (headers.length > 0) {
    html += "<thead><tr>"
    headers.forEach((header, i) => {
      const align = alignments[i] || "left"
      html += `<th style="padding: 8px; text-align: ${align}; border: 1px solid #ddd; font-weight: bold;">${cleanMarkdownInCell(header)}</th>`
    })
    html += "</tr></thead>"
  }

  // Body
  if (dataRows.length > 0) {
    html += "<tbody>"
    dataRows.forEach((row) => {
      const cells = row
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim())

      html += "<tr>"
      cells.forEach((cell, i) => {
        const align = alignments[i] || "left"
        html += `<td style="padding: 8px; text-align: ${align}; border: 1px solid #ddd;">${cleanMarkdownInCell(cell)}</td>`
      })
      html += "</tr>"
    })
    html += "</tbody>"
  }

  html += "</table>"
  return html
}

// Clean markdown formatting within table cells
function cleanMarkdownInCell(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .trim()
}

// Convert markdown lists to HTML lists for Anki
function convertListToHtml(listText: string): string {
  const lines = listText.split("\n").filter((line) => line.trim())

  if (lines.length === 0) return ""

  // Determine if it's ordered or unordered
  const isOrdered = lines[0].trim().match(/^\d+\./)

  const tag = isOrdered ? "ol" : "ul"
  let html = `<${tag} style="margin: 10px 0; padding-left: 20px;">`

  lines.forEach((line) => {
    const trimmed = line.trim()
    let content = ""

    if (isOrdered) {
      content = trimmed.replace(/^\d+\.\s*/, "")
    } else {
      content = trimmed.replace(/^[-*]\s*/, "")
    }

    html += `<li style="margin: 5px 0;">${cleanMarkdownForAnki(content)}</li>`
  })

  html += `</${tag}>`
  return html
}

// Process images and return HTML with embedded data
async function processImagesForAnki(content: string): Promise<{ html: string; images: { [key: string]: string } }> {
  let processedContent = content
  const images: { [key: string]: string } = {}

  // Process HTML images
  const htmlImageRegex = /<img[^>]*src=["'](.*?)["'][^>]*(?:alt=["'](.*?)["'])?[^>]*>/g
  let match

  while ((match = htmlImageRegex.exec(content)) !== null) {
    const fullMatch = match[0]
    const src = match[1]
    const alt = match[2] || "Image"

    try {
      let imageData = src

      // Handle cornell-image:// URLs
      if (src.startsWith("cornell-image://")) {
        const imageId = src.replace("cornell-image://", "")
        const storedImage = await getImage(imageId)
        if (storedImage) {
          imageData = storedImage
        } else {
          // Skip if image not found
          processedContent = processedContent.replace(fullMatch, `<p><em>[Image not found: ${alt}]</em></p>`)
          continue
        }
      }

      // Skip placeholder images
      if (src.includes("/placeholder.svg") || src.includes("/generic-placeholder-icon.png")) {
        processedContent = processedContent.replace(fullMatch, `<p><em>[Placeholder image: ${alt}]</em></p>`)
        continue
      }

      // For data URLs, we can embed them directly
      if (imageData.startsWith("data:")) {
        // Generate a unique filename for this image
        const imageKey = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        const extension = imageData.includes("data:image/png") ? "png" : "jpg"
        const filename = `${imageKey}.${extension}`

        // Store the image data
        images[filename] = imageData

        // Replace with Anki-compatible img tag
        const ankiImg = `<img src="${filename}" alt="${alt}" style="max-width: 100%; height: auto; margin: 10px 0;">`
        processedContent = processedContent.replace(fullMatch, ankiImg)
      } else {
        // For external URLs, keep them as is but add styling
        const styledImg = `<img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; margin: 10px 0;">`
        processedContent = processedContent.replace(fullMatch, styledImg)
      }
    } catch (error) {
      console.error("Error processing image for Anki:", error)
      processedContent = processedContent.replace(fullMatch, `<p><em>[Error loading image: ${alt}]</em></p>`)
    }
  }

  // Process markdown images
  const markdownImageRegex = /!\[(.*?)\]$$(.*?)$$/g
  while ((match = markdownImageRegex.exec(processedContent)) !== null) {
    const fullMatch = match[0]
    const alt = match[1] || "Image"
    const src = match[2]

    // Convert to HTML image and process the same way
    const htmlImg = `<img src="${src}" alt="${alt}">`
    processedContent = processedContent.replace(fullMatch, htmlImg)
  }

  return { html: processedContent, images }
}

// Clean markdown text for Anki cards with enhanced formatting
async function cleanMarkdownForAnki(text: string): Promise<{ content: string; images: { [key: string]: string } }> {
  // First process images
  const { html: imageProcessedText, images } = await processImagesForAnki(text)
  let cleaned = imageProcessedText

  // Process tables - improved regex to capture complete tables
  const tableRegex = /(?:^\|.*\|[ \t]*$\n?)+/gm
  cleaned = cleaned.replace(tableRegex, (match) => {
    return convertTableToHtml(match.trim())
  })

  // Process lists (both ordered and unordered)
  const listRegex = /((?:^[ \t]*[-*][ \t]+.+\n?)+|(?:^[ \t]*\d+\.[ \t]+.+\n?)+)/gm
  cleaned = cleaned.replace(listRegex, (match) => {
    return convertListToHtml(match)
  })

  // Process other markdown formatting
  cleaned = cleaned
    // Convert bold and italic markers to HTML
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Convert inline code
    .replace(/`([^`]+)`/g, "<code style='background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px;'>$1</code>")
    // Convert code blocks
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/g, "").replace(/```$/, "")
      return `<pre style="background-color: #f8f8f8; padding: 10px; border-radius: 5px; overflow-x: auto; margin: 10px 0;"><code>${code}</code></pre>`
    })
    // Convert markdown links to HTML
    .replace(/\[([^\]]+)\]$$([^)]+)$$/g, '<a href="$2" style="color: #0066cc;">$1</a>')
    // Remove note links (Cornell-specific) but keep the text
    .replace(/\[\[([^\]]+)\]\]/g, "<strong>$1</strong>")
    // Convert blockquotes
    .replace(
      /^> (.+)$/gm,
      '<blockquote style="border-left: 4px solid #ddd; margin: 10px 0; padding-left: 15px; color: #666;">$1</blockquote>',
    )
    // Convert headers (but keep them smaller since they'll be in card content)
    .replace(/^### (.+)$/gm, '<h4 style="margin: 15px 0 10px 0; font-size: 1.1em;">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin: 15px 0 10px 0; font-size: 1.2em;">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin: 15px 0 10px 0; font-size: 1.3em;">$1</h2>')
    // Convert line breaks to HTML breaks for better formatting
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>")
    // Clean up extra spaces
    .replace(/\s+/g, " ")
    .trim()

  return { content: cleaned, images }
}

// Parse Cornell notes into flashcards with enhanced content processing
async function parseNotesToFlashcards(title: string, summary: string, markdown: string): Promise<FlashCard[]> {
  const flashcards: FlashCard[] = []

  // Add a summary card if summary exists
  if (summary.trim()) {
    const { content, images } = await cleanMarkdownForAnki(summary)
    flashcards.push({
      front: `${title} - Summary`,
      back: content,
      images: images,
    })
  }

  // Parse sections from markdown
  const lines = markdown.split("\n")
  let currentHeading = ""
  let currentContent: string[] = []

  lines.forEach((line) => {
    if (line.startsWith("# ")) {
      // Save previous section if it exists
      if (currentHeading && currentContent.length > 0) {
        const contentText = currentContent.join("\n").trim()
        if (contentText) {
          // Process this section asynchronously
          const processSection = async () => {
            const { content, images } = await cleanMarkdownForAnki(contentText)
            flashcards.push({
              front: currentHeading,
              back: content,
              images: images,
            })
          }
          // We'll handle this in the main function
        }
      }

      // Start new section
      currentHeading = line.substring(2).trim()
      currentContent = []
    } else if (currentHeading) {
      // Add content to current section
      currentContent.push(line)
    }
  })

  // Process all sections
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith("# ")) {
      if (currentHeading && currentContent.length > 0) {
        const contentText = currentContent.join("\n").trim()
        if (contentText) {
          const { content, images } = await cleanMarkdownForAnki(contentText)
          flashcards.push({
            front: currentHeading,
            back: content,
            images: images,
          })
        }
      }
      currentHeading = line.substring(2).trim()
      currentContent = []
    } else if (currentHeading) {
      currentContent.push(line)
    }
  }

  // Add the last section
  if (currentHeading && currentContent.length > 0) {
    const contentText = currentContent.join("\n").trim()
    if (contentText) {
      const { content, images } = await cleanMarkdownForAnki(contentText)
      flashcards.push({
        front: currentHeading,
        back: content,
        images: images,
      })
    }
  }

  return flashcards
}

// Generate Anki-compatible TSV content
function generateAnkiTSV(flashcards: FlashCard[]): string {
  // Anki format: Front\tBack\n
  return flashcards
    .map((card) => {
      // Escape tabs and preserve HTML in the content
      const front = card.front.replace(/\t/g, " ").replace(/\r?\n/g, " ")
      const back = card.back.replace(/\t/g, " ") // Keep HTML in back
      return `${front}\t${back}`
    })
    .join("\n")
}

// Export flashcards to Anki format with images
export async function exportToAnki(title: string, summary: string, markdown: string): Promise<void> {
  try {
    // Parse notes into flashcards
    const flashcards = await parseNotesToFlashcards(title, summary, markdown)

    if (flashcards.length === 0) {
      throw new Error(
        "No flashcards could be generated from this note. Make sure you have headings (# sections) with content.",
      )
    }

    // Collect all images from all flashcards
    const allImages: { [key: string]: string } = {}
    flashcards.forEach((card) => {
      if (card.images) {
        Object.assign(allImages, card.images)
      }
    })

    // Generate TSV content
    const tsvContent = generateAnkiTSV(flashcards)

    // Create zip file
    const zip = new JSZip()

    // Add the TSV file to the zip
    const filename = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-flashcards.txt`
    zip.file(filename, tsvContent)

    // Add all images to the zip
    const imagePromises = Object.entries(allImages).map(async ([filename, dataUrl]) => {
      try {
        // Convert data URL to blob
        const response = await fetch(dataUrl)
        const blob = await response.blob()
        zip.file(`images/${filename}`, blob)
      } catch (error) {
        console.error(`Error adding image ${filename}:`, error)
      }
    })

    await Promise.all(imagePromises)

    // Add a comprehensive readme file with import instructions
    const readmeContent = `Anki Flashcards Export
======================

This package contains ${flashcards.length} flashcards exported from "${title}".
${Object.keys(allImages).length > 0 ? `\nIncludes ${Object.keys(allImages).length} images in the 'images' folder.` : ""}

CONTENTS:
- ${filename}: The flashcard data in tab-separated format
${Object.keys(allImages).length > 0 ? "- images/: Folder containing all images referenced in the flashcards" : ""}

IMPORT INSTRUCTIONS:
1. Extract this entire zip file to a folder
2. Open Anki
3. Create a new deck or select an existing one
4. Go to File > Import
5. Navigate to the extracted folder and select the .txt file
6. In the import dialog:
   - Set Field separator to "Tab"
   - Set field 1 to "Front" and field 2 to "Back"
   - Make sure "Allow HTML in fields" is checked
   - Click Import

${
  Object.keys(allImages).length > 0
    ? `
IMAGE SETUP:
After importing the cards, you need to copy the images to your Anki media folder:
1. Find your Anki profile folder:
   - Windows: Documents/Anki2/[Profile Name]/collection.media/
   - Mac: ~/Library/Application Support/Anki2/[Profile Name]/collection.media/
   - Linux: ~/.local/share/Anki2/[Profile Name]/collection.media/
2. Copy all files from the 'images' folder to the collection.media folder
3. Restart Anki to ensure images are properly loaded

The flashcards will then display with full formatting including:
`
    : `
The flashcards include enhanced formatting with:
`
}- Tables converted to HTML format
- Lists (both ordered and unordered)
- Bold and italic text formatting
- Code blocks with syntax highlighting
- Links (external URLs)
- Blockquotes
${Object.keys(allImages).length > 0 ? "- Embedded images" : ""}

Generated on: ${new Date().toLocaleString()}
Source: ${title}
`

    zip.file("README.txt", readmeContent)

    // Generate and download the zip
    const zipBlob = await zip.generateAsync({ type: "blob" })
    const zipFilename = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-anki-flashcards.zip`

    downloadBlob(zipBlob, zipFilename)

    console.log(
      `Successfully exported ${flashcards.length} flashcards to Anki format with ${Object.keys(allImages).length} images`,
    )
  } catch (error) {
    console.error("Error exporting to Anki:", error)
    throw error
  }
}

// Preview flashcards (for debugging or user preview)
export async function previewFlashcards(title: string, summary: string, markdown: string): Promise<FlashCard[]> {
  return await parseNotesToFlashcards(title, summary, markdown)
}
