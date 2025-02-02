const Outlet = require("../models/Outlet");
const Job = require("../models/Job");
const Application = require("../models/Application");
const mongoose = require("mongoose");
const moment = require("moment");

exports.getOutletAttendance = async (req, res) => {
  try {
    const { id } = req.params; // Outlet ID

    // ✅ Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Outlet ID" });
    }

    // ✅ Fetch Outlet Details
    const outlet = await Outlet.findById(id).populate("employer", "companyName").lean();
    if (!outlet) return res.status(404).json({ message: "Outlet not found" });

    // ✅ Fetch Jobs associated with this outlet
    const jobs = await Job.find({ outlet: id }).populate("employer", "companyName").lean();

    // ✅ Fetch all applications related to these jobs
    const jobIds = jobs.map(job => job._id);
    const applications = await Application.find({ jobId: { $in: jobIds } }).lean();

    // ✅ Calculate Attendance Metrics
    let totalJobsPosted = jobs.length;
    let shiftsFullyAttended = 0;
    let shiftsPartiallyAttended = 0;
    let shiftsLeastAttended = 0;
    let noShowRate = 0;
    let totalAttendance = 0;
    let totalShifts = 0;
    let standbyEffectiveness = 0;

    jobs.forEach(job => {
      job.dates.forEach(date => {
        date.shifts.forEach(shift => {
          totalShifts++;
          const filledVacancy = shift.filledVacancies || 0;
          const totalVacancy = shift.vacancy || 1; // Prevent division by zero

          const attendanceRate = (filledVacancy / totalVacancy) * 100;
          totalAttendance += attendanceRate;

          if (attendanceRate >= 80) shiftsFullyAttended++;
          else if (attendanceRate >= 50) shiftsPartiallyAttended++;
          else shiftsLeastAttended++;

          if (shift.standbyFilled > 0) standbyEffectiveness++;
        });
      });
    });

    const overallAttendanceRate = totalShifts > 0 ? (totalAttendance / totalShifts).toFixed(2) : 0;
    standbyEffectiveness = totalShifts > 0 ? ((standbyEffectiveness / totalShifts) * 100).toFixed(2) : 0;
    noShowRate = totalShifts > 0 ? ((shiftsLeastAttended / totalShifts) * 100).toFixed(2) : 0;

    // ✅ Monthly Attendance Analytics
    let monthlyData = {};
    applications.forEach(app => {
      const month = moment(app.date).format("MMM");
      if (!monthlyData[month]) {
        monthlyData[month] = { total: 0, attended: 0 };
      }
      monthlyData[month].total++;
      if (app.status === "Completed") {
        monthlyData[month].attended++;
      }
    });

    const monthlyAttendance = Object.keys(monthlyData).map(month => ({
      month,
      attendance: ((monthlyData[month].attended / monthlyData[month].total) * 100).toFixed(2) || 0
    }));

    // ✅ Job-wise Attendance Table
    const jobAttendanceTable = jobs.map(job => ({
      jobName: job.jobName,
      jobStatus: job.jobStatus,
      shifts: job.dates.flatMap(date =>
        date.shifts.map(shift => ({
          shiftTime: `${shift.startTime} - ${shift.endTime}`,
          vacancyFilled: `${shift.filledVacancies}/${shift.vacancy}`,
          standbyFilled: `${shift.standbyFilled}/${shift.standbyVacancy}`,
          totalApplied: applications.filter(app => app.jobId.toString() === job._id.toString()).length,
          date: moment(date.date).format("DD MMM, YYYY")
        }))
      )
    }));

    res.status(200).json({
      success: true,
      outlet: {
        name: outlet.outletName,
        address: outlet.location,
        contact: "+65 1234 3543", // Dummy value
        email: "dominos@gmail.com", // Dummy value
        employer: outlet.employer.companyName
      },
      attendanceMetrics: {
        totalJobsPosted,
        shiftsFullyAttended: `${((shiftsFullyAttended / totalShifts) * 100).toFixed(2)}%`,
        shiftsPartiallyAttended: `${((shiftsPartiallyAttended / totalShifts) * 100).toFixed(2)}%`,
        shiftsLeastAttended: `${((shiftsLeastAttended / totalShifts) * 100).toFixed(2)}%`,
        overallAttendanceRate: `${overallAttendanceRate}%`,
        noShowRate: `${noShowRate}%`,
        standbyEffectiveness: `${standbyEffectiveness}%`
      },
      monthlyAttendance,
      jobAttendanceTable
    });
  } catch (error) {
    console.error("Error in getOutletAttendance:", error);
    res.status(500).json({ error: "Failed to fetch outlet attendance details", details: error.message });
  }
};
