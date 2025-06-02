import { jsPDF } from "jspdf"
import { getImage } from "./image-storage"
import { extractNoteLinks } from "./link-utils"

interface Section {
  heading: string
  content: string
}

interface FontSettings {
  titleFont: string
  bodyFont: string
  mixedMode: boolean
  titleFontSize: number
  bodyFontSize: number
  smallFontSize: number
}

// Replace the entire loadCustomFonts function with this simplified version that doesn't attempt to load custom fonts
async function loadCustomFonts(doc: jsPDF): Promise<boolean> {
  console.log("Custom font loading disabled - using built-in fonts only")
  return false
}

// Replace the getFontSettings function with this simplified version that only uses built-in fonts
function getFontSettings(font: "sans" | "serif" | "mixed"): FontSettings {
  const titleFontSize = 14
  const bodyFontSize = 11 // Declare the variable
  const smallFontSize = 10

  // Always use built-in jsPDF fonts
  console.log("Using built-in fonts for PDF export")
  switch (font) {
    case "serif":
      return {
        titleFont: "times",
        bodyFont: "times",
        mixedMode: false,
        titleFontSize,
        bodyFontSize,
        smallFontSize,
      }
    case "mixed":
      return {
        titleFont: "helvetica",
        bodyFont: "times",
        mixedMode: true,
        titleFontSize,
        bodyFontSize,
        smallFontSize,
      }
    case "sans":
    default:
      return {
        titleFont: "helvetica",
        bodyFont: "helvetica",
        mixedMode: false,
        titleFontSize,
        bodyFontSize,
        smallFontSize,
      }
  }
}

// Replace the setFont function with this simplified version
function setFont(doc: jsPDF, fontName: string, style = "normal") {
  try {
    // Only use built-in fonts: helvetica, times, courier
    const safeFont = ["helvetica", "times", "courier"].includes(fontName.toLowerCase())
      ? fontName.toLowerCase()
      : "helvetica"

    doc.setFont(safeFont, style === "bold" ? "bold" : "normal")
  } catch (error) {
    console.warn(`Failed to set font ${fontName}, falling back to helvetica:`, error)
    doc.setFont("helvetica", style === "bold" ? "bold" : "normal")
  }
}

// Function to estimate section height
function estimateSectionHeight(section: Section, fontSettings: FontSettings, maxWidth: number): number {
  const lines = section.content.split("\n")
  const lineHeight = 6
  let estimatedHeight = 0

  // Add heading height
  const headingLines = Math.ceil(section.heading.length / 30) // Rough estimate
  estimatedHeight += headingLines * lineHeight + 10

  // Estimate content height
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line === "") {
      estimatedHeight += lineHeight / 3
      continue
    }

    // Tables
    if (line.startsWith("|") && line.endsWith("|")) {
      let tableRows = 0
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableRows++
        i++
      }
      i-- // Adjust for the outer loop increment
      estimatedHeight += tableRows * 8 + 10 // 8mm per row + padding
      continue
    }

    // Code blocks
    if (line.startsWith("```")) {
      let codeLines = 0
      i++ // Skip opening \`\`\`
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines++
        i++
      }
      estimatedHeight += codeLines * lineHeight + 10
      continue
    }

    // Lists
    if (line.match(/^[-*]\s/) || line.match(/^\d+\.\s/)) {
      let listItems = 0
      while (i < lines.length && (lines[i].trim().match(/^[-*]\s/) || lines[i].trim().match(/^\d+\.\s/))) {
        listItems++
        i++
      }
      i-- // Adjust for the outer loop increment
      estimatedHeight += listItems * lineHeight + 5
      continue
    }

    // Blockquotes
    if (line.startsWith(">")) {
      let quoteLines = 0
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines++
        i++
      }
      i-- // Adjust for the outer loop increment
      estimatedHeight += quoteLines * lineHeight + 5
      continue
    }

    // Headings
    if (line.match(/^#{2,6}\s/)) {
      estimatedHeight += lineHeight * 1.5 + 5
      continue
    }

    // Regular text - estimate based on character count and width
    const textLines = Math.ceil(line.length / 80) // Rough estimate of characters per line
    estimatedHeight += textLines * lineHeight + 2
  }

  // Add some padding for images (rough estimate)
  const imageCount = (section.content.match(/<img/g) || []).length
  estimatedHeight += imageCount * 40 // Rough estimate for images

  return estimatedHeight
}

