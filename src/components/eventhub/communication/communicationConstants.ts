export const DEFAULT_EMAIL_SUBJECT = 'Your event access details'

export const DEFAULT_EMAIL_TEMPLATE = `<p>Hi {{first_name}},</p>
<p>You're invited to <strong>{{event_name}}</strong>! Join us from <strong>[EVENT_START_DATE]</strong> to <strong>[EVENT_END_DATE]</strong> for an exciting experience with live keynotes and interactive sessions, comment and ask questions, join live chat networking with global professionals, access to all materials, presentations and recordings, and personalize your schedule by selecting the sessions you want to attend to make the most of your time.</p>
<p><strong>ACCESS THE EVENT:</strong></p>
<p><strong>Web Platform (No Download)</strong><br/>Join here: [PWA_LINK]<br/>Access instantly from any browser. Personalize your schedule, join live chats, and stay updated with automatic session notifications. Works on any device!</p>
<p><strong>Mobile App (Android &amp; iOS)</strong><br/>Android: [PLAYSTORE_LINK]<br/>iOS: [APPSTORE_LINK]<br/>Enhanced experience with push notifications, offline access, and exclusive QR code scanner to exchange contact info with other attendees for seamless networking!</p>
<p><strong>Quick Scan to Download:</strong><br/>[QR_CODE_IMAGE_PLACEHOLDER]</p>
<p><strong>SIGN IN:</strong></p>
<p>Make sure to sign in with this email address.</p>
<p><strong>NEED HELP?</strong><br/>Email: [SUPPORT_EMAIL]<br/>Website: [WEBSITE_URL]<br/>Support: [SUPPORT_HOURS]</p>
<p>See you at {{event_name}}!</p>
<p>The {{event_name}} Team</p>`
