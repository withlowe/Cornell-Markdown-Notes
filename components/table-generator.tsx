"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react"

interface TableGeneratorProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (tableMarkdown: string) => void
}

type Alignment = "left" | "center" | "right"

export function TableGenerator({ isOpen, onClose, onInsert }: TableGeneratorProps) {
  const [rows, setRows] = useState(3)
  const [columns, setColumns] = useState(3)
  const [hasHeader, setHasHeader] = useState(true)
  const [cellValues, setCellValues] = useState<string[][]>([])
  const [columnAlignments, setColumnAlignments] = useState<Alignment[]>([])

  // Initialize cell values and alignments when rows or columns change
  const initializeTable = () => {
    // Initialize cell values with empty strings
    const newCellValues: string[][] = []
    for (let i = 0; i < rows; i++) {
      const row: string[] = []
      for (let j = 0; j < columns; j++) {
        // Try to preserve existing values when resizing, otherwise use empty string
        row.push(cellValues[i]?.[j] || "")
      }
      newCellValues.push(row)
    }
    setCellValues(newCellValues)

    // Initialize column alignments
    const newAlignments: Alignment[] = []
    for (let i = 0; i < columns; i++) {
      // Try to preserve existing alignments when resizing
      newAlignments.push(columnAlignments[i] || "left")
    }
    setColumnAlignments(newAlignments)
  }

  // Update cell value
  const updateCellValue = (rowIndex: number, colIndex: number, value: string) => {
    const newCellValues = [...cellValues]
    if (!newCellValues[rowIndex]) {
      newCellValues[rowIndex] = []
    }
    newCellValues[rowIndex][colIndex] = value
    setCellValues(newCellValues)
  }

  // Update column alignment
  const updateColumnAlignment = (colIndex: number, alignment: Alignment) => {
    const newAlignments = [...columnAlignments]
    newAlignments[colIndex] = alignment
    setColumnAlignments(newAlignments)
  }

  // Generate markdown table
  const generateMarkdownTable = (): string => {
    if (rows === 0 || columns === 0) return ""

    let markdown = ""

    // Generate header row if needed
    if (hasHeader && cellValues.length > 0) {
      markdown += "| "
      for (let j = 0; j < columns; j++) {
        markdown += (cellValues[0][j] || "") + " | "
      }
      markdown += "\n"

      // Generate alignment row - always include this for proper table formatting
      markdown += "| "
      for (let j = 0; j < columns; j++) {
        const alignment = columnAlignments[j] || "left"
        switch (alignment) {
          case "left":
            markdown += ":--- | "
            break
          case "center":
            markdown += ":---: | "
            break
          case "right":
            markdown += "---: | "
            break
        }
      }
      markdown += "\n"
    } else {
      // If no header, still add a basic row for the first row
      markdown += "| "
      for (let j = 0; j < columns; j++) {
        markdown += (cellValues[0]?.[j] || "") + " | "
      }
      markdown += "\n"

      // Always add a separator row even without header for proper table formatting
      markdown += "| "
      for (let j = 0; j < columns; j++) {
        markdown += "--- | "
      }
      markdown += "\n"
    }

    // Generate data rows
    const startRow = hasHeader ? 1 : 1 // Start from row 1 in both cases since we always include row 0
    for (let i = startRow; i < rows; i++) {
      markdown += "| "
      for (let j = 0; j < columns; j++) {
        markdown += (cellValues[i]?.[j] || "") + " | "
      }
      markdown += "\n"
    }

    return markdown
  }

  // Handle insert
  const handleInsert = () => {
    const markdown = generateMarkdownTable()
    onInsert(markdown)
    onClose()
  }

  // Reset the form when dialog opens
  useEffect(() => {
    if (isOpen) {
      initializeTable()
    }
  }, [isOpen, rows, columns])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Table Generator</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-20">
              <Label htmlFor="rows" className="text-xs">
                Rows
              </Label>
              <Input
                id="rows"
                type="number"
                min={1}
                max={10}
                value={rows}
                onChange={(e) => {
                  const value = Number.parseInt(e.target.value)
                  if (value >= 1 && value <= 10) {
                    setRows(value)
                  }
                }}
                className="h-8"
              />
            </div>
            <div className="w-20">
              <Label htmlFor="columns" className="text-xs">
                Columns
              </Label>
              <Input
                id="columns"
                type="number"
                min={1}
                max={10}
                value={columns}
                onChange={(e) => {
                  const value = Number.parseInt(e.target.value)
                  if (value >= 1 && value <= 10) {
                    setColumns(value)
                  }
                }}
                className="h-8"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasHeader"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="hasHeader" className="text-xs">
                Header row
              </Label>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-md p-2">
            <table className="w-full border-collapse">
              {hasHeader && (
                <thead>
                  <tr>
                    {Array.from({ length: columns }).map((_, colIndex) => (
                      <th key={colIndex} className="p-1 border">
                        <div className="flex flex-col gap-1">
                          <Input
                            value={cellValues[0]?.[colIndex] || ""}
                            onChange={(e) => updateCellValue(0, colIndex, e.target.value)}
                            placeholder={`Column ${colIndex + 1}`}
                            className="text-center h-8 text-sm"
                          />
                          <div className="flex justify-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant={columnAlignments[colIndex] === "left" ? "default" : "outline"}
                              className="h-6 w-6"
                              onClick={() => updateColumnAlignment(colIndex, "left")}
                              title="Align left"
                            >
                              <AlignLeft className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant={columnAlignments[colIndex] === "center" ? "default" : "outline"}
                              className="h-6 w-6"
                              onClick={() => updateColumnAlignment(colIndex, "center")}
                              title="Align center"
                            >
                              <AlignCenter className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant={columnAlignments[colIndex] === "right" ? "default" : "outline"}
                              className="h-6 w-6"
                              onClick={() => updateColumnAlignment(colIndex, "right")}
                              title="Align right"
                            >
                              <AlignRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {Array.from({ length: rows - (hasHeader ? 1 : 0) }).map((_, rowIndex) => {
                  const actualRowIndex = hasHeader ? rowIndex + 1 : rowIndex
                  return (
                    <tr key={actualRowIndex}>
                      {Array.from({ length: columns }).map((_, colIndex) => (
                        <td key={colIndex} className="p-1 border">
                          <Input
                            value={cellValues[actualRowIndex]?.[colIndex] || ""}
                            onChange={(e) => updateCellValue(actualRowIndex, colIndex, e.target.value)}
                            placeholder={`Cell ${actualRowIndex + 1},${colIndex + 1}`}
                            className="h-8 text-sm"
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button onClick={handleInsert} size="sm">
            Insert Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
