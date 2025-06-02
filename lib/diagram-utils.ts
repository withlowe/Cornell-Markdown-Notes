import { storeImage } from "./image-storage"

// Diagram generation utility using Mermaid syntax
export async function generateDiagramImage(diagramCode: string, diagramType: string): Promise<string> {
  try {
    // Create a canvas element for rendering
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("Could not get canvas context")
    }

    // Set canvas size based on diagram complexity
    const lines = diagramCode.split("\n").length
    const width = Math.max(600, Math.min(1200, lines * 40))
    const height = Math.max(400, Math.min(800, lines * 30))

    canvas.width = width
    canvas.height = height

    // Set printer-friendly white background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)

    // Generate diagram based on type
    switch (diagramType) {
      case "flowchart":
        await renderFlowchart(ctx, diagramCode, width, height)
        break
      case "sequence":
        await renderSequenceDiagram(ctx, diagramCode, width, height)
        break
      case "class":
        await renderClassDiagram(ctx, diagramCode, width, height)
        break
      case "state":
        await renderStateDiagram(ctx, diagramCode, width, height)
        break
      case "block":
        await renderBlockDiagram(ctx, diagramCode, width, height)
        break
      case "journey":
        await renderUserJourney(ctx, diagramCode, width, height)
        break
      case "er":
        await renderERDiagram(ctx, diagramCode, width, height)
        break
      case "git":
        await renderGitGraph(ctx, diagramCode, width, height)
        break
      case "quadrant":
        await renderQuadrantChart(ctx, diagramCode, width, height)
        break
      default:
        await renderGenericDiagram(ctx, diagramCode, width, height)
    }

    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL("image/png")

    // Store the image and return the ID
    const imageId = await storeImage(dataUrl, `diagram-${diagramType}-${Date.now()}.png`)

    return imageId
  } catch (error) {
    console.error("Error generating diagram:", error)
    throw new Error("Failed to generate diagram image")
  }
}

// Add this function after the generateDiagramImage function
export async function generateDiagramPreview(diagramCode: string, diagramType: string): Promise<string> {
  try {
    // Create a canvas element for rendering
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("Could not get canvas context")
    }

    // Set canvas size based on diagram complexity
    const lines = diagramCode.split("\n").length
    const width = Math.max(600, Math.min(1200, lines * 40))
    const height = Math.max(400, Math.min(800, lines * 30))

    canvas.width = width
    canvas.height = height

    // Set printer-friendly white background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)

    // Generate diagram based on type
    switch (diagramType) {
      case "flowchart":
        await renderFlowchart(ctx, diagramCode, width, height)
        break
      case "sequence":
        await renderSequenceDiagram(ctx, diagramCode, width, height)
        break
      case "class":
        await renderClassDiagram(ctx, diagramCode, width, height)
        break
      case "state":
        await renderStateDiagram(ctx, diagramCode, width, height)
        break
      case "block":
        await renderBlockDiagram(ctx, diagramCode, width, height)
        break
      case "journey":
        await renderUserJourney(ctx, diagramCode, width, height)
        break
      case "er":
        await renderERDiagram(ctx, diagramCode, width, height)
        break
      case "git":
        await renderGitGraph(ctx, diagramCode, width, height)
        break
      case "quadrant":
        await renderQuadrantChart(ctx, diagramCode, width, height)
        break
      default:
        await renderGenericDiagram(ctx, diagramCode, width, height)
    }

    // Return the data URL directly for preview
    return canvas.toDataURL("image/png")
  } catch (error) {
    console.error("Error generating diagram preview:", error)
    throw new Error("Failed to generate diagram preview")
  }
}

// Printer-friendly styling constants
const COLORS = {
  BLACK: "#000000",
  GRAY: "#666666",
  LIGHT_GRAY: "#cccccc",
  WHITE: "#ffffff",
}

const FONTS = {
  NORMAL: "12px Arial, sans-serif",
  BOLD: "bold 12px Arial, sans-serif",
  SMALL: "10px Arial, sans-serif",
  LARGE: "14px Arial, sans-serif",
}

// Helper function to draw rounded rectangle
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 5,
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

// Helper function to draw arrow
function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  dashed = false,
) {
  const headLength = 10
  const angle = Math.atan2(toY - fromY, toX - fromX)

  ctx.strokeStyle = COLORS.BLACK
  ctx.lineWidth = 1.5

  if (dashed) {
    ctx.setLineDash([5, 5])
  } else {
    ctx.setLineDash([])
  }

  // Draw line
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()

  // Draw arrowhead
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(toX, toY)
  ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6))
  ctx.moveTo(toX, toY)
  ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6))
  ctx.stroke()
}

