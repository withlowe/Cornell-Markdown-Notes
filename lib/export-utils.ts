import { jsPDF } from "jspdf"
import { getImage } from "./image-storage"
import { extractNoteLinks } from "./link-utils"

interface Section {
  heading: string
  content: string
}

// Export the main function that will be used in other files
export async function exportToPdf(
  title: string,
  summary: string,
  markdown: string,
  font: "sans" | "serif" | "mixed" = "sans",
): Promise<void> {
  try {
    // First, process the markdown to load images from storage
    const processedMarkdown = await processContentForExport(markdown)

    const sections = parseMarkdown(processedMarkdown)

    // Extract all note links for the related links section
    const noteLinks = extractNoteLinks(markdown)

    // Create a new PDF document with clean, minimal styling
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Get page dimensions
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    const keyPointsWidth = 45
    const contentWidth = pageWidth - margin - keyPointsWidth - margin

    // Set font families based on user preference - use standard jsPDF fonts
    // These are the fonts that work reliably with jsPDF
    let titleFont: string
    let bodyFont: string

    switch (font) {
      case "serif":
        titleFont = "times"
        bodyFont = "times"
        break
      case "mixed":
        titleFont = "helvetica" // Sans for titles
        bodyFont = "times" // Serif for body
        break
      case "sans":
      default:
        titleFont = "helvetica"
        bodyFont = "helvetica"
        break
    }

    // Set title - clean and minimal
    doc.setFontSize(24)
    doc.setFont(titleFont, "bold")
    doc.text(title, 15, 20)

    // Add summary if provided - clean styling
    let y = 30
    if (summary) {
      doc.setFontSize(11)
      doc.setFont(bodyFont, "normal")
      const summaryLineHeight = 6 // Consistent line height
      const summaryLines = doc.splitTextToSize(summary, 180)

      // Apply clean line spacing
      for (let i = 0; i < summaryLines.length; i++) {
        doc.text(summaryLines[i], 15, y + i * summaryLineHeight + 2)
      }

      y += summaryLines.length * summaryLineHeight + 6
    } else {
      y = 35
    }

    // Draw a light horizontal line under the header - minimal styling
    doc.setDrawColor(230, 230, 230)
    doc.line(margin, y + 2, margin + keyPointsWidth + contentWidth, y + 2)

    y += 8

    // Track section boundaries for proper horizontal line alignment
    const sectionBoundaries = []

    // Track pages that contain continuation of sections
    const continuationPages = new Map<number, number>()

    for (let index = 0; index < sections.length; index++) {
      const section = sections[index]

      // Skip sections with empty content
      if (!section.content.trim()) {
        continue
      }

      // Check if we need a new page
      if (y + 20 > pageHeight - margin) {
        doc.addPage()
        y = margin
        y += 8
      }

      const startY = y
      const startPage = doc.getCurrentPageInfo().pageNumber

      // Draw key point (heading) with semibold styling - use title font for headings
      doc.setFontSize(11)
      doc.setFont(titleFont, "bold")
      const headingLines = doc.splitTextToSize(section.heading, keyPointsWidth - 10)

      const headingLineHeight = 6 // Consistent line height
      for (let i = 0; i < headingLines.length; i++) {
        doc.text(headingLines[i], margin + 5, y + 5 + i * headingLineHeight + 2)
      }

      const headingHeight = headingLines.length * headingLineHeight + 5

      // Content area
      const contentStartX = margin + keyPointsWidth + 5
      const contentStartY = y + 5

      // Pass section info and font settings to the rendering functions
      const sectionInfo = {
        currentSection: index,
        totalSections: sections.length,
      }

      const fontSettings = {
        titleFont,
        bodyFont,
        mixedMode: font === "mixed",
      }

      // Draw content with improved markdown rendering
      doc.setFontSize(11)
      doc.setFont(bodyFont, "normal")
      const contentEndY = renderMarkdownContent(
        doc,
        section.content,
        contentStartX,
        contentStartY,
        contentWidth - 10,
        pageHeight,
        margin,
        keyPointsWidth,
        pageWidth - margin * 2,
        sectionInfo,
        fontSettings,
      )

      // Add images after the text content
      const imagesEndY = await addImagesToPdf(
        doc,
        section.content,
        contentStartX,
        contentEndY + 3,
        contentWidth - 10,
        pageHeight,
        margin,
        keyPointsWidth,
        pageWidth - margin * 2,
        sectionInfo,
        fontSettings,
      )

      // Store section boundary information for proper line drawing
      const endPage = doc.getCurrentPageInfo().pageNumber
      sectionBoundaries.push({
        index,
        startY,
        startPage,
        endY: imagesEndY,
        endPage,
      })

      // Track all pages that contain this section
      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        if (pageNum > startPage) {
          continuationPages.set(pageNum, index)
        }
      }

      // Draw section with very light borders - minimal styling
      doc.setDrawColor(240, 240, 240)

      // Draw vertical divider between key points and notes - but not for Related Notes
      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        doc.setPage(pageNum)

        if (pageNum === startPage) {
          const endY = pageNum === endPage ? imagesEndY : pageHeight - margin
          doc.line(margin + keyPointsWidth, startY, margin + keyPointsWidth, endY)
        } else if (pageNum === endPage) {
          doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, imagesEndY)
        } else {
          doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, pageHeight - margin)
        }
      }

      // Set back to the last page
      doc.setPage(endPage)

      // Update y position for next section
      y = imagesEndY + 0.5
    }

    // Draw horizontal lines at the bottom of each section - minimal styling
    for (let i = 0; i < sectionBoundaries.length; i++) {
      const section = sectionBoundaries[i]

      // Only draw bottom line if not the last section and not before Related Notes
      if (i < sectionBoundaries.length - 1) {
        doc.setPage(section.endPage)
        doc.setDrawColor(240, 240, 240)
        doc.line(margin, section.endY, margin + keyPointsWidth + contentWidth, section.endY)
      }
    }

    // Handle continuation pages - clean styling
    const totalPages = doc.getNumberOfPages()
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (continuationPages.has(pageNum)) {
        const sectionIndex = continuationPages.get(pageNum)!
        const section = sections[sectionIndex]

        doc.setPage(pageNum)

        // Draw the key point heading on the continuation page (semibold) - use title font
        doc.setFontSize(11)
        doc.setFont(titleFont, "bold")
        const headingLines = doc.splitTextToSize(section.heading, keyPointsWidth - 10)

        const headingLineHeight = 6 // Consistent line height
        for (let i = 0; i < headingLines.length; i++) {
          doc.text(headingLines[i], margin + 5, margin + 5 + i * headingLineHeight + 2)
        }
      }
    }

    // Add related links section at the end if there are any note links
    if (noteLinks.length > 0) {
      // Go to the last page and check if we need a new page
      const currentPageNum = doc.getNumberOfPages()
      doc.setPage(currentPageNum)

      // Get the current Y position from the last section
      let currentY = y + 20 // Add some space before the related links

      // Check if we have enough space for the related links section
      const estimatedHeight = 20 + noteLinks.length * 6

      if (currentY + estimatedHeight > pageHeight - margin) {
        doc.addPage()
        currentY = margin + 10
      }

      // Add related links section - ALWAYS use helvetica (sans-serif) for Related Notes
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold") // Always sans-serif for Related Notes
      doc.text("Related Notes", margin, currentY)

      currentY += 8
      currentY += 2

      // List all the note links - ALWAYS use helvetica (sans-serif) for Related Notes
      doc.setFontSize(11)
      doc.setFont("helvetica", "normal") // Always sans-serif for Related Notes
      for (let i = 0; i < noteLinks.length; i++) {
        const link = noteLinks[i]

        // Check if we need a new page
        if (currentY + 6 > pageHeight - margin) {
          doc.addPage()
          currentY = margin
          // Reset font to helvetica after page break
          doc.setFont("helvetica", "normal")
        }

        // Add bullet point and link text
        doc.text(`• ${link}`, margin + 5, currentY)
        currentY += 6 // Consistent line height
      }
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

// Process content to load images from storage and clean note links
async function processContentForExport(content: string): Promise<string> {
  let processedContent = content

  // Find all cornell-image:// URLs
  const imageRegex = /cornell-image:\/\/(.*?)["']/g
  const matches = [...content.matchAll(imageRegex)]

  // Replace each cornell-image:// URL with the actual image data
  for (const match of matches) {
    const imageId = match[1]

    if (imageId) {
      try {
        const imageData = await getImage(imageId)
        if (imageData) {
          // Replace the cornell-image:// URL with the actual image data
          processedContent = processedContent.replace(
            new RegExp(`cornell-image://${imageId}["']`, "g"),
            `${imageData}"`,
          )
        }
      } catch (error) {
        console.error(`Error loading image ${imageId} for export:`, error)
      }
    }
  }

  // Remove [[ ]] from note links in the content for PDF display
  processedContent = processedContent.replace(/\[\[([^\]]+)\]\]/g, "$1")

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

// Render a table in PDF - simplified version for less ink usage
function renderTable(
  doc: jsPDF,
  tableText: string[],
  x: number,
  y: number,
  maxWidth: number,
  pageHeight: number,
  margin: number,
  fontSettings: { titleFont: string; bodyFont: string; mixedMode: boolean },
): number {
  // Parse table rows and columns
  const tableRows = tableText.filter((line) => line.trim().startsWith("|") && line.trim().endsWith("|"))

  if (tableRows.length < 2) return y // Not enough rows for a table

  // Extract header row and separator row
  const headerRow = tableRows[0]
  const separatorRow = tableRows[1]
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
  const cellPadding = 3
  const rowHeight = 8
  let currentY = y

  // Check if we need a new page before starting the table
  if (currentY + rowHeight * 2 > pageHeight - margin) {
    doc.addPage()
    currentY = margin
  }

  // Draw table header - use title font for headers
  doc.setFontSize(11)
  doc.setFont(fontSettings.titleFont, "bold")

  let currentX = x
  columns.forEach((col, colIndex) => {
    // Draw header cell - add padding to top and sides
    const colText = cleanMarkdown(col)

    // Get alignment from separator row
    const separatorCells = separatorRow.split("|").slice(1, -1)
    const alignmentCell = separatorCells[colIndex] || "---"
    let textAlign: "left" | "center" | "right" = "left"

    if (alignmentCell.trim().startsWith(":") && alignmentCell.trim().endsWith(":")) {
      textAlign = "center"
    } else if (alignmentCell.trim().endsWith(":")) {
      textAlign = "right"
    }

    // Calculate text position based on alignment
    let textX = currentX + cellPadding
    if (textAlign === "center") {
      textX = currentX + columnWidth / 2
    } else if (textAlign === "right") {
      textX = currentX + columnWidth - cellPadding
    }

    // Draw text with proper alignment
    doc.text(colText, textX, currentY + rowHeight / 2 + 2, {
      align: textAlign,
      baseline: "middle",
    })

    currentX += columnWidth
  })

  // Switch to body font for table content
  doc.setFont(fontSettings.bodyFont, "normal")
  currentY += rowHeight

  // Draw header separator - minimal line
  doc.setDrawColor(200, 200, 200)
  doc.line(x, currentY, x + totalWidth, currentY)

  // Draw content rows
  for (let rowIndex = 0; rowIndex < contentRows.length; rowIndex++) {
    const row = contentRows[rowIndex]

    // Check if we need a new page before drawing this row
    if (currentY + rowHeight > pageHeight - margin) {
      doc.addPage()
      currentY = margin

      // Redraw header on new page
      doc.setFontSize(11)
      doc.setFont(fontSettings.titleFont, "bold")

      currentX = x
      columns.forEach((col, colIndex) => {
        // Draw header cell with proper alignment
        const colText = cleanMarkdown(col)

        // Get alignment from separator row
        const separatorCells = separatorRow.split("|").slice(1, -1)
        const alignmentCell = separatorCells[colIndex] || "---"
        let textAlign: "left" | "center" | "right" = "left"

        if (alignmentCell.trim().startsWith(":") && alignmentCell.trim().endsWith(":")) {
          textAlign = "center"
        } else if (alignmentCell.trim().endsWith(":")) {
          textAlign = "right"
        }

        // Calculate text position based on alignment
        let textX = currentX + cellPadding
        if (textAlign === "center") {
          textX = currentX + columnWidth / 2
        } else if (textAlign === "right") {
          textX = currentX + columnWidth - cellPadding
        }

        // Draw text with proper alignment
        doc.text(colText, textX, currentY + rowHeight / 2 + 2, {
          align: textAlign,
          baseline: "middle",
        })

        currentX += columnWidth
      })

      doc.setFont(fontSettings.bodyFont, "normal")
      currentY += rowHeight

      // Redraw header separator - minimal line
      doc.setDrawColor(200, 200, 200)
      doc.line(x, currentY, x + totalWidth, currentY)
    }

    const cells = row
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim())
    currentX = x

    cells.forEach((cell, colIndex) => {
      if (colIndex < columns.length) {
        // Get alignment from separator row
        const separatorCells = separatorRow.split("|").slice(1, -1)
        const alignmentCell = separatorCells[colIndex] || "---"
        let textAlign: "left" | "center" | "right" = "left"

        if (alignmentCell.trim().startsWith(":") && alignmentCell.trim().endsWith(":")) {
          textAlign = "center"
        } else if (alignmentCell.trim().endsWith(":")) {
          textAlign = "right"
        }

        // Calculate text position based on alignment
        let textX = currentX + cellPadding
        if (textAlign === "center") {
          textX = currentX + columnWidth / 2
        } else if (textAlign === "right") {
          textX = currentX + columnWidth - cellPadding
        }

        // Draw cell content with proper alignment
        const cellText = cleanMarkdown(cell)

        // Handle multi-line cell content
        const cellLines = doc.splitTextToSize(cellText, columnWidth - cellPadding * 2)

        // Calculate vertical position for text (top-aligned)
        const lineHeight = 6 // Consistent line height
        const textY = currentY + cellPadding

        // Draw each line of text
        for (let i = 0; i < cellLines.length; i++) {
          doc.text(cellLines[i], textX, textY + i * lineHeight, {
            align: textAlign,
            baseline: "top",
          })
        }

        currentX += columnWidth
      }
    })

    currentY += rowHeight

    // Draw horizontal row separator (only a light line)
    if (rowIndex < contentRows.length - 1) {
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.1)
      doc.line(x, currentY, x + totalWidth, currentY)
      doc.setLineWidth(0.2)
    }
  }

  return currentY + 4
}

