const db = require('../database/db');

// Controller to create a new job posting
exports.createJob = async (req, res) => {
    const { title, description, company_name, location, job_type, salary_range } = req.body;
    const employer_id = req.user.userId;

    if (req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Forbidden: Only employers can post jobs.' });
    }

    if (!title || !description || !company_name || !location) {
        return res.status(400).json({ message: 'Missing required fields: title, description, company_name, location.' });
    }

    const sql = `INSERT INTO jobs (employer_id, title, description, company_name, location, job_type, salary_range) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [employer_id, title, description, company_name, location, job_type, salary_range];

    try {
        const result = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
        res.status(201).json({ message: 'Job created successfully', jobId: result.lastID, employer_id, title, company_name, location });
    } catch (error) {
        console.error('Error creating job:', error.message);
        res.status(500).json({ message: 'Error creating job', error: error.message });
    }
};

// Controller to get all job postings (public)
exports.getAllJobs = async (req, res) => {
    const sql = "SELECT j.id, j.title, j.company_name, j.location, j.job_type, j.salary_range, j.posted_at, u.email as employer_email FROM jobs j JOIN users u ON j.employer_id = u.id ORDER BY j.posted_at DESC";
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching jobs:', error.message);
        res.status(500).json({ message: 'Error fetching jobs', error: error.message });
    }
};

// Controller to get job postings by a specific employer
exports.getJobsByEmployer = async (req, res) => {
    const employer_id = req.user.userId;

    if (req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Forbidden: Only employers can view their own job postings.' });
    }

    const sql = "SELECT * FROM jobs WHERE employer_id = ? ORDER BY posted_at DESC";
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(sql, [employer_id], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching employer jobs:', error.message);
        res.status(500).json({ message: 'Error fetching employer jobs', error: error.message });
    }
};

// Controller to get a single job posting by ID (public)
exports.getJobById = async (req, res) => {
    const { id } = req.params;
    const sql = "SELECT j.*, u.email as employer_email, u.company_name as employer_profile_company_name FROM jobs j JOIN users u ON j.employer_id = u.id WHERE j.id = ?";
    try {
        const row = await new Promise((resolve, reject) => {
            db.get(sql, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
        if (row) {
            res.status(200).json(row);
        } else {
            res.status(404).json({ message: 'Job not found' });
        }
    } catch (error) {
        console.error('Error fetching job by ID:', error.message);
        res.status(500).json({ message: 'Error fetching job by ID', error: error.message });
    }
};

// Controller to update a job posting
exports.updateJob = async (req, res) => {
    const { id } = req.params;
    const { title, description, company_name, location, job_type, salary_range } = req.body;
    const employer_id = req.user.userId;

    if (req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Forbidden: Only employers can update jobs.' });
    }

    if (!title || !description || !company_name || !location) {
        return res.status(400).json({ message: 'Missing required fields for update.' });
    }

    // First, verify the job exists and belongs to the employer
    const checkSql = "SELECT employer_id FROM jobs WHERE id = ?";
    try {
        const job = await new Promise((resolve, reject) => {
            db.get(checkSql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (job.employer_id !== employer_id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this job posting.' });
        }

        // Proceed with update
        const updateSql = `UPDATE jobs SET 
                           title = COALESCE(?, title), 
                           description = COALESCE(?, description), 
                           company_name = COALESCE(?, company_name), 
                           location = COALESCE(?, location), 
                           job_type = COALESCE(?, job_type), 
                           salary_range = COALESCE(?, salary_range) 
                           WHERE id = ? AND employer_id = ?`;
        const params = [title, description, company_name, location, job_type, salary_range, id, employer_id];
        
        const result = await new Promise((resolve, reject) => {
            db.run(updateSql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        if (result.changes === 0) {
            // This case should ideally be caught by the ownership check above, but as a fallback.
            return res.status(404).json({ message: 'Job not found or no changes made.' });
        }
        res.status(200).json({ message: 'Job updated successfully', jobId: id });

    } catch (error) {
        console.error('Error updating job:', error.message);
        res.status(500).json({ message: 'Error updating job', error: error.message });
    }
};

// Controller to delete a job posting
exports.deleteJob = async (req, res) => {
    const { id } = req.params;
    const employer_id = req.user.userId;

    if (req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Forbidden: Only employers can delete jobs.' });
    }

    // Verify ownership before deleting
    const checkSql = "SELECT employer_id FROM jobs WHERE id = ?";
    try {
        const job = await new Promise((resolve, reject) => {
            db.get(checkSql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (job.employer_id !== employer_id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this job posting.' });
        }

        // Proceed with deletion
        const deleteSql = "DELETE FROM jobs WHERE id = ? AND employer_id = ?";
        const result = await new Promise((resolve, reject) => {
            db.run(deleteSql, [id, employer_id], function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Job not found or already deleted.' });
        }
        res.status(200).json({ message: 'Job deleted successfully', jobId: id });

    } catch (error) {
        console.error('Error deleting job:', error.message);
        res.status(500).json({ message: 'Error deleting job', error: error.message });
    }
};