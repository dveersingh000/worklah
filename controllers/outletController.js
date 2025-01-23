const Outlet = require('../models/Outlet');
const Employer = require('../models/Employer');
// const Job = require('../models/Job');

// Fetch all outlets
exports.createOutlet = async (req, res) => {
  try {
    const outlet = new Outlet(req.body);
    await outlet.save();

    await Employer.findByIdAndUpdate(outlet.employer, {
      $push: { outlets: outlet._id },
    });

    res.status(201).json(outlet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllOutlets = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Default values for pagination
    const outlets = await Outlet.find()
      .populate('employer')
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Outlet.countDocuments();

    res.status(200).json({
      data: outlets,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOutletById = async (req, res) => {
  try {
    const outlet = await Outlet.findById(req.params.id).populate('employer');
    if (!outlet) {
      return res.status(404).json({ message: 'Outlet not found' });
    }
    res.status(200).json(outlet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOutlet = async (req, res) => {
  try {
    const outlet = await Outlet.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!outlet) {
      return res.status(404).json({ message: 'Outlet not found' });
    }
    res.status(200).json(outlet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteOutlet = async (req, res) => {
  try {
    const outlet = await Outlet.findByIdAndDelete(req.params.id);
    if (!outlet) {
      return res.status(404).json({ message: 'Outlet not found' });
    }
    res.status(200).json({ message: 'Outlet deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};