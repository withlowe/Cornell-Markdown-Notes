"use client"

import type React from "react"
import { useEffect, useState, useRef, useMemo } from "react"
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
import { RelatedNotes } from "@/components/related-notes"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportToPdf } from "@/lib/export-utils"
import { ChevronDown, Search, X, Tag } from "lucide-react"

export default function LibraryPage() {
  const router = useRouter()
  const [allDocuments, setAllDocuments] = useState<DocumentData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [activeDocument, setActiveDocument] = useState<DocumentData | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Compute filtered documents directly during render
  const filteredDocuments = useMemo(() => {
    if (allDocuments.length === 0) {
      return []
    }

    let result = [...allDocuments]

    // Apply search filter (title, summary, and tags)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()

      result = result.filter((doc) => {
        const titleMatch = doc.title.toLowerCase().includes(query)
        const summaryMatch = doc.summary?.toLowerCase().includes(query) || false
        const tagMatch = doc.tags.some((tag) => tag.toLowerCase().includes(query))
        return titleMatch || summaryMatch || tagMatch
      })
    }

    // Apply tag filter
    if (filterTags.length > 0) {
      result = result.filter((doc) => {
        return filterTags.every((tag) => doc.tags.includes(tag))
      })
    }

    // Sort by creation date (newest first) - default sorting only
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return result
  }, [allDocuments, searchQuery, filterTags])

  // Get all available tags
  const availableTags = useMemo(() => {
    const tags = allDocuments.flatMap((doc) => doc.tags)
    return [...new Set(tags)].sort()
  }, [allDocuments])

  // Load documents on mount
  useEffect(() => {
    const docs = getAllDocuments()
    setAllDocuments(docs)

    // Check if there's a specific document to show from URL params
    const urlParams = new URLSearchParams(window.location.search)
    const docId = urlParams.get("doc")

    if (docId && docs.length > 0) {
      const targetDoc = docs.find((doc) => doc.id === docId)
      if (targetDoc) {
        setActiveDocument(targetDoc)
        return
      }
    }

    // Set first document as active if none selected and no specific doc requested
    if (docs.length > 0 && !activeDocument) {
      setActiveDocument(docs[0])
    }
  }, [])

  // Handle URL parameter changes for document selection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const docId = urlParams.get("doc")

    if (docId && allDocuments.length > 0) {
      const targetDoc = allDocuments.find((doc) => doc.id === docId)
      if (targetDoc && (!activeDocument || targetDoc.id !== activeDocument.id)) {
        setActiveDocument(targetDoc)
      }
    }
  }, [allDocuments]) // Removed activeDocument?.id from dependencies to prevent interference

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
  }

  const handleTagSelect = (tag: string) => {
    setFilterTags((prev) => {
      const isSelected = prev.includes(tag)
      const newTags = isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
      return newTags
    })
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  const clearAllFilters = () => {
    setSearchQuery("")
    setFilterTags([])
  }

  const reloadDocuments = () => {
    const docs = getAllDocuments()
    setAllDocuments(docs)

    if (docs.length > 0 && !activeDocument) {
      setActiveDocument(docs[0])
    }
  }

  const handleDelete = (id: string) => {
    const docToDelete = allDocuments.find((doc) => doc.id === id)
    const docTitle = docToDelete ? docToDelete.title : "this document"

    const confirmed = window.confirm(`Are you sure you want to delete "${docTitle}"?\n\nThis action cannot be undone.`)

    if (!confirmed) {
      return
    }

    deleteDocument(id)

    if (activeDocument && activeDocument.id === id) {
      const remaining = allDocuments.filter((doc) => doc.id !== id)
      setActiveDocument(remaining.length > 0 ? remaining[0] : null)
    }

    reloadDocuments()
  }

  const handleExportAll = async () => {
    if (allDocuments.length === 0) {
      alert("No documents to export.")
      return
    }

    setIsExporting(true)
    try {
      await exportAllToZip()
      alert(`Successfully exported ${allDocuments.length} notes`)
    } catch (error) {
      console.error("Export failed:", error)
      alert(`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`)
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
      reloadDocuments()
      alert(`Successfully imported ${count} files`)
    } catch (error) {
      console.error("Import failed:", error)
      alert(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleExportPdf = async (font: "sans" | "serif" | "mixed") => {
    if (!activeDocument) {
      alert("Please select a document to export.")
      return
    }

    try {
      await exportToPdf(activeDocument.title, activeDocument.summary || "", activeDocument.content, font)
      alert(`Successfully exported "${activeDocument.title}" as PDF`)
    } catch (error) {
      console.error("PDF export failed:", error)
      alert(`PDF export failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleNoteLinkClick = (title: string) => {
    const linkedDoc = allDocuments.find((doc) => doc.title.toLowerCase() === title.toLowerCase())

    if (linkedDoc) {
      setActiveDocument(linkedDoc)
    } else {
      router.push(`/editor?title=${encodeURIComponent(title)}`)
    }
  }

  const handleDocumentSelect = (doc: DocumentData) => {
    setActiveDocument(doc)

    // Update the URL to reflect the selected document without causing a page reload
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set("doc", doc.id)
    window.history.replaceState({}, "", newUrl.toString())

    // Check if we're on mobile (lg breakpoint and below)
    const isMobile = window.innerWidth < 1024

    if (isMobile) {
      // On mobile, scroll to the document title in the main content area
      // Use setTimeout to ensure the document has been rendered first
      setTimeout(() => {
        const documentTitle = document.querySelector("main h1")
        if (documentTitle) {
          documentTitle.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
    } else {
      // On desktop, scroll to top of page
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const extractHeadings = (content: string): { text: string; id: string }[] => {
    return content
      .split("\n")
      .filter((line) => line.startsWith("# "))
      .map((line) => {
        const text = line.substring(2)
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
        return { text, id }
      })
  }

  const handleHeadingClick = (headingId: string) => {
    const element = document.getElementById(headingId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border sticky top-0 z-10 bg-background gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <Link href="/" className="font-medium text-lg whitespace-nowrap">
            Notes
          </Link>

          {/* Search Input - responsive width */}
          <div className="relative flex-1 max-w-xs sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-10 pr-8 w-full text-sm h-10"
              value={searchQuery}
              onChange={handleSearchInput}
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Tag Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default" className="gap-2 h-10">
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {filterTags.length > 0 ? `${filterTags.length} tag${filterTags.length > 1 ? "s" : ""}` : "Tags"}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Filter by Tags</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableTags.length > 0 ? (
                availableTags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    checked={filterTags.includes(tag)}
                    onCheckedChange={() => handleTagSelect(tag)}
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

          {/* Clear Filters */}
          {(searchQuery || filterTags.length > 0) && (
            <Button variant="ghost" size="default" onClick={clearAllFilters} className="whitespace-nowrap h-10">
              <span className="hidden sm:inline">Clear all</span>
              <span className="sm:hidden">Clear</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* New Note button - hidden on mobile */}
          <Button
            size="default"
            onClick={() => router.push("/editor")}
            className="whitespace-nowrap h-10 hidden md:flex"
          >
            New Note
          </Button>
        </div>
      </header>

      {/* Active filters display - scrollable on mobile */}
      {filterTags.length > 0 && (
        <div className="w-full px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Filtered by:</span>
            <div className="flex gap-2 min-w-0">
              {filterTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs uppercase whitespace-nowrap flex-shrink-0">
                  {tag}
                  <button className="ml-1 hover:text-destructive" onClick={() => handleTagSelect(tag)}>
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content - responsive layout */}
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar - stretches with content */}
        <aside className="w-full lg:w-96 xl:w-1/4 border-b lg:border-b-0 lg:border-r border-border bg-background">
          <div className="p-4">
            <div className="text-sm font-medium text-muted-foreground mb-4">
              Documents ({filteredDocuments.length}
              {allDocuments.length !== filteredDocuments.length && ` of ${allDocuments.length}`})
            </div>

            <div className="space-y-2">
              {filteredDocuments.length === 0 ? (
                <div className="text-xs text-muted-foreground p-3 text-center">
                  {searchQuery || filterTags.length > 0 ? "No matching documents found" : "No documents available"}
                </div>
              ) : (
                filteredDocuments.map((doc, index) => (
                  <button
                    key={`${doc.id}-${index}`}
                    className={cn(
                      "w-full text-left px-3 py-3 text-sm rounded-md transition-colors",
                      activeDocument?.id === doc.id
                        ? "bg-accent text-accent-foreground font-medium"
                        : "hover:bg-accent/50",
                    )}
                    onClick={() => handleDocumentSelect(doc)}
                  >
                    <div className="line-clamp-1 font-medium text-base">{doc.title}</div>
                    {doc.summary && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.summary}</div>
                    )}
                    {doc.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 overflow-x-auto">
                        {doc.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs uppercase px-1 py-0 flex-shrink-0">
                            {tag}
                          </Badge>
                        ))}
                        {doc.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1 py-0 flex-shrink-0">
                            +{doc.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={handleExportAll} disabled={isExporting}>
                  {isExporting ? "Exporting..." : "Export All"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleImportClick} disabled={isImporting}>
                  {isImporting ? "Importing..." : "Import"}
                </Button>
              </div>
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

        {/* Main content area - stretches with content */}
        <main className="flex-1 bg-background">
          {/* Document viewer */}
          {activeDocument ? (
            <div className="p-4 sm:p-6 max-w-4xl mx-auto">
              <div className="flex items-start justify-between mb-6 gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-3 break-words">{activeDocument.title}</h1>
                  <div className="flex flex-wrap gap-1 overflow-x-auto">
                    {activeDocument.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs uppercase flex-shrink-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                {/* Action buttons - hidden on mobile */}
                <div className="hidden md:flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => router.push(`/editor?id=${activeDocument.id}`)}>
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Export PDF
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Font Style</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleExportPdf("sans")}>
                        Sans-serif (Helvetica Neue)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportPdf("serif")}>Serif (Charter)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportPdf("mixed")}>
                        Mixed (Sans titles, Serif body)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(activeDocument.id)}
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {activeDocument.summary && (
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <h2 className="text-base font-medium text-muted-foreground mb-2">Summary</h2>
                    <p className="text-base leading-relaxed">{activeDocument.summary}</p>
                  </CardContent>
                </Card>
              )}

              <Card className="mb-6">
                <CardContent className="p-4">
                  <h2 className="text-base font-medium text-muted-foreground mb-3">Table of Contents</h2>
                  <ul className="space-y-2 text-base">
                    {extractHeadings(activeDocument.content).map((heading, index) => (
                      <li key={index}>
                        <button
                          onClick={() => handleHeadingClick(heading.id)}
                          className="text-left hover:text-primary hover:underline transition-colors"
                        >
                          • {heading.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <div className="mb-8">
                <CornellNotes markdown={activeDocument.content} onNoteClick={handleNoteLinkClick} />
              </div>

              <RelatedNotes document={activeDocument} onNoteClick={setActiveDocument} />
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[60vh] p-8">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">No document selected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {filteredDocuments.length > 0 ? "Select a document to view" : "Create your first note to get started"}
                </p>
                <Button onClick={() => router.push("/editor")}>Create New Note</Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
