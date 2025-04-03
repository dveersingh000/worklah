const express = require('express');
const multer = require("multer");
const {
  getEmployers,
  getEmployerById,
  getOutletOverview,
  createEmployer,
  updateEmployer,
  deleteEmployer,
} = require('../controllers/employerController');
const { authMiddleware, adminOnlyMiddleware } = require("../middlewares/auth");
const router = express.Router();

router.use(authMiddleware, adminOnlyMiddleware);
// ✅ Set up file upload middleware
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

router.get('/', getEmployers);
router.get('/:id', getEmployerById);
router.get("/:outletId/overview", getOutletOverview);
router.post("/create", upload.fields([{ name: "companyLogo" }, { name: "acraCertificate" }]), createEmployer);
router.put('/:id', updateEmployer);
router.delete('/:id', deleteEmployer);

module.exports = router;
