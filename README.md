# Notefy - Markdown Notes App

A fast, offline-capable Markdown notes vault built with vanilla JavaScript. No frameworks, no build tools—just open and use.

## Features

### Core Functionality
- **Two-pane UI** - Sidebar list with live editor and Markdown preview
- **Live Markdown Preview** - See your formatted content in real-time (sanitized with DOMPurify)
- **Local Persistence** - All notes saved to LocalStorage with autosave
- **Search & Filter** - Full-text search across titles and content
- **Tag System** - Inline hashtags (`#tag`) with tag-based filtering
- **Export/Import** - Backup and restore notes as JSON
- **Word Count** - Live word count and save status in status bar
- **Theme Toggle** - Switch between dark and light themes (persisted)
- **PWA Support** - Install as a Progressive Web App for offline use

### Keyboard Shortcuts
- `Ctrl/Cmd + N` - Create new note
- `Ctrl/Cmd + S` - Force save current note
- `Ctrl/Cmd + K` - Focus search input
- `F6` - Toggle focus between editor and preview
- `Delete` - Delete selected note (when focused on list)

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
│   └── purify.min.js       # HTML sanitizer (XSS protection)
├── icons/
│   └── notes.svg           # App icon
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service worker (offline support)
└── README.md              # This file
```

## Technologies Used

- **Vanilla JavaScript** - No frameworks
- **Semantic HTML5** - Accessible markup
- **Modern CSS** - Grid, Flexbox, CSS Variables
- **Marked.js** - Markdown parsing
- **DOMPurify** - XSS-safe HTML sanitization
- **LocalStorage API** - Data persistence
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
  "archived": false
}
```

## Features in Detail

### Autosave
- Debounced autosave (400ms after typing stops)
- Saves on blur (when you click away)
- Status indicator shows "Saving..." then "Saved just now"

### Tag Extraction
- Tags are extracted from content using pattern: `#tagname`
- Tags must be 2-24 characters: `[a-z0-9_-]`
- Automatically lowercased and deduplicated
- Click tag chips to filter notes

### Export/Import
- **Export**: Downloads `notes-export-YYYY-MM-DD.json` with all notes
- **Import**: Merges imported notes by ID (imported data wins on conflict)
- Re-sorts by last updated after import

### Security
- All Markdown preview content is sanitized with DOMPurify
- Script tags and dangerous HTML are stripped
- Safe for user-generated content

### Responsive Design
- **Desktop**: Two-pane split view (editor | preview)
- **Tablet**: Narrower sidebar, full functionality
- **Mobile**: Stacked layout with toggle buttons to switch between editor/preview

## Browser Support

Works in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Accessibility

- Semantic HTML with proper heading hierarchy
- ARIA labels and roles where needed
- Keyboard navigation support
- Focus visible states on all interactive elements
- Respects `prefers-reduced-motion`

## PWA Installation

Modern browsers will show an "Install" prompt when you visit the app. Once installed:
- Works offline
- Appears in your app drawer/menu
- Opens in standalone window (no browser UI)

## Known Limitations

- **Storage**: LocalStorage has ~5-10MB limit (suitable for thousands of notes)
- **No sync**: Notes stored locally only (consider implementing export/import for backup)
- **No collaboration**: Single-user, local-first design
- **Search**: Simple substring matching (no fuzzy search or advanced queries)

## Extending the App

### Add IndexedDB Storage
Uncomment the Dexie.js script tag and implement a storage abstraction layer to handle larger datasets.

### Linked Notes
Implement `[[Note Title]]` syntax to link between notes by parsing content and creating clickable links.

### Archive Feature
Add UI to move notes to an archived state (already supported in data model).

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
- Uses [DOMPurify](https://github.com/cure53/DOMPurify) for sanitization
- Icon design inspired by Feather Icons

---

**Enjoy taking notes!** 📝
