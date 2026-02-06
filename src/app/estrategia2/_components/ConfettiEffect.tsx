'use client'

import { useEffect, useRef } from 'react'

interface ConfettiEffectProps {
  trigger: boolean
  onComplete?: () => void
}

// Utility functions
const Utils = {
  parsePx: (value: string) => parseFloat(value.replace(/px/, "")),

  getRandomInRange: (min: number, max: number, precision = 0) => {
    const multiplier = Math.pow(10, precision)
    const randomValue = Math.random() * (max - min) + min
    return Math.floor(randomValue * multiplier) / multiplier
  },

  getRandomItem: <T,>(array: T[]): T => array[Math.floor(Math.random() * array.length)],

  getScaleFactor: () => Math.log(window.innerWidth) / Math.log(1920),

  debounce: (func: Function, delay: number) => {
    let timeout: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), delay)
    }
  },
}

const DEG_TO_RAD = Math.PI / 180

const defaultConfettiConfig = {
  confettiesNumber: 250,
  confettiRadius: 6,
  confettiColors: [
    "#fcf403", "#62fc03", "#f4fc03", "#03e7fc", "#03fca5", "#a503fc", "#fc03ad", "#fc03c2"
  ],
  emojies: [] as string[],
  svgIcon: null as string | null,
}

class Confetti {
  speed: { x: number; y: number }
  finalSpeedX: number
  rotationSpeed: number
  dragCoefficient: number
  radius: { x: number; y: number }
  initialRadius: number
  rotationAngle: number
  emojiRotationAngle: number
  radiusYDirection: 'up' | 'down'
  absCos: number
  absSin: number
  position: { x: number; y: number }
  initialPosition: { x: number; y: number }
  color: string | null
  emoji: string | null
  svgIcon: HTMLImageElement | null
  createdAt: number
  direction: 'left' | 'right'

  constructor({ initialPosition, direction, radius, colors, emojis, svgIcon }: {
    initialPosition: { x: number; y: number }
    direction: 'left' | 'right'
    radius: number
    colors: string[]
    emojis: string[]
    svgIcon: string | null
  }) {
    const speedFactor = Utils.getRandomInRange(0.9, 1.7, 3) * Utils.getScaleFactor()
    this.speed = { x: speedFactor, y: speedFactor }
    this.finalSpeedX = Utils.getRandomInRange(0.2, 0.6, 3)
    this.rotationSpeed = emojis.length || svgIcon ? 0.01 : Utils.getRandomInRange(0.03, 0.07, 3) * Utils.getScaleFactor()
    this.dragCoefficient = Utils.getRandomInRange(0.0005, 0.0009, 6)
    this.radius = { x: radius, y: radius }
    this.initialRadius = radius
    this.rotationAngle = direction === "left" ? Utils.getRandomInRange(0, 0.2, 3) : Utils.getRandomInRange(-0.2, 0, 3)
    this.emojiRotationAngle = Utils.getRandomInRange(0, 2 * Math.PI)
    this.radiusYDirection = "down"

    const angle = direction === "left" ? Utils.getRandomInRange(82, 15) * DEG_TO_RAD : Utils.getRandomInRange(-15, -82) * DEG_TO_RAD
    this.absCos = Math.abs(Math.cos(angle))
    this.absSin = Math.abs(Math.sin(angle))

    const offset = Utils.getRandomInRange(-150, 0)
    const position = {
      x: initialPosition.x + (direction === "left" ? -offset : offset) * this.absCos,
      y: initialPosition.y - offset * this.absSin
    }

    this.position = { ...position }
    this.initialPosition = { ...position }
    this.color = emojis.length || svgIcon ? null : Utils.getRandomItem(colors)
    this.emoji = emojis.length ? Utils.getRandomItem(emojis) : null
    this.svgIcon = null

    if (svgIcon) {
      const svgImage = new Image()
      svgImage.src = svgIcon
      svgImage.onload = () => {
        this.svgIcon = svgImage
      }
    }

    this.createdAt = Date.now()
    this.direction = direction
  }

  draw(context: CanvasRenderingContext2D) {
    const { x, y } = this.position
    const { x: radiusX, y: radiusY } = this.radius

    if (this.svgIcon) {
      context.save()
      context.translate(x, y)
      context.rotate(this.emojiRotationAngle)
      context.drawImage(this.svgIcon, -radiusX, -radiusY, radiusX * 2, radiusY * 2)
      context.restore()
    } else if (this.color) {
      context.fillStyle = this.color
      context.beginPath()
      context.ellipse(x, y, radiusX, radiusY, this.rotationAngle, 0, 2 * Math.PI)
      context.fill()
    } else if (this.emoji) {
      context.font = `${radiusX}px serif`
      context.save()
      context.translate(x, y)
      context.rotate(this.emojiRotationAngle)
      context.textAlign = "center"
      context.fillText(this.emoji, 0, radiusY / 2)
      context.restore()
    }
  }

