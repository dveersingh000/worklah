const express = require('express');
const {
  getPenalties,
  addPenalty,
  updatePenalty,
  deletePenalty,
} = require('../controllers/penaltyController');
const router = express.Router();

router.get('/', getPenalties); 
router.post('/', addPenalty); 
router.put('/:id', updatePenalty); 
router.delete('/:id', deletePenalty);

module.exports = router;
