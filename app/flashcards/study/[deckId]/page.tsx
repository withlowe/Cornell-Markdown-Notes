"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  getFlashcardDeck,
  updateFlashcardWithReview,
  updateFlashcardInDeck,
  saveFlashcardDeck,
  type FlashcardDeck,
} from "@/lib/flashcard-utils"
import { marked } from "marked"

// Function to render markdown to HTML with proper image handling
function renderMarkdownToHtml(markdown: string): string {
  try {
    // Configure marked to handle images properly
    const renderer = new marked.Renderer()

    // Original renderer for images
    const originalImageRenderer = renderer.image.bind(renderer)

    // Custom image renderer to handle cornell-image:// URLs
    renderer.image = (href, title, text) => {
      // Check if it's a cornell-image:// URL
      if (href && href.startsWith("cornell-image://")) {
        // For cornell-image URLs, we'll add a data-image-id attribute
        // that will be processed by client-side code
        const imageId = href.replace("cornell-image://", "")
        return `<img src="/system-error-screen.png" alt="${text || "Image"}" 
                data-image-id="${imageId}" class="cornell-image max-w-full h-auto rounded-md my-2" />`
      }

      // For regular images, use the original renderer
      return originalImageRenderer(href, title, text)
    }

    // Set the custom renderer
    marked.setOptions({ renderer })

    return marked(markdown)
  } catch (error) {
    console.error("Error rendering markdown:", error)
    return markdown
  }
}

export default function StudyDeckPage({ params }: { params: { deckId: string } }) {
  const router = useRouter()
  const [deck, setDeck] = useState<FlashcardDeck | null>(null)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [studySession, setStudySession] = useState({
    cardsStudied: 0,
    startTime: new Date(),
  })

  useEffect(() => {
    const loadedDeck = getFlashcardDeck(params.deckId)
    if (loadedDeck) {
      // Shuffle the cards for study
      const shuffledCards = [...loadedDeck.cards].sort(() => Math.random() - 0.5)
      setDeck({
        ...loadedDeck,
        cards: shuffledCards,
      })
    } else {
      // Deck not found, redirect to flashcards page
      router.push("/flashcards")
    }
  }, [params.deckId, router])

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleNext = () => {
    if (!deck) return

    if (currentCardIndex < deck.cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
      setIsFlipped(false) // Reset flip state for new card
      setStudySession((prev) => ({
        ...prev,
        cardsStudied: prev.cardsStudied + 1,
      }))
    } else {
      // End of deck
      alert(`Study session complete! You've reviewed all ${deck.cards.length} cards.`)
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
    if (!deck) return

    const currentCard = deck.cards[currentCardIndex]
    const updatedCard = updateFlashcardWithReview(currentCard, quality)

    // Update the card in the deck
    const updatedDeck = updateFlashcardInDeck(deck, updatedCard)
    setDeck(updatedDeck)

    // Save the updated deck
    saveFlashcardDeck(updatedDeck)

    // Move to next card
    handleNext()
  }

  const currentCard = deck?.cards[currentCardIndex]
  const progress = deck ? ((currentCardIndex + 1) / deck.cards.length) * 100 : 0

  useEffect(() => {
    // Function to load images from storage
    const loadImages = async () => {
      // Find all cornell-image elements
      const cornellImages = document.querySelectorAll(".cornell-image[data-image-id]")

      for (const img of Array.from(cornellImages)) {
        const imageId = img.getAttribute("data-image-id")
        if (imageId) {
          try {
            // Import the getImage function
            const { getImage } = await import("@/lib/image-storage")
            const imageData = await getImage(imageId)

            if (imageData) {
              // Set the image source to the loaded data
              ;(img as HTMLImageElement).src = imageData
            }
          } catch (error) {
            console.error(`Error loading image ${imageId}:`, error)
          }
        }
      }
    }

    // Only run if the card is flipped (to avoid unnecessary loading)
    if (isFlipped) {
      loadImages()
    }
  }, [isFlipped, currentCardIndex])

  if (!deck || !currentCard) {
    return (
      <div className="container-standard p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-body-sm">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-standard py-8 flex flex-col min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-heading-2 mb-1">{deck.name}</h1>
          <p className="text-caption">
            Card {currentCardIndex + 1} of {deck.cards.length} •
            {studySession.cardsStudied > 0 ? (
              <span> {studySession.cardsStudied} cards viewed</span>
            ) : (
              <span> Study session started</span>
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
                <div className="flashcard-markdown">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownToHtml(currentCard.front),
                    }}
                  />
                </div>
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
                <div className="flashcard-markdown">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownToHtml(currentCard.back),
                    }}
                  />
                </div>
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
