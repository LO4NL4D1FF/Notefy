/**
 * Notefy - Markdown Notes App
 * A fast, offline-capable notes vault with Markdown support
 */

// ===========================
// State Management
// ===========================

const state = {
    notes: [],
    activeId: null,
    openTabs: [], // Array of note IDs that are open as tabs
    filter: {
        query: '',
        tag: null
    },
    theme: 'dark',
    saveTimeout: null,
    previewTimeout: null,
    undoStack: [],
    redoStack: [],
    isOnline: true
};

// Cleanup function for timeouts
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

// Call cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// ===========================
// Storage Repository
// ===========================

const STORAGE_KEY = 'notes_md_v1';
const THEME_KEY = 'notes_md_theme';
const WELCOME_SEEN_KEY = 'notes_md_welcome_seen';
const DB_NAME = 'NotefyDB';
const DB_VERSION = 1;
const IMAGE_STORE = 'images';

let db = null;

/**
 * Initialize IndexedDB for image storage
 */
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

/**
 * Save image to IndexedDB
 */
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

/**
 * Get image from IndexedDB
 */
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

/**
 * Delete image from IndexedDB
 */
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

/**
 * Load notes from LocalStorage
 */
function loadNotes() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Failed to load notes:', error);
        return [];
    }
}

/**
 * Save notes to LocalStorage
 */
function saveNotes(notes) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        return true;
    } catch (error) {
        console.error('Failed to save notes:', error);

        // Check if it's a quota exceeded error
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

/**
 * Create a new note
 */
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

/**
 * Update note fields
 */
function updateNoteFields(id, patch) {
    const note = state.notes.find(n => n.id === id);
    if (!note) return false;

    Object.assign(note, patch);
    note.updatedAt = Date.now();

    // Extract tags from content if content changed
    if (patch.content !== undefined) {
        note.tags = extractTags(note.content);
    }

    // Re-sort by updatedAt
    state.notes.sort((a, b) => b.updatedAt - a.updatedAt);

    saveNotes(state.notes);
    return true;
}

/**
 * Delete a note
 */
function deleteNote(id) {
    const index = state.notes.findIndex(n => n.id === id);
    if (index === -1) return false;

    state.notes.splice(index, 1);
    saveNotes(state.notes);
    return true;
}

/**
 * Get note by ID
 */
function getNoteById(id) {
    return state.notes.find(n => n.id === id);
}

// ===========================
// Utility Functions
// ===========================

/**
 * Generate unique ID
 */
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Debounce function
 */
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

/**
 * Extract tags from content
 */
function extractTags(content) {
    const regex = /(?:^|\s)#([a-z0-9_-]{2,24})(?:\s|$)/gi;
    const tags = new Set();
    let match;

    while ((match = regex.exec(content)) !== null) {
        tags.add(match[1].toLowerCase());
    }

    return Array.from(tags);
}

/**
 * Format timestamp
 */
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

/**
 * Count words in text
 */
function countWords(text) {
    if (!text || text.trim().length === 0) return 0;
    return text.trim().split(/\s+/).length;
}

/**
 * Show toast notification
 */
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

/**
 * Sanitize and parse markdown
 */
function parseMarkdown(content) {
    if (!content) return '';

    // Parse with marked
    const html = marked.parse(content);

    // Sanitize with DOMPurify
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

// ===========================
// Filter & Search
// ===========================

/**
 * Get filtered notes based on current filter state
 */
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

/**
 * Get all unique tags from all notes
 */
function getAllTags() {
    const tagsSet = new Set();
    state.notes.forEach(note => {
        if (!note.archived) {
            note.tags.forEach(tag => tagsSet.add(tag));
        }
    });
    return Array.from(tagsSet).sort();
}

// ===========================
// Rendering Functions
// ===========================

/**
 * Render notes list (optimized to update specific items)
 */
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

    // Get existing items
    const existingItems = Array.from(notesList.querySelectorAll('.note-item'));
    const existingIds = existingItems.map(item => item.dataset.id);
    const filteredIds = filtered.map(note => note.id);

    // Check if we can do incremental update or need full re-render
    const needsFullRender =
        existingIds.length !== filteredIds.length ||
        existingIds.some((id, index) => id !== filteredIds[index]);

    if (needsFullRender) {
        // Full re-render
        notesList.innerHTML = filtered.map(note => createNoteItemHTML(note)).join('');
        attachNoteItemListeners(notesList);
    } else {
        // Just update classes for active state
        existingItems.forEach(item => {
            const isActive = item.dataset.id === state.activeId;
            item.classList.toggle('active', isActive);
        });
    }
}

/**
 * Create HTML for a note item
 */
function createNoteItemHTML(note) {
    const query = state.filter.query.toLowerCase();
    let titleHTML = escapeHtml(note.title);

    // Highlight search matches
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
                ${note.starred ? '<svg class="note-item-star" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' : ''}
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

/**
 * Attach event listeners to note items
 */
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

/**
 * Render tag chips
 */
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

    // Add click listeners
    tagChips.querySelectorAll('.tag-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const tag = chip.dataset.tag;
            state.filter.tag = tag || null;
            renderTags();
            renderList();
        });
    });
}

