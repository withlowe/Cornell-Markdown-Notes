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

    // Draw content with basic text rendering
    doc.setFontSize(10)
    const contentLines = doc.splitTextToSize(section.content, contentWidth - 10)
    doc.text(contentLines, margin + keyPointsWidth + 5, y + 5)

    // Calculate content height
    const contentHeight = contentLines.length * 5

    // Calculate section height
    const sectionHeight = Math.max(headingHeight, contentHeight)

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
