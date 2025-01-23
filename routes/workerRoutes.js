const express = require('express');
const {
  getWorkers,
  getWorkerById,
  addOrUpdateWorker,
  deleteWorker,
  updateWorkPassStatus,
} = require('../controllers/workerController');

const router = express.Router();

router.get('/', getWorkers);
router.get('/:id', getWorkerById);
router.post('/', addOrUpdateWorker);
router.put('/:id', addOrUpdateWorker);
router.delete('/:id', deleteWorker);
router.patch('/:id/work-pass-status', updateWorkPassStatus);

module.exports = router;
