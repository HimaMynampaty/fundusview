/**
 * glaucoma.js — Glaucoma Risk Assessment mode (OCT-equivalent)
 *
 * Structural analysis: detects the optic disc and optic cup boundaries,
 * computes the cup-to-disc ratio (CDR), and grades risk.
 *
 * Visual language is deliberately different from DR mode:
 *   - Large RING overlays that scale with zoom (not small fixed-size markers)
 *   - Cyan ring = optic disc boundary
 *   - Amber ring = optic cup boundary
 *   - A centre cross marks the detected disc centre
 *
 * Algorithm (POC — pixel brightness thresholding):
 *   1. Scan for bright warm pixels (optic disc: cream/orange glow)
 *   2. Compute centroid and estimate disc radius from pixel count
 *   3. Within disc region, find the brightest centre area (optic cup)
 *   4. CDR = cup_radius / disc_radius
 *   5. Grade: normal (<0.5), borderline (0.5–0.65), elevated (>0.65)
 *
 * To swap in a real algorithm: replace the pixel-loop block below.
 * The return shape { markers, heatmap, metrics } must stay the same.
 */

function analyzeGlaucoma(imgEl, actionId) {
  if (actionId === 'clear') return { markers: [], heatmap: false, metrics: null }
  if (actionId === 'heatmap') return { markers: [], heatmap: true, metrics: null }

  if (actionId === 'segment') {
    const iW = imgEl.naturalWidth, iH = imgEl.naturalHeight
    const off = document.createElement('canvas')
    off.width = iW; off.height = iH
    off.getContext('2d').drawImage(imgEl, 0, 0)
    const { data } = off.getContext('2d').getImageData(0, 0, iW, iH)

    // ── Step 1: Find optic disc — large warm bright region ──
    const step = Math.max(3, Math.floor(Math.min(iW, iH) / 150))
    const discCandidates = []

    for (let py = step; py < iH - step; py += step) {
      for (let px = step; px < iW - step; px += step) {
        const i = (py * iW + px) * 4
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3]
        if (a < 30) continue
        // Optic disc: bright warm (high R+G, R>B, high overall luminance)
        const luma = (r * 0.299 + g * 0.587 + b * 0.114)
        if (luma > 160 && r > b && r > 140 && g > 110) {
          discCandidates.push({ x: px, y: py })
        }
      }
    }

    if (discCandidates.length < 5) {
      return {
        markers: [],
        heatmap: false,
        metrics: { note: 'Optic disc not detected — try a clearer fundus image' },
      }
    }

    // ── Step 2: Centroid and disc radius ──
    const discCx = Math.round(discCandidates.reduce((s, p) => s + p.x, 0) / discCandidates.length)
    const discCy = Math.round(discCandidates.reduce((s, p) => s + p.y, 0) / discCandidates.length)
    // Radius estimated from pixel count area
    const discArea = discCandidates.length * step * step
    let discR = Math.round(Math.sqrt(discArea / Math.PI))
    discR = Math.max(discR, 15)

    // ── Step 3: Find optic cup — very bright centre within disc ──
    const cupCandidates = []
    for (let py = step; py < iH - step; py += step) {
      for (let px = step; px < iW - step; px += step) {
        // Only look within disc boundary
        if (Math.hypot(px - discCx, py - discCy) > discR * 1.1) continue
        const i = (py * iW + px) * 4
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3]
        if (a < 30) continue
        // Cup: even brighter / whiter centre
        if (r > 210 && g > 185 && b > 120) {
          cupCandidates.push({ x: px, y: py })
        }
      }
    }

    let cupR = 0
    if (cupCandidates.length > 2) {
      const cupArea = cupCandidates.length * step * step
      cupR = Math.round(Math.sqrt(cupArea / Math.PI))
    }
    cupR = Math.max(cupR, Math.round(discR * 0.2)) // enforce at least 20% of disc

    // ── Step 4: CDR and grading ──
    const cdr = cupR / discR
    const g = cdr > 0.65 ? 2 : cdr > 0.5 ? 1 : 0
    const grades     = ['Normal',  'Borderline',  'Elevated CDR']
    const risks      = ['Low',     'Moderate',    'High']
    const riskColors = ['#1D9E75', '#BA7517',     '#A32D2D']

    // ── Step 5: Build ring markers ──
    const markers = [
      {
        type: 'disc', x: discCx, y: discCy,
        color: '#00D4AA', shape: 'ring', r: discR,
      },
      {
        type: 'cup', x: discCx, y: discCy,
        color: '#EF9F27', shape: 'ring', r: cupR,
      },
    ]

    return {
      markers,
      heatmap: false,
      metrics: {
        disc_r:    discR,
        cup_r:     cupR,
        cdr:       cdr.toFixed(2),
        grade:     grades[g],
        risk:      risks[g],
        riskColor: riskColors[g],
      },
    }
  }

  return { markers: [], heatmap: false, metrics: null }
}

export const GLAUCOMA_MODE = {
  id: 'glaucoma',
  name: 'Glaucoma Risk',
  subtitle: 'Structural Analysis — OCT-equivalent',
  accent: '#534AB7',

  actions: [
    { id: 'segment', label: 'Segment Disc / Cup', primary: true },
    { id: 'clear',   label: 'Clear',              ghost: true   },
  ],

  analyze: analyzeGlaucoma,

  legendItems: [
    { type: 'disc', color: '#00D4AA', shape: 'ring', label: 'Optic disc boundary' },
    { type: 'cup',  color: '#EF9F27', shape: 'ring', label: 'Optic cup boundary'  },
  ],

  resultFields: [
    { key: 'disc_r', label: 'Disc radius (px)' },
    { key: 'cup_r',  label: 'Cup radius (px)'  },
    { key: 'cdr',    label: 'CDR ratio', span: true                          },
    { key: 'grade',  label: 'Grade',     full: true                          },
    { key: 'risk',   label: 'Risk level', full: true, colorKey: 'riskColor' },
  ],
}
