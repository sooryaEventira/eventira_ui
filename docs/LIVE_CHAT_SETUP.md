# Live Chat (Session) – Setup Guide

The **Live Chat** section in a session lets authenticated **attendees and speakers** chat in real time for that session. It uses **CometChat** under the hood.

## What’s already in place

- **Session editor:** You can add a “Live Chat” section to any session (+ Add section → Live Chat).
- **Session view:** When a session has a Live Chat section, the chat area is rendered where the session is shown (e.g. schedule/session detail).
- **Config:** `src/config/env.ts` reads CometChat settings from env; `SessionChat` and `SessionSummaryView` are wired for chat.

## How to make it work

### 1. CometChat account and app

1. Go to [CometChat Dashboard](https://app.cometchat.com/) and sign up / sign in.
2. Create an app and note:
   - **App ID**
   - **Region**
   - **Auth Key** (for API access)

### 2. Install CometChat packages

From the project root:

```bash
npm install @cometchat/chat-uikit-react @cometchat/chat-sdk-javascript
```

### 3. Environment variables

In your `.env` (or copy from `env.example.txt`):

```env
VITE_COMETCHAT_APP_ID=your_app_id
VITE_COMETCHAT_REGION=your_region
VITE_COMETCHAT_AUTH_KEY=your_auth_key
```

Restart the dev server after changing `.env`.

### 4. Backend: CometChat users and tokens

Each **attendee** and **speaker** who can chat must exist in CometChat and have an **auth token**.

- When a user logs in to your app (attendee or speaker), your **backend** should:
  1. **Create the user in CometChat** if they don’t exist (CometChat [Create User](https://www.cometchat.com/docs/rest-api/create-user)).
  2. **Get an auth token** for that user (CometChat [Get Auth Token](https://www.cometchat.com/docs/rest-api/get-auth-token) or create-user response).
  3. Return that **token** (and CometChat **uid**) to the frontend (e.g. in the login response or a “get chat token” endpoint).

- Use a **unique CometChat UID** per user (e.g. your app’s user id or email).

### 5. Backend: One group per session (recommended)

So that each session has its own chat room:

- When a session is **created** (or when the first user opens that session’s chat), your backend should **create a CometChat group** with:
  - **GUID:** `session_<sessionId>` or `event_<eventId>_session_<sessionId>` (same as in `SessionChat.tsx`).
  - **Name:** e.g. session title.

Use CometChat [Create Group](https://www.cometchat.com/docs/rest-api/create-group). When users open the Live Chat section, the UI will join this group.

### 6. Frontend: Pass the current user into the session view

Wherever you show a session that has a Live Chat section (e.g. public schedule or session detail page), you need to pass the **current CometChat user** and **ids** into the session summary:

```tsx
// Example: when rendering the session for a logged-in attendee/speaker
<SessionSummaryView
  session={session}
  sessionId={session.id}
  eventId={eventUuid}
  cometChatUser={
    currentUser
      ? {
          uid: currentUser.cometChatUid,      // from your backend
          authToken: currentUser.cometChatAuthToken,
          name: currentUser.name,
        }
      : null
  }
/>
```

- **sessionId** – id of the session (so the chat is scoped to that session).
- **eventId** – event id (optional; used in group GUID if provided).
- **cometChatUser** – only set when the user is logged in and your backend has given a CometChat uid and auth token. If `null`, the UI shows “Sign in as an attendee or speaker to join the session chat.”

### 7. Restore full CometChat UI (after installing packages)

Right now the app ships **without** the CometChat npm packages so the build doesn’t depend on them. After you run `npm install` for the two packages above, you can restore the **actual chat widget** in `SessionChat.tsx` by:

- Initializing CometChat (with your env vars).
- Logging in with `cometChatUser.uid` and `cometChatUser.authToken`.
- Rendering the CometChat group UI for the group GUID: `session_<sessionId>` or `event_<eventId>_session_<sessionId>`.

CometChat’s React docs: [CometChat React UI Kit](https://www.cometchat.com/docs/ui-kit/react/overview).

## Summary checklist

- [ ] CometChat app created; App ID, Region, Auth Key noted.
- [ ] `npm install @cometchat/chat-uikit-react @cometchat/chat-sdk-javascript`
- [ ] `.env` has `VITE_COMETCHAT_APP_ID`, `VITE_COMETCHAT_REGION`, `VITE_COMETCHAT_AUTH_KEY`.
- [ ] Backend creates CometChat users and returns uid + auth token for attendees/speakers.
- [ ] Backend creates a CometChat group per session (GUID: `session_<sessionId>` or `event_<eventId>_session_<sessionId>`).
- [ ] Frontend passes `sessionId`, `eventId`, and `cometChatUser` into `SessionSummaryView` where the session is shown.
- [ ] (Optional) Restore full CometChat UI in `SessionChat.tsx` after packages are installed.

Once these are in place, the Live Chat section you see in the session form will be a working chat for that session for authenticated attendees and speakers.

---

## How to test (is it working?)

### 1. Test that the Live Chat section appears and renders

1. Go to **Event Hub** → **Schedule** (or the page where you manage sessions).
2. **Open a session** (create one or click an existing one) so the **Session** slideout opens.
3. Click **"+ Add section"** and choose **Live Chat**. You should see the Live Chat card with the description: *"Attendees and speakers can chat here when this section is shown on the session page."*
4. **Save** the session (or switch to view mode). The slideout switches to **summary view** (no form, just session details).
5. In that summary view, scroll to the **Live Chat** section. You should see one of these:
   - **"Live chat is not configured..."** → Env vars are not set. Set `VITE_COMETCHAT_*` in `.env` and restart.
   - **"Sign in as an attendee or speaker to join the session chat."** → Env is set but `cometChatUser` was not passed. This is expected in the admin slideout (no user passed).
   - **"Live chat for this session (CometChat)..."** → Env is set and a user was passed; full UI appears after you install the CometChat packages and wire the widget.

If you see one of these messages in the summary view, the **Live Chat section and SessionChat are working**; the message tells you what’s left (config, user, or CometChat UI).

### 2. Test with CometChat configured (optional)

- Add `VITE_COMETCHAT_APP_ID`, `VITE_COMETCHAT_REGION`, `VITE_COMETCHAT_AUTH_KEY` to `.env` and restart.
- Open the same session again in **view mode**. You should now see **"Sign in as an attendee or speaker..."** (because the slideout doesn’t pass `cometChatUser`), which confirms the app is reading the config.
- To see the full chat UI, install the CometChat packages, restore the chat widget in `SessionChat.tsx`, and pass `cometChatUser` (and `sessionId`, `eventId`) where you render the session for a logged-in attendee/speaker (e.g. public schedule/session detail page).