// Flowchart renderer
async function renderFlowchart(ctx: CanvasRenderingContext2D, code: string, width: number, height: number) {
  const nodes = new Map()
  const connections = []
  const lines = code.split("\n").filter((line) => line.trim())

  // Parse nodes and connections
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.includes("-->") || trimmed.includes("->")) {
      const parts = trimmed.split(/-->|->/)
      if (parts.length >= 2) {
        const from = parts[0].trim()
        const to = parts[1].split("|")[0].trim()
        const label = trimmed.includes("|") ? trimmed.split("|")[1].split("|")[0] : ""

        connections.push({ from, to, label })

        // Extract node definitions
        if (!nodes.has(from)) {
          nodes.set(from, { id: from, shape: getShapeFromSyntax(from), label: getNodeLabel(from) })
        }
        if (!nodes.has(to)) {
          nodes.set(to, { id: to, shape: getShapeFromSyntax(to), label: getNodeLabel(to) })
        }
      }
    }
  })

  // Layout nodes in a grid
  const nodeArray = Array.from(nodes.values())
  const cols = Math.ceil(Math.sqrt(nodeArray.length))
  const nodeWidth = 120
  const nodeHeight = 60
  const spacing = 150

  nodeArray.forEach((node, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    node.x = 50 + col * spacing
    node.y = 50 + row * (nodeHeight + 50)
  })

  // Draw connections
  ctx.font = FONTS.SMALL
  connections.forEach((conn) => {
    const fromNode = nodes.get(conn.from)
    const toNode = nodes.get(conn.to)

    if (fromNode && toNode) {
      const fromX = fromNode.x + nodeWidth / 2
      const fromY = fromNode.y + nodeHeight / 2
      const toX = toNode.x + nodeWidth / 2
      const toY = toNode.y + nodeHeight / 2

      drawArrow(ctx, fromX, fromY, toX, toY)

      // Draw label if exists
      if (conn.label) {
        const midX = (fromX + toX) / 2
        const midY = (fromY + toY) / 2
        ctx.fillStyle = COLORS.WHITE
        ctx.fillRect(midX - 20, midY - 8, 40, 16)
        ctx.fillStyle = COLORS.BLACK
        ctx.textAlign = "center"
        ctx.fillText(conn.label, midX, midY + 4)
      }
    }
  })

  // Draw nodes
  ctx.font = FONTS.NORMAL
  nodeArray.forEach((node) => {
    ctx.strokeStyle = COLORS.BLACK
    ctx.fillStyle = COLORS.WHITE
    ctx.lineWidth = 1.5

    if (node.shape === "diamond") {
      // Draw diamond
      ctx.beginPath()
      ctx.moveTo(node.x + nodeWidth / 2, node.y)
      ctx.lineTo(node.x + nodeWidth, node.y + nodeHeight / 2)
      ctx.lineTo(node.x + nodeWidth / 2, node.y + nodeHeight)
      ctx.lineTo(node.x, node.y + nodeHeight / 2)
      ctx.closePath()
    } else if (node.shape === "circle") {
      // Draw circle
      ctx.beginPath()
      ctx.arc(node.x + nodeWidth / 2, node.y + nodeHeight / 2, Math.min(nodeWidth, nodeHeight) / 2, 0, 2 * Math.PI)
    } else {
      // Draw rectangle (default)
      drawRoundedRect(ctx, node.x, node.y, nodeWidth, nodeHeight)
    }

    ctx.fill()
    ctx.stroke()

    // Draw text
    ctx.fillStyle = COLORS.BLACK
    ctx.textAlign = "center"
    ctx.fillText(node.label, node.x + nodeWidth / 2, node.y + nodeHeight / 2 + 4)
  })
}

// Sequence diagram renderer
async function renderSequenceDiagram(ctx: CanvasRenderingContext2D, code: string, width: number, height: number) {
  const participants = []
  const messages = []
  const lines = code.split("\n").filter((line) => line.trim())

  // Parse participants and messages
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith("participant")) {
      const parts = trimmed.split(" as ")
      const id = trimmed.split(" ")[1]
      const name = parts.length > 1 ? parts[1] : id
      participants.push({ id, name })
    } else if (trimmed.includes("->>") || trimmed.includes("-->>")) {
      const isDashed = trimmed.includes("-->")
      const parts = trimmed.split(isDashed ? "-->>" : "->>")
      if (parts.length >= 2) {
        const from = parts[0].trim()
        const rest = parts[1].split(":")
        const to = rest[0].trim()
        const message = rest.length > 1 ? rest[1].trim() : ""
        messages.push({ from, to, message, dashed: isDashed })
      }
    }
  })

  // Layout participants
  const participantWidth = 100
  const participantHeight = 40
  const spacing = width / (participants.length + 1)

  participants.forEach((participant, index) => {
    participant.x = spacing * (index + 1) - participantWidth / 2
    participant.y = 30
  })

  // Draw participants
  ctx.font = FONTS.NORMAL
  participants.forEach((participant) => {
    ctx.strokeStyle = COLORS.BLACK
    ctx.fillStyle = COLORS.WHITE
    ctx.lineWidth = 1.5

    drawRoundedRect(ctx, participant.x, participant.y, participantWidth, participantHeight)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = COLORS.BLACK
    ctx.textAlign = "center"
    ctx.fillText(participant.name, participant.x + participantWidth / 2, participant.y + participantHeight / 2 + 4)

    // Draw lifeline
    ctx.strokeStyle = COLORS.LIGHT_GRAY
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(participant.x + participantWidth / 2, participant.y + participantHeight)
    ctx.lineTo(participant.x + participantWidth / 2, height - 30)
    ctx.stroke()
    ctx.setLineDash([])
  })

  // Draw messages
  ctx.font = FONTS.SMALL
  let messageY = 100
  messages.forEach((message) => {
    const fromParticipant = participants.find((p) => p.id === message.from)
    const toParticipant = participants.find((p) => p.id === message.to)

    if (fromParticipant && toParticipant) {
      const fromX = fromParticipant.x + participantWidth / 2
      const toX = toParticipant.x + participantWidth / 2

      drawArrow(ctx, fromX, messageY, toX, messageY, message.dashed)

      // Draw message text
      ctx.fillStyle = COLORS.BLACK
      ctx.textAlign = "center"
      ctx.fillText(message.message, (fromX + toX) / 2, messageY - 5)

      messageY += 40
    }
  })
}

