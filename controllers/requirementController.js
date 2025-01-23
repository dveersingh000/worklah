const Requirement = require('../models/Requirement');

// Fetch all job requirements
exports.getRequirements = async (req, res) => {
  try {
    const { jobId } = req.query; // Optional query param to filter by jobId
    const filter = jobId ? { jobId } : {};
    const requirements = await Requirement.find(filter);
    res.status(200).json(requirements);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching requirements' });
  }
};

// Add a new requirement
exports.addRequirement = async (req, res) => {
  try {
    const newRequirement = new Requirement(req.body);
    await newRequirement.save();
    res.status(201).json(newRequirement);
  } catch (err) {
    res.status(400).json({ message: 'Error adding requirement' });
  }
};

// Update a specific requirement
exports.updateRequirement = async (req, res) => {
  try {
    const updatedRequirement = await Requirement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedRequirement) return res.status(404).json({ message: 'Requirement not found' });
    res.status(200).json(updatedRequirement);
  } catch (err) {
    res.status(400).json({ message: 'Error updating requirement' });
  }
};

// Delete a specific requirement
exports.deleteRequirement = async (req, res) => {
  try {
    const deletedRequirement = await Requirement.findByIdAndDelete(req.params.id);
    if (!deletedRequirement) return res.status(404).json({ message: 'Requirement not found' });
    res.status(200).json({ message: 'Requirement deleted successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Error deleting requirement' });
  }
};
