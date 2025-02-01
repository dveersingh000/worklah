const Wallet = require("../models/Wallet");
const User = require("../models/User");

// Add Credit to Wallet
exports.addCredit = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, description } = req.body;

        if (amount <= 0) {
            return res.status(400).json({ error: "Invalid amount" });
        }

        let user = await User.findById(userId).populate("eWallet"); // ✅ Ensure wallet is populated

        if (!user.eWallet) {
            // ✅ Create a new wallet if not linked
            const newWallet = new Wallet({ userId, balance: 0, transactions: [] });
            await newWallet.save();
            user.eWallet = newWallet._id;
            await user.save();
        }

        let wallet = await Wallet.findById(user.eWallet);

        wallet.balance += amount;
        wallet.transactions.push({
            type: "Credit",
            amount,
            description: description || "Wallet Credit",
        });

        await wallet.save();

        res.status(200).json({ message: "Amount added successfully", wallet });
    } catch (error) {
        res.status(500).json({ error: "Failed to add credit", details: error.message });
    }
};

// Cashout Functionality
exports.cashOut = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, cashoutMethod } = req.body;

        if (amount <= 0) {
            return res.status(400).json({ error: "Invalid cashout amount" });
        }

        let user = await User.findById(userId).populate("eWallet");

        if (!user.eWallet) {
            return res.status(400).json({ error: "No wallet linked to user" });
        }

        let wallet = await Wallet.findById(user.eWallet);
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ error: "Insufficient balance" });
        }

        wallet.balance -= amount;
        wallet.transactions.push({
            type: "Debit",
            amount,
            description: `Cashout via ${cashoutMethod || "Unknown Method"}`,
        });

        await wallet.save();

        res.status(200).json({ message: "Cashout successful", wallet });
    } catch (error) {
        res.status(500).json({ error: "Failed to process cashout", details: error.message });
    }
};

// Fetch Wallet Details
exports.getWalletDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).populate("eWallet");

        if (!user.eWallet) {
            return res.status(404).json({ error: "Wallet not found" });
        }

        res.status(200).json({ wallet: user.eWallet });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch wallet details", details: error.message });
    }
};
