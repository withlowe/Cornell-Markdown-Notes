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

// Update the getFontSettings function to make serif font slightly larger
function getFontSettings(font: "sans" | "serif" | "mixed"): FontSettings {
  const titleFontSize = 15 // Slightly larger title
  const bodyFontSize = 12 // Base body font size
  const smallFontSize = 10

  // Always use built-in fonts
  console.log("Using built-in fonts for PDF export")
  switch (font) {
    case "serif":
      return {
        titleFont: "times", // Will be overridden to Georgia in setFont function
        bodyFont: "times", // Will be overridden to Georgia in setFont function
        mixedMode: false,
        titleFontSize: titleFontSize + 1, // Slightly larger for serif
        bodyFontSize: bodyFontSize + 0.5, // Slightly larger for serif (12.5)
        smallFontSize,
      }
    case "mixed":
      return {
        titleFont: "helvetica",
        bodyFont: "times", // Will be overridden to Georgia in setFont function
        mixedMode: true,
        titleFontSize,
        bodyFontSize: bodyFontSize + 0.5, // Slightly larger for serif body text in mixed mode
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

// And update the setFont function to handle Georgia and ensure Courier for code blocks:
function setFont(doc: jsPDF, fontName: string, style = "normal") {
  try {
    // Special handling for courier/monospace to ensure code blocks use monospace
    if (fontName.toLowerCase() === "courier") {
      try {
        // Try multiple courier font variations
        doc.setFont("courier", style === "bold" ? "bold" : "normal")
        return
      } catch (error) {
        try {
          doc.setFont("Courier", style === "bold" ? "bold" : "normal")
          return
        } catch (error2) {
          console.warn("Failed to set courier fonts, using helvetica fallback")
          doc.setFont("helvetica", style === "bold" ? "bold" : "normal")
          return
        }
      }
    }

    // Handle Georgia font for serif - map times to Georgia when available
    if (fontName.toLowerCase() === "times") {
      try {
        // Try Georgia first for better serif appearance
        doc.setFont("georgia", style === "bold" ? "bold" : "normal")
        return
      } catch (error) {
        // Fallback to times if Georgia not available
        doc.setFont("times", style === "bold" ? "bold" : "normal")
        return
      }
    }

    // Only use built-in fonts: helvetica, times, courier, georgia
    const safeFont = ["helvetica", "times", "courier", "georgia"].includes(fontName.toLowerCase())
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

      // Add images after the text content - pass the original processed content with images
      const imagesEndY = await addImagesToPdf(
        doc,
        section.content, // Use the section content which still has image tags
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

  // Find all cornell-image:// URLs and load them
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

  // DON'T remove image tags here - we need them for the addImagesToPdf function
  // The renderMarkdownContent function will handle text content separately

  return processedContent
}

// Clean markdown text for rendering
function cleanMarkdown(text: string): string {
  // Remove bold and italic markers but keep the text
  const cleaned = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")

  // For inline code, we'll handle it differently - keep backticks for now
  // This will be processed separately in the text rendering

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

// Fix the renderCodeBlock function to ensure Courier font is properly applied
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
  const lineHeight = 5 // Slightly tighter line height for code
  let currentY = y

  // Check if we need a new page
  if (currentY + lineHeight * codeLines.length + 8 > pageHeight - margin) {
    // If the entire code block won't fit, start on a new page
    doc.addPage()
    currentY = margin
  }

  // Draw code block background with border
  const blockHeight = Math.min(codeLines.length * lineHeight + 8, pageHeight - margin - currentY)
  doc.setFillColor(248, 248, 248) // Light gray background
  doc.setDrawColor(220, 220, 220) // Light border
  doc.setLineWidth(0.5)
  doc.rect(x, currentY, maxWidth, blockHeight, "FD") // Fill and Draw border

  // Set monospace font
  doc.setFontSize(fontSettings.smallFontSize)

  // Force monospace font using the most compatible approach
  try {
    // Try the most reliable monospace font first
    doc.setFont("courier", "normal")
  } catch (error) {
    try {
      // Fallback to Courier New if available
      doc.setFont("CourierNew", "normal")
    } catch (error2) {
      try {
        // Last resort - use times which is more monospace-like than helvetica
        doc.setFont("times", "normal")
      } catch (error3) {
        // Ultimate fallback
        doc.setFont("helvetica", "normal")
      }
    }
  }

  // Set text color to dark for better contrast
  doc.setTextColor(40, 40, 40)

  // Calculate the starting Y position for text within the code block
  let textY = currentY + 6

  // Draw each line of code with proper positioning and preserve whitespace
  for (let i = 0; i < codeLines.length; i++) {
    // Check if we need a new page
    if (textY + lineHeight > pageHeight - margin) {
      // Calculate remaining lines
      const remainingLines = codeLines.slice(i)

      doc.addPage()
      currentY = margin

      // Draw background for the rest of the code block
      const remainingHeight = Math.min(remainingLines.length * lineHeight + 8, pageHeight - margin - currentY)
      doc.setFillColor(248, 248, 248)
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.5)
      doc.rect(x, currentY, maxWidth, remainingHeight, "FD")

      // CRITICAL: Reset monospace font after page break - EXPLICITLY force courier
      doc.setFontSize(fontSettings.smallFontSize)

      try {
        doc.setFont("courier", "normal")
      } catch (error) {
        try {
          doc.setFont("Courier", "normal")
        } catch (error2) {
          doc.setFont("helvetica", "normal")
        }
      }

      doc.setTextColor(40, 40, 40)

      // Reset text Y position for new page
      textY = currentY + 6
    }

    // Draw the code line with proper positioning and preserve whitespace
    const lineText = codeLines[i] || "" // Handle empty lines

    // Use direct text rendering to ensure monospace is preserved
    doc.text(lineText, x + 4, textY)
    textY += lineHeight
  }

  // Calculate the final Y position based on the last drawn line
  const finalY = Math.max(currentY + blockHeight, textY) + 4

  // Reset text color and font back to normal
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(fontSettings.bodyFontSize)
  try {
    setFont(doc, fontSettings.bodyFont, "normal")
  } catch (error) {
    doc.setFont("helvetica", "normal")
  }

  return finalY
}

// Render markdown content with improved formatting
function renderMarkdownContent(
  doc: jsPDF,
  markdownText: string,
  x: number,
  y: number,
  maxWidth: number,
  pageHeight: number,
  margin: number,
  keyPointsWidth: number,
  pageWidth: number,
  sectionInfo: any,
  fontSettings: FontSettings,
): number {
  let currentY = y
  const lineHeight = 6 // Consistent line height
  const indent = 5

  // Remove image tags from the text content to avoid rendering them as text
  const textOnlyContent = markdownText.replace(/<img[^>]*>/g, "")

  // Use body font for content
  doc.setFontSize(fontSettings.bodyFontSize)
  setFont(doc, fontSettings.bodyFont, "normal")

  // Split the markdown into lines
  const lines = textOnlyContent.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines
    if (line === "") {
      currentY += lineHeight / 3
      continue
    }

    // Tables
    if (line.startsWith("|") && line.endsWith("|")) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i])
        i++
      }
      i-- // Adjust for the outer loop increment
      currentY = renderTable(doc, tableLines, x, currentY, maxWidth, pageHeight, margin, fontSettings)
      continue
    }

    // Code blocks
    if (line.startsWith("```")) {
      const codeLines: string[] = []
      i++ // Skip opening \`\`\`
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      currentY = renderCodeBlock(doc, codeLines, x, currentY, maxWidth, pageHeight, margin, fontSettings)
      continue
    }

    // Lists
    if (line.match(/^[-*]\s/) || line.match(/^\d+\.\s/)) {
      const listItems: string[] = []
      const isNumbered = line.match(/^\d+\.\s/) !== null
      while (i < lines.length && (lines[i].trim().match(/^[-*]\s/) || lines[i].trim().match(/^\d+\.\s/))) {
        const listItem = lines[i].replace(/^[-*\d+.]\s+/, "")
        listItems.push(listItem)
        i++
      }
      i-- // Adjust for the outer loop increment
      currentY = renderList(doc, listItems, x, currentY, maxWidth, isNumbered, pageHeight, margin, fontSettings)
      continue
    }

    // Blockquotes
    if (line.startsWith(">")) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].substring(1).trim())
        i++
      }
      i-- // Adjust for the outer loop increment

      // Render blockquote (simplified)
      doc.setFontSize(fontSettings.bodyFontSize - 1)
      setFont(doc, fontSettings.bodyFont, "italic")
      doc.setTextColor(100, 100, 100)

      for (const quoteLine of quoteLines) {
        const textLines = doc.splitTextToSize(quoteLine, maxWidth - indent * 2)

        for (const textLine of textLines) {
          // Check if we need a new page
          if (currentY + lineHeight > pageHeight - margin) {
            doc.addPage()
            currentY = margin
            // Reset font after page break
            setFont(doc, fontSettings.bodyFont, "italic")
          }

          doc.text(textLine, x + indent, currentY + 2)
          currentY += lineHeight
        }
      }

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(fontSettings.bodyFontSize)
      setFont(doc, fontSettings.bodyFont, "normal")
      continue
    }

    // Headings
    if (line.match(/^#{2,6}\s/)) {
      const headingLevel = line.indexOf(" ")
      const headingText = line.substring(headingLevel + 1)

      // Set font size based on heading level
      let fontSize = fontSettings.titleFontSize - (headingLevel - 1) * 1
      fontSize = Math.max(fontSize, fontSettings.bodyFontSize) // Ensure minimum size

      doc.setFontSize(fontSize)
      setFont(doc, fontSettings.titleFont, "bold")

      const textLines = doc.splitTextToSize(headingText, maxWidth)

      for (const textLine of textLines) {
        // Check if we need a new page
        if (currentY + lineHeight > pageHeight - margin) {
          doc.addPage()
          currentY = margin
          // Reset font after page break
          setFont(doc, fontSettings.titleFont, "bold")
        }

        doc.text(textLine, x, currentY + 2)
        currentY += lineHeight * 1.2
      }

      // Reset font size and style
      doc.setFontSize(fontSettings.bodyFontSize)
      setFont(doc, fontSettings.bodyFont, "normal")
      continue
    }

    // Regular text
    const textLines = doc.splitTextToSize(line, maxWidth)

    for (const textLine of textLines) {
      // Check if we need a new page
      if (currentY + lineHeight > pageHeight - margin) {
        doc.addPage()
        currentY = margin
        // Reset font after page break
        setFont(doc, fontSettings.bodyFont, "normal")
      }

      doc.text(textLine, x, currentY + 2)
      currentY += lineHeight
    }
  }

  return currentY
}

