import { SessionDraft, SectionOption } from './sessionTypes'

export const sectionOptions: SectionOption[] = [
  { id: 'slides', label: 'Slides/Poster' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'speakers', label: 'Speakers' },
  { id: 'text', label: 'Text' },
  { id: 'poll', label: 'Poll' },
  { id: 'location', label: 'Location' },
  { id: 'qas', label: 'Q&As' },
  // { id: 'feedback', label: 'Feedback' },
  { id: 'hyperlink', label: 'Hyperlink' },
  { id: 'photo-gallery', label: 'Photo Gallery' },
  { id: 'resources', label: 'Documents/Presentation' },
  { id: 'button', label: 'Button' },
  { id: 'live-chat', label: 'Live Chat' },
  { id: 'comments', label: 'Comments' },
  // { id: 'networking-tools', label: 'Networking tools' }
]

export const defaultSessionDraft: SessionDraft = {
  title: '',
  startTime: '00:00',
  startPeriod: 'AM',
  endTime: '00:00',
  endPeriod: 'AM',
  location: '',
  sessionType: '',
  tags: [],
  sections: [],
  attachments: []
}
