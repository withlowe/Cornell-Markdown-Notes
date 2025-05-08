"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CornellNotes } from "@/components/cornell-notes"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TagInput } from "@/components/tag-input"
import { TableGenerator } from "@/components/table-generator"
import { ImageInserter } from "@/components/image-inserter"
import { exportToPdf } from "@/lib/export-utils"
import { saveDocument, getDocument } from "@/lib/storage-utils"
import { PlusCircle, Save, FileDown, BookOpen, ArrowLeft, Table2, ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function NotesApp() {
  const router = useRouter()
  const { toast } = useToast()
  const [id, setId] = useState<string | null>(null)
  const [title, setTitle] = useState<string>("Untitled Note")
  const [summary, setSummary] = useState<string>("")
  const [tags, setTags] = useState<string[]>([])
  const [markdown, setMarkdown] = useState<string>(
    `# Introduction to React
React is a JavaScript library for building user interfaces.

# Key Concepts
React uses a virtual DOM to improve performance.

Here's a simple list of React concepts:
- Components
- Props
- State
- JSX
- Virtual DOM`,
  )
  const [isTableGeneratorOpen, setIsTableGeneratorOpen] = useState(false)
  const [isImageInserterOpen, setIsImageInserterOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check if we're editing an existing document
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const docId = urlParams.get("id")

    if (docId) {
      const doc = getDocument(docId)
      if (doc) {
        setId(docId)
        setTitle(doc.title)
        setSummary(doc.summary || "")
        setTags(doc.tags)
        setMarkdown(doc.content)
      }
    }
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const docId = await saveDocument({
        id: id || undefined,
        title,
        summary,
        tags,
        content: markdown,
        createdAt: new Date().toISOString(),
      })

      setId(docId)

      toast({
        title: "Document saved",
        description: "Your note has been saved to your library",
      })
    } catch (error) {
      console.error("Error saving document:", error)
      toast({
        title: "Save failed",
        description: "There was an error saving your note. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportPdf = async () => {
    try {
      await exportToPdf(title, summary, markdown)

      toast({
        title: "PDF exported",
        description: "Your note has been exported as a PDF",
      })
    } catch (error) {
      console.error("PDF export error:", error)

      toast({
        title: "PDF export failed",
        description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const handleInsertTable = (tableMarkdown: string) => {
    insertAtCursor(tableMarkdown)
  }

  // Update the handleInsertImage function to ensure proper markdown formatting for data URLs
  const handleInsertImage = (imageMarkdown: string) => {
    console.log("Inserting image markdown:", imageMarkdown.substring(0, 50) + "...")
    insertAtCursor(imageMarkdown)
  }

  const insertAtCursor = (content: string) => {
    // Insert the content at the current cursor position or at the end
    const textarea = textareaRef.current

    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      const newMarkdown = markdown.substring(0, start) + content + markdown.substring(end)

      setMarkdown(newMarkdown)

      // Set focus back to textarea
      setTimeout(() => {
        textarea.focus()
        const newCursorPos = start + content.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    } else {
      // If we can't find the textarea, just append to the end
      setMarkdown(markdown + "\n\n" + content)
    }
  }

  // Handle keyboard input for table detection and formatting
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check if the user pressed Enter after typing a table row
    if (e.key === "Enter") {
      const textarea = textareaRef.current
      if (!textarea) return

      const value = textarea.value
      const cursorPos = textarea.selectionStart
      const currentLine = getCurrentLine(value, cursorPos)

      // Check if the current line is a table row (starts and ends with |)
      if (isTableRow(currentLine)) {
        e.preventDefault()

        // Just add a new empty row with the same number of columns
        // without automatically adding a separator row
        const columnCount = countColumns(currentLine)
        const newEmptyRow = createEmptyRow(columnCount)

        const start = textarea.selectionStart
        const textBeforeCursor = value.substring(0, start)
        const textAfterCursor = value.substring(start)

        const newValue = textBeforeCursor + "\n" + newEmptyRow
        setMarkdown(newValue + textAfterCursor)

        // Set cursor position to the empty row
        setTimeout(() => {
          const newPos = start + newEmptyRow.length + 1
          textarea.setSelectionRange(newPos - 2, newPos - 2)
        }, 0)
      }
    }

    // Check if the user typed | to start a table
    if (e.key === "|") {
      const textarea = textareaRef.current
      if (!textarea) return

      const value = textarea.value
      const cursorPos = textarea.selectionStart
      const currentLine = getCurrentLine(value, cursorPos)

      // If this is the first | in the line and the line is empty or only has whitespace
      if (currentLine.trim() === "") {
        // Don't prevent default, let the | character be typed
        // But set a timeout to check if we should suggest a table structure
        setTimeout(() => {
          // Show a toast suggesting to use the table generator
          toast({
            title: "Table detected",
            description: "Type column headers separated by | or use the table generator for more options",
            action: (
              <Button size="sm" onClick={() => setIsTableGeneratorOpen(true)}>
                Open Generator
              </Button>
            ),
          })
        }, 100)
      }
    }
  }

  // Helper functions for table detection and formatting
  const getCurrentLine = (text: string, cursorPos: number): string => {
    const textBeforeCursor = text.substring(0, cursorPos)
    const lastNewlineBeforeCursor = textBeforeCursor.lastIndexOf("\n")
    const lineStart = lastNewlineBeforeCursor === -1 ? 0 : lastNewlineBeforeCursor + 1

    const textAfterCursor = text.substring(cursorPos)
    const firstNewlineAfterCursor = textAfterCursor.indexOf("\n")
    const lineEnd = firstNewlineAfterCursor === -1 ? text.length : cursorPos + firstNewlineAfterCursor

    return text.substring(lineStart, lineEnd)
  }

  const getPreviousLine = (text: string, cursorPos: number): string => {
    const textBeforeCursor = text.substring(0, cursorPos)
    const lastNewlineBeforeCursor = textBeforeCursor.lastIndexOf("\n")

    if (lastNewlineBeforeCursor === -1) return ""

    const secondLastNewline = textBeforeCursor.lastIndexOf("\n", lastNewlineBeforeCursor - 1)
    const lineStart = secondLastNewline === -1 ? 0 : secondLastNewline + 1

    return text.substring(lineStart, lastNewlineBeforeCursor)
  }

  const isTableRow = (line: string): boolean => {
    return line.trim().startsWith("|") && line.trim().endsWith("|")
  }

  const countColumns = (tableRow: string): number => {
    // Count the number of | characters and subtract 1
    return (tableRow.match(/\|/g) || []).length - 1
  }

  const createSeparatorRow = (columnCount: number): string => {
    let row = "|"
    for (let i = 0; i < columnCount; i++) {
      row += " --- |"
    }
    return row
  }

  const createEmptyRow = (columnCount: number): string => {
    let row = "|"
    for (let i = 0; i < columnCount; i++) {
      row += "  |"
    }
    return row
  }

  return (
    <main className="container mx-auto p-4 max-w-6xl flex flex-col min-h-screen bg-background text-foreground">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/library")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Notes</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/library")}>
            <BookOpen className="mr-2 h-4 w-4" />
            Library
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setId(null)
              setTitle("Untitled Note")
              setSummary("")
              setTags([])
              setMarkdown("")
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Note
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-4">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="title" className="mb-2 block">
                  Title
                </Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" />
              </div>
              <div>
                <Label htmlFor="tags" className="mb-2 block">
                  Tags
                </Label>
                <TagInput id="tags" tags={tags} setTags={setTags} placeholder="Add tags..." />
              </div>
            </div>

            <div>
              <Label htmlFor="summary" className="mb-2 block">
                Summary
              </Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief summary of your note"
                className="resize-none h-20"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4 flex-1">
        <Card className="flex flex-col h-full">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold">Input</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImageInserterOpen(true)}
                  className="flex items-center gap-1"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>Add Image</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTableGeneratorOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Table2 className="h-4 w-4" />
                  <span>Add Table</span>
                </Button>
              </div>
            </div>
            <Textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-h-0 font-mono resize-none bg-background"
              placeholder="Enter your markdown notes here..."
            />
            <div className="mt-2 text-sm text-muted-foreground">
              Use markdown headings (#) for key points. Content under each heading will appear as notes.
              <br />
              <span className="text-xs">
                Tip: Use the Add Image and Add Table buttons to insert media at your cursor position.
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full">
          <CardContent className="p-4 flex flex-col h-full overflow-auto">
            <h2 className="text-xl font-semibold mb-2">Preview</h2>
            <div className="flex-1 overflow-auto">
              <CornellNotes markdown={markdown} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2 mt-auto pt-2">
        <Button variant="outline" onClick={handleExportPdf}>
          <FileDown className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save to Library"}
        </Button>
      </div>

      <TableGenerator
        isOpen={isTableGeneratorOpen}
        onClose={() => setIsTableGeneratorOpen(false)}
        onInsert={handleInsertTable}
      />

      <ImageInserter
        isOpen={isImageInserterOpen}
        onClose={() => setIsImageInserterOpen(false)}
        onInsert={handleInsertImage}
      />
    </main>
  )
}