// Render a list in PDF
function renderList(
  doc: jsPDF,
  listItems: string[],
  x: number,
  y: number,
  maxWidth: number,
  isNumbered: boolean,
  pageHeight: number,
  margin: number,
  fontSettings: { titleFont: string; bodyFont: string; mixedMode: boolean },
): number {
  let currentY = y
  const lineHeight = 6 // Consistent line height
  const indent = 5

  // Use body font for list content
  doc.setFont(fontSettings.bodyFont, "normal")

  for (let index = 0; index < listItems.length; index++) {
    const item = listItems[index]

    // Check if we need a new page
    if (currentY + lineHeight > pageHeight - margin) {
      doc.addPage()
      currentY = margin
      // Reset font after page break
      doc.setFont(fontSettings.bodyFont, "normal")
    }

    // Create bullet or number
    const marker = isNumbered ? `${index + 1}.` : "•"
    const markerWidth = doc.getTextWidth(isNumbered ? `${marker} ` : `${marker}  `)

    // Draw the marker
    doc.text(marker, x, currentY + 2)

    // Draw the list item text with wrapping
    const itemText = cleanMarkdown(item.trim())
    const textLines = doc.splitTextToSize(itemText, maxWidth - markerWidth - indent)

    // Check if we need to split across pages
    for (let lineIndex = 0; lineIndex < textLines.length; lineIndex++) {
      if (currentY + lineHeight > pageHeight - margin) {
        doc.addPage()
        currentY = margin
        // Reset font after page break
        doc.setFont(fontSettings.bodyFont, "normal")
      }

      doc.text(textLines[lineIndex], x + markerWidth + indent, currentY + 2)
      currentY += lineHeight
    }
  }

  return currentY + 2
}

