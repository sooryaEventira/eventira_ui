import React from 'react'
import { DropZone } from "@measured/puck"
import { 
  Heading, Text, Button, Card, List, Divider, Spacer, Checkbox, InputField, SelectField 
} from '../components/basic'
import { 
  Container, FlexContainer, GridContainer, SimpleContainer, PositionedElement 
} from '../components/containers'
import {
  HeroSection, HeroVideo, HeroSplitScreen, YouTubeVideo, Slider, SpeakerCard, SpeakersSection, SchedulePage, ScheduleSection, AboutSection, PricingPlans, FAQSection, FAQAccordion, Navigation, CountdownTimer, ProgressCircleStats, HTMLContent, RegistrationForm, GoogleForm, LiveChat, ApiTestComponent, SessionForm, PdfViewer, RegistrationCTA, Sponsors, ContactFooter, EventNumbers, SpeakerHighlight, SessionHighlight, SessionHighlightKeynote, SessionHighlightWorkshop, VenueBlock, SplitVenueBlock, HotelPartners, VenueDirections, LocationFloorPlan, GridBlock, Article, Table, ResourceCards
} from '../components/advanced'
import ScheduleContent from '../components/eventhub/schedulesession/ScheduleContent'
import TwoColumnContent from '../components/advanced/TwoColumnContent'
import FeedbackForm from '../components/advanced/FeedbackForm'
import ImageSimple from '../components/basic/ImageSimple'
import CustomButtonField from '../components/fields/CustomButtonField'
import ArticleSectionsField from '../components/fields/ArticleSectionsField'
import SchedulesSectionField from '../components/fields/SchedulesSectionField'
import PdfSelectField from '../components/fields/PdfSelectField'
import SessionSelectField from '../components/fields/SessionSelectField'
import ResourceFolderAssetsField from '../components/fields/ResourceFolderAssetsField'

// Import split config modules
import { viewports } from './puck/viewports'
import { categories } from './puck/categories'

