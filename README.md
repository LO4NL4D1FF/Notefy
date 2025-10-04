# Notefy - Markdown Notes App

A fast, offline-capable Markdown notes vault built with vanilla JavaScript. No frameworks, no build tools—just open and use.

## Features

### Core Functionality
- **Tabbed Interface** - Work on multiple notes simultaneously with tabs
- **Live Tag Highlighting** - Inline hashtags (`#tag`) are automatically highlighted in the editor
- **Local Persistence** - Notes saved to LocalStorage, images stored efficiently in IndexedDB
- **Full-Text Search** - Search across titles and content with highlighted matches
- **Tag System** - Inline hashtags (`#tag`) with tag-based filtering
- **Export/Import** - Backup as JSON, export individual notes as .txt or .md (Markdown)
- **Cover Images** - Add cover images to notes with drag-to-reposition
- **Inline Images** - Insert images directly into notes
- **Word Count** - Live word count and enhanced save status indicators
- **Theme Toggle** - Switch between dark and light themes (persisted)
- **Offline Support** - Works completely offline with visual offline indicator
- **PWA Support** - Install as a Progressive Web App
- **Undo/Redo** - Full history support with 50-state undo stack
- **Starred Notes** - Mark important notes with stars

### Keyboard Shortcuts
Press `?` to view all keyboard shortcuts in the app, including:
- **Navigation**: Arrow keys for tabs, shortcuts for search
- **Editing**: Undo/Redo (Ctrl+Z/Y), Bold/Italic/Underline
- **Actions**: Close tabs, focus search, and more

## How to Run

1. **Download/Clone** this repository
2. **Open `index.html`** in any modern web browser
   - Double-click the file, or
   - Right-click → Open with → Your browser

That's it! No installation, no build process, no dependencies to install.

## Project Structure

```
notefy/
├── index.html              # Main HTML structure
├── styles.css              # Complete styling (dark/light themes)
├── app.js                  # Application logic (vanilla JS)
├── libs/
│   ├── marked.min.js       # Markdown parser
│   ├── purify.min.js       # HTML sanitizer (XSS protection)
│   └── jszip.min.js        # ZIP library (loaded on-demand)
├── icons/
│   └── notes.svg           # App icon
├── img/
│   └── NotefyFavicon.png   # Favicon
├── NotefyLogo.png          # App logo
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service worker (offline support)
└── README.md              # This file
```

## Technologies Used

- **Vanilla JavaScript** - No frameworks
- **Semantic HTML5** - Accessible markup with ARIA
- **Modern CSS** - Grid, Flexbox, CSS Variables
- **Marked.js** - Markdown parsing
- **DOMPurify** - XSS-safe HTML sanitization
- **LocalStorage API** - Note metadata persistence
- **IndexedDB API** - Efficient binary image storage
- **JSZip** - ZIP file creation (lazy-loaded)
- **Service Workers** - Offline functionality (PWA)

## Data Model

Each note is stored as:

```json
{
  "id": "unique-id",
  "title": "Note title",
  "content": "Markdown content",
  "tags": ["tag1", "tag2"],
  "createdAt": 1234567890,
  "updatedAt": 1234567890,
  "archived": false,
  "starred": false,
  "coverImage": "img_cover_123456789",
  "coverPosition": "center 50%",
  "images": {
    "img_inline_123456789": true
  }
}
```

**Note**: Cover images and inline images are stored in IndexedDB (not LocalStorage) for efficiency. The note only stores image ID references.

## Features in Detail

### Autosave
- Debounced autosave (400ms after typing stops)
- Saves on blur (when you click away)
- Enhanced status indicator: "Saving..." (colored) → "Saved just now" → "Ready"
- Each save creates an undo state for history tracking

### Undo/Redo System
- Full undo/redo support with Ctrl+Z and Ctrl+Y
- Maintains up to 50 previous states per note
- Automatic state snapshots on each autosave

### Tag Extraction
- Tags are extracted from content using pattern: `#tagname`
- Tags must be 2-24 characters: `[a-z0-9_-]`
- Automatically lowercased and deduplicated
- Live highlighting in the editor with colored badges
- Click tag chips in sidebar to filter notes

### Export/Import
- **Export All**: Downloads `notefy-export-YYYY-MM-DD.zip` with all notes as .txt files
- **Export Single**: Left-click for .txt, right-click for .md (Markdown with frontmatter)
- **Import**: Merges imported JSON by ID (imported data wins on conflict)
- Markdown exports include metadata as YAML frontmatter

