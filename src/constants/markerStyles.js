/**
 * MARKER_STYLES
 * Single source of truth for how each lesion type looks on the canvas
 * and in the overlay key legend.
 *
 * shape options: "circle" | "diamond" | "triangle"
 */
export const MARKER_STYLES = {
  micro: {
    label: 'Microaneurysm',
    color: '#E24B4A',
    r: 5,
    shape: 'circle',
  },
  exudate: {
    label: 'Hard exudate',
    color: '#EF9F27',
    r: 7,
    shape: 'diamond',
  },
  hemo: {
    label: 'Hemorrhage',
    color: '#7F77DD',
    r: 8,
    shape: 'triangle',
  },
}