// Render a code block in PDF
function renderCodeBlock(
  doc: jsPDF,
  codeLines: string[],
  x: number,
  y: number,
  maxWidth: number,
  pageHeight: number,
  margin: number,
  fontSettings: { titleFont: string; bodyFont: string; mixedMode: boolean },
): number {
  const lineHeight = 6 // Consistent line height
  let currentY = y

  // Check if we need a new page
  if (currentY + lineHeight * codeLines.length + 6 > pageHeight - margin) {
    // If the entire code block won't fit, start on a new page
    doc.addPage()
    currentY = margin
  }

  // Draw code block background
  const blockHeight = Math.min(codeLines.length * lineHeight + 6, pageHeight - margin - currentY)
  doc.setFillColor(245, 245, 245)
  doc.rect(x, currentY, maxWidth, blockHeight, "F")

  // Set monospace font for code
  doc.setFontSize(11)
  doc.setFont("courier", "normal") // Use courier for code blocks

  // Draw each line of code
  for (let i = 0; i < codeLines.length; i++) {
    // Check if we need a new page
    if (currentY + lineHeight > pageHeight - margin) {
      // Save the current position in the code block
      const remainingLines = codeLines.slice(i)

      doc.addPage()
      currentY = margin

      // Draw background for the rest of the code block
      const remainingHeight = Math.min(remainingLines.length * lineHeight + 6, pageHeight - margin - currentY)
      doc.setFillColor(245, 245, 245)
      doc.rect(x, currentY, maxWidth, remainingHeight, "F")

      // Reset font after page break
      doc.setFont("courier", "normal")
    }

    doc.text(codeLines[i], x + 3, currentY + 5 + 2)
    currentY += lineHeight
  }

  return currentY + 2
}

