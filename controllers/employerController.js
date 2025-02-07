const Employer = require('../models/Employer');
// const Job = require('../models/Job');
// const Outlet = require('../models/Outlet');

// Get all employers
exports.createEmployer = async (req, res) => {
  try {
    const employer = new Employer(req.body);
    await employer.save();
    res.status(201).json(employer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllEmployers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Default values for pagination
    const employers = await Employer.find()
      .populate('outlets')
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Employer.countDocuments();

    res.status(200).json({
      data: employers,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEmployerById = async (req, res) => {
  try {
    const employer = await Employer.findById(req.params.id).populate('outlets');
    if (!employer) {
      return res.status(404).json({ message: 'Employer not found' });
    }
    res.status(200).json(employer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateEmployer = async (req, res) => {
  try {
    const employer = await Employer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!employer) {
      return res.status(404).json({ message: 'Employer not found' });
    }
    res.status(200).json(employer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteEmployer = async (req, res) => {
  try {
    const employer = await Employer.findByIdAndDelete(req.params.id);
    if (!employer) {
      return res.status(404).json({ message: 'Employer not found' });
    }
    res.status(200).json({ message: 'Employer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
