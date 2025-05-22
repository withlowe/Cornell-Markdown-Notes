import { v4 as uuidv4 } from "uuid"

// Flashcard types
export type FlashcardType = "question-answer" | "feynman" | "cloze"

export interface Flashcard {
  id: string
  type: FlashcardType
  front: string
  back: string
  notes: string
  tags: string[]
  createdAt: string
  lastReviewed?: string
  nextReview?: string
  easeFactor: number // SuperMemo algorithm parameter
  interval: number // Days until next review
  repetitions: number // Number of successful reviews in a row
}

export interface FlashcardDeck {
  id: string
  name: string
  description?: string
  cards: Flashcard[]
  createdAt: string
  updatedAt: string
  sourceDocumentId?: string
}

// Default values for new flashcards
const DEFAULT_EASE_FACTOR = 2.5
const DEFAULT_INTERVAL = 1

// SuperMemo-2 algorithm parameters
const MIN_EASE_FACTOR = 1.3

// Create a new flashcard
export function createFlashcard(
  type: FlashcardType,
  front: string,
  back: string,
  notes = "",
  tags: string[] = [],
): Flashcard {
  return {
    id: uuidv4(),
    type,
    front,
    back,
    notes,
    tags,
    createdAt: new Date().toISOString(),
    easeFactor: DEFAULT_EASE_FACTOR,
    interval: DEFAULT_INTERVAL,
    repetitions: 0,
  }
}

// Create a new flashcard deck
export function createFlashcardDeck(name: string, description = "", sourceDocumentId?: string): FlashcardDeck {
  const now = new Date().toISOString()
  return {
    id: uuidv4(),
    name,
    description,
    cards: [],
    createdAt: now,
    updatedAt: now,
    sourceDocumentId,
  }
}

// Add a flashcard to a deck
export function addFlashcardToDeck(deck: FlashcardDeck, card: Flashcard): FlashcardDeck {
  return {
    ...deck,
    cards: [...deck.cards, card],
    updatedAt: new Date().toISOString(),
  }
}

// Remove a flashcard from a deck
export function removeFlashcardFromDeck(deck: FlashcardDeck, cardId: string): FlashcardDeck {
  return {
    ...deck,
    cards: deck.cards.filter((card) => card.id !== cardId),
    updatedAt: new Date().toISOString(),
  }
}

// Update a flashcard in a deck
export function updateFlashcardInDeck(deck: FlashcardDeck, updatedCard: Flashcard): FlashcardDeck {
  return {
    ...deck,
    cards: deck.cards.map((card) => (card.id === updatedCard.id ? updatedCard : card)),
    updatedAt: new Date().toISOString(),
  }
}

// SuperMemo-2 algorithm for spaced repetition
export function updateFlashcardWithReview(
  card: Flashcard,
  quality: number, // 0-5 rating (0=complete blackout, 5=perfect recall)
): Flashcard {
  // Ensure quality is between 0 and 5
  quality = Math.max(0, Math.min(5, quality))

  let { easeFactor, interval, repetitions } = card

  // Update ease factor based on performance
  easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))

  // Update repetitions and interval
  if (quality < 3) {
    // If recall was difficult, reset repetitions
    repetitions = 0
    interval = 1
  } else {
    // If recall was good, increase interval
    repetitions += 1
    if (repetitions === 1) {
      interval = 1
    } else if (repetitions === 2) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
  }

  // Calculate next review date
  const now = new Date()
  const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000).toISOString()

  return {
    ...card,
    easeFactor,
    interval,
    repetitions,
    lastReviewed: now.toISOString(),
    nextReview,
  }
}

// Generate question-answer flashcards from markdown content
export function generateQuestionAnswerFlashcards(markdown: string, tags: string[] = []): Flashcard[] {
  const flashcards: Flashcard[] = []
  const sections = parseMarkdownSections(markdown)

  sections.forEach((section) => {
    if (section.heading && section.content.trim()) {
      // Use the heading as the question and the content as the answer
      flashcards.push(
        createFlashcard(
          "question-answer",
          `${section.heading}?`, // Add a question mark if not present
          section.content.trim(),
          `Generated from heading: ${section.heading}`,
          tags,
        ),
      )

      // Look for bullet points or numbered lists to create additional cards
      const listItems = extractListItems(section.content)
      listItems.forEach((item) => {
        if (item.trim().length > 10) {
          // Only create cards for substantial list items
          flashcards.push(
            createFlashcard(
              "question-answer",
              `What is ${item.split(" ").slice(0, 3).join(" ")}...?`,
              item,
              `Generated from list item under: ${section.heading}`,
              tags,
            ),
          )
        }
      })
    }
  })

  return flashcards
}

