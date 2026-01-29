/**
 * Puck config generator with page-type awareness
 * Returns config with categories filtered based on page type
 */

import { config as baseConfig } from './puckConfig'

/**
 * Determine if a page is a landing/home page
 * @param pageType - The page type from root props
 * @param pageName - The page name/slug
 * @returns true if this is a landing/home page
 */
export const isLandingPage = (pageType?: string, pageName?: string): boolean => {
  // Check page type - if explicitly set to a non-landing type, return false
  if (pageType && ['schedule', 'speakers', 'schedule-page', 'venue'].includes(pageType.toLowerCase())) {
    return false
  }
  
  // Check page type for landing indicators
  if (pageType === 'landing' || pageType === 'home' || pageType === 'welcome') {
    return true
  }
  
  // Check page name/slug - if explicitly a non-landing page, return false
  const name = (pageName || '').toLowerCase()
  if (name && ['schedule', 'speakers', 'venue'].includes(name)) {
    return false
  }
  
  // Check page name/slug for landing indicators
  if (name === 'landing' || name === 'home' || name === 'welcome' || name === 'index') {
    return true
  }
  
  // Default: if no specific page type is set, assume it's a landing page
  // (This allows backward compatibility and ensures landing components are available)
  return true
}

/**
 * Determine if a page is a venue page
 * @param pageType - The page type from root props
 * @param pageName - The page name/slug
 * @returns true if this is a venue page
 */
export const isVenuePage = (pageType?: string, pageName?: string): boolean => {
  if (pageType === 'venue') {
    return true
  }
  
  const name = (pageName || '').toLowerCase()
  if (name === 'venue' || name.includes('venue')) {
    return true
  }
  
  // Default: show venue category (allows users to add venue components to any page)
  // This makes venue components available by default, similar to landing pages
  return true
}

/**
 * Get Puck config with categories filtered based on page type
 * @param pageType - Optional page type (from root.props.pageType)
 * @param pageName - Optional page name/slug
 * @returns Puck config with filtered categories
 */
export const getPuckConfig = (pageType?: string, pageName?: string) => {
  const isLanding = isLandingPage(pageType, pageName)
  const isVenue = isVenuePage(pageType, pageName)
  
  // Shallow clone the base config
  const config = {
    ...baseConfig,
    categories: { ...baseConfig.categories },
    components: { ...baseConfig.components }
  }
  
  // Define component lists for each category
  const landingComponents = ["HeroSection", "HeroVideo", "HeroSplitScreen", "EventNumbers", "SpeakerHighlight", "SessionHighlight", "SessionHighlightKeynote", "SessionHighlightWorkshop", "Sponsors", "ContactFooter", "PricingPlans", "CountdownTimer", "ProgressCircleStats", "RegistrationCTA"]
  const venueComponents = ["VenueBlock", "SplitVenueBlock", "HotelPartners", "VenueDirections"]
  const locationComponents = ["LocationFloorPlan"]
  const generalComponents = ["GridBlock", "Article"]
  
  // Filter components based on page type
  const filteredComponents: any = {}
  Object.keys(config.components).forEach(compName => {
    let shouldInclude = true
    
    // If not a landing page, exclude landing components
    if (!isLanding && landingComponents.includes(compName)) {
      shouldInclude = false
    }
    
    // If not a venue page, exclude venue components
    if (!isVenue && venueComponents.includes(compName)) {
      shouldInclude = false
    }
    
    // Location components are always available (similar to venue)
    // if (!isLocation && locationComponents.includes(compName)) {
    //   shouldInclude = false
    // }
    
    if (shouldInclude) {
      filteredComponents[compName] = config.components[compName]
    }
  })
  config.components = filteredComponents
  
  // Handle categories
  const categoriesToRemove: string[] = []
  
  // Remove landing category if not a landing page
  if (!isLanding && config.categories.landing) {
    categoriesToRemove.push('landing')
  }
  
  // Remove venue category if not a venue page
  if (!isVenue && config.categories.venue) {
    categoriesToRemove.push('venue')
  }
  
  // Remove categories
  if (categoriesToRemove.length > 0) {
    const updatedCategories: any = {}
    Object.keys(config.categories).forEach(catKey => {
      if (!categoriesToRemove.includes(catKey)) {
        updatedCategories[catKey] = config.categories[catKey]
      }
    })
    config.categories = updatedCategories
  }
  
  // Reorder categories - prioritize landing, then venue, then resource, then location, then general, then tableList
  const orderedCategories: any = {}
  const otherCategories: any = {}
  
  // Separate special categories from others
  Object.keys(config.categories).forEach(catKey => {
    if (catKey !== 'landing' && catKey !== 'venue' && catKey !== 'resource' && catKey !== 'location' && catKey !== 'general' && catKey !== 'tableList') {
      otherCategories[catKey] = config.categories[catKey]
    }
  })
  
  // Build ordered categories
  if (isLanding && config.categories.landing) {
    orderedCategories.landing = config.categories.landing
  }
  
  if (config.categories.venue) {
    orderedCategories.venue = config.categories.venue
  }
  
  if (config.categories.resource) {
    orderedCategories.resource = config.categories.resource
  }

  if (config.categories.location) {
    orderedCategories.location = config.categories.location
  }
  
  if (config.categories.general) {
    orderedCategories.general = config.categories.general
  }
  
  if (config.categories.tableList) {
    orderedCategories.tableList = config.categories.tableList
  }
  
  // Combine ordered and other categories
  config.categories = {
    ...orderedCategories,
    ...otherCategories
  }
  
  return config
}

