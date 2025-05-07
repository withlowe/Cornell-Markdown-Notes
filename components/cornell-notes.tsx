"use client"

import { useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

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

            <div className={`py-4 px-4 relative ${index % 2 === 0 ? "bg-muted/10" : "bg-background"}`}>
              {/* Render markdown content with ReactMarkdown */}
              <div className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Style the markdown elements
                    p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
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
                  }}
                >
                  {section.content}
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
