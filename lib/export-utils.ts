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
  // Consistent sizes across all font styles - slightly smaller than before
  const titleFontSize = 14 // Reduced from varying sizes (14.5-16)
  const bodyFontSize = 11 // Reduced from varying sizes (11.5-12.5)
  const smallFontSize = 9 // Reduced from 10

  // Always use built-in fonts
  console.log("Using built-in fonts for PDF export")
  switch (font) {
    case "serif":
      return {
        titleFont: "times", // Will be overridden to Georgia in setFont function
        bodyFont: "times", // Will be overridden to Georgia in setFont function
        mixedMode: false,
        titleFontSize, // Now consistent 14
        bodyFontSize, // Now consistent 11
        smallFontSize, // Now consistent 9
      }
    case "mixed":
      return {
        titleFont: "helvetica",
        bodyFont: "times", // Will be overridden to Georgia in setFont function
        mixedMode: true,
        titleFontSize, // Now consistent 14
        bodyFontSize, // Now consistent 11
        smallFontSize, // Now consistent 9
      }
    case "sans":
    default:
      return {
        titleFont: "helvetica",
        bodyFont: "helvetica",
        mixedMode: false,
        titleFontSize, // Now consistent 14
        bodyFontSize, // Now consistent 11
        smallFontSize, // Now consistent 9
      }
  }
}

// And update the setFont function to handle Georgia and ensure Courier for code blocks:
function setFont(doc: jsPDF, fontName: string, style = "normal") {
  try {
    // Special handling for courier/monospace to ensure code blocks use monospace
    if (fontName.toLowerCase() === "courier") {
      try {
        // Try multiple courier font variations with proper italic support
        if (style === "italic") {
          doc.setFont("courier", "italic")
        } else if (style === "bold") {
          doc.setFont("courier", "bold")
        } else if (style === "bolditalic") {
          doc.setFont("courier", "bolditalic")
        } else {
          doc.setFont("courier", "normal")
        }
        return
      } catch (error) {
        try {
          if (style === "italic") {
            doc.setFont("Courier", "italic")
          } else if (style === "bold") {
            doc.setFont("Courier", "bold")
          } else if (style === "bolditalic") {
            doc.setFont("Courier", "bolditalic")
          } else {
            doc.setFont("Courier", "normal")
          }
          return
        } catch (error2) {
          console.warn("Failed to set courier fonts, using helvetica fallback")
          if (style === "italic") {
            doc.setFont("helvetica", "italic")
          } else if (style === "bold") {
            doc.setFont("helvetica", "bold")
          } else if (style === "bolditalic") {
            doc.setFont("helvetica", "bolditalic")
          } else {
            doc.setFont("helvetica", "normal")
          }
          return
        }
      }
    }

    // Handle Georgia font for serif - map times to Georgia when available
    if (fontName.toLowerCase() === "times") {
      try {
        // Try Georgia first for better serif appearance
        if (style === "italic") {
          doc.setFont("georgia", "italic")
        } else if (style === "bold") {
          doc.setFont("georgia", "bold")
        } else if (style === "bolditalic") {
          doc.setFont("georgia", "bolditalic")
        } else {
          doc.setFont("georgia", "normal")
        }
        return
      } catch (error) {
        // Fallback to times if Georgia not available
        if (style === "italic") {
          doc.setFont("times", "italic")
        } else if (style === "bold") {
          doc.setFont("times", "bold")
        } else if (style === "bolditalic") {
          doc.setFont("times", "bolditalic")
        } else {
          doc.setFont("times", "normal")
        }
        return
      }
    }

    // Only use built-in fonts: helvetica, times, courier, georgia
    const safeFont = ["helvetica", "times", "courier", "georgia"].includes(fontName.toLowerCase())
      ? fontName.toLowerCase()
      : "helvetica"

    if (style === "italic") {
      doc.setFont(safeFont, "italic")
    } else if (style === "bold") {
      doc.setFont(safeFont, "bold")
    } else if (style === "bolditalic") {
      doc.setFont(safeFont, "bolditalic")
    } else {
      doc.setFont(safeFont, "normal")
    }
  } catch (error) {
    console.warn(`Failed to set font ${fontName} with style ${style}, falling back to helvetica:`, error)
    if (style === "italic") {
      doc.setFont("helvetica", "italic")
    } else if (style === "bold") {
      doc.setFont("helvetica", "bold")
    } else if (style === "bolditalic") {
      doc.setFont("helvetica", "bolditalic")
    } else {
      doc.setFont("helvetica", "normal")
    }
  }
}

