# Notefy Backend

Backend API for the Notefy note-taking application.

## Overview

This branch contains the backend server implementation for Notefy. The backend will provide API endpoints for note synchronization, user authentication, and cloud storage capabilities.

## Project Structure

```
notefy-backend/
├── server.js                    # Main Express server
├── package.json                 # Dependencies and scripts
├── diagrams/                    # Architecture diagrams
│   ├── USE_CASE_DIAGRAM.txt
│   ├── COMPONENT_ARCHITECTURE.txt
│   ├── DATA_MODEL_ERD.txt
│   └── DATA_FLOW_DIAGRAM.txt
├── TECHNICAL_REPORT.md          # Technical documentation
├── TESTING_DOCUMENTATION.md     # Testing guidelines
└── README.md                    # This file
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. For development with auto-reload:
```bash
npm run dev
```

## Technologies

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Future additions**: Database (MongoDB/PostgreSQL), Authentication (JWT), etc.

## Data Model

The backend will handle the same note structure as the frontend:

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

## API Documentation

### Planned Endpoints

- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create a new note
- `GET /api/notes/:id` - Get a specific note
- `PUT /api/notes/:id` - Update a note
- `DELETE /api/notes/:id` - Delete a note
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `POST /api/sync` - Sync notes between devices

## Development

This backend is currently a work in progress. Future implementations will include:

- Database integration for persistent storage
- User authentication and authorization
- Real-time synchronization between devices
- Image storage and management
- API rate limiting and security measures

## Frontend Integration

The frontend (main/frontend branches) can be configured to connect to this backend API for cloud sync functionality. See the frontend README for integration details.

## License

This project is provided as-is for educational and personal use.