// Class diagram renderer
async function renderClassDiagram(ctx: CanvasRenderingContext2D, code: string, width: number, height: number) {
  const classes = []
  const relationships = []
  const lines = code.split("\n").filter((line) => line.trim())

  let currentClass = null
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith("class ")) {
      const className = trimmed.split(" ")[1].split(" ")[0]
      currentClass = { name: className, attributes: [], methods: [] }
      classes.push(currentClass)
    } else if (trimmed.includes("<|--") || trimmed.includes("-->")) {
      const parts = trimmed.split(/<\|--|-->/)
      if (parts.length >= 2) {
        relationships.push({
          from: parts[0].trim(),
          to: parts[1].trim(),
          type: trimmed.includes("<|--") ? "inheritance" : "association",
        })
      }
    } else if (currentClass && (trimmed.startsWith("+") || trimmed.startsWith("-"))) {
      if (trimmed.includes("()")) {
        currentClass.methods.push(trimmed)
      } else {
        currentClass.attributes.push(trimmed)
      }
    }
  })

  // Layout classes
  const classWidth = 150
  const classHeight = 120
  const cols = Math.ceil(Math.sqrt(classes.length))

  classes.forEach((cls, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    cls.x = 50 + col * (classWidth + 50)
    cls.y = 50 + row * (classHeight + 50)
  })

  // Draw relationships
  relationships.forEach((rel) => {
    const fromClass = classes.find((c) => c.name === rel.from)
    const toClass = classes.find((c) => c.name === rel.to)

    if (fromClass && toClass) {
      const fromX = fromClass.x + classWidth / 2
      const fromY = fromClass.y + classHeight / 2
      const toX = toClass.x + classWidth / 2
      const toY = toClass.y + classHeight / 2

      if (rel.type === "inheritance") {
        // Draw inheritance arrow (triangle)
        ctx.strokeStyle = COLORS.BLACK
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(fromX, fromY)
        ctx.lineTo(toX, toY)
        ctx.stroke()

        // Draw triangle arrowhead
        const angle = Math.atan2(toY - fromY, toX - fromX)
        const size = 12
        ctx.beginPath()
        ctx.moveTo(toX, toY)
        ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6))
        ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6))
        ctx.closePath()
        ctx.fillStyle = COLORS.WHITE
        ctx.fill()
        ctx.stroke()
      } else {
        drawArrow(ctx, fromX, fromY, toX, toY)
      }
    }
  })

  // Draw classes
  ctx.font = FONTS.NORMAL
  classes.forEach((cls) => {
    ctx.strokeStyle = COLORS.BLACK
    ctx.fillStyle = COLORS.WHITE
    ctx.lineWidth = 1.5

    // Draw class box
    ctx.fillRect(cls.x, cls.y, classWidth, classHeight)
    ctx.strokeRect(cls.x, cls.y, classWidth, classHeight)

    // Draw class name
    ctx.fillStyle = COLORS.BLACK
    ctx.font = FONTS.BOLD
    ctx.textAlign = "center"
    ctx.fillText(cls.name, cls.x + classWidth / 2, cls.y + 20)

    // Draw separator line
    ctx.beginPath()
    ctx.moveTo(cls.x, cls.y + 30)
    ctx.lineTo(cls.x + classWidth, cls.y + 30)
    ctx.stroke()

    // Draw attributes
    ctx.font = FONTS.SMALL
    ctx.textAlign = "left"
    let y = cls.y + 45
    cls.attributes.forEach((attr) => {
      ctx.fillText(attr, cls.x + 5, y)
      y += 15
    })

    // Draw separator line
    if (cls.methods.length > 0) {
      ctx.beginPath()
      ctx.moveTo(cls.x, cls.y + 5)
      ctx.lineTo(cls.x + classWidth, cls.y + 5)
      ctx.stroke()
      y += 15
    }

    // Draw methods
    cls.methods.forEach((method) => {
      ctx.fillText(method, cls.x + 5, y)
      y += 15
    })
  })
}

