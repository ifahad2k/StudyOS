import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Moon, Sun, BookOpen, Bookmark, MessageSquare, X, FolderOpen, Maximize2, Minimize2 } from 'lucide-react'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const pageCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const pendingScrollPageRef = useRef<number>(1)

  const scrollToPage = useCallback((pageNum: number, smooth = true) => {
    const container = containerRef.current
    if (!container) return

    const target = container.querySelector<HTMLElement>(`[data-page=\"${pageNum}\"]`)
    if (!target) return

    const top = target.offsetTop - 12
    container.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const goToPage = useCallback((pageNum: number) => {
    const clamped = Math.min(Math.max(1, pageNum), totalPages || 1)
    setCurrentPage(clamped)
    scrollToPage(clamped)
  }, [scrollToPage, totalPages])

  const openFile = async () => {
    const path = await window.electronAPI?.pdf.openDialog()
    if (!path) return

    const result = await window.electronAPI?.pdf.open({ filePath: path })
    if (!result) return

    setFilePath(result.filePath)
    setFileHash(result.hash)
    setFileName(result.fileName)

    const savedPage = result.savedState?.last_page || 1
    pendingScrollPageRef.current = savedPage
    setCurrentPage(savedPage)
    setZoom(result.savedState?.zoom_level || 100)
    setSidebarOpen(result.savedState?.sidebar_open !== false)

    loadPdf(result.filePath)
    loadAnnotations(result.hash)
  }

  const loadPdf = async (path: string) => {
    try {
      if (typeof pdfjsLib === 'undefined') {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        script.onload = () => {
          ;(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
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

  const renderAllPages = useCallback(async () => {
    if (!pdfDoc) return

    try {
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum += 1) {
        const canvas = pageCanvasRefs.current.get(pageNum)
        if (!canvas) continue

        const page = await pdfDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale: (zoom / 100) * 1.5 })
        const ctx = canvas.getContext('2d')
        if (!ctx) continue

        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        canvas.style.width = `${Math.ceil(viewport.width)}px`
        canvas.style.height = `${Math.ceil(viewport.height)}px`

        await page.render({ canvasContext: ctx, viewport }).promise
      }

      requestAnimationFrame(() => {
        scrollToPage(pendingScrollPageRef.current, false)
      })
    } catch (err) {
      console.error('Render error:', err)
    }
  }, [pdfDoc, zoom, scrollToPage])

  useEffect(() => {
    if (!pdfDoc) return
    renderAllPages()
  }, [pdfDoc, zoom, renderAllPages])

  useEffect(() => {
    if (!fileHash) return

    window.electronAPI?.pdf.saveState({
      filePathHash: fileHash,
      page: currentPage,
      zoom,
      sidebarOpen,
    })
  }, [currentPage, zoom, sidebarOpen, fileHash])

  useEffect(() => {
    const container = containerRef.current
    if (!container || totalPages < 1) return

    let frame = 0
    const updateCurrentPageFromScroll = () => {
      const pageNodes = Array.from(container.querySelectorAll<HTMLElement>('[data-page]'))
      if (pageNodes.length === 0) return

      const containerTop = container.getBoundingClientRect().top
      const threshold = containerTop + container.clientHeight * 0.35
      let detectedPage = 1

      for (const node of pageNodes) {
        const nodeTop = node.getBoundingClientRect().top
        if (nodeTop <= threshold) {
          detectedPage = Number(node.dataset.page || '1')
        } else {
          break
        }
      }

      setCurrentPage((prev) => (prev === detectedPage ? prev : detectedPage))
    }

    const onScroll = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(updateCurrentPageFromScroll)
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    updateCurrentPageFromScroll()

    return () => {
      container.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [totalPages])

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

  const prevPage = () => goToPage(currentPage - 1)
  const nextPage = () => goToPage(currentPage + 1)
  const zoomIn = () => setZoom((z) => Math.min(300, z + 15))
  const zoomOut = () => setZoom((z) => Math.max(50, z - 15))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const container = containerRef.current
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
        case ' ': {
          e.preventDefault()
          container?.scrollBy({ top: 160, behavior: 'smooth' })
          break
        }
        case 'k':
        case 'ArrowUp': {
          e.preventDefault()
          container?.scrollBy({ top: -160, behavior: 'smooth' })
          break
        }
        case 'b':
          setSidebarOpen((s) => !s)
          break
        case 'n':
          setNightMode((n) => !n)
          break
        case '+':
        case '=':
          if (e.ctrlKey) {
            e.preventDefault()
            zoomIn()
          }
          break
        case '-':
          if (e.ctrlKey) {
            e.preventDefault()
            zoomOut()
          }
          break
        case 'd':
          if (e.ctrlKey) {
            e.preventDefault()
            addBookmark()
          }
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [addBookmark])

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
          PDF
        </div>
        <h2>PDF Reader</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', maxWidth: 400 }}>
          Continuous scrolling PDF reader.
          <br />Reading state and annotations are saved automatically.
        </p>
        <button className="btn btn-primary btn-lg" onClick={openFile}>
          <FolderOpen size={18} /> Open PDF File
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', marginTop: -16, marginLeft: -32, marginRight: -32 }}>
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
                }} onClick={() => goToPage(ann.page_number)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {ann.type === 'bookmark' ? 'Bookmark' : 'Note'} - Page {ann.page_number}
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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

        <div ref={containerRef} style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-lg)',
          padding: 'var(--space-lg)',
          background: nightMode ? '#1a1a1a' : 'var(--bg-primary)',
        }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div key={pageNum} data-page={pageNum} style={{ width: 'fit-content' }}>
              <canvas
                ref={(el) => {
                  if (!el) {
                    pageCanvasRefs.current.delete(pageNum)
                    return
                  }
                  pageCanvasRefs.current.set(pageNum, el)
                }}
                style={{
                  maxWidth: 'none',
                  filter: nightMode ? 'invert(0.88) hue-rotate(180deg)' : 'none',
                  boxShadow: 'var(--shadow-lg)',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PdfViewer
