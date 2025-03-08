const express = require("express");
const { getCandidatesByJob, getCandidateProfile, updateCandidate , getCandidates  } = require("../controllers/adminCandidateController");
const router = express.Router();

router.get("/candidates", getCandidates);
router.get("/jobs/candidates/:id", getCandidatesByJob); // ✅ Get candidates for a job
router.get("/candidates/:id", getCandidateProfile); // ✅ Get candidate profile
router.put("/candidates/:id", updateCandidate); // ✅ Update candidate details

module.exports = router;