// State diagram renderer
async function renderStateDiagram(ctx: CanvasRenderingContext2D, code: string, width: number, height: number) {
  const states = new Map()
  const transitions = []
  const lines = code.split("\n").filter((line) => line.trim())

  // Parse states and transitions
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.includes(" --> ")) {
      const parts = trimmed.split(" --> ")
      if (parts.length >= 2) {
        const from = parts[0].trim()
        const rest = parts[1].split(" : ")
        const to = rest[0].trim()
        const label = rest.length > 1 ? rest[1].trim() : ""

        transitions.push({ from, to, label })

        // Add states
        if (from !== "[*]" && !states.has(from)) {
          states.set(from, { name: from, isStart: false, isEnd: false })
        }
        if (to !== "[*]" && !states.has(to)) {
          states.set(to, { name: to, isStart: false, isEnd: false })
        }
      }
    }
  })

  // Layout states
  const stateArray = Array.from(states.values())
  const stateWidth = 100
  const stateHeight = 50
  const cols = Math.ceil(Math.sqrt(stateArray.length))

  stateArray.forEach((state, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    state.x = 100 + col * (stateWidth + 80)
    state.y = 100 + row * (stateHeight + 80)
  })

  // Draw transitions
  ctx.font = FONTS.SMALL
  transitions.forEach((trans) => {
    let fromX, fromY, toX, toY

    if (trans.from === "[*]") {
      // Start state
      fromX = 50
      fromY = 50
    } else {
      const fromState = states.get(trans.from)
      if (fromState) {
        fromX = fromState.x + stateWidth / 2
        fromY = fromState.y + stateHeight / 2
      }
    }

    if (trans.to === "[*]") {
      // End state
      toX = width - 50
      toY = height - 50
    } else {
      const toState = states.get(trans.to)
      if (toState) {
        toX = toState.x + stateWidth / 2
        toY = toState.y + stateHeight / 2
      }
    }

    if (fromX !== undefined && toX !== undefined) {
      drawArrow(ctx, fromX, fromY, toX, toY)

      // Draw label
      if (trans.label) {
        const midX = (fromX + toX) / 2
        const midY = (fromY + toY) / 2
        ctx.fillStyle = COLORS.WHITE
        ctx.fillRect(midX - 25, midY - 8, 50, 16)
        ctx.fillStyle = COLORS.BLACK
        ctx.textAlign = "center"
        ctx.fillText(trans.label, midX, midY + 4)
      }
    }
  })

  // Draw start/end markers
  ctx.fillStyle = COLORS.BLACK
  ctx.beginPath()
  ctx.arc(50, 50, 8, 0, 2 * Math.PI)
  ctx.fill()

  ctx.strokeStyle = COLORS.BLACK
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(width - 50, height - 50, 12, 0, 2 * Math.PI)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(width - 50, height - 50, 8, 0, 2 * Math.PI)
  ctx.fill()

  // Draw states
  ctx.font = FONTS.NORMAL
  stateArray.forEach((state) => {
    ctx.strokeStyle = COLORS.BLACK
    ctx.fillStyle = COLORS.WHITE
    ctx.lineWidth = 1.5

    drawRoundedRect(ctx, state.x, state.y, stateWidth, stateHeight, 25)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = COLORS.BLACK
    ctx.textAlign = "center"
    ctx.fillText(state.name, state.x + stateWidth / 2, state.y + stateHeight / 2 + 4)
  })
}

