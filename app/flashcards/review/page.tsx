"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  getDueFlashcards,
  getFlashcardDeck,
  updateFlashcardWithReview,
  updateFlashcardInDeck,
  saveFlashcardDeck,
  type Flashcard,
  type FlashcardDeck,
} from "@/lib/flashcard-utils"

export default function ReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const deckId = searchParams.get("deckId")

  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [decks, setDecks] = useState<Record<string, FlashcardDeck>>({})
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [reviewSession, setReviewSession] = useState({
    cardsReviewed: 0,
    startTime: new Date(),
  })

  useEffect(() => {
    // Get due cards, either for a specific deck or all decks
    const due = getDueFlashcards(deckId || undefined)

    if (due.length === 0) {
      alert("No cards due for review. Great job staying on top of your studies!")
      router.push("/flashcards")
      return
    }

    // Shuffle the cards for review
    const shuffledCards = [...due].sort(() => Math.random() - 0.5)
    setDueCards(shuffledCards)

    // Load all relevant decks
    const deckMap: Record<string, FlashcardDeck> = {}
    const deckIds = new Set(due.map((card) => (card as any).deckId))

    deckIds.forEach((id) => {
      if (id) {
        const deck = getFlashcardDeck(id)
        if (deck) {
          deckMap[id] = deck
        }
      }
    })

    setDecks(deckMap)
  }, [deckId, router])

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleNext = () => {
    if (currentCardIndex < dueCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
      setIsFlipped(false) // Reset flip state for new card
      setReviewSession((prev) => ({
        ...prev,
        cardsReviewed: prev.cardsReviewed + 1,
      }))
    } else {
      // End of review session
      const sessionTime = Math.round((new Date().getTime() - reviewSession.startTime.getTime()) / 1000)
      alert(
        `Review session complete!\n\n` +
          `Cards reviewed: ${reviewSession.cardsReviewed + 1}\n` +
          `Time spent: ${Math.floor(sessionTime / 60)}m ${sessionTime % 60}s`,
      )
      router.push("/flashcards")
    }
  }

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1)
      setIsFlipped(false) // Reset flip state for new card
    }
  }

  const handleRateCard = (quality: number) => {
    const currentCard = dueCards[currentCardIndex]
    const deckId = (currentCard as any).deckId

    if (!deckId) return

    const deck = decks[deckId]
    if (!deck) return

    // Update the card with the review rating
    const updatedCard = updateFlashcardWithReview(currentCard, quality)

    // Update the card in the deck
    const updatedDeck = updateFlashcardInDeck(deck, updatedCard)

    // Update the decks state
    setDecks({
      ...decks,
      [deckId]: updatedDeck,
    })

    // Save the updated deck
    saveFlashcardDeck(updatedDeck)

    // Move to next card
    handleNext()
  }

  const currentCard = dueCards[currentCardIndex]
  const progress = dueCards.length > 0 ? ((currentCardIndex + 1) / dueCards.length) * 100 : 0
  const currentDeckName = currentCard ? decks[(currentCard as any).deckId]?.name : ""

  if (dueCards.length === 0 || !currentCard) {
    return (
      <div className="container-standard p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-body-sm">Loading review cards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-standard py-8 flex flex-col min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-heading-2 mb-1">Review Session</h1>
          <p className="text-caption">
            Card {currentCardIndex + 1} of {dueCards.length}
            {currentDeckName && <span> • {currentDeckName}</span>} •
            {reviewSession.cardsReviewed > 0 ? (
              <span> {reviewSession.cardsReviewed} cards reviewed</span>
            ) : (
              <span> Review session started</span>
            )}
          </p>
        </div>
        <Button size="default" variant="outline" onClick={() => router.push("/")}>
          Home
        </Button>
      </div>

      <Progress value={progress} className="mb-8 h-1 bg-gray-100" />

      <div className="flex-1 flex flex-col items-center justify-center mb-8">
        {/* Flashcard with flip animation */}
        <div className="flashcard-container w-full max-w-3xl cursor-pointer" onClick={handleFlip}>
          <div className={`flashcard-inner ${isFlipped ? "is-flipped" : ""}`}>
            <div className="flashcard-front">
              <div className="flashcard-content">
                <div className="flashcard-quote">"{currentCard.front}"</div>
                <div className="flashcard-attribution">
                  {currentCard.type === "question-answer"
                    ? "Question"
                    : currentCard.type === "feynman"
                      ? "Feynman Technique"
                      : "Cloze Deletion"}
                </div>
              </div>
              <div className="flashcard-flip-hint">Click to flip</div>
            </div>

            <div className="flashcard-back">
              <div className="flashcard-content">
                <div className="flashcard-quote">"{currentCard.back}"</div>
                <div className="flashcard-attribution">Answer</div>
              </div>
            </div>
          </div>
        </div>

        {/* Rating buttons - only show when card is flipped */}
        {isFlipped && (
          <div className="flashcard-rating mt-6">
            <p className="text-body-sm text-center mb-3">How well did you know this?</p>
            <div className="flex justify-center gap-4">
              <Button
                size="default"
                variant="outline"
                className="rating-button rating-hard"
                onClick={() => handleRateCard(2)}
              >
                Hard
              </Button>
              <Button size="default" className="rating-button rating-easy" onClick={() => handleRateCard(4)}>
                Easy
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flashcard-nav">
        <button
          onClick={handlePrevious}
          disabled={currentCardIndex === 0}
          className="flashcard-nav-button disabled:opacity-50"
        >
          Previous
        </button>
        <button onClick={() => router.push("/flashcards")} className="flashcard-nav-button">
          End Session
        </button>
        <button onClick={handleNext} className="flashcard-nav-button">
          Next
        </button>
      </div>
    </div>
  )
}
