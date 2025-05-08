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
import { exportToPdf } from "@/lib/export-utils"
import { saveDocument, getDocument } from "@/lib/storage-utils"
import { PlusCircle, Save, FileDown, BookOpen, ArrowLeft } from "lucide-react"
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

  const handleSave = () => {
    const docId = saveDocument({
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
            <h2 className="text-xl font-semibold mb-2">Input</h2>
            <Textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="flex-1 min-h-0 font-mono resize-none bg-background"
              placeholder="Enter your markdown notes here..."
            />
            <div className="mt-2 text-sm text-muted-foreground">
              Use markdown headings (#) for key points. Content under each heading will appear as notes.
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
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save to Library
        </Button>
      </div>
    </main>
  )
}
