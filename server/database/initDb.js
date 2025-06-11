const db = require('./db');

const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('employer', 'candidate')),
    company_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
  );
`;

const createJobsTable = `
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    company_name TEXT NOT NULL,
    location TEXT NOT NULL,
    job_type TEXT, -- e.g., Full-time, Part-time, Contract
    salary_range TEXT,
    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (employer_id) REFERENCES users (id) ON DELETE CASCADE
  );
`;

const createApplicationsTable = `
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    candidate_id INTEGER NOT NULL,
    resume_path TEXT NOT NULL,
    cover_letter TEXT,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE (job_id, candidate_id) -- Prevent duplicate applications
  );
`;

const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(createUsersTable, (err) => {
        if (err) {
          console.error('Error creating users table:', err.message);
          return reject(err);
        }
        console.log('Users table created or already exists.');
      });

      db.run(createJobsTable, (err) => {
        if (err) {
          console.error('Error creating jobs table:', err.message);
          return reject(err);
        }
        console.log('Jobs table created or already exists.');
      });

      db.run(createApplicationsTable, (err) => {
        if (err) {
          console.error('Error creating applications table:', err.message);
          return reject(err);
        }
        console.log('Applications table created or already exists.');
        resolve();
      });
    });
  });
};

// Allow direct execution to initialize schema
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database schema initialized successfully.');
      db.close((err) => {
        if (err) {
          console.error('Error closing database connection:', err.message);
        } else {
          console.log('Database connection closed.');
        }
      });
    })
    .catch(err => {
      console.error('Failed to initialize database schema:', err);
      db.close();
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
