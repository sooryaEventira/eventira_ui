import React from 'react'

export interface GridItem {
  id?: string
  image?: string | React.ReactElement
  title?: string | React.ReactElement
  text?: string | React.ReactElement
  link?: string
  linkText?: string | React.ReactElement
}

export interface GridBlockProps {
  title?: string | React.ReactElement
  itemTitleAlign?: 'left' | 'center' | 'right'
  itemTitleColor?: string
  layout?: '1' | '2x1' | '2x2' | '2x3'
  columns?: number
  items?: GridItem[]
  backgroundColor?: string
  textColor?: string
  cardBackgroundColor?: string
  cardBorderColor?: string
  linkColor?: string
  padding?: string
  gap?: string
  imageHeight?: string
  linkDisplayMode?: 'link' | 'button'
}

const GridBlock: React.FC<GridBlockProps> = ({
  title,
  itemTitleAlign = 'left',
  itemTitleColor,
  layout = '2x2',
  columns,
  items = [],
  backgroundColor = '#ffffff',
  textColor = '#1f2937',
  cardBackgroundColor = '#ffffff',
  cardBorderColor = '#e5e7eb',
  linkColor = '#3b82f6',
  padding = '4rem 2rem',
  gap = '1.5rem',
  imageHeight = '200px',
  linkDisplayMode = 'link'
}) => {
  const getStringValue = (prop: any): string => {
    if (typeof prop === 'string') return prop

    // Some Puck fields can pass ReactElements instead of strings.
    if (prop && typeof prop === 'object' && 'props' in prop && prop.props) {
      if (typeof prop.props.value === 'string') return prop.props.value
      if (typeof prop.props.defaultValue === 'string') return prop.props.defaultValue
      if (typeof prop.props.children === 'string') return prop.props.children
      if (typeof prop.props.src === 'string') return prop.props.src
    }

    return ''
  }

  const titleValue = getStringValue(title)

  const getGridClass = () => {
    // If columns is specified, use it directly
    if (columns) {
      const gridColsClass = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
        6: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6'
      }
      return gridColsClass[columns as keyof typeof gridColsClass] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    }

    // Otherwise use layout
    switch (layout) {
      case '1':
        return 'grid-cols-1'
      case '2x1':
        return 'grid-cols-1 md:grid-cols-2'
      case '2x2':
        return 'grid-cols-1 md:grid-cols-2'
      case '2x3':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      default:
        return 'grid-cols-1 md:grid-cols-2'
    }
  }

  const defaultItems: GridItem[] = [
    {
      id: '1',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
      title: 'The Design',
      text: 'CSS frameworks like Tailwind allow for rapid prototyping without leaving your HTML file.',
      linkText: 'Visit Tailwind',
      link: '#'
    },
    {
      id: '2',
      image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=600&fit=crop',
      title: 'Modern Development',
      text: 'Build responsive layouts quickly with modern CSS utilities and component libraries.',
      linkText: 'Learn More',
      link: '#'
    },
    {
      id: '3',
      image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop',
      title: 'Creative Solutions',
      text: 'Discover innovative approaches to building user interfaces that are both beautiful and functional.',
      linkText: 'Explore More',
      link: '#'
    },
    {
      id: '4',
      image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=600&fit=crop',
      title: 'Best Practices',
      text: 'Learn from industry experts about modern web development techniques and design patterns.',
      linkText: 'Read Article',
      link: '#'
    }
  ]

  const displayItems = items.length > 0 ? items : defaultItems

  return (
    <section
      className="w-full"
      style={{
        backgroundColor,
        padding
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        {titleValue && (
          <h2
            className="text-3xl md:text-4xl font-bold mb-8 text-center"
            style={{ color: textColor }}
          >
            {title}
          </h2>
        )}

        {/* Grid */}
        <div
          className={`grid ${getGridClass()} gap-6`}
          style={{ gap }}
        >
          {displayItems.map((item, idx) => {
            const imageValue = getStringValue(item.image)
            const titleValue = getStringValue(item.title)
            const textValue = getStringValue(item.text)
            const linkTextValue = getStringValue(item.linkText)

            return (
              <div
                key={item.id || `grid-item-${idx}`}
                className="rounded-xl overflow-hidden border transition-shadow hover:shadow-lg"
                style={{
                  backgroundColor: cardBackgroundColor,
                  borderColor: cardBorderColor,
                }}
              >
                {/* Image */}
                {imageValue && (
                  <div
                    className="w-full overflow-hidden bg-gray-100"
                    style={{ height: imageHeight }}
                  >
                    <img
                      src={imageValue}
                      alt={titleValue || 'Grid item'}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  {/* Title */}
                  {titleValue && (
                    <h3
                      className="text-xl font-bold mb-3"
                      style={{ color: itemTitleColor || textColor, textAlign: itemTitleAlign }}
                    >
                      {item.title}
                    </h3>
                  )}

                  {/* Text */}
                  {textValue && (
                    <p
                      className="text-base leading-relaxed mb-4 opacity-80"
                      style={{ color: textColor }}
                    >
                      {item.text}
                    </p>
                  )}

                  {/* Link/Button */}
                  {item.link && linkTextValue && (
                    linkDisplayMode === 'button' ? (
                      <button
                        className="inline-flex items-center gap-2 px-4 py-2 rounded font-semibold transition-opacity hover:opacity-80"
                        style={{ 
                          backgroundColor: linkColor,
                          color: '#ffffff'
                        }}
                        onClick={() => {
                          window.location.href = item.link || '#'
                        }}
                      >
                        {item.linkText}
                      </button>
                    ) : (
                      <a
                        href={item.link}
                        className="inline-flex items-center gap-2 font-semibold transition-opacity hover:opacity-80"
                        style={{ color: linkColor }}
                      >
                        {item.linkText}
                        <span>→</span>
                      </a>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  )
}

export default GridBlock

