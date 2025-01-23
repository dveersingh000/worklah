const express = require('express');
const router = express.Router();
const {
  createOutlet,
  getAllOutlets,
  getOutletById,
  updateOutlet,
  deleteOutlet,
} = require('../controllers/outletController');

router.post('/', createOutlet);
router.get('/', getAllOutlets);
router.get('/:id', getOutletById);
router.put('/:id', updateOutlet);
router.delete('/:id', deleteOutlet);

module.exports = router;
