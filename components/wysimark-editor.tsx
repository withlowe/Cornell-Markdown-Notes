"use client"
import { Textarea } from "@/components/ui/textarea"

interface WysimarkEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function WysimarkEditor({ value, onChange, placeholder, className }: WysimarkEditorProps) {
  // Use a simple textarea as a fallback instead of trying to load Wysimark
  // This avoids the tokenize import error completely
  return (
    <div className={`editor-container ${className || ""}`}>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Enter your markdown notes here..."}
        className="w-full h-full min-h-[300px] text-base leading-relaxed"
      />
    </div>
  )
}
