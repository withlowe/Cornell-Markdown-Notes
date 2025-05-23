"use client"

import { useRef, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"

interface WysimarkEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function WysimarkEditor({ value, onChange, placeholder, className }: WysimarkEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Expose the textarea ref to the window for access from other components
  useEffect(() => {
    if (textareaRef.current) {
      // @ts-ignore - Adding a custom property to window
      window.cornellNotesTextarea = textareaRef.current
    }

    return () => {
      // @ts-ignore - Clean up when component unmounts
      delete window.cornellNotesTextarea
    }
  }, [textareaRef.current])

  return (
    <div className={`editor-container ${className || ""}`}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Enter your markdown notes here..."}
        className="w-full h-full min-h-[300px] text-base leading-relaxed"
      />
    </div>
  )
}
