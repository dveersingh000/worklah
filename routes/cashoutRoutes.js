const express = require("express");
const {
    addCreditToWallet,
    requestCashout,
    processCashout,
    getUserCashouts,
    getAllCashouts,
} = require("../controllers/cashoutController");
const { authMiddleware /*adminMiddleware*/ } = require("../middlewares/auth");

const router = express.Router();

// Route to add credit
router.post("/add-credit", authMiddleware, addCreditToWallet);

// ✅ User requests cashout
router.post("/", authMiddleware, requestCashout);

// ✅ Admin approves/rejects cashout
router.put("/process", /*adminMiddleware,*/ processCashout);

// ✅ User views their cashout history
router.get("/", authMiddleware, getUserCashouts);

// ✅ Admin views all cashout requests
// router.get("/all", adminMiddleware, getAllCashouts);

module.exports = router;
