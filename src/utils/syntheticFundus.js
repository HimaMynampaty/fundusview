/**
 * generateSyntheticFundus(size)
 * Draws a plausible-looking fundus photograph onto a canvas and
 * returns it as a base64 PNG data URL.
 *
 * Produces: dark fundus disc, optic disc glow, vessel branches,
 * fovea darkening, scattered microaneurysms (red dots),
 * hard exudates (yellow-white dots).
 */
export function generateSyntheticFundus(size = 560) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  const cx = size / 2, cy = size / 2, R = size * 0.44
  const rnd = Math.random.bind(Math)

  // Black background
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, size, size)

  // Fundus disc (dark brownish-red radial gradient)
  const bg = ctx.createRadialGradient(cx, cy, 12, cx, cy, R)
  bg.addColorStop(0, '#3a1508')
  bg.addColorStop(0.5, '#220b04')
  bg.addColorStop(0.87, '#130502')
  bg.addColorStop(1, '#000')
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fillStyle = bg
  ctx.fill()

  // Optic disc (bright cream/orange glow)
  const dx = cx + R * 0.3, dy = cy - R * 0.04
  const dg = ctx.createRadialGradient(dx, dy, 1, dx, dy, R * 0.1)
  dg.addColorStop(0, '#fff0c0')
  dg.addColorStop(0.55, '#d4902a')
  dg.addColorStop(1, 'rgba(160,100,40,0)')
  ctx.beginPath()
  ctx.arc(dx, dy, R * 0.1, 0, Math.PI * 2)
  ctx.fillStyle = dg
  ctx.fill()

  // Blood vessels radiating from optic disc
  ;[0, 0.5, 1.0, 1.6, 2.2, 2.8, 3.5, 4.2, 4.9, 5.6].forEach((angle, i) => {
    ctx.beginPath()
    ctx.moveTo(dx, dy)
    let x = dx, y = dy, a = angle
    const len = R * (0.45 + rnd() * 0.4)
    for (let s = 0; s < 14; s++) {
      a += (rnd() - 0.5) * 0.22
      x += Math.cos(a) * len / 14
      y += Math.sin(a) * len / 14
      ctx.lineTo(x, y)
    }
    ctx.strokeStyle = `rgba(${145 + i * 2},28,12,0.6)`
    ctx.lineWidth = 0.7 + (i % 4 === 0 ? 1.1 : 0.3)
    ctx.stroke()
  })

  // Fovea / macula darkening
  const mg = ctx.createRadialGradient(cx - R * 0.12, cy, 0, cx - R * 0.12, cy, R * 0.13)
  mg.addColorStop(0, 'rgba(60,10,5,0.9)')
  mg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.beginPath()
  ctx.arc(cx - R * 0.12, cy, R * 0.13, 0, Math.PI * 2)
  ctx.fillStyle = mg
  ctx.fill()

  // Microaneurysms – vivid red dots at random positions
  for (let i = 0; i < 20; i++) {
    const a = rnd() * Math.PI * 2
    const d = R * (0.18 + rnd() * 0.62)
    const px = cx + Math.cos(a) * d
    const py = cy + Math.sin(a) * d
    if (Math.hypot(px - cx, py - cy) < R * 0.9) {
      ctx.beginPath()
      ctx.arc(px, py, 2 + rnd() * 3.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgb(${(175 + rnd() * 75) | 0},${(rnd() * 32) | 0},${(rnd() * 28) | 0})`
      ctx.fill()
    }
  }

  // Hard exudates – yellow-white bright specks
  for (let i = 0; i < 12; i++) {
    const a = rnd() * Math.PI * 2
    const d = R * (0.25 + rnd() * 0.48)
    const px = cx + Math.cos(a) * d
    const py = cy + Math.sin(a) * d
    if (Math.hypot(px - cx, py - cy) < R * 0.84) {
      ctx.beginPath()
      ctx.arc(px, py, 1.5 + rnd() * 2.8, 0, Math.PI * 2)
      ctx.fillStyle = `rgb(${(218 + rnd() * 37) | 0},${(202 + rnd() * 38) | 0},${(rnd() * 65) | 0})`
      ctx.fill()
    }
  }

  return c.toDataURL('image/png')
}
