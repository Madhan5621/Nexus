require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const registerHandler = require('./api/register');
const loginHandler = require('./api/login');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend HTML files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Wrap Vercel-style (req, res) handlers so they work in plain Express too
app.post('/api/register', (req, res) => registerHandler(req, res));
app.post('/api/login', (req, res) => loginHandler(req, res));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NEXUS auth server running at http://localhost:${PORT}`);
});
