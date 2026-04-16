import React, { useEffect, useMemo, useState } from 'react'
import { Trash03, ChevronDown, ChevronUp, Edit03 } from '@untitled-ui/icons-react'
import { UploadModal, TextEditorModal } from '../ui'
import { fetchAllFolders, fetchFiles, uploadFile, type FileData } from '../../services/resourceService'

type ArticleSectionType = 'heading' | 'paragraph' | 'image' | 'links'

type ArticleLink = {
  id?: string
  label: string
  url: string
  openInNewTab: boolean
  openInMobileApp: boolean
}

type ArticleSection = {
  id?: string
  type: ArticleSectionType
  align?: 'left' | 'center' | 'right'
  heading?: string
  headingColor?: string
  headingAlign?: 'left' | 'center' | 'right'
  headingSize?: string
  paragraph?: string
  paragraphColor?: string
  imageUrl?: string
  imageHeight?: string
  imageText?: string
  imageTextPosition?: 'none' | 'left' | 'right' | 'below'
  imageTextColor?: string
  links?: ArticleLink[]
  linkDisplayStyle?: 'list' | 'buttons'
  linkColor?: string
  buttonColor?: string
  buttonTextColor?: string
}

interface ArticleSectionsFieldProps {
  value?: ArticleSection[]
  onChange?: (value: ArticleSection[]) => void
}

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const ArticleSectionsField: React.FC<ArticleSectionsFieldProps> = ({ value = [], onChange }) => {
  const sections = Array.isArray(value) ? value : []

  const setSections = (next: ArticleSection[]) => onChange?.(next)

  const patchSection = (index: number, patch: Partial<ArticleSection>) => {
    setSections(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index))
  }

  const moveSection = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= sections.length) return
    if (toIndex < 0 || toIndex >= sections.length) return
    const next = [...sections]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setSections(next)
  }

  const [imagePickerIndex, setImagePickerIndex] = useState<number | null>(null)
  const [uploadIndex, setUploadIndex] = useState<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(() => new Set())

  
  // Text editor modal state
  const [textEditorOpen, setTextEditorOpen] = useState(false)
  const [textEditorKey, setTextEditorKey] = useState<string | null>(null)
  const [textEditorValue, setTextEditorValue] = useState('')

  const getSectionKey = (section: ArticleSection, index: number) => section.id || `idx-${index}`

  const addSection = (type: ArticleSectionType) => {
    const base: ArticleSection = { id: makeId(type), type, align: 'left' }

    let next: ArticleSection
    switch (type) {
      case 'heading':
        next = {
          ...base,
          heading: 'New heading',
          headingSize: '1.25rem',
          headingAlign: 'left',
          headingColor: '#111827',
        }
        break
      case 'paragraph':
        next = {
          ...base,
          paragraph: 'New paragraph...',
          paragraphColor: '#111827',
        }
        break
      case 'image':
        next = {
          ...base,
          imageUrl: '',
          imageHeight: '400px',
          imageText: '',
          imageTextPosition: 'none',
          imageTextColor: '#111827',
        }
        break
      case 'links':
      default:
        next = {
          ...base,
          linkDisplayStyle: 'list',
          linkColor: '#3b82f6',
          buttonColor: '#3b82f6',
          buttonTextColor: '#ffffff',
          links: [{ id: makeId('link'), label: 'Learn more', url: '#', openInNewTab: false, openInMobileApp: false }],
        }
        break
    }

    setSections([...sections, next])
  }

  const typeLabel = (type: ArticleSectionType) => {
    switch (type) {
      case 'heading':
        return 'Heading'
      case 'paragraph':
        return 'Paragraph'
      case 'image':
        return 'Image'
      case 'links':
        return 'Links'
      default:
        return 'Section'
    }
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Quick add */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => addSection('heading')} style={btnStyle}>
          + Heading
        </button>
        <button type="button" onClick={() => addSection('paragraph')} style={btnStyle}>
          + Paragraph
        </button>
        <button type="button" onClick={() => addSection('image')} style={btnStyle}>
          + Image
        </button>
        <button type="button" onClick={() => addSection('links')} style={btnStyle}>
          + Links
        </button>
      </div>

      {sections.length === 0 ? (
        <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>No sections yet. Add a section above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sections.map((section, index) => (
            (() => {
              const sectionKey = getSectionKey(section, index)
              const isExpanded = expandedSectionIds.has(sectionKey)

              return (
            <div
              key={section.id || `${section.type}-${index}`}
              style={{
                ...cardStyle,
                backgroundColor: dragOverIndex === index ? '#f5f3ff' : '#ffffff',
                borderColor: dragOverIndex === index ? '#c4b5fd' : '#e5e7eb'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragOverIndex !== index) setDragOverIndex(index)
              }}
              onDragLeave={() => setDragOverIndex((prev) => (prev === index ? null : prev))}
              onDrop={(e) => {
                e.preventDefault()
                if (draggingIndex === null) return
                moveSection(draggingIndex, index)
                setDraggingIndex(null)
                setDragOverIndex(null)
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                    draggable
                    onDragStart={(e) => {
                      setDraggingIndex(index)
                      try {
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', String(index))
                      } catch {
                        // ignore
                      }
                    }}
                    onDragEnd={() => {
                      setDraggingIndex(null)
                      setDragOverIndex(null)
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      cursor: 'grab',
                      userSelect: 'none'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M7 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
                    </svg>
                  </span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{typeLabel(section.type)}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
<button
  type="button"
  onClick={() => {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev)
      if (next.has(sectionKey)) next.delete(sectionKey)
      else next.add(sectionKey)
      return next
    })
  }}
  aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
  title={isExpanded ? 'Collapse' : 'Expand'}
  style={{
    width: 32,
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    cursor: 'pointer',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff'
  }}
>
  {isExpanded ? (
    <ChevronUp className="h-4 w-4" strokeWidth={1.8} />
  ) : (
    <ChevronDown className="h-4 w-4" strokeWidth={1.8} />
  )}
</button>

                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    aria-label="Delete section"
                    title="Delete section"
                    style={iconDangerBtnStyle}
                  >
                    <Trash03 className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              {!isExpanded  ?(
                <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
                  {section.links?.length} {section.links?.length === 1 ? '' : ''}
               </div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  {renderSectionEditor({
                    section,
                    index,
                    patchSection,
                    openImagePicker: () => setImagePickerIndex(index),
                    openUpload: () => setUploadIndex(index),
                    openTextEditor: (field: 'paragraph' | 'imageText', value: string) => {
                      setTextEditorKey(`${field}-${index}`)
                      setTextEditorValue(value)
                      setTextEditorOpen(true)
                    }
                  })}
                </div>
              )}
            </div>
              )
            })()
          ))}
        </div>
      )}

      <ImagePickerModal
        isOpen={imagePickerIndex !== null}
        onClose={() => setImagePickerIndex(null)}
        onSelect={(url) => {
          if (imagePickerIndex === null) return
          patchSection(imagePickerIndex, { imageUrl: url })
          setImagePickerIndex(null)
        }}
      />

      <UploadModal
        isOpen={uploadIndex !== null}
        onClose={() => setUploadIndex(null)}
        onUpload={async (files) => {
          if (uploadIndex === null) return
          const eventUuid = localStorage.getItem('currentEventUuid') || ''
          if (!eventUuid) {
            alert('Event UUID not found. Please open the editor from an event context first.')
            return
          }
          if (!files || files.length === 0) return

          const file = files[0]
          const uploaded = await uploadFile({ file, event_uuid: eventUuid, parent: null })
          patchSection(uploadIndex, { imageUrl: uploaded.file })
          setUploadIndex(null)
        }}
        title="Upload image"
        description="Upload an image to Resource Manager and attach it."
        uploadText="Click to upload or drag and drop"
        accept="image/*"
        multiple={false}
        showTemplate={false}
        buttonText="Attach image"
        cancelButtonText="Cancel"
        instructions={['PNG, JPG, SVG, or GIF']}
      />

      <TextEditorModal
        isOpen={textEditorOpen}
        onClose={() => {
          setTextEditorOpen(false)
          setTextEditorKey(null)
        }}
        onSave={(value) => {
          if (!textEditorKey) return
          const [field, indexStr] = textEditorKey.split('-')
          const sectionIndex = parseInt(indexStr, 10)
          if (field === 'paragraph') {
            patchSection(sectionIndex, { paragraph: value })
          } else if (field === 'imageText') {
            patchSection(sectionIndex, { imageText: value })
          }
        }}
        initialValue={textEditorValue}
        title={textEditorKey?.startsWith('paragraph') ? 'Edit Paragraph Text' : 'Edit Image Text'}
        placeholder="Type or paste text here..."
      />
    </div>
  )
}