// Block diagram renderer
// Block diagram renderer - IMPROVED VERSION
async function renderBlockDiagram(ctx: CanvasRenderingContext2D, code: string, width: number, height: number) {
  const blocks = []
  const connections = []
  const lines = code.split("\n").filter((line) => line.trim())

  let columns = 3 // default
  let currentRow = 0
  let currentCol = 0

  console.log("Parsing block diagram:", code)

  // First pass: parse columns and blocks
  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim()
    console.log(`Line ${lineIndex}: "${trimmed}"`)

    if (trimmed.startsWith("columns ")) {
      columns = Number.parseInt(trimmed.split(" ")[1]) || 3
      currentRow = 0
      currentCol = 0
      console.log(`Set columns to: ${columns}`)
    } else if (trimmed && !trimmed.startsWith("block-beta") && !trimmed.includes("-->")) {
      // Parse block definitions - handle multiple formats

      // Format 1: A["Label"] B["Label"] C["Label"]
      const blockMatches = trimmed.matchAll(/(\w+)\["([^"]+)"\]/g)
      for (const match of blockMatches) {
        const block = {
          id: match[1],
          label: match[2],
          row: currentRow,
          col: currentCol,
        }
        blocks.push(block)
        console.log(`Added block: ${block.id} = "${block.label}" at (${block.row}, ${block.col})`)

        currentCol++
        if (currentCol >= columns) {
          currentCol = 0
          currentRow++
        }
      }

      // Format 2: Simple space-separated words (if no bracket format found)
      if (!trimmed.includes('["') && !trimmed.includes("-->")) {
        const words = trimmed.split(/\s+/).filter((word) => word.length > 0)
        words.forEach((word) => {
          // Only add if not already added
          if (!blocks.find((b) => b.id === word)) {
            const block = {
              id: word,
              label: word,
              row: currentRow,
              col: currentCol,
            }
            blocks.push(block)
            console.log(`Added simple block: ${block.id} at (${block.row}, ${block.col})`)

            currentCol++
            if (currentCol >= columns) {
              currentCol = 0
              currentRow++
            }
          }
        })
      }
    }
  })

  // Second pass: parse connections
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.includes("-->")) {
      // Handle various connection formats
      const parts = trimmed.split(/\s*-->\s*/)
      if (parts.length >= 2) {
        const from = parts[0].trim()
        const to = parts[1].trim()
        connections.push({ from, to })
        console.log(`Added connection: ${from} --> ${to}`)
      }
    }
  })

  console.log(`Found ${blocks.length} blocks and ${connections.length} connections`)

  // If still no blocks, try fallback parsing
  if (blocks.length === 0) {
    console.log("No blocks found, creating default layout")
    const sampleBlocks = ["Input", "Process", "Output"]
    sampleBlocks.forEach((label, index) => {
      blocks.push({
        id: label,
        label: label,
        row: 0,
        col: index,
      })
    })
  }

  // Layout blocks with better spacing
  const blockWidth = 120
  const blockHeight = 60
  const spacingX = Math.max(150, (width - 100) / Math.max(columns, 1))
  const spacingY = 100
  const startX = 50

  blocks.forEach((block) => {
    block.x = startX + block.col * spacingX
    block.y = 50 + block.row * spacingY
    console.log(`Block ${block.id} positioned at (${block.x}, ${block.y})`)
  })

  // Draw connections first (so they appear behind blocks)
  ctx.strokeStyle = COLORS.BLACK
  ctx.lineWidth = 1.5
  console.log(`Drawing ${connections.length} connections`)

  connections.forEach((conn, index) => {
    const fromBlock = blocks.find((b) => b.id === conn.from)
    const toBlock = blocks.find((b) => b.id === conn.to)

    console.log(`Connection ${index}: ${conn.from} --> ${conn.to}`)
    console.log(`From block:`, fromBlock)
    console.log(`To block:`, toBlock)

    if (fromBlock && toBlock) {
      // Calculate connection points on block edges
      const fromCenterX = fromBlock.x + blockWidth / 2
      const fromCenterY = fromBlock.y + blockHeight / 2
      const toCenterX = toBlock.x + blockWidth / 2
      const toCenterY = toBlock.y + blockHeight / 2

      // Determine connection points based on relative positions
      let fromX, fromY, toX, toY

      // Calculate direction
      const deltaX = toCenterX - fromCenterX
      const deltaY = toCenterY - fromCenterY

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal connection
        if (deltaX > 0) {
          // From left to right
          fromX = fromBlock.x + blockWidth
          fromY = fromCenterY
          toX = toBlock.x
          toY = toCenterY
        } else {
          // From right to left
          fromX = fromBlock.x
          fromY = fromCenterY
          toX = toBlock.x + blockWidth
          toY = toCenterY
        }
      } else {
        // Vertical connection
        if (deltaY > 0) {
          // From top to bottom
          fromX = fromCenterX
          fromY = fromBlock.y + blockHeight
          toX = toCenterX
          toY = toBlock.y
        } else {
          // From bottom to top
          fromX = fromCenterX
          fromY = fromBlock.y
          toX = toCenterX
          toY = toBlock.y + blockHeight
        }
      }

      console.log(`Drawing arrow from (${fromX}, ${fromY}) to (${toX}, ${toY})`)
      drawArrow(ctx, fromX, fromY, toX, toY)
    } else {
      console.log(`Connection ${conn.from} --> ${conn.to} failed: missing blocks`)
    }
  })

  // Draw blocks
  ctx.font = FONTS.NORMAL
  console.log(`Drawing ${blocks.length} blocks`)

  blocks.forEach((block, index) => {
    console.log(`Drawing block ${index}: ${block.id} at (${block.x}, ${block.y})`)

    ctx.strokeStyle = COLORS.BLACK
    ctx.fillStyle = COLORS.WHITE
    ctx.lineWidth = 1.5

    drawRoundedRect(ctx, block.x, block.y, blockWidth, blockHeight)
    ctx.fill()
    ctx.stroke()

    // Draw block label with text wrapping
    ctx.fillStyle = COLORS.BLACK
    ctx.textAlign = "center"

    // Handle long labels by wrapping text
    const maxWidth = blockWidth - 10
    const words = block.label.split(" ")
    const lines = []
    let currentLine = words[0] || ""

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + " " + words[i]
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine)
        currentLine = words[i]
      } else {
        currentLine = testLine
      }
    }
    lines.push(currentLine)

    // Draw each line of text
    const lineHeight = 14
    const startY = block.y + blockHeight / 2 - ((lines.length - 1) * lineHeight) / 2
    lines.forEach((line, lineIndex) => {
      ctx.fillText(line, block.x + blockWidth / 2, startY + lineIndex * lineHeight)
    })
  })

  // If no blocks were rendered, show a helpful message
  if (blocks.length === 0) {
    ctx.font = FONTS.NORMAL
    ctx.fillStyle = COLORS.GRAY
    ctx.textAlign = "center"
    ctx.fillText("No blocks found. Use format:", width / 2, height / 2 - 20)
    ctx.fillText('A["Block Name"]', width / 2, height / 2)
    ctx.fillText("A --> B", width / 2, height / 2 + 20)
  }
}

