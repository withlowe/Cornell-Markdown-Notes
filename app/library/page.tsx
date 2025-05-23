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

// Import the exportToPdf function
import { exportToPdf } from "@/lib/export-utils"

// Add sorting functionality to the library page
// First, add these imports at the top of the file (after the existing imports)
import { ChevronDown, SortAsc, SortDesc } from "lucide-react"

export default function LibraryPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [activeDocument, setActiveDocument] = useState<DocumentData | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Then, add these state variables after the existing state declarations
  const [sortBy, setSortBy] = useState<"date" | "title" | "tags">("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

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

    console.log("Document deleted from library")
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  // Replace the filteredDocuments declaration with this updated version that includes sorting
  const filteredDocuments = documents
    .filter((doc) => {
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
    .sort((a, b) => {
      // Sort by the selected field
      if (sortBy === "date") {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA
      } else if (sortBy === "title") {
        return sortDirection === "asc" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
      } else if (sortBy === "tags") {
        // Sort by the first tag, or title if no tags
        const tagA = a.tags.length > 0 ? a.tags[0] : ""
        const tagB = b.tags.length > 0 ? b.tags[0] : ""
        return sortDirection === "asc" ? tagA.localeCompare(tagB) : tagB.localeCompare(tagA)
      }
      return 0
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
      alert("No documents to export. Create some notes first before exporting.")
      return
    }

    setIsExporting(true)
    try {
      await exportAllToZip()
      console.log(`Exported ${documents.length} notes as markdown files`)
      alert(`Successfully exported ${documents.length} notes as markdown files`)
    } catch (error) {
      console.error("Export failed:", error)
      alert(`Export failed: ${error instanceof Error ? error.message : "Unknown error occurred"}`)
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
      console.log(`Imported ${count} markdown files`)
      alert(`Successfully imported ${count} markdown files`)
    } catch (error) {
      console.error("Import failed:", error)
      alert(`Import failed: ${error instanceof Error ? error.message : "Unknown error occurred"}`)
    } finally {
      setIsImporting(false)
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Add the handleExportPdf function after the handleImportFiles function
  const handleExportPdf = async () => {
    if (!activeDocument) {
      alert("Please select a document to export as PDF.")
      return
    }

    try {
      await exportToPdf(activeDocument.title, activeDocument.summary || "", activeDocument.content)
      console.log("PDF exported successfully")
      alert(`Successfully exported "${activeDocument.title}" as PDF`)
    } catch (error) {
      console.error("PDF export failed:", error)
      alert(`PDF export failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Documentation-style sidebar - wider now */}
      <aside className="hidden md:flex w-80 flex-col border-r border-border min-h-screen">
        <div className="p-4 border-b border-border flex flex-col gap-3">
          <Link href="/" className="font-medium text-lg">
            Notes
          </Link>

          {/* Moved Add Note button to top */}
          <Button size="default" className="w-full" onClick={() => router.push("/")}>
            New Note
          </Button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Input
              placeholder="Search notes..."
              className="input-standard"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between font-medium mb-2 text-sm">
              <div>Sort By</div>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 justify-between">
                    {sortBy === "date" ? "Date" : sortBy === "title" ? "Title" : "Tags"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy("date")}>Date {sortBy === "date" && "✓"}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("title")}>
                    Title {sortBy === "title" && "✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("tags")}>Tags {sortBy === "tags" && "✓"}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                className="w-10 p-0 flex-shrink-0"
                onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                title={sortDirection === "asc" ? "Ascending" : "Descending"}
              >
                {sortDirection === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between font-medium mb-2 text-sm">
              <div>Filter by Tags</div>
              {selectedTags.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])} className="h-7 px-2 text-xs">
                  Clear
                </Button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="default" variant="outline" className="w-full justify-between">
                  {selectedTags.length > 0
                    ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selected`
                    : "Select tags"}
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
                  <Badge key={tag} className="uppercase text-xs">
                    {tag}
                    <button className="ml-1 text-xs" onClick={() => toggleTag(tag)}>
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="font-medium mb-2 text-sm">Documents</div>
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <button
                  key={doc.id}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-md",
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
              <div className="text-xs text-muted-foreground">No documents found</div>
            )}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-border flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              size="default"
              variant="outline"
              className="flex-1"
              onClick={handleExportAll}
              disabled={isExporting}
            >
              Export All
            </Button>
            <Button
              size="default"
              variant="outline"
              className="flex-1"
              onClick={handleImportClick}
              disabled={isImporting}
            >
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
          <Link href="/" className="font-medium">
            Notes
          </Link>
          <div className="flex gap-2">
            <Button size="default" variant="outline" onClick={() => router.push("/")}>
              Home
            </Button>
            <Button size="default" onClick={() => router.push("/")}>
              New
            </Button>
          </div>
        </header>

        {/* Mobile search and filters */}
        <div className="md:hidden p-4 border-b border-border">
          <div className="relative mb-4">
            <Input
              placeholder="Search notes..."
              className="input-standard"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between font-medium mb-2 text-sm">
              <div>Sort By</div>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 justify-between">
                    {sortBy === "date" ? "Date" : sortBy === "title" ? "Title" : "Tags"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy("date")}>Date {sortBy === "date" && "✓"}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("title")}>
                    Title {sortBy === "title" && "✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("tags")}>Tags {sortBy === "tags" && "✓"}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                className="w-10 p-0 flex-shrink-0"
                onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                title={sortDirection === "asc" ? "Ascending" : "Descending"}
              >
                {sortDirection === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between font-medium mb-2 text-sm">
              <div>Filter by Tags</div>
              {selectedTags.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])} className="h-7 px-2 text-xs">
                  Clear
                </Button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="default" variant="outline" className="w-full justify-between">
                  {selectedTags.length > 0
                    ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selected`
                    : "Select tags"}
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
                  <Badge key={tag} className="uppercase text-xs">
                    {tag}
                    <button className="ml-1 text-xs" onClick={() => toggleTag(tag)}>
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Mobile import/export buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              size="default"
              variant="outline"
              className="flex-1"
              onClick={handleExportAll}
              disabled={isExporting}
            >
              Export All
            </Button>
            <Button
              size="default"
              variant="outline"
              className="flex-1"
              onClick={handleImportClick}
              disabled={isImporting}
            >
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
                  <div className="font-medium mb-2">{doc.title}</div>
                  {doc.summary && <div className="text-xs text-muted-foreground mb-2">{doc.summary}</div>}
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
            <div className="text-center p-8">
              <h3 className="text-heading-3 mb-2">No documents found</h3>
              <p className="text-body-sm mb-4">
                {searchTerm || selectedTags.length > 0
                  ? "Try adjusting your search or filters"
                  : "Create your first note to get started"}
              </p>
              <Button size="default" onClick={() => router.push("/")}>
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
                <h1 className="text-heading-1">{activeDocument.title}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  {activeDocument.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="uppercase text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="default" variant="outline" onClick={() => router.push(`/?id=${activeDocument.id}`)}>
                  Edit
                </Button>
                <Button size="default" variant="outline" onClick={handleExportPdf}>
                  Export PDF
                </Button>
                <Button size="default" variant="default" onClick={() => handleDelete(activeDocument.id)}>
                  Delete
                </Button>
              </div>
            </div>

            {/* Summary section - Updated text size to match markdown */}
            {activeDocument.summary && (
              <Card className="mb-6 card-standard">
                <CardContent className="p-4">
                  <h2 className="text-base font-medium mb-2">Summary</h2>
                  <p className="text-foreground text-base leading-relaxed">{activeDocument.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Table of contents */}
            <Card className="mb-6 card-standard">
              <CardContent className="p-4">
                <h2 className="text-base font-medium mb-2">Table of Contents</h2>
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
            <div className="text-center p-8">
              <h3 className="text-heading-3 mb-2">No document selected</h3>
              <p className="text-body-sm mb-4">
                {filteredDocuments.length > 0
                  ? "Select a document from the sidebar to view"
                  : "Create your first note to get started"}
              </p>
              <Button size="default" onClick={() => router.push("/")}>
                Create New Note
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
