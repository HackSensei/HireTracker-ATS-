// Polyfill canvas objects for pdf-parse under serverless environments
global.DOMMatrix = global.DOMMatrix || class DOMMatrix {};
global.ImageData = global.ImageData || class ImageData {};
global.Path2D = global.Path2D || class Path2D {};

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/analytics', require('./routes/analytics'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
