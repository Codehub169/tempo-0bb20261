const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobs.controller');
const authenticateToken = require('../middleware/authenticateToken'); // To be implemented

// @route   POST api/jobs
// @desc    Create a new job posting (employer only)
// @access  Private (Employer)
router.post('/', authenticateToken, jobsController.createJob);

// @route   GET api/jobs
// @desc    Get all job postings (publicly accessible, with filters)
// @access  Public
router.get('/', jobsController.getAllJobs);

// @route   GET api/jobs/my-postings
// @desc    Get all jobs posted by the logged-in employer
// @access  Private (Employer)
router.get('/my-postings', authenticateToken, jobsController.getJobsByEmployer);

// @route   GET api/jobs/:id
// @desc    Get a single job posting by ID
// @access  Public
router.get('/:id', jobsController.getJobById);

// @route   PUT api/jobs/:id
// @desc    Update a job posting (employer only, owner only)
// @access  Private (Employer, Owner)
router.put('/:id', authenticateToken, jobsController.updateJob);

// @route   DELETE api/jobs/:id
// @desc    Delete a job posting (employer only, owner only)
// @access  Private (Employer, Owner)
router.delete('/:id', authenticateToken, jobsController.deleteJob);

module.exports = router;