// User journey renderer
async function renderUserJourney(ctx: CanvasRenderingContext2D, code: string, width: number, height: number) {
  const sections = []
  const lines = code.split("\n").filter((line) => line.trim())

  let currentSection = null
  let title = "User Journey"

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith("title ")) {
      title = trimmed.substring(6)
    } else if (trimmed.startsWith("section ")) {
      currentSection = {
        name: trimmed.substring(8),
        tasks: [],
      }
      sections.push(currentSection)
    } else if (currentSection && trimmed.includes(":")) {
      const parts = trimmed.split(":")
      if (parts.length >= 3) {
        const task = parts[0].trim()
        const score = Number.parseInt(parts[1].trim()) || 3
        const actor = parts[2].trim()
        currentSection.tasks.push({ task, score, actor })
      }
    }
  })

  // Draw title
  ctx.font = FONTS.LARGE
  ctx.fillStyle = COLORS.BLACK
  ctx.textAlign = "center"
  ctx.fillText(title, width / 2, 30)

  // Layout sections
  const sectionWidth = width / sections.length
  let x = 0

  sections.forEach((section, sectionIndex) => {
    // Draw section header
    ctx.font = FONTS.BOLD
    ctx.fillStyle = COLORS.BLACK
    ctx.textAlign = "center"
    ctx.fillText(section.name, x + sectionWidth / 2, 70)

    // Draw tasks
    let y = 100
    section.tasks.forEach((task) => {
      // Draw task box
      const taskHeight = 40
      ctx.strokeStyle = COLORS.BLACK
      ctx.fillStyle = COLORS.WHITE
      ctx.lineWidth = 1

      ctx.fillRect(x + 10, y, sectionWidth - 20, taskHeight)
      ctx.strokeRect(x + 10, y, sectionWidth - 20, taskHeight)

      // Draw task text
      ctx.font = FONTS.SMALL
      ctx.fillStyle = COLORS.BLACK
      ctx.textAlign = "left"
      ctx.fillText(task.task, x + 15, y + 15)
      ctx.fillText(`Score: ${task.score}/5`, x + 15, y + 30)

      // Draw score indicator
      const scoreWidth = (sectionWidth - 40) * (task.score / 5)
      ctx.fillStyle = task.score >= 4 ? COLORS.BLACK : COLORS.GRAY
      ctx.fillRect(x + 15, y + 35, scoreWidth, 3)

      y += 50
    })

    x += sectionWidth
  })
}

