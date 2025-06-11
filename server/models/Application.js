const db = require('../database/db');

/**
 * Application Model
 * 
 * Interacts with the `applications` table in the database.
 */
class Application {
  /**
   * Creates a new job application.
   * @param {object} applicationData - Application data (job_id, candidate_id, resume_path, cover_letter).
   * @returns {Promise<object>} The newly created application object.
   * @throws {Error} If database operation fails (e.g. unique constraint violation).
   */
  static async create({ jobId, candidateId, resumePath, coverLetter }) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO applications (job_id, candidate_id, resume_path, cover_letter) VALUES (?, ?, ?, ?)';
      db.run(sql, [jobId, candidateId, resumePath, coverLetter], function (err) {
        if (err) {
            // Check for unique constraint violation (duplicate application)
            if (err.message.includes('UNIQUE constraint failed: applications.job_id, applications.candidate_id')) {
              return reject(new Error('Candidate has already applied for this job.'));
            }
            return reject(err);
        }
        resolve({ id: this.lastID, jobId, candidateId, resumePath, coverLetter });
      });
    });
  }

  /**
   * Finds all applications for a specific job ID, joining with candidate details.
   * @param {number} jobId - The ID of the job.
   * @returns {Promise<Array<object>>} An array of application objects with candidate emails.
   * @throws {Error} If database operation fails.
   */
  static async findByJobId(jobId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT a.*, u.email as candidate_email, u.company_name as candidate_company_name 
        FROM applications a
        JOIN users u ON a.candidate_id = u.id
        WHERE a.job_id = ?
        ORDER BY a.applied_at DESC
      `;
      db.all(sql, [jobId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  }

  /**
   * Finds all applications submitted by a specific candidate ID, joining with job details.
   * @param {number} candidateId - The ID of the candidate.
   * @returns {Promise<Array<object>>} An array of application objects with job titles and company names.
   * @throws {Error} If database operation fails.
   */
  static async findByCandidateId(candidateId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT a.*, j.title as job_title, j.company_name as job_company_name 
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.candidate_id = ?
        ORDER BY a.applied_at DESC
      `;
      db.all(sql, [candidateId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  }

  /**
   * Finds a specific application by its ID, joining with candidate and job details.
   * @param {number} id - The ID of the application.
   * @returns {Promise<object|null>} The application object if found, otherwise null.
   * @throws {Error} If database operation fails.
   */
  static async findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT a.*, 
               u.email as candidate_email, u.company_name as candidate_company_name,
               j.title as job_title, j.company_name as job_company_name, j.employer_id
        FROM applications a
        JOIN users u ON a.candidate_id = u.id
        JOIN jobs j ON a.job_id = j.id
        WHERE a.id = ?
      `;
      db.get(sql, [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  }

  /**
   * Finds an application by job ID and candidate ID to check for duplicates.
   * @param {number} jobId - The job ID.
   * @param {number} candidateId - The candidate ID.
   * @returns {Promise<object|null>} The application object if found, otherwise null.
   */
  static async findByJobAndCandidate(jobId, candidateId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM applications WHERE job_id = ? AND candidate_id = ?';
      db.get(sql, [jobId, candidateId], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  }
}

module.exports = Application;
