# JavaScript Code Explanation - Notefy

This document provides a detailed line-by-line explanation of all JavaScript files in the Notefy application.

---

## Table of Contents

1. [app.js - Main Application Logic](#appjs---main-application-logic)
2. [sw.js - Service Worker](#swjs---service-worker)

---

## app.js - Main Application Logic

### Lines 1-4: File Header Comment
```javascript
/**
 * Notefy - Markdown Notes App
 * A fast, offline-capable notes vault with Markdown support
 */
```
- Documentation comment describing the purpose of the application

### Lines 6-24: State Management Object
```javascript
const state = {
    notes: [],
    activeId: null,
    openTabs: [],
    filter: { query: '', tag: null },
    theme: 'dark',
    saveTimeout: null,
    previewTimeout: null,
    undoStack: [],
    redoStack: [],
    isOnline: true
};
```
- **Line 10**: `notes: []` - Array to store all note objects
- **Line 11**: `activeId: null` - ID of the currently selected/active note
- **Line 12**: `openTabs: []` - Array of note IDs that are open as tabs
- **Line 14**: `filter.query` - Current search query string
- **Line 15**: `filter.tag` - Currently selected tag filter (null if none)
- **Line 18**: `theme: 'dark'` - Current theme (dark or light)
- **Line 19**: `saveTimeout: null` - Timeout ID for debounced autosave
- **Line 20**: `previewTimeout: null` - Timeout ID for preview updates
- **Line 21**: `undoStack: []` - Stack of previous note states for undo functionality
- **Line 22**: `redoStack: []` - Stack of undone states for redo functionality
- **Line 23**: `isOnline: true` - Boolean tracking online/offline status

### Lines 26-36: Cleanup Function
```javascript
function cleanup() {
    if (state.saveTimeout) {
        clearTimeout(state.saveTimeout);
        state.saveTimeout = null;
    }
    if (state.previewTimeout) {
        clearTimeout(state.previewTimeout);
        state.previewTimeout = null;
    }
}
```
- **Line 27**: Function to clear any pending timeouts
- **Line 28-31**: If autosave timeout exists, clear it and reset to null
- **Line 32-35**: If preview timeout exists, clear it and reset to null
- Prevents memory leaks and ensures clean app shutdown

### Lines 38-39: Cleanup Event Listener
```javascript
window.addEventListener('beforeunload', cleanup);
```
- Calls cleanup function before the page unloads
- Ensures timeouts are cleared when user closes/refreshes the page

### Lines 45-50: Storage Constants
```javascript
const STORAGE_KEY = 'notes_md_v1';
const THEME_KEY = 'notes_md_theme';
const WELCOME_SEEN_KEY = 'notes_md_welcome_seen';
const DB_NAME = 'NotefyDB';
const DB_VERSION = 1;
const IMAGE_STORE = 'images';
```
- **Line 45**: LocalStorage key for storing notes data
- **Line 46**: LocalStorage key for storing theme preference
- **Line 47**: LocalStorage key to track if welcome screen was shown
- **Line 48**: IndexedDB database name
- **Line 49**: IndexedDB version number
- **Line 50**: Name of IndexedDB object store for images

### Lines 52: Database Variable
```javascript
let db = null;
```
- Global variable to hold IndexedDB database connection

### Lines 57-74: Initialize IndexedDB
```javascript
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(IMAGE_STORE)) {
                database.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
            }
        };
    });
}
```
- **Line 58**: Returns a Promise for async handling
- **Line 59**: Opens IndexedDB connection with name and version
- **Line 61**: Error handler - rejects promise if open fails
- **Line 62-65**: Success handler - saves database reference and resolves
- **Line 67-72**: Upgrade handler - runs when database is first created or version changes
- **Line 69**: Checks if object store already exists
- **Line 70**: Creates 'images' object store with 'id' as the key path

### Lines 79-90: Save Image to IndexedDB
```javascript
async function saveImageToDB(id, dataUrl) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IMAGE_STORE], 'readwrite');
        const store = transaction.objectStore(IMAGE_STORE);
        const request = store.put({ id, dataUrl, timestamp: Date.now() });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
```
- **Line 80**: If database not initialized, initialize it first
- **Line 83**: Creates a read/write transaction on the images store
- **Line 84**: Gets reference to the object store
- **Line 85**: Stores object with id, dataUrl, and timestamp
- **Line 87**: Success handler resolves the promise
- **Line 88**: Error handler rejects with the error

### Lines 95-106: Get Image from IndexedDB
```javascript
async function getImageFromDB(id) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IMAGE_STORE], 'readonly');
        const store = transaction.objectStore(IMAGE_STORE);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result?.dataUrl || null);
        request.onerror = () => reject(request.error);
    });
}
```
- **Line 96**: Initializes DB if needed
- **Line 99**: Creates readonly transaction
- **Line 101**: Retrieves item by ID
- **Line 103**: Returns dataUrl if found, otherwise null (using optional chaining)

### Lines 111-122: Delete Image from IndexedDB
```javascript
async function deleteImageFromDB(id) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IMAGE_STORE], 'readwrite');
        const store = transaction.objectStore(IMAGE_STORE);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
```
- **Line 117**: Deletes the image record with the given ID
- Similar pattern to save/get functions

### Lines 127-135: Load Notes from LocalStorage
```javascript
function loadNotes() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Failed to load notes:', error);
        return [];
    }
}
```
- **Line 129**: Gets notes data from LocalStorage
- **Line 130**: Parses JSON if data exists, otherwise returns empty array
- **Line 131-133**: Error handling - logs error and returns empty array

### Lines 140-158: Save Notes to LocalStorage
```javascript
function saveNotes(notes) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        return true;
    } catch (error) {
        console.error('Failed to save notes:', error);

        if (error.name === 'QuotaExceededError' ||
            error.code === 22 ||
            error.code === 1014 ||
            error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            showToast('Storage quota exceeded! Try removing images or exporting old notes.', 5000);
        } else {
            showToast('Failed to save notes');
        }
        return false;
    }
}
```
- **Line 142**: Converts notes array to JSON and saves to LocalStorage
- **Line 148-151**: Checks for quota exceeded errors (multiple error codes for browser compatibility)
- **Line 152**: Shows specific error message for quota issues
- **Line 154**: Shows generic error message for other failures

### Lines 163-179: Create New Note
```javascript
function createNote() {
    const note = {
        id: generateId(),
        title: 'Untitled',
        content: '',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        archived: false,
        starred: false,
        coverImage: null,
        images: {}
    };
    state.notes.unshift(note);
    saveNotes(state.notes);
    return note;
}
```
- **Line 165**: Generates unique ID
- **Line 166-174**: Creates note object with default values
- **Line 176**: Adds note to beginning of notes array (unshift)
- **Line 177**: Saves updated notes array to storage
- **Line 178**: Returns the newly created note

### Lines 184-201: Update Note Fields
```javascript
function updateNoteFields(id, patch) {
    const note = state.notes.find(n => n.id === id);
    if (!note) return false;

    Object.assign(note, patch);
    note.updatedAt = Date.now();

    if (patch.content !== undefined) {
        note.tags = extractTags(note.content);
    }

    state.notes.sort((a, b) => b.updatedAt - a.updatedAt);

    saveNotes(state.notes);
    return true;
}
```
- **Line 185**: Finds note by ID
- **Line 186**: Returns false if note not found
- **Line 188**: Merges patch object into note (updates fields)
- **Line 189**: Updates the updatedAt timestamp
- **Line 192**: If content changed, re-extract tags from content
- **Line 196**: Re-sorts notes by most recently updated first
- **Line 198**: Saves changes to storage

### Lines 206-213: Delete Note
```javascript
function deleteNote(id) {
    const index = state.notes.findIndex(n => n.id === id);
    if (index === -1) return false;

    state.notes.splice(index, 1);
    saveNotes(state.notes);
    return true;
}
```
- **Line 207**: Finds index of note with given ID
- **Line 210**: Removes note from array using splice
- **Line 211**: Saves updated notes array

### Lines 218-220: Get Note by ID
```javascript
function getNoteById(id) {
    return state.notes.find(n => n.id === id);
}
```
- Simple helper to find and return a note by its ID

### Lines 229-231: Generate Unique ID
```javascript
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
```
- **Line 230**: Creates ID from timestamp + random alphanumeric string
- Example: "1696234567890-k2j4h5g3f"

### Lines 236-246: Debounce Function
```javascript
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
```
- **Line 237**: Stores timeout ID in closure
- **Line 238**: Returns wrapper function
- **Line 243**: Clears any existing timeout
- **Line 244**: Sets new timeout to call function after wait period
- Prevents function from being called too frequently (e.g., on every keystroke)

### Lines 251-261: Extract Tags from Content
```javascript
function extractTags(content) {
    const regex = /(?:^|\s)#([a-z0-9_-]{2,24})(?:\s|$)/gi;
    const tags = new Set();
    let match;

    while ((match = regex.exec(content)) !== null) {
        tags.add(match[1].toLowerCase());
    }

    return Array.from(tags);
}
```
- **Line 252**: Regex pattern to match hashtags (#word)
  - `(?:^|\s)` - Must start at beginning or after whitespace
  - `#([a-z0-9_-]{2,24})` - Hash followed by 2-24 alphanumeric/dash/underscore chars
  - `(?:\s|$)` - Must end with whitespace or end of string
- **Line 253**: Uses Set to automatically deduplicate tags
- **Line 256-258**: Loops through all regex matches and adds to set
- **Line 257**: Converts tag to lowercase and adds to set
- **Line 260**: Converts Set back to Array

### Lines 266-281: Format Timestamp
```javascript
function formatTimestamp(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    const date = new Date(timestamp);
    return date.toLocaleDateString();
}
```
- **Line 268**: Calculates difference between now and timestamp
- **Line 269-272**: Converts to seconds, minutes, hours, days
- **Line 274-277**: Returns relative time strings for recent times
- **Line 279-280**: Returns formatted date for older items

### Lines 286-289: Count Words
```javascript
function countWords(text) {
    if (!text || text.trim().length === 0) return 0;
    return text.trim().split(/\s+/).length;
}
```
- **Line 287**: Returns 0 if text is empty
- **Line 288**: Splits by whitespace and counts resulting words

### Lines 294-302: Show Toast Notification
```javascript
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}
```
- **Line 294**: Default duration is 3000ms (3 seconds)
- **Line 296**: Sets toast message text
- **Line 297**: Adds 'show' class to make toast visible
- **Line 299-301**: Removes 'show' class after duration to hide toast

### Lines 307-326: Parse Markdown
```javascript
function parseMarkdown(content) {
    if (!content) return '';

    const html = marked.parse(content);

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'hr',
            'strong', 'em', 'u', 's', 'del',
            'a', 'img',
            'ul', 'ol', 'li',
            'blockquote', 'pre', 'code',
            'table', 'thead', 'tbody', 'tr', 'th', 'td'
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class']
    });
}
```
- **Line 311**: Converts Markdown to HTML using marked.js library
- **Line 314-324**: Sanitizes HTML with DOMPurify to prevent XSS attacks
- **Line 315-322**: Whitelist of allowed HTML tags
- **Line 324**: Whitelist of allowed HTML attributes
- Returns safe HTML string

### Lines 335-355: Get Filtered Notes
```javascript
function getFilteredNotes() {
    let filtered = state.notes.filter(note => !note.archived);

    if (state.filter.query) {
        const query = state.filter.query.toLowerCase();
        filtered = filtered.filter(note =>
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query)
        );
    }

    if (state.filter.tag) {
        filtered = filtered.filter(note =>
            note.tags.includes(state.filter.tag)
        );
    }

    return filtered;
}
```
- **Line 336**: First filters out archived notes
- **Line 339-345**: If search query exists, filter by title or content match
- **Line 340**: Converts query to lowercase for case-insensitive search
- **Line 348-351**: If tag filter exists, filter notes that have that tag
- Returns final filtered array

### Lines 360-368: Get All Tags
```javascript
function getAllTags() {
    const tagsSet = new Set();
    state.notes.forEach(note => {
        if (!note.archived) {
            note.tags.forEach(tag => tagsSet.add(tag));
        }
    });
    return Array.from(tagsSet).sort();
}
```
- **Line 361**: Uses Set to collect unique tags
- **Line 362-366**: Loops through all non-archived notes and collects their tags
- **Line 367**: Converts Set to Array and sorts alphabetically

### Lines 377-412: Render Notes List
```javascript
function renderList() {
    const notesList = document.getElementById('notesList');
    const emptyState = document.getElementById('emptyState');
    const filtered = getFilteredNotes();

    if (filtered.length === 0) {
        notesList.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }

    notesList.style.display = 'block';
    emptyState.style.display = 'none';

    const existingItems = Array.from(notesList.querySelectorAll('.note-item'));
    const existingIds = existingItems.map(item => item.dataset.id);
    const filteredIds = filtered.map(note => note.id);

    const needsFullRender =
        existingIds.length !== filteredIds.length ||
        existingIds.some((id, index) => id !== filteredIds[index]);

    if (needsFullRender) {
        notesList.innerHTML = filtered.map(note => createNoteItemHTML(note)).join('');
        attachNoteItemListeners(notesList);
    } else {
        existingItems.forEach(item => {
            const isActive = item.dataset.id === state.activeId;
            item.classList.toggle('active', isActive);
        });
    }
}
```
- **Line 380**: Gets filtered notes
- **Line 382-386**: If no notes, show empty state message
- **Line 392-394**: Gets existing DOM items and their IDs
- **Line 396-398**: Determines if full re-render is needed (optimization)
- **Line 400-403**: Full re-render if list changed
- **Line 404-409**: Otherwise just update active state classes

### Lines 417-453: Create Note Item HTML
```javascript
function createNoteItemHTML(note) {
    const query = state.filter.query.toLowerCase();
    let titleHTML = escapeHtml(note.title);

    if (query) {
        const titleLower = note.title.toLowerCase();
        const index = titleLower.indexOf(query);
        if (index !== -1) {
            const before = escapeHtml(note.title.substring(0, index));
            const match = escapeHtml(note.title.substring(index, index + query.length));
            const after = escapeHtml(note.title.substring(index + query.length));
            titleHTML = `${before}<mark>${match}</mark>${after}`;
        }
    }

    return `
        <li class="note-item ${note.id === state.activeId ? 'active' : ''}"
            data-id="${note.id}"
            tabindex="0"
            role="listitem"
            aria-label="${escapeHtml(note.title)}">
            <div class="note-item-title">
                ${note.starred ? '<svg class="note-item-star" ...>...</svg>' : ''}
                ${titleHTML}
            </div>
            <div class="note-item-meta">
                <span>${formatTimestamp(note.updatedAt)}</span>
            </div>
            ${note.tags.length > 0 ? `
                <div class="note-item-tags">
                    ${note.tags.map(tag => `<span class="note-item-tag">#${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
        </li>
    `;
}
```
- **Line 419**: Escapes HTML in title for safety
- **Line 421-429**: Highlights search query match in title with `<mark>` tags
- **Line 433-452**: Returns HTML string for note list item
- **Line 434**: Adds 'active' class if this is the active note
- **Line 440**: Shows star icon if note is starred
- **Line 444**: Shows formatted timestamp
- **Line 446-450**: Shows tags if note has any

### Lines 458-473: Attach Event Listeners to Note Items
```javascript
function attachNoteItemListeners(notesList) {
    notesList.querySelectorAll('.note-item').forEach(item => {
        item.addEventListener('click', () => {
            selectNote(item.dataset.id);
        });

        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                selectNote(item.dataset.id);
            } else if (e.key === 'Delete') {
                e.preventDefault();
                handleDeleteNote(item.dataset.id);
            }
        });
    });
}
```
- **Line 460-462**: Click listener to select note
- **Line 464-471**: Keyboard navigation
  - Enter key selects note
  - Delete key deletes note

### Lines 478-511: Render Tags
```javascript
function renderTags() {
    const tagChips = document.getElementById('tagChips');
    const tags = getAllTags();

    const allChip = `
        <button class="tag-chip ${!state.filter.tag ? 'active' : ''}"
                data-tag=""
                aria-label="Show all notes"
                aria-pressed="${!state.filter.tag}">
            All
        </button>
    `;

    const tagChipsHtml = tags.map(tag => `
        <button class="tag-chip ${state.filter.tag === tag ? 'active' : ''}"
                data-tag="${escapeHtml(tag)}"
                aria-label="Filter by ${escapeHtml(tag)}"
                aria-pressed="${state.filter.tag === tag}">
            #${escapeHtml(tag)}
        </button>
    `).join('');

    tagChips.innerHTML = allChip + tagChipsHtml;

    tagChips.querySelectorAll('.tag-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const tag = chip.dataset.tag;
            state.filter.tag = tag || null;
            renderTags();
            renderList();
        });
    });
}
```
- **Line 482-489**: Creates "All" chip button
- **Line 491-498**: Creates chip button for each tag
- **Line 503-509**: Adds click listeners to toggle tag filter

### Lines 516-589: Render Main Editor
```javascript
async function renderMain() {
    const editorContainer = document.getElementById('editorContainer');
    const noNoteSelected = document.getElementById('noNoteSelected');

    if (!state.activeId) {
        editorContainer.style.display = 'none';
        noNoteSelected.style.display = 'flex';
        return;
    }

    const note = getNoteById(state.activeId);
    if (!note) {
        editorContainer.style.display = 'none';
        noNoteSelected.style.display = 'flex';
        return;
    }

    editorContainer.style.display = 'flex';
    noNoteSelected.style.display = 'none';

    const titleInput = document.getElementById('noteTitle');
    const unifiedEditor = document.getElementById('unifiedEditor');
    const coverImageContainer = document.getElementById('coverImageContainer');
    const coverImage = document.getElementById('coverImage');
    const starBtn = document.getElementById('starNoteBtn');
    const addCoverBtn = document.getElementById('addCoverBtn');
    const createdDate = document.getElementById('createdDate');

    titleInput.value = note.title;

    if (unifiedEditor.textContent !== note.content) {
        unifiedEditor.textContent = note.content;
    }

    if (note.coverImage) {
        coverImageContainer.style.display = 'block';

        if (note.coverImage.startsWith('img_')) {
            const imageData = await getImageFromDB(note.coverImage);
            if (imageData) {
                coverImage.src = imageData;
            }
        } else {
            coverImage.src = note.coverImage;
        }

        addCoverBtn.style.display = 'none';
    } else {
        coverImageContainer.style.display = 'none';
        addCoverBtn.style.display = 'flex';
    }

    if (note.starred) {
        starBtn.classList.add('starred');
    } else {
        starBtn.classList.remove('starred');
    }

    const dateStr = new Date(note.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    createdDate.textContent = `Created ${dateStr}`;

    highlightTags();
    renderCounts();
    renderStatus('Ready');
}
```
- **Line 520-524**: If no active note, show "no note selected" message
- **Line 544**: Sets title input value
- **Line 547-549**: Sets editor content (only if changed to avoid cursor issues)
- **Line 552-568**: Handles cover image display
  - **Line 556-561**: If image ID, loads from IndexedDB
  - **Line 562-564**: Otherwise uses direct data URL
- **Line 572-576**: Updates star button appearance
- **Line 579-583**: Formats and displays creation date
- **Line 586-588**: Updates tag highlighting, word count, and status

### Lines 594-623: Highlight Tags in Editor
```javascript
function highlightTags() {
    const editor = document.getElementById('unifiedEditor');
    if (!editor) return;

    const selection = saveSelection(editor);
    const text = editor.textContent;

    const tagRegex = /(?:^|\s)(#[a-z0-9_-]{2,24})(?=\s|$)/gi;
    let html = '';
    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(text)) !== null) {
        const beforeTag = text.substring(lastIndex, match.index);
        const whitespace = match[0].startsWith(' ') || match[0].startsWith('\n') ? match[0][0] : '';
        const tag = match[1];

        html += escapeHtml(beforeTag) + whitespace + `<span class="tag">${escapeHtml(tag)}</span>`;
        lastIndex = tagRegex.lastIndex;
    }

    html += escapeHtml(text.substring(lastIndex));

    if (editor.innerHTML !== html) {
        editor.innerHTML = html;
        restoreSelection(editor, selection);
    }
}
```
- **Line 598**: Saves current cursor position
- **Line 602**: Regex to find all hashtags
- **Line 606-614**: Loops through matches and wraps tags in span elements
- **Line 609**: Preserves whitespace before tag
- **Line 612**: Wraps tag in styled span
- **Line 618-621**: Only updates DOM if HTML changed, then restores cursor

### Lines 628-642: Save Cursor Selection
```javascript
function saveSelection(el) {
    const sel = window.getSelection();
    if (sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(el);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;

    return {
        start: start,
        end: start + range.toString().length
    };
}
```
- **Line 629**: Gets current text selection
- **Line 633-636**: Calculates character position of selection start
- **Line 638-641**: Returns object with start and end positions

### Lines 647-682: Restore Cursor Selection
```javascript
function restoreSelection(el, savedSel) {
    if (!savedSel) return;

    let charIndex = 0;
    const range = document.createRange();
    range.setStart(el, 0);
    range.collapse(true);
    const nodeStack = [el];
    let node;
    let foundStart = false;
    let stop = false;

    while (!stop && (node = nodeStack.pop())) {
        if (node.nodeType === 3) {  // Text node
            const nextCharIndex = charIndex + node.length;
            if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
                range.setStart(node, savedSel.start - charIndex);
                foundStart = true;
            }
            if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
                range.setEnd(node, savedSel.end - charIndex);
                stop = true;
            }
            charIndex = nextCharIndex;
        } else {
            let i = node.childNodes.length;
            while (i--) {
                nodeStack.push(node.childNodes[i]);
            }
        }
    }

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}
```
- **Line 650**: Initializes character index counter
- **Line 659**: Walks through DOM tree to find text nodes
- **Line 660-676**: Searches for saved selection positions in text nodes
- **Line 679-681**: Applies the restored selection

### Lines 687-696: Render Word Count
```javascript
function renderCounts() {
    if (!state.activeId) return;

    const unifiedEditor = document.getElementById('unifiedEditor');
    if (!unifiedEditor) return;

    const wordCount = document.getElementById('wordCount');
    const count = countWords(unifiedEditor.textContent || '');
    wordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;
}
```
- **Line 694**: Counts words in editor content
- **Line 695**: Updates word count display with proper pluralization

### Lines 701-712: Render Save Status
```javascript
function renderStatus(status) {
    const saveStatus = document.getElementById('saveStatus');
    saveStatus.textContent = status;

    saveStatus.classList.remove('saving', 'saved');
    if (status === 'Saving...') {
        saveStatus.classList.add('saving');
    } else if (status === 'Saved just now' || status.startsWith('Saved')) {
        saveStatus.classList.add('saved');
    }
}
```
- **Line 703**: Sets status text
- **Line 706**: Removes old status classes
- **Line 707-710**: Adds appropriate class based on status

### Lines 717-721: Escape HTML
```javascript
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```
- Creates temporary div element
- Sets text content (which auto-escapes HTML)
- Returns escaped HTML
- Prevents XSS attacks

### Lines 730-744: Select Note
```javascript
function selectNote(id) {
    if (!state.openTabs.includes(id)) {
        state.openTabs.push(id);
    }
    state.activeId = id;
    renderTabs();
    renderList();
    renderMain();

    setTimeout(() => {
        document.getElementById('noteTitle').focus();
    }, 0);
}
```
- **Line 732-734**: Adds note to open tabs if not already there
- **Line 735**: Sets as active note
- **Line 736-738**: Re-renders UI
- **Line 741-743**: Focuses title input after render completes

### Lines 749-817: Render Tabs
```javascript
function renderTabs() {
    const tabsContainer = document.getElementById('tabsContainer');

    tabsContainer.innerHTML = state.openTabs.map((noteId, index) => {
        const note = getNoteById(noteId);
        if (!note) return '';

        return `
            <button class="note-tab ${noteId === state.activeId ? 'active' : ''}"
                    data-id="${noteId}"
                    data-tab-index="${index}"
                    tabindex="0"
                    role="tab"
                    aria-selected="${noteId === state.activeId}"
                    aria-label="Tab for ${escapeHtml(note.title)}">
                <span class="note-tab-title">${escapeHtml(note.title)}</span>
                <span class="note-tab-close" data-close="${noteId}" aria-label="Close ${escapeHtml(note.title)}">
                    <svg width="12" height="12" ...>...</svg>
                </span>
            </button>
        `;
    }).join('');

    tabsContainer.querySelectorAll('.note-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            if (!e.target.closest('.note-tab-close')) {
                selectNote(tab.dataset.id);
            }
        });

        tab.addEventListener('keydown', (e) => {
            const currentIndex = parseInt(tab.dataset.tabIndex);
            const tabs = Array.from(tabsContainer.querySelectorAll('.note-tab'));

            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault();
                tabs[currentIndex - 1].focus();
            } else if (e.key === 'ArrowRight' && currentIndex < tabs.length - 1) {
                e.preventDefault();
                tabs[currentIndex + 1].focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectNote(tab.dataset.id);
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                closeTab(tab.dataset.id);
                if (tabs[currentIndex + 1]) {
                    setTimeout(() => tabs[currentIndex + 1].focus(), 0);
                } else if (tabs[currentIndex - 1]) {
                    setTimeout(() => tabs[currentIndex - 1].focus(), 0);
                }
            }
        });
    });

    tabsContainer.querySelectorAll('.note-tab-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(closeBtn.dataset.close);
        });
    });
}
```
- **Line 752-772**: Creates HTML for each tab
- **Line 775-779**: Click listener to select tab (unless clicking close button)
- **Line 784-807**: Keyboard navigation for tabs
  - Arrow keys to navigate between tabs
  - Enter/Space to select tab
  - Delete/Backspace to close tab
- **Line 810-815**: Close button listeners

### Lines 822-839: Close Tab
```javascript
function closeTab(noteId) {
    const index = state.openTabs.indexOf(noteId);
    if (index > -1) {
        state.openTabs.splice(index, 1);
    }

    if (state.activeId === noteId) {
        if (state.openTabs.length > 0) {
            state.activeId = state.openTabs[state.openTabs.length - 1];
        } else {
            state.activeId = null;
        }
    }

    renderTabs();
    renderMain();
}
```
- **Line 823-825**: Removes tab from openTabs array
- **Line 828-833**: If closing active tab, switch to last remaining tab or clear active
- **Line 835-836**: Re-renders UI

### Lines 844-849: Close All Tabs
```javascript
function closeAllTabs() {
    state.openTabs = [];
    state.activeId = null;
    renderTabs();
    renderMain();
}
```
- Clears all tabs and active note

### Lines 854-873: Handle New Note
```javascript
function handleNewNote() {
    const note = createNote();
    state.activeId = note.id;
    state.filter.query = '';
    state.filter.tag = null;

    document.getElementById('searchInput').value = '';

    renderTags();
    renderList();
    renderMain();

    setTimeout(() => {
        document.getElementById('noteTitle').focus();
        document.getElementById('noteTitle').select();
    }, 0);

    showToast('New note created');
}
```
- **Line 855**: Creates new note
- **Line 856**: Sets as active note
- **Line 857-858**: Clears any active filters
- **Line 867-870**: Focuses and selects title for easy editing

### Lines 878-902: Handle Delete Note
```javascript
function handleDeleteNote(id = state.activeId) {
    if (!id) return;

    const note = getNoteById(id);
    if (!note) return;

    if (!confirm(`Delete "${note.title}"? This cannot be undone.`)) {
        return;
    }

    const wasActive = id === state.activeId;
    deleteNote(id);

    if (wasActive) {
        const filtered = getFilteredNotes();
        state.activeId = filtered.length > 0 ? filtered[0].id : null;
    }

    renderTags();
    renderList();
    renderMain();

    showToast('Note deleted');
}
```
- **Line 884**: Shows confirmation dialog
- **Line 888**: Tracks if deleting active note
- **Line 891-894**: If deleted active note, select first available note

### Lines 907-932: Autosave
```javascript
const autosave = debounce(() => {
    if (!state.activeId) return;

    renderStatus('Saving...');

    saveUndoState();

    const titleInput = document.getElementById('noteTitle');
    const unifiedEditor = document.getElementById('unifiedEditor');

    updateNoteFields(state.activeId, {
        title: titleInput.value || 'Untitled',
        content: unifiedEditor.textContent || ''
    });

    renderStatus('Saved just now');
    renderList();
    renderTags();
    renderCounts();

    setTimeout(() => {
        renderStatus('Ready');
    }, 2000);
}, 400);
```
- **Line 907**: Wraps function in debounce with 400ms delay
- **Line 913**: Saves current state for undo before making changes
- **Line 918-921**: Updates note with current title and content
- **Line 923-926**: Updates UI to reflect changes
- **Line 929-931**: Clears "Saved" status after 2 seconds

### Lines 937-940: Handle Search
```javascript
function handleSearch(query) {
    state.filter.query = query;
    renderList();
}
```
- Updates search filter and re-renders list

### Lines 945-1011: Export Note
```javascript
function handleExportNote(format = 'txt') {
    if (!state.activeId) return;

    const note = getNoteById(state.activeId);
    if (!note) return;

    let content = '';
    let mimeType = 'text/plain';
    let extension = '.txt';

    if (format === 'md') {
        content = `# ${note.title}\n\n`;

        content += `---\n`;
        content += `created: ${new Date(note.createdAt).toISOString()}\n`;
        content += `updated: ${new Date(note.updatedAt).toISOString()}\n`;
        if (note.tags.length > 0) {
            content += `tags: [${note.tags.join(', ')}]\n`;
        }
        content += `---\n\n`;

        content += note.content;
        extension = '.md';
        mimeType = 'text/markdown';
    } else {
        content = `${note.title}\n${'='.repeat(note.title.length)}\n\n`;

        content += `Created: ${new Date(note.createdAt).toLocaleString()}\n`;
        content += `Updated: ${new Date(note.updatedAt).toLocaleString()}\n`;
        if (note.tags.length > 0) {
            content += `Tags: ${note.tags.map(t => '#' + t).join(' ')}\n`;
        }
        content += '\n---\n\n';

        if (note.coverImage) {
            content += '[an image is here!]\n\n';
        }

        let noteContent = note.content;
        if (note.images) {
            Object.keys(note.images).forEach(imageId => {
                const regex = new RegExp(`\\[Image inserted: ([^\\]]+)\\]\\(${imageId}\\)`, 'g');
                noteContent = noteContent.replace(regex, '[an image is here!]');
            });
        }

        content += noteContent;
    }

    const filename = note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50) || 'untitled';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}${extension}`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Note exported as ${extension}`);
}
```
- **Line 955-970**: If format is 'md', exports as Markdown with YAML frontmatter
- **Line 971-998**: Otherwise exports as plain text
- **Line 989-996**: Replaces image references with placeholder text
- **Line 1000**: Sanitizes filename (removes special characters)
- **Line 1002-1008**: Creates blob, downloads file

### Lines 1016-1029: Load JSZip Library
```javascript
function loadJSZip() {
    return new Promise((resolve, reject) => {
        if (window.JSZip) {
            resolve(window.JSZip);
            return;
        }

        const script = document.createElement('script');
        script.src = 'libs/jszip.min.js';
        script.onload = () => resolve(window.JSZip);
        script.onerror = () => reject(new Error('Failed to load JSZip'));
        document.head.appendChild(script);
    });
}
```
- **Line 1018-1021**: If JSZip already loaded, return it
- **Line 1023-1027**: Otherwise dynamically load script file
- Lazy loading optimization - only loads when needed

### Lines 1034-1095: Export All Notes
```javascript
async function handleExportAll() {
    try {
        const JSZip = await loadJSZip();

        if (!JSZip) {
            exportAllAsSingleTextFile();
            return;
        }

    const zip = new JSZip();
    const date = new Date().toISOString().split('T')[0];

    state.notes.forEach(note => {
        if (note.archived) return;

        let content = `${note.title}\n${'='.repeat(note.title.length)}\n\n`;

        content += `Created: ${new Date(note.createdAt).toLocaleString()}\n`;
        content += `Updated: ${new Date(note.updatedAt).toLocaleString()}\n`;
        if (note.tags.length > 0) {
            content += `Tags: ${note.tags.map(t => '#' + t).join(' ')}\n`;
        }
        content += '\n---\n\n';

        if (note.coverImage) {
            content += '[an image is here!]\n\n';
        }

        let noteContent = note.content;
        if (note.images) {
            Object.keys(note.images).forEach(imageId => {
                const regex = new RegExp(`\\[Image inserted: ([^\\]]+)\\]\\(${imageId}\\)`, 'g');
                noteContent = noteContent.replace(regex, '[an image is here!]');
            });
        }

        content += noteContent;

        const filename = note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50) || 'untitled';
        const timestamp = note.createdAt;
        zip.file(`${filename}_${timestamp}.txt`, content);
    });

    zip.generateAsync({ type: 'blob' }).then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `notefy-export-${date}.zip`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('All notes exported');
    });
    } catch (error) {
        console.error('Export failed:', error);
        exportAllAsSingleTextFile();
    }
}
```
- **Line 1036**: Loads JSZip library
- **Line 1044**: Creates new ZIP archive
- **Line 1047-1080**: Loops through all notes and adds to ZIP
- **Line 1079**: Adds file to ZIP with unique filename
- **Line 1082-1090**: Generates ZIP blob and downloads

### Lines 1100-1140: Export All as Single Text File (Fallback)
```javascript
function exportAllAsSingleTextFile() {
    const date = new Date().toISOString().split('T')[0];
    let content = `Notefy Export - ${date}\n${'='.repeat(50)}\n\n`;

    state.notes.forEach((note, index) => {
        if (note.archived) return;

        content += `\n\n${note.title}\n${'-'.repeat(note.title.length)}\n\n`;

        content += `Created: ${new Date(note.createdAt).toLocaleString()}\n`;
        content += `Updated: ${new Date(note.updatedAt).toLocaleString()}\n`;
        if (note.tags.length > 0) {
            content += `Tags: ${note.tags.map(t => '#' + t).join(' ')}\n`;
        }
        content += '\n';

        if (note.coverImage) {
            content += '[an image is here!]\n\n';
        }

        let noteContent = note.content;
        if (note.images) {
            Object.keys(note.images).forEach(imageId => {
                const regex = new RegExp(`\\[Image inserted: ([^\\]]+)\\]\\(${imageId}\\)`, 'g');
                noteContent = noteContent.replace(regex, '[an image is here!]');
            });
        }

        content += noteContent;
        content += '\n\n' + '='.repeat(50);
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notefy-export-${date}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('All notes exported');
}
```
- Exports all notes as single text file if ZIP fails
- Fallback option for compatibility

### Lines 1145-1190: Import Notes
```javascript
function handleImport(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);

            if (!Array.isArray(imported)) {
                throw new Error('Invalid format');
            }

            const existingIds = new Set(state.notes.map(n => n.id));
            let merged = 0;
            let added = 0;

            imported.forEach(note => {
                if (existingIds.has(note.id)) {
                    const index = state.notes.findIndex(n => n.id === note.id);
                    state.notes[index] = note;
                    merged++;
                } else {
                    state.notes.push(note);
                    added++;
                }
            });

            state.notes.sort((a, b) => b.updatedAt - a.updatedAt);
            saveNotes(state.notes);

            renderTags();
            renderList();
            renderMain();

            showToast(`Imported ${added} new, merged ${merged} existing notes`);
        } catch (error) {
            console.error('Import failed:', error);
            showToast('Failed to import notes. Invalid file format.');
        }
    };

    reader.readAsText(file);
}
```
- **Line 1146**: Creates FileReader to read uploaded file
- **Line 1150**: Parses JSON from file
- **Line 1157-1159**: Gets set of existing note IDs
- **Line 1161-1171**: Loops through imported notes
  - If ID exists, merges (updates existing note)
  - Otherwise adds as new note
- **Line 1174**: Re-sorts notes by update time
- **Line 1182**: Shows import summary

### Lines 1195-1199: Toggle Theme
```javascript
function handleThemeToggle() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.body.className = state.theme === 'light' ? 'light' : '';
    localStorage.setItem(THEME_KEY, state.theme);
}
```
- Toggles between dark and light theme
- Saves preference to LocalStorage

### Lines 1204-1227: Save Undo State
```javascript
function saveUndoState() {
    if (!state.activeId) return;

    const note = getNoteById(state.activeId);
    if (!note) return;

    const snapshot = {
        id: note.id,
        title: note.title,
        content: note.content,
        timestamp: Date.now()
    };

    state.undoStack.push(snapshot);

    if (state.undoStack.length > 50) {
        state.undoStack.shift();
    }

    state.redoStack = [];
}
```
- **Line 1210-1215**: Creates snapshot of current note state
- **Line 1217**: Adds to undo stack
- **Line 1220-1222**: Limits undo stack to 50 items (removes oldest)
- **Line 1225**: Clears redo stack when new changes made

### Lines 1232-1258: Handle Undo
```javascript
function handleUndo() {
    if (!state.activeId || state.undoStack.length === 0) return;

    const note = getNoteById(state.activeId);
    if (!note) return;

    state.redoStack.push({
        id: note.id,
        title: note.title,
        content: note.content,
        timestamp: Date.now()
    });

    const previousState = state.undoStack.pop();

    updateNoteFields(previousState.id, {
        title: previousState.title,
        content: previousState.content
    });

    renderMain();
    renderList();
    showToast('Undo');
}
```
- **Line 1238-1243**: Saves current state to redo stack
- **Line 1246**: Gets previous state from undo stack
- **Line 1249-1252**: Restores previous state
- **Line 1254-1256**: Re-renders UI

### Lines 1263-1289: Handle Redo
```javascript
function handleRedo() {
    if (!state.activeId || state.redoStack.length === 0) return;

    const note = getNoteById(state.activeId);
    if (!note) return;

    state.undoStack.push({
        id: note.id,
        title: note.title,
        content: note.content,
        timestamp: Date.now()
    });

    const nextState = state.redoStack.pop();

    updateNoteFields(nextState.id, {
        title: nextState.title,
        content: nextState.content
    });

    renderMain();
    renderList();
    showToast('Redo');
}
```
- Similar to undo but in reverse direction
- Restores state from redo stack

### Lines 1295-1302: Update Offline Indicator
```javascript
function updateOfflineIndicator() {
    const indicator = document.getElementById('offlineIndicator');
    if (state.isOnline) {
        indicator.style.display = 'none';
    } else {
        indicator.style.display = 'flex';
    }
}
```
- Shows/hides offline indicator based on online status

### Lines 1307-1336: Handle Cover Image Upload
```javascript
async function handleCoverImageUpload(e) {
    if (!state.activeId || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
        const imageId = `img_cover_${Date.now()}`;

        try {
            await saveImageToDB(imageId, event.target.result);

            updateNoteFields(state.activeId, {
                coverImage: imageId,
                coverPosition: 'center'
            });

            renderMain();
            setupCoverImageDrag();
            showToast('Cover image added');
        } catch (error) {
            console.error('Failed to save cover image:', error);
            showToast('Failed to save image - try a smaller file');
        }
    };

    reader.readAsDataURL(file);
    e.target.value = '';
}
```
- **Line 1311**: Creates FileReader to read image file
- **Line 1314**: Generates unique image ID
- **Line 1317**: Saves image to IndexedDB
- **Line 1319-1322**: Updates note with image ID reference
- **Line 1325**: Sets up drag-to-reposition functionality
- **Line 1334**: Reads file as data URL (base64)

### Lines 1341-1384: Setup Cover Image Drag
```javascript
function setupCoverImageDrag() {
    const container = document.getElementById('coverImageContainer');
    const image = document.getElementById('coverImage');
    if (!container || !image) return;

    let isDragging = false;
    let startY = 0;
    let startPosition = 50;

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        const currentPosition = image.style.objectPosition || 'center';
        startPosition = parseInt(currentPosition) || 50;
        container.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaY = e.clientY - startY;
        const containerHeight = container.offsetHeight;
        const percentChange = (deltaY / containerHeight) * 100;
        let newPosition = startPosition + percentChange;

        newPosition = Math.max(0, Math.min(100, newPosition));

        image.style.objectPosition = `center ${newPosition}%`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            container.style.cursor = 'move';

            if (state.activeId) {
                const position = image.style.objectPosition;
                updateNoteFields(state.activeId, { coverPosition: position });
            }
        }
    });
}
```
- **Line 1350-1356**: On mousedown, starts drag and records starting position
- **Line 1358-1370**: On mousemove, calculates new position as percentage
- **Line 1366**: Clamps position between 0 and 100
- **Line 1372-1383**: On mouseup, saves new position to note

### Lines 1389-1405: Remove Cover Image
```javascript
async function handleRemoveCover() {
    if (!state.activeId) return;

    const note = getNoteById(state.activeId);
    if (note && note.coverImage && note.coverImage.startsWith('img_')) {
        try {
            await deleteImageFromDB(note.coverImage);
        } catch (error) {
            console.error('Failed to delete image from DB:', error);
        }
    }

    updateNoteFields(state.activeId, { coverImage: null });
    renderMain();
    showToast('Cover image removed');
}
```
- **Line 1393-1400**: Deletes image from IndexedDB if it's a stored image
- **Line 1402**: Removes cover image reference from note

### Lines 1410-1419: Toggle Star
```javascript
function handleToggleStar() {
    if (!state.activeId) return;
    const note = getNoteById(state.activeId);
    if (!note) return;

    updateNoteFields(state.activeId, { starred: !note.starred });
    renderMain();
    renderList();
    showToast(note.starred ? 'Note unstarred' : 'Note starred');
}
```
- Toggles starred status of current note
- Re-renders to show/hide star icon

### Lines 1424-1477: Insert Inline Image
```javascript
async function handleInsertImage(e) {
    if (!state.activeId || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
        const note = getNoteById(state.activeId);
        if (!note) return;

        const imageId = `img_inline_${Date.now()}`;

        try {
            await saveImageToDB(imageId, event.target.result);

            if (!note.images) note.images = {};
            note.images[imageId] = true;

            const editor = document.getElementById('unifiedEditor');
            const imageMarkdown = `\n[Image: ${imageId}]\n`;

            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                const textNode = document.createTextNode(imageMarkdown);
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                sel.removeAllRanges();
                sel.addRange(range);
            } else {
                editor.textContent += imageMarkdown;
            }

            saveNotes(state.notes);

            autosave();
            highlightTags();
            showToast('Image inserted');
        } catch (error) {
            console.error('Failed to insert image:', error);
            showToast('Failed to insert image - try a smaller file');
        }
    };

    reader.readAsDataURL(file);
    e.target.value = '';
}
```
- **Line 1438**: Saves image to IndexedDB
- **Line 1440-1441**: Tracks image ID in note metadata
- **Line 1444**: Creates markdown reference for image
- **Line 1447-1459**: Inserts image reference at cursor position (or end if no selection)
- **Line 1463**: Saves note metadata
- **Line 1466**: Triggers autosave

### Lines 1486-1495: Check Welcome Screen
```javascript
function checkWelcomeScreen() {
    const hasSeenWelcome = localStorage.getItem(WELCOME_SEEN_KEY);
    const hasNotes = state.notes.length > 0;

    if (!hasSeenWelcome && !hasNotes) {
        document.getElementById('welcomeScreen').style.display = 'flex';
        return true;
    }
    return false;
}
```
- Shows welcome screen if user hasn't seen it and has no notes

### Lines 1500-1539: Create Tutorial Note
```javascript
function createTutorialNote() {
    const tutorialNote = createNote();
    tutorialNote.title = 'Welcome to Notefy';
    tutorialNote.content = `# Welcome to Notefy

A fast, offline-capable Markdown notes vault.

## Features

- **Live preview** - See your Markdown rendered in real-time
- **Tags** - Organize with inline tags like #ideas and #work
- **Search** - Find notes quickly
- **Export/Import** - Backup and restore your notes

## Try it out

Start typing **Markdown** here. Add tags like #welcome #tutorial and see them appear in the sidebar!

\`\`\`javascript
// Code blocks work too
function hello() {
  console.log("Hello, Notefy!");
}
\`\`\`

> Blockquotes for important notes

- Lists
- Work
- Great

Enjoy taking notes! 📝`;

    updateNoteFields(tutorialNote.id, {
        title: tutorialNote.title,
        content: tutorialNote.content
    });

    return tutorialNote;
}
```
- Creates a tutorial note with sample content
- Demonstrates various Markdown features

### Lines 1544-1698: Initialize App
```javascript
async function init() {
    // Initialize IndexedDB for image storage
    try {
        await initDB();
    } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
        showToast('Image storage unavailable - images may not save');
    }

    // Load theme
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
        state.theme = savedTheme;
        document.body.className = savedTheme === 'light' ? 'light' : '';
    }

    // Load notes
    state.notes = loadNotes();

    // Check if welcome screen should be shown
    const showingWelcome = checkWelcomeScreen();

    state.activeId = null;

    // Configure marked
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true
        });
    }

    // Initial render
    renderTags();
    renderList();
    renderMain();

    // Welcome screen event listeners
    document.getElementById('startFreshBtn').addEventListener('click', () => {
        localStorage.setItem(WELCOME_SEEN_KEY, 'true');
        document.getElementById('welcomeScreen').style.display = 'none';
        render();
    });

    document.getElementById('takeTourBtn').addEventListener('click', () => {
        localStorage.setItem(WELCOME_SEEN_KEY, 'true');
        document.getElementById('welcomeScreen').style.display = 'none';
        const tutorialNote = createTutorialNote();
        state.activeId = tutorialNote.id;
        render();
    });

    // Event listeners
    document.getElementById('newTabBtn').addEventListener('click', handleNewNote);

    // Menu button for mobile
    document.getElementById('menuBtn').addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const menuBtn = document.getElementById('menuBtn');
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !menuBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // Export/Import listeners
    document.getElementById('exportNoteBtn').addEventListener('click', () => handleExportNote('txt'));
    document.getElementById('exportNoteBtn').addEventListener('contextmenu', (e) => {
        e.preventDefault();
        handleExportNote('md');
    });
    document.getElementById('exportAllBtn').addEventListener('click', handleExportAll);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFileInput').click();
    });
    document.getElementById('importFileInput').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImport(e.target.files[0]);
            e.target.value = '';
        }
    });

    document.getElementById('themeToggle').addEventListener('click', handleThemeToggle);
    document.getElementById('deleteNoteBtn').addEventListener('click', () => handleDeleteNote());

    // Cover image handlers
    document.getElementById('addCoverBtn').addEventListener('click', () => {
        document.getElementById('coverImageInput').click();
    });
    document.getElementById('changeCoverBtn').addEventListener('click', () => {
        document.getElementById('coverImageInput').click();
    });
    document.getElementById('removeCoverBtn').addEventListener('click', handleRemoveCover);
    document.getElementById('coverImageInput').addEventListener('change', handleCoverImageUpload);

    // Star handler
    document.getElementById('starNoteBtn').addEventListener('click', handleToggleStar);

    // Insert image handler
    document.getElementById('insertImageBtn').addEventListener('click', () => {
        document.getElementById('insertImageInput').click();
    });
    document.getElementById('insertImageInput').addEventListener('change', handleInsertImage);

    // Search
    const searchInput = document.getElementById('searchInput');
    const debouncedSearch = debounce((query) => handleSearch(query), 300);
    searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));

    // Title input
    const titleInput = document.getElementById('noteTitle');
    titleInput.addEventListener('input', autosave);
    titleInput.addEventListener('blur', autosave);

    // Unified editor
    const unifiedEditor = document.getElementById('unifiedEditor');
    unifiedEditor.addEventListener('input', () => {
        highlightTags();
        autosave();
        renderCounts();
    });
    unifiedEditor.addEventListener('blur', autosave);

    // Online/offline detection
    window.addEventListener('online', () => {
        state.isOnline = true;
        updateOfflineIndicator();
        showToast('Back online');
    });

    window.addEventListener('offline', () => {
        state.isOnline = false;
        updateOfflineIndicator();
        showToast('Working offline');
    });

    // Initial online status check
    state.isOnline = navigator.onLine;
    updateOfflineIndicator();

    // PWA registration (optional)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {
            // Service worker not available, app works without it
        });
    }

    console.log('Notefy initialized');
}
```
- **Line 1547**: Initializes IndexedDB
- **Line 1553-1557**: Loads and applies saved theme
- **Line 1560**: Loads notes from LocalStorage
- **Line 1563**: Checks if welcome screen should be shown
- **Line 1567-1572**: Configures marked.js for Markdown parsing
- **Line 1575-1577**: Initial UI render
- **Line 1580-1595**: Welcome screen button handlers
- **Line 1598-1695**: Sets up all event listeners for UI interactions
- **Line 1691-1694**: Registers service worker for PWA functionality

### Lines 1701-1705: Start the App
```javascript
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
```
- **Line 1701**: Checks if DOM is still loading
- **Line 1702**: If loading, waits for DOMContentLoaded event
- **Line 1704**: If already loaded, initializes immediately

---

## sw.js - Service Worker

### Lines 1-4: File Header
```javascript
/**
 * Service Worker for Notefy
 * Provides offline capability and app shell caching
 */
