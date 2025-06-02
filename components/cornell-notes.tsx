"use client"

import type React from "react"

import { useMemo, useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getImage } from "@/lib/image-storage"
import { processNoteLinks } from "@/lib/link-utils"

interface CornellNotesProps {
  markdown: string
  onNoteClick?: (title: string) => void
}

interface Section {
  heading: string
  content: string
  id: string
}

export function CornellNotes({ markdown, onNoteClick }: CornellNotesProps) {
  const [processedContent, setProcessedContent] = useState<string>(markdown)

  // Process the markdown to load images from storage and handle note links
  useEffect(() => {
    const processImages = async () => {
      let content = markdown

      // Find all cornell-image:// URLs
      const imageRegex = /<img.*?src=["']cornell-image:\/\/(.*?)["'].*?>/g
      const matches = [...content.matchAll(imageRegex)]

      // Replace each cornell-image:// URL with the actual image data
      for (const match of matches) {
        const fullMatch = match[0]
        const imageId = match[1]

        if (imageId) {
          try {
            const imageData = await getImage(imageId)
            if (imageData) {
              // Replace the cornell-image:// URL with the actual image data
              content = content.replace(fullMatch, fullMatch.replace(`cornell-image://${imageId}`, imageData))
            } else {
              // If image not found, replace with error image
              content = content.replace(
                fullMatch,
                fullMatch.replace(`cornell-image://${imageId}`, "/system-error-screen.png"),
              )
            }
          } catch (error) {
            console.error(`Error loading image ${imageId}:`, error)
            // Replace with error image on failure
            content = content.replace(
              fullMatch,
              fullMatch.replace(`cornell-image://${imageId}`, "/system-error-screen.png"),
            )
          }
        }
      }

      // Process note links if onNoteClick is provided
      if (onNoteClick) {
        content = processNoteLinks(content, onNoteClick)
      }

      setProcessedContent(content)
    }

    processImages()
  }, [markdown, onNoteClick])

  const sections = useMemo(() => {
    // Split the markdown by headings
    const lines = processedContent.split("\n")
    const sections: Section[] = []

    let currentHeading = ""
    let currentContent: string[] = []

    // Process each line
    lines.forEach((line) => {
      if (line.startsWith("# ")) {
        // If we already have a heading, save the previous section
        if (currentHeading) {
          const id = currentHeading
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
          sections.push({
            heading: currentHeading,
            content: currentContent.join("\n"),
            id,
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
      const id = currentHeading
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      sections.push({
        heading: currentHeading,
        content: currentContent.join("\n"),
        id,
      })
    }

    return sections
  }, [processedContent])

  // Handle note link clicks with improved event handling
  const handleContentClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement

    // Check if the clicked element or any parent has the note-link class
    let linkElement = target
    while (linkElement && !linkElement.classList.contains("note-link")) {
      linkElement = linkElement.parentElement as HTMLElement
      if (!linkElement || linkElement === event.currentTarget) break
    }

    if (linkElement && linkElement.classList.contains("note-link") && onNoteClick) {
      event.preventDefault()
      event.stopPropagation()

      const title = linkElement.getAttribute("data-title")
      if (title) {
        console.log("Note link clicked:", title)
        onNoteClick(title)
      }
    }
  }

  // If there are no sections, show a message
  if (sections.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">Add headings with # to create Cornell-style notes</div>
    )
  }

  return (
    <div className="border rounded-md overflow-hidden" onClick={handleContentClick}>
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
              <div className="pt-[2px]" id={section.id}>
                {section.heading}
              </div>

              {/* Right border that visually connects to the content */}
              <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-border"></div>

              {/* Bottom border that separates sections */}
              {index < sections.length - 1 && (
                <div className="absolute left-0 right-0 bottom-0 h-[1px] bg-border"></div>
              )}
            </div>

            <div className={`py-4 px-4 relative ${index % 2 === 0 ? "bg-muted/10" : "bg-background"}`}>
              {/* First render any HTML content directly */}
              <div
                className="html-content w-full"
                dangerouslySetInnerHTML={{
                  __html: renderHtmlContent(section.content),
                }}
              />

              {/* Then render markdown content with ReactMarkdown */}
              <div className="markdown-content w-full overflow-x-auto">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Style the markdown elements
                    p: ({ node, ...props }) => <p className="mb-4 last:mb-0 w-full" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 last:mb-0" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 last:mb-0" {...props} />,
                    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-3" {...props} />,
                    h4: ({ node, ...props }) => <h4 className="text-base font-bold mb-2" {...props} />,
                    a: ({ node, ...props }) => <a className="text-primary underline" {...props} />,
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic mb-4" {...props} />
                    ),
                    code: ({ node, inline, ...props }) =>
                      inline ? (
                        <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props} />
                      ) : (
                        <code
                          className="block bg-muted p-3 rounded-md text-sm font-mono overflow-x-auto mb-4"
                          {...props}
                        />
                      ),
                    pre: ({ node, ...props }) => <pre className="mb-4 last:mb-0" {...props} />,
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto mb-4 last:mb-0">
                        <table className="w-full border-collapse" {...props} />
                      </div>
                    ),
                    thead: ({ node, ...props }) => <thead className="bg-muted/50" {...props} />,
                    tbody: ({ node, ...props }) => <tbody {...props} />,
                    tr: ({ node, ...props }) => <tr className="border-b border-border last:border-0" {...props} />,
                    th: ({ node, ...props }) => <th className="px-4 py-2 text-left font-medium" {...props} />,
                    td: ({ node, ...props }) => (
                      <td className="px-4 py-2 border-r border-border last:border-0" {...props} />
                    ),
                    img: ({ node, src, alt, className, ...props }) => {
                      // Don't render the image if src is empty
                      if (!src) return null

                      return (
                        <img
                          src={src || "/placeholder.svg"}
                          alt={alt || "Image"}
                          className="w-full h-auto object-contain rounded-md my-4"
                          loading="lazy"
                          onError={(e) => {
                            console.error("Image failed to load:", src)
                            ;(e.target as HTMLImageElement).src = "/system-error-screen.png"
                            ;(e.target as HTMLImageElement).alt = "Error loading image"
                          }}
                        />
                      )
                    },
                  }}
                >
                  {removeHtmlContent(section.content)}
                </ReactMarkdown>
              </div>

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

// Extract and render HTML content
function renderHtmlContent(content: string): string {
  // Extract HTML image tags and note links
  const imgRegex = /<img.*?\/>/g
  const noteLinks = /<span class="note-link".*?<\/span>/g

  const imgMatches = content.match(imgRegex) || []
  const linkMatches = content.match(noteLinks) || []

  const allMatches = [...imgMatches, ...linkMatches]

  if (allMatches.length === 0) return ""

  // Return the HTML for these elements with maximum width styling
  return allMatches
    .map((match) => {
      if (match.includes("<img")) {
        // Force maximum width with inline styles to override any CSS constraints
        return match.replace(
          "<img",
          '<img style="width: 100% !important; max-width: none !important; height: auto !important; display: block !important; margin: 1rem 0 !important; object-fit: contain !important;"',
        )
      }
      return match
    })
    .join("\n")
}

// Remove HTML content from markdown to prevent duplication
function removeHtmlContent(content: string): string {
  // Remove HTML image tags and note links from the content to prevent them from being rendered as text
  return content.replace(/<img.*?\/>/g, "").replace(/<span class="note-link".*?<\/span>/g, "")
}
