import { jsPDF } from "jspdf"
import { marked } from "marked"
import DOMPurify from "dompurify"

interface Section {
  heading: string
  content: string
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

// Convert markdown to plain text with basic formatting
function markdownToPlainText(markdown: string): string {
  // First convert markdown to HTML
  const html = marked.parse(markdown)

  // Sanitize HTML (security measure)
  const sanitizedHtml = typeof window !== "undefined" ? DOMPurify.sanitize(html) : html

  // Create a temporary element to hold the HTML
  const tempDiv =
    typeof document !== "undefined" ? document.createElement("div") : { innerHTML: sanitizedHtml, textContent: "" }

  if (typeof document !== "undefined") {
    tempDiv.innerHTML = sanitizedHtml
  }

  // Extract text content with some basic formatting
  let text = tempDiv.textContent || ""

  // Replace some common HTML elements with plain text equivalents
  text = text
    .replace(/<li>/g, "• ")
    .replace(/<\/li>/g, "\n")
    .replace(/<br>/g, "\n")
    .replace(/<p>/g, "")
    .replace(/<\/p>/g, "\n\n")

  return text
}

// Export to PDF
export async function exportToPdf(title: string, markdown: string): Promise<void> {
  const sections = parseMarkdown(markdown)

  // Create a new PDF document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  // Set title
  doc.setFontSize(20)
  doc.text(title, 20, 20)

  // Add Cornell note structure
  doc.setFontSize(14)
  doc.text("Notes", 20, 30)

  // Draw the Cornell note structure
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const keyPointsWidth = 50
  const contentWidth = pageWidth - margin - keyPointsWidth - margin

  // Draw header
  doc.setFillColor(240, 240, 240)
  doc.rect(margin, 40, keyPointsWidth, 10, "F")
  doc.rect(margin + keyPointsWidth, 40, contentWidth, 10, "F")

  doc.setFontSize(10)
  doc.text("Key Points", margin + keyPointsWidth / 2 - 10, 46)
  doc.text("Notes", margin + keyPointsWidth + contentWidth / 2 - 10, 46)

  // Draw content
  let y = 50
  const lineHeight = 7

  sections.forEach((section, index) => {
    // Check if we need a new page
    if (y + 20 > pageHeight - margin) {
      doc.addPage()
      y = margin

      // Redraw header on new page
      doc.setFillColor(240, 240, 240)
      doc.rect(margin, y, keyPointsWidth, 10, "F")
      doc.rect(margin + keyPointsWidth, y, contentWidth, 10, "F")

      doc.setFontSize(10)
      doc.text("Key Points", margin + keyPointsWidth / 2 - 10, y + 6)
      doc.text("Notes", margin + keyPointsWidth + contentWidth / 2 - 10, y + 6)

      y += 10
    }

    // Convert markdown content to plain text with basic formatting
    const formattedContent = markdownToPlainText(section.content)

    // Calculate content height
    const contentLines = doc.splitTextToSize(formattedContent, contentWidth - 10)
    const sectionHeight = Math.max(lineHeight * 2, contentLines.length * lineHeight)

    // Draw section border
    doc.setDrawColor(200, 200, 200)
    doc.rect(margin, y, keyPointsWidth, sectionHeight)
    doc.rect(margin + keyPointsWidth, y, contentWidth, sectionHeight)

    // Add content
    doc.setFontSize(12)
    doc.text(section.heading, margin + 5, y + 7)

    doc.setFontSize(10)
    doc.text(contentLines, margin + keyPointsWidth + 5, y + 7)

    y += sectionHeight
  })

  // Save the PDF
  doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}.pdf`)
}