// Export the main function that will be used in other files
export async function exportToPdf(
  title: string,
  summary: string,
  markdown: string,
  font: "sans" | "serif" | "mixed" = "sans",
): Promise<void> {
  try {
    console.log("Starting PDF export...")

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

    // Skip custom font loading and use built-in fonts only
    await loadCustomFonts(doc) // Just for logging
    const fontSettings = getFontSettings(font)

    console.log("Font settings:", fontSettings)

    // Set title - using website typography
    doc.setFontSize(24) // Larger title to match website
    setFont(doc, fontSettings.titleFont, "bold")
    doc.text(title, 15, 20)

    // Add summary if provided - use body font with proper sizing
    let y = 30
    if (summary) {
      doc.setFontSize(fontSettings.bodyFontSize)
      setFont(doc, fontSettings.bodyFont, "normal")
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

      // Estimate section height
      const estimatedSectionHeight = estimateSectionHeight(section, fontSettings, contentWidth - 10)
      const availableSpace = pageHeight - margin - y

      // Only start a new page if the section won't fit on the current page
      // and we're not already at the top of a page
      if (y > margin + 20 && estimatedSectionHeight > availableSpace) {
        console.log(
          `Section "${section.heading}" estimated height: ${estimatedSectionHeight}mm, available space: ${availableSpace}mm - starting new page`,
        )
        doc.addPage()
        y = margin
        y += 8
      }

      const startY = y
      const startPage = doc.getCurrentPageInfo().pageNumber

      // Draw key point (heading) with title font
      doc.setFontSize(fontSettings.bodyFontSize)
      setFont(doc, fontSettings.titleFont, "bold")
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

      // Draw content with improved markdown rendering
      doc.setFontSize(fontSettings.bodyFontSize)
      setFont(doc, fontSettings.bodyFont, "normal")
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

      // Add images after the text content - NOW WITH FULL WIDTH
      const imagesEndY = await addImagesToPdf(
        doc,
        section.content,
        contentStartX,
        contentEndY + 3,
        contentWidth - 10, // Full available width for images
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

        // Draw the key point heading on the continuation page
        doc.setFontSize(fontSettings.bodyFontSize)
        setFont(doc, fontSettings.titleFont, "bold")
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

      // Add related links section - use title font for heading
      doc.setFontSize(fontSettings.titleFontSize)
      setFont(doc, fontSettings.titleFont, "bold")
      doc.text("Related Notes", margin, currentY)

      currentY += 8
      currentY += 2

      // List all the note links - use body font for content
      doc.setFontSize(fontSettings.bodyFontSize)
      setFont(doc, fontSettings.bodyFont, "normal")
      for (let i = 0; i < noteLinks.length; i++) {
        const link = noteLinks[i]

        // Check if we need a new page
        if (currentY + 6 > pageHeight - margin) {
          doc.addPage()
          currentY = margin
          // Reset font after page break
          setFont(doc, fontSettings.bodyFont, "normal")
        }

        // Add bullet point and link text
        doc.text(`• ${link}`, margin + 5, currentY)
        currentY += 6 // Consistent line height
      }
    }

    console.log("PDF generation completed successfully")

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
  fontSettings: FontSettings,
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
  doc.setFontSize(fontSettings.bodyFontSize - 1)

  setFont(doc, "helvetica", "bold")

  // Pre-calculate header height by checking all header cells
  let maxHeaderHeight = rowHeight
  const headerLinesArray: string[][] = []

  // Pre-process all header cells to determine header row height
  columns.forEach((col, colIndex) => {
    const colText = cleanMarkdown(col)
    const headerLines = doc.splitTextToSize(colText, columnWidth - cellPadding * 2)
    headerLinesArray.push(headerLines)

    // Calculate height needed for this header cell
    const headerCellHeight = Math.max(rowHeight, headerLines.length * 6 + cellPadding)
    maxHeaderHeight = Math.max(maxHeaderHeight, headerCellHeight)
  })

  // Now draw the header cells with the calculated height
  let currentX = x
  headerLinesArray.forEach((headerLines, colIndex) => {
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

    // Calculate vertical position for text (top-aligned within header cell)
    const lineHeight = 6 // Consistent line height
    const textY = currentY + cellPadding

    // Draw each line of header text
    for (let i = 0; i < headerLines.length; i++) {
      doc.text(headerLines[i], textX, textY + i * lineHeight, {
        align: textAlign,
        baseline: "top",
      })
    }

    currentX += columnWidth
  })

  // Switch to body font for table content
  setFont(doc, "helvetica", "normal")
  doc.setFontSize(fontSettings.bodyFontSize - 1)

  currentY += maxHeaderHeight

  // Draw header separator - minimal line
  doc.setDrawColor(200, 200, 200)
  doc.line(x, currentY, x + totalWidth, currentY)

  // Draw content rows
  for (let rowIndex = 0; rowIndex < contentRows.length; rowIndex++) {
    const row = contentRows[rowIndex]

    const cells = row
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim())

    // Calculate the height needed for this row by checking all cells
    let maxCellHeight = rowHeight
    const cellLinesArray: string[][] = []

    // Pre-process all cells to determine row height
    cells.forEach((cell, colIndex) => {
      if (colIndex < columns.length) {
        const cellText = cleanMarkdown(cell)
        const cellLines = doc.splitTextToSize(cellText, columnWidth - cellPadding * 2)
        cellLinesArray.push(cellLines)

        // Calculate height needed for this cell
        const cellHeight = Math.max(rowHeight, cellLines.length * 6 + cellPadding)
        maxCellHeight = Math.max(maxCellHeight, cellHeight)
      }
    })

    // Check if we need a new page before drawing this row
    if (currentY + maxCellHeight > pageHeight - margin) {
      doc.addPage()
      currentY = margin

      // Redraw header on new page
      doc.setFontSize(fontSettings.bodyFontSize - 1)

      setFont(doc, "helvetica", "bold")

      // Pre-calculate header height for the new page
      let maxHeaderHeight = rowHeight
      const headerLinesArray: string[][] = []

      // Pre-process all header cells to determine header row height
      columns.forEach((col, colIndex) => {
        const colText = cleanMarkdown(col)
        const headerLines = doc.splitTextToSize(colText, columnWidth - cellPadding * 2)
        headerLinesArray.push(headerLines)

        // Calculate height needed for this header cell
        const headerCellHeight = Math.max(rowHeight, headerLines.length * 6 + cellPadding)
        maxHeaderHeight = Math.max(maxHeaderHeight, headerCellHeight)
      })

      currentX = x
      headerLinesArray.forEach((headerLines, colIndex) => {
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

        // Calculate vertical position for text (top-aligned within header cell)
        const lineHeight = 6 // Consistent line height
        const textY = currentY + cellPadding

        // Draw each line of header text
        for (let i = 0; i < headerLines.length; i++) {
          doc.text(headerLines[i], textX, textY + i * lineHeight, {
            align: textAlign,
            baseline: "top",
          })
        }

        currentX += columnWidth
      })

      setFont(doc, "helvetica", "normal")
      doc.setFontSize(fontSettings.bodyFontSize - 1)

      currentY += maxHeaderHeight

      // Redraw header separator - minimal line
      doc.setDrawColor(200, 200, 200)
      doc.line(x, currentY, x + totalWidth, currentY)
    }

    // Now draw the actual row content
    currentX = x

    cellLinesArray.forEach((cellLines, colIndex) => {
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

        // Calculate vertical position for text (top-aligned within cell)
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

    // Move to next row using the calculated row height
    currentY += maxCellHeight

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
  fontSettings: FontSettings,
): number {
  let currentY = y
  const lineHeight = 6 // Consistent line height
  const indent = 5

  // Use body font for list content
  doc.setFontSize(fontSettings.bodyFontSize)
  setFont(doc, fontSettings.bodyFont, "normal")

  for (let index = 0; index < listItems.length; index++) {
    const item = listItems[index]

    // Check if we need a new page
    if (currentY + lineHeight > pageHeight - margin) {
      doc.addPage()
      currentY = margin
      // Reset font after page break
      setFont(doc, fontSettings.bodyFont, "normal")
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
        setFont(doc, fontSettings.bodyFont, "normal")
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
  fontSettings: FontSettings,
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
  doc.setFontSize(fontSettings.smallFontSize)
  setFont(doc, "courier", "normal") // Keep courier for code blocks

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
      setFont(doc, "courier", "normal")
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
  fontSettings: FontSettings,
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
  doc.setFontSize(fontSettings.bodyFontSize)
  setFont(doc, fontSettings.bodyFont, "normal")
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
        setFont(doc, fontSettings.bodyFont, "normal")
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
  fontSettings: FontSettings,
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
      doc.setFontSize(fontSettings.bodyFontSize)
      setFont(doc, fontSettings.bodyFont, "normal")
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

      // If table would overflow to next page, start it on a new page
      const estimatedTableHeight = tableLines.length * lineHeight * 1.5
      if (currentY > margin + 20 && currentY + estimatedTableHeight > pageHeight - margin) {
        doc.addPage()
        currentY = margin

        // Reset text properties
        doc.setFontSize(fontSettings.bodyFontSize)
        setFont(doc, fontSettings.bodyFont, "normal")

        // Draw the section divider on the new page
        if (sectionInfo.currentSection < sectionInfo.totalSections - 1) {
          doc.setDrawColor(230, 230, 230)
          doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, pageHeight - margin)
        }
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

      // If code block would overflow to next page, start it on a new page
      const estimatedCodeHeight = codeLines.length * lineHeight + 10
      if (currentY > margin + 20 && currentY + estimatedCodeHeight > pageHeight - margin) {
        doc.addPage()
        currentY = margin

        // Reset text properties
        doc.setFontSize(fontSettings.bodyFontSize)
        setFont(doc, fontSettings.bodyFont, "normal")

        // Draw the section divider on the new page
        if (sectionInfo.currentSection < sectionInfo.totalSections - 1) {
          doc.setDrawColor(230, 230, 230)
          doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, pageHeight - margin)
        }
      }

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

      // If blockquote would overflow to next page, start it on a new page
      const estimatedQuoteHeight = quoteLines.length * lineHeight + 6
      if (currentY > margin + 20 && currentY + estimatedQuoteHeight > pageHeight - margin) {
        doc.addPage()
        currentY = margin

        // Reset text properties
        doc.setFontSize(fontSettings.bodyFontSize)
        setFont(doc, fontSettings.bodyFont, "normal")

        // Draw the section divider on the new page
        if (sectionInfo.currentSection < sectionInfo.totalSections - 1) {
          doc.setDrawColor(230, 230, 230)
          doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, pageHeight - margin)
        }
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

      // If list would overflow to next page, start it on a new page
      const estimatedListHeight = listItems.length * lineHeight + 6
      if (currentY > margin + 20 && currentY + estimatedListHeight > pageHeight - margin) {
        doc.addPage()
        currentY = margin

        // Reset text properties
        doc.setFontSize(fontSettings.bodyFontSize)
        setFont(doc, fontSettings.bodyFont, "normal")

        // Draw the section divider on the new page
        if (sectionInfo.currentSection < sectionInfo.totalSections - 1) {
          doc.setDrawColor(230, 230, 230)
          doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, pageHeight - margin)
        }
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

      // If list would overflow to next page, start it on a new page
      const estimatedListHeight = listItems.length * lineHeight + 6
      if (currentY > margin + 20 && currentY + estimatedListHeight > pageHeight - margin) {
        doc.addPage()
        currentY = margin

        // Reset text properties
        doc.setFontSize(fontSettings.bodyFontSize)
        setFont(doc, fontSettings.bodyFont, "normal")

        // Draw the section divider on the new page
        if (sectionInfo.currentSection < sectionInfo.totalSections - 1) {
          doc.setDrawColor(230, 230, 230)
          doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, pageHeight - margin)
        }
      }

      currentY = renderList(doc, listItems, x, currentY, maxWidth, true, pageHeight, margin, fontSettings)
      continue
    }

    // Check for headings (level 2-6) - use title font for headings
    if (line.trim().match(/^#{2,6}\s/)) {
      const level = line.trim().indexOf(" ")
      const headingText = line.trim().substring(level + 1)

      // Always start headings on a new page if not at the top of the page
      if (currentY > margin + 20) {
        doc.addPage()
        currentY = margin

        // Reset text properties
        doc.setFontSize(fontSettings.bodyFontSize)
        setFont(doc, fontSettings.bodyFont, "normal")

        // Draw the section divider on the new page
        if (sectionInfo.currentSection < sectionInfo.totalSections - 1) {
          doc.setDrawColor(230, 230, 230)
          doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, pageHeight - margin)
        }
      }

      // Use title font and appropriate sizing for headings
      const headingSize = Math.max(fontSettings.titleFontSize - (level - 2) * 2, fontSettings.bodyFontSize)
      doc.setFontSize(headingSize)
      setFont(doc, fontSettings.titleFont, "bold")

      const textLines = doc.splitTextToSize(cleanMarkdown(headingText), maxWidth)
      doc.text(textLines, x, currentY + 2)

      setFont(doc, fontSettings.bodyFont, "normal")
      doc.setFontSize(fontSettings.bodyFontSize)

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

    // Regular paragraph text - use body font with consistent sizing
    doc.setFontSize(fontSettings.bodyFontSize)
    setFont(doc, fontSettings.bodyFont, "normal")
    const textLines = doc.splitTextToSize(cleanMarkdown(line), maxWidth)

    // Process each line of text and check for page breaks
    for (let j = 0; j < textLines.length; j++) {
      // Check if we need a new page
      if (currentY + lineHeight > pageHeight - margin) {
        doc.addPage()
        currentY = margin

        // Reset text properties after page break to ensure consistency
        doc.setFontSize(fontSettings.bodyFontSize)
        setFont(doc, fontSettings.bodyFont, "normal")
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

// Add images to PDF - FIXED TO USE FULL WIDTH
async function addImagesToPdf(
  doc: jsPDF,
  content: string,
  x: number,
  y: number,
  maxWidth: number, // This is the full available width for the notes column
  pageHeight: number,
  margin: number,
  keyPointsWidth: number,
  fullWidth: number,
  sectionInfo: { currentSection: number; totalSections: number },
  fontSettings: FontSettings,
): Promise<number> {
  let currentY = y
  const imageMargin = 4
  const maxImageHeight = 80 // Increased max height for better visibility
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
        doc.setFontSize(fontSettings.bodyFontSize)
        setFont(doc, fontSettings.bodyFont, "normal")
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
            // Calculate dimensions to use FULL WIDTH of notes column
            const aspectRatio = img.width / img.height

            // Use the FULL available width (maxWidth is already the full notes column width)
            const imgWidth = maxWidth

            // Calculate height based on the aspect ratio
            const imgHeight = imgWidth / aspectRatio

            // Only constrain by height if it would be too tall
            const finalHeight = Math.min(imgHeight, maxImageHeight)
            const finalWidth = finalHeight === imgHeight ? imgWidth : finalHeight * aspectRatio

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

              // Add the image to the PDF using FULL WIDTH
              doc.addImage(image.src, validFormat, x, currentY, finalWidth, finalHeight, undefined, "FAST")

              console.log(`Added image to PDF: width=${finalWidth}mm, height=${finalHeight}mm, maxWidth=${maxWidth}mm`)

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
