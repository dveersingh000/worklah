const mongoose = require("mongoose");

const EmployerSchema = new mongoose.Schema(
  {
    companyLogo: { type: String, default: '/static/companyLogo.png' },
    companyLegalName: { type: String, required: true },
    hqAddress: { type: String, required: true },
    companyNumber: { type: String, unique: true },
    companyEmail: { type: String, required: true, unique: true },
    mainContactPersonName: { type: String },
    mainContactPersonPosition: { type: String },
    mainContactPersonNumber: { type: String },
    uploadCertificate: { type: String },
    accountManager: { type: String },
    industry: { type: String, enum: ["Retail", "Hospitality", "IT", "Healthcare"] },
    contractStartDate: { type: Date },
    contractEndDate: { type: Date },
    contractStatus: { type: String, enum: ["Active", "In Discussion", "Expired"], default: "In Discussion" },
    serviceAgreement: { type: String, enum: ["Completed", "Pending"], default: "Pending" }, // ✅ New Field
    jobPostingLimit: { type: Number, default: 50 }, // ✅ New Field
    outlets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Outlet" }],
    createdAt: { type: Date, default: Date.now },
  });

module.exports = mongoose.model("Employer", EmployerSchema);


// exports.getJobById = async (req, res) => {
//   try {
//     const userId = req.user.id;
//         const user = await User.findById(userId);
//     const { jobId } = req.params;

//     // Fetch job details
//     const job = await Job.findById(req.params.id)
//       .populate("company", "companyLegalName companyLogo")
//       .populate("outlet", "outletName outletAddress")
//       .populate("shifts");

//     if (!job) {
//       return res.status(404).json({ message: "Job not found" });
//     }

//     // Process shifts for display
//     const shifts = job.shifts.map((shift) => ({
//       _id: shift._id,
//       job: shift.job,
//       startTime: shift.startTime,
//       startMeridian: shift.startMeridian,
//       endTime: shift.endTime,
//       endMeridian: shift.endMeridian,
//       vacancy: shift.vacancy,
//       standbyVacancy: shift.standbyVacancy,
//       duration: shift.duration,
//       breakHours: shift.breakHours,
//       breakType: shift.breakType,
//       rateType: shift.rateType,
//       payRate: shift.payRate,
//       totalWage: shift.totalWage,
//       appliedSlots: 0, // Placeholder for applied slots (can be updated later)
//       availableSlots: shift.vacancy, // Remaining available slots
//     }));

//     // Generate job scope and requirements list
//     const jobScopeList = job.jobScope || [];
//     const jobRequirementsList = job.jobRequirements || [];

//     // Determine slot labels based on vacancies
//     let slotLabel = "New";
//     const totalVacancies = shifts.reduce((sum, shift) => sum + shift.vacancy, 0);
//     const totalStandby = shifts.reduce((sum, shift) => sum + shift.standbyVacancy, 0);

//     if (totalVacancies >= 10) {
//       slotLabel = "Trending";
//     } else if (totalVacancies > 3) {
//       slotLabel = "Limited Slots";
//     } else if (totalVacancies === 1) {
//       slotLabel = "Last Slot";
//     } else if (totalVacancies === 0 && totalStandby > 0) {
//       slotLabel = "Standby Slot Available";
//     }

//     // Prepare response object
//     const jobDetails = {
//       _id: job._id,
//       jobName: job.jobName,
//       jobIcon: job.jobIcon || "/static/jobIcon.png",
//       industry: job.industry,
//       slotLabel,
//       company: {
//         _id: job.company._id,
//         companyLegalName: job.company.companyLegalName,
//         companyLogo: job.company.companyLogo,
//       },
//       outlet: {
//         _id: job.outlet._id,
//         outletName: job.outlet.outletName,
//         outletAddress: job.outlet.outletAddress,
//         outletImage: job.outletImage || "/static/outletImage.png",
//       },
//       date: job.date.toISOString().split("T")[0],
//       location: job.location,
//       shortAddress: job.shortAddress || "Not Available",
//       outletTiming: shifts.length > 0 ? `${shifts[0].startTime} ${shifts[0].startMeridian} - ${shifts[0].endTime} ${shifts[0].endMeridian}` : "Not Available",
//       estimatedWage: shifts.reduce((sum, shift) => sum + shift.totalWage, 0),
//       payRatePerHour: shifts.length > 0 ? `$${shifts[0].payRate}/Hr` : "Not Available",
//       shifts: shifts,
//       jobScope: jobScopeList,
//       jobRequirements: jobRequirementsList,
//       employerDetails: {
//         companyLegalName: job.company.companyLegalName,
//         companyLogo: job.company.companyLogo,
//         jobId: `ID${job._id.toString().slice(-6)}`,
//         jobCategory: "Cleaning", // Placeholder (can be dynamic)
//         jobDates: `${new Date().toLocaleDateString()} | ${new Date().toLocaleDateString()}`,
//         jobLocation: job.location,
//       },
//       warnings: [
//         {
//           title: "No-show Penalty",
//           description: "Failing to show up after being activated from standby will result in a $20 penalty.",
//         },
//         {
//           title: "Booking Fee",
//           description: "A $10 fee will be charged after shift completion for standby booking.",
//         },
//         {
//           title: "Standby Conditions",
//           description: "If you book another shift that overlaps with this standby slot, your standby reservation will be forfeited.",
//         },
//       ],
//     };

//     return res.status(200).json({ jobDetails });
//   } catch (error) {
//     console.error("Error fetching job details:", error);
//     return res.status(500).json({ message: "Internal server error", error });
//   }
// };
