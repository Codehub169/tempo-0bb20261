const db = require('../database/db');

/**
 * Job Model
 * 
 * Interacts with the `jobs` table in the database.
 */
class Job {
  /**
   * Creates a new job posting.
   * @param {object} jobData - Job data (employer_id, title, description, company_name, location, job_type, salary_range).
   * @returns {Promise<object>} The newly created job object.
   * @throws {Error} If database operation fails.
   */
  static async create({ employerId, title, description, companyName, location, jobType, salaryRange }) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO jobs (employer_id, title, description, company_name, location, job_type, salary_range) VALUES (?, ?, ?, ?, ?, ?, ?)';
      db.run(sql, [employerId, title, description, companyName, location, jobType, salaryRange], function (err) {
        if (err) {
          return reject(err);
        }
        resolve({ id: this.lastID, employerId, title, description, companyName, location, jobType, salaryRange });
      });
    });
  }

  /**
   * Finds all job postings, optionally joining with user details.
   * @param {boolean} includeEmployerDetails - Whether to join with users table for employer email.
   * @returns {Promise<Array<object>>} An array of job objects.
   * @throws {Error} If database operation fails.
   */
  static async findAll(includeEmployerDetails = false) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT j.*';
      if (includeEmployerDetails) {
        sql += ', u.email as employer_email, u.company_name as employer_company_name FROM jobs j JOIN users u ON j.employer_id = u.id';
      } else {
        sql += ' FROM jobs j';
      }
      sql += ' ORDER BY j.posted_at DESC';
      
      db.all(sql, [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  }

  /**
   * Finds a job posting by its ID, optionally joining with user details.
   * @param {number} id - The ID of the job to find.
   * @param {boolean} includeEmployerDetails - Whether to join with users table for employer email.
   * @returns {Promise<object|null>} The job object if found, otherwise null.
   * @throws {Error} If database operation fails.
   */
  static async findById(id, includeEmployerDetails = false) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT j.*';
      if (includeEmployerDetails) {
        sql += ', u.email as employer_email, u.company_name as employer_company_name FROM jobs j JOIN users u ON j.employer_id = u.id WHERE j.id = ?';
      } else {
        sql += ' FROM jobs j WHERE j.id = ?';
      }
      db.get(sql, [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  }

  /**
   * Finds all job postings by a specific employer ID.
   * @param {number} employerId - The ID of the employer.
   * @returns {Promise<Array<object>>} An array of job objects posted by the employer.
   * @throws {Error} If database operation fails.
   */
  static async findByEmployerId(employerId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM jobs WHERE employer_id = ? ORDER BY posted_at DESC';
      db.all(sql, [employerId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  }

  /**
   * Updates an existing job posting.
   * @param {number} id - The ID of the job to update.
   * @param {object} jobData - Fields to update (title, description, company_name, location, job_type, salary_range).
   * @returns {Promise<object>} The updated job object.
   * @throws {Error} If database operation fails or job not found.
   */
  static async update(id, { title, description, companyName, location, jobType, salaryRange }) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE jobs 
        SET title = ?, description = ?, company_name = ?, location = ?, job_type = ?, salary_range = ?
        WHERE id = ?
      `;
      db.run(sql, [title, description, companyName, location, jobType, salaryRange, id], function (err) {
        if (err) {
          return reject(err);
        }
        if (this.changes === 0) {
          return reject(new Error('Job not found or no changes made.'));
        }
        resolve({ id, title, description, companyName, location, jobType, salaryRange });
      });
    });
  }

  /**
   * Deletes a job posting by its ID.
   * @param {number} id - The ID of the job to delete.
   * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
   * @throws {Error} If database operation fails.
   */
  static async delete(id) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM jobs WHERE id = ?';
      db.run(sql, [id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes > 0);
      });
    });
  }
}

module.exports = Job;
