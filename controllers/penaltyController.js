const Penalty = require('../models/Penalty');

// Fetch all penalty rules
exports.getPenalties = async (req, res) => {
  try {
    const penalties = await Penalty.find();
    res.status(200).json(penalties);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching penalties' });
  }
};

// Add a new penalty
exports.addPenalty = async (req, res) => {
  try {
    const newPenalty = new Penalty(req.body);
    await newPenalty.save();
    res.status(201).json(newPenalty);
  } catch (err) {
    res.status(400).json({ message: 'Error adding penalty' });
  }
};

// Update a specific penalty
exports.updatePenalty = async (req, res) => {
  try {
    const updatedPenalty = await Penalty.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedPenalty) return res.status(404).json({ message: 'Penalty not found' });
    res.status(200).json(updatedPenalty);
  } catch (err) {
    res.status(400).json({ message: 'Error updating penalty' });
  }
};

// Delete a specific penalty
exports.deletePenalty = async (req, res) => {
  try {
    const deletedPenalty = await Penalty.findByIdAndDelete(req.params.id);
    if (!deletedPenalty) return res.status(404).json({ message: 'Penalty not found' });
    res.status(200).json({ message: 'Penalty deleted successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Error deleting penalty' });
  }
};