// Function to estimate section height - more conservative for better space utilization
function estimateSectionHeight(section: Section, fontSettings: FontSettings, maxWidth: number): number {
  const lines = section.content.split("\n")
  const lineHeight = 6
  let estimatedHeight = 0

  // Add heading height (conservative estimate)
  const headingLines = Math.ceil(section.heading.length / 30) // Conservative character count
  estimatedHeight += headingLines * lineHeight + 6 // Reduced padding

  // Count actual content lines more accurately
  let contentLines = 0
  let hasImages = false
  let hasCodeBlocks = false
  let hasTables = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line === "") {
      contentLines += 0.2 // Minimal space for empty lines
      continue
    }

    // Images - just count them, don't estimate height here
    if (line.includes("<img")) {
      hasImages = true
      continue
    }

    // Tables - more accurate estimation
    if (line.startsWith("|") && line.endsWith("|")) {
      hasTables = true
      let tableRows = 0
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableRows++
        i++
      }
      i-- // Adjust for the outer loop increment
      contentLines += tableRows * 1.2 // More conservative table estimation
      continue
    }

    // Code blocks
    if (line.startsWith("```")) {
      hasCodeBlocks = true
      let codeLines = 0
      i++ // Skip opening \`\`\`
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines++
        i++
      }
      contentLines += codeLines * 0.8 + 1.5 // More conservative code block estimation
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
      contentLines += listItems * 1.1 // Conservative list estimation
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
      contentLines += quoteLines * 1.1
      continue
    }

    // Headings
    if (line.match(/^#{2,6}\s/)) {
      contentLines += 1.5 // Conservative heading height
      continue
    }

    // Regular text - conservative estimation
    const avgCharsPerLine = 75 // Conservative estimate
    const textLines = Math.ceil(line.length / avgCharsPerLine)
    contentLines += textLines
  }

  // Convert content lines to height
  estimatedHeight += contentLines * lineHeight

  // Add conservative estimates for special content
  if (hasImages) {
    const imageCount = (section.content.match(/<img/g) || []).length
    estimatedHeight += imageCount * 30 // Conservative image height
  }

  if (hasCodeBlocks) {
    estimatedHeight += 10 // Extra padding for code blocks
  }

  if (hasTables) {
    estimatedHeight += 8 // Extra padding for tables
  }

  // Minimal buffer
  estimatedHeight += 5

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

      // Skip sections with empty content or only whitespace
      if (!section.content.trim() || section.content.replace(/<img[^>]*>/g, "").trim() === "") {
        continue
      }

      // More flexible page break logic - prioritize space utilization
      const estimatedSectionHeight = estimateSectionHeight(section, fontSettings, contentWidth - 10)
      const availableSpace = pageHeight - margin - y

      // Calculate how much of the section would fit on current page
      const wouldFitPercentage = availableSpace / estimatedSectionHeight

      // Only start a new page if:
      // 1. We're not already at the top of a page (y > margin + 40)
      // 2. AND one of these conditions is met:
      //    a) Very large section (>80mm) with very little space (<25% fit)
      //    b) Medium section (>50mm) with little space (<20% fit)
      //    c) Any section with extremely little space (<15% fit) and available space < 40mm
      const isAtTopOfPage = y <= margin + 40
      const isVeryLargeSection = estimatedSectionHeight > 80 && wouldFitPercentage < 0.25
      const isMediumSectionWithLittleSpace = estimatedSectionHeight > 50 && wouldFitPercentage < 0.2
      const isAnyContentWithTinySpace = wouldFitPercentage < 0.15 && availableSpace < 40

      const shouldBreakPage =
        !isAtTopOfPage && (isVeryLargeSection || isMediumSectionWithLittleSpace || isAnyContentWithTinySpace)

      if (shouldBreakPage) {
        console.log(
          `Section "${section.heading}" estimated height: ${estimatedSectionHeight}mm, available space: ${availableSpace}mm, fit percentage: ${(wouldFitPercentage * 100).toFixed(1)}% - starting new page`,
        )
        doc.addPage()
        y = margin + 8
      }

      const startY = y
      const startPage = doc.getCurrentPageInfo().pageNumber

      // Draw key point (heading) with title font
      doc.setFontSize(fontSettings.bodyFontSize)
      setFont(doc, fontSettings.titleFont, "bold")
      const headingLines = doc.splitTextToSize(section.heading, keyPointsWidth - 10)

      const headingLineHeight = 6 // Consistent line height
      const headingTextStartY = y + 5 + 2 // This is where the heading text actually starts
      for (let i = 0; i < headingLines.length; i++) {
        doc.text(headingLines[i], margin + 5, headingTextStartY + i * headingLineHeight)
      }

      // Calculate the actual height of the heading
      const headingHeight = headingLines.length * headingLineHeight + 5

      // Content area - align with the baseline of the first line of heading text
      const contentStartX = margin + keyPointsWidth + 5
      const contentStartY = headingTextStartY // Same baseline as the heading text

      // Pass section info and font settings to the rendering functions
      const sectionInfo = {
        currentSection: index,
        totalSections: sections.length,
      }

      // Draw content with improved markdown rendering - now includes images inline
      doc.setFontSize(fontSettings.bodyFontSize)
      setFont(doc, fontSettings.bodyFont, "normal")
      const contentEndY = await renderMarkdownContentWithImages(
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

      // Store section boundary information for proper line drawing
      const endPage = doc.getCurrentPageInfo().pageNumber
      sectionBoundaries.push({
        index,
        startY,
        startPage,
        endY: contentEndY,
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
          const endY = pageNum === endPage ? contentEndY : pageHeight - margin
          doc.line(margin + keyPointsWidth, startY, margin + keyPointsWidth, endY)
        } else if (pageNum === endPage) {
          doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, contentEndY)
        } else {
          doc.line(margin + keyPointsWidth, margin, margin + keyPointsWidth, pageHeight - margin)
        }
      }

      // Set back to the last page
      doc.setPage(endPage)

      // Update y position for next section
      y = contentEndY + 0.5
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

        // Add "(continued)" text in smaller, italic font
        doc.setFontSize(fontSettings.smallFontSize)
        setFont(doc, fontSettings.titleFont, "italic")
        doc.text("(continued)", margin + 5, margin + 5 + headingLines.length * headingLineHeight + 4)
        setFont(doc, fontSettings.titleFont, "bold")
        doc.setFontSize(fontSettings.bodyFontSize)
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

  return processedContent
}

