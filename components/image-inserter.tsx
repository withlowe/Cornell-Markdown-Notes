"use client"

import { useState, useRef, type ChangeEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload } from "lucide-react"
import { storeImage } from "@/lib/image-storage"

interface ImageInserterProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (imageMarkdown: string) => void
}

export function ImageInserter({ isOpen, onClose, onInsert }: ImageInserterProps) {
  const [imageUrl, setImageUrl] = useState("")
  const [altText, setAltText] = useState("")
  const [activeTab, setActiveTab] = useState<"url" | "placeholder" | "upload">("url")
  const [placeholderWidth, setPlaceholderWidth] = useState(400)
  const [placeholderHeight, setPlaceholderHeight] = useState(300)
  const [placeholderQuery, setPlaceholderQuery] = useState("")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isFullWidth, setIsFullWidth] = useState(false)

  // Handle image insertion with storage
  const handleInsert = async () => {
    try {
      let markdown = ""
      const fullWidthClass = isFullWidth ? ' class="full-width-image"' : ""

      if (activeTab === "url") {
        // For regular image URLs, use them directly
        if (!imageUrl.trim()) {
          return // Don't insert if URL is empty
        }
        markdown = `<img src="${imageUrl}" alt="${altText || "Image"}"${fullWidthClass} />\n`
      } else if (activeTab === "placeholder") {
        // For placeholder images, use the placeholder URL
        const query = encodeURIComponent(placeholderQuery || "abstract")
        const placeholderUrl = `/placeholder.svg?height=${placeholderHeight}&width=${placeholderWidth}&query=${query}`
        markdown = `<img src="${placeholderUrl}" alt="${altText || "Placeholder image"}"${fullWidthClass} />\n`
      } else if (activeTab === "upload" && uploadedImage) {
        // For uploaded images, store in IndexedDB and use the image ID
        setIsLoading(true)
        const imageId = await storeImage(uploadedImage, uploadedFileName)
        markdown = `<img src="cornell-image://${imageId}" alt="${altText || uploadedFileName || "Uploaded image"}"${fullWidthClass} />\n`
        console.log(`Image stored with ID: ${imageId}`)
      }

      console.log("Inserting image HTML:", markdown.substring(0, 100) + "...")
      onInsert(markdown)
      resetForm()
      onClose()
    } catch (error) {
      console.error("Error inserting image:", error)
      alert("Failed to insert image. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setImageUrl("")
    setAltText("")
    setPlaceholderWidth(400)
    setPlaceholderHeight(300)
    setPlaceholderQuery("")
    setUploadedImage(null)
    setUploadedFileName("")
    setActiveTab("url")
    setIsFullWidth(false)
  }

  // Always use data URLs for uploaded images
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if the file is an image
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    setIsLoading(true)

    try {
      // Store the file name for reference
      setUploadedFileName(file.name)

      // Set alt text to file name if not already set
      if (!altText) {
        // Remove extension from filename for alt text
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "")
        setAltText(nameWithoutExtension)
      }

      // Create a data URL for the file
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === "string") {
          setUploadedImage(event.target.result)
          console.log("Created data URL for image")
        }
        setIsLoading(false)
      }
      reader.onerror = () => {
        console.error("Error reading file")
        alert("Failed to process the image. Please try again with a different image.")
        setIsLoading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error processing image:", error)
      alert("Failed to process the image. Please try again with a different image.")
      setIsLoading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Insert Image</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "url" | "placeholder" | "upload")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url">Image URL</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="placeholder">Placeholder</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label htmlFor="altText">Alt Text</Label>
              <Input
                id="altText"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Description of the image"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="fullWidth"
                checked={isFullWidth}
                onChange={(e) => setIsFullWidth(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="fullWidth" className="text-sm">
                Full width
              </Label>
            </div>

            {imageUrl ? (
              <div className="border rounded-md p-2 mt-2">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <div className="flex justify-center">
                  <img
                    src={imageUrl || "/placeholder.svg"}
                    alt={altText || "Preview"}
                    className="max-w-full max-h-[200px] object-contain"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = "/system-error-screen.png"
                      ;(e.target as HTMLImageElement).alt = "Error loading image"
                    }}
                  />
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-md p-6">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Processing image...</p>
                </div>
              ) : uploadedImage ? (
                <div className="w-full">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{uploadedFileName}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedImage(null)
                        setUploadedFileName("")
                      }}
                    >
                      Change
                    </Button>
                  </div>
                  <div className="flex justify-center border rounded-md p-2">
                    <img
                      src={uploadedImage || "/placeholder.svg"}
                      alt={altText || uploadedFileName}
                      className="max-w-full max-h-[200px] object-contain"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-center mb-2">Drag and drop an image here, or click to select a file</p>
                  <Button onClick={triggerFileInput} variant="outline" size="sm">
                    Choose File
                  </Button>
                </>
              )}
            </div>

            <div>
              <Label htmlFor="altTextUpload">Alt Text</Label>
              <Input
                id="altTextUpload"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Description of the image"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="fullWidth"
                checked={isFullWidth}
                onChange={(e) => setIsFullWidth(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="fullWidth" className="text-sm">
                Full width
              </Label>
            </div>
          </TabsContent>

          <TabsContent value="placeholder" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="placeholderWidth">Width</Label>
                <Input
                  id="placeholderWidth"
                  type="number"
                  value={placeholderWidth}
                  onChange={(e) => setPlaceholderWidth(Number(e.target.value))}
                  min={50}
                  max={1200}
                />
              </div>
              <div>
                <Label htmlFor="placeholderHeight">Height</Label>
                <Input
                  id="placeholderHeight"
                  type="number"
                  value={placeholderHeight}
                  onChange={(e) => setPlaceholderHeight(Number(e.target.value))}
                  min={50}
                  max={1200}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="placeholderQuery">Description (optional)</Label>
              <Input
                id="placeholderQuery"
                value={placeholderQuery}
                onChange={(e) => setPlaceholderQuery(e.target.value)}
                placeholder="Abstract pattern, nature, technology, etc."
              />
            </div>

            <div>
              <Label htmlFor="altTextPlaceholder">Alt Text</Label>
              <Input
                id="altTextPlaceholder"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Description of the image"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="fullWidth"
                checked={isFullWidth}
                onChange={(e) => setIsFullWidth(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="fullWidth" className="text-sm">
                Full width
              </Label>
            </div>

            <div className="border rounded-md p-2 mt-2">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className="flex justify-center">
                <img
                  src={`/generic-placeholder-icon.png?height=${Math.min(200, placeholderHeight)}&width=${Math.min(300, placeholderWidth)}&query=${encodeURIComponent(placeholderQuery || "abstract")}`}
                  alt={altText || "Preview"}
                  className="max-w-full max-h-[200px] object-contain"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleInsert}
            disabled={isLoading || (activeTab === "url" && !imageUrl) || (activeTab === "upload" && !uploadedImage)}
          >
            Insert Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
