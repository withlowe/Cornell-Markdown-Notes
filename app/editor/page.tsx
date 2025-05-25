"use client"

import { useEffect, useState } from "react"
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
import { NoteLinkInput } from "@/components/note-link-input"
import { exportToPdf } from "@/lib/export-utils"
import { saveDocument, getDocument } from "@/lib/storage-utils"
import { WysimarkEditor } from "@/components/wysimark-editor"
import { Hash } from 'lucide-react'

export default function NotesEditorPage() {
  const router = useRouter()
  const [id, setId] = useState<string | null>(null)
  const [title, setTitle] = useState<string>("Untitled Note")
  const [summary, setSummary] = useState<string>("")
  const [tags, setTags] = useState<string[]>([])
  const [markdown, setMarkdown] = useState<string>("")
  const [isTableGeneratorOpen, setIsTableGeneratorOpen] = useState(false)
  const [isImageInserterOpen, setIsImageInserterOpen] = useState(false)
  const [isNoteLinkInputOpen, setIsNoteLinkInputOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Check if we're editing an existing document or creating a new one with a title
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const docId = urlParams.get("id")
      const titleParam = urlParams.get("title")

      if (docId) {
        const doc = getDocument(docId)
        if (doc) {
          setId(docId)
          setTitle(doc.title)
          setSummary(doc.summary || "")
          setTags(doc.tags)
          setMarkdown(doc.content)
        }
      } else if (titleParam) {
        // Creating a new note with a specific title (from note links)
        const decodedTitle = decodeURIComponent(titleParam)
        setTitle(decodedTitle)
        setMarkdown(`# ${decodedTitle}\n\n`)
      } else {
        // Default content for new notes
        setMarkdown(`# Introduction
Start writing your notes here.

# Key Points
Add your main ideas and concepts.`)
      }
    } catch (error) {
      console.error("Error loading document:", error)
      // Set default content if there's an error
      setMarkdown(`# Introduction
Start writing your notes here.

# Key Points
Add your main ideas and concepts.`)
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

      console.log("Document saved to library")
    } catch (error) {
      console.error("Save failed:", error)
      alert("There was an error saving your note. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportPdf = async () => {
    try {
      await exportToPdf(title, summary, markdown)

      console.log("PDF exported successfully")
    } catch (error) {
      console.error("PDF export failed:", error)
      alert(`PDF export failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleInsertTable = (tableMarkdown: string) => {
    insertAtCursor(tableMarkdown)
  }

  const handleInsertImage = (imageMarkdown: string) => {
    console.log("Inserting image markdown:", imageMarkdown.substring(0, 50) + "...")
    insertAtCursor(imageMarkdown)
  }

  const handleInsertNoteLink = (linkText: string) => {
    insertAtCursor(linkText)
    setIsNoteLinkInputOpen(false)
  }

  // Function to insert text at cursor position
  const insertAtCursor = (textToInsert: string) => {
    try {
      // Get the textarea element from the window object where WysimarkEditor exposed it
      // @ts-ignore - Accessing custom property on window
      const textarea = window.cornellNotesTextarea || document.querySelector("textarea")

      if (textarea) {
        // Get cursor position
        const startPos = textarea.selectionStart
        const endPos = textarea.selectionEnd

        // Get text before and after cursor
        const textBefore = markdown.substring(0, startPos)
        const textAfter = markdown.substring(endPos)

        // Check if we're at the beginning of a line or if there's a newline before
        const isAtLineStart = startPos === 0 || markdown.charAt(startPos - 1) === "\n"

        // If inserting a heading and not at the beginning of a line, add a newline first
        const needsNewline = textToInsert.startsWith("#") && !isAtLineStart

        // If the cursor is at the end of a line and the next character isn't a newline, add a newline after
        const needsNewlineAfter =
          textToInsert.startsWith("#") && endPos < markdown.length && markdown.charAt(endPos) !== "\n"

        // Construct the new text
        const newText =
          textBefore + (needsNewline ? "\n" : "") + textToInsert + (needsNewlineAfter ? "\n" : "") + textAfter

        // Update the markdown state
        setMarkdown(newText)

        // Set the cursor position after the inserted text
        setTimeout(() => {
          const newCursorPos = startPos + (needsNewline ? 1 : 0) + textToInsert.length

          textarea.focus()
          textarea.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
      }
    } catch (error) {
      console.error("Error inserting text:", error)
      // Fallback: just append to the end
      setMarkdown((prev) => prev + "\n" + textToInsert)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container-standard py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-heading-1">Editor</h1>
          <div className="flex gap-3">
            <Button size="default" variant="ghost" onClick={() => router.push("/")}>
              Library
            </Button>
            <Button
              size="default"
              variant="outline"
              className="hidden md:block"
              onClick={() => {
                setId(null)
                setTitle("Untitled Note")
                setSummary("")
                setTags([])
                setMarkdown(`# Introduction
Start writing your notes here.

# Key Points
Add your main ideas and concepts.`)
              }}
            >
              New Note
            </Button>
          </div>
        </header>

        <div className="space-y-6">
          <Card className="border shadow-sm card-standard">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label htmlFor="title" className="mb-2 block text-sm font-medium">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note title"
                    className="input-standard"
                  />
                </div>
                <div>
                  <Label htmlFor="tags" className="mb-2 block text-sm font-medium">
                    Tags
                  </Label>
                  <TagInput id="tags" tags={tags} setTags={setTags} placeholder="Add tags..." />
                </div>
              </div>

              <div>
                <Label htmlFor="summary" className="mb-2 block text-sm font-medium">
                  Summary
                </Label>
                <Textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Brief summary of your note"
                  className="resize-none h-20 textarea-standard"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border shadow-sm card-standard h-[600px] flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-heading-3">Edit</h2>
                  <div className="flex gap-3 flex-wrap">
                    <Button size="default" variant="outline" onClick={() => insertAtCursor("# ")}>
                      <Hash className="h-4 w-4" />
                    </Button>
                    {isNoteLinkInputOpen ? (
                      <NoteLinkInput
                        onInsert={handleInsertNoteLink}
                        onClose={() => setIsNoteLinkInputOpen(false)}
                      />
                    ) : (
                      <Button size="default" variant="outline" onClick={() => setIsNoteLinkInputOpen(true)}>
                        Link
                      </Button>
                    )}
                    <Button size="default" variant="outline" onClick={() => setIsImageInserterOpen(true)}>
                      + Image
                    </Button>
                    <Button size="default" variant="outline" onClick={() => setIsTableGeneratorOpen(true)}>
                      + Table
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <WysimarkEditor
                    value={markdown}
                    onChange={setMarkdown}
                    placeholder="Enter your markdown notes here..."
                    className="flex-1 min-h-0"
                  />
                </div>
                <div className="mt-3 text-caption">
                  Use markdown headings (#) for key points. Link to other notes with [[Note Title]].
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm card-standard min-h-[600px] flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <h2 className="text-heading-3 mb-4">Preview</h2>
                <div className="flex-1 overflow-y-auto pr-2">
                  <CornellNotes markdown={markdown} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button size="default" variant="outline" onClick={handleExportPdf}>
              Export PDF
            </Button>
            <Button size="default" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save to Library"}
            </Button>
          </div>
        </div>
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
