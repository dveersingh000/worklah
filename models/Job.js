const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobName: { type: String, required: true },
  subtitle: { type: String, default: 'Food Dynasty (United Square)' },
  subtitleIcon: { type: String, default: '/static/subTitleIcon.png' },
  jobIcon: { type: String, default: '/static/jobIcon.png' },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true },
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: "Outlet", required: true },
  dates: [
    {
      date: { type: Date, required: true },
      shifts: [
        {
          startTime: { type: String, required: true },
          endTime: { type: String, required: true },
          vacancy: { type: Number, required: true },
          standbyVacancy: { type: Number, required: true },
          filledVacancies: { type: Number, default: 0 }, // Track vacancies filled
          standbyFilled: { type: Number, default: 0 }, // Track standby filled
          duration: { type: Number },
          breakHours: { type: Number, default: 0 },
          breakType: { type: String, enum: ["Paid", "Unpaid"], default: "Paid" },
          rateType: { type: String, enum: ["Flat rate", "Hourly rate"], required: true },
          payRate: { type: Number, required: true },
          totalWage: { type: Number },
          qrCode: { type: String },
          checkIns: [{ type: mongoose.Schema.Types.ObjectId, ref: "Application" }],
        },
      ],
    },
  ],
  location: { type: String, required: true },
  locationCoordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  requirements: {
    jobScopeDescription: { type: [String], required: true },
    jobRequirements: { type: [String], required: true },
  },
  postedDate: { type: Date, default: Date.now },
  jobStatus: { type: String, enum: ['Active', 'Completed', 'Cancelled', "Upcoming"], default: 'Active' },
  // appliedStatus: { type: Boolean, default: false },
});

module.exports = mongoose.model('Job', jobSchema);
