const db = require('../database/db');
const path = require('path');
const fs = require('fs');

// Controller to create a new job application
exports.createApplication = async (req, res) => {
    const { jobId, cover_letter } = req.body;
    const candidate_id = req.user.userId;

    if (req.user.role !== 'candidate') {
        return res.status(403).json({ message: 'Forbidden: Only candidates can apply for jobs.' });
    }

    if (!jobId) {
        return res.status(400).json({ message: 'Job ID is required.' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'Resume file is required.' });
    }
    const resume_path = req.file.path; // Path provided by multer

    // Check if job exists
    const jobExistsSql = 'SELECT id FROM jobs WHERE id = ?';
    try {
        const job = await new Promise((resolve, reject) => {
            db.get(jobExistsSql, [jobId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        if (!job) {
            // If resume was uploaded but job doesn't exist, delete uploaded file
            fs.unlink(resume_path, (err) => {
                if (err) console.error('Error deleting orphaned resume:', err);
            });
            return res.status(404).json({ message: 'Job not found.' });
        }
    } catch (error) {
        fs.unlink(resume_path, (err) => {
            if (err) console.error('Error deleting orphaned resume after DB error:', err);
        });
        console.error('Error checking job existence:', error.message);
        return res.status(500).json({ message: 'Error processing application', error: error.message });
    }

    const sql = `INSERT INTO applications (job_id, candidate_id, resume_path, cover_letter) 
                 VALUES (?, ?, ?, ?)`;
    const params = [jobId, candidate_id, resume_path, cover_letter];

    try {
        const result = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) {
                    // Check for UNIQUE constraint violation (already applied)
                    if (err.message.includes('UNIQUE constraint failed: applications.job_id, applications.candidate_id')) {
                        return reject(new Error('You have already applied for this job.'));
                    }
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
        res.status(201).json({ 
            message: 'Application submitted successfully', 
            applicationId: result.lastID, 
            jobId, 
            candidate_id 
        });
    } catch (error) {
        // If DB insertion fails (e.g. already applied), delete uploaded file
        fs.unlink(resume_path, (err) => {
            if (err) console.error('Error deleting resume after failed application submission:', err);
        });
        console.error('Error creating application:', error.message);
        if (error.message === 'You have already applied for this job.') {
            return res.status(409).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error creating application', error: error.message });
    }
};

// Controller to get all applications for a specific job (for employer)
exports.getApplicationsForJob = async (req, res) => {
    const { jobId } = req.params;
    const employer_id = req.user.userId;

    if (req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Forbidden: Only employers can view applications.' });
    }

    // Verify employer owns the job
    const jobCheckSql = 'SELECT employer_id FROM jobs WHERE id = ?';
    try {
        const job = await new Promise((resolve, reject) => {
            db.get(jobCheckSql, [jobId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (job.employer_id !== employer_id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this job.' });
        }

        const sql = `SELECT a.id, a.candidate_id, u.email as candidate_email, a.resume_path, a.cover_letter, a.applied_at 
                     FROM applications a 
                     JOIN users u ON a.candidate_id = u.id 
                     WHERE a.job_id = ? 
                     ORDER BY a.applied_at DESC`;
        
        const rows = await new Promise((resolve, reject) => {
            db.all(sql, [jobId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        res.status(200).json(rows);

    } catch (error) {
        console.error('Error fetching applications for job:', error.message);
        res.status(500).json({ message: 'Error fetching applications', error: error.message });
    }
};

// Controller to get all applications submitted by a candidate
exports.getApplicationsByCandidate = async (req, res) => {
    const candidate_id = req.user.userId;

    if (req.user.role !== 'candidate') {
        return res.status(403).json({ message: 'Forbidden: Access denied.' });
    }

    const sql = `SELECT a.id, a.job_id, j.title as job_title, j.company_name as job_company, a.resume_path, a.cover_letter, a.applied_at 
                 FROM applications a 
                 JOIN jobs j ON a.job_id = j.id 
                 WHERE a.candidate_id = ? 
                 ORDER BY a.applied_at DESC`;
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(sql, [candidate_id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching candidate applications:', error.message);
        res.status(500).json({ message: 'Error fetching applications', error: error.message });
    }
};

// Controller to get details of a specific application
exports.getApplicationDetails = async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.user.userId;
    const currentUserRole = req.user.role;

    const sql = `SELECT a.*, j.employer_id 
                 FROM applications a 
                 JOIN jobs j ON a.job_id = j.id 
                 WHERE a.id = ?`;
    try {
        const application = await new Promise((resolve, reject) => {
            db.get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!application) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        // Authorization check: 
        // Candidate who owns the application OR Employer who owns the job associated with the application
        if (currentUserRole === 'candidate' && application.candidate_id !== currentUserId) {
            return res.status(403).json({ message: 'Forbidden: You do not own this application.' });
        }
        if (currentUserRole === 'employer' && application.employer_id !== currentUserId) {
            return res.status(403).json({ message: 'Forbidden: You do not own the job this application is for.' });
        }

        // Add candidate email and job title for convenience
        const detailsSql = `SELECT a.*, u.email as candidate_email, j.title as job_title, j.company_name as job_company
                            FROM applications a
                            JOIN users u ON a.candidate_id = u.id
                            JOIN jobs j ON a.job_id = j.id
                            WHERE a.id = ?`;
        const detailedApplication = await new Promise((resolve, reject) => {
            db.get(detailsSql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        res.status(200).json(detailedApplication);

    } catch (error) {
        console.error('Error fetching application details:', error.message);
        res.status(500).json({ message: 'Error fetching application details', error: error.message });
    }
};