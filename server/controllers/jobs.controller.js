const Job = require('../models/Job');

// Controller to create a new job posting
exports.createJob = async (req, res) => {
    const { title, description, company_name, location, job_type, salary_range } = req.body;
    const employerId = req.user.id; // Corrected: use req.user.id

    if (req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Forbidden: Only employers can post jobs.' });
    }

    if (!title || !description || !company_name || !location) {
        return res.status(400).json({ message: 'Missing required fields: title, description, company_name, location.' });
    }

    try {
        const newJob = await Job.create({
            employerId,
            title,
            description,
            companyName: company_name, // Map to model's expected camelCase
            location,
            jobType: job_type, // Map to model's expected camelCase
            salaryRange: salary_range // Map to model's expected camelCase
        });
        res.status(201).json({ message: 'Job created successfully', job: newJob });
    } catch (error) {
        console.error('Error creating job:', error.message);
        res.status(500).json({ message: 'Error creating job', error: error.message });
    }
};

// Controller to get all job postings (public)
exports.getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.findAll(true); // includeEmployerDetails = true
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error.message);
        res.status(500).json({ message: 'Error fetching jobs', error: error.message });
    }
};

// Controller to get job postings by a specific employer
exports.getJobsByEmployer = async (req, res) => {
    const employerId = req.user.id; // Corrected: use req.user.id

    if (req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Forbidden: Only employers can view their own job postings.' });
    }

    try {
        const jobs = await Job.findByEmployerId(employerId);
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching employer jobs:', error.message);
        res.status(500).json({ message: 'Error fetching employer jobs', error: error.message });
    }
};

// Controller to get a single job posting by ID (public)
exports.getJobById = async (req, res) => {
    const { id } = req.params;
    try {
        const job = await Job.findById(id, true); // includeEmployerDetails = true
        if (job) {
            res.status(200).json(job);
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
    const employerId = req.user.id; // Corrected: use req.user.id

    if (req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Forbidden: Only employers can update jobs.' });
    }

    try {
        const existingJob = await Job.findById(id);
        if (!existingJob) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (existingJob.employer_id !== employerId) {
            return res.status(403).json({ message: 'Forbidden: You do not own this job posting.' });
        }

        // Prepare data for update, merging existing with new from req.body
        // req.body might provide snake_case, model's update method expects camelCase keys.
        // existingJob has snake_case keys from DB (e.g., existingJob.company_name)
        const updatedDataForModel = {
            title: req.body.title !== undefined ? req.body.title : existingJob.title,
            description: req.body.description !== undefined ? req.body.description : existingJob.description,
            companyName: req.body.company_name !== undefined ? req.body.company_name : existingJob.company_name,
            location: req.body.location !== undefined ? req.body.location : existingJob.location,
            jobType: req.body.job_type !== undefined ? req.body.job_type : existingJob.job_type,
            salaryRange: req.body.salary_range !== undefined ? req.body.salary_range : existingJob.salary_range
        };
        
        // Validation for core fields if they are being explicitly set to empty (or not provided from an empty body)
        if (updatedDataForModel.title === undefined || updatedDataForModel.description === undefined || updatedDataForModel.companyName === undefined || updatedDataForModel.location === undefined) {
             return res.status(400).json({ message: 'Title, description, company name, and location are required.' });
        }

        const updatedJob = await Job.update(id, updatedDataForModel);
        res.status(200).json({ message: 'Job updated successfully', job: updatedJob });

    } catch (error) {
        console.error('Error updating job:', error.message);
        if (error.message.includes('Job not found or no changes made')) { // From Model
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error updating job', error: error.message });
    }
};

// Controller to delete a job posting
exports.deleteJob = async (req, res) => {
    const { id } = req.params;
    const employerId = req.user.id; // Corrected: use req.user.id

    if (req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Forbidden: Only employers can delete jobs.' });
    }

    try {
        const job = await Job.findById(id);
        if (!job) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (job.employer_id !== employerId) {
            return res.status(403).json({ message: 'Forbidden: You do not own this job posting.' });
        }

        const deleted = await Job.delete(id);
        if (deleted) {
            res.status(200).json({ message: 'Job deleted successfully', jobId: id });
        } else {
            // Should be caught by job existence check, but as a fallback
            res.status(404).json({ message: 'Job not found or already deleted.' });
        }
    } catch (error) {
        console.error('Error deleting job:', error.message);
        res.status(500).json({ message: 'Error deleting job', error: error.message });
    }
};