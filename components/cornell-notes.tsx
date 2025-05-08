"use client"

import { useMemo } from "react"

interface CornellNotesProps {
  markdown: string
}

interface Section {
  heading: string
  content: string
}

export function CornellNotes({ markdown }: CornellNotesProps) {
  const sections = useMemo(() => {
    // Split the markdown by headings
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
  }, [markdown])

  // If there are no sections, show a message
  if (sections.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">Add headings with # to create Cornell-style notes</div>
    )
  }

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Changed to a table-like layout for better alignment */}
      <div className="grid grid-cols-[1fr_3fr] divide-x divide-border">
        {/* Header row */}
        <div className="bg-muted p-4 font-medium text-sm uppercase text-center border-b border-border">Key Points</div>
        <div className="bg-muted p-4 font-medium text-sm uppercase text-center border-b border-border">Notes</div>

        {/* Content rows - each row contains a heading and its content */}
        {sections.map((section, index) => (
          <div key={index} className="contents">
            {/* Added visual connection with alternating backgrounds and connecting borders */}
            <div
              className={`py-4 px-4 font-medium flex items-start relative ${
                index % 2 === 0 ? "bg-muted/30" : "bg-background"
              }`}
            >
              <div className="pt-[2px]">{section.heading}</div>

              {/* Right border that visually connects to the content */}
              <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-border"></div>

              {/* Bottom border that separates sections */}
              {index < sections.length - 1 && (
                <div className="absolute left-0 right-0 bottom-0 h-[1px] bg-border"></div>
              )}
            </div>

            <div className={`py-4 px-4 relative ${index % 2 === 0 ? "bg-muted/10" : "bg-background"}`}>
              {/* Render markdown content with ReactMarkdown */}
              <div className="markdown-content" dangerouslySetInnerHTML={{ __html: processContent(section.content) }} />

              {/* Bottom border that separates sections */}
              {index < sections.length - 1 && (
                <div className="absolute left-0 right-0 bottom-0 h-[1px] bg-border"></div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Process content to handle both markdown and HTML
function processContent(content: string): string {
  // First, let's handle any HTML img tags that might be in the content
  // We'll leave these as is since they're already HTML

  // Then, process the markdown content
  const processedContent = content
    // Process markdown images ![alt](src)
    .replace(
      /!\[(.*?)\]$$(.*?)$$/g,
      '<img src="$2" alt="$1" class="max-w-full h-auto rounded-md my-4" loading="lazy" />',
    )

    // Process markdown links [text](url)
    .replace(/\[(.*?)\]$$(.*?)$$/g, '<a href="$2" class="text-primary underline">$1</a>')

    // Process headings
    .replace(/^### (.*?)$/gm, '<h3 class="text-lg font-bold mb-3">$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2 class="text-xl font-bold mb-3">$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')

    // Process lists
    .replace(/^\* (.*?)$/gm, '<li class="mb-1">$1</li>')
    .replace(/^- (.*?)$/gm, '<li class="mb-1">$1</li>')
    .replace(/^(\d+)\. (.*?)$/gm, '<li class="mb-1">$2</li>')

    // Process paragraphs (lines that aren't part of other elements)
    .replace(/^([^<\n].+)$/gm, '<p class="mb-4 last:mb-0">$1</p>')

    // Wrap lists
    .replace(/(<li.*?<\/li>\n)+/g, (match) => {
      if (match.includes("^d+.")) {
        return `<ol class="list-decimal pl-6 mb-4 last:mb-0">${match}</ol>`
      }
      return `<ul class="list-disc pl-6 mb-4 last:mb-0">${match}</ul>`
    })

    // Process bold and italic
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")

    // Process code blocks
    .replace(
      /```([\s\S]*?)```/g,
      '<pre class="mb-4 last:mb-0"><code class="block bg-muted p-3 rounded-md text-sm font-mono overflow-x-auto mb-4">$1</code></pre>',
    )

    // Process inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>')

  return processedContent
}