```
- Documentation describing service worker purpose

### Lines 6-15: Cache Configuration
```javascript
const CACHE_NAME = 'notefy-v1';
const ASSETS_TO_CACHE = [
    './index.html',
    './styles.css',
    './app.js',
    './libs/marked.min.js',
    './libs/purify.min.js',
    './icons/notes.svg',
    './manifest.webmanifest'
];
```
- **Line 6**: Cache version name (change to force cache update)
- **Line 7-14**: List of files to cache for offline use

### Lines 18-28: Install Event
```javascript
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});
```
- **Line 18**: Listens for install event (when service worker first installed)
- **Line 20**: Opens cache with name
- **Line 22**: Adds all assets to cache
- **Line 25**: Activates service worker immediately instead of waiting

### Lines 31-45: Activate Event
```javascript
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => {
                return self.clients.claim();
            })
    );
});
```
- **Line 31**: Listens for activate event (when service worker becomes active)
- **Line 33**: Gets all cache names
- **Line 37**: Filters out caches that aren't the current version
- **Line 38**: Deletes old caches
- **Line 42**: Takes control of all pages immediately

### Lines 48-82: Fetch Event
```javascript
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached response if found
                if (response) {
                    return response;
                }

                // Otherwise fetch from network
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        // Cache the fetched response
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // If both cache and network fail, return offline page
                        return caches.match('./index.html');
                    });
            })
    );
});
```
- **Line 48**: Listens for fetch events (network requests)
- **Line 50**: Checks cache for matching request
- **Line 53-55**: If found in cache, return cached response
- **Line 58**: Otherwise fetch from network
- **Line 61-63**: Only cache successful responses
- **Line 66**: Clones response (can only read once)
- **Line 69-72**: Adds response to cache for future use
- **Line 76-79**: If both cache and network fail, return index.html (offline fallback)

---

## Summary

The Notefy application consists of two main JavaScript files:

1. **app.js** - The main application logic handling:
   - State management for notes, tabs, filters, and UI
   - IndexedDB for efficient image storage
   - LocalStorage for note metadata
   - CRUD operations for notes
   - Markdown parsing and rendering
   - Search and filtering
   - Export/import functionality
   - Undo/redo system
   - Theme toggling
   - Offline detection
   - Keyboard navigation and accessibility
   - PWA functionality

2. **sw.js** - The service worker providing:
   - Offline capability through caching
   - Network-first strategy with cache fallback
   - Automatic cache management and cleanup
   - Progressive Web App support

The code is well-structured with clear separation of concerns, comprehensive error handling, and numerous accessibility features. It uses modern JavaScript features like async/await, Promises, and ES6 syntax throughout.