// ER diagram renderer
async function renderERDiagram(ctx: CanvasRenderingContext2D, code: string, width: number, height: number) {
  const entities = []
  const relationships = []
  const lines = code.split("\n").filter((line) => line.trim())

  let currentEntity = null
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.includes(" {")) {
      const entityName = trimmed.split(" ")[0]
      currentEntity = {
        name: entityName,
        attributes: [],
      }
      entities.push(currentEntity)
    } else if (currentEntity && trimmed.includes(" ")) {
      const parts = trimmed.split(" ")
      if (parts.length >= 2) {
        currentEntity.attributes.push({
          type: parts[0],
          name: parts[1],
          constraints: parts.slice(2),
        })
      }
    } else if (trimmed.includes("||--") || trimmed.includes("}o--")) {
      const match = trimmed.match(/(\w+)\s+([|}][|}]--o?\{?)\s+(\w+)\s*:\s*(.+)/)
      if (match) {
        relationships.push({
          from: match[1],
          to: match[3],
          type: match[2],
          label: match[4],
        })
      }
    }
  })

  // Layout entities
  const entityWidth = 150
  const entityHeight = 120
  const cols = Math.ceil(Math.sqrt(entities.length))

  entities.forEach((entity, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    entity.x = 50 + col * (entityWidth + 100)
    entity.y = 50 + row * (entityHeight + 80)
  })

  // Draw relationships
  relationships.forEach((rel) => {
    const fromEntity = entities.find((e) => e.name === rel.from)
    const toEntity = entities.find((e) => e.name === rel.to)

    if (fromEntity && toEntity) {
      const fromX = fromEntity.x + entityWidth / 2
      const fromY = fromEntity.y + entityHeight / 2
      const toX = toEntity.x + entityWidth / 2
      const toY = toEntity.y + entityHeight / 2

      ctx.strokeStyle = COLORS.BLACK
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(fromX, fromY)
      ctx.lineTo(toX, toY)
      ctx.stroke()

      // Draw relationship label
      ctx.font = FONTS.SMALL
      ctx.fillStyle = COLORS.BLACK
      ctx.textAlign = "center"
      const midX = (fromX + toX) / 2
      const midY = (fromY + toY) / 2
      ctx.fillText(rel.label, midX, midY - 5)
    }
  })

  // Draw entities
  ctx.font = FONTS.NORMAL
  entities.forEach((entity) => {
    ctx.strokeStyle = COLORS.BLACK
    ctx.fillStyle = COLORS.WHITE
    ctx.lineWidth = 1.5

    // Draw entity box
    ctx.fillRect(entity.x, entity.y, entityWidth, entityHeight)
    ctx.strokeRect(entity.x, entity.y, entityWidth, entityHeight)

    // Draw entity name
    ctx.fillStyle = COLORS.BLACK
    ctx.font = FONTS.BOLD
    ctx.textAlign = "center"
    ctx.fillText(entity.name, entity.x + entityWidth / 2, entity.y + 20)

    // Draw separator line
    ctx.beginPath()
    ctx.moveTo(entity.x, entity.y + 30)
    ctx.lineTo(entity.x + entityWidth, entity.y + 30)
    ctx.stroke()

    // Draw attributes
    ctx.font = FONTS.SMALL
    ctx.textAlign = "left"
    let y = entity.y + 45
    entity.attributes.forEach((attr) => {
      const text = `${attr.name}: ${attr.type}`
      ctx.fillText(text, entity.x + 5, y)

      // Draw constraints
      if (attr.constraints.length > 0) {
        ctx.fillStyle = COLORS.GRAY
        ctx.fillText(attr.constraints.join(" "), entity.x + 5, y + 12)
        ctx.fillStyle = COLORS.BLACK
        y += 12
      }
      y += 15
    })
  })
}

// Git graph renderer
async function renderGitGraph(ctx: CanvasRenderingContext2D, code: string, width: number, height: number) {
  const commits = []
  const branches = new Map()
  const lines = code.split("\n").filter((line) => line.trim())

  let currentBranch = "main"
  branches.set("main", { name: "main", color: COLORS.BLACK, y: 100 })

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith("commit")) {
      const idMatch = trimmed.match(/id:\s*"([^"]+)"/)
      const id = idMatch ? idMatch[1] : `commit-${commits.length}`
      commits.push({
        id,
        branch: currentBranch,
        x: 50 + commits.length * 80,
        y: branches.get(currentBranch)?.y || 100,
      })
    } else if (trimmed.startsWith("branch ")) {
      const branchName = trimmed.split(" ")[1]
      const branchY = 100 + branches.size * 60
      branches.set(branchName, { name: branchName, color: COLORS.GRAY, y: branchY })
    } else if (trimmed.startsWith("checkout ")) {
      currentBranch = trimmed.split(" ")[1]
    } else if (trimmed.startsWith("merge ")) {
      const mergeBranch = trimmed.split(" ")[1]
      const fromBranch = branches.get(mergeBranch)
      const toBranch = branches.get(currentBranch)

      if (fromBranch && toBranch) {
        // Draw merge line
        const lastCommit = commits[commits.length - 1]
        if (lastCommit) {
          ctx.strokeStyle = COLORS.GRAY
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(lastCommit.x, fromBranch.y)
          ctx.lineTo(lastCommit.x, toBranch.y)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
    }
  })

  // Draw branch lines
  branches.forEach((branch) => {
    const branchCommits = commits.filter((c) => c.branch === branch.name)
    if (branchCommits.length > 1) {
      ctx.strokeStyle = branch.color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(branchCommits[0].x, branch.y)
      branchCommits.forEach((commit) => {
        ctx.lineTo(commit.x, branch.y)
      })
      ctx.stroke()
    }
  })

  // Draw commits
  ctx.font = FONTS.SMALL
  commits.forEach((commit) => {
    const branch = branches.get(commit.branch)
    if (branch) {
      // Draw commit circle
      ctx.fillStyle = COLORS.WHITE
      ctx.strokeStyle = branch.color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(commit.x, branch.y, 8, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()

      // Draw commit label
      ctx.fillStyle = COLORS.BLACK
      ctx.textAlign = "center"
      ctx.fillText(commit.id, commit.x, branch.y + 25)
    }
  })

  // Draw branch labels
  ctx.font = FONTS.NORMAL
  branches.forEach((branch) => {
    ctx.fillStyle = COLORS.BLACK
    ctx.textAlign = "left"
    ctx.fillText(branch.name, 10, branch.y + 4)
  })
}