// Render a blockquote in PDF
function renderBlockquote(
  doc: jsPDF,
  quoteLines: string[],
  x: number,
  y: number,
  maxWidth: number,
  pageHeight: number,
  margin: number,
  fontSettings: { titleFont: string; bodyFont: string; mixedMode: boolean },
): number {
  const lineHeight = 6 // Consistent line height
  let currentY = y
  let startY = y

  // Check if we need a new page
  if (currentY + lineHeight > pageHeight - margin) {
    doc.addPage()
    currentY = margin
    startY = margin
  }

  // Draw quote bar for the first segment
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(1)

  // Set quote text style - use body font
  doc.setFont(fontSettings.bodyFont, "normal")
  doc.setTextColor(100, 100, 100)

  // Draw each line of the quote
  for (let i = 0; i < quoteLines.length; i++) {
    const line = quoteLines[i]
    const textLines = doc.splitTextToSize(cleanMarkdown(line.trim()), maxWidth - 5)

    for (let j = 0; j < textLines.length; j++) {
      // Check if we need a new page
      if (currentY + lineHeight > pageHeight - margin) {
        // Draw the quote bar for the current segment
        doc.line(x, startY, x, currentY)

        doc.addPage()
        currentY = margin
        startY = margin

        // Reset font and color after page break
        doc.setFont(fontSettings.bodyFont, "normal")
        doc.setTextColor(100, 100, 100)
      }

      doc.text(textLines[j], x + 5, currentY + 2)
      currentY += lineHeight
    }
  }

  // Draw the quote bar for the last segment
  doc.line(x, startY, x, currentY)
  doc.setLineWidth(0.1)

  // Reset text color
  doc.setTextColor(0, 0, 0)

  return currentY + 2
}

