import { jsPDF } from "jspdf"
import { getImage } from "./image-storage"
import { marked } from "marked"
import DOMPurify from "dompurify"

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

// Process content to load images from storage
async function processContentForExport(content: string): Promise<string> {
  let processedContent = content

  // Find all cornell-image:// URLs
  const imageRegex = /cornell-image:\/\/(.*?)["']/g
  const matches = [...content.matchAll(imageRegex)]

  console.log(`Found ${matches.length} cornell-image:// URLs to process`)

  // Replace each cornell-image:// URL with the actual image data
  for (const match of matches) {
    const imageId = match[1]

    if (imageId) {
      try {
        console.log(`Processing image ID: ${imageId}`)
        const imageData = await getImage(imageId)
        if (imageData) {
          // Replace the cornell-image:// URL with the actual image data
          processedContent = processedContent.replace(
            new RegExp(`cornell-image://${imageId}["']`, "g"),
            `${imageData}"`,
          )
          console.log(`Successfully replaced image ID ${imageId} with data URL`)
        } else {
          console.warn(`Image with ID ${imageId} not found in storage`)
        }
      } catch (error) {
        console.error(`Error loading image ${imageId} for export:`, error)
      }
    }
  }

  return processedContent
}

// DOM-based approach to render content
async function renderContentToPdf(
  doc: jsPDF,
  content: string,
  x: number,
  y: number,
  maxWidth: number,
): Promise<number> {
  console.log("Starting DOM-based content rendering")

  // Convert markdown to HTML using marked
  const html = marked.parse(content)

  // Sanitize HTML to prevent XSS
  const sanitizedHtml = DOMPurify.sanitize(html)

  // Create a temporary DOM element to parse the HTML
  const tempDiv = document.createElement("div")
  tempDiv.innerHTML = sanitizedHtml

  // Current Y position for rendering
  let currentY = y
  const lineHeight = 7

  // Process each node in the DOM tree
  for (const node of Array.from(tempDiv.childNodes)) {
    // Check if we need to add a page break
    if (currentY > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage()
      currentY = 20
    }

    // Process different node types
    if (node.nodeType === Node.TEXT_NODE) {
      // Text node
      if (node.textContent?.trim()) {
        const text = node.textContent.trim()
        const textLines = doc.splitTextToSize(text, maxWidth)
        doc.text(textLines, x, currentY)
        currentY += textLines.length * lineHeight
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement

      // Handle different HTML elements
      switch (element.tagName.toLowerCase()) {
        case "p":
          // Paragraph
          const paragraphText = element.textContent?.trim() || ""
          if (paragraphText) {
            const textLines = doc.splitTextToSize(paragraphText, maxWidth)
            doc.text(textLines, x, currentY)
            currentY += textLines.length * lineHeight + 3 // Extra spacing after paragraph
          }
          break

        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6":
          // Headings
          const level = Number.parseInt(element.tagName.charAt(1))
          const headingText = element.textContent?.trim() || ""

          const originalSize = doc.getFontSize()
          doc.setFontSize(16 - level) // Size based on heading level
          doc.setFont(undefined, "bold")

          const headingLines = doc.splitTextToSize(headingText, maxWidth)
          doc.text(headingLines, x, currentY)

          doc.setFont(undefined, "normal")
          doc.setFontSize(originalSize)

          currentY += headingLines.length * lineHeight + 5 // Extra spacing after heading
          break

        case "img":
          // Image
          const imgElement = element as HTMLImageElement
          const src = imgElement.src
          const alt = imgElement.alt || "Image"

          console.log(`Processing image in DOM: ${src.substring(0, 50)}...`)

          // Handle different image sources
          if (src.startsWith("data:")) {
            try {
              // Create an image element to get dimensions
              const img = new Image()
              img.crossOrigin = "anonymous"

              // Wait for image to load
              await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                  try {
                    // Get image format
                    const format = src.split(";")[0].split("/")[1]?.toUpperCase() || "JPEG"
                    const validFormat = ["JPEG", "JPG", "PNG"].includes(format) ? format : "JPEG"

                    // Calculate dimensions
                    const aspectRatio = img.width / img.height
                    const imgWidth = Math.min(maxWidth, 150)
                    const imgHeight = imgWidth / aspectRatio

                    // If height is too large, recalculate
                    const maxImageHeight = 60
                    const finalHeight = Math.min(imgHeight, maxImageHeight)
                    const finalWidth = finalHeight * aspectRatio

                    // Add image to PDF
                    doc.addImage(src, validFormat, x, currentY, finalWidth, finalHeight, undefined, "FAST")

                    // Add caption if there's alt text
                    if (alt && alt !== "Image") {
                      doc.setFontSize(8)
                      doc.setTextColor(100, 100, 100)
                      doc.text(alt, x, currentY + finalHeight + 5, { align: "left", maxWidth: maxWidth })
                      currentY += finalHeight + 15
                    } else {
                      currentY += finalHeight + 10
                    }

                    resolve()
                  } catch (error) {
                    console.error("Error adding image to PDF:", error)
                    doc.setFontSize(9)
                    doc.setTextColor(100, 100, 100)
                    doc.text(`[Image could not be added to PDF]`, x, currentY)
                    doc.setTextColor(0, 0, 0)
                    currentY += 15
                    resolve()
                  }
                }

                img.onerror = () => {
                  console.error("Error loading image")
                  doc.setFontSize(9)
                  doc.setTextColor(100, 100, 100)
                  doc.text(`[Image could not be loaded]`, x, currentY)
                  doc.setTextColor(0, 0, 0)
                  currentY += 15
                  resolve()
                }

                img.src = src
              })
            } catch (error) {
              console.error("Error processing image:", error)
              doc.setFontSize(9)
              doc.setTextColor(100, 100, 100)
              doc.text(`[Error processing image]`, x, currentY)
              doc.setTextColor(0, 0, 0)
              currentY += 15
            }
          } else if (src.includes("/placeholder.svg") || src.includes("/generic-placeholder-icon.png")) {
            // Placeholder image
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 100)
            doc.text(`[Placeholder Image: ${alt}]`, x, currentY)
            doc.setTextColor(0, 0, 0)
            currentY += 15
          } else {
            // External URL
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 100)
            doc.text(`[External image: ${alt}]`, x, currentY)
            doc.setTextColor(0, 0, 0)
            currentY += 15
          }
          break

        case "ul":
        case "ol":
          // Lists
          const isOrdered = element.tagName.toLowerCase() === "ol"
          const listItems = Array.from(element.querySelectorAll("li"))

          for (let i = 0; i < listItems.length; i++) {
            const item = listItems[i]
            const itemText = item.textContent?.trim() || ""

            // Create bullet or number
            const marker = isOrdered ? `${i + 1}.` : "•"
            const markerWidth = doc.getTextWidth(isOrdered ? `${marker} ` : `${marker}  `)

            // Draw the marker
            doc.text(marker, x, currentY)

            // Draw the list item text with wrapping
            const textLines = doc.splitTextToSize(itemText, maxWidth - markerWidth - 5)
            doc.text(textLines, x + markerWidth + 5, currentY)

            // Move to next item
            currentY += textLines.length * lineHeight + 2
          }

          currentY += 3 // Extra spacing after list
          break

        case "blockquote":
          // Blockquote
          const quoteText = element.textContent?.trim() || ""

          // Draw quote bar
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(1)
          const quoteLines = doc.splitTextToSize(quoteText, maxWidth - 5)
          const quoteHeight = quoteLines.length * lineHeight
          doc.line(x, currentY, x, currentY + quoteHeight)
          doc.setLineWidth(0.1)

          // Set quote text style
          doc.setTextColor(100, 100, 100)

          // Draw quote text
          doc.text(quoteLines, x + 5, currentY)

          // Reset text color
          doc.setTextColor(0, 0, 0)

          currentY += quoteHeight + 5
          break

        case "table":
          // Table
          const rows = Array.from(element.querySelectorAll("tr"))
          if (rows.length > 0) {
            const headerRow = rows[0]
            const headerCells = Array.from(headerRow.querySelectorAll("th, td"))

            // Calculate column widths
            const columnCount = headerCells.length
            const columnWidth = maxWidth / columnCount

            // Set up table styling
            const cellPadding = 2
            const rowHeight = 8

            // Draw header row
            doc.setFontSize(9)
            doc.setFont(undefined, "bold")

            let cellX = x
            headerCells.forEach((cell) => {
              const cellText = cell.textContent?.trim() || ""
              doc.text(cellText, cellX + cellPadding, currentY + rowHeight - cellPadding)
              cellX += columnWidth
            })

            doc.setFont(undefined, "normal")
            currentY += rowHeight

            // Draw header separator
            doc.setDrawColor(200, 200, 200)
            doc.line(x, currentY, x + maxWidth, currentY)

            // Draw data rows
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i]
              const cells = Array.from(row.querySelectorAll("td"))

              cellX = x
              cells.forEach((cell, j) => {
                if (j < columnCount) {
                  const cellText = cell.textContent?.trim() || ""
                  const cellLines = doc.splitTextToSize(cellText, columnWidth - cellPadding * 2)

                  doc.text(cellLines, cellX + cellPadding, currentY + rowHeight - cellPadding)
                  cellX += columnWidth
                }
              })

              currentY += rowHeight

              // Draw row separator
              doc.setDrawColor(230, 230, 230)
              doc.line(x, currentY, x + maxWidth, currentY)
            }

            currentY += 5 // Extra spacing after table
          }
          break

        case "pre":
          // Code block
          const codeElement = element.querySelector("code")
          const codeText = codeElement?.textContent?.trim() || element.textContent?.trim() || ""
          const codeLines = codeText.split("\n")

          // Draw code block background
          const lineHeight = 6
          const blockHeight = codeLines.length * lineHeight + 6
          doc.setFillColor(245, 245, 245)
          doc.rect(x, currentY, maxWidth, blockHeight, "F")

          // Set monospace font for code
          doc.setFontSize(8)

          // Draw each line of code
          let codeY = currentY
          codeLines.forEach((line) => {
            doc.text(line, x + 3, codeY + 5)
            codeY += lineHeight
          })

          currentY += blockHeight + 3
          break

        default:
          // Handle other elements by processing their children
          if (element.childNodes.length > 0) {
            for (const childNode of Array.from(element.childNodes)) {
              if (childNode.nodeType === Node.TEXT_NODE) {
                if (childNode.textContent?.trim()) {
                  const text = childNode.textContent.trim()
                  const textLines = doc.splitTextToSize(text, maxWidth)
                  doc.text(textLines, x, currentY)
                  currentY += textLines.length * lineHeight
                }
              }
            }
          }
          break
      }
    }

    // Add a small gap between elements
    currentY += 2
  }

  console.log("Finished DOM-based content rendering")
  return currentY
}

