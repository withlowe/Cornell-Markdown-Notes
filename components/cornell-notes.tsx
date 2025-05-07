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
      <div className="grid grid-cols-[1fr_3fr] divide-x">
        {/* Header row */}
        <div className="bg-muted p-4 font-medium text-sm uppercase text-center border-b">Key Points</div>
        <div className="bg-muted p-4 font-medium text-sm uppercase text-center border-b">Notes</div>

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

            <div
              className={`py-4 px-4 whitespace-pre-wrap relative ${index % 2 === 0 ? "bg-muted/10" : "bg-background"}`}
            >
              {section.content}

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
