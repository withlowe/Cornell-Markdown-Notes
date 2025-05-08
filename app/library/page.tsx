"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getAllDocuments, deleteDocument, type DocumentData } from "@/lib/storage-utils"
import { PlusCircle, Search, Trash2, Edit, Tag, BookOpen, FileText, Home } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { CornellNotes } from "@/components/cornell-notes"

export default function LibraryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [activeDocument, setActiveDocument] = useState<DocumentData | null>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = () => {
    const docs = getAllDocuments()
    setDocuments(docs)

    // Extract all unique tags
    const tags = docs.flatMap((doc) => doc.tags)
    setAllTags([...new Set(tags)])

    // Set the first document as active if there are documents
    if (docs.length > 0 && !activeDocument) {
      setActiveDocument(docs[0])
    }
  }

  const handleDelete = (id: string) => {
    deleteDocument(id)

    // If the active document is deleted, set the first document as active
    if (activeDocument && activeDocument.id === id) {
      const remainingDocs = documents.filter((doc) => doc.id !== id)
      setActiveDocument(remainingDocs.length > 0 ? remainingDocs[0] : null)
    }

    loadDocuments()

    toast({
      title: "Document deleted",
      description: "The note has been removed from your library",
    })
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  // Fixed search and tag filtering
  const filteredDocuments = documents.filter((doc) => {
    // Filter by search term (fixed to properly search in title and content)
    const matchesSearch =
      searchTerm === "" ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.summary && doc.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase())

    // Filter by selected tags (fixed to properly filter by tags)
    const matchesTags = selectedTags.length === 0 || selectedTags.every((tag) => doc.tags.includes(tag))

    return matchesSearch && matchesTags
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Extract headings from markdown content
  const extractHeadings = (content: string): string[] => {
    const headings: string[] = []
    const lines = content.split("\n")

    lines.forEach((line) => {
      if (line.startsWith("# ")) {
        headings.push(line.substring(2))
      }
    })

    return headings
  }

  return (
    <div className="flex min-h-screen bg-white text-black">
      {/* Documentation-style sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-gray-200 min-h-screen">
        <div className="p-4 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <BookOpen className="h-5 w-5" />
            Notes
          </Link>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search notes..."
              className="pl-8 border-gray-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 font-medium mb-2">
              <Tag className="h-4 w-4" />
              Filter by Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.length > 0 ? (
                allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer uppercase",
                      selectedTags.includes(tag)
                        ? "bg-black text-white hover:bg-gray-800"
                        : "bg-white text-black border-gray-300 hover:bg-gray-100",
                    )}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))
              ) : (
                <div className="text-sm text-gray-500">No tags found</div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-medium mb-2">Documents</div>
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <button
                  key={doc.id}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded-md",
                    activeDocument?.id === doc.id ? "bg-gray-200 text-black font-medium" : "hover:bg-gray-100",
                  )}
                  onClick={() => setActiveDocument(doc)}
                >
                  <div className="line-clamp-1">{doc.title}</div>
                </button>
              ))
            ) : (
              <div className="text-sm text-gray-500">No documents found</div>
            )}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-gray-200">
          <Button className="w-full bg-black text-white hover:bg-gray-800" onClick={() => router.push("/")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Note
          </Button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto bg-white">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-5 w-5" />
            Notes
          </Link>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 text-black hover:bg-gray-100"
              onClick={() => router.push("/")}
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button size="sm" className="bg-black text-white hover:bg-gray-800" onClick={() => router.push("/")}>
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Mobile search and filters */}
        <div className="md:hidden p-4 border-b border-gray-200">
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search notes..."
              className="pl-8 border-gray-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mb-2">
            <div className="flex items-center gap-2 font-medium mb-2">
              <Tag className="h-4 w-4" />
              Filter by Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.length > 0 ? (
                allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer uppercase",
                      selectedTags.includes(tag)
                        ? "bg-black text-white hover:bg-gray-800"
                        : "bg-white text-black border-gray-300 hover:bg-gray-100",
                    )}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))
              ) : (
                <div className="text-sm text-gray-500">No tags found</div>
              )}
            </div>
          </div>
        </div>

        {/* Document list (mobile only) */}
        <div className="md:hidden">
          {filteredDocuments.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setActiveDocument(doc)}
                >
                  <div className="font-medium mb-1">{doc.title}</div>
                  {doc.summary && <div className="text-sm text-gray-600 mb-2">{doc.summary}</div>}
                  <div className="text-sm text-gray-500 mb-2">Created: {formatDate(doc.createdAt)}</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {doc.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs uppercase bg-gray-100 text-gray-800">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-12">
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedTags.length > 0
                  ? "Try adjusting your search or filters"
                  : "Create your first note to get started"}
              </p>
              <Button className="bg-black text-white hover:bg-gray-800" onClick={() => router.push("/")}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Note
              </Button>
            </div>
          )}
        </div>

        {/* Document content (desktop and mobile) */}
        {activeDocument ? (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold">{activeDocument.title}</h1>
                <div className="text-sm text-gray-500 mt-1">Created: {formatDate(activeDocument.createdAt)}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {activeDocument.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="uppercase bg-gray-100 text-gray-800">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-gray-300 text-black hover:bg-gray-100"
                  onClick={() => router.push(`/?id=${activeDocument.id}`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  className="bg-black text-white hover:bg-gray-800"
                  onClick={() => handleDelete(activeDocument.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Summary section */}
            {activeDocument.summary && (
              <Card className="mb-6 border border-gray-200">
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold mb-2">Summary</h2>
                  <p className="text-gray-700">{activeDocument.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Table of contents */}
            <Card className="mb-8 border border-gray-200">
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Table of Contents
                </h2>
                <ul className="space-y-1">
                  {extractHeadings(activeDocument.content).map((heading, index) => (
                    <li key={index} className="text-sm">
                      • {heading}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Cornell notes preview */}
            <CornellNotes markdown={activeDocument.content} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[calc(100vh-4rem)] md:h-screen">
            <div className="text-center p-12">
              <h3 className="text-lg font-medium mb-2">No document selected</h3>
              <p className="text-gray-500 mb-4">
                {filteredDocuments.length > 0
                  ? "Select a document from the sidebar to view"
                  : "Create your first note to get started"}
              </p>
              <Button className="bg-black text-white hover:bg-gray-800" onClick={() => router.push("/")}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Note
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
