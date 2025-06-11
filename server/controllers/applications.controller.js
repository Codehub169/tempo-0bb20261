const Application = require('../models/Application');
const Job = require('../models/Job');
const fs = require('fs');
const path = require('path');

// Controller to create a new job application
exports.createApplication = async (req, res) => {
    const { jobId, cover_letter } = req.body;
    const candidateId = req.user.id; // Corrected: use req.user.id

    if (req.user.role !== 'candidate') {
        return res.status(403).json({ message: 'Forbidden: Only candidates can apply for jobs.' });
    }

    if (!jobId) {
        return res.status(400).json({ message: 'Job ID is required.' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'Resume file is required.' });
    }
    
    const resumeFilename = req.file.filename; // Store filename only
    const fullResumePath = req.file.path;     // Full path for fs operations

    try {
        const job = await Job.findById(jobId);
        if (!job) {
            fs.unlink(fullResumePath, (err) => {
                if (err) console.error('Error deleting orphaned resume (job not found):', err.message);
            });
            return res.status(404).json({ message: 'Job not found.' });
        }

        const existingApplication = await Application.findByJobAndCandidate(jobId, candidateId);
        if (existingApplication) {
            fs.unlink(fullResumePath, (err) => {
                if (err) console.error('Error deleting redundant resume (already applied):', err.message);
            });
            return res.status(409).json({ message: 'You have already applied for this job.' });
        }

        const newApplication = await Application.create({
            jobId: parseInt(jobId, 10),
            candidateId,
            resumePath: resumeFilename, // Store filename
            coverLetter: cover_letter
        });

        res.status(201).json({ 
            message: 'Application submitted successfully', 
            application: newApplication 
        });

    } catch (error) {
        fs.unlink(fullResumePath, (err) => {
            if (err) console.error('Error deleting resume after failed application submission:', err.message);
        });
        console.error('Error creating application:', error.message);
        // Model's Application.create might throw specific error for UNIQUE constraint if findByJobAndCandidate somehow missed
        if (error.message.toLowerCase().includes('candidate has already applied')) {
             return res.status(409).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error creating application', error: error.message });
    }
};

// Controller to get all applications for a specific job (for employer)
exports.getApplicationsForJob = async (req, res) => {
    const { jobId } = req.params;
    const employerId = req.user.id; // Corrected: use req.user.id

    if (req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Forbidden: Only employers can view applications.' });
    }

    try {
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (job.employer_id !== employerId) {
            return res.status(403).json({ message: 'Forbidden: You do not own this job.' });
        }

        const applications = await Application.findByJobId(jobId);
        res.status(200).json(applications);

    } catch (error) {
        console.error('Error fetching applications for job:', error.message);
        res.status(500).json({ message: 'Error fetching applications', error: error.message });
    }
};

// Controller to get all applications submitted by a candidate
exports.getApplicationsByCandidate = async (req, res) => {
    const candidateId = req.user.id; // Corrected: use req.user.id

    if (req.user.role !== 'candidate') {
        // This check might seem redundant if routes are protected by role, but good for defense in depth
        return res.status(403).json({ message: 'Forbidden: Access denied.' }); 
    }

    try {
        const applications = await Application.findByCandidateId(candidateId);
        res.status(200).json(applications);
    } catch (error) {
        console.error('Error fetching candidate applications:', error.message);
        res.status(500).json({ message: 'Error fetching applications', error: error.message });
    }
};

// Controller to get details of a specific application
exports.getApplicationDetails = async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.user.id; // Corrected: use req.user.id
    const currentUserRole = req.user.role;

    try {
        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        // Authorization check: 
        // Application model findById joins job and includes employer_id from jobs table
        if (currentUserRole === 'candidate' && application.candidate_id !== currentUserId) {
            return res.status(403).json({ message: 'Forbidden: You do not own this application.' });
        }
        if (currentUserRole === 'employer' && application.employer_id !== currentUserId) {
            return res.status(403).json({ message: 'Forbidden: You do not own the job this application is for.' });
        }

        res.status(200).json(application);

    } catch (error) {
        console.error('Error fetching application details:', error.message);
        res.status(500).json({ message: 'Error fetching application details', error: error.message });
    }
};