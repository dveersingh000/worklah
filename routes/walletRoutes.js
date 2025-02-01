const express = require("express");
const { authMiddleware } = require("../middlewares/auth");
const { addCredit, cashOut, getWalletDetails } = require("../controllers/walletController");

const router = express.Router();

router.post("/add-credit", authMiddleware, addCredit);
router.post("/cashout", authMiddleware, cashOut);
router.get("/", authMiddleware, getWalletDetails);

module.exports = router;
