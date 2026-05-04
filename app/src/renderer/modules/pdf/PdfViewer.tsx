import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Moon, Sun, BookOpen, Bookmark, MessageSquare, X, FolderOpen, Maximize2, Minimize2 } from 'lucide-react'

// We'll use PDF.js from CDN for rendering
declare const pdfjsLib: any

function PdfViewer(): React.ReactElement {
  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileHash, setFileHash] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [nightMode, setNightMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [annotations, setAnnotations] = useState<any[]>([])
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [noteText, setNoteText] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const openFile = async () => {
    const path = await window.electronAPI?.pdf.openDialog()
    if (path) {
      const result = await window.electronAPI?.pdf.open({ filePath: path })
      if (result) {
        setFilePath(result.filePath)
        setFileHash(result.hash)
        setFileName(result.fileName)
        if (result.savedState) {
          setCurrentPage(result.savedState.last_page || 1)
          setZoom(result.savedState.zoom_level || 100)
          setSidebarOpen(result.savedState.sidebar_open !== false)
        }
        loadPdf(result.filePath)
        loadAnnotations(result.hash)
      }
    }
  }

  const loadPdf = async (path: string) => {
    try {
      // Load PDF.js if not already loaded
      if (typeof pdfjsLib === 'undefined') {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        script.onload = () => {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          loadPdfDocument(path)
        }
        document.head.appendChild(script)
      } else {
        loadPdfDocument(path)
      }
    } catch (err) {
      console.error('Failed to load PDF:', err)
    }
  }

  const loadPdfDocument = async (path: string) => {
    try {
      const doc = await pdfjsLib.getDocument(`file:///${path.replace(/\\/g, '/')}`).promise
      setPdfDoc(doc)
      setTotalPages(doc.numPages)
    } catch (err) {
      console.error('PDF load error:', err)
    }
  }

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return

    try {
      const page = await pdfDoc.getPage(pageNum)
      const scale = zoom / 100
      const viewport = page.getViewport({ scale: scale * 1.5 })
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({ canvasContext: ctx, viewport }).promise
    } catch (err) {
      console.error('Render error:', err)
    }
  }, [pdfDoc, zoom])

  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(currentPage)
    }
  }, [pdfDoc, currentPage, renderPage])

  useEffect(() => {
    // Save state on changes
    if (fileHash) {
      window.electronAPI?.pdf.saveState({
        filePathHash: fileHash,
        page: currentPage,
        zoom,
        sidebarOpen,
      })
    }
  }, [currentPage, zoom, sidebarOpen, fileHash])

  const loadAnnotations = async (hash: string) => {
    const ann = await window.electronAPI?.pdf.getAnnotations({ filePathHash: hash })
    if (ann) setAnnotations(ann)
  }

  const addBookmark = async () => {
    if (!fileHash) return
    const result = await window.electronAPI?.pdf.saveAnnotation({
      filePathHash: fileHash,
      pageNumber: currentPage,
      type: 'bookmark',
      content: `Page ${currentPage}`,
    })
    if (result) setAnnotations(result)
  }

  const addNote = async () => {
    if (!fileHash || !noteText.trim()) return
    const result = await window.electronAPI?.pdf.saveAnnotation({
      filePathHash: fileHash,
      pageNumber: currentPage,
      type: 'note',
      content: noteText.trim(),
    })
    if (result) setAnnotations(result)
    setNoteText('')
    setShowNoteInput(false)
  }

  const deleteAnnotation = async (id: number) => {
    await window.electronAPI?.pdf.deleteAnnotation({ annotationId: id })
    if (fileHash) loadAnnotations(fileHash)
  }

  const prevPage = () => setCurrentPage((p) => Math.max(1, p - 1))
  const nextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1))
  const zoomIn = () => setZoom((z) => Math.min(300, z + 15))
  const zoomOut = () => setZoom((z) => Math.max(50, z - 15))

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case 'j': case 'ArrowDown': case ' ': nextPage(); break
        case 'k': case 'ArrowUp': prevPage(); break
        case 'b': setSidebarOpen((s) => !s); break
        case 'n': setNightMode((n) => !n); break
        case '+': case '=': if (e.ctrlKey) { e.preventDefault(); zoomIn() } break
        case '-': if (e.ctrlKey) { e.preventDefault(); zoomOut() } break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [totalPages])

  useEffect(() => {
    window.electronAPI?.window.isFullscreen().then((value: boolean) => {
      setIsFullscreen(Boolean(value))
    }).catch(() => {})

    window.electronAPI?.on('window:fullscreenChanged', (value: boolean) => {
      setIsFullscreen(Boolean(value))
    })

    return () => {
      window.electronAPI?.removeAllListeners('window:fullscreenChanged')
    }
  }, [])

  const toggleFullscreen = () => {
    if (isFullscreen) {
      window.electronAPI?.window.exitFullscreen()
      return
    }
    window.electronAPI?.window.enterFullscreen()
  }

  if (!filePath) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 'var(--space-lg)',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 'var(--radius-xl)',
          background: 'rgba(245, 166, 35, 0.1)', border: '2px dashed rgba(245, 166, 35, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
        }}>
          📄
        </div>
        <h2>PDF Reader</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', maxWidth: 400 }}>
          A Sumatra-style PDF reader. Keyboard-first, zero clutter, fast.
          <br />Your reading position and annotations are saved automatically.
        </p>
        <button className="btn btn-primary btn-lg" onClick={openFile}>
          <FolderOpen size={18} /> Open PDF File
        </button>
        <div style={{
          marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          J/K: Scroll · B: Sidebar · N: Night · Ctrl+/−: Zoom · Ctrl+D: Bookmark
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', marginTop: -16, marginLeft: -32, marginRight: -32 }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{
          width: 240, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-subtle)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: 'var(--space-md)', borderBottom: '1px solid var(--border-subtle)',
            fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)',
          }}>
            Annotations
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-sm)' }}>
            {annotations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, padding: 'var(--space-md)', textAlign: 'center' }}>
                No annotations yet. Use Ctrl+D to bookmark pages.
              </p>
            ) : (
              annotations.map((ann) => (
                <div key={ann.id} style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)',
                  marginBottom: 4, cursor: 'pointer',
                  borderLeft: `3px solid ${ann.type === 'bookmark' ? 'var(--accent-warning)' : 'var(--accent-recall)'}`,
                }} onClick={() => setCurrentPage(ann.page_number)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {ann.type === 'bookmark' ? '🔖' : '📝'} Page {ann.page_number}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
                      <X size={12} />
                    </button>
                  </div>
                  {ann.content && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {ann.content}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px var(--space-md)', background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <button className="btn btn-ghost btn-sm" onClick={openFile} title="Open"><FolderOpen size={14} /></button>
            <button className="btn btn-ghost btn-sm" onClick={prevPage} title="Previous page"><ChevronLeft size={16} /></button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', minWidth: 80, textAlign: 'center' }}>
              {currentPage} / {totalPages}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={nextPage} title="Next page"><ChevronRight size={16} /></button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <button className="btn btn-ghost btn-sm" onClick={zoomOut} title="Zoom out"><ZoomOut size={14} /></button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', minWidth: 40, textAlign: 'center' }}>
              {zoom}%
            </span>
            <button className="btn btn-ghost btn-sm" onClick={zoomIn} title="Zoom in"><ZoomIn size={14} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => setNightMode(!nightMode)} title="Night mode">
              {nightMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle sidebar">
              <BookOpen size={14} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={addBookmark} title="Bookmark page (Ctrl+D)">
              <Bookmark size={14} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowNoteInput(!showNoteInput)} title="Add note">
              <MessageSquare size={14} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>

        {/* Note input */}
        {showNoteInput && (
          <div style={{
            display: 'flex', gap: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)',
          }}>
            <input
              type="text" placeholder="Type a note for this page..."
              value={noteText} onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addNote() }}
              style={{
                flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)', padding: '4px 8px', color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', fontSize: 13,
              }}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={addNote}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowNoteInput(false)}>Cancel</button>
          </div>
        )}

        {/* PDF Canvas */}
        <div ref={containerRef} style={{
          flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          padding: 'var(--space-lg)',
          background: nightMode ? '#1a1a1a' : 'var(--bg-primary)',
        }}>
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: 'none',
              filter: nightMode ? 'invert(0.88) hue-rotate(180deg)' : 'none',
              boxShadow: 'var(--shadow-lg)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default PdfViewer
