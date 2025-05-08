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
  const [tags, setTags] = useState<string[]>([])
  const [markdown, setMarkdown] = useState<string>(
    `# Introduction to React
React is a JavaScript library for building user interfaces. It was developed by Facebook and is now maintained by Facebook and a community of individual developers and companies.

# Key Concepts
React uses a virtual DOM to improve performance. It also uses a component-based architecture, which allows for reusable UI elements.

Here's a simple list of React concepts:
- Components
- Props
- State
- JSX
- Virtual DOM

## Component Types
There are two main types of components:
1. Function Components
2. Class Components

# JSX
JSX is a syntax extension for JavaScript that looks similar to HTML. It's used with React to describe what the UI should look like.

\`\`\`jsx
function Welcome() {
  return <h1>Hello, world!</h1>;
}
\`\`\`

# Components
Components are the building blocks of React applications. They are reusable pieces of code that return React elements describing what should appear on the screen.

| Component Type | Description | Use Case |
| -------------- | ----------- | -------- |
| Function | Simple, stateless | UI elements |
| Class | Complex, stateful | Container components |
| HOC | Reuse component logic | Cross-cutting concerns |

# Props
Props are inputs to components. They are data passed from a parent component to a child component.

> Props are read-only and should not be modified within a component.

# State
State is data that changes over time. When state changes, React re-renders the component.`,
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
        setTags(doc.tags)
        setMarkdown(doc.content)
      }
    }
  }, [])

  const handleSave = () => {
    const docId = saveDocument({
      id: id || undefined,
      title,
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
      await exportToPdf(title, markdown)

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
    <main className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="button-black-outline"
            onClick={() => router.push("/library")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Notes</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="button-black-outline" onClick={() => router.push("/library")}>
            <BookOpen className="mr-2 h-4 w-4" />
            Library
          </Button>
          <Button
            variant="outline"
            className="button-black-outline"
            onClick={() => {
              setId(null)
              setTitle("Untitled Note")
              setTags([])
              setMarkdown("")
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Note
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold mb-4">Input</h2>
            <Textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="min-h-[400px] font-mono"
              placeholder="Enter your markdown notes here..."
            />
            <div className="mt-4 text-sm text-muted-foreground">
              Use markdown headings (#) for key points. Content under each heading will appear as notes.
              <br />
              Supports Markdown features: **bold**, *italic*, lists, tables, code blocks, and more.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold mb-4">Preview</h2>
            <CornellNotes markdown={markdown} />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" className="button-black-outline" onClick={handleExportPdf}>
          <FileDown className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
        <Button className="button-black" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save to Library
        </Button>
      </div>
    </main>
  )
}
