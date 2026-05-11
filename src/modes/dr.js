import { cluster } from '../utils/cluster'

/**
 * DR mode — Diabetic Retinopathy screening (SLO-equivalent)
 *
 * Two analysis actions:
 *   detect        – pixel RGB threshold scan for lesion types
 *   vessel_density – estimates vessel coverage in the fundus
 *   heatmap       – scripted risk-zone overlay
 *
 * All markers carry their own style so the renderer is mode-agnostic.
 * To swap in a real ML model: replace the pixel-loop block in each action.
 */

// Lesion style constants — embedded into markers at creation time
const LESION_STYLES = {
  micro:   { color: '#E24B4A', shape: 'circle',   r: 5 },
  exudate: { color: '#EF9F27', shape: 'diamond',  r: 7 },
  hemo:    { color: '#7F77DD', shape: 'triangle', r: 8 },
}

function detectLesions(imgEl) {
  const iW = imgEl.naturalWidth, iH = imgEl.naturalHeight
  const off = document.createElement('canvas')
  off.width = iW; off.height = iH
  off.getContext('2d').drawImage(imgEl, 0, 0)
  const { data } = off.getContext('2d').getImageData(0, 0, iW, iH)

  const candidates = []
  const step = Math.max(4, Math.floor(Math.min(iW, iH) / 120))

  for (let py = step; py < iH - step; py += step) {
    for (let px = step; px < iW - step; px += step) {
      const i = (py * iW + px) * 4
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3]
      if (a < 30) continue
      if (r>110 && g<68 && b<68 && r-g>58)          candidates.push({ x:px, y:py, type:'micro'   })
      if (r>185 && g>162 && b<100 && r+g-2*b>195)   candidates.push({ x:px, y:py, type:'exudate' })
      if (r>52 && r<118 && g<36 && b<36 && r-g>26)  candidates.push({ x:px, y:py, type:'hemo'    })
    }
  }

  // Cluster and embed style into each marker
  return cluster(candidates, 15).map(m => ({
    ...m,
    ...LESION_STYLES[m.type],
  }))
}

function estimateVesselDensity(imgEl) {
  const iW = imgEl.naturalWidth, iH = imgEl.naturalHeight
  const off = document.createElement('canvas')
  off.width = iW; off.height = iH
  off.getContext('2d').drawImage(imgEl, 0, 0)
  const { data } = off.getContext('2d').getImageData(0, 0, iW, iH)

  const cx = iW / 2, cy = iH / 2, R = Math.min(iW, iH) * 0.44
  let fundusPixels = 0, vesselPixels = 0

  // Sample at reduced resolution for speed
  const step = 3
  let totalG = 0, count = 0

  for (let py = 0; py < iH; py += step) {
    for (let px = 0; px < iW; px += step) {
      if (Math.hypot(px - cx, py - cy) > R) continue
      const i = (py * iW + px) * 4
      if (data[i+3] < 30) continue
      totalG += data[i+1]
      count++
      fundusPixels++
    }
  }

  const meanG = totalG / Math.max(count, 1)

  for (let py = 0; py < iH; py += step) {
    for (let px = 0; px < iW; px += step) {
      if (Math.hypot(px - cx, py - cy) > R) continue
      const i = (py * iW + px) * 4
      if (data[i+3] < 30) continue
      // Vessels are darker than surrounding tissue in the green channel
      if (data[i+1] < meanG * 0.72) vesselPixels++
    }
  }

  const density = (vesselPixels / Math.max(fundusPixels, 1)) * 100
  return {
    vessel_density: `${density.toFixed(1)}%`,
    vessel_pixels: vesselPixels,
    fundus_pixels: fundusPixels,
    note: 'Estimated via green-channel intensity thresholding',
  }
}

function analyzeDR(imgEl, actionId) {
  if (actionId === 'clear')   return { markers: [], heatmap: false, metrics: null }
  if (actionId === 'heatmap') return { markers: [], heatmap: true,  metrics: null }

  if (actionId === 'detect') {
    const markers = detectLesions(imgEl)
    const micro   = markers.filter(m => m.type === 'micro').length
    const exudate = markers.filter(m => m.type === 'exudate').length
    const hemo    = markers.filter(m => m.type === 'hemo').length
    const total   = micro + exudate + hemo
    const g       = total > 30 ? 3 : total > 14 ? 2 : total > 4 ? 1 : 0
    return {
      markers, heatmap: false,
      metrics: {
        micro, exudate, hemo,
        grade:     ['No DR', 'Mild NPDR', 'Moderate NPDR', 'Severe NPDR'][g],
        risk:      ['Low', 'Moderate', 'High', 'Severe'][g],
        riskColor: ['#1D9E75', '#BA7517', '#D85A30', '#A32D2D'][g],
      },
    }
  }

  if (actionId === 'vessel_density') {
    return { markers: [], heatmap: false, metrics: estimateVesselDensity(imgEl) }
  }

  return { markers: [], heatmap: false, metrics: null }
}

export const DR_MODE = {
  id: 'dr',
  name: 'DR Screening',
  subtitle: 'Diabetic Retinopathy — SLO-equivalent',
  accent: '#1D9E75',

  actions: [
    { id: 'detect',         label: 'Detect Lesions',  primary: true  },
    { id: 'vessel_density', label: 'Vessel Density'                  },
    { id: 'heatmap',        label: 'Risk Heatmap'                    },
    { id: 'clear',          label: 'Clear',            ghost: true    },
  ],

  analyze: analyzeDR,

  // Legend items — OverlayKey reads from here, not from a global constant
  legendItems: [
    { type: 'micro',   color: '#E24B4A', shape: 'circle',   label: 'Microaneurysm' },
    { type: 'exudate', color: '#EF9F27', shape: 'diamond',  label: 'Hard exudate'  },
    { type: 'hemo',    color: '#7F77DD', shape: 'triangle', label: 'Hemorrhage'    },
  ],

  resultFields: [
    { key: 'micro',          label: 'Microaneurysms' },
    { key: 'exudate',        label: 'Hard exudates'  },
    { key: 'hemo',           label: 'Hemorrhages'    },
    { key: 'vessel_density', label: 'Vessel density', span: true           },
    { key: 'grade',          label: 'DR grade',       full: true           },
    { key: 'risk',           label: 'Risk level',     full: true, colorKey: 'riskColor' },
  ],
}
