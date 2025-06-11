require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('./database/initDb');

// Import routes (to be created in later steps)
// const authRoutes = require('./routes/auth.routes');
// const jobRoutes = require('./routes/jobs.routes');
// const applicationRoutes = require('./routes/applications.routes');

const app = express();
const PORT = process.env.PORT || 9000;

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000', // Adjust if client runs on a different port during dev
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created upload directory: ${uploadDir}`);
}

// Serve uploaded files (e.g., resumes)
app.use('/uploads', express.static(uploadDir));

// Serve static files from the React app build directory
const clientBuildPath = process.env.CLIENT_BUILD_PATH || path.join(__dirname, 'public');
app.use(express.static(clientBuildPath));

// API Routes placeholder
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'JobBoard API is running' });
});

// Mount API routes (uncomment when route files are created)
// app.use('/api/auth', authRoutes);
// app.use('/api/jobs', jobRoutes);
// app.use('/api/applications', applicationRoutes);

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Client application not found. Ensure it is built and served correctly.');
  }
});

// Basic global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`Serving client app from: ${clientBuildPath}`);
      console.log(`Serving uploads from: ${uploadDir}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database or start server:', err);
    process.exit(1);
  });
