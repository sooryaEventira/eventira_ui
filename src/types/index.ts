import React from 'react'

// Type definitions for component props
export interface HeadingProps {
  text: string
  level?: 1 | 2 | 3 | 4 | 5 | 6
  size?: 'XXXL' | 'XXL' | 'XL' | 'L' | 'M' | 'S' | 'XS'
  color?: string
  align?: 'left' | 'center' | 'right' | 'justify'
  puck?: {
    dragRef: (element: HTMLElement | null) => void;
  };
}

export interface TextProps {
  text: string
  size?: string
  color?: string
  align?: 'left' | 'center' | 'right' | 'justify'
  puck?: {
    dragRef: (element: HTMLElement | null) => void;
  };
}

export interface ButtonProps {
  text: string
  variant?: 'primary' | 'secondary' | 'success' | 'danger'
  size?: 'small' | 'medium' | 'large'
  textColor?: string
  backgroundColor?: string
  onClick?: () => void
}

export interface CardProps {
  title: string
  description: string
  backgroundColor?: string
  titleColor?: string
  textColor?: string
}

export interface ListProps {
  items: string
  type?: 'ul' | 'ol'
  textColor?: string
}

export interface DividerProps {
  color?: string
  thickness?: string
}

export interface SpacerProps {
  height?: string
}

export interface CheckboxProps {
  label: string
  checked?: boolean | string
  onChange?: (checked: boolean) => void
  disabled?: boolean | string
  size?: 'small' | 'medium' | 'large'
  variant?: 'default' | 'primary' | 'success'
}


export interface ContainerProps {
  children?: React.ReactNode
  backgroundColor?: string
  padding?: string
  layout?: 'vertical' | 'horizontal' | 'grid' | 'centered'
  gap?: string
}

export interface FlexContainerProps {
  children?: React.ReactNode
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'
  align?: 'stretch' | 'flex-start' | 'center' | 'flex-end' | 'baseline'
  gap?: string
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
}

export interface GridContainerProps {
  children?: React.ReactNode
  columns?: number
  gap?: string
  rowGap?: string
}

export interface SimpleContainerProps {
  children?: React.ReactNode
  backgroundColor?: string
  padding?: string
}

export interface PositionedElementProps {
  children?: React.ReactNode
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'
  top?: string
  left?: string
  right?: string
  bottom?: string
  zIndex?: string
}

export interface HeroButton {
  text: string
  link: string
  color: string
  textColor: string
  size: 'small' | 'medium' | 'large'
}

export interface HeroSectionProps {
  title: string
  subtitle?: string
  startDate?: string
  endDate?: string
  buttons?: HeroButton[]
  showContent?: boolean
  backgroundColor?: string
  textColor?: string
  backgroundImage?: string
  height?: string
  alignment?: 'left' | 'center' | 'right'
  overlayOpacity?: number
  titleSize?: string
  subtitleSize?: string
  buttonSpacing?: string
}

export interface SliderProps {
  slides: string
  autoplay?: boolean
  autoplaySpeed?: number
  showDots?: boolean
  showArrows?: boolean
  height?: string
  backgroundColor?: string
}

export interface ImageProps {
  src: string
  alt?: string
  width?: string
  height?: string
  borderRadius?: string
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none'
  alignment?: 'left' | 'center' | 'right'
  caption?: string
  showCaption?: boolean
  uploadedFile?: File | null
  uploadedImageUrl?: string
}

export interface TwoColumnContentProps {
  leftTitle: string
  leftContent: string
  rightTitle: string
  rightContent: string
  showRightIcon?: boolean
  backgroundColor?: string
  textColor?: string
  titleColor?: string
  padding?: string
  gap?: string
  borderRadius?: string
  borderColor?: string
  borderWidth?: string
}

export interface SpeakerCardProps {
  photo: string | React.ReactElement
  uploadedImage: string | React.ReactElement
  name: string | React.ReactElement
  designation: string | React.ReactElement
  profileLink?: string
}

