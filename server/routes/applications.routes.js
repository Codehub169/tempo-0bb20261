const express = require('express');
const router = express.Router();
const applicationsController = require('../controllers/applications.controller');
const authenticateToken = require('../middleware/authenticateToken'); // To be implemented
const handleUploads = require('../middleware/handleUploads'); // To be implemented

// @route   POST api/applications
// @desc    Submit a new job application (candidate only)
// @access  Private (Candidate)
router.post('/', authenticateToken, handleUploads.single('resume'), applicationsController.createApplication);

// @route   GET api/applications/job/:jobId
// @desc    Get all applications for a specific job (employer only, job owner only)
// @access  Private (Employer, Owner)
router.get('/job/:jobId', authenticateToken, applicationsController.getApplicationsForJob);

// @route   GET api/applications/my-applications
// @desc    Get all applications submitted by the logged-in candidate
// @access  Private (Candidate)
router.get('/my-applications', authenticateToken, applicationsController.getApplicationsByCandidate);

// @route   GET api/applications/:id
// @desc    Get details of a specific application (candidate owner or employer job owner)
// @access  Private (Owner)
router.get('/:id', authenticateToken, applicationsController.getApplicationDetails);

module.exports = router;