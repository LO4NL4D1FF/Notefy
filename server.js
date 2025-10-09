// Backend server for Notefy
// This is a placeholder for future backend implementation

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API routes will be added here

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