const Field: React.FC<{ label: string; children: React.ReactNode; compact?: boolean }> = ({ label, children, compact }) => (
  <div>
    <div style={{ fontSize: compact ? 12 : 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{label}</div>
    {children}
  </div>
)

const cardStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 12,
  backgroundColor: '#ffffff'
}

const subCardStyle: React.CSSProperties = {
  border: '1px solid #eef2f7',
  borderRadius: 10,
  padding: 10,
  backgroundColor: '#f9fafb'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 14,
  border: '1px solid #d1d5db',
  borderRadius: 8,
  backgroundColor: '#ffffff',
  color: '#111827',
  outline: 'none'
}

const btnStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 8,
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  color: '#111827',
  cursor: 'pointer'
}

const iconDangerBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#b91c1c',
  cursor: 'pointer'
}

export default ArticleSectionsField

const isHexColor = (value: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
const toHex6 = (value: string) => {
  const v = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1]
    const g = v[2]
    const b = v[3]
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return '#000000'
}

const ColorField: React.FC<{ label: string; value?: string; onChange: (next: string) => void }> = ({ label, value = '#111827', onChange }) => {
  const safeText = value || '#111827'
  const safeSwatch = isHexColor(safeText) ? toHex6(safeText) : '#000000'
  return (
    <Field label={label}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input value={safeText} onChange={(e) => onChange(e.target.value)} placeholder="#111827" style={inputStyle} />
        <input
          type="color"
          value={safeSwatch}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 44,
            height: 38,
            border: '1px solid #d1d5db',
            borderRadius: 8,
            backgroundColor: '#ffffff',
            padding: 2,
            cursor: 'pointer',
            flexShrink: 0
          }}
          aria-label={`${label} color picker`}
        />
      </div>
    </Field>
  )
}

