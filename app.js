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
    previewTimeout: null
};

// ===========================
// Storage Repository
// ===========================

const STORAGE_KEY = 'notes_md_v1';
const THEME_KEY = 'notes_md_theme';
const WELCOME_SEEN_KEY = 'notes_md_welcome_seen';

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
            <div class="note-item-title">
                ${note.starred ? '<svg class="note-item-star" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' : ''}
                ${escapeHtml(note.title)}
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

    // Handle cover image
    if (note.coverImage) {
        coverImageContainer.style.display = 'block';
        coverImage.src = note.coverImage;
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

    tabsContainer.innerHTML = state.openTabs.map(noteId => {
        const note = getNoteById(noteId);
        if (!note) return '';

        return `
            <button class="note-tab ${noteId === state.activeId ? 'active' : ''}" data-id="${noteId}">
                <span class="note-tab-title">${escapeHtml(note.title)}</span>
                <span class="note-tab-close" data-close="${noteId}">
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
 * Export current note as .txt
 */
function handleExportNote() {
    if (!state.activeId) return;

    const note = getNoteById(state.activeId);
    if (!note) return;

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

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Note exported');
}

/**
 * Export all notes as .txt files in a ZIP
 */
function handleExportAll() {
    const JSZip = window.JSZip;

    // If JSZip is not available, export as single text file
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

    // Ctrl/Cmd + B - Bold
    if (modifier && e.key === 'b') {
        e.preventDefault();
        document.execCommand('bold', false, null);
    }

    // Ctrl/Cmd + I - Italic
    if (modifier && e.key === 'i') {
        e.preventDefault();
        document.execCommand('italic', false, null);
    }

    // Ctrl/Cmd + U - Underline
    if (modifier && e.key === 'u') {
        e.preventDefault();
        document.execCommand('underline', false, null);
    }

    // Esc - Close all tabs
    if (e.key === 'Escape') {
        e.preventDefault();
        closeAllTabs();
    }
}

/**
 * Handle cover image upload
 */
function handleCoverImageUpload(e) {
    if (!state.activeId || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
        updateNoteFields(state.activeId, {
            coverImage: event.target.result,
            coverPosition: 'center' // Default position
        });
        renderMain();
        setupCoverImageDrag();
        showToast('Cover image added');
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
function handleRemoveCover() {
    if (!state.activeId) return;
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
function handleInsertImage(e) {
    if (!state.activeId || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
        const note = getNoteById(state.activeId);
        if (!note) return;

        // Store image with unique ID
        if (!note.images) note.images = {};
        const imageId = `img_${Date.now()}`;
        note.images[imageId] = event.target.result;

        const editor = document.getElementById('unifiedEditor');
        const imageMarkdown = `\n[an image is here!]\n`;

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

        // Save note with images
        saveNotes(state.notes);

        // Trigger autosave
        autosave();
        highlightTags();
        showToast('Image inserted');
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

    updateNoteFields(tutorialNote.id, {
        title: tutorialNote.title,
        content: tutorialNote.content
    });

    return tutorialNote;
}

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
    document.getElementById('exportNoteBtn').addEventListener('click', handleExportNote);
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