// Process markdown content for PDF rendering
function renderMarkdownContent(
  doc: jsPDF,
  content: string,
  x: number,
  y: number,
  maxWidth: number,
  pageHeight: number,
  margin: number,
  keyPointsWidth: number,
  fullWidth: number,
  sectionInfo: { currentSection: number; totalSections: number },
  fontSettings: { titleFont: string; bodyFont: string; mixedMode: boolean },
): number {
  const lines = content.split("\n")
  let currentY = y
  const lineHeight = 6 // Consistent line height

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Check if we need a new page
    if (currentY + lineHeight > pageHeight - margin) {
      doc.addPage()
      currentY = margin

      // Reset text properties after page break to ensure consistency
      doc.setFontSize(11)
      doc.setFont(fontSettings.bodyFont, "normal")
      doc.setTextColor(0, 0, 0)

      // Draw the section divider on the new page
      if (sectionInfo.currentSection < sectionInfo.totalSections - 1) {
        doc.setDrawColor(230, 230, 230)
        doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, pageHeight - margin)
      }
    }

    // Skip empty lines but add spacing
    if (line.trim() === "") {
      currentY += lineHeight / 3 // Reduced spacing for empty lines
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

      currentY = renderTable(doc, tableLines, x, currentY, maxWidth, pageHeight, margin, fontSettings)
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
      currentY = renderCodeBlock(doc, codeLines, x, currentY, maxWidth, pageHeight, margin, fontSettings)
      continue
    }

    // Check for blockquotes
    if (line.trim().startsWith(">")) {
      const quoteLines = []
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].substring(lines[i].indexOf(">") + 1))
        i++
      }

      currentY = renderBlockquote(doc, quoteLines, x, currentY, maxWidth, pageHeight, margin, fontSettings)
      continue
    }

    // Check for unordered lists
    if (line.trim().match(/^[-*]\s/)) {
      const listItems = []
      while (i < lines.length && lines[i].trim().match(/^[-*]\s/)) {
        listItems.push(lines[i].substring(lines[i].indexOf(" ") + 1))
        i++
      }

      currentY = renderList(doc, listItems, x, currentY, maxWidth, false, pageHeight, margin, fontSettings)
      continue
    }

    // Check for ordered lists
    if (line.trim().match(/^\d+\.\s/)) {
      const listItems = []
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
        listItems.push(lines[i].substring(lines[i].indexOf(".") + 1))
        i++
      }

      currentY = renderList(doc, listItems, x, currentY, maxWidth, true, pageHeight, margin, fontSettings)
      continue
    }

    // Check for headings (level 2-6) - use title font for headings
    if (line.trim().match(/^#{2,6}\s/)) {
      const level = line.trim().indexOf(" ")
      const headingText = line.trim().substring(level + 1)

      const originalSize = doc.getFontSize()
      doc.setFontSize(12 - (level - 2)) // Size based on heading level
      doc.setFont(fontSettings.titleFont, "bold")

      const textLines = doc.splitTextToSize(cleanMarkdown(headingText), maxWidth)

      // Check if heading needs to go to next page
      if (currentY + textLines.length * lineHeight + 2 > pageHeight - margin) {
        doc.addPage()
        currentY = margin
        // Reset font after page break
        doc.setFont(fontSettings.titleFont, "bold")
      }

      doc.text(textLines, x, currentY + 2)

      doc.setFont(fontSettings.bodyFont, "normal")
      doc.setFontSize(originalSize)

      currentY += textLines.length * lineHeight + 2
      i++
      continue
    }

    // Check for HTML image tags - skip without placeholder
    if (line.includes("<img") && line.includes("src=")) {
      i++
      continue
    }

    // Check for markdown images - skip without placeholder
    if (line.includes("![") && line.includes("](")) {
      i++
      continue
    }

    // Regular paragraph text - use body font
    doc.setFontSize(11)
    doc.setFont(fontSettings.bodyFont, "normal")
    const textLines = doc.splitTextToSize(cleanMarkdown(line), maxWidth)

    // Process each line of text and check for page breaks
    for (let j = 0; j < textLines.length; j++) {
      // Check if we need a new page
      if (currentY + lineHeight > pageHeight - margin) {
        doc.addPage()
        currentY = margin

        // Reset text properties after page break to ensure consistency
        doc.setFontSize(11)
        doc.setFont(fontSettings.bodyFont, "normal")
        doc.setTextColor(0, 0, 0)

        // Draw the section divider on the new page
        if (sectionInfo.currentSection < sectionInfo.totalSections - 1) {
          doc.setDrawColor(230, 230, 230)
          doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, pageHeight - margin)
        }
      }

      doc.text(textLines[j], x, currentY + 2)
      currentY += lineHeight
    }

    // Add a small gap between paragraphs
    currentY += lineHeight * 0.1
    i++
  }

  return currentY
}