// Add images to PDF with proper processing
async function addImagesToPdf(
  doc: jsPDF,
  markdownText: string,
  x: number,
  y: number,
  maxWidth: number,
  pageHeight: number,
  margin: number,
  keyPointsWidth: number,
  pageWidth: number,
  sectionInfo: any,
  fontSettings: FontSettings,
): Promise<number> {
  let currentY = y

  // Find all image tags in the original content (before HTML removal)
  const imageRegex = /<img[^>]*src=["'](.*?)["'][^>]*(?:alt=["'](.*?)["'])?[^>]*>/g
  const matches = [...markdownText.matchAll(imageRegex)]

  for (const match of matches) {
    const imageUrl = match[1]
    const altText = match[2] || "Image"

    if (imageUrl && !imageUrl.includes("/placeholder.svg") && !imageUrl.includes("/generic-placeholder-icon.png")) {
      try {
        let imageData = imageUrl

        // Handle cornell-image:// URLs by loading from storage
        if (imageUrl.startsWith("cornell-image://")) {
          const imageId = imageUrl.replace("cornell-image://", "")
          const storedImage = await getImage(imageId)
          if (storedImage) {
            imageData = storedImage
          } else {
            console.warn(`Image not found in storage: ${imageId}`)
            continue
          }
        }

        // Skip if not a data URL or valid image URL
        if (!imageData.startsWith("data:") && !imageData.startsWith("http")) {
          continue
        }

        // Create image element to get dimensions
        const img = new Image()
        img.crossOrigin = "anonymous"

        await new Promise((resolve, reject) => {
          img.onload = () => resolve(null)
          img.onerror = (e) => reject(e)
          img.src = imageData
        })

        const imgWidth = img.width
        const imgHeight = img.height

        // Calculate the aspect ratio
        const aspectRatio = imgWidth / imgHeight

        // Calculate dimensions to fit within maxWidth
        let displayWidth = maxWidth
        let displayHeight = displayWidth / aspectRatio

        // If height is too large, scale down based on height
        const maxImageHeight = 80 // Maximum height in mm
        if (displayHeight > maxImageHeight) {
          displayHeight = maxImageHeight
          displayWidth = displayHeight * aspectRatio
        }

        // Check if we need a new page before adding the image
        if (currentY + displayHeight + 10 > pageHeight - margin) {
          doc.addPage()
          currentY = margin
        }

        // Add some space before the image
        currentY += 5

        // Add the image to the PDF
        try {
          doc.addImage(imageData, "JPEG", x, currentY, displayWidth, displayHeight)

          // Add alt text below the image if it exists and is meaningful
          if (altText && altText !== "Image" && altText.length > 0) {
            currentY += displayHeight + 3

            // Check if we need a new page for the caption
            if (currentY + 6 > pageHeight - margin) {
              doc.addPage()
              currentY = margin
            }

            doc.setFontSize(fontSettings.smallFontSize)
            doc.setTextColor(100, 100, 100)
            setFont(doc, fontSettings.bodyFont, "italic")

            const captionLines = doc.splitTextToSize(`Figure: ${altText}`, maxWidth)
            for (let i = 0; i < captionLines.length; i++) {
              doc.text(captionLines[i], x, currentY)
              currentY += 5
            }

            // Reset font
            doc.setTextColor(0, 0, 0)
            doc.setFontSize(fontSettings.bodyFontSize)
            setFont(doc, fontSettings.bodyFont, "normal")
          } else {
            currentY += displayHeight
          }

          // Add some space after the image
          currentY += 5
        } catch (imageError) {
          console.error(`Error adding image to PDF:`, imageError)
          // Add a placeholder text instead
          doc.setFontSize(fontSettings.smallFontSize)
          doc.setTextColor(150, 150, 150)
          doc.text(`[Image: ${altText}]`, x, currentY)
          doc.setTextColor(0, 0, 0)
          doc.setFontSize(fontSettings.bodyFontSize)
          currentY += 8
        }
      } catch (error) {
        console.error(`Error processing image ${imageUrl} for PDF:`, error)
        // Add a placeholder text for failed images
        doc.setFontSize(fontSettings.smallFontSize)
        doc.setTextColor(150, 150, 150)
        doc.text(`[Image could not be loaded: ${altText}]`, x, currentY)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(fontSettings.bodyFontSize)
        currentY += 8
      }
    }
  }

  return currentY
}
