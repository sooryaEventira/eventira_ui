/**
 * Component categories configuration
 * Organizes components into logical groups for the Puck editor
 */

export const categories = {
  // Basic Elements Category
  basic: {
    title: "Basic Elements",
    icon: "fa-solid fa-font",
    defaultExpanded: false,
    components: ["Heading", "Text", "Button", "Checkbox", "Divider", "Spacer", "TextBlock", "InputField", "SelectField"],
    subcategories: {
      typography: {
        title: "Typography",
        icon: "fa-solid fa-text-width",
        components: ["Heading", "Text", "TextBlock"]
      },
      interactive: {
        title: "Interactive",
        icon: "fa-solid fa-hand-pointer",
        components: ["Button", "Checkbox", "InputField", "SelectField"]
      },
      spacing: {
        title: "Spacing",
        icon: "fa-solid fa-arrows-vertical",
        components: ["Divider", "Spacer"]
      }
    }
  },

  // Layout & Containers Category
  layout: {
    title: "Layout & Containers",
    icon: "fa-solid fa-th",
    components: ["Container", "FlexContainer", "GridContainer", "SimpleContainer", "PositionedElement"],
    subcategories: {
      flex: {
        title: "Flex Layouts",
        icon: "fa-solid fa-arrows-h",
        components: ["FlexContainer"]
      },
      grid: {
        title: "Grid Layouts",
        icon: "fa-solid fa-th-large",
        components: ["GridContainer"]
      },
      positioning: {
        title: "Positioning",
        icon: "fa-solid fa-arrows",
        components: ["PositionedElement"]
      }
    }
  },

  // Advanced Components Category
  advanced: {
    title: "Advanced Components",
    icon: "fa-solid fa-puzzle-piece",
    components: [
      "HeroSection",
      "HeroVideo",
      "Slider",
      "SpeakerCard",
      "SpeakersSection",
      "ScheduleSection",
      "AboutSection",
      "PricingPlans",
      "FAQSection",
      "FAQAccordion",
      "Navigation",
      "CountdownTimer",
      "ProgressCircleStats",
      "HTMLContent",
      "RegistrationForm",
      "GoogleForm",
      "LiveChat",
      "ApiTestComponent",
      "SessionForm",
      "FeedbackForm"
    ],
    subcategories: {
      hero: {
        title: "Hero Sections",
        icon: "fa-solid fa-image",
        components: ["HeroSection", "HeroVideo"]
      },
      media: {
        title: "Media & Galleries",
        icon: "fa-solid fa-images",
        components: ["Slider"]
      },
      sections: {
        title: "Page Sections",
        icon: "fa-solid fa-section",
        components: ["AboutSection", "PricingPlans", "FAQSection", "SpeakersSection", "ScheduleSection"]
      },
      forms: {
        title: "Forms",
        icon: "fa-solid fa-wpforms",
        components: ["RegistrationForm", "GoogleForm", "SessionForm", "FeedbackForm"]
      },
      interactive: {
        title: "Interactive",
        icon: "fa-solid fa-hand-pointer",
        components: ["CountdownTimer", "ProgressCircleStats", "LiveChat", "ApiTestComponent"]
      }
    }
  },

  // Other Components Category
  other: {
    title: "Other",
    icon: "fa-solid fa-ellipsis-h",
    defaultExpanded: false,
    components: ["GroupDirectory"]
  }
}

