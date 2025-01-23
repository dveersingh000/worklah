const Withdrawal = require('../models/Withdrawal');

exports.getWithdrawals = async (req, res) => {
  try {
    const { type, startDate, endDate, page = 1, limit = 10 } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (startDate && endDate) filters.date = { $gte: new Date(startDate), $lte: new Date(endDate) };

    const withdrawals = await Withdrawal.find(filters)
      .populate('worker')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Withdrawal.countDocuments(filters);

    res.status(200).json({ withdrawals, total });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching withdrawals', error });
  }
};

exports.createWithdrawal = async (req, res) => {
  try {
    const withdrawal = new Withdrawal(req.body);
    await withdrawal.save();
    res.status(201).json(withdrawal);
  } catch (error) {
    res.status(400).json({ message: 'Error creating withdrawal', error });
  }
};
