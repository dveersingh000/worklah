const express = require('express');
const { getAllJobs, getJobById, createJob, updateJob, changeJobStatus, deleteJob, duplicateJob, deactivateJob, cancelJob,} = require('../controllers/adminJobController');
const router = express.Router();

// Routes for Admin Job Management
router.get('/', getAllJobs); // ✅ Get all jobs with filters
router.get('/:id', getJobById); // ✅ Get a specific job
router.post('/', createJob); // ✅ Create a new job
router.put('/:id', updateJob); // ✅ Update a job
router.patch('/:id/status', changeJobStatus); // ✅ Change job status
router.delete('/:id', deleteJob); // ✅ Delete a job
router.post("/:id/duplicate", duplicateJob); // ✅ Duplicate Job
router.patch("/:id/deactivate", deactivateJob); // ✅ Deactivate Job
router.patch("/:id/cancel", cancelJob); // ✅ Cancel Job

module.exports = router;
