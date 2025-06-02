"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { generateDiagramImage, generateDiagramPreview } from "@/lib/diagram-utils"
import { Eye, Loader2 } from "lucide-react"

interface DiagramInserterProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (diagramMarkdown: string) => void
}

const diagramTemplates = {
  flowchart: {
    name: "Flowchart",
    description: "Process flows and decision trees",
    template: `flowchart TD
    A[Start] --> B{Decision?}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,
    syntax: "Use TD (top-down), LR (left-right). Shapes: [] rectangle, {} diamond, () rounded, (()) circle",
  },
  sequence: {
    name: "Sequence Diagram",
    description: "Interactions between entities over time",
    template: `sequenceDiagram
    participant A as User
    participant B as System
    participant C as Database
    
    A->>B: Request
    B->>C: Query
    C-->>B: Response
    B-->>A: Result`,
    syntax: "Use ->> for solid arrows, -->> for dashed. participant defines entities",
  },
  class: {
    name: "Class Diagram",
    description: "Object-oriented class relationships",
    template: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    Animal <|-- Dog`,
    syntax: "Use <|-- for inheritance, --> for association, + for public, - for private",
  },
  state: {
    name: "State Diagram",
    description: "State transitions and workflows",
    template: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : start
    Processing --> Complete : finish
    Processing --> Error : fail
    Error --> Idle : retry
    Complete --> [*]`,
    syntax: "Use [*] for start/end states, --> for transitions with labels after :",
  },
  block: {
    name: "Block Diagram",
    description: "System architecture and components",
    template: `block-beta
    columns 3
    A["Input"] B["Process"] C["Output"]
    D["Data Store"] E["Controller"] F["Display"]
    
    A --> B
    B --> C
    D --> E
    E --> F`,
    syntax: "Use columns to define layout, [] for blocks, --> for connections",
  },
  journey: {
    name: "User Journey",
    description: "User experience and touchpoints",
    template: `journey
    title User Registration Journey
    section Discovery
      Visit website: 5: User
      Read about features: 4: User
    section Registration
      Fill form: 3: User
      Verify email: 2: User
    section Onboarding
      Complete profile: 4: User
      First use: 5: User`,
    syntax: "Use sections for phases, task: score: actor format",
  },
  er: {
    name: "Entity Relationship",
    description: "Database relationships and entities",
    template: `erDiagram
    USER {
        int id PK
        string name
        string email UK
    }
    ORDER {
        int id PK
        int user_id FK
        date created_at
    }
    PRODUCT {
        int id PK
        string name
        decimal price
    }
    
    USER ||--o{ ORDER : places
    ORDER }o--o{ PRODUCT : contains`,
    syntax: "Use PK for primary key, FK for foreign key, UK for unique. ||--o{ for one-to-many",
  },
  git: {
    name: "Git Graph",
    description: "Git branching and merging",
    template: `gitgraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Feature A"
    checkout main
    commit id: "Hotfix"
    checkout develop
    commit id: "Feature B"
    checkout main
    merge develop`,
    syntax: "Use commit, branch, checkout, merge commands. Add id: for labels",
  },
  quadrant: {
    name: "Quadrant Chart",
    description: "Priority matrix and categorization",
    template: `quadrantChart
    title Priority Matrix
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    
    quadrant-1 Quick Wins
    quadrant-2 Major Projects
    quadrant-3 Fill-ins
    quadrant-4 Thankless Tasks
    
    Task A: [0.2, 0.8]
    Task B: [0.8, 0.9]
    Task C: [0.3, 0.3]
    Task D: [0.7, 0.2]`,
    syntax: "Define axes with x-axis and y-axis. Place items with [x, y] coordinates (0-1)",
  },
}

export function DiagramInserter({ isOpen, onClose, onInsert }: DiagramInserterProps) {
  const [selectedType, setSelectedType] = useState<keyof typeof diagramTemplates>("flowchart")
  const [diagramCode, setDiagramCode] = useState(diagramTemplates.flowchart.template)
  const [altText, setAltText] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const handleTypeChange = (type: keyof typeof diagramTemplates) => {
    setSelectedType(type)
    setDiagramCode(diagramTemplates[type].template)
    setPreviewImage(null) // Clear preview when changing type
    if (!altText) {
      setAltText(`${diagramTemplates[type].name} diagram`)
    }
  }

  const handleGeneratePreview = async () => {
    if (!diagramCode.trim()) return

    setIsGeneratingPreview(true)
    try {
      const previewDataUrl = await generateDiagramPreview(diagramCode, selectedType)
      setPreviewImage(previewDataUrl)
    } catch (error) {
      console.error("Error generating preview:", error)
      alert("Failed to generate preview. Please check your syntax.")
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  const handleInsert = async () => {
    if (!diagramCode.trim()) return

    setIsGenerating(true)
    try {
      const imageId = await generateDiagramImage(diagramCode, selectedType)
      // Always make diagrams full-width
      const markdown = `<img src="cornell-image://${imageId}" alt="${altText || `${diagramTemplates[selectedType].name} diagram`}" class="full-width-image" />\n`
      onInsert(markdown)
      onClose()
      resetForm()
    } catch (error) {
      console.error("Error generating diagram:", error)
      alert("Failed to generate diagram. Please check your syntax and try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const resetForm = () => {
    setSelectedType("flowchart")
    setDiagramCode(diagramTemplates.flowchart.template)
    setAltText("")
    setPreviewImage(null)
  }

  const currentTemplate = diagramTemplates[selectedType]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Insert Diagram</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="diagramType" className="text-sm font-medium">
                Diagram Type
              </Label>
              <Select value={selectedType} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(diagramTemplates).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-muted-foreground">{template.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="altText" className="text-sm font-medium">
                Alt Text (for accessibility)
              </Label>
              <input
                id="altText"
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Description of the diagram"
                className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm"
              />
            </div>
          </div>

          <div className="bg-muted/30 p-3 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {currentTemplate.name}
              </Badge>
              <span className="text-xs text-muted-foreground">Syntax Guide</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{currentTemplate.syntax}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Code Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="diagramCode" className="text-sm font-medium">
                  Diagram Code
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePreview}
                  disabled={isGeneratingPreview || !diagramCode.trim()}
                  className="gap-2"
                >
                  {isGeneratingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Preview
                </Button>
              </div>
              <Textarea
                id="diagramCode"
                value={diagramCode}
                onChange={(e) => {
                  setDiagramCode(e.target.value)
                  setPreviewImage(null) // Clear preview when code changes
                }}
                placeholder="Enter your diagram code here..."
                className="font-mono text-sm min-h-[300px]"
              />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preview</Label>
              <div className="border rounded-md p-4 min-h-[300px] bg-white flex items-center justify-center">
                {previewImage ? (
                  <img
                    src={previewImage || "/placeholder.svg"}
                    alt="Diagram preview"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Click "Preview" to see your diagram</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> Diagrams are generated as static images optimized for PDF export and printing. They
              use a clean, printer-friendly style without shading or colors.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={isGenerating || !diagramCode.trim()}>
            {isGenerating ? "Generating..." : "Insert Diagram"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