// Generate Feynman-style flashcards from markdown content
export function generateFeynmanFlashcards(markdown: string, tags: string[] = []): Flashcard[] {
  const flashcards: Flashcard[] = []
  const sections = parseMarkdownSections(markdown)

  sections.forEach((section) => {
    if (section.heading && section.content.trim()) {
      // Create a Feynman-style card asking to explain the concept
      flashcards.push(
        createFlashcard(
          "feynman",
          `Explain "${section.heading}" in simple terms as if teaching someone new to the subject.`,
          section.content.trim(),
          `Feynman technique for: ${section.heading}`,
          tags,
        ),
      )
    }
  })

  return flashcards
}

// Generate cloze deletion flashcards from markdown content
export function generateClozeFlashcards(markdown: string, tags: string[] = []): Flashcard[] {
  const flashcards: Flashcard[] = []
  const sections = parseMarkdownSections(markdown)

  sections.forEach((section) => {
    if (section.content.trim()) {
      // Extract sentences that might be good for cloze deletions
      const sentences = extractSentences(section.content)

      sentences.forEach((sentence) => {
        // Only process sentences that are substantial enough
        if (sentence.split(" ").length >= 5) {
          // Find important terms to create cloze deletions
          const terms = findImportantTerms(sentence)

          terms.forEach((term) => {
            if (term.length > 3) {
              // Only use terms that are substantial
              // Create the cloze deletion by replacing the term with [...]
              const front = sentence.replace(new RegExp(`\\b${escapeRegExp(term)}\\b`, "i"), "[...]")

              flashcards.push(
                createFlashcard("cloze", front, term, `Cloze deletion from: ${section.heading || "content"}`, tags),
              )
            }
          })
        }
      })
    }
  })

  return flashcards
}

// Helper function to parse markdown into sections
function parseMarkdownSections(markdown: string): { heading: string; content: string }[] {
  const lines = markdown.split("\n")
  const sections: { heading: string; content: string }[] = []

  let currentHeading = ""
  let currentContent: string[] = []

  lines.forEach((line) => {
    if (line.startsWith("# ")) {
      // If we already have a heading, save the previous section
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join("\n"),
        })
      }

      // Start a new section
      currentHeading = line.substring(2).trim()
      currentContent = []
    } else {
      // Add to current content
      currentContent.push(line)
    }
  })

  // Add the last section
  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      content: currentContent.join("\n"),
    })
  }

  return sections
}

// Helper function to extract list items from markdown
function extractListItems(markdown: string): string[] {
  const lines = markdown.split("\n")
  const listItems: string[] = []

  lines.forEach((line) => {
    // Match bullet points or numbered lists
    const trimmedLine = line.trim()
    if (trimmedLine.match(/^[-*•]\s+/) || trimmedLine.match(/^\d+\.\s+/)) {
      // Extract the content after the bullet or number
      const content = trimmedLine.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "")
      listItems.push(content)
    }
  })

  return listItems
}

// Helper function to extract sentences from text
function extractSentences(text: string): string[] {
  // Simple sentence extraction - split by period, question mark, or exclamation point
  const sentenceRegex = /[^.!?]+[.!?]+/g
  const matches = text.match(sentenceRegex)
  return matches ? matches.map((s) => s.trim()) : []
}

