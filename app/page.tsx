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
import { FlashcardGenerator } from "@/components/flashcard-generator"
import { exportToPdf } from "@/lib/export-utils"
import { saveDocument, getDocument } from "@/lib/storage-utils"
import { WysimarkEditor } from "@/components/wysimark-editor"

export default function NotesApp() {
  const router = useRouter()
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
  const [isFlashcardGeneratorOpen, setIsFlashcardGeneratorOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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

  // Replace the insertAtCursor function with this improved version that inserts at cursor position
  const insertAtCursor = (content: string) => {
    // Get the textarea element
    const textarea = document.querySelector("textarea")

    if (textarea) {
      // Get cursor position
      const startPos = textarea.selectionStart
      const endPos = textarea.selectionEnd

      // Get text before and after cursor
      const textBefore = markdown.substring(0, startPos)
      const textAfter = markdown.substring(endPos)

      // Insert content at cursor position with proper spacing
      const newText =
        textBefore +
        (textBefore.endsWith("\n\n") ? "" : textBefore.endsWith("\n") ? "\n" : "\n\n") +
        content +
        (textAfter.startsWith("\n") ? "" : "\n\n") +
        textAfter

      setMarkdown(newText)

      // Set cursor position after inserted content
      setTimeout(() => {
        const newCursorPos =
          startPos + content.length + (textBefore.endsWith("\n\n") ? 0 : textBefore.endsWith("\n") ? 1 : 2)
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    } else {
      // Fallback to appending if textarea not found
      setMarkdown(markdown + "\n\n" + content)
    }
  }

  const handleGenerateFlashcards = () => {
    // First save the document if it's not saved yet
    if (!id) {
      handleSave()
    }

    // Open the flashcard generator
    setIsFlashcardGeneratorOpen(true)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container-standard py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-heading-1">Notes</h1>
          <div className="flex gap-3">
            <Button size="default" variant="ghost" onClick={() => router.push("/flashcards")}>
              Flashcards
            </Button>
            <Button size="default" variant="ghost" onClick={() => router.push("/library")}>
              Library
            </Button>
            <Button
              size="default"
              variant="outline"
              onClick={() => {
                setId(null)
                setTitle("Untitled Note")
                setSummary("")
                setTags([])
                setMarkdown("")
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
                  <h2 className="text-heading-3">Input</h2>
                  <div className="flex gap-3">
                    <Button size="default" variant="outline" onClick={() => setIsImageInserterOpen(true)}>
                      Add Image
                    </Button>
                    <Button size="default" variant="outline" onClick={() => setIsTableGeneratorOpen(true)}>
                      Add Table
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
                  Use markdown headings (#) for key points. Content under each heading will appear as notes.
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
            <Button size="default" variant="outline" onClick={handleGenerateFlashcards}>
              Generate Flashcards
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

      <FlashcardGenerator
        isOpen={isFlashcardGeneratorOpen}
        onClose={() => setIsFlashcardGeneratorOpen(false)}
        documentId={id}
        documentTitle={title}
        documentContent={markdown}
        documentTags={tags}
      />
    </main>
  )
}
