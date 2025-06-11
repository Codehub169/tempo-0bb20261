const db = require('../database/db');
const bcrypt = require('bcryptjs');

/**
 * User Model
 * 
 * Interacts with the `users` table in the database.
 */
class User {
  /**
   * Creates a new user.
   * @param {object} userData - User data (email, password, role, company_name?).
   * @returns {Promise<object>} The newly created user object (excluding password).
   * @throws {Error} If database operation fails or email already exists.
   */
  static async create({ email, password, role, companyName }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO users (email, password, role, company_name) VALUES (?, ?, ?, ?)';
      db.run(sql, [email, hashedPassword, role, companyName], function (err) {
        if (err) {
          // Check for unique constraint violation (email already exists)
          if (err.message.includes('UNIQUE constraint failed: users.email')) {
            return reject(new Error('Email already exists.'));
          }
          return reject(err);
        }
        // Return the newly created user (excluding password)
        resolve({ id: this.lastID, email, role, companyName });
      });
    });
  }

  /**
   * Finds a user by their email address.
   * @param {string} email - The email of the user to find.
   * @returns {Promise<object|null>} The user object if found, otherwise null.
   * @throws {Error} If database operation fails.
   */
  static async findByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE email = ?';
      db.get(sql, [email], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  }

  /**
   * Finds a user by their ID.
   * @param {number} id - The ID of the user to find.
   * @returns {Promise<object|null>} The user object if found, otherwise null.
   * @throws {Error} If database operation fails.
   */
  static async findById(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT id, email, role, company_name, created_at FROM users WHERE id = ?';
      db.get(sql, [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  }
}

module.exports = User;
