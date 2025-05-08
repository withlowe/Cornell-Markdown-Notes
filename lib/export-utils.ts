import { jsPDF } from "jspdf"

interface Section {
  heading: string
  content: string
}

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

// Parse markdown into Cornell note sections
function parseMarkdown(markdown: string): Section[] {
  const lines = markdown.split("\n")
  const sections: Section[] = []

  let currentHeading = ""
  let currentContent: string[] = []

  // Process each line
  lines.forEach((line) => {
    if (line.startsWith("# ")) {
      // If we already have a heading, save the previous section
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join("\n"),
        })
      }

      // Start a new section
      currentHeading = line.substring(2)
      currentContent = []
    } else {
      // Add to current content
      currentContent.push(line)
    }
  })

  // Add the last section
  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      content: currentContent.join("\n"),
    })
  }

  return sections
}

// Extract image URLs from markdown and HTML
function extractImageUrls(content: string): string[] {
  const urls: string[] = []

  // Extract markdown image URLs
  const markdownRegex = /!\[(.*?)\]$$(.*?)$$/g
  let match
  while ((match = markdownRegex.exec(content)) !== null) {
    if (match[2] && !match[2].startsWith("data:")) {
      urls.push(match[2])
    }
  }

  // Extract HTML image URLs
  const htmlRegex = /<img.*?src=["'](.*?)["'].*?>/g
  while ((match = htmlRegex.exec(content)) !== null) {
    if (match[1] && !match[1].startsWith("data:")) {
      urls.push(match[1])
    }
  }

  return urls
}

// Convert blob URLs to data URLs for PDF export
async function convertBlobUrlsToDataUrls(content: string): Promise<string> {
  let processedContent = content

  // Extract all image URLs
  const imageUrls = extractImageUrls(content)

  // Convert each blob URL to a data URL
  for (const url of imageUrls) {
    if (url.startsWith("blob:")) {
      try {
        const response = await fetch(url)
        const blob = await response.blob()
        const reader = new FileReader()

        const dataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })

        // Replace the blob URL with the data URL in both markdown and HTML formats
        processedContent = processedContent.replace(
          new RegExp(`\\]\$$${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\$$`, "g"),
          `](${dataUrl})`,
        )
        processedContent = processedContent.replace(
          new RegExp(`src=["']${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "g"),
          `src="${dataUrl}"`,
        )
      } catch (error) {
        console.error(`Failed to convert blob URL to data URL: ${url}`, error)
      }
    }
  }

  return processedContent
}

// Clean markdown text for rendering
function cleanMarkdown(text: string): string {
  // Remove bold and italic markers but keep the text
  let cleaned = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")

  // Remove backticks for inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1")

  return cleaned
}

// Render a table in PDF
function renderTable(doc: jsPDF, tableText: string[], x: number, y: number, maxWidth: number): number {
  // Parse table rows and columns
  const tableRows = tableText.filter((line) => line.trim().startsWith("|") && line.trim().endsWith("|"))

  if (tableRows.length < 2) return y // Not enough rows for a table

  // Extract header row and separator row
  const headerRow = tableRows[0]
  const contentRows = tableRows.slice(2) // Skip the separator row

  // Parse columns from header row
  const columns = headerRow
    .split("|")
    .slice(1, -1)
    .map((col) => col.trim())

  // Calculate column widths
  const totalWidth = maxWidth - 10 // Leave some margin
  const columnWidth = totalWidth / columns.length

  // Set up table styling
  const cellPadding = 2
  const rowHeight = 8
  let currentY = y

  // Draw table header
  doc.setFontSize(9)
  doc.setFont(undefined, "bold")

  let currentX = x
  columns.forEach((col) => {
    // Draw header cell
    doc.text(cleanMarkdown(col), currentX + cellPadding, currentY + rowHeight - cellPadding)
    currentX += columnWidth
  })

  doc.setFont(undefined, "normal")
  currentY += rowHeight

  // Draw header separator
  doc.setDrawColor(200, 200, 200)
  doc.line(x, currentY, x + totalWidth, currentY)

  // Draw content rows
  contentRows.forEach((row) => {
    const cells = row
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim())
    currentX = x

    cells.forEach((cell, i) => {
      if (i < columns.length) {
        // Draw cell content
        const cellText = cleanMarkdown(cell)
        const cellLines = doc.splitTextToSize(cellText, columnWidth - cellPadding * 2)
        const cellHeight = cellLines.length * rowHeight

        doc.text(cellLines, currentX + cellPadding, currentY + rowHeight - cellPadding)
        currentX += columnWidth
      }
    })

    currentY += rowHeight

    // Draw row separator
    doc.setDrawColor(230, 230, 230)
    doc.line(x, currentY, x + totalWidth, currentY)
  })

  return currentY + 5 // Return the new Y position after the table
}

// Render a list in PDF
function renderList(
  doc: jsPDF,
  listItems: string[],
  x: number,
  y: number,
  maxWidth: number,
  isNumbered: boolean,
): number {
  let currentY = y
  const lineHeight = 7
  const indent = 5

  listItems.forEach((item, index) => {
    // Create bullet or number
    const marker = isNumbered ? `${index + 1}.` : "•"
    const markerWidth = doc.getTextWidth(isNumbered ? `${marker} ` : `${marker}  `)

    // Draw the marker
    doc.text(marker, x, currentY)

    // Draw the list item text with wrapping
    const itemText = cleanMarkdown(item.trim())
    const textLines = doc.splitTextToSize(itemText, maxWidth - markerWidth - indent)

    doc.text(textLines, x + markerWidth + indent, currentY)

    // Move to next item
    currentY += textLines.length * lineHeight
  })

  return currentY + 3
}

// Render a code block in PDF
function renderCodeBlock(doc: jsPDF, codeLines: string[], x: number, y: number, maxWidth: number): number {
  const lineHeight = 6
  let currentY = y

  // Draw code block background
  const blockHeight = codeLines.length * lineHeight + 6
  doc.setFillColor(245, 245, 245)
  doc.rect(x, y, maxWidth, blockHeight, "F")

  // Set monospace font for code
  doc.setFontSize(8)

  // Draw each line of code
  codeLines.forEach((line) => {
    doc.text(line, x + 3, currentY + 5)
    currentY += lineHeight
  })

  return y + blockHeight + 3
}

// Render a blockquote in PDF
function renderBlockquote(doc: jsPDF, quoteLines: string[], x: number, y: number, maxWidth: number): number {
  const lineHeight = 7
  let currentY = y

  // Draw quote bar
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(1)
  doc.line(x, y, x, y + quoteLines.length * lineHeight)
  doc.setLineWidth(0.1)

  // Set quote text style
  doc.setTextColor(100, 100, 100)

  // Draw each line of the quote
  quoteLines.forEach((line) => {
    const textLines = doc.splitTextToSize(cleanMarkdown(line.trim()), maxWidth - 5)
    doc.text(textLines, x + 5, currentY)
    currentY += textLines.length * lineHeight
  })

  // Reset text color
  doc.setTextColor(0, 0, 0)

  return currentY + 3
}

// Process markdown content for PDF rendering
function renderMarkdownContent(doc: jsPDF, content: string, x: number, y: number, maxWidth: number): number {
  const lines = content.split("\n")
  let currentY = y
  const lineHeight = 7

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Skip empty lines but add spacing
    if (line.trim() === "") {
      currentY += lineHeight / 2
      i++
      continue
    }

    // Check for tables
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      // Collect all table lines
      const tableLines = []
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i])
        i++
      }

      currentY = renderTable(doc, tableLines, x, currentY, maxWidth)
      continue
    }

    // Check for code blocks
    if (line.trim().startsWith("```")) {
      const codeLines = []
      i++ // Skip the opening \`\`\`

      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }

      i++ // Skip the closing \`\`\`
      currentY = renderCodeBlock(doc, codeLines, x, currentY, maxWidth)
      continue
    }

    // Check for blockquotes
    if (line.trim().startsWith(">")) {
      const quoteLines = []
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].substring(lines[i].indexOf(">") + 1))
        i++
      }

      currentY = renderBlockquote(doc, quoteLines, x, currentY, maxWidth)
      continue
    }

    // Check for unordered lists
    if (line.trim().match(/^[-*]\s/)) {
      const listItems = []
      while (i < lines.length && lines[i].trim().match(/^[-*]\s/)) {
        listItems.push(lines[i].substring(lines[i].indexOf(" ") + 1))
        i++
      }

      currentY = renderList(doc, listItems, x, currentY, maxWidth, false)
      continue
    }

    // Check for ordered lists
    if (line.trim().match(/^\d+\.\s/)) {
      const listItems = []
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
        listItems.push(lines[i].substring(lines[i].indexOf(".") + 1))
        i++
      }

      currentY = renderList(doc, listItems, x, currentY, maxWidth, true)
      continue
    }

    // Check for headings (level 2-6)
    if (line.trim().match(/^#{2,6}\s/)) {
      const level = line.trim().indexOf(" ")
      const headingText = line.trim().substring(level + 1)

      const originalSize = doc.getFontSize()
      doc.setFontSize(12 - (level - 2)) // Size based on heading level
      doc.setFont(undefined, "bold")

      const textLines = doc.splitTextToSize(cleanMarkdown(headingText), maxWidth)
      doc.text(textLines, x, currentY)

      doc.setFont(undefined, "normal")
      doc.setFontSize(originalSize)

      currentY += textLines.length * lineHeight + 2
      i++
      continue
    }

    // Check for HTML image tags
    if (line.includes("<img") && line.includes("src=")) {
      // Extract the image URL and alt text
      const srcMatch = line.match(/src=["'](.*?)["']/)
      const altMatch = line.match(/alt=["'](.*?)["']/)

      if (srcMatch) {
        // Add a placeholder for the image
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`[Image: ${altMatch ? altMatch[1] : "Image"}]`, x, currentY)
        doc.setTextColor(0, 0, 0)
        currentY += lineHeight * 2
      }

      i++
      continue
    }

    // Check for markdown images
    if (line.includes("![") && line.includes("](")) {
      // Extract the image URL and alt text
      const match = line.match(/!\[(.*?)\]$$(.*?)$$/)

      if (match) {
        // Add a placeholder for the image
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`[Image: ${match[1] || "Image"}]`, x, currentY)
        doc.setTextColor(0, 0, 0)
        currentY += lineHeight * 2
      }

      i++
      continue
    }

    // Regular paragraph text
    const textLines = doc.splitTextToSize(cleanMarkdown(line), maxWidth)
    doc.text(textLines, x, currentY)
    currentY += textLines.length * lineHeight
    i++
  }

  return currentY
}

// Add images to PDF
async function addImagesToPdf(doc: jsPDF, content: string, x: number, y: number, maxWidth: number): Promise<number> {
  let currentY = y
  const imageMargin = 10 // Space between images
  const maxImageHeight = 60 // Maximum height for images in the PDF

  // Extract all image URLs (both markdown and HTML)
  const htmlImageRegex = /<img.*?src=["'](.*?)["'].*?>/g
  let match
  const imagesToAdd = []

  // Find HTML images (our app primarily uses HTML img tags)
  while ((match = htmlImageRegex.exec(content)) !== null) {
    const src = match[1]
    // Extract alt text if available
    const altMatch = match[0].match(/alt=["'](.*?)["']/)
    const alt = altMatch ? altMatch[1] : ""

    if (src) {
      imagesToAdd.push({ src, alt })
      console.log("Found image in content:", src.substring(0, 50) + "...")
    }
  }

  // If no images were found, return the current Y position
  if (imagesToAdd.length === 0) {
    console.log("No images found in content")
    return currentY
  }

  console.log(`Found ${imagesToAdd.length} images to add to PDF`)

  // Add each image to the PDF
  for (const image of imagesToAdd) {
    try {
      console.log("Processing image:", image.src.substring(0, 50) + "...")

      // Skip placeholder images
      if (image.src.includes("/placeholder.svg") || image.src.includes("/generic-placeholder-icon.png")) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`[Placeholder Image: ${image.alt || "Image"}]`, x, currentY)
        doc.setTextColor(0, 0, 0)
        currentY += 20
        continue
      }

      // Create an image element to get dimensions
      const img = new Image()

      // Convert blob URLs to data URLs
      let imgSrc = image.src
      if (image.src.startsWith("blob:")) {
        try {
          const response = await fetch(image.src)
          const blob = await response.blob()
          imgSrc = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
          console.log("Converted blob URL to data URL")
        } catch (error) {
          console.error("Error converting blob URL:", error)
          // Use a placeholder if conversion fails
          doc.setFontSize(9)
          doc.setTextColor(100, 100, 100)
          doc.text(`[Image could not be loaded: ${image.alt || "Unknown"}]`, x, currentY)
          doc.setTextColor(0, 0, 0)
          currentY += 20
          continue
        }
      }

      // For external URLs, we'll use a placeholder
      if (imgSrc.startsWith("http") && !imgSrc.startsWith("data:")) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`[External Image: ${image.alt || "Image"}]`, x, currentY)
        doc.setTextColor(0, 0, 0)
        currentY += 20
        continue
      }

      // For data URLs, we can use them directly with jsPDF
      if (imgSrc.startsWith("data:")) {
        // Get the image format from the data URL
        const format = imgSrc.split(";")[0].split("/")[1].toUpperCase()
        const validFormat = ["JPEG", "JPG", "PNG"].includes(format) ? format : "JPEG"

        // Calculate dimensions to maintain aspect ratio
        await new Promise<void>((resolve) => {
          img.onload = () => {
            const aspectRatio = img.width / img.height
            const imgWidth = Math.min(maxWidth, 150)
            const imgHeight = Math.min(imgWidth / aspectRatio, maxImageHeight)

            try {
              // Add the image to the PDF
              doc.addImage(imgSrc, validFormat, x, currentY, imgWidth, imgHeight, undefined, "FAST")
              console.log("Added image to PDF successfully")

              // Add caption if there's alt text
              if (image.alt) {
                doc.setFontSize(8)
                doc.setTextColor(100, 100, 100)
                const captionY = currentY + imgHeight + 5
                doc.text(image.alt, x, captionY, { align: "left", maxWidth: maxWidth })
                currentY = captionY + 10
              } else {
                currentY += imgHeight + imageMargin
              }
            } catch (error) {
              console.error("Error adding image to PDF:", error)
              // Use a placeholder if adding fails
              doc.setFontSize(9)
              doc.setTextColor(100, 100, 100)
              doc.text(`[Image could not be added to PDF: ${error.message || "Unknown error"}]`, x, currentY)
              doc.setTextColor(0, 0, 0)
              currentY += 20
            }
            resolve()
          }

          img.onerror = () => {
            console.error("Error loading image")
            // Use a placeholder if loading fails
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 100)
            doc.text(`[Image could not be loaded]`, x, currentY)
            doc.setTextColor(0, 0, 0)
            currentY += 20
            resolve()
          }

          // Set crossOrigin to anonymous to avoid CORS issues
          img.crossOrigin = "anonymous"
          img.src = imgSrc
        })
      } else {
        // For other URLs, use a placeholder
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`[Image: ${image.alt || image.src}]`, x, currentY)
        doc.setTextColor(0, 0, 0)
        currentY += 20
      }
    } catch (error) {
      console.error(`Failed to add image to PDF: ${image.src}`, error)
      // Add a placeholder for failed images
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`[Image could not be loaded: ${error.message || "Unknown error"}]`, x, currentY)
      doc.setTextColor(0, 0, 0)
      currentY += 20
    }
  }

  return currentY
}

