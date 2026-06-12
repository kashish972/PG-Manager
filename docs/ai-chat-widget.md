# AI Chat Widget — Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration (Settings Page)](#configuration-settings-page)
4. [CDN Widget (External Websites)](#cdn-widget-external-websites)
5. [In-App React Widget](#in-app-react-widget)
6. [AI Context & Data](#ai-context--data)
7. [Role-Based Privacy](#role-based-privacy)
8. [Conversation History](#conversation-history)
9. [Rate Limiting](#rate-limiting)
10. [Fullscreen Mode](#fullscreen-mode)
11. [API Routes Reference](#api-routes-reference)
12. [Database Schema](#database-schema)
13. [FAQ / Troubleshooting](#faq--troubleshooting)

---

## Overview

The AI Chat Widget is a full-featured AI assistant for PG (Paying Guest) accommodation management. It has **two modes of operation**:

| Mode | Where | Audience | Features |
|------|-------|----------|----------|
| **React Widget (in-app)** | Inside PG Manager dashboard (`MainLayout`) | Owners, admins, members | Full conversation history, sidebar, fullscreen |
| **CDN Widget (external)** | Embedded on any external website via `<script>` tag | Website visitors | Basic chat, fullscreen |

The AI has access to **real PG data** from your MongoDB database (rooms, residents, payments, notices, staff, inventory) and provides answers based on the caller's role (owner/admin vs member vs visitor).

---

## Architecture

```
User Interaction Layer
├── AiChatWidget (React component) — used inside PG Manager
└── pg-ai-widget.js (CDN script) — embedded on external sites
        │
        ▼
API Layer (Next.js App Router)
├── POST /api/ai/chat          — Main chat endpoint
├── GET  /api/ai/settings      — Public branding/settings (CORS-enabled)
├── GET  /api/ai/conversations — List conversations
├── POST /api/ai/conversations — Create conversation
├── GET  /api/ai/conversations/[id] — Get conversation with messages
├── PATCH /api/ai/conversations/[id] — Rename conversation
├── DELETE /api/ai/conversations/[id] — Delete conversation
│
▼
Service Layer (src/lib/ai/)
├── ai-service.ts          — Core logic (context builder, prompts, rate limits, conversation CRUD)
├── providers/
│   ├── provider.interface.ts — Abstract provider interface
│   ├── gemini.provider.ts    — Google Gemini implementation
│   └── openrouter.provider.ts — OpenRouter implementation
│
▼
Data Layer
├── MongoDB (tenant DB) — aiSettings, aiConversations collections
├── MongoDB (main DB)   — pgs collection
├── Repositories        — staff, inventory, blocks, persons, notices, payments, complaints, maintenance
└── Cloudinary          — AI logo image uploads
```

---

## Configuration (Settings Page)

The settings page is at `/ai-settings` in the PG Manager app and is divided into three sections inside a single card, plus two standalone sections below.

### Configuration Section

| Field | Description |
|-------|-------------|
| **Enable AI Assistant** | Master toggle to show/hide the widget |
| **AI Provider** | `gemini` (Google Gemini) or `openrouter` (OpenRouter) |
| **API Key** | The provider API key. Stored securely, never exposed to the browser |
| **Model** | Optional model override (e.g., `gemini-2.0-flash`) |

### Branding Section

| Field | Description |
|-------|-------------|
| **AI Assistant Name** | The name shown in the chat header (e.g., "PG Assistant") |
| **Welcome Message** | The first message shown when opening the chat (e.g., "Hi! How can I help you today?") |
| **Primary Color** | Main brand color — used for the header, user messages, and buttons |
| **Secondary Color** | Hover/active state color |
| **Chat Bubble Color** | Background color for AI response bubbles |
| **Tone** | The AI's communication style: `professional`, `friendly`, `formal`, or `casual` |
| **AI Logo** | Upload a logo image (stored in Cloudinary under `pg-manager/ai-logos/`) |

### Allowed Domains Section

Control which external websites can embed the CDN widget. Add one domain per line:

```
example.com
my-pg-site.com
*.my-custom-domain.com
```

If left empty, all origins are allowed (not recommended for production).

### Save Button

The **Save Settings** button saves all three sections (Configuration, Branding, Allowed Domains) together in one click.

### CDN Script Section

Displays the embed script HTML. Click **Copy** to copy it to your clipboard:

```html
<script
  src="https://your-domain.com/pg-ai-widget.js"
  data-tenant-id="YOUR_TENANT_ID"
  data-position="bottom-right"
></script>
```

### Preview Section

A live inline preview of the AI chat widget showing your current branding settings in real-time.

---

## CDN Widget (External Websites)

### Installation

Add the script to any external website's HTML:

```html
<script
  src="https://your-domain.com/pg-ai-widget.js"
  data-tenant-id="satkar-pg"           ← your PG's slug/tenant ID
  data-position="bottom-right"          ← bottom-left or bottom-right
  data-api-base="https://your-domain.com" ← optional: override API base URL
></script>
```

### How It Works

1. The script creates a **Shadow DOM** container so the widget's CSS never conflicts with the hosting site's styles
2. It fetches branding from `GET /api/ai/settings?tenantId=...` (CORS-enabled)
3. If the fetch fails (e.g., offline fallback), it shows default branding
4. On first load, it checks `isEnabled` — if disabled, the widget does not render
5. The **API base URL** is automatically derived from the script's own `src` attribute, so API calls always go to your backend regardless of where the script is embedded

### API Base URL Resolution

The script determines where to send API requests using this priority:

1. `data-api-base` attribute (explicit override)
2. Script's own `src` origin (e.g., `http://localhost:3000` from `src="http://localhost:3000/pg-ai-widget.js"`)
3. `window.location.origin` (fallback)

### Attributes Reference

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `data-tenant-id` | Yes | — | Your PG's slug/tenant ID |
| `data-position` | No | `bottom-right` | `bottom-left` or `bottom-right` |
| `data-api-base` | No | auto-derived | Override the API base URL |

### CDN Widget Features

- ✅ Floating chat button (bottom corner)
- ✅ Animated slide-up panel
- ✅ Welcome message from branding
- ✅ Typing indicator animation
- ✅ Auto-resizing textarea
- ✅ Enter to send, Shift+Enter for newline
- ✅ Minimize button (hides to floating button)
- ✅ Fullscreen button (expands to full viewport)
- ✅ Mobile responsive (fullscreen on small screens)
- ✅ Shadow DOM isolation (no CSS conflicts)

---

## In-App React Widget

### Import & Usage

```tsx
import { AiChatWidget } from '@/components/ai/AiChatWidget';

// In your layout or page:
<AiChatWidget tenantId={session.user.tenantId} />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tenantId` | `string` | required | The PG's tenant slug |
| `branding` | `Branding` | loaded from API | Override branding (optional) |
| `isEnabled` | `boolean` | `true` | Initial enabled state |
| `apiUrl` | `string` | `NEXT_PUBLIC_APP_URL` | Base URL for API calls |
| `mode` | `'fixed' \| 'inline'` | `'fixed'` | `fixed` = floating panel, `inline` = embedded preview |

### Features (Fixed Mode)

| Feature | Button | Action |
|---------|--------|--------|
| **History Sidebar** | `PanelLeftOpen` icon | Toggle conversation history panel (260px sidebar) |
| **New Chat** | `Plus` icon | Start a fresh conversation |
| **Fullscreen** | `Maximize2` icon | Expand to full viewport |
| **Minimize** | `ChevronDown` icon | Collapse back to floating button |
| **Close** | `X` icon | Close the chat panel |
| **Send** | `Send` icon | Send message (or press Enter) |

### Conversation Sidebar

- Opens from the left side of the panel (260px wide)
- Lists all past conversations with title and message count
- Active conversation is highlighted
- Hover reveals a delete button (`Trash2` icon) per conversation
- Clicking a conversation loads its full message history
- "New Chat" button in the header starts a fresh conversation

### Auto-Generated Titles

When you start a new conversation, the first message you send is used as the conversation title (truncated to 60 characters with `...`).

---

## AI Context & Data

### What the AI Knows

When a user sends a message, the backend queries your MongoDB and injects this data into the AI's system prompt:

| Data Source | Owner/Admin | Member | Visitor |
|-------------|:-----------:|:------:|:-------:|
| PG name, address, monthly rent | ✅ | ✅ | ✅ |
| Total rooms count | ✅ | ✅ | ✅ |
| Blocks & rooms with AC/Non-AC status | ✅ | ✅ | ✅ |
| Room availability (occupied/available) | ✅ | ✅ | ✅ |
| Current residents (names, rents, phones) | ✅ (full) | ❌ (count only) | ❌ |
| Revenue (total monthly rent) | ✅ | ❌ | ❌ |
| Recent notices | ✅ | ✅ | ❌ |
| Payments this month (paid/pending/total) | ✅ | ❌ | ❌ |
| Open complaints + maintenance | ✅ | ❌ | ❌ |
| Staff list (names, roles, salaries, phones) | ✅ | ❌ | ❌ |
| Inventory (by category, quantity, condition) | ✅ | ❌ | ❌ |

### How Context Is Built

The function `buildTenantContext(tenantId, role)` in `src/lib/ai/ai-service.ts`:

1. Connects to the **main DB** to fetch PG info (name, address, rent, UPI ID, etc.)
2. Connects to the **tenant DB** to fetch:
   - Blocks and rooms (from `blocks` collection)
   - Active residents (from `persons` collection)
   - Recent notices (from `notices` collection)
   - Current month payments (from `rentPayments` collection)
   - Open complaints and maintenance requests
   - Active staff members (from `staff` collection)
   - Inventory items grouped by category (from `inventory` collection)
3. Filters data based on the caller's role
4. Returns a formatted string injected into the system prompt

### System Prompt Structure

```
You are "[Name]", an AI assistant for a PG accommodation management system.

[Tone instructions]

[Welcome message]

[Privacy & Capabilities rules based on role]

RULES:
- ALWAYS use the real data in the "TENANT DATA CONTEXT" section
- Be concise — responses under 400 words
- Do not fabricate data

========== TENANT DATA CONTEXT ==========
[PG Information]
[Rooms & Blocks]
[Residents]
[Notices]
[Payments]
[Staff]
[Inventory]
==========================================
```

### Conversation History In Context

When a conversation has prior messages, the last 20 messages are included in the AI request as chat history, enabling the AI to maintain context across the conversation.

---

## Role-Based Privacy

### Owner / Admin

- Full access to all tenant data
- Can see individual resident names, rents, phone numbers
- Can see revenue, payment breakdowns, pending issues
- Can ask about staff, inventory, complaints
- Rate limit: **60 requests/minute**, **1000/day** (effectively unlimited)

### Member

- Can see room availability, AC/Non-AC pricing, PG info
- Can see active notices
- Can see resident count (but not individual names/rents)
- **Cannot** see revenue, payment data, other residents' personal info
- **Cannot** see complaints, maintenance, staff, inventory
- System prompt tells the AI: *"I'm sorry, I cannot share another resident's personal information."*
- Rate limit: **5 requests/minute**, **50/day**

### Visitor (External / Unauthenticated)

- Can see room availability, AC/Non-AC pricing, PG facility info
- Can see general rules and public information
- **Cannot** see any resident names, rents, phone numbers
- **Cannot** see notices, payments, complaints, staff, inventory
- System prompt tells the AI: *"I'm sorry, that information is private."*
- Rate limit: **5 requests/minute**, **20/day**

---

## Conversation History

### Storage

Conversations are stored in the tenant's MongoDB database under the `aiConversations` collection.

**Document shape:**

```javascript
{
  _id: ObjectId,              // MongoDB auto-generated
  tenantId: "satkar-pg",      // The PG's tenant slug
  title: "What is the rent of AC rooms?",  // Auto-generated from first message
  messages: [                  // Array of message objects
    {
      role: "user",
      content: "What is the rent of AC rooms?",
      timestamp: ISODate("2026-06-03T10:30:00Z")
    },
    {
      role: "assistant",
      content: "AC rooms are ₹8,000/month...",
      timestamp: ISODate("2026-06-03T10:30:02Z")
    }
  ],
  createdAt: ISODate("2026-06-03T10:30:00Z"),
  updatedAt: ISODate("2026-06-03T10:30:02Z")
}
```

### Lifecycle

1. **First message** → if no `conversationId` is provided, the backend creates a new conversation in MongoDB with an empty messages array
2. **Title generation** → the first user message is truncated to 60 chars and used as the conversation title
3. **Message storage** → Each user message and AI response is appended to the conversation's `messages` array via `$push`
4. **History retrieval** → When a conversation is resumed, the backend loads the conversation and sends the last 20 messages as context to the AI
5. **Deletion** → Conversations can be deleted from the sidebar using the trash icon

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai/conversations?tenantId=X` | List all conversations (title, count, updatedAt) |
| `POST` | `/api/ai/conversations` | Create a new conversation |
| `GET` | `/api/ai/conversations/[id]?tenantId=X` | Get conversation with all messages |
| `PATCH` | `/api/ai/conversations/[id]` | Update conversation title |
| `DELETE` | `/api/ai/conversations/[id]?tenantId=X` | Delete a conversation |

---

## Rate Limiting

### Per-Minute Limits

| Role | Requests per Minute | Applied When |
|------|:-------------------:|-------------|
| Owner/Admin | 60 | Logged into PG Manager |
| Member | 5 | Logged in with member role |
| Visitor | 5 | External website / no session |

### Daily Limits

| Role | Requests per Day | Applied When |
|------|:----------------:|-------------|
| Owner/Admin | 1000 | Logged into PG Manager |
| Member | 50 | Logged in with member role |
| Visitor | 20 | External website / no session |

### Implementation

- IP-based rate limiting using an in-memory `Map<string, { count, resetAt }>` 
- Separate counters for per-minute (`min:${ip}`) and per-day (`day:${ip}`) windows
- Resets when the server restarts (in-memory, not persisted)
- Returns HTTP 429 with relevant message when limit is exceeded

---

## Fullscreen Mode

Both the React widget and the CDN widget support fullscreen mode.

### React Widget

Click the **Maximize2** icon (`Maximize2`) in the header to toggle fullscreen. The panel expands to cover the full viewport:

```css
.fullscreen {
  bottom: 0 !important;
  right: 0 !important;
  left: 0 !important;
  top: 0 !important;
  width: 100vw !important;
  max-width: 100vw !important;
  height: 100vh !important;
  max-height: 100vh !important;
  border-radius: 0 !important;
}
```

Click the **Minimize2** icon to exit fullscreen.

### CDN Widget

Click the maximize button (expand icon) in the CDN widget's header to toggle the `.pg-ai-panel.fullscreen` CSS class. The same CSS overrides apply.

---

## API Routes Reference

### `POST /api/ai/chat`

Main chat endpoint.

**Request:**
```json
{
  "message": "What is the rent of AC rooms?",
  "tenantId": "satkar-pg",
  "conversationId": "optional-existing-conversation-id"
}
```

**Response:**
```json
{
  "reply": "AC rooms at Satkar PG are ₹8,000 per month...",
  "usage": { "promptTokens": 1200, "completionTokens": 80 },
  "conversationId": "6792abc...",
  "isNewConversation": false
}
```

**Processing flow:**
1. Validate inputs (message + tenantId required)
2. Determine caller role from NextAuth session
3. Check rate limits (per-minute + daily)
4. Load tenant AI settings from DB
5. Check `isEnabled`, API key exists
6. Check allowed domains (if origin header present and domains configured)
7. Resolve or create conversation for message history
8. Store user message in conversation
9. Auto-generate title if new conversation
10. Build tenant context + system prompt
11. Call AI provider with conversation history (last 20 messages)
12. Store AI response in conversation
13. Return reply + conversation metadata

### `GET /api/ai/settings?tenantId=X`

Public endpoint for loading widget branding. CORS-enabled for allowed domains.

**Response:**
```json
{
  "isEnabled": true,
  "branding": {
    "name": "PG Assistant",
    "welcomeMessage": "Hi! How can I help you?",
    "logo": "https://res.cloudinary.com/...",
    "primaryColor": "#2563eb",
    "secondaryColor": "#1d4ed8",
    "bubbleColor": "#e2e8f0",
    "tone": "professional"
  }
}
```

**Note:** The API key is NEVER exposed through this endpoint.

---

## Database Schema

### Collection: `aiSettings` (per tenant DB)

```javascript
{
  _id: ObjectId,
  isEnabled: Boolean,
  provider: "gemini" | "openrouter",
  apiKey: String,           // encrypted/stored securely
  branding: {
    name: String,
    welcomeMessage: String,
    logo: String,           // Cloudinary URL
    primaryColor: String,   // hex color
    secondaryColor: String, // hex color
    bubbleColor: String,    // hex color
    tone: "professional" | "friendly" | "formal" | "casual"
  },
  allowedDomains: [String], // array of allowed domains
  model: String,            // optional model override
  createdAt: Date,
  updatedAt: Date
}
```

### Collection: `aiConversations` (per tenant DB)

```javascript
{
  _id: ObjectId,
  tenantId: String,         // PG's slug
  title: String,            // auto-generated from first message
  messages: [
    {
      role: "user" | "assistant",
      content: String,       // message text
      timestamp: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

---

## FAQ / Troubleshooting

### "The widget shows only the header, not the full panel"

This usually means the CSS `flex-direction: column` is missing on the `.chatPanel` or `.pg-ai-panel` container. Without it, the header, messages area, and input area are laid out horizontally instead of stacked vertically. Check:

- **React widget:** `.chatPanel` in `AiChatWidget.module.css` must have `flex-direction: column`
- **CDN widget:** `.pg-ai-panel` in `getStyles()` must have `flex-direction: column`

### "The API calls go to the wrong domain (404)"

The CDN widget derives its API base URL from the script's `src` attribute. Make sure:

1. The script is loaded from your domain: `src="https://your-domain.com/pg-ai-widget.js"`
2. OR explicitly set `data-api-base="https://your-domain.com"`

The old behavior used `window.location.origin`, which resolves to the embedding site's domain (not yours).

### "The widget is disabled and not showing"

Check:
1. The `isEnabled` toggle is ON in the AI Settings page
2. An API key is configured
3. The AI provider is correctly configured

### "CORS errors on external website"

1. Add the external domain to the **Allowed Domains** list in AI Settings
2. Make sure your backend is accessible from the external domain (no firewall blocking)
3. For development with `localhost`, both sites need to be on the same protocol (HTTP vs HTTPS)

### "Conversation history is not showing"

1. The sidebar loads conversations when the widget opens. Check the network tab for `GET /api/ai/conversations?tenantId=X`
2. Conversations are stored per-tenant. Make sure you're using the same `tenantId`
3. In-app conversations (from the React widget) are not shared with the CDN widget since there's no auth for external users

### "Rate limit errors"

| Error Message | What It Means |
|---------------|---------------|
| "Too many requests. Please slow down and try again." | Exceeded per-minute limit. Wait and retry. |
| "Daily message limit reached. Please try again tomorrow." | Exceeded daily limit. Resets after 24 hours. |
