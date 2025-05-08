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
      i++ // Skip the opening ```

      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }

      i++ // Skip the closing ```
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

    // Regular paragraph text
    const textLines = doc.splitTextToSize(cleanMarkdown(line), maxWidth)
    doc.text(textLines, x, currentY)
    currentY += textLines.length * lineHeight
    i++
  }

  return currentY
}

// Export to PDF with improved markdown rendering
export async function exportToPdf(title: string, summary: string, markdown: string): Promise<void> {
  const sections = parseMarkdown(markdown)

  // Create a new PDF document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  // Set title
  doc.setFontSize(16)
  doc.text(title, 15, 15)

  // Add summary if provided
  let y = 25 // Increased spacing after title
  if (summary) {
    doc.setFontSize(10)
    doc.text("Summary:", 15, y)
    y += 7 // Increased spacing before summary content

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

  sections.forEach((section, index) => {
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

    // Calculate section height
    const sectionHeight = Math.max(headingHeight, contentEndY - y)

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
  })

  // Generate the PDF as a blob
  const pdfBlob = doc.output("blob")

  // Download the PDF
  downloadBlob(pdfBlob, `${title.replace(/\s+/g, "-").toLowerCase()}.pdf`)
}