// Export to PDF with improved markdown rendering
export async function exportToPdf(title: string, summary: string, markdown: string): Promise<void> {
  try {
    // First, process the markdown to convert any blob URLs to data URLs
    const processedMarkdown = await convertBlobUrlsToDataUrls(markdown)

    const sections = parseMarkdown(processedMarkdown)

    // Create a new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Set title
    doc.setFontSize(16)
    doc.text(title, 15, 15)

    // Add summary if provided - removed the "Summary:" label
    let y = 25 // Increased spacing after title
    if (summary) {
      doc.setFontSize(10)
      // Removed the "Summary:" label, just show the summary content directly
      const summaryLines = doc.splitTextToSize(summary, 180)
      doc.text(summaryLines, 15, y)
      y += summaryLines.length * 5 + 10 // Increased spacing after summary
    } else {
      y = 30 // More spacing if no summary
    }

    // Draw the Cornell note structure
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const keyPointsWidth = 45
    const contentWidth = pageWidth - margin - keyPointsWidth - margin

    // Draw header - no shading, just text
    doc.setFontSize(10)
    doc.text("Key Points", margin + 5, y)
    doc.text("Notes", margin + keyPointsWidth + 5, y)

    // Draw a single light horizontal line under the header
    doc.setDrawColor(220, 220, 220) // Very light gray
    doc.line(margin, y + 2, margin + keyPointsWidth + contentWidth, y + 2)

    // Draw content with minimal styling
    y += 5

    for (let index = 0; index < sections.length; index++) {
      const section = sections[index]

      // Check if we need a new page
      if (y + 20 > pageHeight - margin) {
        doc.addPage()
        y = margin

        // Redraw header on new page - just text, no shading
        doc.setFontSize(10)
        doc.text("Key Points", margin + 5, y + 5)
        doc.text("Notes", margin + keyPointsWidth + 5, y + 5)

        // Draw a single light horizontal line under the header
        doc.setDrawColor(220, 220, 220) // Very light gray
        doc.line(margin, y + 7, margin + keyPointsWidth + contentWidth, y + 7)

        y += 10
      }

      const startY = y

      // Draw key point (heading)
      doc.setFontSize(11)
      doc.setFont(undefined, "bold")
      const headingLines = doc.splitTextToSize(section.heading, keyPointsWidth - 10)
      doc.text(headingLines, margin + 5, y + 5)
      doc.setFont(undefined, "normal")

      // Calculate heading height
      const headingHeight = headingLines.length * 7 + 5

      // Draw content with improved markdown rendering
      doc.setFontSize(10)
      const contentEndY = renderMarkdownContent(
        doc,
        section.content,
        margin + keyPointsWidth + 5,
        y + 5,
        contentWidth - 10,
      )

      // Add images after the text content
      const imagesEndY = await addImagesToPdf(
        doc,
        section.content,
        margin + keyPointsWidth + 5,
        contentEndY + 5,
        contentWidth - 10,
      )

      // Calculate section height
      const sectionHeight = Math.max(headingHeight, imagesEndY - y)

      // Draw section with very light borders
      doc.setDrawColor(230, 230, 230) // Extra light gray for borders

      // Draw vertical divider between key points and notes
      doc.line(margin + keyPointsWidth, startY, margin + keyPointsWidth, startY + sectionHeight)

      // Draw horizontal line at the bottom of the section
      if (index < sections.length - 1) {
        doc.line(margin, startY + sectionHeight, margin + keyPointsWidth + contentWidth, startY + sectionHeight)
      }

      // Update y position for next section
      y = startY + sectionHeight + 3
    }

    // Generate the PDF as a blob
    const pdfBlob = doc.output("blob")

    // Download the PDF
    downloadBlob(pdfBlob, `${title.replace(/\s+/g, "-").toLowerCase()}.pdf`)
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
