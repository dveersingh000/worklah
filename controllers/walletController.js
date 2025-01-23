const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { v4: uuidv4 } = require('uuid');

// Get Wallet Balance
exports.getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found.' });
    }

    res.status(200).json({ balance: wallet.balance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wallet balance.', details: error.message });
  }
};

// Get Transaction History
exports.getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({ transactions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions.', details: error.message });
  }
};

// Cashout
exports.cashout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, bankName, bankAccount } = req.body;

    // Validate wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance.' });
    }

    // Create a transaction
    const transaction = new Transaction({
      userId,
      type: 'Cashout',
      amount,
      transactionId: uuidv4(),
      details: {
        bankName,
        bankAccount,
        cashoutFee: 0.6, // Example fixed fee
      },
      status: 'Pending',
    });

    // Deduct from wallet balance
    wallet.balance -= amount;
    await wallet.save();

    // Save transaction
    await transaction.save();

    res.status(201).json({ message: 'Cashout initiated.', transaction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process cashout.', details: error.message });
  }
};
