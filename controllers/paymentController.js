const Payment = require('../models/Payment');

exports.getPayments = async (req, res) => {
  try {
    const { status, startDate, endDate, rateType, page = 1, limit = 10 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (startDate && endDate) filters.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    if (rateType) filters.rateType = rateType;

    const payments = await Payment.find(filters)
      .populate('worker employer job')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Payment.countDocuments(filters);

    res.status(200).json({ payments, total });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payments', error });
  }
};

exports.createPayment = async (req, res) => {
  try {
    const payment = new Payment(req.body);
    await payment.save();
    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ message: 'Error creating payment', error });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedPayment = await Payment.findByIdAndUpdate(id, { status }, { new: true });
    if (!updatedPayment) return res.status(404).json({ message: 'Payment not found' });

    res.status(200).json(updatedPayment);
  } catch (error) {
    res.status(400).json({ message: 'Error updating payment status', error });
  }
};