export interface NavigationProps {
  logo: string | React.ReactElement
  logoText: string | React.ReactElement
  menuItems: string | React.ReactElement
  backgroundColor?: string
  customBackgroundColor?: string
  textColor?: string
  customTextColor?: string
  logoColor?: string
  customLogoColor?: string
  linkColor?: string
  customLinkColor?: string
  hoverColor?: string
  customHoverColor?: string
  padding?: string
  customPadding?: string
  alignment?: 'left' | 'center' | 'right'
}

export interface HeroVideoProps {
  videoUrl: string | React.ReactElement
  title: string | React.ReactElement
  subtitle: string | React.ReactElement
  buttonText: string | React.ReactElement
  buttonLink: string | React.ReactElement
  backgroundColor?: string
  textColor?: string
  titleSize?: 'XXXL' | 'XXL' | 'XL' | 'L' | 'M' | 'S' | 'XS'
  subtitleSize?: 'XL' | 'L' | 'M' | 'S' | 'XS'
  buttonColor?: string
  buttonTextColor?: string
  buttonSize?: 'small' | 'medium' | 'large'
  overlayOpacity?: number
  alignment?: 'left' | 'center' | 'right'
  height?: string
}

export interface HeroSplitScreenProps {
  imageSrc: string | React.ReactElement
  imageAlt?: string
  dateLabel: string | React.ReactElement
  locationLabel: string | React.ReactElement
  title: string | React.ReactElement
  highlightedText?: string | React.ReactElement
  description: string | React.ReactElement
  // Primary Button (optional)
  primaryButtonText?: string | React.ReactElement
  primaryButtonAction?: string | React.ReactElement
  primaryButtonColor?: string
  primaryButtonTextColor?: string
  // Secondary Button (optional)
  secondaryButtonText?: string | React.ReactElement
  secondaryButtonAction?: string | React.ReactElement
  secondaryButtonColor?: string
  secondaryButtonTextColor?: string
  backgroundColor?: string
  textColor?: string
  height?: string
}

export interface EventNumberItem {
  id: string
  value: string | React.ReactElement
  label: string | React.ReactElement
}

export interface EventNumbersProps {
  items?: EventNumberItem[]
  backgroundColor?: string
  textColor?: string
  valueColor?: string
  labelColor?: string
  padding?: string
}

export interface SpeakerItem {
  id: string
  name: string | React.ReactElement
  title: string | React.ReactElement
  company?: string | React.ReactElement
  quote?: string | React.ReactElement
  photo: string | React.ReactElement
  link?: string
  accentColor?: string
}

export interface SpeakerHighlightProps {
  heading?: string | React.ReactElement
  subtitle?: string | React.ReactElement
  speakers?: SpeakerItem[]
  backgroundColor?: string
  textColor?: string
  headingColor?: string
  subtitleColor?: string
  accentColor?: string
  padding?: string
  speakerNameColor?: string
  speakerMetaColor?: string
  imageShape?: 'circle' | 'rectangle'
  photoSize?: 'sm' | 'md' | 'lg'
}

export interface SessionHighlightProps {
  sessionId?: string
  sessions?: any[]
  backgroundStyle?: 'solid' | 'gradient'
  backgroundColor?: string
  gradientFrom?: string
  gradientTo?: string
  titleColor?: string
  descriptionColor?: string
  metaTextColor?: string
  badgeTextColor?: string
  badgeBackgroundColor?: string
  borderRadius?: string
  padding?: string
  contentAlignment?: 'left' | 'center'
  data?: any
}

export interface SessionHighlightKeynoteProps {
  sessionId?: string
  sessions?: any[]
  backgroundStyle?: 'solid' | 'gradient'
  backgroundColor?: string
  gradientFrom?: string
  gradientTo?: string
  titleColor?: string
  descriptionColor?: string
  metaTextColor?: string
  badgeTextColor?: string
  badgeBackgroundColor?: string
  borderColor?: string
  borderRadius?: string
  padding?: string
  data?: any
}

