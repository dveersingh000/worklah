const express = require("express");
const { createShift, getShiftAvailability, getShiftById, updateShift, deleteShift, getJobShifts, getJobDetails } = require("../controllers/shiftController");
const router = express.Router();
const {authMiddleware} = require("../middlewares/auth");

router.post("/", createShift); 
router.get("/", authMiddleware, getShiftAvailability); 
router.get("/:shiftId", getShiftById);
router.put("/:shiftId", updateShift);
router.delete("/:shiftId", deleteShift);
router.get("/:jobId",authMiddleware, getJobShifts);
router.get('/job/:jobId', getJobDetails);

module.exports = router;
