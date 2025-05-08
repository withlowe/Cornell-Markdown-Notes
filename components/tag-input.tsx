"use client"

import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface TagInputProps {
  id?: string
  tags: string[]
  setTags: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ id, tags, setTags, placeholder = "Add tag..." }: TagInputProps) {
  const [inputValue, setInputValue] = useState("")

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim() !== "") {
      e.preventDefault()
      if (!tags.includes(inputValue.trim())) {
        setTags([...tags, inputValue.trim()])
      }
      setInputValue("")
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="flex items-center gap-1 uppercase">
          {tag}
          <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
        </Badge>
      ))}
      <Input
        id={id}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
      />
    </div>
  )
}
