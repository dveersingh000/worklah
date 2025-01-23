const Worker = require('../models/Worker');

// Get all workers
exports.getWorkers = async (req, res) => {
  try {
    const { status, city, minJobs, maxJobs, minRate, maxRate, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (city) filter.city = city;
    if (minJobs || maxJobs) filter['jobHistory.totalJobs'] = { $gte: minJobs || 0, $lte: maxJobs || Infinity };
    if (minRate || maxRate) filter.avgAttendanceRate = { $gte: minRate || 0, $lte: maxRate || 100 };

    const workers = await Worker.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Worker.countDocuments(filter);

    res.status(200).json({ workers, total });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workers', error });
  }
};

// Get worker profile by ID
exports.getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id).populate('jobHistory.job');
    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    res.status(200).json(worker);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching worker profile', error });
  }
};

// Add/Edit worker
exports.addOrUpdateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const worker = id
      ? await Worker.findByIdAndUpdate(id, req.body, { new: true })
      : new Worker(req.body);

    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    await worker.save();
    res.status(201).json(worker);
  } catch (error) {
    res.status(400).json({ message: 'Error saving worker', error });
  }
};

// Delete worker (mark as inactive)
exports.deleteWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const worker = await Worker.findByIdAndUpdate(id, { status: 'Inactive' }, { new: true });
    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    res.status(200).json({ message: 'Worker deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting worker', error });
  }
};

// Update work pass status
exports.updateWorkPassStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const worker = await Worker.findByIdAndUpdate(id, { status }, { new: true });
    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    res.status(200).json(worker);
  } catch (error) {
    res.status(400).json({ message: 'Error updating work pass status', error });
  }
};