// Enhanced config with multiple components, categories, and icons
export const config = {
  // Configure viewport sizes for different device previews
  viewports,
  categories: {
    // Basic Elements Category
    basic: {
      title: "Basic Elements",
      icon: "fa-solid fa-font",
      defaultExpanded: true,
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
      icon: "fa-solid fa-th-large",
      defaultExpanded: true,
      components: ["Container", "FlexContainer", "GridContainer", "SimpleContainer", "PositionedElement", "GridLayout"],
      subcategories: {
        containers: {
          title: "Containers",
          icon: "fa-solid fa-square",
          components: ["Container", "SimpleContainer", "GridLayout"]
        },
        flexbox: {
          title: "Flexbox",
          icon: "fa-solid fa-arrows-left-right",
          components: ["FlexContainer"]
        },
        grid: {
          title: "Grid",
          icon: "fa-solid fa-grid-3x3",
          components: ["GridContainer"]
        },
        positioning: {
          title: "Positioning",
          icon: "fa-solid fa-crosshairs",
          components: ["PositionedElement"]
        }
      }
    },
    // Content Blocks Category
    content: {
      title: "Content Blocks",
      icon: "fa-solid fa-cube",
      defaultExpanded: true,
      components: ["Card", "List"],
      subcategories: {
        cards: {
          title: "Cards",
          icon: "fa-solid fa-id-card",
          components: ["Card"]
        },
        lists: {
          title: "Lists",
          icon: "fa-solid fa-list",
          components: ["List"]
        }
      }
    },
    // Landing / Home Page Category
    landing: {
      title: "Landing / Home Page",
      icon: "fa-solid fa-home",
      defaultExpanded: true,
      components: ["HeroSection", "EventNumbers", "SpeakerHighlight", "SessionHighlight", "Sponsors", "ContactFooter", "RegistrationCTA"]
    },
    // Venue Page Category
    venue: {
      title: "Venue Page",
      icon: "fa-solid fa-map-marker-alt",
      defaultExpanded: true,
      components: ["VenueBlock", "SplitVenueBlock", "HotelPartners", "VenueDirections"]
    },
    // Resource Category
    resource: {
      title: "Resource",
      icon: "fa-solid fa-folder-open",
      defaultExpanded: true,
      components: ["Image", "ResourceCards", "LocationFloorPlan"]
    },
    // General Page Category
    general: {
      title: "General Page",
      icon: "fa-solid fa-file-alt",
      defaultExpanded: true,
      components: ["GridBlock", "Article"]
    },
    // Table / List Category
    tableList: {
      title: "Table / List",
      icon: "fa-solid fa-table",
      defaultExpanded: true,
      components: ["Table"]
    },
    // Advanced Components Category
    advanced: {
      title: "Advanced Components",
      icon: "fa-solid fa-magic",
      defaultExpanded: false,
      components: ["Slider", "YouTubeVideo", "SpeakerCard", "SpeakersSection", "SchedulePage", "ScheduleSection", "AboutSection", "TwoColumnContent", "FAQSection", "FAQAccordion", "Navigation", "HTMLContent", "FeedbackForm", "RegistrationForm", "SessionForm", "LiveChat", "ApiTestComponent", "PdfViewer"],
      subcategories: {
        sections: {
          title: "Sections",
          icon: "fa-solid fa-window-maximize",
          components: ["SchedulePage", "AboutSection", "TwoColumnContent", "FAQSection", "FAQAccordion", "HTMLContent", "FeedbackForm", "RegistrationForm", "SessionForm"]
        },
        media: {
          title: "Media",
          icon: "fa-solid fa-image",
          components: ["YouTubeVideo", "Slider", "PdfViewer"]
        },
        interactive: {
          title: "Interactive",
          icon: "fa-solid fa-hand-pointer",
          components: ["SpeakerCard", "SpeakersSection", "ScheduleSection", "Navigation"]
        }
      }
    }
  },
  components: {
    Heading: {
      label: "📝 Heading",
      fields: {
        text: { type: 'text' as const },
        level: { 
          type: 'select' as const, 
          options: [
            { label: 'H1', value: 1 },
            { label: 'H2', value: 2 },
            { label: 'H3', value: 3 },
            { label: 'H4', value: 4 },
            { label: 'H5', value: 5 },
            { label: 'H6', value: 6 }
          ]
        },
        size: {
          type: 'select' as const,
          label: 'Size',
          options: [
            { label: 'XXXL (4rem)', value: 'XXXL' },
            { label: 'XXL (3.5rem)', value: 'XXL' },
            { label: 'XL (3rem)', value: 'XL' },
            { label: 'L (2.5rem)', value: 'L' },
            { label: 'M (2rem)', value: 'M' },
            { label: 'S (1.5rem)', value: 'S' },
            { label: 'XS (1.25rem)', value: 'XS' }
          ]
        },
        color: { 
          type: 'text' as const,
          label: 'Text Color (e.g., #ff0000, red, blue)'
        },
        align: {
          type: 'select' as const,
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
            { label: 'Justify', value: 'justify' }
          ]
        }
      },
      defaultProps: {
        text: 'Heading',
        level: 1,
        size: 'M' as const,
        color: '#333',
        align: 'left' as const
      },
      render: Heading
    },
    Text: {
      label: "📄 Text",
      fields: {
        text: { type: 'textarea' as const },
        size: { 
          type: 'select' as const, 
          options: [
            { label: 'Small (14px)', value: '14px' },
            { label: 'Medium (16px)', value: '16px' },
            { label: 'Large (18px)', value: '18px' }
          ]
        },
        color: { 
          type: 'text' as const,
          label: 'Text Color (e.g., #ff0000, red, blue)'
        },
        align: {
          type: 'select' as const,
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
            { label: 'Justify', value: 'justify' }
          ]
        }
      },
      defaultProps: {
        text: 'This is some sample text. You can edit this content using the Puck editor!',
        size: '16px',
        color: '#555',
        align: 'left' as const
      },
      render: Text
    },
    Button: {
      label: "👆 Button",
      fields: {
        text: { type: 'text' as const },
        variant: { 
          type: 'select' as const, 
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Secondary', value: 'secondary' },
            { label: 'Success', value: 'success' },
            { label: 'Danger', value: 'danger' }
          ]
        },
        size: { 
          type: 'select' as const, 
          options: [
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' }
          ]
        },
        textColor: { 
          type: 'text' as const,
          label: 'Text Color (e.g., #ff0000, red, blue)'
        }
      },
      defaultProps: {
        text: 'Click me',
        variant: 'primary' as const,
        size: 'medium' as const,
        textColor: 'white'
      },
      render: Button
    },
    Card: {
      label: "🆔 Card",
      fields: {
        title: { type: 'text' as const },
        description: { type: 'textarea' as const },
        backgroundColor: { type: 'text' as const },
        titleColor: { 
          type: 'text' as const,
          label: 'Title Color (e.g., #ff0000, red, blue)'
        },
        textColor: { 
          type: 'text' as const,
          label: 'Text Color (e.g., #ff0000, red, blue)'
        }
      },
      defaultProps: {
        title: 'Card Title',
        description: 'This is a card component with a title and description. You can customize the background color and content.',
        backgroundColor: '#fff',
        titleColor: '#333',
        textColor: '#666'
      },
      render: Card
    },
    List: {
      label: "📋 List",
      fields: {
        items: { type: 'textarea' as const },
        type: { 
          type: 'select' as const, 
          options: [
            { label: 'Unordered List', value: 'ul' },
            { label: 'Ordered List', value: 'ol' }
          ]
        },
        textColor: { 
          type: 'text' as const,
          label: 'Text Color (e.g., #ff0000, red, blue)'
        }
      },
      defaultProps: {
        items: 'First item\nSecond item\nThird item',
        type: 'ul' as const,
        textColor: '#555'
      },
      render: List
    },
    Divider: {
      label: "➖ Divider",
      fields: {
        color: { 
          type: 'text' as const,
          label: 'Text Color (e.g., #ff0000, red, blue)'
        },
        thickness: { 
          type: 'select' as const, 
          options: [
            { label: 'Thin (1px)', value: '1px' },
            { label: 'Medium (2px)', value: '2px' },
            { label: 'Thick (3px)', value: '3px' }
          ]
        }
      },
      defaultProps: {
        color: '#ddd',
        thickness: '1px'
      },
      render: Divider
    },
    Spacer: {
      label: "↕️ Spacer",
      fields: {
        height: { 
          type: 'select' as const, 
          options: [
            { label: 'Small (10px)', value: '10px' },
            { label: 'Medium (20px)', value: '20px' },
            { label: 'Large (40px)', value: '40px' },
            { label: 'Extra Large (60px)', value: '60px' }
          ]
        }
      },
      defaultProps: {
        height: '20px'
      },
      render: Spacer
    },
    Checkbox: {
      label: "☑️ Checkbox",
      fields: {
        label: { type: "text", label: "Label" },
        checked: { 
          type: "radio", 
          label: "State",
          options: [
            { label: "Unchecked", value: "false" },
            { label: "Checked", value: "true" }
          ]
        },
      },
      defaultProps: {
        label: "Check this option",
        checked: "false"
      },
      render: Checkbox
    },
    TextBlock: {
      fields: {
        title: { type: "text" },
      },
      defaultProps: {
        title: "Heading",
      },
      render: ({ title }: { title: string }) => React.createElement('div', { style: { padding: 64 } }, React.createElement('h1', null, title)),
    },
    InputField: {
      label: "📝 Input Field",
      fields: {
        label: { type: 'text' as const },
        placeholder: { type: 'text' as const },
        value: { type: 'text' as const },
        type: { 
          type: 'select' as const,
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Email', value: 'email' },
            { label: 'Password', value: 'password' },
            { label: 'Number', value: 'number' },
            { label: 'Tel', value: 'tel' },
            { label: 'URL', value: 'url' }
          ]
        },
        required: { type: 'radio' as const, options: [
          { label: 'No', value: false },
          { label: 'Yes', value: true }
        ]},
        disabled: { type: 'radio' as const, options: [
          { label: 'No', value: false },
          { label: 'Yes', value: true }
        ]},
        icon: { type: 'text' as const },
        iconPosition: { 
          type: 'select' as const,
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' }
          ]
        },
        width: { type: 'text' as const },
        height: { type: 'text' as const },
        fontSize: { type: 'text' as const },
        color: { type: 'text' as const },
        backgroundColor: { type: 'text' as const },
        borderColor: { type: 'text' as const },
        borderRadius: { type: 'text' as const },
        padding: { type: 'text' as const },
        margin: { type: 'text' as const }
      },
      defaultProps: {
        label: 'Input Label',
        placeholder: 'Enter text...',
        value: '',
        type: 'text' as const,
        required: false,
        disabled: false,
        icon: '',
        iconPosition: 'left' as const,
        width: '100%',
        height: '40px',
        fontSize: '14px',
        color: '#333333',
        backgroundColor: '#ffffff',
        borderColor: '#d1d5db',
        borderRadius: '6px',
        padding: '10px 12px',
        margin: '0'
      },
      render: InputField
    },
    SelectField: {
      label: "📋 Select Field",
      fields: {
        label: { type: 'text' as const },
        options: { 
          type: 'array' as const,
          arrayFields: {
            label: { type: 'text' as const },
            value: { type: 'text' as const }
          }
        },
        value: { type: 'text' as const },
        placeholder: { type: 'text' as const },
        required: { type: 'radio' as const, options: [
          { label: 'No', value: false },
          { label: 'Yes', value: true }
        ]},
        disabled: { type: 'radio' as const, options: [
          { label: 'No', value: false },
          { label: 'Yes', value: true }
        ]},
        width: { type: 'text' as const },
        height: { type: 'text' as const },
        fontSize: { type: 'text' as const },
        color: { type: 'text' as const },
        backgroundColor: { type: 'text' as const },
        borderColor: { type: 'text' as const },
        borderRadius: { type: 'text' as const },
        padding: { type: 'text' as const },
        margin: { type: 'text' as const }
      },
      defaultProps: {
        label: 'Select Label',
        options: [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
          { label: 'Option 3', value: 'option3' }
        ],
        value: '',
        placeholder: 'Select an option',
        required: false,
        disabled: false,
        width: '100%',
        height: '40px',
        fontSize: '14px',
        color: '#333333',
        backgroundColor: '#ffffff',
        borderColor: '#d1d5db',
        borderRadius: '6px',
        padding: '10px 12px',
        margin: '0'
      },
      render: SelectField
    },
    Container: {
      label: "📦 Container",
      fields: {
        backgroundColor: { type: 'text' as const },
        padding: { 
          type: 'select' as const, 
          options: [
            { label: 'Small (10px)', value: '10px' },
            { label: 'Medium (20px)', value: '20px' },
            { label: 'Large (30px)', value: '30px' },
            { label: 'Extra Large (40px)', value: '40px' }
          ]
        },
        layout: {
          type: 'select' as const,
          options: [
            { label: 'Vertical', value: 'vertical' },
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Grid', value: 'grid' },
            { label: 'Centered', value: 'centered' }
          ]
        },
        gap: {
          type: 'select' as const,
          options: [
            { label: 'Small (8px)', value: '8px' },
            { label: 'Medium (16px)', value: '16px' },
            { label: 'Large (24px)', value: '24px' },
            { label: 'Extra Large (32px)', value: '32px' }
          ]
        }
      },
      defaultProps: {
        backgroundColor: 'transparent',
        padding: '20px',
        layout: 'vertical' as const,
        gap: '16px'
      },
      render: Container,
      acceptsChildren: true,
      zones: {
        children: ['Text', 'Button', 'Heading', 'Card', 'List', 'Checkbox', 'Divider', 'Spacer', 'Container', 'FlexContainer', 'GridContainer', 'SimpleContainer']
      }
    },
    FlexContainer: {
      label: "↔️ FlexContainer",
      fields: {
        direction: {
          type: 'select' as const,
          options: [
            { label: 'Row', value: 'row' },
            { label: 'Column', value: 'column' },
            { label: 'Row Reverse', value: 'row-reverse' },
            { label: 'Column Reverse', value: 'column-reverse' }
          ]
        },
        justify: {
          type: 'select' as const,
          options: [
            { label: 'Flex Start', value: 'flex-start' },
            { label: 'Center', value: 'center' },
            { label: 'Flex End', value: 'flex-end' },
            { label: 'Space Between', value: 'space-between' },
            { label: 'Space Around', value: 'space-around' },
            { label: 'Space Evenly', value: 'space-evenly' }
          ]
        },
        align: {
          type: 'select' as const,
          options: [
            { label: 'Stretch', value: 'stretch' },
            { label: 'Flex Start', value: 'flex-start' },
            { label: 'Center', value: 'center' },
            { label: 'Flex End', value: 'flex-end' },
            { label: 'Baseline', value: 'baseline' }
          ]
        },
        gap: {
          type: 'select' as const,
          options: [
            { label: 'Small (8px)', value: '8px' },
            { label: 'Medium (16px)', value: '16px' },
            { label: 'Large (24px)', value: '24px' },
            { label: 'Extra Large (32px)', value: '32px' }
          ]
        },
        wrap: {
          type: 'select' as const,
          options: [
            { label: 'No Wrap', value: 'nowrap' },
            { label: 'Wrap', value: 'wrap' },
            { label: 'Wrap Reverse', value: 'wrap-reverse' }
          ]
        }
      },
      defaultProps: {
        direction: 'row' as const,
        justify: 'flex-start' as const,
        align: 'stretch' as const,
        gap: '16px',
        wrap: 'nowrap' as const
      },
      render: FlexContainer,
      acceptsChildren: true,
      zones: {
        children: ['Text', 'Button', 'Heading', 'Card', 'List', 'Checkbox', 'Divider', 'Spacer', 'Container', 'FlexContainer', 'GridContainer', 'SimpleContainer']
      }
    },
    
    GridContainer: {
      label: "🔲 GridContainer",
      fields: {
        columns: {
          type: 'select' as const,
          options: [
            { label: '1 Column', value: 1 },
            { label: '2 Columns', value: 2 },
            { label: '3 Columns', value: 3 },
            { label: '4 Columns', value: 4 },
            { label: '5 Columns', value: 5 },
            { label: '6 Columns', value: 6 }
          ]
        },
        gap: {
          type: 'select' as const,
          options: [
            { label: 'Small (8px)', value: '8px' },
            { label: 'Medium (16px)', value: '16px' },
            { label: 'Large (24px)', value: '24px' },
            { label: 'Extra Large (32px)', value: '32px' }
          ]
        },
        rowGap: {
          type: 'select' as const,
          options: [
            { label: 'Small (8px)', value: '8px' },
            { label: 'Medium (16px)', value: '16px' },
            { label: 'Large (24px)', value: '24px' },
            { label: 'Extra Large (32px)', value: '32px' }
          ]
        }
      },
      defaultProps: {
        columns: 2,
        gap: '16px',
        rowGap: '16px'
      },
      render: GridContainer,
      acceptsChildren: true,
      zones: {
        'column-0': ['Text', 'Button', 'Heading', 'Card', 'List', 'Checkbox', 'Divider', 'Spacer', 'SpeakerCard'],
        'column-1': ['Text', 'Button', 'Heading', 'Card', 'List', 'Checkbox', 'Divider', 'Spacer', 'SpeakerCard'],
        'column-2': ['Text', 'Button', 'Heading', 'Card', 'List', 'Checkbox', 'Divider', 'Spacer', 'SpeakerCard'],
        'column-3': ['Text', 'Button', 'Heading', 'Card', 'List', 'Checkbox', 'Divider', 'Spacer', 'SpeakerCard'],
        'column-4': ['Text', 'Button', 'Heading', 'Card', 'List', 'Checkbox', 'Divider', 'Spacer', 'SpeakerCard'],
        'column-5': ['Text', 'Button', 'Heading', 'Card', 'List', 'Checkbox', 'Divider', 'Spacer', 'SpeakerCard']
      },
    },
    SimpleContainer: {
      label: "📦 SimpleContainer",
      fields: {
        backgroundColor: { type: 'text' as const },
        padding: { 
          type: 'select' as const, 
          options: [
            { label: 'Small (10px)', value: '10px' },
            { label: 'Medium (20px)', value: '20px' },
            { label: 'Large (30px)', value: '30px' }
          ]
        }
      },
      defaultProps: {
        backgroundColor: '#f0f8ff',
        padding: '20px'
      },
      render: SimpleContainer,
      acceptsChildren: true
    },
    PositionedElement: {
      label: "🎯 PositionedElement",
      fields: {
        position: {
          type: 'select' as const,
          options: [
            { label: 'Static', value: 'static' },
            { label: 'Relative', value: 'relative' },
            { label: 'Absolute', value: 'absolute' },
            { label: 'Fixed', value: 'fixed' },
            { label: 'Sticky', value: 'sticky' }
          ]
        },
        top: { type: 'text' as const },
        left: { type: 'text' as const },
        right: { type: 'text' as const },
        bottom: { type: 'text' as const },
        zIndex: { type: 'text' as const }
      },
      defaultProps: {
        position: 'static' as const,
        top: 'auto',
        left: 'auto',
        right: 'auto',
        bottom: 'auto',
        zIndex: 'auto'
      },
      render: PositionedElement,
      acceptsChildren: true
    },
    GridLayout: {
      label: "🔲 Grid Layout",
      description: "A multi-column layout with draggable components",
      fields: {
        numberOfColumns: {
          type: "number",
          label: "Number of Columns",
          defaultValue: 2,
          min: 1,
          max: 4,
        },
        gap: {
          type: 'select' as const,
          options: [
            { label: 'Small (8px)', value: '8px' },
            { label: 'Medium (16px)', value: '16px' },
            { label: 'Large (24px)', value: '24px' },
            { label: 'Extra Large (32px)', value: '32px' }
          ]
        },
        backgroundColor: { type: 'text' as const },
        padding: { 
          type: 'select' as const, 
          options: [
            { label: 'Small (10px)', value: '10px' },
            { label: 'Medium (20px)', value: '20px' },
            { label: 'Large (30px)', value: '30px' }
          ]
        }
      },
      defaultProps: {
        numberOfColumns: 2,
        gap: '16px',
        backgroundColor: '#f8f9fa',
        padding: '20px'
      },
      render: ({ numberOfColumns, gap, backgroundColor, padding, puck, ...props }: { numberOfColumns: number, gap: string, backgroundColor: string, padding: string, puck?: any, [key: string]: any }) => {
        // Create array of column indices
        const columnIndices = Array.from({ length: numberOfColumns }, (_, i) => i)
        
        // Check if we have zone content in props (preview mode)
        const hasZoneContent = Object.keys(props).some(key => key.startsWith('column-') && Array.isArray(props[key]))
        
        return React.createElement('div', {
          style: {
            display: "grid",
            gridTemplateColumns: `repeat(${numberOfColumns}, 1fr)`,
            gap: gap,
            padding: padding,
            backgroundColor: backgroundColor,
            borderRadius: 8,
            minHeight: "200px",
            border: '1px solid #e9ecef'
          }
        }, columnIndices.map((index) => {
          const zoneName = `column-${index}`
          
          if (hasZoneContent) {
            // In preview mode, render zone content if available
            const zoneContent = props[zoneName] || []
            return React.createElement('div', { key: index, style: { minHeight: '50px' } }, 
              Array.isArray(zoneContent) ? zoneContent.map((item: any, itemIndex: number) => {
                const Component = config.components[item.type as keyof typeof config.components]?.render
                return Component ? React.createElement(Component as any, { key: itemIndex, ...item.props }) : null
              }) : null
            )
          } else {
            // In editor mode, use DropZone
            return React.createElement('div', { key: index, style: { minHeight: '50px' } }, 
              React.createElement(DropZone, { zone: zoneName })
            )
          }
        }));
      },
      acceptsChildren: true,
      zones: {
        'column-0': ['TextBlock', 'Text', 'Button', 'Heading', 'Card'],
        'column-1': ['TextBlock', 'Text', 'Button', 'Heading', 'Card'],
        'column-2': ['TextBlock', 'Text', 'Button', 'Heading', 'Card'],
        'column-3': ['TextBlock', 'Text', 'Button', 'Heading', 'Card']
      },
    },
    HeroSection: {
      label: "🪟 HeroSection",
      fields: {
        title: { 
          type: 'text' as const,
          label: 'Event Title',
        },
        subtitle: { 
          type: 'text' as const,
          label: 'Location',
          placeholder: 'Location (optional)'
        },
        startDate: {
          type: 'text' as const,
          label: 'Start Date',
          placeholder: 'e.g. 2026-03-15'
        },
        endDate: {
          type: 'text' as const,
          label: 'End Date',
          placeholder: 'e.g. 2026-03-17'
        },
        buttons: {
          type: 'array' as const,
          label: 'Buttons',
          arrayFields: {
            text: { 
              type: 'text' as const,
              label: 'Button Text',
            },
            link: { 
              type: 'text' as const,
              label: 'Button Link (URL)'
            },
            color: { 
              type: 'text' as const,
              label: 'Button Color (hex code)',
              placeholder: '#6938EF'
            },
            textColor: {
              type: 'select' as const,
              label: 'Button Text Color',
              options: [
                { label: 'White', value: 'white' },
                { label: 'Black', value: 'black' },
                { label: 'Blue', value: '#007bff' },
                { label: 'Green', value: '#28a745' },
                { label: 'Red', value: '#dc3545' },
                { label: 'Orange', value: '#fd7e14' },
                { label: 'Yellow', value: '#ffc107' }
              ]
            },
            size: {
              type: 'select' as const,
              label: 'Button Size',
              options: [
                { label: 'Small', value: 'small' },
                { label: 'Medium', value: 'medium' },
                { label: 'Large', value: 'large' }
              ]
            }
          }
        },
        backgroundImage: { 
          type: 'text' as const,
          label: 'Background Image URL'
        },
        height: { 
          type: 'select' as const,
          label: 'Section Height',
          options: [
            { label: 'Small (300px)', value: '300px' },
            { label: 'Medium (400px)', value: '400px' },
            { label: 'Large (500px)', value: '500px' },
            { label: 'Extra Large (600px)', value: '600px' },
            { label: 'Full Screen (100vh)', value: '100vh' }
          ]
        },
        alignment: {
          type: 'select' as const,
          label: 'Content Alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' }
          ]
        },
        titleSize: {
          type: 'select' as const,
          label: 'Title Size',
          options: [
            { label: 'Small (2rem)', value: '2rem' },
            { label: 'Medium (2.5rem)', value: '2.5rem' },
            { label: 'Large (3rem)', value: '3rem' },
            { label: 'Extra Large (3.5rem)', value: '3.5rem' },
            { label: 'Huge (4rem)', value: '4rem' }
          ]
        },
        subtitleSize: {
          type: 'select' as const,
          label: 'Subtitle Size',
          options: [
            { label: 'Small (1rem)', value: '1rem' },
            { label: 'Medium (1.125rem)', value: '1.125rem' },
            { label: 'Large (1.25rem)', value: '1.25rem' },
            { label: 'Extra Large (1.5rem)', value: '1.5rem' }
          ]
        }
      },
      defaultProps: {
        title: 'Event Title',
        subtitle: 'Location',
        startDate: '',
        endDate: '',
        buttons: [
          {
            text: 'Register Now',
            link: '#register',
            color: '#6938EF',
            textColor: 'white',
            size: 'large'
          }
        ],
        backgroundImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80',
        height: '500px' as const,
        alignment: 'center' as const,
        titleSize: '3.5rem',
        subtitleSize: '1.25rem'
      },
      render: HeroSection
    },
    Slider: {
      label: "🖼️ Slider",
      fields: {
        slides: { 
          type: 'textarea' as const,
          label: 'Slide Content (one per line)'
        },
        autoplay: { 
          type: 'radio' as const,
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false }
          ]
        },
        autoplaySpeed: { 
          type: 'select' as const,
          options: [
            { label: 'Fast (2s)', value: 2000 },
            { label: 'Normal (3s)', value: 3000 },
            { label: 'Slow (5s)', value: 5000 },
            { label: 'Very Slow (8s)', value: 8000 }
          ]
        },

        height: { 
          type: 'select' as const,
          options: [
            { label: 'Small (300px)', value: '300px' },
            { label: 'Medium (400px)', value: '400px' },
            { label: 'Large (500px)', value: '500px' },
            { label: 'Extra Large (600px)', value: '600px' }
          ]
        },
        backgroundColor: { 
          type: 'select' as const,
          options: [
            { label: 'Light Gray', value: '#f8f9fa' },
            { label: 'Blue', value: '#007bff' },
            { label: 'Green', value: '#28a745' },
            { label: 'Purple', value: '#6f42c1' },
            { label: 'Orange', value: '#fd7e14' }
          ]
        }
      },
      defaultProps: {
        slides: 'Welcome to Slide 1\nThis is Slide 2\nAnd here is Slide 3',
        autoplay: true,
        autoplaySpeed: 3000,
        showDots: true,
        showArrows: true,
        height: '400px' as const,
        backgroundColor: '#f8f9fa' as const
      },
      render: Slider
    },
    YouTubeVideo: {
      label: "▶️ YouTube Video",
      fields: {
        videoUrl: {
          type: 'text' as const,
          label: 'YouTube Video URL',
          placeholder: 'https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID',
        },
        height: {
          type: 'text' as const,
          label: 'Height (optional)',
          placeholder: 'auto (16:9) or e.g. 360px',
        },
        autoplay: {
          type: 'radio' as const,
          label: 'Autoplay',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
        controls: {
          type: 'radio' as const,
          label: 'Controls',
          options: [
            { label: 'Show', value: true },
            { label: 'Hide', value: false },
          ],
        },
        startTime: {
          type: 'number' as const,
          label: 'Start Time (seconds)',
          min: 0,
        },
      },
      defaultProps: {
        videoUrl: '',
        height: '',
        autoplay: false,
        controls: true,
        startTime: 0,
      },
      render: YouTubeVideo,
    },
    Image: {
      label: "🖼️ Image",
      fields: {
        src: { 
          type: 'text' as const,
          label: 'Image URL'
        },
        alt: { 
          type: 'text' as const,
          label: 'Alt Text (for accessibility)'
        },
        width: { 
          type: 'select' as const,
          options: [
            { label: 'Auto', value: 'auto' },
            { label: '100%', value: '100%' },
            { label: '75%', value: '75%' },
            { label: '50%', value: '50%' },
            { label: '25%', value: '25%' },
            { label: '300px', value: '300px' },
            { label: '400px', value: '400px' },
            { label: '500px', value: '500px' }
          ]
        },
        height: { 
          type: 'select' as const,
          options: [
            { label: 'Auto', value: 'auto' },
            { label: '200px', value: '200px' },
            { label: '300px', value: '300px' },
            { label: '400px', value: '400px' },
            { label: '500px', value: '500px' }
          ]
        },
        borderRadius: { 
          type: 'select' as const,
          options: [
            { label: 'None', value: '0px' },
            { label: 'Small (4px)', value: '4px' },
            { label: 'Medium (8px)', value: '8px' },
            { label: 'Large (16px)', value: '16px' },
            { label: 'Round', value: '50%' }
          ]
        },
        objectFit: { 
          type: 'select' as const,
          options: [
            { label: 'Cover (fill)', value: 'cover' },
            { label: 'Contain (fit)', value: 'contain' },
            { label: 'Fill (stretch)', value: 'fill' },
            { label: 'Scale Down', value: 'scale-down' },
            { label: 'None', value: 'none' }
          ]
        },
        alignment: { 
          type: 'select' as const,
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' }
          ]
        },

        caption: { 
          type: 'text' as const,
          label: 'Image Caption'
        }
      },
      defaultProps: {
        src: 'https://picsum.photos/400/300',
        alt: 'Image description',
        width: '100%' as const,
        height: 'auto' as const,
        borderRadius: '8px' as const,
        objectFit: 'cover' as const,
        alignment: 'center' as const,
        showCaption: false,
        caption: ''
      },
      render: ImageSimple
    },
    SpeakerCard: {
      label: "👤 Speaker Card",
      fields: {
        photo: {
          type: 'text' as const,
          label: 'Photo URL',
          placeholder: 'https://example.com/photo.jpg',
          contentEditable: true
        },
        uploadedImage: {
          type: 'text' as const,
          label: 'Uploaded Image (File Path)',
          placeholder: 'File path will appear here after upload'
        },
        name: {
          type: 'text' as const,
          label: 'Name',
          contentEditable: true
        },
        designation: {
          type: 'text' as const,
          label: 'Designation',
          contentEditable: true
        }
      },
      defaultProps: {
        photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=200&fit=crop&crop=face',
        uploadedImage: null,
        name: 'Alex Thompson',
        designation: 'Senior Developer'
      },
      render: SpeakerCard
    },
    SpeakersSection: {
      label: "👥 Speakers Section",
      fields: {
        title: {
          type: 'text' as const,
          label: 'Section Title',
          placeholder: 'Speakers',
          contentEditable: true
        },
        showTitle: {
          type: 'radio' as const,
          label: 'Show Title',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false }
          ]
        },
        speakers: {
          type: 'array' as const,
          label: 'Speakers',
          arrayFields: {
            name: {
              type: 'text' as const,
              label: 'Name'
            },
            title: {
              type: 'text' as const,
              label: 'Title/Position'
            },
            image: {
              type: 'text' as const,
              label: 'Image URL',
              placeholder: 'https://example.com/photo.jpg'
            },
            profileLink: {
              type: 'text' as const,
              label: 'Profile Link',
              placeholder: 'https://example.com/profile'
            }
          }
        },
        backgroundColor: {
          type: 'text' as const,
          label: 'Background Color',
          placeholder: '#ffffff'
        },
        padding: {
          type: 'text' as const,
          label: 'Padding',
          placeholder: '0 2rem'
        },
        gap: {
          type: 'text' as const,
          label: 'Gap Between Cards',
          placeholder: '2rem'
        },
        containerMaxWidth: {
          type: 'text' as const,
          label: 'Container Max Width',
          placeholder: 'max-w-7xl'
        },
        containerPadding: {
          type: 'text' as const,
          label: 'Container Padding',
          placeholder: 'px-4 sm:px-6 lg:px-8 py-8'
        }
      },
      defaultProps: {
        title: 'Speakers',
        showTitle: true,
        speakers: [
          {
            name: 'Dr. Jane Doe',
            title: 'Professor at X University',
            image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=200&fit=crop&crop=face'
          },
          {
            name: 'Dr. John Smith',
            title: 'Research Director',
            image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=200&fit=crop&crop=face'
          },
          {
            name: 'Dr. Sarah Wilson',
            title: 'Industry Expert',
            image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=200&fit=crop&crop=face'
          }
        ],
        backgroundColor: '#ffffff',
        padding: '0 2rem',
        gap: '2rem',
        containerMaxWidth: 'max-w-7xl',
        containerPadding: 'px-4 sm:px-6 lg:px-8 py-8'
      },
      render: SpeakersSection
    },
    ScheduleSection: {
      label: "📅 Schedule Section",
      fields: {
        sessions: {
          type: 'array' as const,
          label: 'Sessions',
          arrayFields: {
            title: {
              type: 'text' as const,
              label: 'Session Title'
            },
            time: {
              type: 'text' as const,
              label: 'Time (e.g., 08:00 AM - 09:00 AM)'
            },
            room: {
              type: 'text' as const,
              label: 'Room/Location'
            },
            mode: {
              type: 'text' as const,
              label: 'Mode (e.g., In-Person, Online)'
            },
            description: {
              type: 'text' as const,
              label: 'Description'
            },
            icon: {
              type: 'text' as const,
              label: 'Icon (emoji or image URL)',
              placeholder: '🎯'
            }
          }
        },
        buttonText: {
          type: 'text' as const,
          label: 'Button Text',
          placeholder: 'View Full Schedule',
          contentEditable: true
        },
        backgroundColor: {
          type: 'text' as const,
          label: 'Background Color',
          placeholder: '#f8f9fa'
        },
        padding: {
          type: 'text' as const,
          label: 'Padding',
          placeholder: '2rem'
        },
        gap: {
          type: 'text' as const,
          label: 'Gap Between Sessions',
          placeholder: '1rem'
        }
      },
      defaultProps: {
        sessions: [
          {
            title: 'Welcome presentation',
            time: '08:00 AM - 09:00 AM',
            room: 'Room A',
            mode: 'In-Person',
            description: 'Brief overview and a warm welcome to all participants. This session will cover the agenda, housekeeping rules, and introduce the keynote speakers.',
            icon: '🎯'
          },
          {
            title: 'Poster presentation',
            time: '08:00 AM - 09:00 AM',
            room: 'Room B',
            mode: 'In-Person',
            description: 'Brief overview of posters and topics. Participants will have the opportunity to view research posters and interact with presenters.',
            icon: '🎯'
          },
          {
            title: 'Keynote Address',
            time: '09:00 AM - 10:00 AM',
            room: 'Main Hall',
            mode: 'In-Person',
            description: 'Inspirational keynote presentation by industry leaders covering the latest trends and future directions in the field.',
            icon: '🎤'
          },
          {
            title: 'Coffee Break',
            time: '10:00 AM - 10:30 AM',
            room: 'Lobby',
            mode: 'In-Person',
            description: 'Networking opportunity with refreshments and informal discussions.',
            icon: '☕'
          },
          {
            title: 'Panel Discussion',
            time: '10:30 AM - 11:30 AM',
            room: 'Main Hall',
            mode: 'In-Person',
            description: 'Expert panel discussion on current challenges and opportunities in the industry. Q&A session included.',
            icon: '👥'
          },
         
        ],
        buttonText: 'View Full Schedule',
        backgroundColor: '#f8f9fa',
        padding: '2rem',
        gap: '1rem'
      },
      render: ScheduleSection
    },
         AboutSection: {
           label: "ℹ️ About Section",
           fields: {
             leftTitle: {
               type: 'text' as const,
               label: 'Title',
               placeholder: 'Our Mission',
             },
             leftText: {
               type: 'textarea' as const,
               label: 'Text',
               placeholder: 'We are dedicated to providing innovative solutions...',
               rows: 6
             },
             backgroundColor: {
               type: 'text' as const,
               label: 'Background Color',
               placeholder: '#ffffff'
             },
             textColor: {
               type: 'text' as const,
               label: 'Text Color',
               placeholder: '#333333'
             },
             padding: {
               type: 'text' as const,
               label: 'Padding',
               placeholder: '3rem 2rem'
             }
           },
           defaultProps: {
             leftTitle: 'Our Mission',
             leftText: 'We are dedicated to providing innovative solutions that help our clients achieve their goals and drive success in their respective industries.',
             backgroundColor: '#ffffff',
             textColor: '#333333',
             padding: '3rem 2rem'
          },
          render: AboutSection
        },
        TwoColumnContent: {
          label: "📑 Two Column Content",
          fields: {
            leftTitle: {
              type: 'text' as const,
              label: 'Left Column Title',
              placeholder: 'About the event',
              contentEditable: true
            },
            leftContent: {
              type: 'textarea' as const,
              label: 'Left Column Content',
              placeholder: 'Enter left column content...',
              contentEditable: true
            },
            rightTitle: {
              type: 'text' as const,
              label: 'Right Column Title',
              placeholder: 'Sponsor',
              contentEditable: true
            },
            rightContent: {
              type: 'textarea' as const,
              label: 'Right Column Content',
              placeholder: 'Enter right column content...',
              contentEditable: true
            },
            showRightIcon: {
              type: 'radio' as const,
              label: 'Show Right Icon',
              options: [
                { label: 'Yes', value: true },
                { label: 'No', value: false }
              ]
            },
            backgroundColor: {
              type: 'text' as const,
              label: 'Background Color',
              placeholder: '#ffffff'
            },
            textColor: {
              type: 'text' as const,
              label: 'Text Color',
              placeholder: '#000000'
            },
            titleColor: {
              type: 'text' as const,
              label: 'Title Color',
              placeholder: '#000000'
            },
            padding: {
              type: 'text' as const,
              label: 'Padding',
              placeholder: '24px'
            },
            gap: {
              type: 'text' as const,
              label: 'Gap',
              placeholder: '32px'
            },
            borderRadius: {
              type: 'text' as const,
              label: 'Border Radius',
              placeholder: '8px'
            },
            borderColor: {
              type: 'text' as const,
              label: 'Border Color',
              placeholder: '#e3f2fd'
            },
            borderWidth: {
              type: 'text' as const,
              label: 'Border Width',
              placeholder: '1px'
            }
          },
          defaultProps: {
            leftTitle: 'About the event',
            leftContent: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
            rightTitle: 'Sponsor',
            rightContent: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
            showRightIcon: true,
            backgroundColor: '#ffffff',
            textColor: '#000000',
            titleColor: '#000000',
            padding: '24px',
            gap: '32px',
            borderRadius: '8px',
            borderColor: '#e3f2fd',
            borderWidth: '1px'
          },
          render: TwoColumnContent
        },
        PricingPlans: {
           label: "💰 Pricing Plans",
           fields: {
             plans: {
               type: 'array' as const,
               label: 'Pricing Plans',
               arrayFields: {
                 icon: {
                   type: 'text' as const,
                   label: 'Icon (emoji)',
                   placeholder: '⚡'
                 },
                 title: {
                   type: 'text' as const,
                   label: 'Plan Title',
                   placeholder: 'Basic plan',
                   contentEditable: true
                 },
                 price: {
                   type: 'text' as const,
                   label: 'Price',
                   placeholder: '$10',
                   contentEditable: true
                 },
                 billingNote: {
                   type: 'text' as const,
                   label: 'Billing Note',
                   placeholder: 'Billed annually.',
                   contentEditable: true
                 },
                 features: {
                   type: 'array' as const,
                   label: 'Features',
                   arrayFields: {
                     feature: {
                       type: 'text' as const,
                       label: 'Feature',
                       placeholder: 'Access to all basic features',
                       contentEditable: true
                     }
                   }
                 },
                 buttonText: {
                   type: 'text' as const,
                   label: 'Button Text',
                   placeholder: 'Get started',
                   contentEditable: true
                 }
               }
             },
             backgroundColor: {
               type: 'text' as const,
               label: 'Background Color',
               placeholder: '#f3e8ff'
             },
             padding: {
               type: 'text' as const,
               label: 'Padding',
               placeholder: '6rem 2rem'
             }
           },
           defaultProps: {
             plans: [
               {
                 id: 'basic',
                 icon: '⚡',
                 title: 'Basic plan',
                 price: '$10',
                 billingNote: 'Billed annually.',
                 features: [
                   'Access to all basic features',
                   'Basic reporting and analytics',
                   'Up to 10 individual users',
                   '20 GB individual data',
                   'Basic chat and email support'
                 ],
                 buttonText: 'Get started'
               },
               {
                 id: 'business',
                 icon: '📊',
                 title: 'Business plan',
                 price: '$20',
                 billingNote: 'Billed annually.',
                 features: [
                   '200+ integrations',
                   'Advanced reporting and analytics',
                   'Up to 20 individual users',
                   '40 GB individual data',
                   'Priority chat and email support'
                 ],
                 buttonText: 'Get started'
               },
               {
                 id: 'enterprise',
                 icon: '🏢',
                 title: 'Enterprise plan',
                 price: '$40',
                 billingNote: 'Billed annually.',
                 features: [
                   'Advanced custom fields',
                   'Audit log and data history',
                   'Unlimited individual users',
                   'Unlimited individual data',
                   'Personalized + priority service'
                 ],
                 buttonText: 'Get started'
               }
             ],
             backgroundColor: '#f3e8ff',
             padding: '6rem 2rem'
           },
           render: PricingPlans
         },
         FAQSection: {
           label: "❓ FAQ Section",
           fields: {
             title: {
               type: 'text' as const,
               label: 'Title',
               placeholder: 'Frequently asked questions',
               contentEditable: true
             },
             subtitle: {
               type: 'text' as const,
               label: 'Subtitle',
               placeholder: 'Everything you need to know about the product and billing.',
               contentEditable: true
             },
             faqs: {
               type: 'array' as const,
               label: 'FAQ Items',
               arrayFields: {
                 icon: {
                   type: 'text' as const,
                   label: 'Icon (emoji)',
                   placeholder: '❤️'
                 },
                 question: {
                   type: 'text' as const,
                   label: 'Question',
                   placeholder: 'Is there a free trial available?',
                   contentEditable: true
                 },
                 answer: {
                   type: 'textarea' as const,
                   label: 'Answer',
                   placeholder: 'Yes, you can try us for free for 30 days...',
                   contentEditable: true
                 }
               }
             },
             ctaText: {
               type: 'text' as const,
               label: 'Call to Action Text',
               placeholder: 'Still have questions? Can\'t find the answer you\'re looking for? Please chat to our friendly team.',
               contentEditable: true
             },
             buttonText: {
               type: 'text' as const,
               label: 'Button Text',
               placeholder: 'Get in touch',
               contentEditable: true
             },
             backgroundColor: {
               type: 'text' as const,
               label: 'Background Color',
               placeholder: '#f8fafc'
             },
             padding: {
               type: 'text' as const,
               label: 'Padding',
               placeholder: '6rem 2rem'
             }
           },
           defaultProps: {
             title: 'Frequently asked questions',
             subtitle: 'Everything you need to know about the product and billing.',
             faqs: [
               {
                 id: '1',
                 icon: '❤️',
                 question: 'Is there a free trial available?',
                 answer: 'Yes, you can try us for free for 30 days. If you want, we\'ll provide you with a free, personalized 30-minute onboarding call to get you up and running as soon as possible.'
               },
               {
                 id: '2',
                 icon: '🔄',
                 question: 'Can I change my plan later?',
                 answer: 'Of course. Our pricing scales with your company. Chat to our friendly team to find a solution that works for you.'
               },
               {
                 id: '3',
                 icon: '🚫',
                 question: 'What is your cancellation policy?',
                 answer: 'We understand that things change. You can cancel your plan at any time and we\'ll refund you the difference already paid.'
               },
               {
                 id: '4',
                 icon: '📄',
                 question: 'Can other info be added to an invoice?',
                 answer: 'Absolutely. You can add any additional information you need to your invoices, including custom fields and notes.'
               },
               {
                 id: '5',
                 icon: '⚡',
                 question: 'How does billing work?',
                 answer: 'We offer flexible billing options. You can choose monthly or annual billing, and we accept all major credit cards and payment methods.'
               },
               {
                 id: '6',
                 icon: '✉️',
                 question: 'How do I change my account email?',
                 answer: 'You can update your account email anytime from your account settings. We\'ll send a confirmation email to verify the change.'
               }
             ],
             ctaText: 'Still have questions? Can\'t find the answer you\'re looking for? Please chat to our friendly team.',
             buttonText: 'Get in touch',
             backgroundColor: '#f8fafc',
             padding: '6rem 2rem'
           },
          render: FAQSection
        },
    FAQAccordion: {
      label: "🔽 FAQ Accordion",
      fields: {
        title: {
          type: 'text' as const,
          label: 'Title',
          placeholder: 'Frequently Asked Questions',
          contentEditable: true
        },
        description: {
          type: 'textarea' as const,
          label: 'Description',
          placeholder: 'Everything you need to know about the product and billing...',
          contentEditable: true
        },
        faqs: {
          type: 'array' as const,
          label: 'FAQ Items',
          arrayFields: {
            question: {
              type: 'text' as const,
              label: 'Question',
              placeholder: 'What is this service about?',
              contentEditable: true
            },
            answer: {
              type: 'textarea' as const,
              label: 'Answer',
              placeholder: 'This service provides comprehensive solutions...',
              contentEditable: true
            }
          }
        },
        allowMultiple: {
          type: 'radio' as const,
          label: 'Allow Multiple Open',
          options: [
            { label: 'Single (close others)', value: false },
            { label: 'Multiple (keep others open)', value: true }
          ]
        },
        backgroundColor: {
          type: 'text' as const,
          label: 'Background Color',
          placeholder: '#ffffff'
        },
        textColor: {
          type: 'text' as const,
          label: 'Text Color',
          placeholder: '#333333'
        },
        questionColor: {
          type: 'text' as const,
          label: 'Question Color',
          placeholder: '#1f2937'
        },
        answerColor: {
          type: 'text' as const,
          label: 'Answer Color',
          placeholder: '#6b7280'
        },
        borderColor: {
          type: 'text' as const,
          label: 'Border Color',
          placeholder: '#e5e7eb'
        },
        padding: {
          type: 'text' as const,
          label: 'Padding',
          placeholder: '3rem 2rem'
        },
        spacing: {
          type: 'text' as const,
          label: 'Spacing Between Items',
          placeholder: '1rem'
        },
        iconColor: {
          type: 'text' as const,
          label: 'Icon Color',
          placeholder: '#8b5cf6'
        },
        hoverColor: {
          type: 'text' as const,
          label: 'Hover Background Color',
          placeholder: '#f8fafc'
        },
        containerMaxWidth: {
          type: 'text' as const,
          label: 'Container Max Width',
          placeholder: 'max-w-7xl'
        },
        containerPadding: {
          type: 'text' as const,
          label: 'Container Padding',
          placeholder: 'px-4 sm:px-6 lg:px-8 py-8'
        }
      },
      defaultProps: {
        title: 'Frequently Asked Questions',
        description: "Everything you need to know about the product and billing. Can't find the answer you're looking for? Please chat to our friendly team.",
        faqs: [
          {
            id: '1',
            question: 'What is this service about?',
            answer: 'This service provides comprehensive solutions for your business needs. We offer a wide range of features and support to help you achieve your goals.'
          },
          {
            id: '2',
            question: 'How do I get started?',
            answer: 'Getting started is easy! Simply sign up for an account, complete the onboarding process, and you\'ll be ready to use all our features within minutes.'
          },
          {
            id: '3',
            question: 'Is there a free trial available?',
            answer: 'Yes, we offer a 30-day free trial for all new users. No credit card required to start your trial period.'
          },
          {
            id: '4',
            question: 'What kind of support do you provide?',
            answer: 'We provide 24/7 customer support through email, chat, and phone. Our support team is always ready to help you with any questions or issues.'
          },
          {
            id: '5',
            question: 'Can I cancel my subscription anytime?',
            answer: 'Absolutely! You can cancel your subscription at any time from your account settings. There are no cancellation fees or long-term contracts.'
          }
        ],
        allowMultiple: false,
        backgroundColor: '#ffffff',
        textColor: '#333333',
        questionColor: '#1f2937',
        answerColor: '#6b7280',
        borderColor: '#e5e7eb',
        padding: '3rem 2rem',
        spacing: '1rem',
        iconColor: '#8b5cf6',
        hoverColor: '#f8fafc',
        containerMaxWidth: 'max-w-7xl',
        containerPadding: 'px-4 sm:px-6 lg:px-8 py-8'
      },
      render: FAQAccordion
        },
    RegistrationCTA: {
      label: "📢 Registration CTA",
      fields: {
        title: {
          type: 'text' as const,
          label: 'Title',
          placeholder: 'Register now to enjoy exclusive benefits!',
        },
        subtitle: {
          type: 'text' as const,
          label: 'Subtitle',
          placeholder: "Don't miss out on this opportunity, join us today!",
        },
        buttonText: {
          type: 'text' as const,
          label: 'Button Text',
          placeholder: 'Register Now',
        },
        backgroundColor: {
          type: 'text' as const,
          label: 'Background Color',
          placeholder: '#6938EF'
        },
        textColor: {
          type: 'text' as const,
          label: 'Text Color',
          placeholder: '#ffffff'
        },
        buttonColor: {
          type: 'text' as const,
          label: 'Button Color',
          placeholder: '#6938EF'
        },
        buttonBorderColor: {
          type: 'text' as const,
          label: 'Button Border Color',
          placeholder: '#8b5cf6'
        }
      },
      defaultProps: {
        title: "Register now to enjoy exclusive benefits!",
        subtitle: "Don't miss out on this opportunity, join us today!",
        buttonText: "Register Now",
        backgroundColor: "#6938EF",
        textColor: "#ffffff",
        buttonColor: "#6938EF",
        buttonBorderColor: "#8b5cf6"
      },
      render: RegistrationCTA
    },
    Sponsors: {
      label: "🏢 Sponsors",
      fields: {
        title: {
          type: 'text' as const,
          label: 'Title',
          placeholder: 'Our Sponsors',
        },
        titleColor: {
          type: 'text' as const,
          label: 'Title Color (hex)',
          placeholder: '#1f2937'
        },
        titleSize: {
          type: 'select' as const,
          label: 'Title Size (3 options)',
          options: [
            { label: 'Size 1 (small)', value: 1 },
            { label: 'Size 2 (medium)', value: 2 },
            { label: 'Size 3 (large)', value: 3 }
          ]
        },
        subtitle: {
          type: 'text' as const,
          label: 'Subtitle',
          placeholder: 'Sponsors who make this event possible',
        },
        subtitleColor: {
          type: 'text' as const,
          label: 'Subtitle Color (hex)',
          placeholder: '#1f2937'
        },
        subtitleSize: {
          type: 'select' as const,
          label: 'Subtitle Size (3 options)',
          options: [
            { label: 'Size 1 (small)', value: 1 },
            { label: 'Size 2 (medium)', value: 2 },
            { label: 'Size 3 (large)', value: 3 }
          ]
        },
        sponsors: {
          type: 'array' as const,
          label: 'Sponsors',
          arrayFields: {
            id: {
              type: 'text' as const,
              label: 'ID',
              placeholder: 'sponsor-1'
            },
            title: {
              type: 'text' as const,
              label: 'Sponsor Title',
              placeholder: 'Sponsor Name'
            },
            titleColor: {
              type: 'text' as const,
              label: 'Sponsor Title Color (hex)',
              placeholder: '#1f2937'
            },
            titleSize: {
              type: 'select' as const,
              label: 'Sponsor Title Size (3 options)',
              options: [
                { label: 'Size 1 (small)', value: 1 },
                { label: 'Size 2 (medium)', value: 2 },
                { label: 'Size 3 (large)', value: 3 }
              ]
            },
            name: {
              type: 'text' as const,
              label: 'Legacy Name (optional)',
              placeholder: 'Sponsor Name'
            },
            logoUrl: {
              type: 'text' as const,
              label: 'Logo URL',
              placeholder: 'https://example.com/logo.png'
            },
            link: {
              type: 'text' as const,
              label: 'Link',
              placeholder: 'https://example.com'
            }
          }
        },
        backgroundColor: {
          type: 'text' as const,
          label: 'Background Color',
          placeholder: '#ffffff'
        },
        textColor: {
          type: 'text' as const,
          label: 'Text Color',
          placeholder: '#1f2937'
        },
        padding: {
          type: 'text' as const,
          label: 'Padding',
          placeholder: '3rem 2rem'
        }
      },
      defaultProps: {
        title: "Our Sponsors",
        titleColor: '',
        titleSize: 2,
        subtitle: "",
        subtitleColor: "",
        subtitleSize: 1,
        sponsors: [
          { id: '1', title: 'Sponsor 1', titleColor: '', titleSize: 1, name: 'Sponsor 1', logoUrl: '' },
          { id: '2', title: 'Sponsor 2', titleColor: '', titleSize: 1, name: 'Sponsor 2', logoUrl: '' },
          { id: '3', title: 'Sponsor 3', titleColor: '', titleSize: 1, name: 'Sponsor 3', logoUrl: '' },
          { id: '4', title: 'Sponsor 4', titleColor: '', titleSize: 1, name: 'Sponsor 4', logoUrl: '' }
        ],
        backgroundColor: "#ffffff",
        textColor: "#1f2937",
        padding: "3rem 2rem"
      },
      render: Sponsors
    },
    ContactFooter: {
      label: "📞 Contact Footer",
      fields: {
        title: {
          type: 'text' as const,
          label: 'Title',
          placeholder: 'Contact Us',
        },
        items: {
          type: 'array' as const,
          label: 'Contact Items',
          arrayFields: {
            id: {
              type: 'text' as const,
              label: 'ID',
              placeholder: 'item-1'
            },
            type: {
              type: 'select' as const,
              label: 'Type',
              options: [
                { label: 'Email', value: 'email' },
                { label: 'Office', value: 'office' },
                { label: 'Phone', value: 'phone' }
              ]
            },
            title: {
              type: 'text' as const,
              label: 'Title',
              placeholder: 'Email',
            },
            description: {
              type: 'text' as const,
              label: 'Description',
              placeholder: 'Our friendly team is here to help.',
            },
            actionText: {
              type: 'text' as const,
              label: 'Action Text',
              placeholder: 'Send us an email',
            },
            actionEmail: {
              type: 'text' as const,
              label: 'Action Email',
              placeholder: 'contact@example.com'
            },
            actionUrl: {
              type: 'text' as const,
              label: 'Action URL',
              placeholder: '#'
            },
            actionPhone: {
              type: 'text' as const,
              label: 'Action Phone',
              placeholder: '+1 (555) 000-0000'
            }
          }
        },
        backgroundColor: {
          type: 'select' as const,
          label: 'Background Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Gray', value: '#6b7280' },
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Black', value: '#000000' },
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Indigo', value: '#6366f1' },
            { label: 'Custom...', value: '' }
          ]
        },
        textColor: {
          type: 'select' as const,
          label: 'Text Color',
          options: [
            { label: 'Black', value: '#000000' },
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Gray', value: '#6b7280' },
            { label: 'Light Gray', value: '#9ca3af' },
            { label: 'White', value: '#ffffff' },
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Indigo', value: '#6366f1' },
            { label: 'Custom...', value: '' }
          ]
        },
        iconColor: {
          type: 'select' as const,
          label: 'Icon Color',
          options: [
            { label: 'Purple', value: '#6938EF' },
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Indigo', value: '#6366f1' },
            { label: 'Black', value: '#000000' },
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Gray', value: '#6b7280' },
            { label: 'White', value: '#ffffff' },
            { label: 'Custom...', value: '' }
          ]
        },
        buttonColor: {
          type: 'select' as const,
          label: 'Button Color',
          options: [
            { label: 'Purple', value: '#6938EF' },
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Indigo', value: '#6366f1' },
            { label: 'Black', value: '#000000' },
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Gray', value: '#6b7280' },
            { label: 'White', value: '#ffffff' },
            { label: 'Custom...', value: '' }
          ]
        },
        padding: {
          type: 'text' as const,
          label: 'Padding',
          placeholder: '3rem 2rem'
        },
        copyrightText: {
          type: 'text' as const,
          label: 'Copyright Text',
          placeholder: 'Copyright © 2024',
        }
      },
      defaultProps: {
        items: [
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
        backgroundColor: "#ffffff",
        textColor: "#1f2937",
        iconColor: "#6938EF",
        buttonColor: "#6938EF",
        padding: "3rem 2rem",
        copyrightText: "Copyright © 2024"
      },
      render: ContactFooter
    },
    EventNumbers: {
      label: "📊 Event Numbers",
      fields: {
        items: {
          type: 'array' as const,
          label: 'Statistics Items',
          arrayFields: {
            value: {
              type: 'text' as const,
              label: 'Value (Number)',
              placeholder: '50+',
            },
            label: {
              type: 'text' as const,
              label: 'Label',
              placeholder: 'SPEAKERS',
            }
          },
          getItemSummary: (item: any, index: number) => {
            return item?.value && item?.label ? `${item.value} ${item.label}` : `Stat ${index + 1}`;
          }
        },
        backgroundColor: {
          type: 'select' as const,
          label: 'Background Color',
          options: [
            { label: 'Dark Blue', value: '#1e3a8a' },
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Indigo', value: '#6366f1' },
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Black', value: '#000000' },
            { label: 'Gray', value: '#4b5563' },
            { label: 'Custom...', value: '' }
          ]
        },
        textColor: {
          type: 'select' as const,
          label: 'Text Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Gray', value: '#9ca3af' },
            { label: 'Black', value: '#000000' },
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Custom...', value: '' }
          ]
        },
        valueColor: {
          type: 'select' as const,
          label: 'Number Color (optional)',
          options: [
            { label: 'Same as Text', value: '' },
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Yellow', value: '#fbbf24' },
            { label: 'Custom...', value: '' }
          ]
        },
        labelColor: {
          type: 'select' as const,
          label: 'Label Color (optional)',
          options: [
            { label: 'Same as Text', value: '' },
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Gray', value: '#9ca3af' },
            { label: 'Custom...', value: '' }
          ]
        },
        padding: {
          type: 'text' as const,
          label: 'Padding',
          placeholder: '3rem 2rem'
        }
      },
      defaultProps: {
        items: [
          {
            id: '1',
            value: '50+',
            label: 'SPEAKERS'
          },
          {
            id: '2',
            value: '2,000+',
            label: 'ATTENDEES'
          },
          {
            id: '3',
            value: '30',
            label: 'WORKSHOPS'
          },
          {
            id: '4',
            value: '3',
            label: 'DAYS'
          }
        ],
        backgroundColor: '#1e3a8a',
        textColor: '#ffffff',
        valueColor: '',
        labelColor: '',
        padding: '3rem 2rem'
      },
      render: EventNumbers
    },
    SpeakerHighlight: {
      label: "🎤 Speaker Highlight",
      fields: {
        heading: {
          type: 'text' as const,
          label: 'Heading',
          placeholder: 'Headlining Speakers',
        },
        subtitle: {
          type: 'text' as const,
          label: 'Subtitle',
          placeholder: 'Learn from the pioneers shaping the industry.',
        },
        speakers: {
          type: 'array' as const,
          label: 'Speakers',
          arrayFields: {
            name: {
              type: 'text' as const,
              label: 'Name',
              placeholder: 'Sarah Jenkins',
            },
            title: {
              type: 'text' as const,
              label: 'Title',
              placeholder: 'CMO',
            },
            company: {
              type: 'text' as const,
              label: 'Company',
              placeholder: 'TechGlobal',
            },
            quote: {
              type: 'textarea' as const,
              label: 'Quote',
              placeholder: 'The Future of AI in Marketing',
            },
            photo: {
              type: 'text' as const,
              label: 'Photo URL',
              placeholder: 'https://example.com/photo.jpg',
            },
            link: {
              type: 'text' as const,
              label: 'Profile Link (optional)',
              placeholder: 'https://example.com/speakers/sarah-jenkins',
            }
          },
          getItemSummary: (item: any, index: number) => {
            return item?.name || `Speaker ${index + 1}`;
          }
        },
        backgroundColor: {
          type: 'text' as const,
          label: 'Background Color (hex)',
          placeholder: '#ffffff',
        },
        textColor: {
          type: 'text' as const,
          label: 'Text Color (hex)',
          placeholder: '#000000',
        },
        headingColor: {
          type: 'text' as const,
          label: 'Heading Color (hex, optional)',
          placeholder: 'Leave empty to use Text Color',
        },
        subtitleColor: {
          type: 'text' as const,
          label: 'Subtitle Color (hex, optional)',
          placeholder: 'Leave empty for default gray',
        },
        speakerNameColor: {
          type: 'text' as const,
          label: 'Photo Heading Color (hex, optional)',
          placeholder: 'Controls speaker name color',
        },
        speakerMetaColor: {
          type: 'text' as const,
          label: 'Photo Subheading Color (hex, optional)',
          placeholder: 'Controls title/company color',
        },
        imageShape: {
          type: 'select' as const,
          label: 'Image Shape',
          options: [
            { label: 'Circle', value: 'circle' },
            { label: 'Rectangle', value: 'rectangle' }
          ]
        },
        photoSize: {
          type: 'select' as const,
          label: 'Photo Size',
          options: [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
            { label: 'Large', value: 'lg' }
          ]
        }
      },
      defaultProps: {
        heading: 'Headlining Speakers',
        subtitle: 'Learn from the pioneers shaping the industry.',
        speakers: [
          {
            id: '1',
            name: 'Sarah Jenkins',
            title: 'CMO',
            company: 'TechGlobal',
            quote: 'The Future of AI in Marketing',
            photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
            link: ''
          },
          {
            id: '2',
            name: 'David Chen',
            title: 'Founder',
            company: 'StartUp Inc.',
            quote: 'Building for Scale',
            photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
            link: ''
          },
          {
            id: '3',
            name: 'Elena Rodriguez',
            title: 'Director of Design',
            company: 'ArtFlo',
            quote: 'Empathy in UX',
            photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
            link: ''
          }
        ],
        backgroundColor: '#ffffff',
        textColor: '#000000',
        headingColor: '',
        subtitleColor: '',
        speakerNameColor: '',
        speakerMetaColor: '',
        imageShape: 'circle',
        photoSize: 'md'
      },
      render: SpeakerHighlight
    },
    SessionHighlight: {
      label: "🎯 Session Highlight",
      fields: {
        sessionId: {
          type: 'custom' as const,
          label: 'Select Session',
          render: (props: any) => {
            return React.createElement(SessionSelectField, {
              ...props,
              value: props.value || '',
              onChange: props.onChange
            })
          }
        },
        sessions: {
          type: 'array' as const,
          label: 'Sessions (from scheduler)',
          arrayFields: {
            id: { type: 'text' as const, label: 'ID' },
            title: { type: 'text' as const, label: 'Title' },
            startTime: { type: 'text' as const, label: 'Start Time' },
            startPeriod: { 
              type: 'select' as const, 
              label: 'Start Period',
              options: [
                { label: 'AM', value: 'AM' },
                { label: 'PM', value: 'PM' }
              ]
            },
            endTime: { type: 'text' as const, label: 'End Time' },
            endPeriod: { 
              type: 'select' as const, 
              label: 'End Period',
              options: [
                { label: 'AM', value: 'AM' },
                { label: 'PM', value: 'PM' }
              ]
            },
            location: { type: 'text' as const, label: 'Location' },
            sessionType: { type: 'text' as const, label: 'Session Type' },
            tags: {
              type: 'array' as const,
              label: 'Tags',
              arrayFields: {
                value: { type: 'text' as const, label: 'Tag' }
              }
            },
            sections: {
              type: 'array' as const,
              label: 'Sections',
              arrayFields: {
                id: { type: 'text' as const, label: 'ID' },
                type: { type: 'text' as const, label: 'Type' },
                title: { type: 'text' as const, label: 'Title' },
                description: { type: 'textarea' as const, label: 'Description' }
              }
            }
          }
        },
        backgroundStyle: {
          type: 'select' as const,
          label: 'Background Style',
          options: [
            { label: 'Gradient', value: 'gradient' },
            { label: 'Solid', value: 'solid' }
          ]
        },
        backgroundColor: {
          type: 'select' as const,
          label: 'Background Color (Solid)',
          options: [
            { label: 'Dark Blue', value: '#1e3a8a' },
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Indigo', value: '#6366f1' },
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Black', value: '#000000' },
            { label: 'Custom...', value: '' }
          ]
        },
        gradientFrom: {
          type: 'select' as const,
          label: 'Gradient From Color',
          options: [
            { label: 'Purple', value: '#6938EF' },
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Indigo', value: '#6366f1' },
            { label: 'Pink', value: '#ec4899' },
            { label: 'Custom...', value: '' }
          ]
        },
        gradientTo: {
          type: 'select' as const,
          label: 'Gradient To Color',
          options: [
            { label: 'Dark Blue', value: '#1e3a8a' },
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Indigo', value: '#6366f1' },
            { label: 'Custom...', value: '' }
          ]
        },
        titleColor: {
          type: 'select' as const,
          label: 'Title Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Black', value: '#000000' },
            { label: 'Custom...', value: '' }
          ]
        },
        descriptionColor: {
          type: 'select' as const,
          label: 'Description Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Gray', value: '#9ca3af' },
            { label: 'Custom...', value: '' }
          ]
        },
        metaTextColor: {
          type: 'select' as const,
          label: 'Meta Text Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Gray', value: '#9ca3af' },
            { label: 'Custom...', value: '' }
          ]
        },
        badgeTextColor: {
          type: 'select' as const,
          label: 'Badge Text Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Custom...', value: '' }
          ]
        },
        badgeBackgroundColor: {
          type: 'select' as const,
          label: 'Badge Background Color',
          options: [
            { label: 'Semi-transparent White', value: 'rgba(255, 255, 255, 0.2)' },
            { label: 'Semi-transparent Black', value: 'rgba(0, 0, 0, 0.2)' },
            { label: 'White', value: '#ffffff' },
            { label: 'Custom...', value: '' }
          ]
        },
        borderRadius: {
          type: 'text' as const,
          label: 'Border Radius',
          placeholder: '16px'
        },
        padding: {
          type: 'text' as const,
          label: 'Padding',
          placeholder: '3rem 2rem'
        },
        contentAlignment: {
          type: 'select' as const,
          label: 'Content Alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' }
          ]
        }
      },
      defaultProps: {
        sessionId: '',
        sessions: [],
        backgroundStyle: 'gradient',
        backgroundColor: '#1e3a8a',
        gradientFrom: '#6938EF',
        gradientTo: '#1e3a8a',
        titleColor: '#ffffff',
        descriptionColor: '#ffffff',
        metaTextColor: '#ffffff',
        badgeTextColor: '#ffffff',
        badgeBackgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        padding: '3rem 2rem',
        contentAlignment: 'left'
      },
      render: SessionHighlight
    },
    SessionHighlightKeynote: {
      label: "🎤 Session Highlight (Keynote)",
      fields: {
        sessionId: {
          type: 'custom' as const,
          label: 'Select Session',
          render: (props: any) => {
            return React.createElement(SessionSelectField, {
              ...props,
              value: props.value || '',
              onChange: props.onChange
            })
          }
        },
        sessions: {
          type: 'array' as const,
          label: 'Sessions (from scheduler)',
          arrayFields: {
            id: { type: 'text' as const, label: 'ID' },
            title: { type: 'text' as const, label: 'Title' },
            startTime: { type: 'text' as const, label: 'Start Time' },
            startPeriod: { 
              type: 'select' as const, 
              label: 'Start Period',
              options: [
                { label: 'AM', value: 'AM' },
                { label: 'PM', value: 'PM' }
              ]
            },
            endTime: { type: 'text' as const, label: 'End Time' },
            endPeriod: { 
              type: 'select' as const, 
              label: 'End Period',
              options: [
                { label: 'AM', value: 'AM' },
                { label: 'PM', value: 'PM' }
              ]
            },
            location: { type: 'text' as const, label: 'Location' },
            sessionType: { type: 'text' as const, label: 'Session Type' },
            tags: {
              type: 'array' as const,
              label: 'Tags',
              arrayFields: {
                value: { type: 'text' as const, label: 'Tag' }
              }
            },
            sections: {
              type: 'array' as const,
              label: 'Sections',
              arrayFields: {
                id: { type: 'text' as const, label: 'ID' },
                type: { type: 'text' as const, label: 'Type' },
                title: { type: 'text' as const, label: 'Title' },
                description: { type: 'textarea' as const, label: 'Description' }
              }
            }
          }
        },
        backgroundStyle: {
          type: 'select' as const,
          label: 'Background Style',
          options: [
            { label: 'Gradient', value: 'gradient' },
            { label: 'Solid', value: 'solid' }
          ]
        },
        backgroundColor: {
          type: 'select' as const,
          label: 'Background Color (Solid)',
          options: [
            { label: 'Dark Purple', value: '#4c1d95' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Dark Blue', value: '#1e3a8a' },
            { label: 'Indigo', value: '#6366f1' },
            { label: 'Custom...', value: '' }
          ]
        },
        gradientFrom: {
          type: 'select' as const,
          label: 'Gradient From Color',
          options: [
            { label: 'Purple', value: '#6938EF' },
            { label: 'Indigo', value: '#6366f1' },
            { label: 'Custom...', value: '' }
          ]
        },
        gradientTo: {
          type: 'select' as const,
          label: 'Gradient To Color',
          options: [
            { label: 'Dark Purple', value: '#4c1d95' },
            { label: 'Dark Blue', value: '#1e3a8a' },
            { label: 'Custom...', value: '' }
          ]
        },
        titleColor: {
          type: 'select' as const,
          label: 'Title Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Custom...', value: '' }
          ]
        },
        descriptionColor: {
          type: 'select' as const,
          label: 'Description Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Custom...', value: '' }
          ]
        },
        metaTextColor: {
          type: 'select' as const,
          label: 'Meta Text Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Custom...', value: '' }
          ]
        },
        badgeTextColor: {
          type: 'select' as const,
          label: 'Badge Text Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Custom...', value: '' }
          ]
        },
        badgeBackgroundColor: {
          type: 'select' as const,
          label: 'Badge Background Color',
          options: [
            { label: 'Semi-transparent White', value: 'rgba(255, 255, 255, 0.2)' },
            { label: 'Custom...', value: '' }
          ]
        },
        borderColor: {
          type: 'select' as const,
          label: 'Border Color',
          options: [
            { label: 'Purple', value: '#7c3aed' },
            { label: 'Indigo', value: '#6366f1' },
            { label: 'Custom...', value: '' }
          ]
        },
        borderRadius: {
          type: 'text' as const,
          label: 'Border Radius',
          placeholder: '16px'
        },
        padding: {
          type: 'text' as const,
          label: 'Padding',
          placeholder: '2rem'
        }
      },
      defaultProps: {
        sessionId: '',
        sessions: [],
        backgroundStyle: 'solid',
        backgroundColor: '#4c1d95',
        gradientFrom: '#6938EF',
        gradientTo: '#4c1d95',
        titleColor: '#ffffff',
        descriptionColor: '#ffffff',
        metaTextColor: '#ffffff',
        badgeTextColor: '#ffffff',
        badgeBackgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderColor: '#7c3aed',
        borderRadius: '16px',
        padding: '2rem'
      },
      render: SessionHighlightKeynote
    },
    SessionHighlightWorkshop: {
      label: "🔧 Session Highlight (Workshop)",
      fields: {
        sessionId: {
          type: 'custom' as const,
          label: 'Select Session',
          render: (props: any) => {
            return React.createElement(SessionSelectField, {
              ...props,
              value: props.value || '',
              onChange: props.onChange
            })
          }
        },
        sessions: {
          type: 'array' as const,
          label: 'Sessions (from scheduler)',
          arrayFields: {
            id: { type: 'text' as const, label: 'ID' },
            title: { type: 'text' as const, label: 'Title' },
            startTime: { type: 'text' as const, label: 'Start Time' },
            startPeriod: { 
              type: 'select' as const, 
              label: 'Start Period',
              options: [
                { label: 'AM', value: 'AM' },
                { label: 'PM', value: 'PM' }
              ]
            },
            endTime: { type: 'text' as const, label: 'End Time' },
            endPeriod: { 
              type: 'select' as const, 
              label: 'End Period',
              options: [
                { label: 'AM', value: 'AM' },
                { label: 'PM', value: 'PM' }
              ]
            },
            location: { type: 'text' as const, label: 'Location' },
            sessionType: { type: 'text' as const, label: 'Session Type' },
            tags: {
              type: 'array' as const,
              label: 'Tags',
              arrayFields: {
                value: { type: 'text' as const, label: 'Tag' }
              }
            },
            sections: {
              type: 'array' as const,
              label: 'Sections',
              arrayFields: {
                id: { type: 'text' as const, label: 'ID' },
                type: { type: 'text' as const, label: 'Type' },
                title: { type: 'text' as const, label: 'Title' },
                description: { type: 'textarea' as const, label: 'Description' }
              }
            }
          }
        },
        backgroundColor: {
          type: 'select' as const,
          label: 'Background Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f9fafb' },
            { label: 'Custom...', value: '' }
          ]
        },
        textColor: {
          type: 'select' as const,
          label: 'Text Color',
          options: [
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Gray', value: '#6b7280' },
            { label: 'Custom...', value: '' }
          ]
        },
        badgeColor: {
          type: 'select' as const,
          label: 'Badge Color',
          options: [
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Green', value: '#10b981' },
            { label: 'Custom...', value: '' }
          ]
        },
        badgeTextColor: {
          type: 'select' as const,
          label: 'Badge Text Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Custom...', value: '' }
          ]
        },
        buttonColor: {
          type: 'select' as const,
          label: 'Button Color',
          options: [
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Green', value: '#10b981' },
            { label: 'Custom...', value: '' }
          ]
        },
        buttonTextColor: {
          type: 'select' as const,
          label: 'Button Text Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Custom...', value: '' }
          ]
        },
        borderColor: {
          type: 'select' as const,
          label: 'Border Color',
          options: [
            { label: 'Light Gray', value: '#e5e7eb' },
            { label: 'Gray', value: '#d1d5db' },
            { label: 'Custom...', value: '' }
          ]
        },
        borderRadius: {
          type: 'text' as const,
          label: 'Border Radius',
          placeholder: '12px'
        },
        padding: {
          type: 'text' as const,
          label: 'Padding',
          placeholder: '2rem'
        }
      },
      defaultProps: {
        sessionId: '',
        sessions: [],
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        badgeColor: '#3b82f6',
        badgeTextColor: '#ffffff',
        buttonColor: '#3b82f6',
        buttonTextColor: '#ffffff',
        borderColor: '#e5e7eb',
        borderRadius: '12px',
        padding: '2rem'
      },
      render: SessionHighlightWorkshop
    },
    VenueBlock: {
      label: "📍 Venue Block",
      fields: {
        venueName: {
          type: 'text' as const,
          label: 'Venue Name',
          placeholder: 'The Moscone Center',
        },
        address: {
          type: 'text' as const,
          label: 'Address',
          placeholder: '747 Howard St',
        },
        city: {
          type: 'text' as const,
          label: 'City',
          placeholder: 'San Francisco',
        },
        state: {
          type: 'text' as const,
          label: 'State',
          placeholder: 'CA',
        },
        backgroundImage: {
          type: 'text' as const,
          label: 'Background Image URL',
          placeholder: 'https://example.com/image.jpg'
        },
        backgroundColor: {
          type: 'select' as const,
          label: 'Background Color',
          options: [
            { label: 'Dark Blue', value: '#1e3a8a' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Indigo', value: '#6366f1' },
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Custom...', value: '' }
          ]
        },
        textColor: {
          type: 'select' as const,
          label: 'Text Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Custom...', value: '' }
          ]
        },
        badgeColor: {
          type: 'select' as const,
          label: 'Badge Background Color',
          options: [
            { label: 'Semi-transparent White', value: 'rgba(255, 255, 255, 0.2)' },
            { label: 'White', value: '#ffffff' },
            { label: 'Custom...', value: '' }
          ]
        },
        badgeTextColor: {
          type: 'select' as const,
          label: 'Badge Text Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Black', value: '#000000' },
            { label: 'Custom...', value: '' }
          ]
        }
      },
      defaultProps: {
        venueName: 'The Moscone Center',
        address: '747 Howard St',
        city: 'San Francisco',
        state: 'CA',
        backgroundImage: '',
        backgroundColor: '#1e3a8a',
        textColor: '#ffffff',
        badgeColor: 'rgba(255, 255, 255, 0.2)',
        badgeTextColor: '#ffffff'
      },
      render: VenueBlock
    },
    SplitVenueBlock: {
      label: "📍 Split Venue Block",
      fields: {
        heading: {
          type: 'text' as const,
          label: 'Heading',
          placeholder: 'Venue Information',
        },
        imagePosition: {
          type: 'select' as const,
          label: 'Image Position',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' }
          ]
        },
        imageSrc: {
          type: 'text' as const,
          label: 'Image URL',
          placeholder: 'https://example.com/image.jpg'
        },
        venueName: {
          type: 'text' as const,
          label: 'Venue Name',
          placeholder: 'The Moscone Center',
        },
        address: {
          type: 'text' as const,
          label: 'Address',
          placeholder: '747 Howard St',
        },
        city: {
          type: 'text' as const,
          label: 'City',
          placeholder: 'San Francisco',
        },
        state: {
          type: 'text' as const,
          label: 'State',
          placeholder: 'CA',
        },
        description: {
          type: 'textarea' as const,
          label: 'Description',
          placeholder: 'A premier event venue in the heart of the city.',
        },
        backgroundColor: {
          type: 'select' as const,
          label: 'Background Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Custom...', value: '' }
          ]
        },
        textColor: {
          type: 'select' as const,
          label: 'Text Color',
          options: [
            { label: 'Black', value: '#000000' },
            { label: 'Dark Gray', value: '#374151' },
            { label: 'White', value: '#ffffff' },
            { label: 'Custom...', value: '' }
          ]
        },
        headingColor: {
          type: 'text' as const,
          label: 'Heading Color (optional)',
          placeholder: '#000000'
        },
        padding: {
          type: 'text' as const,
          label: 'Padding',
          placeholder: '4rem 2rem'
        }
      },
      defaultProps: {
        heading: 'Venue Information',
        imagePosition: 'left',
        imageSrc: '',
        venueName: 'The Moscone Center',
        address: '747 Howard St',
        city: 'San Francisco',
        state: 'CA',
        description: 'A premier event venue in the heart of the city.',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        headingColor: '',
        padding: '4rem 2rem'
      },
      render: SplitVenueBlock
    },
    HotelPartners: {
      label: "🏨 Hotel Partners",
      fields: {
        title: {
          type: 'text' as const,
          label: 'Title',
          placeholder: 'Official Hotel Partners',
        },
        description: {
          type: 'textarea' as const,
          label: 'Description',
          placeholder: "We've secured exclusive discounted rates for attendees.",
        },
        hotels: {
          type: 'array' as const,
          label: 'Hotels',
          arrayFields: {
            name: {
              type: 'text' as const,
              label: 'Hotel Name',
              placeholder: 'The Grand Hyatt',
            },
            image: {
              type: 'text' as const,
              label: 'Hotel Image URL',
              placeholder: 'https://example.com/hotel.jpg'
            },
            priceLevel: {
              type: 'select' as const,
              label: 'Price Level',
              options: [
                { label: '$', value: '1' },
                { label: '$$', value: '2' },
                { label: '$$$', value: '3' },
                { label: '$$$$', value: '4' },
                { label: '$$$$$', value: '5' }
              ]
            },
            distance: {
              type: 'text' as const,
              label: 'Distance',
              placeholder: '2 min walk to venue',
            },
            distanceType: {
              type: 'select' as const,
              label: 'Distance Type',
              options: [
                { label: 'Walk', value: 'walk' },
                { label: 'Metro', value: 'metro' },
                { label: 'Drive', value: 'drive' }
              ]
            },
            features: {
              type: 'array' as const,
              label: 'Features',
              arrayFields: {
                value: {
                  type: 'text' as const,
                  label: 'Feature',
                  placeholder: 'Free WiFi',
                }
              }
            },
            badge: {
              type: 'text' as const,
              label: 'Badge (optional)',
              placeholder: 'Most Popular',
            },
            link: {
              type: 'text' as const,
              label: 'Booking Link',
              placeholder: 'https://example.com/book'
            }
          },
          getItemSummary: (item: any, index: number) => {
            return item?.name || `Hotel ${index + 1}`;
          }
        },
        backgroundColor: {
          type: 'select' as const,
          label: 'Background Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f9fafb' },
            { label: 'Custom...', value: '' }
          ]
        },
        textColor: {
          type: 'select' as const,
          label: 'Text Color',
          options: [
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Gray', value: '#6b7280' },
            { label: 'Custom...', value: '' }
          ]
        },
        cardBackgroundColor: {
          type: 'select' as const,
          label: 'Card Background Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f9fafb' },
            { label: 'Custom...', value: '' }
          ]
        },
        cardBorderColor: {
          type: 'select' as const,
          label: 'Card Border Color',
          options: [
            { label: 'Light Gray', value: '#e5e7eb' },
            { label: 'Gray', value: '#d1d5db' },
            { label: 'Custom...', value: '' }
          ]
        },
        badgeColor: {
          type: 'select' as const,
          label: 'Badge Color',
          options: [
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Green', value: '#10b981' },
            { label: 'Custom...', value: '' }
          ]
        },
        badgeTextColor: {
          type: 'select' as const,
          label: 'Badge Text Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Custom...', value: '' }
          ]
        },
        priceBadgeColor: {
          type: 'select' as const,
          label: 'Price Badge Color',
          options: [
            { label: 'Yellow', value: '#fbbf24' },
            { label: 'Orange', value: '#f97316' },
            { label: 'Custom...', value: '' }
          ]
        },
        buttonColor: {
          type: 'select' as const,
          label: 'Button Color',
          options: [
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Green', value: '#10b981' },
            { label: 'Custom...', value: '' }
          ]
        },
        buttonTextColor: {
          type: 'select' as const,
          label: 'Button Text Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Custom...', value: '' }
          ]
        },
        padding: {
          type: 'text' as const,
          label: 'Padding',
          placeholder: '4rem 2rem'
        },
        gap: {
          type: 'text' as const,
          label: 'Gap Between Cards',
          placeholder: '2rem'
        }
      },
      defaultProps: {
        title: 'Official Hotel Partners',
        description: "We've secured exclusive discounted rates for attendees. Book by Oct 1st to guarantee availability.",
        hotels: [
          {
            id: '1',
            name: 'The Grand Hyatt',
            image: '',
            priceLevel: '3',
            distance: '2 min walk to venue',
            distanceType: 'walk',
            features: ['Rooftop Bar', 'Free WiFi', '24h Gym'],
            badge: '',
            link: ''
          },
          {
            id: '2',
            name: 'Marriott Marquis',
            image: '',
            priceLevel: '2',
            distance: '5 min walk to venue',
            distanceType: 'walk',
            features: ['Included Breakfast', 'Coworking Space', 'Late Checkout'],
            badge: 'Most Popular',
            link: ''
          },
          {
            id: '3',
            name: 'CitizenM',
            image: '',
            priceLevel: '1',
            distance: '2 stops via Metro',
            distanceType: 'metro',
            features: ['Modern Pods', 'Smart Controls', '24h Canteen'],
            badge: '',
            link: ''
          }
        ],
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        cardBackgroundColor: '#ffffff',
        cardBorderColor: '#e5e7eb',
        badgeColor: '#3b82f6',
        badgeTextColor: '#ffffff',
        priceBadgeColor: '#fbbf24',
        buttonColor: '#3b82f6',
        buttonTextColor: '#ffffff',
        padding: '4rem 2rem',
        gap: '2rem'
      },
      render: HotelPartners
    },
    VenueDirections: {
      label: "🗺️ Venue Directions",
      resolveData: (item: any, { trigger }: any) => {
        const defaultDirections = [
          {
            id: '1',
            title: 'By Air',
            description:
              'Fly into SFO (San Francisco International). The venue is a 20-minute drive or 30-minute BART ride from the airport.',
            icon: '✈️'
          },
          {
            id: '2',
            title: 'Public Transit (BART)',
            description:
              'Take the Yellow Line to Powell Street Station. The Moscone Center is a short 5-minute walk down 4th Street.',
            icon: '🚇'
          },
          {
            id: '3',
            title: 'Parking',
            description:
              'Underground parking is available at the venue garage (Entrance on 3rd St). Daily max rate is $35. Valet available for VIPs.',
            icon: '🚗'
          }
        ]

        // Populate directions once so they show in the property sidebar (editable).
        // This also fixes older pages where directions were saved as [].
        if (!item?.props?.__directionsInitialized) {
          const dirs = Array.isArray(item?.props?.directions) ? item.props.directions : []
          const shouldInit = dirs.length === 0 && (trigger === 'insert' || trigger === 'load' || trigger === 'replace' || trigger === 'force')
          if (shouldInit) {
            return {
              props: {
                ...item.props,
                directions: defaultDirections,
                __directionsInitialized: true
              }
            }
          }
          return { props: { ...item.props, __directionsInitialized: true } }
        }

        return { props: item.props }
      },
      fields: {
        title: {
          type: 'text' as const,
          label: 'Title',
          placeholder: 'How to Get Here',
        },
        titleColor: {
          type: 'text' as const,
          label: 'Title Color (hex)',
          placeholder: '#1f2937'
        },
        titleSize: {
          type: 'select' as const,
          label: 'Title Size (3 options)',
          options: [
            { label: 'Size 1 (small)', value: 1 },
            { label: 'Size 2 (medium)', value: 2 },
            { label: 'Size 3 (large)', value: 3 }
          ]
        },
        mapUrl: {
          type: 'text' as const,
          label: 'Map URL / Location',
          placeholder: 'Paste a Google Maps link (or type an address/place)'
        },
        mapEmbedUrl: {
          type: 'text' as const,
          label: 'Google Maps Embed URL',
          placeholder: 'https://www.google.com/maps/embed?pb=... (or paste full <iframe> embed code)'
        },
        mapImageUrl: {
          type: 'text' as const,
          label: 'Map Image URL (optional)',
          placeholder: 'https://example.com/map.jpg'
        },
        mapPlaceholder: {
          type: 'textarea' as const,
          label: 'Map Placeholder Text',
          placeholder: 'Interactive Map Component'
        },
        entranceTitle: {
          type: 'text' as const,
          label: 'Entrance Title',
          placeholder: 'Main Entrance (South Hall)',
        },
        entranceTitleColor: {
          type: 'text' as const,
          label: 'Entrance Title Color (hex)',
          placeholder: '#1f2937'
        },
        entranceDescription: {
          type: 'textarea' as const,
          label: 'Entrance Description',
          placeholder: 'Best drop-off point for Uber/Lyft.',
        },
        entranceLinkText: {
          type: 'text' as const,
          label: 'Entrance Link Text',
          placeholder: 'Get Directions',
        },
        entranceLinkUrl: {
          type: 'text' as const,
          label: 'Entrance Link URL',
          placeholder: 'https://maps.google.com/...'
        },
        directionTitleColor: {
          type: 'text' as const,
          label: 'Direction Title Color (hex)',
          placeholder: '#1f2937'
        },
        directionTextColor: {
          type: 'text' as const,
          label: 'Direction Text Color (hex)',
          placeholder: '#1f2937'
        },
        directions: {
          type: 'array' as const,
          label: 'Directions',
          arrayFields: {
            title: {
              type: 'text' as const,
              label: 'Title',
              placeholder: 'By Air',
            },
            description: {
              type: 'textarea' as const,
              label: 'Description',
              placeholder: 'Fly into SFO...',
            },
            icon: {
              type: 'text' as const,
              label: 'Icon (emoji)',
              placeholder: '✈️'
            }
          },
          getItemSummary: (item: any, index: number) => {
            return item?.title || `Direction ${index + 1}`;
          }
        },
        backgroundColor: {
          type: 'text' as const,
          label: 'Background Color (hex)',
          placeholder: '#f9fafb'
        },
        textColor: {
          type: 'text' as const,
          label: 'Text Color (hex)',
          placeholder: '#1f2937'
        },
        buttonColor: {
          type: 'text' as const,
          label: 'Button Color (hex)',
          placeholder: '#3b82f6'
        },
        buttonTextColor: {
          type: 'text' as const,
          label: 'Button Text Color (hex)',
          placeholder: '#ffffff'
        },
        openMapsUrl: {
          type: 'text' as const,
          label: 'Open Maps Link URL (optional)',
          placeholder: 'https://www.google.com/maps/search/?api=1&query=...'
        },
        openMapsText: {
          type: 'text' as const,
          label: 'Open Maps Button Text',
          placeholder: 'Open in Maps'
        },
        openMapsButtonColor: {
          type: 'text' as const,
          label: 'Open Maps Button Color (hex)',
          placeholder: '#3b82f6'
        },
        openMapsButtonTextColor: {
          type: 'text' as const,
          label: 'Open Maps Button Text Color (hex)',
          placeholder: '#ffffff'
        }
      },
      defaultProps: {
        title: 'How to Get Here',
        titleColor: '#1f2937',
        titleSize: 2,
        mapUrl: '',
        mapEmbedUrl: '',
        mapPlaceholder: '',
        entranceTitle: 'Main Entrance (South Hall)',
        entranceTitleColor: '#1f2937',
        entranceDescription: 'Best drop-off point for Uber/Lyft.',
        entranceLinkText: 'Get Directions',
        entranceLinkUrl: '',
        directions: [
          {
            id: '1',
            title: 'By Air',
            description:
              'Fly into SFO (San Francisco International). The venue is a 20-minute drive or 30-minute BART ride from the airport.',
            icon: '✈️'
          },
          {
            id: '2',
            title: 'Public Transit (BART)',
            description:
              'Take the Yellow Line to Powell Street Station. The Moscone Center is a short 5-minute walk down 4th Street.',
            icon: '🚇'
          },
          {
            id: '3',
            title: 'Parking',
            description:
              'Underground parking is available at the venue garage (Entrance on 3rd St). Daily max rate is $35. Valet available for VIPs.',
            icon: '🚗'
          }
        ],
        __directionsInitialized: true,
        directionTitleColor: '#1f2937',
        directionTextColor: '#1f2937',
        backgroundColor: '#f9fafb',
        textColor: '#1f2937',
        buttonColor: '#3b82f6',
        buttonTextColor: '#ffffff',
        openMapsUrl: '',
        openMapsText: 'Open in Maps',
        openMapsButtonColor: '#3b82f6',
        openMapsButtonTextColor: '#ffffff'
      },
      render: VenueDirections
    },
    LocationFloorPlan: {
      label: "📄 PDF/Image Download",
      fields: {
        title: {
          type: 'text' as const,
          label: 'Title',
          placeholder: 'Level 1: Conference Hall',
          contentEditable: true
        },
        subtitle: {
          type: 'text' as const,
          label: 'Subtitle',
          placeholder: 'Overview of the venue layout',
          contentEditable: true
        },
        pdfUrl: {
          type: 'text' as const,
          label: 'PDF URL',
          placeholder: 'https://example.com/floor-plan.pdf'
        },
        imageUrl: {
          type: 'text' as const,
          label: 'Image URL (JPG/PNG)',
          placeholder: 'https://example.com/floor-plan.jpg'
        },
        backgroundColor: {
          type: 'text' as const,
          label: 'Background Color (hex)',
          placeholder: '#ffffff'
        },
        textColor: {
          type: 'text' as const,
          label: 'Text Color (hex)',
          placeholder: '#1f2937'
        },
        cardBackgroundColor: {
          type: 'text' as const,
          label: 'Card Background Color (hex)',
          placeholder: '#ffffff'
        },
        height: {
          type: 'number' as const,
          label: 'Viewer height (px)',
          placeholder: '600'
        }
      },
      defaultProps: {
        title: 'Level 1: Conference Hall',
        subtitle: 'Overview of the venue layout',
        pdfUrl: '',
        imageUrl: '',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        cardBackgroundColor: '#ffffff',
        height: 600
      },
      render: LocationFloorPlan
    },
    GridBlock: {
      label: "📊 Grid Block",
      fields: {
        title: {
          type: 'text' as const,
          label: 'Section Title (optional)',
          placeholder: 'Featured Content',
        },
        itemTitleAlign: {
          type: 'select' as const,
          label: 'Grid Item Title Alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' }
          ]
        },
        itemTitleColor: {
          type: 'text' as const,
          label: 'Grid Item Title Color (hex)',
          placeholder: '#1f2937'
        },
        layout: {
          type: 'select' as const,
          label: 'Grid Layout',
          options: [
            { label: '1 Column', value: '1' },
            { label: '2 Columns (2x1)', value: '2x1' },
            { label: '2 Columns (2x2)', value: '2x2' },
            { label: '3 Columns (2x3)', value: '2x3' }
          ]
        },
        items: {
          type: 'array' as const,
          label: 'Grid Items',
          arrayFields: {
            image: {
              type: 'text' as const,
              label: 'Image URL',
              placeholder: 'https://example.com/image.jpg'
            },
            title: {
              type: 'text' as const,
              label: 'Title',
              placeholder: 'The Design',
            },
            text: {
              type: 'textarea' as const,
              label: 'Description',
              placeholder: 'CSS frameworks like Tailwind allow for rapid prototyping...',
            },
            link: {
              type: 'text' as const,
              label: 'Link URL',
              placeholder: 'https://example.com'
            },
            linkText: {
              type: 'text' as const,
              label: 'Link Text',
              placeholder: 'Visit Link',
            }
          },
          getItemSummary: (item: any, index: number) => {
            return item?.title || `Item ${index + 1}`;
          }
        },
        backgroundColor: {
          type: 'select' as const,
          label: 'Background Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f9fafb' },
            { label: 'Custom...', value: '' }
          ]
        },
        textColor: {
          type: 'select' as const,
          label: 'Text Color',
          options: [
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Gray', value: '#6b7280' },
            { label: 'Custom...', value: '' }
          ]
        },
        cardBackgroundColor: {
          type: 'select' as const,
          label: 'Card Background Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f9fafb' },
            { label: 'Custom...', value: '' }
          ]
        },
        cardBorderColor: {
          type: 'select' as const,
          label: 'Card Border Color',
          options: [
            { label: 'Light Gray', value: '#e5e7eb' },
            { label: 'Gray', value: '#d1d5db' },
            { label: 'Custom...', value: '' }
          ]
        },
        linkColor: {
          type: 'select' as const,
          label: 'Link Color',
          options: [
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Green', value: '#10b981' },
            { label: 'Custom...', value: '' }
          ]
        },
        padding: {
          type: 'text' as const,
          label: 'Padding',
          placeholder: '4rem 2rem'
        },
        gap: {
          type: 'text' as const,
          label: 'Gap Between Items',
          placeholder: '1.5rem'
        },
        imageHeight: {
          type: 'text' as const,
          label: 'Image Height',
          placeholder: '200px'
        }
      },
      defaultProps: {
        title: '',
        itemTitleAlign: 'left',
        itemTitleColor: '',
        layout: '2x2',
        items: [
          {
            id: '1',
            image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
            title: 'The Design',
            text: 'CSS frameworks like Tailwind allow for rapid prototyping without leaving your HTML file.',
            link: '#',
            linkText: 'Visit Tailwind'
          },
          {
            id: '2',
            image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=600&fit=crop',
            title: 'Modern Development',
            text: 'Build responsive layouts quickly with modern CSS utilities and component libraries.',
            link: '#',
            linkText: 'Learn More'
          },
          {
            id: '3',
            image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop',
            title: 'Creative Solutions',
            text: 'Discover innovative approaches to building user interfaces that are both beautiful and functional.',
            link: '#',
            linkText: 'Explore More'
          },
          {
            id: '4',
            image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=600&fit=crop',
            title: 'Best Practices',
            text: 'Learn from industry experts about modern web development techniques and design patterns.',
            link: '#',
            linkText: 'Read Article'
          }
        ],
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        cardBackgroundColor: '#ffffff',
        cardBorderColor: '#e5e7eb',
        linkColor: '#3b82f6',
        padding: '4rem 2rem',
        gap: '1.5rem',
        imageHeight: '200px'
      },
      render: GridBlock
    },
    Article: {
      label: "📰 Article",
      fields: {
        sections: {
          type: 'custom' as const,
          label: 'Sections',
          render: (props: any) => {
            return React.createElement(ArticleSectionsField, {
              ...props,
              value: props.value || [],
              onChange: props.onChange
            })
          },
        },
        backgroundColor: {
          type: 'select' as const,
          label: 'Background Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f9fafb' },
            { label: 'Custom...', value: '' }
          ]
        },
        textColor: {
          type: 'select' as const,
          label: 'Text Color',
          options: [
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Gray', value: '#6b7280' },
            { label: 'Custom...', value: '' }
          ]
        },
        linkColor: {
          type: 'select' as const,
          label: 'Link Color',
          options: [
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Green', value: '#10b981' },
            { label: 'Custom...', value: '' }
          ]
        },
        maxWidth: {
          type: 'text' as const,
          label: 'Max Width',
          placeholder: '800px'
        }
      },
      defaultProps: {
        sections: [
          {
            id: '1',
            type: 'heading',
            heading: 'The Art of Structured Content: Building Better Web Pages'
          },
          {
            id: '2',
            type: 'paragraph',
            paragraph: 'Creating a web page is more than just throwing text onto a screen. It requires a hierarchy, visual breaks, and meaningful connections. This paragraph represents your standard introduction text. It sets the stage for what the user is about to read.\n\nIn this template, we explore how to mix internal in-app links with standard text to create a seamless navigation experience. We also look at how typography affects readability.'
          },
          {
            id: '3',
            type: 'image',
            imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
            imageHeight: '400px'
          },
          {
            id: '4',
            type: 'links',
            links: [
              {
                id: 'link-1',
                label: 'Learn More',
                url: '#',
                openInNewTab: false
              },
              {
                id: 'link-2',
                label: 'Read Documentation',
                url: 'https://example.com',
                openInNewTab: true
              }
            ],
            linkDisplayStyle: 'list'
          }
        ],
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        linkColor: '#3b82f6',
        maxWidth: '800px'
      },
      render: Article
    },
    Table: {
      label: "📊 Table",
      resolveFields: ({ props }: any) => {
        const slugify = (input: string) =>
          input
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')

        const defaultCols = [
          { id: 'title', label: 'Title', align: 'left' },
          { id: 'refNumber', label: 'Ref. Number', align: 'left' },
          { id: 'author', label: 'Author', align: 'left' },
          { id: 'link', label: 'Link', align: 'left' },
        ]

        const cols = Array.isArray(props?.columns) && props.columns.length > 0 ? props.columns : defaultCols
        const rowFields: Record<string, any> = {}

        for (const [i, col] of cols.entries()) {
          const label = String(col?.label || '').trim()
          let colId = String(col?.id || '').trim()
          // If user only filled Column Label (e.g. "Year") but not ID, derive a stable id.
          if (!colId && label) colId = slugify(label)
          if (!colId) colId = `col_${i + 1}`
          if (!colId || colId === 'serial') continue
          if (colId === 'link') {
            rowFields.link = {
              type: 'text' as const,
              label: 'Link URL',
              placeholder: 'https://example.com or /page-path',
            }
            rowFields.linkText = {
              type: 'text' as const,
              label: 'Link Text',
              placeholder: 'View',
            }
            continue
          }
          rowFields[colId] = {
            type: 'text' as const,
            label: String(label || colId),
            placeholder: `Enter ${String(label || colId)}...`,
          }
        }

        return {
          title: {
            type: 'text' as const,
            label: 'Table Title',
            placeholder: 'Related Publishing Materials',
          },
          titleColor: {
            type: 'text' as const,
            label: 'Title Color (hex)',
            placeholder: '#1f2937'
          },
          titleAlign: {
            type: 'select' as const,
            label: 'Title Alignment',
            options: [
              { label: 'Left', value: 'left' },
              { label: 'Center', value: 'center' },
              { label: 'Right', value: 'right' }
            ]
          },
          description: {
            type: 'textarea' as const,
            label: 'Subtitle / Description',
            placeholder: 'A list of technical documents and standards referenced in this guide.',
          },
          descriptionColor: {
            type: 'text' as const,
            label: 'Subtitle Color (hex)',
            placeholder: '#6b7280'
          },
          descriptionAlign: {
            type: 'select' as const,
            label: 'Subtitle Alignment',
            options: [
              { label: 'Left', value: 'left' },
              { label: 'Center', value: 'center' },
              { label: 'Right', value: 'right' }
            ]
          },
          descriptionSize: {
            type: 'select' as const,
            label: 'Subtitle Size (3 options)',
            options: [
              { label: 'Size 1 (small)', value: 1 },
              { label: 'Size 2 (medium)', value: 2 },
              { label: 'Size 3 (large)', value: 3 }
            ]
          },
          columns: {
            type: 'array' as const,
            label: 'Table Columns',
            arrayFields: {
              id: {
                type: 'text' as const,
                label: 'Column ID',
                placeholder: 'year'
              },
              label: {
                type: 'text' as const,
                label: 'Column Label',
                placeholder: 'Year',
              },
              align: {
                type: 'select' as const,
                label: 'Alignment',
                options: [
                  { label: 'Left', value: 'left' },
                  { label: 'Center', value: 'center' },
                  { label: 'Right', value: 'right' }
                ]
              }
            },
            getItemSummary: (item: any, index: number) => {
              return item?.label || item?.id || `Column ${index + 1}`
            }
          },
          rows: {
            type: 'array' as const,
            label: 'Table Rows',
            arrayFields: rowFields,
            getItemSummary: (item: any, index: number) => {
              return item?.title || `Row ${index + 1}`
            }
          },
          showSerialNumber: {
            type: 'radio' as const,
            label: 'Show Serial Number',
            options: [
              { label: 'Yes', value: true },
              { label: 'No', value: false }
            ]
          },
          backgroundColor: {
            type: 'select' as const,
            label: 'Background Color',
            options: [
              { label: 'White', value: '#ffffff' },
              { label: 'Light Gray', value: '#f9fafb' },
              { label: 'Custom...', value: '' }
            ]
          },
          headerBackgroundColor: {
            type: 'select' as const,
            label: 'Header Background Color',
            options: [
              { label: 'Light Gray', value: '#f9fafb' },
              { label: 'Gray', value: '#f3f4f6' },
              { label: 'Custom...', value: '' }
            ]
          },
          headerTextColor: {
            type: 'select' as const,
            label: 'Header Text Color',
            options: [
              { label: 'Dark Gray', value: '#1f2937' },
              { label: 'Black', value: '#000000' },
              { label: 'Custom...', value: '' }
            ]
          },
          textColor: {
            type: 'select' as const,
            label: 'Text Color',
            options: [
              { label: 'Dark Gray', value: '#1f2937' },
              { label: 'Gray', value: '#6b7280' },
              { label: 'Custom...', value: '' }
            ]
          },
          borderColor: {
            type: 'select' as const,
            label: 'Border Color',
            options: [
              { label: 'Light Gray', value: '#e5e7eb' },
              { label: 'Gray', value: '#d1d5db' },
              { label: 'Custom...', value: '' }
            ]
          },
          linkColor: {
            type: 'select' as const,
            label: 'Link Color',
            options: [
              { label: 'Blue', value: '#3b82f6' },
              { label: 'Purple', value: '#6938EF' },
              { label: 'Green', value: '#10b981' },
              { label: 'Custom...', value: '' }
            ]
          },
          padding: {
            type: 'text' as const,
            label: 'Padding',
            placeholder: '3rem 2rem'
          },
          maxWidth: {
            type: 'text' as const,
            label: 'Max Width',
            placeholder: '100%'
          }
        }
      },
      resolveData: ({ props }: any) => {
        const slugify = (input: string) =>
          input
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')

        const columns = Array.isArray(props?.columns) ? props.columns : []
        const normalizedColumns = columns.map((c: any, i: number) => {
          const label = String(c?.label || '').trim()
          let id = String(c?.id || '').trim()
          if (!id && label) id = slugify(label)
          if (!id) id = `col_${i + 1}`
          return { ...c, id }
        })

        const colIds = normalizedColumns
          .map((c: any) => String(c?.id || '').trim())
          .filter((id: string) => id && id !== 'serial')

        const rows = Array.isArray(props?.rows) ? props.rows : []
        const normalizedRows = rows.map((r: any) => {
          const next = { ...r }
          for (const id of colIds) {
            if (id === 'link') {
              if (next.link === undefined) next.link = ''
              if (next.linkText === undefined) next.linkText = 'View'
              continue
            }
            if (next[id] === undefined) next[id] = ''
          }
          return next
        })

        return {
          ...props,
          columns: normalizedColumns,
          rows: normalizedRows,
        }
      },
      fields: {
        title: {
          type: 'text' as const,
          label: 'Table Title',
          placeholder: 'Related Publishing Materials',
        },
        description: {
          type: 'textarea' as const,
          label: 'Description',
          placeholder: 'A list of technical documents and standards referenced in this guide.',
        },
        columns: {
          type: 'array' as const,
          label: 'Table Columns',
          arrayFields: {
            id: {
              type: 'text' as const,
              label: 'Column ID',
              placeholder: 'title'
            },
            label: {
              type: 'text' as const,
              label: 'Column Label',
              placeholder: 'Title',
            },
            align: {
              type: 'select' as const,
              label: 'Alignment',
              options: [
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' }
              ]
            }
          },
          getItemSummary: (item: any, index: number) => {
            return item?.label || item?.id || `Column ${index + 1}`
          }
        },
        rows: {
          type: 'array' as const,
          label: 'Table Rows',
          arrayFields: {
            title: {
              type: 'text' as const,
              label: 'Title',
              placeholder: 'Digital Typography Standards',
            },
            refNumber: {
              type: 'text' as const,
              label: 'Ref. Number',
              placeholder: 'PUB-2023-A1'
            },
            author: {
              type: 'text' as const,
              label: 'Author',
              placeholder: 'W3C Working Group',
            },
            link: {
              type: 'text' as const,
              label: 'Link URL',
              placeholder: 'https://example.com or /page-path'
            },
            linkText: {
              type: 'text' as const,
              label: 'Link Text',
              placeholder: 'View',
            }
          },
          getItemSummary: (item: any, index: number) => {
            return item?.title || `Row ${index + 1}`
          }
        },
        showSerialNumber: {
          type: 'radio' as const,
          label: 'Show Serial Number',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false }
          ]
        },
        backgroundColor: {
          type: 'select' as const,
          label: 'Background Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f9fafb' },
            { label: 'Custom...', value: '' }
          ]
        },
        headerBackgroundColor: {
          type: 'select' as const,
          label: 'Header Background Color',
          options: [
            { label: 'Light Gray', value: '#f9fafb' },
            { label: 'Gray', value: '#f3f4f6' },
            { label: 'Custom...', value: '' }
          ]
        },
        headerTextColor: {
          type: 'select' as const,
          label: 'Header Text Color',
          options: [
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Black', value: '#000000' },
            { label: 'Custom...', value: '' }
          ]
        },
        textColor: {
          type: 'select' as const,
          label: 'Text Color',
          options: [
            { label: 'Dark Gray', value: '#1f2937' },
            { label: 'Gray', value: '#6b7280' },
            { label: 'Custom...', value: '' }
          ]
        },
        borderColor: {
          type: 'select' as const,
          label: 'Border Color',
          options: [
            { label: 'Light Gray', value: '#e5e7eb' },
            { label: 'Gray', value: '#d1d5db' },
            { label: 'Custom...', value: '' }
          ]
        },
        linkColor: {
          type: 'select' as const,
          label: 'Link Color',
          options: [
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Purple', value: '#6938EF' },
            { label: 'Green', value: '#10b981' },
            { label: 'Custom...', value: '' }
          ]
        },
        // (fields are dynamically resolved above via resolveFields)
        padding: {
          type: 'text' as const,
          label: 'Padding',
          placeholder: '3rem 2rem'
        },
        maxWidth: {
          type: 'text' as const,
          label: 'Max Width',
          placeholder: '100%'
        }
      },
      defaultProps: {
        title: 'Related Publishing Materials',
        description: 'A list of technical documents and standards referenced in this guide.',
        titleAlign: 'left',
        descriptionAlign: 'left',
        descriptionSize: 2,
        titleColor: '#1f2937',
        descriptionColor: '#6b7280',
        columns: [
          { id: 'title', label: 'Title', align: 'left' },
          { id: 'refNumber', label: 'Ref. Number', align: 'left' },
          { id: 'author', label: 'Author', align: 'left' },
          { id: 'link', label: 'Link', align: 'left' }
        ],
        rows: [
          {
            id: '1',
            title: 'Digital Typography Standards',
            refNumber: 'PUB-2023-A1',
            author: 'W3C Working Group',
            link: '#',
            linkText: 'View'
          },
          {
            id: '2',
            title: 'Semantic HTML Structure Guide',
            refNumber: 'HTML-5.3-REF',
            author: 'Jane Doe',
            link: '#',
            linkText: 'Download'
          },
          {
            id: '3',
            title: 'Accessibility in Modern Web',
            refNumber: 'WCAG-2.1-AA',
            author: 'A11y Alliance',
            link: '#',
            linkText: 'View'
          },
          {
            id: '4',
            title: 'Responsive Layout Patterns',
            refNumber: 'CSS-GRID-09',
            author: 'Rachel Andrew',
            link: '#',
            linkText: 'View'
          }
        ],
        showSerialNumber: true,
        backgroundColor: '#ffffff',
        headerBackgroundColor: '#f9fafb',
        headerTextColor: '#1f2937',
        textColor: '#1f2937',
        borderColor: '#e5e7eb',
        linkColor: '#3b82f6',
        padding: '3rem 2rem',
        maxWidth: '100%'
      },
      render: Table
    },
    FeedbackForm: {
      label: "📝 Feedback Form",
      fields: {
        title: {
          type: 'text' as const,
          label: 'Form Title',
          placeholder: 'attendee Feedback',
          contentEditable: true
        },
        subtitle: {
          type: 'text' as const,
          label: 'Form Subtitle',
          placeholder: 'We value your opinion! Please take a moment to share your thoughts about our event.',
          contentEditable: true
        },
        backgroundColor: {
          type: 'text' as const,
          label: 'Background Color',
          placeholder: '#ffffff'
        },
        textColor: {
          type: 'text' as const,
          label: 'Text Color',
          placeholder: '#333333'
        },
        padding: {
          type: 'select' as const,
          label: 'Padding',
          options: [
            { label: 'Small (1rem)', value: '1rem' },
            { label: 'Medium (2rem)', value: '2rem' },
            { label: 'Large (3rem)', value: '3rem' },
            { label: 'Extra Large (4rem)', value: '4rem' }
          ]
        }
      },
      defaultProps: {
        title: 'Attendee Feedback',
        subtitle: 'We value your opinion! Please take a moment to share your thoughts about our event.',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        padding: '2rem'
      },
      render: FeedbackForm
    },
    Navigation: {
      label: "🧭 Navigation",
      fields: {
        logo: {
          type: 'text' as const,
          label: 'Logo URL',
          placeholder: 'https://example.com/logo.png',
          contentEditable: true
        },
        logoText: {
          type: 'text' as const,
          label: 'Logo Text',
          placeholder: 'Your Brand',
          contentEditable: true
        },
        menuItems: {
          type: 'text' as const,
          label: 'Menu Items',
          placeholder: 'About|/about,Speakers|/speakers,Schedule|/schedule,Information|/information,Contact|/contact,Register|/register',
          contentEditable: true
        },
        backgroundColor: {
          type: 'select' as const,
          label: 'Background Color',
          options: [
            { label: 'Dark Purple', value: '#27115F' },
            { label: 'Purple', value: '#4A154B' },
            { label: 'Blue', value: '#1e40af' },
            { label: 'Dark Blue', value: '#1e3a8a' },
            { label: 'Black', value: '#000000' },
            { label: 'Dark Gray', value: '#374151' },
            { label: 'Custom', value: 'custom' }
          ]
        },
        customBackgroundColor: {
          type: 'text' as const,
          label: 'Custom Background Color (hex)',
          placeholder: '#27115F'
        },
        textColor: {
          type: 'select' as const,
          label: 'Text Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Custom', value: 'custom' }
          ]
        },
        customTextColor: {
          type: 'text' as const,
          label: 'Custom Text Color (hex)',
          placeholder: '#ffffff'
        },
        logoColor: {
          type: 'select' as const,
          label: 'Logo Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Custom', value: 'custom' }
          ]
        },
        customLogoColor: {
          type: 'text' as const,
          label: 'Custom Logo Color (hex)',
          placeholder: '#ffffff'
        },
        linkColor: {
          type: 'select' as const,
          label: 'Link Color',
          options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#f3f4f6' },
            { label: 'Custom', value: 'custom' }
          ]
        },
        customLinkColor: {
          type: 'text' as const,
          label: 'Custom Link Color (hex)',
          placeholder: '#ffffff'
        },
        hoverColor: {
          type: 'select' as const,
          label: 'Hover Color',
          options: [
            { label: 'Light Gray', value: '#E0E0E0' },
            { label: 'Light Purple', value: '#8b5cf6' },
            { label: 'Blue', value: '#3b82f6' },
            { label: 'Custom', value: 'custom' }
          ]
        },
        customHoverColor: {
          type: 'text' as const,
          label: 'Custom Hover Color (hex)',
          placeholder: '#E0E0E0'
        },
        padding: {
          type: 'select' as const,
          label: 'Padding',
          options: [
            { label: 'Small (0.5rem 1rem)', value: '0.5rem 1rem' },
            { label: 'Medium (1rem 2rem)', value: '1rem 2rem' },
            { label: 'Large (1.5rem 3rem)', value: '1.5rem 3rem' },
            { label: 'Custom', value: 'custom' }
          ]
        },
        customPadding: {
          type: 'text' as const,
          label: 'Custom Padding',
          placeholder: '1rem 2rem'
        },
        alignment: {
          type: 'select' as const,
          label: 'Alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' }
          ]
        }
      },
      defaultProps: {
        logo: 'https://via.placeholder.com/40x40/007bff/ffffff?text=L',
        logoText: 'EventPro',
        menuItems: 'About|/about,Speakers|/speakers,Schedule|/schedule,Information|/information,Contact|/contact,Register|/register',
        backgroundColor: '#27115F',
        customBackgroundColor: '#27115F',
        textColor: '#ffffff',
        customTextColor: '#ffffff',
        logoColor: '#ffffff',
        customLogoColor: '#ffffff',
        linkColor: '#ffffff',
        customLinkColor: '#ffffff',
        hoverColor: '#E0E0E0',
        customHoverColor: '#E0E0E0',
        padding: '1rem 2rem',
        customPadding: '1rem 2rem',
        alignment: 'left'
      },
      render: Navigation
    },
    CountdownTimer: {
      label: "⏰ Countdown Timer",
      fields: {
        heading: {
          type: 'text' as const,
          label: 'Heading',
          placeholder: 'Abstract submission deadline in',
          contentEditable: true
        },
        targetDate: {
          type: 'text' as const,
          label: 'Target Date & Time',
          placeholder: '2024-12-31T23:59:59',
          contentEditable: true
        }
      },
      defaultProps: {
        heading: 'Abstract submission deadline in',
        targetDate: '2025-12-31T23:59:59'
      },
      render: CountdownTimer
    },
    ProgressCircleStats: {
      label: "📊 Progress Circle Stats",
      fields: {
        item1Value: {
          type: 'number' as const,
          label: 'Item 1 - Percentage (0-100)',
          min: 0,
          max: 100
        },
        item1Color: {
          type: 'text' as const,
          label: 'Item 1 - Color',
          placeholder: '#3b82f6'
        },
        item1Caption: {
          type: 'text' as const,
          label: 'Item 1 - Caption',
          placeholder: 'Found the event useful for their professional career development.',
          contentEditable: true
        },
        item2Value: {
          type: 'number' as const,
          label: 'Item 2 - Percentage (0-100)',
          min: 0,
          max: 100
        },
        item2Color: {
          type: 'text' as const,
          label: 'Item 2 - Color',
          placeholder: '#10b981'
        },
        item2Caption: {
          type: 'text' as const,
          label: 'Item 2 - Caption',
          placeholder: 'Reported that the congress met their educational goals and learning expectations.',
          contentEditable: true
        },
        item3Value: {
          type: 'number' as const,
          label: 'Item 3 - Percentage (0-100)',
          min: 0,
          max: 100
        },
        item3Color: {
          type: 'text' as const,
          label: 'Item 3 - Color',
          placeholder: '#f59e0b'
        },
        item3Caption: {
          type: 'text' as const,
          label: 'Item 3 - Caption',
          placeholder: 'Agreed that the information presented was well-balanced and supported by scientific evidence.',
          contentEditable: true
        }
      },
      defaultProps: {
        item1Value: 96.5,
        item1Color: '#3b82f6',
        item1Caption: 'Found the event useful for their professional career development.',
        item2Value: 97.4,
        item2Color: '#10b981',
        item2Caption: 'Reported that the congress met their educational goals and learning expectations.',
        item3Value: 99.3,
        item3Color: '#f59e0b',
        item3Caption: 'Agreed that the information presented was well-balanced and supported by scientific evidence.'
      },
      render: ProgressCircleStats
    },
    HeroVideo: {
      label: "🎬 Hero Video",
      fields: {
        videoUrl: {
          type: 'text' as const,
          label: 'Video URL',
          placeholder: 'Direct video (.mp4, .webm) or Pexels/YouTube/Vimeo page URL',
          contentEditable: true
        },
        title: {
          type: 'text' as const,
          label: 'Title',
          contentEditable: true
        },
        subtitle: {
          type: 'text' as const,
          label: 'Subtitle',
          contentEditable: true
        },
        textColor: {
          type: 'text' as const,
          label: 'Text Color',
          placeholder: '#ffffff'
        },
        titleSize: {
          type: 'select' as const,
          label: 'Title Size',
          options: [
            { label: 'XXXL', value: 'XXXL' },
            { label: 'XXL', value: 'XXL' },
            { label: 'XL', value: 'XL' },
            { label: 'L', value: 'L' },
            { label: 'M', value: 'M' },
            { label: 'S', value: 'S' },
            { label: 'XS', value: 'XS' }
          ]
        },
        subtitleSize: {
          type: 'select' as const,
          label: 'Subtitle Size',
          options: [
            { label: 'XL', value: 'XL' },
            { label: 'L', value: 'L' },
            { label: 'M', value: 'M' },
            { label: 'S', value: 'S' },
            { label: 'XS', value: 'XS' }
          ]
        },
        buttonText: {
          type: 'text' as const,
          label: 'Button Text',
          contentEditable: true
        },
        buttonLink: {
          type: 'text' as const,
          label: 'Button Link',
          placeholder: '/register',
          contentEditable: true
        },
        buttonColor: {
          type: 'text' as const,
          label: 'Button Color',
          placeholder: '#007bff'
        },
        buttonTextColor: {
          type: 'text' as const,
          label: 'Button Text Color',
          placeholder: '#ffffff'
        },
        buttonSize: {
          type: 'select' as const,
          label: 'Button Size',
          options: [
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' }
          ]
        },
        alignment: {
          type: 'select' as const,
          label: 'Text Alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' }
          ]
        },
        height: {
          type: 'text' as const,
          label: 'Height',
          placeholder: '500px'
        }
      },
      defaultProps: {
        videoUrl: '',
        title: 'Welcome to Our Event',
        subtitle: 'Join us for an amazing experience with industry leaders and innovative solutions',
        buttonText: 'Register Now',
        buttonLink: '/register',
        textColor: '#ffffff',
        titleSize: 'XL',
        subtitleSize: 'L',
        buttonColor: '#007bff',
        buttonTextColor: '#ffffff',
        buttonSize: 'medium',
        alignment: 'center',
        height: '500px'
      },
      render: HeroVideo
    },
    HeroSplitScreen: {
      label: "🎨 Hero Split Screen",
      fields: {
        imageSrc: {
          type: 'text' as const,
          label: 'Image URL',
          placeholder: 'https://example.com/image.jpg',
          contentEditable: true
        },
        imageAlt: {
          type: 'text' as const,
          label: 'Image Alt Text',
          placeholder: 'Event hero image'
        },
        dateLabel: {
          type: 'text' as const,
          label: 'Date Label',
          placeholder: 'OCT 10-12',
          contentEditable: true
        },
        locationLabel: {
          type: 'text' as const,
          label: 'Location Label',
          placeholder: 'New York City',
          contentEditable: true
        },
        title: {
          type: 'text' as const,
          label: 'Title',
          placeholder: 'Unlock the Power of Data',
          contentEditable: true
        },
        highlightedText: {
          type: 'text' as const,
          label: 'Highlighted Text (in title)',
          placeholder: 'Power of Data'
        },
        description: {
          type: 'textarea' as const,
          label: 'Description',
          placeholder: 'Join 5,000+ analytics leaders for three days of immersive workshops, networking, and strategy.',
          contentEditable: true
        },
        // Primary Button Section
        primaryButtonText: {
          type: 'text' as const,
          label: 'Primary Button Text',
          placeholder: 'Get Tickets',
          contentEditable: true
        },
        primaryButtonAction: {
          type: 'text' as const,
          label: 'Primary Button Link',
          placeholder: '/tickets',
          contentEditable: true
        },
        primaryButtonColor: {
          type: 'text' as const,
          label: 'Primary Button Color',
          placeholder: '#007bff'
        },
        primaryButtonTextColor: {
          type: 'text' as const,
          label: 'Primary Button Text Color',
          placeholder: '#ffffff'
        },
        // Secondary Button Section
        secondaryButtonText: {
          type: 'text' as const,
          label: 'Secondary Button Text',
          placeholder: 'View Agenda'
        },
        secondaryButtonAction: {
          type: 'text' as const,
          label: 'Secondary Button Link',
          placeholder: '/agenda'
        },
        secondaryButtonColor: {
          type: 'text' as const,
          label: 'Secondary Button Color',
          placeholder: '#ffffff'
        },
        secondaryButtonTextColor: {
          type: 'text' as const,
          label: 'Secondary Button Text Color',
          placeholder: '#000000'
        },
        backgroundColor: {
          type: 'text' as const,
          label: 'Background Color',
          placeholder: '#ffffff'
        },
        textColor: {
          type: 'text' as const,
          label: 'Text Color',
          placeholder: '#000000'
        },
        height: {
          type: 'text' as const,
          label: 'Section Height',
          placeholder: '600px'
        }
      },
      defaultProps: {
        imageSrc: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
        imageAlt: 'Event hero image',
        dateLabel: 'OCT 10-12',
        locationLabel: 'New York City',
        title: 'Unlock the Power of Data',
        highlightedText: 'Power of Data',
        description: 'Join 5,000+ analytics leaders for three days of immersive workshops, networking, and strategy. Define the future of your industry.',
        primaryButtonText: 'Get Tickets',
        primaryButtonAction: '/tickets',
        primaryButtonColor: '#007bff',
        primaryButtonTextColor: '#ffffff',
        secondaryButtonText: 'View Agenda',
        secondaryButtonAction: '/agenda',
        secondaryButtonColor: '#ffffff',
        secondaryButtonTextColor: '#000000',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        height: '600px'
      },
      render: HeroSplitScreen
    },
    HTMLContent: {
      label: "🌐 HTML Content",
      fields: {
        htmlContent: {
          type: 'textarea' as const,
          label: 'HTML Content',
          placeholder: '<div>Enter your HTML content here...</div>',
          rows: 10
        }
      },
      defaultProps: {
        htmlContent: '<div style="padding: 2rem; text-align: center; background: #f8f9fa; border-radius: 8px;"><h2>HTML Content</h2><p>Add your custom HTML content here.</p></div>'
      },
      render: HTMLContent
    },
    RegistrationForm: {
      label: "📋 Registration Form",
      fields: {
        title: {
          type: 'text' as const,
          label: 'Form Title',
          placeholder: 'Registration Form'
        }
      },
      defaultProps: {
        title: 'Registration Form'
      },
      render: RegistrationForm
    },
    GoogleForm: {
      label: "📝 Google Form",
      fields: {
        formUrl: {
          type: 'text' as const,
          label: 'Google Form URL',
          placeholder: 'https://docs.google.com/forms/d/e/...'
        },
        height: {
          type: 'number' as const,
          label: 'Height (px)',
          placeholder: '500'
        }
      },
      defaultProps: {
        formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScBIZc6q4yfDIujHpVnArjbgkktJ60pgIU6RtgSp4LwDFe4_A/viewform',
        height: 500
      },
      render: GoogleForm
    },
    SchedulePage: {
      label: "📅 Schedule Page",
      fields: {
        title: {
          type: 'text' as const,
          label: 'Page Title',
          placeholder: 'Schedule'
        },
        events: {
          type: 'array' as const,
          label: 'Events',
          arrayFields: {
            id: { type: 'text' as const, label: 'ID' },
            title: { type: 'text' as const, label: 'Title' },
            startTime: { type: 'text' as const, label: 'Start Time' },
            endTime: { type: 'text' as const, label: 'End Time' },
            location: { type: 'text' as const, label: 'Location' },
            type: { 
              type: 'select' as const, 
              label: 'Type',
              options: [
                { label: 'In-Person', value: 'In-Person' },
                { label: 'Virtual', value: 'Virtual' }
              ]
            },
            description: { type: 'textarea' as const, label: 'Description' },
            participants: { type: 'text' as const, label: 'Participants' },
            tags: { type: 'text' as const, label: 'Tags (comma separated)' },
            attachments: { type: 'number' as const, label: 'Attachments Count' },
            parentSessionId: { type: 'text' as const, label: 'Parent Session ID' },
            isCompleted: { type: 'radio' as const, label: 'Completed', options: [
              { label: 'No', value: false },
              { label: 'Yes', value: true }
            ]},
            isExpanded: { type: 'radio' as const, label: 'Expanded', options: [
              { label: 'No', value: false },
              { label: 'Yes', value: true }
            ]}
          }
        }
      },
      defaultProps: {
        title: 'Schedule',
        events: [
          {
            id: "1",
            title: "Welcome & Opening Keynote",
            startTime: "09:00 AM",
            endTime: "10:00 AM",
            location: "Main Hall",
            type: "In-Person",
            description: "Opening keynote address by the conference chair",
            participants: "Chairman: Dr. Smith, Speaker: Dr. Johnson",
            tags: "Keynote, Opening",
            attachments: 2,
            isCompleted: false,
            isExpanded: false,
            parentSessionId: undefined
          },
          {
            id: "2",
            title: "Coffee Break",
            startTime: "10:00 AM",
            endTime: "10:30 AM",
            location: "Lobby",
            type: "In-Person",
            description: "Networking and refreshments",
            participants: "",
            tags: "",
            attachments: 0,
            isCompleted: false,
            isExpanded: false,
            parentSessionId: undefined
          },
          {
            id: "3",
            title: "AI & Machine Learning Workshop",
            startTime: "10:30 AM",
            endTime: "12:00 PM",
            location: "Room A",
            type: "In-Person",
            description: "Hands-on workshop on AI and ML fundamentals",
            participants: "Instructor: Prof. Williams",
            tags: "Workshop, AI, ML",
            attachments: 5,
            isCompleted: false,
            isExpanded: false,
            parentSessionId: undefined
          },
          {
            id: "4",
            title: "Panel Discussion: Future of Tech",
            startTime: "10:30 AM",
            endTime: "12:00 PM",
            location: "Room B",
            type: "Virtual",
            description: "Expert panel discussing emerging technologies",
            participants: "Moderator: Dr. Brown, Panelists: Dr. Davis, Dr. Wilson",
            tags: "Panel, Discussion, Tech",
            attachments: 1,
            isCompleted: false,
            isExpanded: false,
            parentSessionId: undefined
          },
          {
            id: "5",
            title: "Lunch Break",
            startTime: "12:00 PM",
            endTime: "01:00 PM",
            location: "Dining Hall",
            type: "In-Person",
            description: "Buffet lunch and networking",
            participants: "",
            tags: "",
            attachments: 0,
            isCompleted: false,
            isExpanded: false,
            parentSessionId: undefined
          },
          {
            id: "6",
            title: "Poster Session",
            startTime: "01:00 PM",
            endTime: "02:30 PM",
            location: "Exhibition Hall",
            type: "In-Person",
            description: "Poster presentations and networking",
            participants: "Multiple presenters",
            tags: "Poster, Networking",
            attachments: 0,
            isCompleted: false,
            isExpanded: false,
            parentSessionId: undefined
          },
          {
            id: "7",
            title: "Advanced React Patterns",
            startTime: "02:30 PM",
            endTime: "04:00 PM",
            location: "Room A",
            type: "In-Person",
            description: "Deep dive into advanced React patterns and best practices",
            participants: "Speaker: Dr. Martinez",
            tags: "Workshop, React, Frontend",
            attachments: 3,
            isCompleted: false,
            isExpanded: false,
            parentSessionId: undefined
          },
          {
            id: "8",
            title: "Closing Remarks",
            startTime: "04:00 PM",
            endTime: "04:30 PM",
            location: "Main Hall",
            type: "In-Person",
            description: "Conference closing and thank you notes",
            participants: "Chairman: Dr. Smith",
            tags: "Closing",
            attachments: 0,
            isCompleted: false,
            isExpanded: false,
            parentSessionId: undefined
          }
        ]
      },
      render: (props: any) => {
        // Note: onNavigateToEditor and onAddComponent come from NavigationContext
        // They are not passed as props here, the component gets them from useNavigation()
        return React.createElement(SchedulePage as any, props);
      }
    },
    ScheduleContent: {
      label: "📅 Schedule Content (with WeekDateSelector)",
      fields: {
        scheduleName: {
          type: 'text' as const,
          label: 'Schedule Name',
          placeholder: 'Schedule 1'
        },
        selectedDate: {
          type: 'text' as const,
          label: 'Selected Date (ISO string)',
          placeholder: '2025-01-15T00:00:00.000Z'
        },
        sessions: {
          type: 'array' as const,
          label: 'Sessions',
          arrayFields: {
            id: { type: 'text' as const, label: 'ID' },
            title: { type: 'text' as const, label: 'Title' },
            startTime: { type: 'text' as const, label: 'Start Time' },
            startPeriod: { 
              type: 'select' as const, 
              label: 'Start Period',
              options: [
                { label: 'AM', value: 'AM' },
                { label: 'PM', value: 'PM' }
              ]
            },
            endTime: { type: 'text' as const, label: 'End Time' },
            endPeriod: { 
              type: 'select' as const, 
              label: 'End Period',
              options: [
                { label: 'AM', value: 'AM' },
                { label: 'PM', value: 'PM' }
              ]
            },
            location: { type: 'text' as const, label: 'Location' },
            sessionType: { type: 'text' as const, label: 'Session Type' },
            tags: {
              type: 'array' as const,
              label: 'Tags',
              arrayFields: {
                value: { type: 'text' as const, label: 'Tag' }
              }
            },
            sections: {
              type: 'array' as const,
              label: 'Sections',
              arrayFields: {
                id: { type: 'text' as const, label: 'ID' },
                type: { type: 'text' as const, label: 'Type' },
                title: { type: 'text' as const, label: 'Title' },
                description: { type: 'textarea' as const, label: 'Description' }
              }
            },
            date: { type: 'text' as const, label: 'Date (ISO string)' },
            parentId: { type: 'text' as const, label: 'Parent ID (for parallel sessions)' }
          }
        }
      },
      defaultProps: {
        scheduleName: 'Schedule 1',
        selectedDate: new Date().toISOString(),
        sessions: []
      },
      render: (props: any) => {
        // Convert date string back to Date object for ScheduleContent
        const processedProps = {
          ...props,
          selectedDate: props.selectedDate ? new Date(props.selectedDate) : new Date(),
          sessions: (props.sessions || []).map((session: any) => ({
            ...session,
            date: session.date ? new Date(session.date) : new Date(),
            tags: Array.isArray(session.tags) 
              ? session.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.value || tag)
              : []
          }))
        }
        // Note: Callbacks (onAddSession, onUpload, onBack) are optional and won't be available in Puck editor
        // ScheduleContent handles this gracefully with optional chaining
        return React.createElement(ScheduleContent, processedProps);
      }
    },
    LiveChat: {
      label: "💬 Live Chat",
      fields: {
        title: {
          type: 'text' as const,
          label: 'Chat Title',
          placeholder: 'Live Chat',
          contentEditable: true
        },
        height: {
          type: 'select' as const,
          label: 'Chat Height',
          options: [
            { label: 'Small (400px)', value: '400px' },
            { label: 'Medium (500px)', value: '500px' },
            { label: 'Large (600px)', value: '600px' },
            { label: 'Extra Large (700px)', value: '700px' }
          ]
        },
        backgroundColor: {
          type: 'text' as const,
          label: 'Background Color',
          placeholder: '#ffffff'
        },
        headerColor: {
          type: 'text' as const,
          label: 'Header Background Color',
          placeholder: '#8b5cf6'
        },
        headerTextColor: {
          type: 'text' as const,
          label: 'Header Text Color',
          placeholder: '#ffffff'
        },
        messageUserBg: {
          type: 'text' as const,
          label: 'User Message Background',
          placeholder: '#3b82f6'
        },
        messageAgentBg: {
          type: 'text' as const,
          label: 'Agent Message Background',
          placeholder: '#e5e7eb'
        },
        inputBorderColor: {
          type: 'text' as const,
          label: 'Input Border Color',
          placeholder: '#d1d5db'
        },
        buttonColor: {
          type: 'text' as const,
          label: 'Send Button Color',
          placeholder: '#8b5cf6'
        },
        buttonTextColor: {
          type: 'text' as const,
          label: 'Send Button Text Color',
          placeholder: '#ffffff'
        },
        placeholderText: {
          type: 'text' as const,
          label: 'Input Placeholder Text',
          placeholder: 'Type your message...'
        }
      },
      defaultProps: {
        title: 'Live Chat',
        height: '500px',
        backgroundColor: '#ffffff',
        headerColor: '#8b5cf6',
        headerTextColor: '#ffffff',
        messageUserBg: '#3b82f6',
        messageAgentBg: '#e5e7eb',
        inputBorderColor: '#d1d5db',
        buttonColor: '#3b82f6',
        buttonTextColor: '#ffffff',
        placeholderText: 'Type your message...'
      },
      render: LiveChat
    },
    ApiTestComponent: {
      label: "🔗 API Test Component",
      fields: {
        // No configurable fields for this demo component
      },
      defaultProps: {
        // No default props needed
      },
      render: ApiTestComponent
    },
    SessionForm: {
      label: "📝 Session Form",
      fields: {
        sessionTitle: {
          type: 'text' as const,
          label: 'Session Title'
        },
        startTime: {
          type: 'text' as const,
          label: 'Start Time (HH:MM)'
        },
        startAMPM: {
          type: 'radio' as const,
          label: 'Start AM/PM',
          options: [
            { label: 'AM', value: 'AM' },
            { label: 'PM', value: 'PM' }
          ]
        },
        endTime: {
          type: 'text' as const,
          label: 'End Time (HH:MM)'
        },
        endAMPM: {
          type: 'radio' as const,
          label: 'End AM/PM',
          options: [
            { label: 'AM', value: 'AM' },
            { label: 'PM', value: 'PM' }
          ]
        },
        location: {
          type: 'text' as const,
          label: 'Location'
        },
        eventType: {
          type: 'select' as const,
          label: 'Event Type',
          options: [
            { label: 'Select event type', value: 'Select event type' },
            { label: 'In-Person', value: 'In-Person' },
            { label: 'Virtual', value: 'Virtual' },
            { label: 'Hybrid', value: 'Hybrid' }
          ]
        },
        ctaText: {
          type: 'text' as const,
          label: 'Call to Action Text'
        },
        addButtonText: {
          type: 'text' as const,
          label: 'Add Button Text'
        },
        cancelButtonText: {
          type: 'text' as const,
          label: 'Cancel Button Text'
        },
        saveButtonText: {
          type: 'text' as const,
          label: 'Save Button Text'
        },
        showActionButtons: {
          type: 'radio' as const,
          label: 'Show Action Buttons (Save/Cancel)',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false }
          ]
        },
        backgroundColor: {
          type: 'text' as const,
          label: 'Background Color'
        },
        borderRadius: {
          type: 'text' as const,
          label: 'Border Radius'
        },
        padding: {
          type: 'text' as const,
          label: 'Padding'
        }
      },
      defaultProps: {
        sessionTitle: 'Session title',
        startTime: '00:00',
        startAMPM: 'AM',
        endTime: '00:00',
        endAMPM: 'AM',
        location: 'Enter location',
        eventType: 'Select event type',
        ctaText: 'Click to add a section!',
        addButtonText: '+ Add section',
        cancelButtonText: 'Cancel',
        saveButtonText: 'Save',
        showActionButtons: true,
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '40px'
      },
      render: SessionForm
    },
    ResourceCards: {
      label: "🖼️ Gallery",
      fields: {
        source: {
          type: 'custom' as const,
          label: 'Resource folder',
          render: (props: any) => {
            return React.createElement(ResourceFolderAssetsField, {
              ...props,
              value: props.value || {},
              onChange: props.onChange
            })
          }
        },
        heading: {
          type: 'text' as const,
          label: 'Heading',
          placeholder: '(auto from folder name)'
        },
        headingAlign: {
          type: 'select' as const,
          label: 'Heading alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' }
          ]
        },
        headingColor: {
          type: 'text' as const,
          label: 'Heading color (hex)',
          placeholder: '#0f172a'
        },
        columns: {
          type: 'select' as const,
          label: 'Columns',
          options: [
            { label: '2', value: 2 },
            { label: '3', value: 3 },
            { label: '4', value: 4 }
          ]
        },
        showMeta: {
          type: 'radio' as const,
          label: 'Show meta',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false }
          ]
        },
        cardBackgroundColor: {
          type: 'text' as const,
          label: 'Card Background (hex)',
          placeholder: '#ffffff'
        },
        cardBorderColor: {
          type: 'text' as const,
          label: 'Card Border (hex)',
          placeholder: '#e2e8f0'
        }
      },
      defaultProps: {
        heading: '',
        columns: 3,
        showMeta: true,
        headingAlign: 'left',
        headingColor: '#0f172a',
        cardBackgroundColor: '#ffffff',
        cardBorderColor: '#e2e8f0',
        source: { folderUuid: '', folderName: '', assets: [] }
      },
      render: ResourceCards
    },
    PdfViewer: {
      label: "📄 PDF Viewer",
      fields: {
        pdfUrl: {
          type: 'custom' as const,
          label: 'Select PDF',
          render: (props: any) => {
            return React.createElement(PdfSelectField, {
              ...props,
              value: props.value || '',
              onChange: props.onChange
            })
          }
        },
        height: {
          type: 'number' as const,
          label: 'Viewer Height',
          placeholder: '600'
        }
      },
      defaultProps: {
        pdfUrl: '',
        height: 600
      },
      render: PdfViewer
    }

  },
  root: {
    fields: {
      pageTitle: {
        type: 'text' as const,
        label: 'Page Title'
      },
      schedulesSection: {
        type: 'custom' as const,
        label: 'Schedules',
        render: (props: any) => {
          const onChange = props.onChange
          
          // Data will be accessed through React Context in the component
          // Pass onChange to the component
          return React.createElement(SchedulesSectionField, {
            ...props,
            onChange
          })
        }
      }
    },
    defaultProps: {
      pageTitle: '',
      schedulesSection: null
    }
  }
}
