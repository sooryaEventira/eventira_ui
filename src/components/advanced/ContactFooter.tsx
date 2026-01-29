import React from 'react'
import { Mail01, Building01, Phone01 } from '@untitled-ui/icons-react'

interface ContactItem {
  id: string
  type: 'email' | 'office' | 'phone'
  title: string
  description: string
  actionText: string
  actionUrl?: string
  actionEmail?: string
  actionPhone?: string
}

interface ContactFooterProps {
  title?: string
  items?: ContactItem[]
  backgroundColor?: string
  textColor?: string
  iconColor?: string
  buttonColor?: string
  padding?: string
  copyrightText?: string
}

const ContactFooter: React.FC<ContactFooterProps> = ({
  title,
  items = [
    {
      id: '1',
      type: 'email',
      title: 'Email',
      description: "Our friendly team is here to help.",
      actionText: 'Send us an email',
      actionEmail: 'contact@example.com'
    },
    {
      id: '2',
      type: 'office',
      title: 'Office',
      description: 'Come and say hello at our office HQ.',
      actionText: 'View on map',
      actionUrl: '#'
    },
    {
      id: '3',
      type: 'phone',
      title: 'Phone',
      description: 'Mon-Fri from 8am to 5pm.',
      actionText: 'Call us now',
      actionPhone: '+1 (555) 000-0000'
    }
  ],
  backgroundColor = "#ffffff",
  textColor = "#1f2937",
  iconColor = "#6938EF",
  buttonColor = "#6938EF",
  padding = "3rem 2rem",
  copyrightText = "Copyright © 2024"
}) => {
  const containerStyle: React.CSSProperties = {
    backgroundColor,
    color: textColor,
    padding
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail01 className="h-6 w-6" style={{ color: iconColor }} />
      case 'office':
        return <Building01 className="h-6 w-6" style={{ color: iconColor }} />
      case 'phone':
        return <Phone01 className="h-6 w-6" style={{ color: iconColor }} />
      default:
        return null
    }
  }

  const handleActionClick = (item: ContactItem) => {
    if (item.actionEmail) {
      window.location.href = `mailto:${item.actionEmail}`
    } else if (item.actionPhone) {
      window.location.href = `tel:${item.actionPhone}`
    } else if (item.actionUrl) {
      window.location.href = item.actionUrl
    }
  }

  return (
    <footer style={containerStyle} className="w-full">
      <div className="max-w-7xl mx-auto">
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center" style={{ color: textColor }}>
            {title}
          </h2>
        )}
        <div
          className="grid gap-8 mb-8 justify-items-center"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
        >
          {items.map((item) => (
            <div key={item.id} className="flex w-full max-w-sm flex-col items-center text-center">
              <div className="mb-4">
                {getIcon(item.type)}
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: textColor }}>
                {item.title}
              </h3>
              <p className="text-sm mb-4 opacity-80" style={{ color: textColor }}>
                {item.description}
              </p>
              <button
                onClick={() => handleActionClick(item)}
                style={{ color: buttonColor }}
                className="text-sm font-medium hover:opacity-80 transition-opacity underline"
              >
                {item.actionText}
              </button>
            </div>
          ))}
        </div>
        {copyrightText && (
          <div className="text-center pt-8 border-t border-slate-200">
            <p className="text-sm opacity-60" style={{ color: textColor }}>
              {copyrightText}
            </p>
          </div>
        )}
      </div>
    </footer>
  )
}

export default ContactFooter