// Add images to PDF
async function addImagesToPdf(
  doc: jsPDF,
  content: string,
  x: number,
  y: number,
  maxWidth: number,
  pageHeight: number,
  margin: number,
  keyPointsWidth: number,
  fullWidth: number,
  sectionInfo: { currentSection: number; totalSections: number },
  fontSettings: { titleFont: string; bodyFont: string; mixedMode: boolean },
): Promise<number> {
  let currentY = y
  const imageMargin = 4
  const maxImageHeight = 60
  const lineHeight = 6

  // Extract all image URLs (both markdown and HTML)
  const htmlImageRegex = /<img.*?src=["'](.*?)["'].*?>/g
  let match
  const imagesToAdd = []

  // Find HTML images (our app primarily uses HTML img tags)
  while ((match = htmlImageRegex.exec(content)) !== null) {
    const src = match[1]
    if (src) {
      imagesToAdd.push({ src })
    }
  }

  // If no images were found, return the current Y position
  if (imagesToAdd.length === 0) {
    return currentY
  }

  // Add each image to the PDF
  for (const image of imagesToAdd) {
    try {
      // Check if we need a new page
      if (currentY + maxImageHeight > pageHeight - margin) {
        doc.addPage()
        currentY = margin

        // Reset text properties after page break
        doc.setFontSize(11)
        doc.setFont(fontSettings.bodyFont, "normal")
        doc.setTextColor(0, 0, 0)

        // Draw the section divider on the new page
        if (sectionInfo.currentSection < sectionInfo.totalSections - 1) {
          doc.setDrawColor(230, 230, 230)
          doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, pageHeight - margin)
        }
      }

      // Skip placeholder images
      if (image.src.includes("/placeholder.svg") || image.src.includes("/generic-placeholder-icon.png")) {
        continue
      }

      // Create an image element to get dimensions
      const img = new Image()
      img.crossOrigin = "anonymous"

      // Check if it's a cornell-image:// URL
      if (image.src.startsWith("cornell-image://")) {
        const imageId = image.src.replace("cornell-image://", "")
        try {
          const imageData = await getImage(imageId)
          if (imageData) {
            image.src = imageData
          } else {
            continue
          }
        } catch (error) {
          console.error("Error loading image from storage:", error)
          continue
        }
      }

      // For data URLs, we can use them directly with jsPDF
      if (image.src.startsWith("data:")) {
        // Get the image format from the data URL
        const format = image.src.split(";")[0].split("/")[1].toUpperCase()
        const validFormat = ["JPEG", "JPG", "PNG"].includes(format) ? format : "JPEG"

        // Calculate dimensions to maintain aspect ratio
        await new Promise<void>((resolve) => {
          img.onload = () => {
            // Calculate dimensions to maintain aspect ratio correctly
            const aspectRatio = img.width / img.height

            // Set a maximum width based on available space
            const imgWidth = Math.min(maxWidth, 150)

            // Calculate height based on the aspect ratio
            const imgHeight = imgWidth / aspectRatio

            // If the height is too large, recalculate width based on max height
            const finalHeight = Math.min(imgHeight, maxImageHeight)
            const finalWidth = finalHeight * aspectRatio

            try {
              // Check if we need a new page for the image
              if (currentY + finalHeight + 10 > pageHeight - margin) {
                doc.addPage()
                currentY = margin

                // Draw the section divider on the new page
                if (sectionInfo.currentSection < sectionInfo.totalSections - 1) {
                  doc.setDrawColor(230, 230, 230)
                  doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, pageHeight - margin)
                }
              }

              // Add the image to the PDF with the correct dimensions
              doc.addImage(image.src, validFormat, x, currentY, finalWidth, finalHeight, undefined, "FAST")

              // Move to the next position
              currentY += finalHeight + imageMargin
            } catch (error) {
              console.error("Error adding image to PDF:", error)
            }

            resolve()
          }
          img.onerror = () => {
            console.error("Error loading image:", image.src)
            resolve()
          }
          img.src = image.src
        })
      }
    } catch (error) {
      console.error("Error processing image:", error)
    }
  }

  return currentY
}
