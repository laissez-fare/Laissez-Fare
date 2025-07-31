// backend/server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('🦾 Laissez-Fare backend is alive and kickin.');
});

// Placeholder route for future endpoints
app.get('/status', (req, res) => {
  res.json({ status: 'running', timestamp: new Date() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});