export interface SessionHighlightWorkshopProps {
  sessionId?: string
  sessions?: any[]
  backgroundColor?: string
  textColor?: string
  badgeColor?: string
  badgeTextColor?: string
  buttonColor?: string
  buttonTextColor?: string
  borderColor?: string
  borderRadius?: string
  padding?: string
  data?: any
}

export interface VenueBlockProps {
  venueName?: string | React.ReactElement
  address?: string | React.ReactElement
  city?: string | React.ReactElement
  state?: string | React.ReactElement
  backgroundImage?: string
  backgroundColor?: string
  overlayColor?: string
  overlayOpacity?: number
  textColor?: string
  badgeColor?: string
  badgeTextColor?: string
  borderRadius?: string
  padding?: string
}

export interface HotelItem {
  id: string
  name: string | React.ReactElement
  image?: string | React.ReactElement
  priceLevel?: '1' | '2' | '3' | '4' | '5'
  distance?: string | React.ReactElement
  distanceType?: 'walk' | 'metro' | 'drive'
  features?: string[]
  badge?: string | React.ReactElement
  link?: string
}

export interface HotelPartnersProps {
  title?: string | React.ReactElement
  description?: string | React.ReactElement
  hotels?: HotelItem[]
  backgroundColor?: string
  textColor?: string
  cardBackgroundColor?: string
  cardBorderColor?: string
  badgeColor?: string
  badgeTextColor?: string
  priceBadgeColor?: string
  buttonColor?: string
  buttonTextColor?: string
  padding?: string
  gap?: string
}

export interface DirectionItem {
  id: string
  title: string | React.ReactElement
  description: string | React.ReactElement
  icon?: string
  iconColor?: string
}

export interface VenueDirectionsProps {
  title?: string | React.ReactElement
  mapEmbedUrl?: string
  mapPlaceholder?: string | React.ReactElement
  entranceTitle?: string | React.ReactElement
  entranceDescription?: string | React.ReactElement
  entranceLinkText?: string | React.ReactElement
  entranceLinkUrl?: string
  directions?: DirectionItem[]
  backgroundColor?: string
  textColor?: string
  cardBackgroundColor?: string
  cardBorderColor?: string
  iconBackgroundColor?: string
  buttonColor?: string
  buttonTextColor?: string
  padding?: string
  gap?: string
}

export interface LocationFloorPlanProps {
  title?: string | React.ReactElement
  subtitle?: string | React.ReactElement
  pdfUrl?: string
  imageUrl?: string
  backgroundColor?: string
  textColor?: string
  cardBackgroundColor?: string
}

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
  items?: GridItem[]
  backgroundColor?: string
  textColor?: string
  cardBackgroundColor?: string
  cardBorderColor?: string
  linkColor?: string
  padding?: string
  gap?: string
  imageHeight?: string
}


export interface CountdownTimerProps {
  heading: string | React.ReactElement
  targetDate: string | React.ReactElement
}

export interface ProgressItem {
  value: number
  color: string
  caption: string | React.ReactElement
}

export interface ProgressCircleStatsProps {
  items: ProgressItem[]
}

export interface Page {
  id: string
  name: string
  filename: string
  lastModified: string
}

export interface RegistrationFormProps {
  title?: string
  puck?: {
    dragRef: (element: HTMLElement | null) => void;
  };
}

export interface GoogleFormProps {
  formUrl: string
  height?: number
  puck?: {
    dragRef: (element: HTMLElement | null) => void;
  };
}

export interface PageData {
  content: any[]
  root: { 
    [x: string]: any
    readOnly?: { [x: string]: boolean | undefined; [x: number]: boolean | undefined } | undefined
    props?: { [x: string]: any; [x: number]: any } | undefined
    title?: string | undefined
  }
  zones: any
}
