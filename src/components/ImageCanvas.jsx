import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { renderFrame } from '../canvas/renderer'
import { fitTransform } from '../utils/transform'

/**
 * ImageCanvas
 *
 * Key architecture decisions:
 *
 * 1. stateRef pattern — render() reads all props from a ref that is
 *    updated on every render. This means render() itself has EMPTY deps
 *    and never becomes stale. No need to put props in effect dep arrays.
 *
 * 2. schedRef — a ref that always points to the latest sched() fn.
 *    Effects with empty dep arrays use schedRef.current() so they don't
 *    need sched as a dep (which would cause them to re-run on every
 *    state change, repeatedly clearing + repainting the canvas).
 *
 * 3. img.complete check — base64 data URLs often load synchronously
 *    before onload is assigned. We call handleLoad() manually when
 *    img.complete is already true after setting src.
 */
const ImageCanvas = forwardRef(function ImageCanvas(
  {
    imageUrl, markers, visible, showHeatmap,
    tool, measPts, onMeasPts,
    onTransform, onHover,
    onImageLoad, analyzing, accent = '#1D9E75',
  },
  ref
) {
  const canvasRef    = useRef(null)
  const containerRef = useRef(null)
  const imgEl        = useRef(new Image())
  const rafRef       = useRef(null)
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const hoverRef     = useRef(null)
  const isDragging   = useRef(false)
  const dragOrigin   = useRef(null)

  // ── stateRef: always holds current prop values ──────────────
  // render() reads from here, so it never has stale closures and
  // doesn't need to be recreated when props change.
  const stateRef = useRef({})
  stateRef.current = { markers, visible, showHeatmap, tool, measPts }

  // ── Stable render fn ─────────────────────────────────────────
  const render = useCallback(() => {
    renderFrame(canvasRef.current, imgEl.current, {
      transform: transformRef.current,
      ...stateRef.current,
      hover: hoverRef.current
        ? { ...hoverRef.current, transform: transformRef.current }
        : null,
    })
  }, []) // intentionally empty — reads everything from refs

  const sched = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(render)
  }, [render]) // stable because render is stable

  // schedRef: lets effects with [] deps always call latest sched
  const schedRef = useRef(sched)
  schedRef.current = sched

  // ── Expose resetView to parent ────────────────────────────────
  useImperativeHandle(ref, () => ({
    resetView() {
      const img = imgEl.current, cv = canvasRef.current
      if (!img.naturalWidth || !cv) return
      const t = fitTransform(img.naturalWidth, img.naturalHeight, cv.width, cv.height)
      transformRef.current = t
      onTransform?.(t)
      schedRef.current()
    },
  }), [onTransform])

  // ── Re-render when any prop changes ──────────────────────────
  useEffect(() => {
    schedRef.current()
  }, [markers, visible, showHeatmap, tool, measPts])

  // ── Canvas sizing (stable, uses schedRef) ────────────────────
  useEffect(() => {
    const resize = () => {
      const cv = canvasRef.current, ct = containerRef.current
      if (!cv || !ct) return
      cv.width  = ct.clientWidth
      cv.height = ct.clientHeight
      schedRef.current()
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, []) // intentionally empty — uses schedRef

  // ── Image loading ─────────────────────────────────────────────
  // Only re-runs when imageUrl changes.
  // Handles the case where base64 data URLs load synchronously
  // (img.complete is true before onload is ever called).
  useEffect(() => {
    const img = imgEl.current
    if (!imageUrl) {
      img.src = ''
      schedRef.current()
      return
    }

    const handleLoad = () => {
      const cv = canvasRef.current
      if (!cv) return
      const t = fitTransform(img.naturalWidth, img.naturalHeight, cv.width, cv.height)
      transformRef.current = t
      onTransform?.(t)
      onImageLoad?.()
      schedRef.current()
    }

    img.onload = handleLoad
    img.src = imageUrl

    // Base64 data URLs often complete synchronously before onload fires.
    // Call handleLoad manually if the browser already finished loading.
    if (img.complete && img.naturalWidth > 0) {
      handleLoad()
    }
  }, [imageUrl, onTransform, onImageLoad]) // sched intentionally excluded

  // ── Wheel zoom (passive: false required to preventDefault) ────
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const onWheel = e => {
      e.preventDefault()
      const rect = cv.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.13 : 0.87
      const t = transformRef.current
      const ns = Math.max(0.25, Math.min(20, t.scale * factor))
      const newT = {
        scale: ns,
        x: mx - (mx - t.x) * (ns / t.scale),
        y: my - (my - t.y) * (ns / t.scale),
      }
      transformRef.current = newT
      onTransform?.(newT)
      schedRef.current()
    }
    cv.addEventListener('wheel', onWheel, { passive: false })
    return () => cv.removeEventListener('wheel', onWheel)
  }, [onTransform])

  // ── Mouse events ──────────────────────────────────────────────
  const getPos = useCallback(e => {
    const r = canvasRef.current.getBoundingClientRect()
    return { cx: e.clientX - r.left, cy: e.clientY - r.top }
  }, [])

  const toImageCoords = useCallback((cx, cy) => {
    const { x, y, scale } = transformRef.current
    return { x: (cx - x) / scale, y: (cy - y) / scale }
  }, [])

  const onMouseDown = useCallback(e => {
    const { cx, cy } = getPos(e)
    const { tool: currentTool } = stateRef.current
    if (currentTool === 'select') {
      isDragging.current = true
      dragOrigin.current = {
        ox: cx - transformRef.current.x,
        oy: cy - transformRef.current.y,
      }
    } else if (currentTool === 'measure') {
      const ip = toImageCoords(cx, cy)
      onMeasPts(pts => pts.length >= 2 ? [ip] : [...pts, ip])
    }
  }, [getPos, toImageCoords, onMeasPts])

  const onMouseMove = useCallback(e => {
    const { cx, cy } = getPos(e)
    const ip = toImageCoords(cx, cy)
    hoverRef.current = { cx, cy, ix: ip.x.toFixed(1), iy: ip.y.toFixed(1) }
    onHover?.({ ix: ip.x.toFixed(1), iy: ip.y.toFixed(1) })
    if (isDragging.current && dragOrigin.current) {
      const { ox, oy } = dragOrigin.current
      const newT = { ...transformRef.current, x: cx - ox, y: cy - oy }
      transformRef.current = newT
      onTransform?.(newT)
    }
    schedRef.current()
  }, [getPos, toImageCoords, onHover, onTransform])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const onMouseLeave = useCallback(() => {
    isDragging.current = false
    hoverRef.current = null
    onHover?.(null)
    schedRef.current()
  }, [onHover])

  const currentTool = stateRef.current.tool ?? 'select'

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1, position: 'relative',
        background: '#05080f',
        cursor: currentTool === 'select' ? 'grab' : 'crosshair',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* Empty state */}
      {!imageUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>
            Load an image from the sidebar →
          </p>
        </div>
      )}

      {/* Analyzing spinner */}
      {analyzing && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(5,8,14,0.6)', gap: 10,
          fontSize: 12, color: accent,
          fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
          pointerEvents: 'none',
        }}>
          <i className="ti ti-loader-2 spin" style={{ fontSize: 17 }} aria-hidden="true" />
          Analyzing…
        </div>
      )}

      {/* HUD */}
      {imageUrl && (
        <div style={{
          position: 'absolute', bottom: 8, left: 10,
          fontSize: 9, color: 'rgba(255,255,255,0.28)',
          fontFamily: 'var(--font-mono)', pointerEvents: 'none', letterSpacing: '0.05em',
        }}>
          scroll = zoom · drag = pan · {currentTool === 'measure' ? 'click = place point' : 'hover = magnifier'}
        </div>
      )}
    </div>
  )
})

export default ImageCanvas
