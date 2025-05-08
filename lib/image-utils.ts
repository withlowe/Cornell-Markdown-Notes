/**
 * Utility functions for handling images in the application
 */

// Convert a File object to a data URL
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Failed to convert file to data URL"))
      }
    }

    reader.onerror = () => {
      reject(reader.error || new Error("Unknown error occurred while reading file"))
    }

    reader.readAsDataURL(file)
  })
}

// Validate if a string is a valid data URL
export const isValidDataUrl = (url: string): boolean => {
  return url.startsWith("data:")
}

// Create a blob URL from a data URL (useful for large images)
export const dataUrlToBlob = (dataUrl: string): string => {
  // Extract the mime type and base64 data
  const [mimeTypeWithPrefix, base64Data] = dataUrl.split(",")
  const mimeType = mimeTypeWithPrefix.split(":")[1].split(";")[0]

  // Convert base64 to binary
  const binaryData = atob(base64Data)

  // Create an array buffer
  const arrayBuffer = new ArrayBuffer(binaryData.length)
  const uint8Array = new Uint8Array(arrayBuffer)

  for (let i = 0; i < binaryData.length; i++) {
    uint8Array[i] = binaryData.charCodeAt(i)
  }

  // Create a blob and return its URL
  const blob = new Blob([arrayBuffer], { type: mimeType })
  return URL.createObjectURL(blob)
}

// Optimize a data URL by converting large ones to blob URLs
export const optimizeImageUrl = (url: string, sizeThreshold = 1000000): string => {
  // If it's not a data URL, return as is
  if (!isValidDataUrl(url)) {
    return url
  }

  // If the data URL is larger than the threshold, convert to blob URL
  if (url.length > sizeThreshold) {
    return dataUrlToBlob(url)
  }

  // Otherwise return the original data URL
  return url
}
