const express = require('express');
const {
  getAllEmployers,
  getEmployerById,
  createEmployer,
  updateEmployer,
  deleteEmployer,
} = require('../controllers/employerController');
const router = express.Router();

router.get('/', getAllEmployers);
router.get('/:id', getEmployerById);
router.post('/', createEmployer);
router.put('/:id', updateEmployer);
router.delete('/:id', deleteEmployer);

module.exports = router;