// Quadrant chart renderer
async function renderQuadrantChart(ctx: CanvasRenderingContext2D, code: string, width: number, height: number) {
  const items = []
  const quadrants = {}
  const lines = code.split("\n").filter((line) => line.trim())

  let title = "Quadrant Chart"
  let xAxisLabel = "X Axis"
  let yAxisLabel = "Y Axis"

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith("title ")) {
      title = trimmed.substring(6)
    } else if (trimmed.startsWith("x-axis ")) {
      xAxisLabel = trimmed.substring(7)
    } else if (trimmed.startsWith("y-axis ")) {
      yAxisLabel = trimmed.substring(7)
    } else if (trimmed.startsWith("quadrant-")) {
      const parts = trimmed.split(" ")
      const quadNum = parts[0].split("-")[1]
      const label = parts.slice(1).join(" ")
      quadrants[quadNum] = label
    } else if (trimmed.includes(": [") && trimmed.includes("]")) {
      const match = trimmed.match(/(.+):\s*\[([0-9.]+),\s*([0-9.]+)\]/)
      if (match) {
        items.push({
          name: match[1],
          x: Number.parseFloat(match[2]),
          y: Number.parseFloat(match[3]),
        })
      }
    }
  })

  const chartSize = Math.min(width - 100, height - 100)
  const chartX = (width - chartSize) / 2
  const chartY = (height - chartSize) / 2

  // Draw title
  ctx.font = FONTS.LARGE
  ctx.fillStyle = COLORS.BLACK
  ctx.textAlign = "center"
  ctx.fillText(title, width / 2, 30)

  // Draw chart background
  ctx.strokeStyle = COLORS.BLACK
  ctx.fillStyle = COLORS.WHITE
  ctx.lineWidth = 1.5
  ctx.fillRect(chartX, chartY, chartSize, chartSize)
  ctx.strokeRect(chartX, chartY, chartSize, chartSize)

  // Draw quadrant lines
  ctx.strokeStyle = COLORS.LIGHT_GRAY
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(chartX + chartSize / 2, chartY)
  ctx.lineTo(chartX + chartSize / 2, chartY + chartSize)
  ctx.moveTo(chartX, chartY + chartSize / 2)
  ctx.lineTo(chartX + chartSize, chartY + chartSize / 2)
  ctx.stroke()

  // Draw quadrant labels
  ctx.font = FONTS.SMALL
  ctx.fillStyle = COLORS.GRAY
  ctx.textAlign = "center"
  if (quadrants["1"]) ctx.fillText(quadrants["1"], chartX + chartSize * 0.75, chartY + 20)
  if (quadrants["2"]) ctx.fillText(quadrants["2"], chartX + chartSize * 0.25, chartY + 20)
  if (quadrants["3"]) ctx.fillText(quadrants["3"], chartX + chartSize * 0.25, chartY + chartSize - 10)
  if (quadrants["4"]) ctx.fillText(quadrants["4"], chartX + chartSize * 0.75, chartY + chartSize - 10)

  // Draw axis labels
  ctx.font = FONTS.NORMAL
  ctx.fillStyle = COLORS.BLACK
  ctx.textAlign = "center"
  ctx.fillText(xAxisLabel, width / 2, chartY + chartSize + 30)

  ctx.save()
  ctx.translate(chartX - 30, height / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(yAxisLabel, 0, 0)
  ctx.restore()

  // Draw items
  ctx.font = FONTS.SMALL
  items.forEach((item) => {
    const x = chartX + item.x * chartSize
    const y = chartY + (1 - item.y) * chartSize // Invert Y for chart coordinates

    // Draw point
    ctx.fillStyle = COLORS.BLACK
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, 2 * Math.PI)
    ctx.fill()

    // Draw label
    ctx.fillStyle = COLORS.BLACK
    ctx.textAlign = "left"
    ctx.fillText(item.name, x + 8, y + 4)
  })
}

// Generic diagram renderer (fallback)
async function renderGenericDiagram(ctx: CanvasRenderingContext2D, code: string, width: number, height: number) {
  ctx.font = FONTS.NORMAL
  ctx.fillStyle = COLORS.BLACK
  ctx.textAlign = "center"
  ctx.fillText("Diagram Type Not Supported", width / 2, height / 2)
  ctx.fillText("Please check your diagram syntax", width / 2, height / 2 + 20)
}

// Helper functions
function getShapeFromSyntax(nodeText: string): string {
  if (nodeText.includes("{") && nodeText.includes("}")) return "diamond"
  if (nodeText.includes("((") && nodeText.includes("))")) return "circle"
  return "rectangle"
}

function getNodeLabel(nodeText: string): string {
  // Extract label from various bracket types
  const match = nodeText.match(/[[{$$]+([^\]}$$]+)[\]})]+/)
  return match ? match[1] : nodeText
}