// Export to PDF with DOM-based rendering
export async function exportToPdf(title: string, summary: string, markdown: string): Promise<void> {
  try {
    console.log("Starting PDF export process")

    // First, process the markdown to load images from storage
    const processedMarkdown = await processContentForExport(markdown)
    console.log("Processed markdown content with images loaded from storage")

    const sections = parseMarkdown(processedMarkdown)
    console.log(`Parsed ${sections.length} sections from markdown`)

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
    let y = 25
    if (summary) {
      doc.setFontSize(10)
      const summaryLines = doc.splitTextToSize(summary, 180)
      doc.text(summaryLines, 15, y)
      y += summaryLines.length * 5 + 10
    } else {
      y = 30
    }

    // Draw the Cornell note structure
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const keyPointsWidth = 45
    const contentWidth = pageWidth - margin - keyPointsWidth - margin

    // Draw header
    doc.setFontSize(10)
    doc.text("Key Points", margin + 5, y)
    doc.text("Notes", margin + keyPointsWidth + 5, y)

    // Draw header line
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, y + 2, margin + keyPointsWidth + contentWidth, y + 2)

    // Draw content
    y += 5

    for (let index = 0; index < sections.length; index++) {
      const section = sections[index]
      console.log(`Processing section ${index + 1}: ${section.heading}`)

      // Check if we need a new page
      if (y + 20 > pageHeight - margin) {
        doc.addPage()
        y = margin

        // Redraw header on new page
        doc.setFontSize(10)
        doc.text("Key Points", margin + 5, y + 5)
        doc.text("Notes", margin + keyPointsWidth + 5, y + 5)

        // Draw header line
        doc.setDrawColor(220, 220, 220)
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

      // Draw content with DOM-based rendering
      doc.setFontSize(10)
      console.log(`Rendering content for section: ${section.heading}`)
      const contentEndY = await renderContentToPdf(
        doc,
        section.content,
        margin + keyPointsWidth + 5,
        y + 5,
        contentWidth - 10,
      )
      console.log(`Finished rendering content for section: ${section.heading}`)

      // Calculate section height
      const sectionHeight = Math.max(headingHeight, contentEndY - y)

      // Draw section borders
      doc.setDrawColor(230, 230, 230)

      // Draw vertical divider
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
    console.log("Generated PDF blob")

    // Download the PDF
    downloadBlob(pdfBlob, `${title.replace(/\s+/g, "-").toLowerCase()}.pdf`)
    console.log("PDF download initiated")
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
