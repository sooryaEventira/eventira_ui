export const ANALYTICS_TABS = [
  'Active users',
  'Engagement',
  'Devices',
  'Page view',
  'Session insights',
  'Storage',
] as const

export type AnalyticsTab = (typeof ANALYTICS_TABS)[number]

export const activeUsersData = {
  kpis: [
    { title: 'Total active users', value: '1,456', change: '+12% from last month' },
    { title: 'New users this month', value: '342', change: '+8% from last month' },
    { title: 'Returning users', value: '1,114', change: '+3% from last month' },
  ],
  chartTitle: 'Active users over time',
  chartData: [
    { month: 'Jan', users: 820 },
    { month: 'Feb', users: 950 },
    { month: 'Mar', users: 1100 },
    { month: 'Apr', users: 980 },
    { month: 'May', users: 1200 },
    { month: 'Jun', users: 1350 },
    { month: 'Jul', users: 1420 },
    { month: 'Aug', users: 1380 },
    { month: 'Sep', users: 1456 },
    { month: 'Oct', users: 1500 },
    { month: 'Nov', users: 1520 },
  ],
  tableTitle: 'User activity breakdown',
  tableHeaders: ['User group', 'Active users', 'Avg. session duration'],
  tableRows: [
    ['Sponsors', '245', '12m 30s'],
    ['Speakers', '189', '18m 45s'],
    ['VIP', '312', '15m 20s'],
    ['Attendees', '580', '8m 15s'],
    ['Volunteers', '130', '22m 10s'],
  ],
}

export const engagementData = {
  kpis: [
    { title: 'Unique conversations', value: '623', subtitle: 'Networking active' },
    { title: 'Profile searches', value: '1,258', subtitle: 'Strong interest' },
    { title: 'Total comments', value: '584', subtitle: 'Across all sessions' },
  ],
  engagementByGroup: {
    title: 'Engagement by attendee group',
    data: [
      { name: 'Sponsors', value: 4800 },
      { name: 'Speakers', value: 4200 },
      { name: 'VIP', value: 3100 },
      { name: 'Volunteers', value: 3400 },
      { name: 'Attendees', value: 2300 },
      { name: 'Vegetarians', value: 2100 },
    ],
  },
  commentsBySessions: {
    title: 'Number of comments by sessions (Top 5)',
    data: [
      { name: 'Keynote', value: 4900 },
      { name: 'Welcome', value: 4200 },
      { name: 'Poster presentation', value: 3000 },
      { name: 'Feedback session', value: 3400 },
      { name: 'Introduction to atoms', value: 2300 },
      { name: 'Intro 101', value: 1800 },
    ],
  },
}

export const devicesData = {
  kpis: [
    { title: 'Browser only', value: '892', subtitle: '81.3% of active' },
    { title: 'Mobile app only', value: '342', subtitle: '23.9% of active' },
    { title: 'Both browser & mobile app', value: '215', subtitle: '14.8% of active' },
  ],
  platformOS: {
    title: 'Platform / OS',
    data: [
      { name: 'iOS', value: 612, percentage: '42%', color: '#6938EF' },
      { name: 'Android', value: 498, percentage: '34%', color: '#9B8AFB' },
      { name: 'Desktop', value: 346, percentage: '24%', color: '#BDB4FE' },
    ],
  },
  sessionType: {
    title: 'Session type',
    data: [
      { name: 'Browser', value: 612, percentage: '42%', color: '#6938EF' },
      { name: 'Native app', value: 498, percentage: '34%', color: '#9B8AFB' },
      { name: 'PWA', value: 346, percentage: '24%', color: '#BDB4FE' },
    ],
  },
}

