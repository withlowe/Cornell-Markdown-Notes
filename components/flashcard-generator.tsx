"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import {
  createFlashcardDeck,
  generateQuestionAnswerFlashcards,
  generateFeynmanFlashcards,
  generateClozeFlashcards,
  saveFlashcardDeck,
  type Flashcard,
} from "@/lib/flashcard-utils"
import { Brain, BookOpen, FileQuestion, FileText } from "lucide-react"

interface FlashcardGeneratorProps {
  isOpen: boolean
  onClose: () => void
  documentId: string | null
  documentTitle: string
  documentContent: string
  documentTags: string[]
}

export function FlashcardGenerator({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  documentContent,
  documentTags,
}: FlashcardGeneratorProps) {
  const [deckName, setDeckName] = useState(`${documentTitle} Flashcards`)
  const [deckDescription, setDeckDescription] = useState(`Flashcards generated from ${documentTitle}`)
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({
    questionAnswer: true,
    feynman: false,
    cloze: false,
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewCards, setPreviewCards] = useState<Flashcard[]>([])
  const [activeTab, setActiveTab] = useState("options")

  // Generate flashcards based on selected types
  const generateFlashcards = () => {
    setIsGenerating(true)

    try {
      let generatedCards: Flashcard[] = []

      if (selectedTypes.questionAnswer) {
        generatedCards = [...generatedCards, ...generateQuestionAnswerFlashcards(documentContent, documentTags)]
      }

      if (selectedTypes.feynman) {
        generatedCards = [...generatedCards, ...generateFeynmanFlashcards(documentContent, documentTags)]
      }

      if (selectedTypes.cloze) {
        generatedCards = [...generatedCards, ...generateClozeFlashcards(documentContent, documentTags)]
      }

      setPreviewCards(generatedCards)
      setActiveTab("preview")
    } catch (error) {
      console.error("Error generating flashcards:", error)
      alert("Failed to generate flashcards. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Save the flashcard deck
  const saveFlashcards = () => {
    try {
      if (previewCards.length === 0) {
        alert("No flashcards to save. Please generate flashcards first.")
        return
      }

      const deck = createFlashcardDeck(deckName, deckDescription, documentId || undefined)

      // Add all cards to the deck
      const deckWithCards = {
        ...deck,
        cards: previewCards,
      }

      saveFlashcardDeck(deckWithCards)

      alert(`Successfully created flashcard deck "${deckName}" with ${previewCards.length} cards.`)
      onClose()
    } catch (error) {
      console.error("Error saving flashcards:", error)
      alert("Failed to save flashcards. Please try again.")
    }
  }

  // Handle checkbox changes
  const handleTypeChange = (type: string, checked: boolean) => {
    setSelectedTypes((prev) => ({
      ...prev,
      [type]: checked,
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Generate Flashcards
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="preview" disabled={previewCards.length === 0}>
              Preview ({previewCards.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="options" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="deckName">Deck Name</Label>
                <Input
                  id="deckName"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder="Enter deck name"
                />
              </div>

              <div>
                <Label htmlFor="deckDescription">Description</Label>
                <Textarea
                  id="deckDescription"
                  value={deckDescription}
                  onChange={(e) => setDeckDescription(e.target.value)}
                  placeholder="Enter deck description"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Flashcard Types</Label>

                <div className="grid gap-4 pt-2">
                  <div className="flex items-start space-x-3 space-y-0">
                    <Checkbox
                      id="questionAnswer"
                      checked={selectedTypes.questionAnswer}
                      onCheckedChange={(checked) => handleTypeChange("questionAnswer", checked as boolean)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="questionAnswer"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                      >
                        <FileQuestion className="h-4 w-4" />
                        Question/Answer
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Creates traditional flashcards with questions on the front and answers on the back.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 space-y-0">
                    <Checkbox
                      id="feynman"
                      checked={selectedTypes.feynman}
                      onCheckedChange={(checked) => handleTypeChange("feynman", checked as boolean)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="feynman"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                      >
                        <BookOpen className="h-4 w-4" />
                        Feynman Technique
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Creates cards that ask you to explain concepts in simple terms, as if teaching someone else.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 space-y-0">
                    <Checkbox
                      id="cloze"
                      checked={selectedTypes.cloze}
                      onCheckedChange={(checked) => handleTypeChange("cloze", checked as boolean)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="cloze"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        Cloze Deletion
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Creates fill-in-the-blank style cards with spaced repetition using the SuperMemo algorithm.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground mb-4">
              Preview of generated flashcards. You can review them before saving.
            </div>

            {previewCards.length > 0 ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {previewCards.slice(0, 10).map((card, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium uppercase text-muted-foreground">
                          {card.type === "question-answer"
                            ? "Question/Answer"
                            : card.type === "feynman"
                              ? "Feynman Technique"
                              : "Cloze Deletion"}
                        </span>
                        <span className="text-xs text-muted-foreground">Card {index + 1}</span>
                      </div>

                      <div className="border-b pb-2 mb-2">
                        <div className="font-medium">Front:</div>
                        <div className="text-sm mt-1">{card.front}</div>
                      </div>

                      <div>
                        <div className="font-medium">Back:</div>
                        <div className="text-sm mt-1">{card.back}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {previewCards.length > 10 && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    + {previewCards.length - 10} more cards
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No flashcards generated yet. Go to Options tab and generate flashcards.
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between items-center mt-4">
          <div className="text-sm text-muted-foreground">
            {previewCards.length > 0
              ? `${previewCards.length} flashcards generated`
              : "Select flashcard types to generate"}
          </div>

          <div className="flex gap-2">
            {activeTab === "options" ? (
              <>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={generateFlashcards}
                  disabled={isGenerating || !Object.values(selectedTypes).some(Boolean)}
                >
                  {isGenerating ? "Generating..." : "Generate Flashcards"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setActiveTab("options")}>
                  Back to Options
                </Button>
                <Button onClick={saveFlashcards}>Save Flashcards</Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
