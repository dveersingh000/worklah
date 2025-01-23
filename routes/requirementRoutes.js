const express = require('express');
const {
  getRequirements,
  addRequirement,
  updateRequirement,
  deleteRequirement,
} = require('../controllers/requirementController');
const router = express.Router();

router.get('/', getRequirements); 
router.post('/', addRequirement);
router.put('/:id', updateRequirement); 
router.delete('/:id', deleteRequirement);

module.exports = router;