export const pageViewData = {
  kpis: [
    { title: 'Total pages', value: '12', subtitle: 'Event website' },
    { title: 'Top page by total views', value: '4,547', subtitle: 'Welcome' },
    { title: 'Top page by unique visitors', value: '2,001', subtitle: 'Welcome' },
  ],
  viewsByPage: {
    title: 'Views by page (Top 5)',
    data: [
      { name: 'Welcome', value: 4547 },
      { name: 'Program A', value: 3984 },
      { name: 'Attendees', value: 2455 },
      { name: 'Speakers', value: 2775 },
      { name: 'Partners', value: 1477 },
      { name: 'Venue Info', value: 1357 },
    ],
  },
  tableTitle: 'Page performance',
  tableHeaders: ['Page', 'Total views', 'Unique visitors', 'Browser', 'Mobile app'],
  tableRows: [
    ['Welcome', '4,547', '2,001', '92.3%', '92.3%'],
    ['Program A', '3,984', '1,598', '78.9%', '78.9%'],
    ['Attendees', '2,455', '1,114', '67.4%', '67.4%'],
    ['Speakers', '2,775', '1,244', '46.9%', '53.1%'],
    ['Partners', '1,477', '984', '72.5%', '27.9%'],
    ['Clients', '1,023', '512', '65.4%', '30.5%'],
    ['Suppliers', '1,156', '673', '58.9%', '25.3%'],
    ['Investors', '1,324', '845', '74.2%', '32.7%'],
    ['Stakeholders', '1,412', '739', '81.7%', '28.1%'],
    ['Venue Info', '1,357', '445', '62.6%', '47.9%'],
  ],
}

export const sessionInsightsData = {
  kpis: [
    { title: 'Total sessions', value: '47', subtitle: '32 parent · 15 child' },
    { title: 'Top session by clicks', value: '1,422', subtitle: 'Opening keynote' },
  ],
  sessionEngagement: {
    title: 'Session engagement (Top 5)',
    data: [
      { name: 'Opening keynote', value: 4800 },
      { name: 'Innovation 101', value: 4200 },
      { name: 'Business track', value: 3000 },
      { name: 'Welcome note', value: 3400 },
      { name: 'Poster presentation', value: 2100 },
    ],
  },
  tableTitle: 'Session structure',
  tableHeaders: ['Session title', 'Location', 'Number of clicks', 'Session type'],
  tableRows: [
    ['Welcome note', 'Main Hall', '612', '612'],
    ['Opening keynote', 'Room A', '1,422', '1,422'],
    ['Business track', 'Room B', '856', '856'],
    ['Innovation 101', 'Main Hall', '1,011', '1,011'],
    ['Poster presentation', 'Drawing room', '542', '542'],
    ['Workshop facilitation', 'Ballroom', '543', '542'],
    ['Research findings', 'Conference Center', '544', '542'],
    ['Product demo', 'Garden Pavilion', '545', '542'],
    ['Networking session', 'Roof Terrace', '546', '542'],
    ['Group discussion', 'Room A', '41', '41'],
  ],
}

export const storageData = {
  kpis: [
    { title: 'Total storage used', value: '2.4 GB', subtitle: 'Of 10 GB allocated' },
    { title: 'Files uploaded', value: '1,234', subtitle: 'Across all sessions' },
    { title: 'Average file size', value: '1.9 MB', subtitle: 'Per upload' },
  ],
  storageByType: {
    title: 'Storage by file type',
    data: [
      { name: 'Images', value: 1200, percentage: '50%', color: '#6938EF' },
      { name: 'Documents', value: 720, percentage: '30%', color: '#9B8AFB' },
      { name: 'Videos', value: 480, percentage: '20%', color: '#BDB4FE' },
    ],
  },
  storageOverTime: {
    title: 'Storage usage over time',
    data: [
      { month: 'Jan', storage: 0.4 },
      { month: 'Feb', storage: 0.6 },
      { month: 'Mar', storage: 0.9 },
      { month: 'Apr', storage: 1.1 },
      { month: 'May', storage: 1.4 },
      { month: 'Jun', storage: 1.7 },
      { month: 'Jul', storage: 1.9 },
      { month: 'Aug', storage: 2.0 },
      { month: 'Sep', storage: 2.2 },
      { month: 'Oct', storage: 2.3 },
      { month: 'Nov', storage: 2.4 },
    ],
  },
}