/**
 * Render main editor content
 */
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

    // Set editor content without triggering input event
    if (unifiedEditor.textContent !== note.content) {
        unifiedEditor.textContent = note.content;
    }

    // Handle cover image - load from IndexedDB if it's an ID reference
    if (note.coverImage) {
        coverImageContainer.style.display = 'block';

        // Check if it's an IndexedDB ID (starts with 'img_') or a data URL
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

    // Handle star
    if (note.starred) {
        starBtn.classList.add('starred');
    } else {
        starBtn.classList.remove('starred');
    }

    // Show created date
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

/**
 * Highlight tags in the unified editor
 */
function highlightTags() {
    const editor = document.getElementById('unifiedEditor');
    if (!editor) return;

    const selection = saveSelection(editor);
    const text = editor.textContent;

    // Find all tags and wrap them
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

    // Only update if content changed
    if (editor.innerHTML !== html) {
        editor.innerHTML = html;
        restoreSelection(editor, selection);
    }
}

/**
 * Save cursor position
 */
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

/**
 * Restore cursor position
 */
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
        if (node.nodeType === 3) {
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

/**
 * Render word count
 */
function renderCounts() {
    if (!state.activeId) return;

    const unifiedEditor = document.getElementById('unifiedEditor');
    if (!unifiedEditor) return;

    const wordCount = document.getElementById('wordCount');
    const count = countWords(unifiedEditor.textContent || '');
    wordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;
}

/**
 * Render save status with improved indicators
 */
function renderStatus(status) {
    const saveStatus = document.getElementById('saveStatus');
    saveStatus.textContent = status;

    // Add classes for visual feedback
    saveStatus.classList.remove('saving', 'saved');
    if (status === 'Saving...') {
        saveStatus.classList.add('saving');
    } else if (status === 'Saved just now' || status.startsWith('Saved')) {
        saveStatus.classList.add('saved');
    }
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===========================
// Event Handlers
// ===========================

/**
 * Select a note
 */
function selectNote(id) {
    // Open in tab if not already open
    if (!state.openTabs.includes(id)) {
        state.openTabs.push(id);
    }
    state.activeId = id;
    renderTabs();
    renderList();
    renderMain();

    // Focus title input
    setTimeout(() => {
        document.getElementById('noteTitle').focus();
    }, 0);
}

/**
 * Render tabs
 */
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
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </span>
            </button>
        `;
    }).join('');

    // Add click listeners
    tabsContainer.querySelectorAll('.note-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            if (!e.target.closest('.note-tab-close')) {
                selectNote(tab.dataset.id);
            }
        });

        // Add keyboard navigation for tabs
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
                // Focus next or previous tab
                if (tabs[currentIndex + 1]) {
                    setTimeout(() => tabs[currentIndex + 1].focus(), 0);
                } else if (tabs[currentIndex - 1]) {
                    setTimeout(() => tabs[currentIndex - 1].focus(), 0);
                }
            }
        });
    });

    // Add close listeners
    tabsContainer.querySelectorAll('.note-tab-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(closeBtn.dataset.close);
        });
    });
}

/**
 * Close a tab
 */
function closeTab(noteId) {
    const index = state.openTabs.indexOf(noteId);
    if (index > -1) {
        state.openTabs.splice(index, 1);
    }

    // If closing active tab, switch to another tab or clear
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

/**
 * Close all tabs
 */
function closeAllTabs() {
    state.openTabs = [];
    state.activeId = null;
    renderTabs();
    renderMain();
}

/**
 * Create new note
 */
function handleNewNote() {
    const note = createNote();
    state.activeId = note.id;
    state.filter.query = '';
    state.filter.tag = null;

    document.getElementById('searchInput').value = '';

    renderTags();
    renderList();
    renderMain();

    // Focus title input
    setTimeout(() => {
        document.getElementById('noteTitle').focus();
        document.getElementById('noteTitle').select();
    }, 0);

    showToast('New note created');
}

/**
 * Delete note
 */
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
        // Select first note or none
        const filtered = getFilteredNotes();
        state.activeId = filtered.length > 0 ? filtered[0].id : null;
    }

    renderTags();
    renderList();
    renderMain();

    showToast('Note deleted');
}

/**
 * Autosave note
 */
const autosave = debounce(() => {
    if (!state.activeId) return;

    renderStatus('Saving...');

    // Save undo state before making changes
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

    // Clear status after 2 seconds
    setTimeout(() => {
        renderStatus('Ready');
    }, 2000);
}, 400);

/**
 * Handle search input
 */
function handleSearch(query) {
    state.filter.query = query;
    renderList();
}

/**
 * Export current note as .txt or .md
 */
function handleExportNote(format = 'txt') {
    if (!state.activeId) return;

    const note = getNoteById(state.activeId);
    if (!note) return;

    let content = '';
    let mimeType = 'text/plain';
    let extension = '.txt';

    if (format === 'md') {
        // Export as Markdown
        content = `# ${note.title}\n\n`;

        // Add metadata as frontmatter
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
        // Export as plain text
        content = `${note.title}\n${'='.repeat(note.title.length)}\n\n`;

        // Add metadata
        content += `Created: ${new Date(note.createdAt).toLocaleString()}\n`;
        content += `Updated: ${new Date(note.updatedAt).toLocaleString()}\n`;
        if (note.tags.length > 0) {
            content += `Tags: ${note.tags.map(t => '#' + t).join(' ')}\n`;
        }
        content += '\n---\n\n';

        // Add cover image placeholder
        if (note.coverImage) {
            content += '[an image is here!]\n\n';
        }

        // Process content and replace inline images
        let noteContent = note.content;
        if (note.images) {
            Object.keys(note.images).forEach(imageId => {
                const regex = new RegExp(`\\[Image inserted: ([^\\]]+)\\]\\(${imageId}\\)`, 'g');
                noteContent = noteContent.replace(regex, '[an image is here!]');
            });
        }

        content += noteContent;
    }

    // Sanitize filename
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

/**
 * Load JSZip library on-demand
 */
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

/**
 * Export all notes as .txt files in a ZIP
 */
async function handleExportAll() {
    try {
        // Load JSZip on-demand
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

        // Add metadata
        content += `Created: ${new Date(note.createdAt).toLocaleString()}\n`;
        content += `Updated: ${new Date(note.updatedAt).toLocaleString()}\n`;
        if (note.tags.length > 0) {
            content += `Tags: ${note.tags.map(t => '#' + t).join(' ')}\n`;
        }
        content += '\n---\n\n';

        // Add cover image placeholder
        if (note.coverImage) {
            content += '[an image is here!]\n\n';
        }

        // Process content and replace inline images
        let noteContent = note.content;
        if (note.images) {
            Object.keys(note.images).forEach(imageId => {
                const regex = new RegExp(`\\[Image inserted: ([^\\]]+)\\]\\(${imageId}\\)`, 'g');
                noteContent = noteContent.replace(regex, '[an image is here!]');
            });
        }

        content += noteContent;

        // Sanitize filename
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

/**
 * Export all notes as single text file (fallback)
 */
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

/**
 * Import notes
 */
function handleImport(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);

            if (!Array.isArray(imported)) {
                throw new Error('Invalid format');
            }

            // Merge by ID
            const existingIds = new Set(state.notes.map(n => n.id));
            let merged = 0;
            let added = 0;

            imported.forEach(note => {
                if (existingIds.has(note.id)) {
                    // Update existing
                    const index = state.notes.findIndex(n => n.id === note.id);
                    state.notes[index] = note;
                    merged++;
                } else {
                    // Add new
                    state.notes.push(note);
                    added++;
                }
            });

            // Re-sort
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

/**
 * Toggle theme
 */
function handleThemeToggle() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.body.className = state.theme === 'light' ? 'light' : '';
    localStorage.setItem(THEME_KEY, state.theme);
}

/**
 * Save state for undo/redo
 */
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

    // Add to undo stack
    state.undoStack.push(snapshot);

    // Limit undo stack to 50 items
    if (state.undoStack.length > 50) {
        state.undoStack.shift();
    }

    // Clear redo stack when new changes are made
    state.redoStack = [];
}

/**
 * Undo last change
 */
function handleUndo() {
    if (!state.activeId || state.undoStack.length === 0) return;

    const note = getNoteById(state.activeId);
    if (!note) return;

    // Save current state to redo stack
    state.redoStack.push({
        id: note.id,
        title: note.title,
        content: note.content,
        timestamp: Date.now()
    });

    // Get previous state
    const previousState = state.undoStack.pop();

    // Restore previous state
    updateNoteFields(previousState.id, {
        title: previousState.title,
        content: previousState.content
    });

    renderMain();
    renderList();
    showToast('Undo');
}

/**
 * Redo last undone change
 */
function handleRedo() {
    if (!state.activeId || state.redoStack.length === 0) return;

    const note = getNoteById(state.activeId);
    if (!note) return;

    // Save current state to undo stack
    state.undoStack.push({
        id: note.id,
        title: note.title,
        content: note.content,
        timestamp: Date.now()
    });

    // Get next state
    const nextState = state.redoStack.pop();

    // Restore next state
    updateNoteFields(nextState.id, {
        title: nextState.title,
        content: nextState.content
    });

    renderMain();
    renderList();
    showToast('Redo');
}


/**
 * Update offline indicator
 */
function updateOfflineIndicator() {
    const indicator = document.getElementById('offlineIndicator');
    if (state.isOnline) {
        indicator.style.display = 'none';
    } else {
        indicator.style.display = 'flex';
    }
}

/**
 * Handle cover image upload
 */
async function handleCoverImageUpload(e) {
    if (!state.activeId || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
        const imageId = `img_cover_${Date.now()}`;

        // Save to IndexedDB instead of LocalStorage
        try {
            await saveImageToDB(imageId, event.target.result);

            updateNoteFields(state.activeId, {
                coverImage: imageId, // Store ID reference instead of data URL
                coverPosition: 'center' // Default position
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

/**
 * Setup cover image drag to reposition
 */
function setupCoverImageDrag() {
    const container = document.getElementById('coverImageContainer');
    const image = document.getElementById('coverImage');
    if (!container || !image) return;

    let isDragging = false;
    let startY = 0;
    let startPosition = 50; // percentage

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

        // Clamp between 0 and 100
        newPosition = Math.max(0, Math.min(100, newPosition));

        image.style.objectPosition = `center ${newPosition}%`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            container.style.cursor = 'move';

            // Save position
            if (state.activeId) {
                const position = image.style.objectPosition;
                updateNoteFields(state.activeId, { coverPosition: position });
            }
        }
    });
}

/**
 * Handle remove cover image
 */
async function handleRemoveCover() {
    if (!state.activeId) return;

    const note = getNoteById(state.activeId);
    if (note && note.coverImage && note.coverImage.startsWith('img_')) {
        // Delete from IndexedDB
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

/**
 * Handle toggle star
 */
function handleToggleStar() {
    if (!state.activeId) return;
    const note = getNoteById(state.activeId);
    if (!note) return;

    updateNoteFields(state.activeId, { starred: !note.starred });
    renderMain();
    renderList();
    showToast(note.starred ? 'Note unstarred' : 'Note starred');
}

/**
 * Handle insert image
 */
async function handleInsertImage(e) {
    if (!state.activeId || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
        const note = getNoteById(state.activeId);
        if (!note) return;

        const imageId = `img_inline_${Date.now()}`;

        // Save image to IndexedDB
        try {
            await saveImageToDB(imageId, event.target.result);

            // Store only the image ID reference in note metadata
            if (!note.images) note.images = {};
            note.images[imageId] = true; // Just track that this image exists

            const editor = document.getElementById('unifiedEditor');
            const imageMarkdown = `\n[Image: ${imageId}]\n`;

            // Insert at cursor position
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

            // Save note metadata
            saveNotes(state.notes);

            // Trigger autosave
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

// ===========================
// Initialization
// ===========================

/**
 * Show welcome screen for first-time users
 */
function checkWelcomeScreen() {
    const hasSeenWelcome = localStorage.getItem(WELCOME_SEEN_KEY);
    const hasNotes = state.notes.length > 0;

    if (!hasSeenWelcome && !hasNotes) {
        document.getElementById('welcomeScreen').style.display = 'flex';
        return true;
    }
    return false;
}

/**
 * Create tutorial note
 */
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

/**
 * Initialize app
 */
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

    // Don't auto-select any note - let user click to open
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
    // Export note with format selection
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

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