// Process markdown formatting and return segments with formatting info
function processMarkdownFormatting(
  text: string,
): Array<{ text: string; bold?: boolean; italic?: boolean; code?: boolean }> {
  const segments: Array<{ text: string; bold?: boolean; italic?: boolean; code?: boolean }> = []
  let currentIndex = 0

  // Find all formatting markers in order
  const markers = []

  // Bold markers (**text** or __text__)
  let boldMatch
  const boldRegex = /(\*\*|__)([^*_]+)\1/g
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    markers.push({
      start: boldMatch.index,
      end: boldMatch.index + boldMatch[0].length,
      text: boldMatch[2],
      type: "bold",
    })
  }

  // Italic markers (*text* or _text_)
  let italicMatch
  const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)/g
  while ((italicMatch = italicRegex.exec(text)) !== null) {
    markers.push({
      start: italicMatch.index,
      end: italicMatch.index + italicMatch[0].length,
      text: italicMatch[1] || italicMatch[2],
      type: "italic",
    })
  }

  // Inline code markers (`text`)
  let codeMatch
  const codeRegex = /`([^`]+)`/g
  while ((codeMatch = codeRegex.exec(text)) !== null) {
    markers.push({
      start: codeMatch.index,
      end: codeMatch.index + codeMatch[0].length,
      text: codeMatch[1],
      type: "code",
    })
  }

  // Sort markers by position
  markers.sort((a, b) => a.start - b.start)

  // Process text with markers
  for (const marker of markers) {
    // Add any text before this marker
    if (currentIndex < marker.start) {
      const beforeText = text.substring(currentIndex, marker.start)
      if (beforeText) {
        segments.push({ text: beforeText })
      }
    }

    // Add the formatted text
    const segment: any = { text: marker.text }
    if (marker.type === "bold") segment.bold = true
    if (marker.type === "italic") segment.italic = true
    if (marker.type === "code") segment.code = true

    segments.push(segment)
    currentIndex = marker.end
  }

  // Add any remaining text
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex)
    if (remainingText) {
      segments.push({ text: remainingText })
    }
  }

  // If no markers found, return the whole text as one segment
  if (segments.length === 0) {
    segments.push({ text })
  }

  return segments
}

// Enhanced function to render formatted text
function renderFormattedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSettings: FontSettings,
  pageHeight: number,
  margin: number,
  baseAlign: "left" | "center" | "right" = "left",
): number {
  const segments = processMarkdownFormatting(text)
  let currentX = x
  let currentY = y
  const lineHeight = 6 // Consistent with main text rendering

  for (const segment of segments) {
    // Set font based on formatting
    let fontStyle = "normal"
    let fontSize = fontSettings.bodyFontSize
    let fontFamily = fontSettings.bodyFont

    if (segment.bold && segment.italic) {
      fontStyle = "bolditalic"
    } else if (segment.bold) {
      fontStyle = "bold"
    } else if (segment.italic) {
      fontStyle = "italic"
    }

    if (segment.code) {
      fontFamily = "courier"
      fontSize = fontSettings.smallFontSize
      // Add background for inline code
      doc.setFillColor(248, 248, 248)
      const textWidth = doc.getTextWidth(segment.text)
      doc.rect(currentX - 1, currentY - 3, textWidth + 2, fontSize * 0.4, "F")
    }

    doc.setFontSize(fontSize)
    setFont(doc, fontFamily, fontStyle)

    // Handle text wrapping
    const words = segment.text.split(" ")

    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i < words.length - 1 ? " " : "")
      const wordWidth = doc.getTextWidth(word)

      // Check if word fits on current line
      if (currentX + wordWidth > x + maxWidth) {
        // Move to next line
        currentY += lineHeight
        currentX = x

        // Check if we need a new page
        if (currentY + lineHeight > pageHeight - margin) {
          doc.addPage()
          currentY = margin
          // Reset font after page break
          setFont(doc, fontFamily, fontStyle)
        }
      }

      doc.text(word, currentX, currentY)
      currentX += wordWidth
    }
  }

  return currentY
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
  doc.setFontSize(fontSettings.bodyFontSize - 1.5) // Changed from -1 to -1.5

  setFont(doc, "helvetica", "bold")

  // Pre-calculate header height by checking all header cells
  let maxHeaderHeight = rowHeight
  const headerLinesArray: string[][] = []

  // Pre-process all header cells to determine header row height
  columns.forEach((col, colIndex) => {
    const colText = col
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
  doc.setFontSize(fontSettings.bodyFontSize - 1.5) // Changed from -1 to -1.5

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
        const cellText = cell
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
      doc.setFontSize(fontSettings.bodyFontSize - 1.5) // Changed from -1 to -1.5

      setFont(doc, "helvetica", "bold")

      // Pre-calculate header height for the new page
      let maxHeaderHeight = rowHeight
      const headerLinesArray: string[][] = []

      // Pre-process all header cells to determine header row height
      columns.forEach((col, colIndex) => {
        const colText = col
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
      doc.setFontSize(fontSettings.bodyFontSize - 1.5) // Changed from -1 to -1.5

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

// Render a list in PDF - with reduced spacing to match regular text
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
  const lineHeight = 6 // Same as regular text line height
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
    doc.text(marker, x, currentY)

    // Draw the list item text with formatting
    const itemText = item.trim()
    const itemEndY = renderFormattedText(
      doc,
      itemText,
      x + markerWidth + indent,
      currentY,
      maxWidth - markerWidth - indent,
      fontSettings,
      pageHeight,
      margin,
    )

    // Move to next line with consistent spacing - same as regular text
    currentY = itemEndY + lineHeight * 0.1 // Very small spacing between list items, same as paragraphs
  }

  return currentY + lineHeight * 0.1 // Reduced spacing after list to match paragraphs
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

// New function that combines renderMarkdownContent and addImagesToPdf to render images inline
async function renderMarkdownContentWithImages(
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
  const lineHeight = 6 // Consistent line height
  const indent = 5

  // Use body font for content
  doc.setFontSize(fontSettings.bodyFontSize)
  setFont(doc, fontSettings.bodyFont, "normal")

  // Split the markdown into lines
  const lines = markdownText.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines
    if (line === "") {
      currentY += lineHeight / 3
      continue
    }

    // Check for image tags - process them inline where they appear
    if (line.includes("<img")) {
      const imageRegex = /<img[^>]*src=["'](.*?)["'][^>]*(?:alt=["'](.*?)["'])?[^>]*>/g
      const matches = [...line.matchAll(imageRegex)]

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

            // Use the available width of the notes column (maxWidth) for images
            const availableWidth = maxWidth
            let displayWidth = availableWidth
            let displayHeight = displayWidth / aspectRatio

            // Set reasonable maximum height (about 50% of page height for better visibility)
            const maxImageHeight = (pageHeight - margin * 2) * 0.5

            // If height exceeds maximum, scale down proportionally
            if (displayHeight > maxImageHeight) {
              displayHeight = maxImageHeight
              displayWidth = displayHeight * aspectRatio

              // If scaled width is less than full width, stretch back to full width
              if (displayWidth < availableWidth) {
                displayWidth = availableWidth
                // Allow height to exceed max if needed for full width
                displayHeight = displayWidth / aspectRatio
              }
            }

            // Ensure we're using the available width of the notes column
            displayWidth = availableWidth
            displayHeight = displayWidth / aspectRatio

            // Only reduce height if it's extremely large (more than 60% of page)
            if (displayHeight > (pageHeight - margin * 2) * 0.6) {
              displayHeight = (pageHeight - margin * 2) * 0.6
              // Don't scale width down - keep full width even if aspect ratio changes
            }

            // Add some space before the image
            currentY += 3

            // Calculate available space on current page
            const availableSpace = pageHeight - margin - currentY - 5 // Leave small bottom margin

            // Determine final image dimensions based on available space
            const idealWidth = displayWidth
            const idealHeight = displayHeight

            // Only scale down if the image is significantly larger than available space
            if (idealHeight > availableSpace) {
              // Check if we have reasonable space to work with (at least 30mm)
              if (availableSpace >= 30) {
                // Scale the image to fit the available space
                displayHeight = Math.min(idealHeight, availableSpace - 5) // Leave 5mm buffer
                displayWidth = displayHeight * aspectRatio
              } else {
                // Very little space left - move to new page for better presentation
                doc.addPage()
                currentY = margin + 3

                // Recalculate available space on new page
                const newPageAvailableSpace = pageHeight - margin - currentY - 5

                // Use ideal dimensions if they fit, otherwise scale to fit new page
                if (idealHeight <= newPageAvailableSpace) {
                  displayHeight = idealHeight
                  displayWidth = idealWidth
                } else {
                  displayHeight = Math.min(idealHeight, newPageAvailableSpace - 5)
                  displayWidth = displayHeight * aspectRatio
                }
              }
            }

            // Ensure minimum readable size - if too small after scaling, use more space
            const minImageHeight = 25 // Minimum height in mm for readability
            if (displayHeight < minImageHeight && availableSpace >= minImageHeight + 10) {
              displayHeight = minImageHeight
              displayWidth = displayHeight * aspectRatio

              // If width exceeds maxWidth after minimum height adjustment, scale back proportionally
              if (displayWidth > maxWidth) {
                displayWidth = maxWidth
                displayHeight = displayWidth / aspectRatio
              }
            }

            // Add the image to the PDF
            try {
              doc.addImage(imageData, "JPEG", x, currentY, displayWidth, displayHeight)

              currentY += displayHeight

              // Add alt text below the image if it exists and is meaningful
              if (altText && altText !== "Image" && altText.length > 0) {
                currentY += 2

                // Check if we need a new page for the caption
                const captionHeight = 8 // Estimated height for caption
                if (currentY + captionHeight > pageHeight - margin) {
                  doc.addPage()
                  currentY = margin
                }

                doc.setFontSize(fontSettings.smallFontSize)
                doc.setTextColor(100, 100, 100)
                setFont(doc, fontSettings.bodyFont, "italic")

                const captionLines = doc.splitTextToSize(`Figure: ${altText}`, maxWidth)
                for (let i = 0; i < captionLines.length; i++) {
                  // Check for page break on each caption line
                  if (currentY + 5 > pageHeight - margin) {
                    doc.addPage()
                    currentY = margin
                    // Reset font after page break
                    setFont(doc, fontSettings.bodyFont, "italic")
                  }

                  doc.text(captionLines[i], x, currentY)
                  currentY += 5
                }

                // Reset font
                doc.setTextColor(0, 0, 0)
                doc.setFontSize(fontSettings.bodyFontSize)
                setFont(doc, fontSettings.bodyFont, "normal")
              }

              // Add some space after the image
              currentY += 4
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

      // Skip to next line after processing images
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

    // Lists - improved parsing
    if (line.match(/^[-*]\s/) || line.match(/^\d+\.\s/)) {
      const listItems: string[] = []
      const isNumbered = line.match(/^\d+\.\s/) !== null

      // Add the current line to the list
      const currentItem = line.replace(/^[-*\d+.]\s+/, "").trim()
      if (currentItem) {
        listItems.push(currentItem)
      }

      // Look ahead for more list items
      let j = i + 1
      while (j < lines.length) {
        const nextLine = lines[j].trim()
        if (nextLine === "") {
          j++
          continue // Skip empty lines within lists
        }

        // Check if it's another list item of the same type
        const isNextNumbered = nextLine.match(/^\d+\.\s/) !== null
        const isNextBullet = nextLine.match(/^[-*]\s/) !== null

        if ((isNumbered && isNextNumbered) || (!isNumbered && isNextBullet)) {
          const nextItem = nextLine.replace(/^[-*\d+.]\s+/, "").trim()
          if (nextItem) {
            listItems.push(nextItem)
          }
          j++
        } else {
          break // End of list
        }
      }

      i = j - 1 // Update the main loop counter

      if (listItems.length > 0) {
        // Use the fixed renderListFixed function instead
        currentY = renderListFixed(doc, listItems, x, currentY, maxWidth, isNumbered, pageHeight, margin, fontSettings)
      }
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

    // Horizontal rules
    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/) || line.match(/^___+$/)) {
      currentY += lineHeight * 0.5

      // Check if we need a new page
      if (currentY + lineHeight > pageHeight - margin) {
        doc.addPage()
        currentY = margin
      }

      // Draw horizontal line
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.5)
      doc.line(x, currentY, x + maxWidth, currentY)

      currentY += lineHeight * 0.5
      continue
    }

    // Handle links first
    let processedLine = line

    // Convert markdown links to plain text with indication
    processedLine = processedLine.replace(/\[([^\]]+)\]$$([^)]+)$$/g, "$1 ($2)")

    // Handle strikethrough
    processedLine = processedLine.replace(/~~([^~]+)~~/g, "$1")

    // Regular text with formatting - ensure proper page breaks
    const segments = processMarkdownFormatting(processedLine)
    let currentX = x

    for (const segment of segments) {
      // Set font based on formatting
      let fontStyle = "normal"
      let fontSize = fontSettings.bodyFontSize
      let fontFamily = fontSettings.bodyFont

      if (segment.bold && segment.italic) {
        fontStyle = "bolditalic"
      } else if (segment.bold) {
        fontStyle = "bold"
      } else if (segment.italic) {
        fontStyle = "italic"
      }

      if (segment.code) {
        fontFamily = "courier"
        fontSize = fontSettings.smallFontSize
      }

      doc.setFontSize(fontSize)
      setFont(doc, fontFamily, fontStyle)

      // Handle text wrapping with proper page breaks
      const words = segment.text.split(" ")

      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? " " : "")
        const wordWidth = doc.getTextWidth(word)

        // Check if word fits on current line
        if (currentX + wordWidth > x + maxWidth) {
          // Move to next line
          currentY += lineHeight
          currentX = x

          // Check if we need a new page
          if (currentY > pageHeight - margin) {
            doc.addPage()
            currentY = margin
            // Reset font after page break
            setFont(doc, fontFamily, fontStyle)
          }
        }

        // Draw the word
        doc.text(word, currentX, currentY)
        currentX += wordWidth
      }
    }

    // Reset X position and move to next line
    currentX = x
    currentY += lineHeight * 0.8 // Improved spacing between paragraphs
  }

  return currentY
}

// Updated function to fix list rendering with reduced spacing
function renderListFixed(
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
  const currentY = y
  const lineHeight = 6 // Same as regular text line height
  const indent = 8 // Slightly larger indent for better readability

  // Use body font for list content
  doc.setFontSize(fontSettings.bodyFontSize)
  setFont(doc, fontSettings.bodyFont, "normal")

  let currentItemY = currentY

  for (let index = 0; index < listItems.length; index++) {
    const item = listItems[index].trim()

    // Skip empty items
    if (!item) continue

    // Check if we need a new page
    if (currentItemY + lineHeight > pageHeight - margin) {
      doc.addPage()
      currentItemY = margin
      // Reset font after page break
      setFont(doc, fontSettings.bodyFont, "normal")
    }

    // Create bullet or number
    const marker = isNumbered ? `${index + 1}.` : "•"

    // Calculate marker width
    const markerWidth = doc.getTextWidth(marker) + 2

    // Draw the marker
    doc.text(marker, x, currentItemY)

    // Calculate available width for the item text
    const itemTextWidth = maxWidth - markerWidth - indent

    // Split the item text into lines that fit
    const itemLines = doc.splitTextToSize(item, itemTextWidth)

    // Draw the first line of the item
    doc.text(itemLines[0], x + markerWidth + indent, currentItemY)

    // Draw any additional lines with proper indentation
    for (let lineIndex = 1; lineIndex < itemLines.length; lineIndex++) {
      currentItemY += lineHeight

      // Check if we need a new page for continuation lines
      if (currentItemY + lineHeight > pageHeight - margin) {
        doc.addPage()
        currentItemY = margin
        // Reset font after page break
        setFont(doc, fontSettings.bodyFont, "normal")
      }

      doc.text(itemLines[lineIndex], x + markerWidth + indent, currentItemY)
    }

    // Move to the next list item with slightly increased spacing
    currentItemY += lineHeight * 0.9 // Slightly increased spacing between list items
  }

  return currentItemY + lineHeight * 0.2 // Slightly more space after the entire list
}
