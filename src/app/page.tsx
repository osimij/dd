'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvas2Ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Get colors from CSS variables
    const getColors = () => {
      const style = getComputedStyle(document.documentElement)
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return {
        bg: isDark ? 'rgba(26, 23, 20, 0.03)' : 'rgba(250, 247, 242, 0.03)',
        stroke1: isDark ? 'rgba(166, 152, 136, 0.12)' : 'rgba(139, 115, 85, 0.12)',
        stroke2: isDark ? 'rgba(196, 168, 138, 0.1)' : 'rgba(107, 83, 68, 0.1)',
        particle: isDark ? [196, 168, 138] : [139, 115, 85],
        line: isDark ? 'rgba(196, 168, 138, 0.03)' : 'rgba(139, 115, 85, 0.03)',
      }
    }

    let colors = getColors()
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    colorSchemeQuery.addEventListener('change', () => { colors = getColors() })

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let frame = 0
    const particles: Array<{x: number, y: number, vx: number, vy: number, life: number, maxLife: number}> = []
    
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < 200; i++) {
      const theta = i * goldenAngle
      const r = Math.sqrt(i) * 25
      particles.push({
        x: canvas.width / 2 + r * Math.cos(theta),
        y: canvas.height / 2 + r * Math.sin(theta),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        life: Math.random() * 200,
        maxLife: 200 + Math.random() * 100
      })
    }

    const draw = () => {
      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const time = frame * 0.008

      // Draw morphing Lissajous - warm brown tones
      ctx.beginPath()
      ctx.strokeStyle = colors.stroke1
      ctx.lineWidth = 1
      for (let t = 0; t < Math.PI * 4; t += 0.01) {
        const a = 3 + Math.sin(time * 0.5)
        const b = 4 + Math.cos(time * 0.3)
        const x = cx + Math.sin(a * t + time) * 280
        const y = cy + Math.sin(b * t) * 280
        if (t === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Draw breathing polar rose
      ctx.beginPath()
      ctx.strokeStyle = colors.stroke2
      ctx.lineWidth = 0.5
      const k = 5 + Math.sin(time * 0.2) * 2
      for (let theta = 0; theta < Math.PI * 4; theta += 0.005) {
        const r = (200 + Math.sin(time) * 30) * Math.cos(k * theta)
        const x = cx + r * Math.cos(theta)
        const y = cy + r * Math.sin(theta)
        if (theta === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Update and draw particles
      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy
        p.life++
        
        const dx = cx - p.x
        const dy = cy - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        p.vx += dx / dist * 0.01
        p.vy += dy / dist * 0.01
        
        p.vx *= 0.99
        p.vy *= 0.99

        if (p.life > p.maxLife) {
          const theta = i * goldenAngle + time
          const r = Math.sqrt(i) * 25 + Math.sin(time + i) * 50
          p.x = cx + r * Math.cos(theta)
          p.y = cy + r * Math.sin(theta)
          p.life = 0
        }

        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.5
        const size = 1 + Math.sin(time + i * 0.1) * 0.5
        ctx.beginPath()
        ctx.fillStyle = `rgba(${colors.particle[0]}, ${colors.particle[1]}, ${colors.particle[2]}, ${alpha})`
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw connecting lines between nearby particles
      ctx.strokeStyle = colors.line
      ctx.lineWidth = 0.5
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 60) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      frame++
      requestAnimationFrame(draw)
    }
    draw()

    return () => window.removeEventListener('resize', resize)
  }, [])

  // Second canvas for section 2
  useEffect(() => {
    const canvas = canvas2Ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const getColors = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return {
        stroke: isDark ? [196, 168, 138] : [107, 83, 68],
        line: isDark ? 'rgba(196, 168, 138, 0.15)' : 'rgba(139, 115, 85, 0.15)',
      }
    }

    let colors = getColors()
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    colorSchemeQuery.addEventListener('change', () => { colors = getColors() })

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      ctx.scale(2, 2)
    }
    resize()

    let frame = 0
    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)
      
      const time = frame * 0.015

      // Draw flowing field lines - warm brown
      ctx.strokeStyle = `rgba(${colors.stroke[0]}, ${colors.stroke[1]}, ${colors.stroke[2]}, 0.25)`
      ctx.lineWidth = 1

      for (let i = 0; i < 12; i++) {
        ctx.beginPath()
        const startY = (i / 12) * h + Math.sin(time + i) * 20
        
        for (let x = 0; x <= w; x += 3) {
          const progress = x / w
          const wave1 = Math.sin(x * 0.02 + time + i * 0.5) * 30
          const wave2 = Math.sin(x * 0.015 - time * 0.7) * 20
          const envelope = Math.sin(progress * Math.PI)
          const y = startY + (wave1 + wave2) * envelope
          
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      // Draw two focal points
      const focus1 = { x: w * 0.2, y: h * 0.5 + Math.sin(time) * 10 }
      const focus2 = { x: w * 0.8, y: h * 0.5 + Math.cos(time) * 10 }

      // Ripples from focus points
      for (let r = 0; r < 4; r++) {
        const radius = 20 + r * 25 + Math.sin(time * 2 + r) * 10
        const alpha = 0.12 - r * 0.02
        
        ctx.beginPath()
        ctx.strokeStyle = `rgba(${colors.stroke[0]}, ${colors.stroke[1]}, ${colors.stroke[2]}, ${alpha})`
        ctx.arc(focus1.x, focus1.y, radius, 0, Math.PI * 2)
        ctx.stroke()
        
        ctx.beginPath()
        ctx.arc(focus2.x, focus2.y, radius, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Connection between foci
      ctx.beginPath()
      ctx.strokeStyle = colors.line
      ctx.setLineDash([4, 8])
      ctx.moveTo(focus1.x, focus1.y)
      
      const midX = w * 0.5
      const midY = h * 0.5 + Math.sin(time * 1.5) * 40
      ctx.quadraticCurveTo(midX, midY, focus2.x, focus2.y)
      ctx.stroke()
      ctx.setLineDash([])

      frame++
      requestAnimationFrame(draw)
    }
    draw()
  }, [])

  return (
    <div className="bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden">
      {/* ═══════════════════════════════════════════════════════════════════
          HERO - 100vh - Full bleed generative art
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="h-screen relative flex flex-col">
        {/* Live generative canvas */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full"
        />

        {/* Nav */}
        <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-6">
          <span className="text-xs tracking-[0.3em] uppercase text-[var(--muted)]">
            Digital Twin
          </span>
          <Link
            href="/auth/login"
            className="text-xs tracking-wider text-[var(--muted)] hover:text-[var(--foreground)] transition-colors duration-500"
          >
            Enter →
          </Link>
        </nav>

        {/* Content */}
        <div className="relative z-10 flex-1 flex items-end pb-24 md:pb-32 px-6 md:px-12">
          <div className="max-w-xl">
            <h1 className="font-serif text-[clamp(4rem,15vw,12rem)] font-light leading-[0.85] tracking-[-0.04em] mb-8">
              <span className="block text-[var(--foreground)]">You</span>
              <span className="block text-[var(--accent)] italic">else</span>
              <span className="block text-[var(--foreground)]">where</span>
            </h1>
            
            <p className="text-sm md:text-base text-[var(--muted)] max-w-xs leading-relaxed mb-10 ml-1">
              Your voice. Your thinking. Present when you cannot be.
            </p>

            <Link
              href="/auth/login"
              className="inline-block px-8 py-4 bg-[var(--accent)] text-[var(--background)] text-xs tracking-widest uppercase hover:opacity-90 transition-all duration-300 rounded-full ml-1"
            >
              Create
            </Link>
          </div>
        </div>

        {/* Bottom edge detail */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECOND - 100vh - The exchange
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="h-screen relative bg-[var(--surface)]">
        {/* Full bleed canvas visualization */}
        <canvas 
          ref={canvas2Ref}
          className="absolute inset-0 w-full h-full"
        />
        
        {/* Overlay content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-12">
          {/* Top - section marker */}
          <div>
            <span className="text-[10px] tracking-[0.5em] uppercase text-[var(--muted)] opacity-60">
              002
            </span>
          </div>

          {/* Middle - main content, positioned to right */}
          <div className="flex justify-end">
            <div className="max-w-md text-right">
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light leading-[1.1] tracking-[-0.02em] mb-8">
                <span className="text-[var(--muted)]">They ask.</span>
                <br />
                <span className="text-[var(--foreground)]">You answer.</span>
                <br />
                <span className="text-[var(--accent)] italic">Always.</span>
              </h2>
              
              <p className="text-sm text-[var(--muted)] leading-relaxed mb-10 max-w-sm ml-auto">
                Five questions. Your voice captured. A link that speaks for you, 
                anytime they want to listen.
              </p>

              <Link
                href="/auth/login"
                className="inline-flex items-center gap-4 text-xs tracking-widest uppercase group"
              >
                <span className="w-8 h-px bg-[var(--foreground)] group-hover:w-16 transition-all duration-700" />
                <span className="text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">Begin</span>
              </Link>
            </div>
          </div>

          {/* Bottom - minimal footer */}
          <div className="flex justify-between items-end text-[10px] tracking-[0.2em] uppercase text-[var(--muted)]">
            <span>Digital Twin</span>
            <span>©2025</span>
          </div>
        </div>
      </section>
    </div>
  )
}
