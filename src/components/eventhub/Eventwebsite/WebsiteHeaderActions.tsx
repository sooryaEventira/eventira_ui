import React from 'react'
import { Globe01, Play } from '@untitled-ui/icons-react'
import Button from '../../ui/untitled/Button'

interface WebsiteHeaderActionsProps {
  isPublishing: boolean
  onPreview: () => void
  onPublish: () => void
}

const WebsiteHeaderActions: React.FC<WebsiteHeaderActionsProps> = ({
  isPublishing,
  onPreview,
  onPublish,
}) => (
  <div className="flex flex-nowrap items-center gap-3 overflow-visible">
    <Button variant="secondary" size="md" onClick={onPreview} iconLeading={<Play className="h-4 w-4" />}>
      Preview
    </Button>
    <Button
      variant="primary"
      size="md"
      onClick={onPublish}
      disabled={isPublishing}
      data-custom-publish-button="true"
      className="whitespace-nowrap bg-[#6938EF] text-white hover:bg-[#5925DC]"
      iconLeading={<Globe01 className="h-4 w-4 flex-shrink-0" />}
      aria-label="Publish"
    >
      {isPublishing ? 'Publishing...' : 'Publish'}
    </Button>
  </div>
)

export default WebsiteHeaderActions