  updatePosition(deltaTime: number, currentTime: number) {
    const elapsed = currentTime - this.createdAt

    if (this.speed.x > this.finalSpeedX) {
      this.speed.x -= this.dragCoefficient * deltaTime
    }

    this.position.x += this.speed.x * (this.direction === "left" ? -this.absCos : this.absCos) * deltaTime
    this.position.y = this.initialPosition.y - this.speed.y * this.absSin * elapsed + 0.00125 * Math.pow(elapsed, 2) / 2

    if (!this.emoji && !this.svgIcon) {
      this.rotationSpeed -= 1e-5 * deltaTime
      this.rotationSpeed = Math.max(this.rotationSpeed, 0)

      if (this.radiusYDirection === "down") {
        this.radius.y -= deltaTime * this.rotationSpeed
        if (this.radius.y <= 0) {
          this.radius.y = 0
          this.radiusYDirection = "up"
        }
      } else {
        this.radius.y += deltaTime * this.rotationSpeed
        if (this.radius.y >= this.initialRadius) {
          this.radius.y = this.initialRadius
          this.radiusYDirection = "down"
        }
      }
    }
  }

  isVisible(canvasHeight: number) {
    return this.position.y < canvasHeight + 100
  }
}

class ConfettiManager {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  confetti: Confetti[]
  lastUpdated: number
  animationFrameId: number | null = null

  constructor() {
    this.canvas = document.createElement("canvas")
    this.canvas.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1000; pointer-events: none; overflow: hidden;"
    document.body.appendChild(this.canvas)
    const ctx = this.canvas.getContext("2d")
    if (!ctx) throw new Error("Could not get 2d context")
    this.context = ctx
    this.confetti = []
    this.lastUpdated = Date.now()
    
    window.addEventListener("resize", Utils.debounce(() => this.resizeCanvas(), 200))
    this.resizeCanvas()
    this.loop()
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1
    // Usa dimensões fixas do viewport para evitar overflow
    const width = Math.min(window.innerWidth, document.documentElement.clientWidth)
    const height = Math.min(window.innerHeight, document.documentElement.clientHeight)
    
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    
    // Reset da escala antes de aplicar nova
    this.context.setTransform(1, 0, 0, 1, 0, 0)
    this.context.scale(dpr, dpr)
  }

  addConfetti(config: Partial<typeof defaultConfettiConfig> = {}) {
    const { confettiesNumber, confettiRadius, confettiColors, emojies, svgIcon } = {
      ...defaultConfettiConfig,
      ...config,
    }

    const baseY = (5 * window.innerHeight) / 7
    for (let i = 0; i < confettiesNumber / 2; i++) {
      this.confetti.push(new Confetti({
        initialPosition: { x: 0, y: baseY },
        direction: "right",
        radius: confettiRadius,
        colors: confettiColors,
        emojis: emojies,
        svgIcon,
      }))
      this.confetti.push(new Confetti({
        initialPosition: { x: window.innerWidth, y: baseY },
        direction: "left",
        radius: confettiRadius,
        colors: confettiColors,
        emojis: emojies,
        svgIcon,
      }))
    }
  }

  resetAndStart(config: Partial<typeof defaultConfettiConfig> = {}) {
    this.confetti = []
    this.addConfetti(config)
  }

  loop() {
    const currentTime = Date.now()
    const deltaTime = currentTime - this.lastUpdated
    this.lastUpdated = currentTime

    const dpr = window.devicePixelRatio || 1
    this.context.setTransform(1, 0, 0, 1, 0, 0)
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.context.scale(dpr, dpr)

    const canvasHeight = window.innerHeight
    const canvasWidth = window.innerWidth
    
    this.confetti = this.confetti.filter((item) => {
      item.updatePosition(deltaTime, currentTime)
      if (item.position.x >= -50 && item.position.x <= canvasWidth + 50) {
        item.draw(this.context)
      }
      return item.isVisible(canvasHeight)
    })

    this.animationFrameId = requestAnimationFrame(() => this.loop())
  }

  destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }
  }
}

export default function ConfettiEffect({ trigger, onComplete }: ConfettiEffectProps) {
  const managerRef = useRef<ConfettiManager | null>(null)
  const triggerCountRef = useRef(0)
  const lastTriggerRef = useRef(false)

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new ConfettiManager()
    }

    if (trigger && !lastTriggerRef.current) {
      triggerCountRef.current += 1
      lastTriggerRef.current = true
      managerRef.current.resetAndStart()

      const timer = setTimeout(() => {
        onComplete?.()
      }, 4000) // Duração aproximada do efeito

      return () => clearTimeout(timer)
    }

    if (!trigger) {
      lastTriggerRef.current = false
    }
  }, [trigger, onComplete])

  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.destroy()
        managerRef.current = null
      }
    }
  }, [])

  return null
}
