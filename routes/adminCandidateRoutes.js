const express = require("express");
const { getCandidatesByJob, getCandidateProfile, updateCandidate   } = require("../controllers/adminCandidateController");
const router = express.Router();

router.get("/jobs/:id/candidates", getCandidatesByJob); // ✅ Get candidates for a job
router.get("/candidates/:id", getCandidateProfile); // ✅ Get candidate profile
router.put("/candidates/:id", updateCandidate); // ✅ Update candidate details

module.exports = router;
