"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getAllDocuments, deleteDocument, type DocumentData } from "@/lib/storage-utils"
import { exportAllToZip, importMarkdownFiles } from "@/lib/export-import-utils"
import { PlusCircle, Search, Trash2, Edit, Tag, BookOpen, FileText, Home, Download, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { CornellNotes } from "@/components/cornell-notes"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, X } from "lucide-react"

export default function LibraryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [activeDocument, setActiveDocument] = useState<DocumentData | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleExportAll = async () => {
    if (documents.length === 0) {
      toast({
        title: "No documents to export",
        description: "Create some notes first before exporting",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)
    try {
      await exportAllToZip()
      toast({
        title: "Export successful",
        description: `Exported ${documents.length} notes as markdown files`,
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsImporting(true)
    try {
      const count = await importMarkdownFiles(files)
      loadDocuments()
      toast({
        title: "Import successful",
        description: `Imported ${count} markdown files`,
      })
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Documentation-style sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border min-h-screen">
        <div className="p-4 border-b border-border flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <BookOpen className="h-5 w-5" />
            Notes
          </Link>

          {/* Moved Add Note button to top */}
          <Button className="w-full" onClick={() => router.push("/")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Note
          </Button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between font-medium mb-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Filter by Tags
              </div>
              {selectedTags.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])} className="h-6 px-2 text-xs">
                  Clear
                </Button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedTags.length > 0
                    ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selected`
                    : "Select tags"}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-80 overflow-auto">
                <DropdownMenuLabel>Available Tags</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allTags.length > 0 ? (
                  allTags.map((tag) => (
                    <DropdownMenuCheckboxItem
                      key={tag}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => toggleTag(tag)}
                      className="uppercase"
                    >
                      {tag}
                    </DropdownMenuCheckboxItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No tags available</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTags.map((tag) => (
                  <Badge key={tag} className="uppercase">
                    {tag}
                    <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => toggleTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="font-medium mb-2">Documents</div>
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <button
                  key={doc.id}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded-md",
                    activeDocument?.id === doc.id
                      ? "bg-accent text-accent-foreground font-medium"
                      : "hover:bg-accent/50",
                  )}
                  onClick={() => setActiveDocument(doc)}
                >
                  <div className="line-clamp-1">{doc.title}</div>
                </button>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No documents found</div>
            )}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-border flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleExportAll} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleImportClick} disabled={isImporting}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFiles}
              accept=".md"
              multiple
              className="hidden"
            />
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto bg-background">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-5 w-5" />
            Notes
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              <Home className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => router.push("/")}>
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Mobile search and filters */}
        <div className="md:hidden p-4 border-b border-border">
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between font-medium mb-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Filter by Tags
              </div>
              {selectedTags.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])} className="h-6 px-2 text-xs">
                  Clear
                </Button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedTags.length > 0
                    ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selected`
                    : "Select tags"}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-80 overflow-auto">
                <DropdownMenuLabel>Available Tags</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allTags.length > 0 ? (
                  allTags.map((tag) => (
                    <DropdownMenuCheckboxItem
                      key={tag}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => toggleTag(tag)}
                      className="uppercase"
                    >
                      {tag}
                    </DropdownMenuCheckboxItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No tags available</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTags.map((tag) => (
                  <Badge key={tag} className="uppercase">
                    {tag}
                    <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => toggleTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Mobile import/export buttons */}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleExportAll} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={handleImportClick} disabled={isImporting}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          </div>
        </div>

        {/* Document list (mobile only) */}
        <div className="md:hidden">
          {filteredDocuments.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 cursor-pointer hover:bg-accent/50"
                  onClick={() => setActiveDocument(doc)}
                >
                  <div className="font-medium mb-1">{doc.title}</div>
                  {doc.summary && <div className="text-sm text-muted-foreground mb-2">{doc.summary}</div>}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {doc.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs uppercase">
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
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedTags.length > 0
                  ? "Try adjusting your search or filters"
                  : "Create your first note to get started"}
              </p>
              <Button onClick={() => router.push("/")}>
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {activeDocument.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="uppercase">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push(`/?id=${activeDocument.id}`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="default"
                  className="bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black dark:hover:bg-white/90"
                  onClick={() => handleDelete(activeDocument.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Summary section */}
            {activeDocument.summary && (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold mb-2">Summary</h2>
                  <p className="text-foreground">{activeDocument.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Table of contents */}
            <Card className="mb-8">
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
              <p className="text-muted-foreground mb-4">
                {filteredDocuments.length > 0
                  ? "Select a document from the sidebar to view"
                  : "Create your first note to get started"}
              </p>
              <Button onClick={() => router.push("/")}>
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
