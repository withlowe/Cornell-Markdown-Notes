"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  getAllFlashcardDecks,
  deleteFlashcardDeck,
  getDueFlashcards,
  type FlashcardDeck,
  type Flashcard,
} from "@/lib/flashcard-utils"
import { formatDistanceToNow } from "date-fns"

export default function FlashcardsPage() {
  const router = useRouter()
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [activeTab, setActiveTab] = useState("all-decks")

  useEffect(() => {
    loadDecks()
  }, [])

  const loadDecks = () => {
    const loadedDecks = getAllFlashcardDecks()
    setDecks(loadedDecks)

    // Get due cards
    const due = getDueFlashcards()
    setDueCards(due)
  }

  const handleDeleteDeck = (deckId: string) => {
    if (confirm("Are you sure you want to delete this deck? This action cannot be undone.")) {
      deleteFlashcardDeck(deckId)
      loadDecks()
    }
  }

  // Filter decks based on search term
  const filteredDecks = decks.filter(
    (deck) =>
      deck.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deck.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container-standard py-8">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-heading-1">Flashcards</h1>
            <Button size="default" variant="outline" onClick={() => router.push("/")}>
              Back to Notes
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="max-w-md w-full">
              <Input
                placeholder="Search flashcard decks..."
                className="input-standard"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-4 border-b border-gray-200">
              <button
                className={`px-3 py-2 text-base ${activeTab === "all-decks" ? "border-b-2 border-black font-medium" : "text-gray-500"}`}
                onClick={() => setActiveTab("all-decks")}
              >
                All Decks ({decks.length})
              </button>
              <button
                className={`px-3 py-2 text-base ${activeTab === "due-cards" ? "border-b-2 border-black font-medium" : "text-gray-500"}`}
                onClick={() => setActiveTab("due-cards")}
              >
                Due for Review ({dueCards.length})
              </button>
            </div>
          </div>
        </header>

        {activeTab === "all-decks" ? (
          <>
            {filteredDecks.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredDecks.map((deck) => (
                  <div key={deck.id} className="flashcard-deck">
                    <div className="flashcard-deck-header">
                      <h2 className="flashcard-deck-title">{deck.name}</h2>
                      <div className="flashcard-deck-actions">
                        <Button size="default" onClick={() => router.push(`/flashcards/study/${deck.id}`)}>
                          Study
                        </Button>
                        <Button size="default" variant="outline" onClick={() => handleDeleteDeck(deck.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>

                    {deck.description && <p className="flashcard-deck-description">{deck.description}</p>}

                    <div className="flashcard-deck-meta">
                      <Badge variant="outline" className="text-xs bg-gray-50">
                        {deck.cards.length} cards
                      </Badge>
                      {deck.cards.some((card) => card.type === "question-answer") && (
                        <Badge variant="outline" className="text-xs bg-gray-50">
                          Q&A
                        </Badge>
                      )}
                      {deck.cards.some((card) => card.type === "feynman") && (
                        <Badge variant="outline" className="text-xs bg-gray-50">
                          Feynman
                        </Badge>
                      )}
                      {deck.cards.some((card) => card.type === "cloze") && (
                        <Badge variant="outline" className="text-xs bg-gray-50">
                          Cloze
                        </Badge>
                      )}
                    </div>

                    <div className="flashcard-deck-footer">
                      Created {formatDistanceToNow(new Date(deck.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-gray-200 rounded-md">
                <h3 className="text-heading-3 mb-2">No flashcard decks found</h3>
                <p className="text-body-sm mb-6 max-w-md mx-auto">
                  {searchTerm ? "Try adjusting your search term" : "Create flashcards from your notes to get started"}
                </p>
                <Button size="default" onClick={() => router.push("/")}>
                  Go to Notes
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {dueCards.length > 0 ? (
              <div className="space-y-8">
                <div className="border border-gray-200 p-6 rounded-md">
                  <h3 className="text-heading-3 mb-3">Cards Due for Review</h3>
                  <p className="text-body-sm mb-6 max-w-2xl">
                    You have {dueCards.length} flashcards due for review across{" "}
                    {new Set(dueCards.map((card) => (card as any).deckId)).size} decks.
                  </p>
                  <Button size="default" onClick={() => router.push("/flashcards/review")}>
                    Start Review Session
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {Array.from(new Set(dueCards.map((card) => (card as any).deckId))).map((deckId) => {
                    const deck = decks.find((d) => d.id === deckId)
                    const deckDueCards = dueCards.filter((card) => (card as any).deckId === deckId)

                    if (!deck) return null

                    return (
                      <div key={deckId} className="flashcard-deck">
                        <div className="flashcard-deck-header">
                          <h2 className="flashcard-deck-title">{deck.name}</h2>
                          <Button size="default" onClick={() => router.push(`/flashcards/review?deckId=${deckId}`)}>
                            Review
                          </Button>
                        </div>

                        <div className="flashcard-deck-meta">
                          <Badge className="text-xs bg-gray-50 text-gray-700">{deckDueCards.length} due cards</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 border border-gray-200 rounded-md">
                <h3 className="text-heading-3 mb-2">No cards due for review</h3>
                <p className="text-body-sm mb-6 max-w-md mx-auto">
                  You're all caught up! Check back later for more cards to review.
                </p>
                <Button size="default" variant="outline" onClick={() => setActiveTab("all-decks")}>
                  View All Decks
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
