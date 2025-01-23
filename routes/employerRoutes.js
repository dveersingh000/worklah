const express = require('express');
const {
  getAllEmployers,
  getEmployerById,
  createEmployer,
  updateEmployer,
  deleteEmployer,
  // getEmployerJobs,
  // addEmployerJob,
  // updateEmployerJob,
  // deleteEmployerJob,
} = require('../controllers/employerController');
const router = express.Router();

router.get('/', getAllEmployers);
router.get('/:id', getEmployerById);
router.post('/', createEmployer);
router.put('/:id', updateEmployer);
router.delete('/:id', deleteEmployer);
// router.get('/:id/jobs', getEmployerJobs);
// router.post('/:id/jobs', addEmployerJob);
// router.put('/:id/jobs/:jobId', updateEmployerJob);
// router.delete('/:id/jobs/:jobId', deleteEmployerJob);

module.exports = router;
