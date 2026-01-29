import React from 'react'

interface Sponsor {
  id: string
  name: string | React.ReactElement
  title?: string | React.ReactElement
  titleColor?: string
  titleSize?: 1 | 2 | 3
  logo?: string
  logoUrl?: string
  link?: string
}

interface SponsorsProps {
  title?: string | React.ReactElement
  titleColor?: string
  titleSize?: 1 | 2 | 3
  subtitle?: string | React.ReactElement
  subtitleColor?: string
  subtitleSize?: 1 | 2 | 3
  sponsors?: Sponsor[]
  backgroundColor?: string
  textColor?: string
  padding?: string
}

const Sponsors: React.FC<SponsorsProps> = ({
  title = "Our Sponsors",
  titleColor,
  titleSize = 2,
  subtitle = "",
  subtitleColor,
  subtitleSize = 1,
  sponsors = [
    { id: '1', name: 'Sponsor 1', logoUrl: '' },
    { id: '2', name: 'Sponsor 2', logoUrl: '' },
    { id: '3', name: 'Sponsor 3', logoUrl: '' },
    { id: '4', name: 'Sponsor 4', logoUrl: '' }
  ],
  backgroundColor = "#ffffff",
  textColor = "#1f2937",
  padding = "3rem 2rem"
}) => {
  const getStringValue = (prop: any): string => {
    if (typeof prop === 'string') return prop
    if (prop && typeof prop === 'object' && 'props' in prop && prop.props) {
      if (typeof prop.props.value === 'string') return prop.props.value
      if (typeof prop.props.defaultValue === 'string') return prop.props.defaultValue
      if (typeof prop.props.children === 'string') return prop.props.children
    }
    return ''
  }

  const containerStyle: React.CSSProperties = {
    backgroundColor,
    padding
  }

  const titleValue = getStringValue(title)
  const subtitleValue = getStringValue(subtitle)

  const titleSizeClass =
    titleSize === 1 ? 'text-xl md:text-2xl' : titleSize === 3 ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'

  const subtitleSizeClass =
    subtitleSize === 1 ? 'text-sm md:text-base' : subtitleSize === 3 ? 'text-lg md:text-xl' : 'text-base md:text-lg'

  // Default placeholder logos (matching the image description)
  const getDefaultLogo = (index: number) => {
    const logos = [
      // Gray hexagon with O
      <div key="1" className="w-32 h-32 bg-slate-700 rounded-lg flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-400 rounded-full"></div>
      </div>,
      // Red square with E
      <div key="2" className="w-32 h-32 bg-red-600 rounded-lg flex items-center justify-center">
        <div className="text-white text-4xl font-bold">E</div>
      </div>,
      // Blue square with FR
      <div key="3" className="w-32 h-32 bg-blue-600 rounded-lg flex items-center justify-center">
        <div className="text-white text-2xl font-bold">FR</div>
      </div>,
      // Green square with Z
      <div key="4" className="w-32 h-32 bg-green-600 rounded-lg flex items-center justify-center">
        <div className="text-white text-4xl font-bold">Z</div>
      </div>
    ]
    return logos[index % logos.length]
  }

  return (
    <section style={containerStyle} className="w-full">
      <div className="max-w-7xl mx-auto">
        {titleValue && (
          <div className="text-center">
            <h2 className={`${titleSizeClass} font-bold`} style={{ color: titleColor || textColor }}>
              {title}
            </h2>
            {subtitleValue ? (
              <p className={`${subtitleSizeClass} mt-2`} style={{ color: subtitleColor || textColor }}>
                {subtitle}
              </p>
            ) : null}
            <div className="h-8" />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
          {sponsors.map((sponsor, index) => {
            const sponsorNameValue = getStringValue(sponsor.name)
            const sponsorTitleValue = getStringValue(sponsor.title) || sponsorNameValue
            const sponsorTitleSize = sponsor.titleSize || 1
            const sponsorTitleSizeClass =
              sponsorTitleSize === 1 ? 'text-sm' : sponsorTitleSize === 3 ? 'text-lg' : 'text-base'
            const SponsorContent = () => (
              <div className="flex flex-col items-center justify-center text-center">
                {sponsor.logoUrl || sponsor.logo ? (
                  <img
                    src={sponsor.logoUrl || sponsor.logo}
                    alt={sponsorTitleValue || 'Sponsor logo'}
                    className="max-w-full max-h-32 object-contain"
                    onError={(e) => {
                      // Hide image and show placeholder instead
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                ) : null}
                {(!sponsor.logoUrl && !sponsor.logo) && getDefaultLogo(index)}

                {sponsorTitleValue ? (
                  <div
                    className={`mt-3 font-medium ${sponsorTitleSizeClass}`}
                    style={{ color: sponsor.titleColor || textColor }}
                  >
                    {sponsor.title || sponsor.name}
                  </div>
                ) : null}
              </div>
            )

            if (sponsor.link) {
              return (
                <a
                  key={sponsor.id}
                  href={sponsor.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center transition-opacity hover:opacity-80 cursor-pointer"
                >
                  <SponsorContent />
                </a>
              )
            }

            return (
              <div key={sponsor.id} className="flex items-center justify-center">
                <SponsorContent />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Sponsors

