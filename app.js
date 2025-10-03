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
    filter: {
        query: '',
        tag: null
    },
    theme: 'dark',
    saveTimeout: null,
    previewTimeout: null
};

// ===========================
// Storage Repository
// ===========================

const STORAGE_KEY = 'notes_md_v1';
const THEME_KEY = 'notes_md_theme';

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
        showToast('Failed to save notes');
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
        archived: false
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
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
 * Render notes list
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

    notesList.innerHTML = filtered.map(note => `
        <li class="note-item ${note.id === state.activeId ? 'active' : ''}"
            data-id="${note.id}"
            tabindex="0"
            role="listitem"
            aria-label="${escapeHtml(note.title)}">
            <div class="note-item-title">${escapeHtml(note.title)}</div>
            <div class="note-item-meta">
                <span>${formatTimestamp(note.updatedAt)}</span>
            </div>
            ${note.tags.length > 0 ? `
                <div class="note-item-tags">
                    ${note.tags.map(tag => `<span class="note-item-tag">#${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
        </li>
    `).join('');

    // Add click listeners
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
function renderMain() {
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
    const editorTextarea = document.getElementById('noteEditor');

    titleInput.value = note.title;
    editorTextarea.value = note.content;

    renderPreview();
    renderCounts();
    renderStatus('Ready');
}

/**
 * Render markdown preview
 */
const renderPreview = debounce(() => {
    if (!state.activeId) return;

    const note = getNoteById(state.activeId);
    if (!note) return;

    const preview = document.getElementById('notePreview');
    preview.innerHTML = parseMarkdown(note.content);
}, 200);

/**
 * Render word count
 */
function renderCounts() {
    if (!state.activeId) return;

    const note = getNoteById(state.activeId);
    if (!note) return;

    const wordCount = document.getElementById('wordCount');
    const count = countWords(note.content);
    wordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;
}

/**
 * Render save status
 */
function renderStatus(status) {
    const saveStatus = document.getElementById('saveStatus');
    saveStatus.textContent = status;
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
    state.activeId = id;
    renderList();
    renderMain();

    // Focus title input
    setTimeout(() => {
        document.getElementById('noteTitle').focus();
    }, 0);
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

    const titleInput = document.getElementById('noteTitle');
    const editorTextarea = document.getElementById('noteEditor');

    updateNoteFields(state.activeId, {
        title: titleInput.value || 'Untitled',
        content: editorTextarea.value
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
 * Export notes
 */
function handleExport() {
    const dataStr = JSON.stringify(state.notes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');

    const date = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `notes-export-${date}.json`;
    link.click();

    URL.revokeObjectURL(url);
    showToast('Notes exported successfully');
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
            if (!state.activeId && state.notes.length > 0) {
                selectNote(state.notes[0].id);
            }

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
 * Handle keyboard shortcuts
 */
function handleKeyboard(e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    // Ctrl/Cmd + N - New note
    if (modifier && e.key === 'n') {
        e.preventDefault();
        handleNewNote();
    }

    // Ctrl/Cmd + S - Force save
    if (modifier && e.key === 's') {
        e.preventDefault();
        if (state.activeId) {
            autosave();
            autosave.flush && autosave.flush();
        }
    }

    // Ctrl/Cmd + K - Focus search
    if (modifier && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }

    // F6 - Toggle focus editor/preview
    if (e.key === 'F6') {
        e.preventDefault();
        const editor = document.getElementById('noteEditor');
        const preview = document.getElementById('notePreview');

        if (document.activeElement === editor) {
            preview.focus();
            preview.tabIndex = 0;
        } else {
            editor.focus();
        }
    }
}

// ===========================
// Initialization
// ===========================

/**
 * Initialize app
 */
function init() {
    // Load theme
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
        state.theme = savedTheme;
        document.body.className = savedTheme === 'light' ? 'light' : '';
    }

    // Load notes
    state.notes = loadNotes();

    // Create default note if empty
    if (state.notes.length === 0) {
        const defaultNote = createNote();
        defaultNote.title = 'Welcome to Notefy';
        defaultNote.content = `# Welcome to Notefy

A fast, offline-capable Markdown notes vault.

## Features

- **Live preview** - See your Markdown rendered in real-time
- **Tags** - Organize with inline tags like #ideas and #work
- **Search** - Find notes quickly
- **Export/Import** - Backup and restore your notes
- **Keyboard shortcuts** - Work faster

## Shortcuts

- New note: Ctrl/Cmd+N
- Save: Ctrl/Cmd+S
- Search: Ctrl/Cmd+K
- Focus Editor/Preview: F6

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

        updateNoteFields(defaultNote.id, {
            title: defaultNote.title,
            content: defaultNote.content
        });

        state.activeId = defaultNote.id;
    } else {
        // Select first note
        state.activeId = state.notes[0].id;
    }

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

    // Event listeners
    document.getElementById('newNoteBtn').addEventListener('click', handleNewNote);
    document.getElementById('exportBtn').addEventListener('click', handleExport);
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

    // Search
    const searchInput = document.getElementById('searchInput');
    const debouncedSearch = debounce((query) => handleSearch(query), 300);
    searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));

    // Title input
    const titleInput = document.getElementById('noteTitle');
    titleInput.addEventListener('input', autosave);
    titleInput.addEventListener('blur', autosave);

    // Editor textarea
    const editorTextarea = document.getElementById('noteEditor');
    editorTextarea.addEventListener('input', () => {
        autosave();
        renderPreview();
        renderCounts();
    });
    editorTextarea.addEventListener('blur', autosave);

    // Mobile view toggle
    const viewEditorBtn = document.getElementById('viewEditorBtn');
    const viewPreviewBtn = document.getElementById('viewPreviewBtn');
    const splitView = document.querySelector('.split-view');

    viewEditorBtn.addEventListener('click', () => {
        viewEditorBtn.classList.add('active');
        viewPreviewBtn.classList.remove('active');
        splitView.classList.remove('show-preview');
    });

    viewPreviewBtn.addEventListener('click', () => {
        viewPreviewBtn.classList.add('active');
        viewEditorBtn.classList.remove('active');
        splitView.classList.add('show-preview');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

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