// Helper function to find important terms in a sentence
function findImportantTerms(sentence: string): string[] {
  // Split the sentence into words
  const words = sentence.split(/\s+/)

  // Filter out common words and short words
  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "with",
    "by",
    "about",
    "as",
    "of",
    "from",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "should",
    "could",
    "can",
    "may",
    "might",
    "must",
    "that",
    "this",
    "these",
    "those",
    "it",
    "they",
    "them",
    "their",
    "there",
    "here",
    "where",
    "when",
    "why",
    "how",
    "what",
    "who",
    "whom",
    "which",
  ])

  // Find capitalized words or technical terms
  const importantTerms: string[] = []

  words.forEach((word) => {
    // Clean the word of punctuation
    const cleanWord = word.replace(/[^\w\s]/g, "")

    // Skip if it's a common word or too short
    if (commonWords.has(cleanWord.toLowerCase()) || cleanWord.length < 4) {
      return
    }

    // Check if it's capitalized (not at the start of the sentence) or looks like a technical term
    if (
      (cleanWord[0] === cleanWord[0].toUpperCase() && words.indexOf(word) !== 0) ||
      /[A-Z][a-z]+[A-Z]/.test(cleanWord) || // camelCase
      cleanWord.includes("_") || // snake_case
      /^[A-Z]{2,}$/.test(cleanWord) // ACRONYM
    ) {
      importantTerms.push(cleanWord)
    }
  })

  // If we didn't find any important terms, use the longest words
  if (importantTerms.length === 0) {
    const sortedByLength = [...words]
      .map((w) => w.replace(/[^\w\s]/g, ""))
      .filter((w) => w.length > 3 && !commonWords.has(w.toLowerCase()))
      .sort((a, b) => b.length - a.length)

    importantTerms.push(...sortedByLength.slice(0, 2))
  }

  return importantTerms
}

// Helper function to escape special characters in a string for use in a regex
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Storage functions for flashcard decks

// Save a flashcard deck to localStorage
export function saveFlashcardDeck(deck: FlashcardDeck): void {
  try {
    const decks = getAllFlashcardDecks()
    const existingIndex = decks.findIndex((d) => d.id === deck.id)

    if (existingIndex >= 0) {
      decks[existingIndex] = { ...deck, updatedAt: new Date().toISOString() }
    } else {
      decks.push({ ...deck, updatedAt: new Date().toISOString() })
    }

    localStorage.setItem("cornell-notes-flashcards", JSON.stringify(decks))
  } catch (error) {
    console.error("Error saving flashcard deck:", error)
    throw new Error("Failed to save flashcard deck")
  }
}

// Get all flashcard decks from localStorage
export function getAllFlashcardDecks(): FlashcardDeck[] {
  try {
    const decks = localStorage.getItem("cornell-notes-flashcards")
    return decks ? JSON.parse(decks) : []
  } catch (error) {
    console.error("Error loading flashcard decks:", error)
    return []
  }
}

// Get a specific flashcard deck by ID
export function getFlashcardDeck(deckId: string): FlashcardDeck | null {
  try {
    const decks = getAllFlashcardDecks()
    return decks.find((deck) => deck.id === deckId) || null
  } catch (error) {
    console.error("Error getting flashcard deck:", error)
    return null
  }
}

// Delete a flashcard deck
export function deleteFlashcardDeck(deckId: string): boolean {
  try {
    const decks = getAllFlashcardDecks()
    const filteredDecks = decks.filter((deck) => deck.id !== deckId)

    if (filteredDecks.length !== decks.length) {
      localStorage.setItem("cornell-notes-flashcards", JSON.stringify(filteredDecks))
      return true
    }

    return false
  } catch (error) {
    console.error("Error deleting flashcard deck:", error)
    return false
  }
}

// Get flashcards due for review
export function getDueFlashcards(deckId?: string): Flashcard[] {
  try {
    const now = new Date().toISOString()
    const decks = deckId ? ([getFlashcardDeck(deckId)].filter(Boolean) as FlashcardDeck[]) : getAllFlashcardDecks()

    const dueCards: Flashcard[] = []

    decks.forEach((deck) => {
      deck.cards.forEach((card) => {
        // A card is due if it has never been reviewed or if its next review date is in the past
        if (!card.nextReview || card.nextReview <= now) {
          dueCards.push({ ...card, deckId: deck.id })
        }
      })
    })

    return dueCards
  } catch (error) {
    console.error("Error getting due flashcards:", error)
    return []
  }
}