### Image Handling
- **Cover Images**: Add, reposition (drag), or remove cover images
- **Inline Images**: Insert images directly into note content
- **Efficient Storage**: Images stored in IndexedDB (not LocalStorage) to avoid quota issues
- Image IDs referenced in notes, actual data stored separately

### Search & Filtering
- Full-text search across note titles and content
- Search matches highlighted in yellow in the notes list
- Filter by tags using tag chips
- Combine search and tag filters

### Tabs & Multi-Note Editing
- Open multiple notes in tabs
- Navigate tabs with arrow keys
- Close tabs with Delete/Backspace or close button
- Tabs persist active note selection

### Security
- All Markdown preview content is sanitized with DOMPurify
- Script tags and dangerous HTML are stripped
- Safe for user-generated content

### Responsive Design
- **Desktop**: Sidebar + unified editor view
- **Tablet**: Narrower sidebar, full functionality
- **Mobile**: Collapsible sidebar with hamburger menu

## Browser Support

Works in all modern browsers with IndexedDB support:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Required APIs**: LocalStorage, IndexedDB, Service Workers (optional for PWA)

## Accessibility

- Semantic HTML with proper heading hierarchy
- ARIA labels, roles, and live regions for screen readers
- Full keyboard navigation (tabs, lists, modals)
- Keyboard shortcuts modal (`?` key)
- Focus visible states on all interactive elements
- Respects `prefers-reduced-motion`
- Save status announced to screen readers

## PWA Installation

Modern browsers will show an "Install" prompt when you visit the app. Once installed:
- Works completely offline with offline indicator
- Appears in your app drawer/menu
- Opens in standalone window (no browser UI)
- All dependencies loaded locally (no CDN)

## Known Limitations

- **Storage**: LocalStorage ~5-10MB for metadata, IndexedDB quota varies (typically 50MB+)
- **No sync**: Notes stored locally only (use export/import for backup)
- **No collaboration**: Single-user, local-first design
- **Search**: Simple substring matching (no fuzzy search or advanced queries)
- **Images**: Stored as base64 data URLs (consider future optimization to blob storage)

## Performance Optimizations

- **Lazy Loading**: JSZip library loaded only when exporting all notes
- **Incremental Rendering**: Notes list updates only changed items
- **Debounced Autosave**: 400ms delay prevents excessive saves
- **Efficient Storage**: Images in IndexedDB, not LocalStorage
- **Code Splitting**: Heavy features loaded on-demand

## Extending the App

### Cloud Sync
Implement sync with services like Firebase, Supabase, or custom backend using the export/import JSON format.

### Linked Notes
Implement `[[Note Title]]` syntax to link between notes by parsing content and creating clickable links.

### Archive Feature
Add UI to move notes to an archived state (already supported in data model - see `archived` field).

## Development

This is a static app with no build process. To modify:

1. Edit `app.js`, `styles.css`, or `index.html`
2. Refresh browser to see changes
3. Check browser console for any errors

### Adding New Features

The app follows a simple architecture:
- **State Management**: `state` object holds app state
- **Storage**: Functions prefixed with storage operations (load/save/create/update/delete)
- **Rendering**: `render*()` functions update the UI
- **Event Handlers**: `handle*()` functions respond to user actions

## License

This project is provided as-is for educational and personal use.

## Credits

- Built with vanilla JavaScript
- Uses [Marked](https://marked.js.org/) for Markdown parsing
- Uses [DOMPurify](https://github.com/cure53/DOMPurify) for HTML sanitization
- Uses [JSZip](https://stuk.github.io/jszip/) for ZIP file creation
- Font: Space Grotesk from Google Fonts
- Icon design inspired by Feather Icons

## Recent Improvements

- ✅ Undo/Redo with 50-state history
- ✅ IndexedDB for efficient image storage
- ✅ Offline indicator and detection
- ✅ Keyboard shortcuts help modal
- ✅ Search result highlighting
- ✅ Markdown export format (.md)
- ✅ Enhanced save status indicators
- ✅ Quota exceeded error handling
- ✅ Performance optimizations (lazy loading, incremental rendering)
- ✅ Full keyboard navigation for accessibility
- ✅ ARIA live regions for screen readers

---

**Enjoy taking notes!** 📝