function renderSectionEditor(args: {
  section: ArticleSection
  index: number
  patchSection: (index: number, patch: Partial<ArticleSection>) => void
  openImagePicker: () => void
  openUpload: () => void
  openTextEditor: (field: 'paragraph' | 'imageText', value: string) => void
}) {
  const { section, index, patchSection, openImagePicker, openUpload, openTextEditor } = args
  const alignValue =
    (section.align as any) || (section.headingAlign as any) || ('left' as const)
  const setAlign = (next: 'left' | 'center' | 'right') => {
    const patch: Partial<ArticleSection> = { align: next }
    if (section.type === 'heading') patch.headingAlign = next
    patchSection(index, patch)
  }

  switch (section.type) {
    case 'paragraph':
      return (
        <>
          <Field label="Alignment">
            <select value={alignValue} onChange={(e) => setAlign(e.target.value as any)} style={inputStyle}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <div style={{ height: 10 }} />
          <Field label="Paragraph Text (supports HTML paste for bold/italic)">
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <textarea
                  value={section.paragraph || ''}
                  onChange={(e) => patchSection(index, { paragraph: e.target.value })}
                  onPaste={(e) => {
                    const html = e.clipboardData?.getData('text/html')
                    if (!html) return
                    e.preventDefault()
                    try {
                      const doc = new DOMParser().parseFromString(html, 'text/html')
                      const bodyHtml = (doc.body?.innerHTML || '').trim()
                      const target = e.currentTarget
                      const start = target.selectionStart ?? (section.paragraph || '').length
                      const end = target.selectionEnd ?? start
                      const current = section.paragraph || ''
                      const next = current.slice(0, start) + bodyHtml + current.slice(end)
                      patchSection(index, { paragraph: next })
                    } catch {
                      // Fallback to plain paste
                    }
                  }}
                  placeholder="Type text or paste rich text (bold/italic) here..."
                  style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }}
                />
              </div>
              <button
                type="button"
                onClick={() => openTextEditor('paragraph', section.paragraph || '')}
                title="Open text editor in modal"
                style={{
                  width: 40,
                  height: 40,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  cursor: 'pointer',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                  e.currentTarget.style.borderColor = '#d1d5db'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }}
              >
                <Edit03 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          </Field>
          <div style={{ height: 10 }} />
          {/* <ColorField label="Paragraph Color (hex)" value={section.paragraphColor || '#111827'} onChange={(v) => patchSection(index, { paragraphColor: v })} /> */}
        </>
      )

    case 'image':
      return (
        <>
          <Field label="Alignment">
            <select value={alignValue} onChange={(e) => setAlign(e.target.value as any)} style={inputStyle}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <div style={{ height: 10 }} />
          <Field label="Image (Resource Manager URL or direct link)">
            <input
              value={section.imageUrl || ''}
              onChange={(e) => patchSection(index, { imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
              style={inputStyle}
            />
          </Field>
          <div style={{ height: 10 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={openImagePicker} style={btnStyle}>
              Choose from Resource Manager
            </button>
            <button type="button" onClick={openUpload} style={btnStyle}>
              Upload image
            </button>
          </div>
          <div style={{ height: 10 }} />
          <Field label="Image Height">
            <input
              value={section.imageHeight || ''}
              onChange={(e) => patchSection(index, { imageHeight: e.target.value })}
              placeholder="400px"
              style={inputStyle}
            />
          </Field>
          <div style={{ height: 10 }} />
          <Field label="Text Position">
            <select
              value={section.imageTextPosition || 'none'}
              onChange={(e) => patchSection(index, { imageTextPosition: e.target.value as 'none' | 'left' | 'right' | 'below' })}
              style={inputStyle}
            >
              <option value="none">No text</option>
              <option value="left">Text on left</option>
              <option value="right">Text on right</option>
              <option value="below">Text below image</option>
            </select>
          </Field>
          {section.imageTextPosition && section.imageTextPosition !== 'none' && (
            <>
              <div style={{ height: 10 }} />
              <Field label="Paragraph Text (around image)">
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <textarea
                      value={section.imageText || ''}
                      onChange={(e) => patchSection(index, { imageText: e.target.value })}
                      onPaste={(e) => {
                        const html = e.clipboardData?.getData('text/html')
                        if (!html) return
                        e.preventDefault()
                        try {
                          const doc = new DOMParser().parseFromString(html, 'text/html')
                          const bodyHtml = (doc.body?.innerHTML || '').trim()
                          const target = e.currentTarget
                          const start = target.selectionStart ?? (section.imageText || '').length
                          const end = target.selectionEnd ?? start
                          const current = section.imageText || ''
                          const next = current.slice(0, start) + bodyHtml + current.slice(end)
                          patchSection(index, { imageText: next })
                        } catch {
                          // Fallback to plain paste
                        }
                      }}
                      placeholder="Type text to display around the image..."
                      style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => openTextEditor('imageText', section.imageText || '')}
                    title="Open text editor in modal"
                    style={{
                      width: 40,
                      height: 40,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      cursor: 'pointer',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#ffffff',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6'
                      e.currentTarget.style.borderColor = '#d1d5db'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                    }}
                  >
                    <Edit03 className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                </div>
              </Field>
              <div style={{ height: 10 }} />
              <ColorField label="Text Color (hex)" value={section.imageTextColor || '#111827'} onChange={(v) => patchSection(index, { imageTextColor: v })} />
            </>
          )}
        </>
      )

    case 'heading':
      return (
        <>
          <Field label="Alignment">
            <select value={alignValue} onChange={(e) => setAlign(e.target.value as any)} style={inputStyle}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <div style={{ height: 10 }} />
          <Field label="Heading Text">
            <input
              value={section.heading || ''}
              onChange={(e) => patchSection(index, { heading: e.target.value })}
              placeholder="Enter heading..."
              style={inputStyle}
            />
          </Field>
          <div style={{ height: 10 }} />
          <ColorField label="Heading Color (hex)" value={section.headingColor || '#111827'} onChange={(v) => patchSection(index, { headingColor: v })} />
          <div style={{ height: 10 }} />
          <Field label="Heading Size">
            <select
              value={section.headingSize || '1.25rem'}
              onChange={(e) => patchSection(index, { headingSize: e.target.value })}
              style={inputStyle}
            >
              <option value="2rem">Small</option>
              <option value="2.5rem">Medium</option>
              <option value="3rem">Large</option>
              <option value="3.5rem">Extra Large</option>
            </select>
          </Field>
        </>
      )

    case 'links':
      return (
        <>
          <Field label="Alignment">
            <select value={alignValue} onChange={(e) => setAlign(e.target.value as any)} style={inputStyle}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <div style={{ height: 10 }} />
          <Field label="Link Display Style">
            <select
              value={section.linkDisplayStyle || 'list'}
              onChange={(e) => patchSection(index, { linkDisplayStyle: e.target.value as 'list' | 'buttons' })}
              style={inputStyle}
            >
              <option value="list">Vertical List</option>
              <option value="buttons">Inline Buttons</option>
            </select>
          </Field>
          <div style={{ height: 10 }} />

          {(section.linkDisplayStyle || 'list') === 'list' ? (
            <ColorField label="Link Color (hex)" value={section.linkColor || '#3b82f6'} onChange={(v) => patchSection(index, { linkColor: v })} />
          ) : (
            <>
              <ColorField label="Button Color (hex)" value={section.buttonColor || '#3b82f6'} onChange={(v) => patchSection(index, { buttonColor: v })} />
              <div style={{ height: 10 }} />
              <ColorField label="Button Text Color (hex)" value={section.buttonTextColor || '#ffffff'} onChange={(v) => patchSection(index, { buttonTextColor: v })} />
            </>
          )}

          <div style={{ height: 10 }} />
          <Field label="Links">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(section.links || []).map((link, linkIndex) => (
                <div key={link.id || `link-${linkIndex}`} style={subCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>Link</div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextLinks = (section.links || []).filter((_, i) => i !== linkIndex)
                        patchSection(index, { links: nextLinks })
                      }}
                      aria-label="Delete link"
                      title="Delete link"
                      style={iconDangerBtnStyle}
                    >
                      <Trash03 className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <Field label="Label" compact>
                      <input
                        value={link.label || ''}
                        onChange={(e) => {
                          const nextLinks = (section.links || []).map((l, i) => (i === linkIndex ? { ...l, label: e.target.value } : l))
                          patchSection(index, { links: nextLinks })
                        }}
                        placeholder="Learn More"
                        style={inputStyle}
                      />
                    </Field>
                    <div style={{ height: 8 }} />
                    <Field label="URL" compact>
                      <input
                        value={link.url || ''}
                        onChange={(e) => {
                          const nextLinks = (section.links || []).map((l, i) => (i === linkIndex ? { ...l, url: e.target.value } : l))
                          patchSection(index, { links: nextLinks })
                        }}
                        placeholder="https://example.com or /page-path"
                        style={inputStyle}
                      />
                    </Field>
                    <div style={{ height: 8 }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151' }}>
                      <input
                        type="checkbox"
                        checked={!!link.openInNewTab}
                        onChange={(e) => {
                          const nextLinks = (section.links || []).map((l, i) => (i === linkIndex ? { ...l, openInNewTab: e.target.checked } : l))
                          patchSection(index, { links: nextLinks })
                        }}
                      />
                      Open in new tab
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151' }}>
                      <input
                        type="checkbox"
                        checked={!!link.openInMobileApp}
                        onChange={(e) => {
                          const nextLinks = (section.links || []).map((l, i) => (i === linkIndex ? { ...l, openInMobileApp: e.target.checked } : l))
                          patchSection(index, { links: nextLinks })
                        }}
                      />
                      Open in mobile app
                    </label>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const nextLinks = [...(section.links || []), { id: makeId('link'), label: 'New link', url: '#', openInNewTab: false, openInMobileApp: false }]
                  patchSection(index, { links: nextLinks })
                }}
                style={btnStyle}
              >
                + Add link
              </button>
            </div>
          </Field>
        </>
      )

    default:
      return null
  }
}

const isImageFile = (file: FileData) => {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (file.content_type?.startsWith('image/')) return true
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
}

const ImagePickerModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string) => void
}> = ({ isOpen, onClose, onSelect }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<FileData[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      try {
        const eventUuid = localStorage.getItem('currentEventUuid') || ''
        const folders = eventUuid ? await fetchAllFolders(eventUuid) : []
        const folderIds: Array<string | null | undefined> = [null, ...folders.map((f) => f.uuid)]

        const results = await Promise.allSettled(folderIds.map((id) => fetchFiles(id)))
        const merged = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))

        const byId = new Map<string, FileData>()
        for (const f of merged) byId.set(f.uuid, f)
        const deduped = Array.from(byId.values()).filter(isImageFile)

        if (!cancelled) setFiles(deduped)
      } catch {
        if (!cancelled) setFiles([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return files
    return files.filter((f) => (f.name || '').toLowerCase().includes(q))
  }, [files, query])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div style={{ width: 'min(900px, 100%)', maxHeight: '80vh', overflow: 'auto', background: '#fff', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Choose an image from Resource Manager</div>
          <button type="button" onClick={onClose} style={btnStyle}>
            Close
          </button>
        </div>

        <div style={{ height: 10 }} />

        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search images…" style={inputStyle} />

        <div style={{ height: 12 }} />

        {isLoading ? (
          <div style={{ fontSize: 12, color: '#6b7280' }}>Loading images…</div>
        ) : filtered.length === 0 ? (
          <div style={{ fontSize: 12, color: '#6b7280' }}>No images found.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {filtered.map((f) => (
              <button
                key={f.uuid}
                type="button"
                onClick={() => onSelect(f.file)}
                style={{
                  textAlign: 'left',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  background: '#fff',
                  padding: 10,
                  cursor: 'pointer'
                }}
              >
                <div style={{ width: '100%', aspectRatio: '16/10', borderRadius: 8, overflow: 'hidden', background: '#f3f4f6' }}>
                  <img src={f.file} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {f.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
