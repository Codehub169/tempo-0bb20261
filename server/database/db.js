const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Ensure .env from server/ is loaded

const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'jobboard.db');
const dbDir = path.dirname(dbPath);

// Create database directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Database directory created: ${dbDir}`);
  } catch (err) {
    console.error('Error creating database directory:', err);
    process.exit(1); // Exit if we can't create the directory
  }
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
    console.error(`Attempted to connect to: ${dbPath}`);
    process.exit(1); // Exit if DB connection fails
  } else {
    console.log(`Successfully connected to SQLite database: ${dbPath}`);
    // Enable foreign key support
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
      if (pragmaErr) {
        console.error('Error enabling foreign key support:', pragmaErr.message);
      } else {
        console.log('Foreign key support enabled.');
      }
    });
  }
});

module.exports = db;
