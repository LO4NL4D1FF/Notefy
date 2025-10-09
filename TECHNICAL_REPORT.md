# Notefy - Technical Report
**Software Implementation Practical**

---

## Table of Contents
1. [Introduction & Project Objectives](#1-introduction--project-objectives)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [System Design Diagrams](#4-system-design-diagrams)
5. [Implementation Details](#5-implementation-details)
6. [Key Algorithms](#6-key-algorithms)
7. [Assumptions & Constraints](#7-assumptions--constraints)

---

## 1. Introduction & Project Objectives

### 1.1 Introduction
Notefy is a fast, offline-capable Markdown notes vault built entirely with vanilla JavaScript. The application provides a modern note-taking experience without requiring any frameworks, build tools, or server infrastructure. Users can create, edit, organize, and manage their notes entirely within their browser, with all data stored locally for privacy and offline access.

### 1.2 Project Objectives
The primary objectives of this project are:

1. **Simplicity**: Create a note-taking application that runs instantly without installation, dependencies, or complex setup
2. **Offline-First**: Enable users to work completely offline with full functionality and data persistence
3. **Privacy**: Keep all user data local to the device with no server communication or data collection
4. **Performance**: Deliver a fast, responsive user experience with minimal resource usage
5. **Accessibility**: Ensure the application is usable by everyone, including users with disabilities
6. **Progressive Web App**: Allow installation as a standalone application on any device

### 1.3 Target Users
- Students taking class notes
- Developers maintaining technical documentation
- Writers organizing ideas and drafts
- Anyone needing a simple, private note-taking solution

---

## 2. Functional Requirements

### 2.1 Core Note Management
- **FR-1**: Users shall be able to create new notes
- **FR-2**: Users shall be able to edit note titles and content
- **FR-3**: Users shall be able to delete notes with confirmation
- **FR-4**: Users shall be able to view a list of all notes
- **FR-5**: Notes shall auto-save after a configurable debounce period (400ms)
- **FR-6**: Notes shall display creation and last updated timestamps

### 2.2 Content Features
- **FR-7**: Users shall be able to write notes in Markdown format
- **FR-8**: Users shall be able to add inline hashtags for organization (#tag)
- **FR-9**: Users shall be able to add cover images to notes
- **FR-10**: Users shall be able to insert inline images into note content
- **FR-11**: Users shall be able to reposition cover images by dragging
- **FR-12**: Users shall be able to star/favorite important notes

### 2.3 Organization & Search
- **FR-13**: Users shall be able to search notes by title and content
- **FR-14**: Users shall be able to filter notes by tags
- **FR-15**: Tags shall be automatically extracted from note content
- **FR-16**: Search results shall highlight matching text

### 2.4 Multi-Note Editing
- **FR-17**: Users shall be able to open multiple notes in tabs
- **FR-18**: Users shall be able to switch between tabs
- **FR-19**: Users shall be able to close individual tabs

### 2.5 Import/Export
- **FR-21**: Users shall be able to export individual notes as .txt files
- **FR-22**: Users shall be able to export individual notes as .md files with frontmatter
- **FR-23**: Users shall be able to export all notes as a ZIP archive
- **FR-24**: Users shall be able to import notes from JSON backup files
- **FR-25**: Import shall merge notes by ID (imported data wins on conflicts)

### 2.6 History & Undo
- **FR-26**: Users shall be able to undo changes (up to 50 states)
- **FR-27**: Users shall be able to redo undone changes
- **FR-28**: Undo/redo shall work per note independently

### 2.7 User Interface
- **FR-29**: Users shall be able to toggle between dark and light themes
- **FR-30**: Theme preference shall persist across sessions
- **FR-31**: Users shall see visual save status indicators
- **FR-32**: Users shall see live word count for active note
- **FR-33**: Users shall receive toast notifications for important actions

---

## 3. Non-Functional Requirements

### 3.1 Performance
- **NFR-1**: Application shall load in under 2 seconds on modern browsers
- **NFR-2**: User input shall be debounced to prevent excessive saves
- **NFR-3**: Large images shall be stored in IndexedDB to avoid LocalStorage quota limits
- **NFR-4**: List rendering shall use incremental updates for efficiency
- **NFR-5**: JSZip library shall be lazy-loaded only when needed

### 3.2 Security
- **NFR-6**: All Markdown preview content shall be sanitized using DOMPurify
- **NFR-7**: User-generated HTML shall be stripped of dangerous tags and scripts
- **NFR-8**: Application shall prevent XSS attacks via content sanitization

### 3.3 Usability
- **NFR-9**: Interface shall be responsive across desktop, tablet, and mobile devices
- **NFR-10**: Application shall follow Material Design principles for consistency
- **NFR-11**: User shall receive clear feedback for all actions
- **NFR-12**: Error messages shall be descriptive and actionable

### 3.4 Accessibility
- **NFR-13**: Application shall use semantic HTML5 elements
- **NFR-14**: All interactive elements shall have ARIA labels and roles
- **NFR-15**: Navigation shall be fully supported
- **NFR-16**: Screen readers shall announce state changes via ARIA live regions
- **NFR-17**: Focus states shall be visible for all interactive elements
- **NFR-18**: Application shall respect `prefers-reduced-motion` user preference

### 3.5 Reliability
- **NFR-19**: Data shall persist in LocalStorage and IndexedDB
- **NFR-20**: Application shall handle storage quota errors gracefully
- **NFR-21**: Application shall work completely offline after first load
- **NFR-22**: Service worker shall cache all application resources

### 3.6 Compatibility
- **NFR-23**: Application shall support Chrome/Edge 90+
- **NFR-24**: Application shall support Firefox 88+
- **NFR-25**: Application shall support Safari 14+
- **NFR-26**: Application shall work on Windows, macOS, Linux, iOS, and Android

### 3.7 Maintainability
- **NFR-27**: Code shall be well-commented and self-documenting
- **NFR-28**: Functions shall follow single responsibility principle
- **NFR-29**: Code shall use consistent naming conventions
- **NFR-30**: No external build process required for development

---

## 4. System Design Diagrams

### 4.1 Use Case Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Notefy System                           │
│                                                                 │
│  ┌──────────────┐                                              │
│  │              │──────> Create Note                           │
│  │              │──────> Edit Note                             │
│  │              │──────> Delete Note                           │
│  │              │──────> Search Notes                          │
│  │     User     │──────> Filter by Tags                        │
│  │              │──────> Star/Unstar Note                      │
│  │              │──────> Add Cover Image                       │
│  │              │──────> Insert Inline Image                   │
│  └──────────────┘──────> Export Note (.txt/.md)                │
│         │        ──────> Export All Notes (.zip)               │
│         │        ──────> Import Notes (.json)                  │
│         │        ──────> Undo/Redo Changes                     │
│         │        ──────> Toggle Theme                          │
│         │        ──────> Open/Close Tabs                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Actor: User (primary)
System: Notefy (web application)
```

### 4.2 Component Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     Notefy Architecture                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                 Presentation Layer                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │    │
│  │  │  Header  │  │ Sidebar  │  │   Main   │             │    │
│  │  │          │  │          │  │  Editor  │             │    │
│  │  │ - Tabs   │  │ - Search │  │ - Title  │             │    │
│  │  │ - Search │  │ - Tags   │  │ - Editor │             │    │
│  │  │ - Actions│  │ - List   │  │ - Status │             │    │
│  │  └──────────┘  └──────────┘  └──────────┘             │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                 Application Layer                       │    │
│  │  ┌────────────────────────────────────────────┐        │    │
│  │  │          State Management (state object)   │        │    │
│  │  │  - notes[]                                 │        │    │
│  │  │  - activeId                                │        │    │
│  │  │  - openTabs[]                              │        │    │
│  │  │  - filter{query, tag}                      │        │    │
│  │  │  - undoStack[], redoStack[]                │        │    │
│  │  │  - theme, isOnline                         │        │    │
│  │  └────────────────────────────────────────────┘        │    │
│  │                            │                            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │    │
│  │  │  Event   │  │ Rendering│  │ Business │            │    │
│  │  │ Handlers │  │ Functions│  │  Logic   │            │    │
│  │  │          │  │          │  │          │            │    │
│  │  │ handle*()│  │ render*()│  │ extract  │            │    │
│  │  │          │  │          │  │ Tags()   │            │    │
│  │  └──────────┘  └──────────┘  │ debounce │            │    │
│  │                               │ autosave │            │    │
│  │                               └──────────┘            │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                  Data Layer                             │    │
│  │  ┌──────────────┐         ┌──────────────┐            │    │
│  │  │ LocalStorage │         │  IndexedDB   │            │    │
│  │  │              │         │              │            │    │
│  │  │ - Notes      │         │ - Images     │            │    │
│  │  │   metadata   │         │   (binary)   │            │    │
│  │  │ - Theme      │         │              │            │    │
│  │  │ - Prefs      │         │              │            │    │
│  │  └──────────────┘         └──────────────┘            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              External Libraries                         │    │
│  │  - Marked.js (Markdown parsing)                        │    │
│  │  - DOMPurify (HTML sanitization)                       │    │
│  │  - JSZip (ZIP file creation - lazy loaded)             │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Service Worker (sw.js)                     │    │
│  │  - Cache application assets                            │    │
│  │  - Enable offline functionality                        │    │
│  │  - PWA installation support                            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.3 Data Model / Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Data Model                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Note Entity                                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Note                                              │    │
│  ├────────────────────────────────────────────────────┤    │
│  │  - id: string (primary key)                       │    │
│  │  - title: string                                  │    │
│  │  - content: string (markdown)                     │    │
│  │  - tags: string[] (extracted from content)        │    │
│  │  - createdAt: timestamp                           │    │
│  │  - updatedAt: timestamp                           │    │
│  │  - archived: boolean                              │    │
│  │  - starred: boolean                               │    │
│  │  - coverImage: string | null (image ID ref)       │    │
│  │  - coverPosition: string (CSS position)           │    │
│  │  - images: object {imageId: true}                 │    │
│  └────────────────────────────────────────────────────┘    │
│                         │                                   │
│                         │ references                        │
│                         ▼                                   │
│  Image Entity (IndexedDB)                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Image                                             │    │
│  ├────────────────────────────────────────────────────┤    │
│  │  - id: string (primary key)                       │    │
│  │  - dataUrl: string (base64 image data)            │    │
│  │  - timestamp: number                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  State Object (In-Memory)                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  AppState                                          │    │
│  ├────────────────────────────────────────────────────┤    │
│  │  - notes: Note[]                                  │    │
│  │  - activeId: string | null                        │    │
│  │  - openTabs: string[]                             │    │
│  │  - filter: {query: string, tag: string | null}    │    │
│  │  - theme: 'dark' | 'light'                        │    │
│  │  - undoStack: Snapshot[]                          │    │
│  │  - redoStack: Snapshot[]                          │    │
│  │  - isOnline: boolean                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Undo/Redo Snapshot                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Snapshot                                          │    │
│  ├────────────────────────────────────────────────────┤    │
│  │  - id: string (note ID)                           │    │
│  │  - title: string                                  │    │
│  │  - content: string                                │    │
│  │  - timestamp: number                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Storage Distribution:                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  LocalStorage:                                     │    │
│  │  - notes_md_v1: Note[] (metadata only)            │    │
│  │  - notes_md_theme: string                         │    │
│  │  - notes_md_welcome_seen: boolean                 │    │
│  ├────────────────────────────────────────────────────┤    │
│  │  IndexedDB (NotefyDB):                             │    │
│  │  - images: Image[] (binary data)                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Data Flow Diagram (Level 0 - Context)

```
┌─────────────────────────────────────────────────────────────┐
│                   Data Flow Diagram                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        ┌─────────┐                          │
│                        │         │                          │
│                        │  User   │                          │
│                        │         │                          │
│                        └────┬────┘                          │
│                             │                               │
│              Create/Edit/Delete Notes                       │
│              Search/Filter Requests                         │
│              Import/Export Commands                         │
│                             │                               │
│                             ▼                               │
│              ┌──────────────────────────────┐              │
│              │                              │              │
│              │      Notefy Application      │              │
│              │                              │              │
│              │  - Process user input        │              │
│              │  - Manage note state         │              │
│              │  - Render UI                 │              │
│              │  - Handle data persistence   │              │
│              │                              │              │
│              └─────┬──────────────┬─────────┘              │
│                    │              │                        │
│       Store/Retrieve│              │Store/Retrieve         │
│           Metadata  │              │  Images               │
│                    │              │                        │
│                    ▼              ▼                        │
│         ┌──────────────┐   ┌──────────────┐              │
│         │              │   │              │              │
│         │ LocalStorage │   │  IndexedDB   │              │
│         │              │   │              │              │
│         │ - Notes[]    │   │ - Images[]   │              │
│         │ - Settings   │   │              │              │
│         │              │   │              │              │
│         └──────────────┘   └──────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Data Flow Diagram (Level 1 - Detailed)

```
┌──────────────────────────────────────────────────────────────┐
│                  Detailed Data Flow                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌────────┐                                │
│                    │  User  │                                │
│                    └───┬────┘                                │
│                        │                                     │
│        ┌───────────────┼───────────────┐                    │
│        │               │               │                    │
│   Type text       Click UI        Upload                    │
│        │               │            image                   │
│        ▼               ▼               ▼                    │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐               │
│  │  Editor  │   │   Event  │   │  Image   │               │
│  │  Handler │   │ Handlers │   │ Handler  │               │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘               │
│       │              │              │                      │
│       │              │              │                      │
│       ▼              ▼              ▼                      │
│  ┌────────────────────────────────────────┐               │
│  │      State Management Layer            │               │
│  │                                        │               │
│  │  Update state.notes                   │               │
│  │  Update state.activeId                │               │
│  │  Update state.filter                  │               │
│  └────┬────────────────────┬──────────────┘               │
│       │                    │                              │
│   Save Note             Save Image                        │
│       │                    │                              │
│       ▼                    ▼                              │
│  ┌──────────┐        ┌──────────┐                        │
│  │ saveNotes│        │saveImage │                        │
│  │   ToDB() │        │  ToDB()  │                        │
│  └────┬─────┘        └────┬─────┘                        │
│       │                   │                               │
│       ▼                   ▼                               │
│  ┌──────────┐        ┌──────────┐                        │
│  │  Local   │        │ Indexed  │                        │
│  │ Storage  │        │    DB    │                        │
│  └────┬─────┘        └────┬─────┘                        │
│       │                   │                               │
│  Load on init        Load on render                       │
│       │                   │                               │
│       ▼                   ▼                               │
│  ┌────────────────────────────────────────┐              │
│  │         Rendering Layer                │              │
│  │                                        │              │
│  │  - renderList()                       │              │
│  │  - renderMain()                       │              │
│  │  - renderTags()                       │              │
│  └────────────────┬───────────────────────┘              │
│                   │                                       │
│              Update DOM                                   │
│                   │                                       │
│                   ▼                                       │
│            ┌────────────┐                                 │
│            │  Browser   │                                 │
│            │    DOM     │                                 │
│            └────────────┘                                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Details

### 5.1 Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Libraries**:
  - Marked.js v4.0+ - Markdown parsing
  - DOMPurify v3.0+ - XSS protection
  - JSZip v3.10+ - ZIP file creation (lazy-loaded)
- **Storage**:
  - LocalStorage - Note metadata and settings (~5-10MB)
  - IndexedDB - Image binary data (~50MB+)
- **PWA**: Service Workers, Web App Manifest

### 5.2 Project Structure
```
notefy/
├── index.html              # Main HTML structure
├── styles.css              # All styling (dark/light themes)
├── app.js                  # Application logic (1811 lines)
├── sw.js                   # Service worker for offline support
├── manifest.webmanifest    # PWA manifest
├── libs/
│   ├── marked.min.js       # Markdown parser
│   ├── purify.min.js       # HTML sanitizer
│   └── jszip.min.js        # ZIP library (lazy-loaded)
├── icons/
│   └── notes.svg           # App icon
├── img/
│   └── NotefyFavicon.png   # Favicon
├── NotefyLogo.png          # Application logo
└── README.md               # Documentation
```

### 5.3 State Management
The application uses a centralized state object:
```javascript
const state = {
    notes: [],              // Array of all notes
    activeId: null,         // Currently selected note ID
    openTabs: [],           // Array of open note IDs
    filter: {               // Search/filter state
        query: '',          // Search query
        tag: null           // Selected tag filter
    },
    theme: 'dark',          // UI theme
    undoStack: [],          // Undo history (max 50)
    redoStack: [],          // Redo history
    isOnline: true          // Network status
};
```

### 5.4 Data Persistence Strategy
1. **LocalStorage**: Stores note metadata (title, content, tags, timestamps)
2. **IndexedDB**: Stores binary image data to avoid quota limits
3. **Separation**: Notes reference images by ID, actual image data stored separately
4. **Lazy Loading**: Images loaded from IndexedDB only when needed

### 5.5 Module Organization (app.js)
The code is organized into logical sections:
1. **State Management** (lines 1-40)
2. **Storage Repository** (lines 42-221)
3. **Utility Functions** (lines 223-327)
4. **Filter & Search** (lines 329-368)
5. **Rendering Functions** (lines 370-722)
6. **Event Handlers** (lines 724-1560)
7. **Initialization** (lines 1562-1811)

---

## 6. Key Algorithms

### 6.1 Tag Extraction Algorithm
**Location**: `app.js:251-261`

**Purpose**: Extract inline hashtags from note content

**Algorithm**:
```javascript
function extractTags(content) {
    // Regex matches: #word (2-24 chars, alphanumeric + _ -)
    const regex = /(?:^|\s)#([a-z0-9_-]{2,24})(?:\s|$)/gi;
    const tags = new Set();
    let match;

    while ((match = regex.exec(content)) !== null) {
        tags.add(match[1].toLowerCase());
    }

    return Array.from(tags);
}
```

**Complexity**: O(n) where n = content length

### 6.2 Debounced Autosave Algorithm
**Location**: `app.js:907-932`

**Purpose**: Prevent excessive saves during rapid typing

**Algorithm**:
```javascript
const autosave = debounce(() => {
    if (!state.activeId) return;

    renderStatus('Saving...');
    saveUndoState();  // Snapshot for undo

    const titleInput = document.getElementById('noteTitle');
    const editor = document.getElementById('unifiedEditor');

    updateNoteFields(state.activeId, {
        title: titleInput.value || 'Untitled',
        content: editor.textContent || ''
    });

    renderStatus('Saved just now');
    renderList();
    renderTags();

    setTimeout(() => renderStatus('Ready'), 2000);
}, 400);  // 400ms delay
```

**Debounce Implementation** (lines 236-246):
- Cancels previous timeout on each call
- Executes function only after 400ms of inactivity
- Reduces save operations from ~1000/min to ~1-2/min

### 6.3 Incremental List Rendering
**Location**: `app.js:377-412`

**Purpose**: Optimize rendering for large note lists

**Algorithm**:
```javascript
function renderList() {
    const filtered = getFilteredNotes();
    const existingItems = Array.from(notesList.querySelectorAll('.note-item'));
    const existingIds = existingItems.map(item => item.dataset.id);
    const filteredIds = filtered.map(note => note.id);

    // Check if structure changed
    const needsFullRender =
        existingIds.length !== filteredIds.length ||
        existingIds.some((id, index) => id !== filteredIds[index]);

    if (needsFullRender) {
        // Full re-render
        notesList.innerHTML = filtered.map(note =>
            createNoteItemHTML(note)
        ).join('');
        attachNoteItemListeners(notesList);
    } else {
        // Just update active class
        existingItems.forEach(item => {
            item.classList.toggle('active',
                item.dataset.id === state.activeId);
        });
    }
}
```

**Optimization**: Avoids DOM manipulation when only selection changes

### 6.4 Tag Highlighting in Editor
**Location**: `app.js:594-623`

**Purpose**: Live syntax highlighting for hashtags while preserving cursor position

**Algorithm**:
```javascript
function highlightTags() {
    const editor = document.getElementById('unifiedEditor');
    const selection = saveSelection(editor);  // Save cursor
    const text = editor.textContent;

    const tagRegex = /(?:^|\s)(#[a-z0-9_-]{2,24})(?=\s|$)/gi;
    let html = '';
    let lastIndex = 0;
    let match;

    // Build HTML with highlighted tags
    while ((match = tagRegex.exec(text)) !== null) {
        const beforeTag = text.substring(lastIndex, match.index);
        const whitespace = match[0][0] === ' ' ? ' ' : '';
        const tag = match[1];

        html += escapeHtml(beforeTag) + whitespace +
                `<span class="tag">${escapeHtml(tag)}</span>`;
        lastIndex = tagRegex.lastIndex;
    }
    html += escapeHtml(text.substring(lastIndex));

    if (editor.innerHTML !== html) {
        editor.innerHTML = html;
        restoreSelection(editor, selection);  // Restore cursor
    }
}
```

**Complexity**: O(n + m) where n = content length, m = number of tags

### 6.5 Search & Filter Algorithm
**Location**: `app.js:335-355`

**Purpose**: Efficiently filter notes by query and tags

**Algorithm**:
```javascript
function getFilteredNotes() {
    let filtered = state.notes.filter(note => !note.archived);

    // Apply search query
    if (state.filter.query) {
        const query = state.filter.query.toLowerCase();
        filtered = filtered.filter(note =>
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query)
        );
    }

    // Apply tag filter
    if (state.filter.tag) {
        filtered = filtered.filter(note =>
            note.tags.includes(state.filter.tag)
        );
    }

    return filtered;
}
```

**Complexity**: O(n × m) where n = number of notes, m = average content length

### 6.6 Undo/Redo Stack Management
**Location**: `app.js:1204-1289`

**Purpose**: Maintain edit history with limited memory footprint

**Algorithm**:
```javascript
function saveUndoState() {
    if (!state.activeId) return;
    const note = getNoteById(state.activeId);

    const snapshot = {
        id: note.id,
        title: note.title,
        content: note.content,
        timestamp: Date.now()
    };

    state.undoStack.push(snapshot);

    // Limit stack size to 50
    if (state.undoStack.length > 50) {
        state.undoStack.shift();
    }

    // Clear redo stack on new change
    state.redoStack = [];
}

function handleUndo() {
    if (state.undoStack.length === 0) return;

    const note = getNoteById(state.activeId);

    // Save current state to redo
    state.redoStack.push({
        id: note.id,
        title: note.title,
        content: note.content,
        timestamp: Date.now()
    });

    // Restore previous state
    const previousState = state.undoStack.pop();
    updateNoteFields(previousState.id, {
        title: previousState.title,
        content: previousState.content
    });

    renderMain();
}
```

**Data Structure**: Two stacks (LIFO)
- **undoStack**: Past states (max 50)
- **redoStack**: Future states (cleared on new edits)

---

## 7. Assumptions & Constraints

### 7.1 Assumptions
1. **Modern Browser**: Users have a modern browser with ES6+ support
2. **JavaScript Enabled**: Application requires JavaScript to function
3. **Storage Available**: LocalStorage and IndexedDB are available and not disabled
4. **Single User**: Application designed for single-user, local-only use
5. **Trusted Content**: Users are trusted not to inject malicious content (though sanitized)
6. **Image Sizes**: Users upload reasonably-sized images (< 5MB recommended)

### 7.2 Constraints
1. **Storage Limits**:
   - LocalStorage: ~5-10MB (browser-dependent)
   - IndexedDB: ~50MB+ (quota varies by browser)
2. **No Synchronization**: Data stored locally only, no cloud sync
3. **No Collaboration**: Single-user application, no multi-user editing
4. **Browser-Specific**: Different browsers may have different storage quotas
5. **No Server**: Completely client-side, no backend infrastructure

### 7.3 Design Decisions
1. **Vanilla JavaScript**: Chosen for simplicity, no build process, instant load
2. **Dual Storage**: LocalStorage for metadata, IndexedDB for images (quota optimization)
3. **Lazy Loading**: JSZip loaded only when exporting all notes (performance)
4. **Debounced Saves**: 400ms delay balances responsiveness and efficiency
5. **Incremental Rendering**: List updates optimized for large note collections
6. **PWA Architecture**: Enables offline-first experience and installability

### 7.4 Known Limitations
1. **Search**: Simple substring matching (no fuzzy search or advanced queries)
2. **Image Storage**: Base64 encoding increases size by ~33%
3. **No Encryption**: Notes stored in plain text locally
4. **No Version Control**: Only linear undo/redo (max 50 states)
5. **Archive Feature**: Data model supports it, but UI not implemented

---

## Conclusion

Notefy successfully achieves its objectives of providing a fast, offline-capable, privacy-focused note-taking application. The vanilla JavaScript implementation ensures zero dependencies, instant startup, and broad compatibility. The dual-storage architecture (LocalStorage + IndexedDB) optimizes for both performance and storage efficiency. Key algorithms like debounced autosave, incremental rendering, and tag extraction ensure a responsive user experience even with large note collections.

The application demonstrates solid software engineering principles including separation of concerns, defensive programming with XSS protection, accessibility considerations, and progressive enhancement through PWA capabilities.

---

**End of Technical Report**
