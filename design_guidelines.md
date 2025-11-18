# AI Chat-to-SQL Bot Design Guidelines

## Design Approach
**Design System: Material Design** - Selected for data-heavy applications requiring clear hierarchy, robust table components, and professional productivity-tool aesthetics. This application prioritizes functionality, readability, and efficient workflows over visual storytelling.

## Core Design Principles
- **Data-First Interface**: Prioritize clear presentation of query results and tables
- **Conversational Clarity**: Make chat interactions feel natural while maintaining professional productivity tool aesthetics
- **Action-Oriented**: Quick access to Excel export and query execution
- **Scannable Results**: Easy-to-read table layouts with clear column headers

---

## Typography

**Font Family**: 
- Primary: 'Inter' or 'Roboto' from Google Fonts
- Monospace: 'JetBrains Mono' for SQL queries and technical content

**Type Scale**:
- Page Title: text-2xl font-semibold
- Section Headers: text-lg font-medium
- Chat Messages: text-base
- SQL Query Display: text-sm font-mono
- Table Headers: text-sm font-semibold uppercase tracking-wide
- Table Data: text-sm
- Timestamps/Meta: text-xs

---

## Layout System

**Spacing Units**: Use Tailwind units of **2, 3, 4, 6, and 8** consistently
- Component padding: p-4 or p-6
- Section gaps: gap-4 or gap-6
- Card spacing: p-6
- Button padding: px-4 py-2 or px-6 py-3

**Grid Structure**:
- Two-column desktop layout: Chat sidebar (w-96) + Results panel (flex-1)
- Single-column mobile: Stack chat at bottom as expandable sheet

**Container Strategy**:
- Full-height application: h-screen with flex column
- Scrollable areas: Chat messages and results table independently scrollable
- Max content width: No restrictions on results table to accommodate wide data

---

## Component Library

### Chat Interface
**Chat Container**:
- Fixed width sidebar on desktop (384px / w-96)
- Full-height with header, messages area, and input footer
- Messages area: Scrollable with overflow-y-auto, flex-1

**Message Bubbles**:
- User messages: Aligned right, rounded-2xl, max-w-xs or max-w-sm
- Bot responses: Aligned left, rounded-2xl, max-w-md
- Spacing between messages: space-y-4
- Padding within bubbles: px-4 py-3
- SQL queries shown in monospace with subtle background treatment

**Chat Input**:
- Sticky footer with border-top
- Textarea with rounded-lg border
- Send button: Rounded-lg with icon, positioned absolute right
- Padding: p-4

### Results Display Panel

**Table Component**:
- Full-width responsive table with horizontal scroll if needed
- Sticky header row: position-sticky top-0
- Row hover states for scanability
- Alternating row backgrounds (optional subtle treatment)
- Cell padding: px-4 py-3
- Border: Border-collapse with subtle dividers

**Results Header**:
- Query summary bar above table
- Shows executed SQL query in monospace
- Action buttons: Export to Excel (primary), Copy SQL (secondary)
- Flexbox layout: justify-between items-center
- Padding: p-4 or p-6

**Empty State**:
- Centered content when no query executed
- Icon + heading + description
- Suggested sample queries as clickable chips
- Max-w-md centered

### Navigation & Controls

**Top Header**:
- Full-width with border-bottom
- App title/logo on left
- Action buttons on right (Clear History, Settings)
- Height: h-16
- Padding: px-6

**Action Buttons**:
- Primary: Excel export - rounded-lg px-4 py-2, prominent treatment
- Secondary: Copy, Clear - rounded-lg px-3 py-2, subtle treatment
- Icon + text combination for clarity
- Use Heroicons for consistency

**Status Indicators**:
- Loading spinner during query processing
- Success/error badges after query execution
- Position: Top-right of results panel or inline with query

### Data Visualization

**Query Status Cards**:
- Compact cards showing: Query time, Rows returned, Status
- Horizontal layout with gap-4
- Icons for each metric (Heroicons: clock, table, check-circle)
- Text-sm with font-medium labels

**SQL Query Display**:
- Dedicated block with monospace font
- Subtle background panel with rounded-lg
- Syntax-like formatting (no actual highlighting needed)
- Copy button in top-right corner
- Padding: p-4
- Max-height with scroll if query is long

---

## Responsive Behavior

**Desktop (lg+)**:
- Side-by-side: Chat sidebar + Results panel
- Chat: w-96 fixed width
- Results: flex-1 remaining space

**Tablet (md)**:
- Chat collapses to bottom drawer/sheet
- Toggle button to show/hide chat
- Results take full width

**Mobile (base)**:
- Stacked vertical layout
- Chat interface priority, swipe up for results
- Sticky export button always visible

---

## Interaction Patterns

**Query Submission Flow**:
1. User types natural language query
2. Send button or Enter key triggers
3. Loading indicator appears
4. SQL query displays first (in chat)
5. Results table populates below
6. Export button becomes active

**Excel Export**:
- Single click initiates download
- Filename: `query_results_[timestamp].xlsx`
- Toast notification confirms download

**Chat History**:
- Persistent within session
- Scroll to bottom on new message
- Timestamp groups (Today, Yesterday) for organization

---

## Accessibility

- Semantic HTML: `<table>`, `<th>`, `<td>` for data
- ARIA labels for icon-only buttons
- Keyboard navigation: Tab through interactive elements, Enter to send
- Focus states: ring-2 ring-offset-2 on interactive elements
- Screen reader announcements for query status changes
- Sufficient contrast for all text (WCAG AA minimum)

---

## Technical Specifications

**Icons**: Heroicons via CDN (outline style primary, solid for emphasis)
**Tables**: Native HTML tables with Tailwind styling
**Scrolling**: Custom scrollbar styling for chat and results areas
**Animations**: Minimal - fade-in for new messages (200ms), slide-up for results table (300ms)

---

This design creates a professional, efficient database query tool that balances conversational AI interaction with robust data presentation capabilities.