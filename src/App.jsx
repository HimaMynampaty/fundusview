import { useState, useRef, useCallback } from 'react'
import './App.css'

import { MODES }         from './modes'
import ModeSelector from './components/ModeSelector'
import Toolbar      from './components/Toolbar'
import ImageCanvas  from './components/ImageCanvas'
import ImageGallery from './components/ImageGallery'
import ResultsPanel from './components/ResultsPanel'
import OverlayKey   from './components/OverlayKey'

function defaultVisible(mode) {
  return Object.fromEntries(mode.legendItems.map(li => [li.type, true]))
}

export default function App() {
  const [modeId, setModeId] = useState(MODES[0].id)
  const mode = MODES.find(m => m.id === modeId) || MODES[0]

  const [images,    setImages]    = useState([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const activeImage = images[activeIdx]

  const addImage = useCallback(({ url, name }) => {
    setImages(prev => {
      const next = [...prev, { id: Date.now(), url, name }]
      setActiveIdx(next.length - 1)
      return next
    })
  }, [])

  const removeImage = useCallback(idx => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== idx)
      setActiveIdx(cur => {
        if (next.length === 0) return -1
        if (idx < cur)        return cur - 1
        if (idx === cur)      return Math.min(cur, next.length - 1)
        return cur
      })
      return next
    })
  }, [])

  const [markers,      setMarkers]      = useState([])
  const [visible,      setVisible]      = useState(() => defaultVisible(MODES[0]))
  const [showHeatmap,  setShowHeatmap]  = useState(false)
  const [results,      setResults]      = useState(null)
  const [analyzing,    setAnalyzing]    = useState(false)
  const [activeAction, setActiveAction] = useState(null)

  const clearAnalysis = useCallback(() => {
    setMarkers([]); setShowHeatmap(false); setResults(null); setActiveAction(null)
  }, [])

  const switchMode = id => {
    const next = MODES.find(m => m.id === id)
    if (!next) return
    setModeId(id)
    setVisible(defaultVisible(next))
    clearAnalysis()
  }

  const [tool,        setTool]        = useState('select')
  const [measPts,     setMeasPts]     = useState([])
  const [hoverCoords, setHoverCoords] = useState(null)
  const canvasRef = useRef(null)

  const runAction = useCallback(async actionId => {
    if (!activeImage) return
    if (actionId === 'clear') { clearAnalysis(); return }

    setAnalyzing(true)
    setActiveAction(actionId)

    // Small delay so the spinner renders before the pixel scan runs
    await new Promise(r => setTimeout(r, 60))

    const img = new Image()
    await new Promise(resolve => { img.onload = resolve; img.src = activeImage.url })
    const res = mode.analyze(img, actionId)

    if (actionId === 'heatmap') {
      setShowHeatmap(true); setMarkers([]); setResults(null)
    } else {
      setShowHeatmap(false); setMarkers(res.markers || []); setResults(res.metrics)
    }

    setAnalyzing(false)
  }, [activeImage, mode, clearAnalysis])

  const handleVisibilityChange = (type, value) =>
    setVisible(v => ({ ...v, [type]: value }))

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>

      {/* Header */}
      <header style={{ padding:'9px 16px', borderBottom:'0.5px solid var(--color-border-tertiary)', display:'flex', alignItems:'center', gap:14, background:'var(--color-bg)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <i className="ti ti-eye-scan" aria-hidden="true" style={{ fontSize:17, color:mode.accent }} />
          <span style={{ fontSize:13, fontWeight:500, color:'var(--color-text-primary)' }}>FundusView</span>
          <span style={{ fontSize:10, color:'var(--color-text-secondary)', marginLeft:2 }}>Retinal Analysis</span>
        </div>
        <ModeSelector modes={MODES} activeId={modeId} onSelect={switchMode} />
      </header>

      {/* Toolbar */}
      <Toolbar
        mode={mode}
        hasImage={!!activeImage}
        analyzing={analyzing}
        activeAction={activeAction}
        tool={tool}
        onToolChange={t => { setTool(t); setMeasPts([]) }}
        onAction={runAction}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onZoomFit={() => canvasRef.current?.resetView()}
        hoverCoords={hoverCoords}
      />

      {/* Main */}
      <div style={{ display:'flex', flex:1, minHeight:0 }}>
        <ImageCanvas
          ref={canvasRef}
          imageUrl={activeImage?.url}
          markers={markers}
          visible={visible}
          showHeatmap={showHeatmap}
          tool={tool}
          measPts={measPts}
          onMeasPts={setMeasPts}
          onHover={setHoverCoords}
          onImageLoad={clearAnalysis}
          analyzing={analyzing}
          accent={mode.accent}
        />

        {/* Sidebar */}
        <div style={{ width:252, flexShrink:0, display:'flex', flexDirection:'column', borderLeft:'0.5px solid var(--color-border-tertiary)', background:'var(--color-bg)', overflowY:'auto' }}>
          <ImageGallery
            images={images} activeIdx={activeIdx}
            onSelect={setActiveIdx} onAdd={addImage}
            onRemove={removeImage} accent={mode.accent}
          />
          <ResultsPanel
            mode={mode} results={results}
            analyzing={analyzing} showHeatmap={showHeatmap}
          />
          <OverlayKey
            mode={mode} markers={markers}
            visible={visible} onVisibilityChange={handleVisibilityChange}
          />
          <div style={{ padding:'10px 12px', marginTop:'auto', borderTop:'0.5px solid var(--color-border-tertiary)', background:'var(--color-bg-secondary)' }}>
            <p style={{ fontSize:9, color:'var(--color-text-secondary)', margin:0, lineHeight:1.7, fontFamily:'var(--font-mono)' }}>
              <strong style={{ color:'var(--color-text-primary)' }}>Mode: </strong>{mode.id}<br />
              <strong style={{ color:'var(--color-text-primary)' }}>Engine: </strong>in-browser analysis<br />
              <strong style={{ color:'var(--color-text-primary)' }}>Swap: </strong>src/modes/{mode.id}.js
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
