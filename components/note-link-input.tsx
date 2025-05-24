"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getNoteLinkSuggestions, noteExists } from "@/lib/link-utils"
import { Link, Plus } from 'lucide-react'

interface NoteLinkInputProps {
  onInsert: (linkText: string) => void
  onClose?: () => void
}

export function NoteLinkInput({ onInsert, onClose }: NoteLinkInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (query.length > 0) {
      const newSuggestions = getNoteLinkSuggestions(query)
      setSuggestions(newSuggestions)
      setSelectedIndex(0)
    } else {
      setSuggestions([])
    }
  }, [query])

  const handleInsert = (title: string) => {
    onInsert(`[[${title}]]`)
    handleClose()
  }

  const handleClose = () => {
    setIsOpen(false)
    setQuery("")
    setSuggestions([])
    if (onClose) {
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex < suggestions.length) {
        handleInsert(suggestions[selectedIndex])
      } else if (query.trim()) {
        handleInsert(query.trim())
      }
    } else if (e.key === "Escape") {
      handleClose()
    }
  }

  if (!isOpen) {
    return (
      <Button size="default" variant="outline" onClick={() => setIsOpen(true)}>
        <Link className="h-4 w-4 mr-2" />
        Link
      </Button>
    )
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type note title..."
          className="flex-1"
          autoFocus
        />
        <Button size="default" variant="outline" onClick={handleClose}>
          Cancel
        </Button>
      </div>

      {(suggestions.length > 0 || query.trim()) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                index === selectedIndex ? "bg-accent" : ""
              }`}
              onClick={() => handleInsert(suggestion)}
            >
              <div className="flex items-center gap-2">
                <Link className="h-3 w-3" />
                {suggestion}
                {noteExists(suggestion) && <span className="text-xs text-muted-foreground">(exists)</span>}
              </div>
            </button>
          ))}

          {query.trim() && !suggestions.some((s) => s.toLowerCase() === query.toLowerCase()) && (
            <button
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent border-t border-border ${
                selectedIndex === suggestions.length ? "bg-accent" : ""
              }`}
              onClick={() => handleInsert(query.trim())}
            >
              <div className="flex items-center gap-2">
                <Plus className="h-3 w-3" />
                Create "{query.trim()}"
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
