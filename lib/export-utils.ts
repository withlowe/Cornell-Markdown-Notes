import { jsPDF } from "jspdf"

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

// Simple function to clean markdown for PDF display
function cleanMarkdown(text: string): string {
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, "[Code Block]")

  // Convert bullet points
  text = text.replace(/^\s*-\s+/gm, "• ")

  // Convert numbered lists
  text = text.replace(/^\s*\d+\.\s+/gm, (match) => {
    return match // Keep the numbering
  })

  // Convert bold
  text = text.replace(/\*\*(.*?)\*\*/g, "$1")

  // Convert italic
  text = text.replace(/\*(.*?)\*/g, "$1")

  // Remove table formatting but keep content
  text = text.replace(/\|(.+)\|/g, "$1")
  text = text.replace(/^[\s\-|]+$/gm, "")

  // Convert blockquotes
  text = text.replace(/^\s*>\s+/gm, "")

  return text
}

// Export to PDF with minimal ink usage
export async function exportToPdf(title: string, markdown: string): Promise<void> {
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

  // Draw the Cornell note structure
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const keyPointsWidth = 45
  const contentWidth = pageWidth - margin - keyPointsWidth - margin

  // Draw header - no shading, just text
  doc.setFontSize(10)
  doc.text("Key Points", margin + 5, 25)
  doc.text("Notes", margin + keyPointsWidth + 5, 25)

  // Draw a single light horizontal line under the header
  doc.setDrawColor(220, 220, 220) // Very light gray
  doc.line(margin, 27, margin + keyPointsWidth + contentWidth, 27)

  // Draw content with minimal styling
  let y = 30
  const lineHeight = 7

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

    // Clean the content for PDF display
    const cleanedContent = cleanMarkdown(section.content)

    // Calculate content height
    const contentLines = doc.splitTextToSize(cleanedContent, contentWidth - 10)
    const headingLines = doc.splitTextToSize(section.heading, keyPointsWidth - 10)

    const headingHeight = headingLines.length * lineHeight
    const contentHeight = contentLines.length * lineHeight
    const sectionHeight = Math.max(headingHeight, contentHeight) + 5

    // Draw section with very light borders
    doc.setDrawColor(230, 230, 230) // Extra light gray for borders

    // Draw vertical divider between key points and notes
    doc.line(margin + keyPointsWidth, y, margin + keyPointsWidth, y + sectionHeight)

    // Draw horizontal line at the bottom of the section
    if (index < sections.length - 1) {
      doc.line(margin, y + sectionHeight, margin + keyPointsWidth + contentWidth, y + sectionHeight)
    }

    // Add content
    doc.setFontSize(11)
    doc.text(headingLines, margin + 5, y + 5)

    doc.setFontSize(10)
    doc.text(contentLines, margin + keyPointsWidth + 5, y + 5)

    y += sectionHeight
  })

  // Save the PDF
  doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}.pdf`)
}
