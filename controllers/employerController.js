const Employer = require("../models/Employer");
const Outlet = require("../models/Outlet");
const Job = require("../models/Job");
const Shift = require("../models/Shift");
const Application = require("../models/Application");
const moment = require("moment");

const axios = require("axios");
const mongoose = require("mongoose");

const LOCATIONIQ_API_KEY = "pk.04f99e466cd9f4007216522f8fc3c5b9"; // ✅ Replace with actual API key

// Fetch Latitude & Longitude from Address
async function getCoordinates(address) {
    try {
        const url = `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(address)}&format=json`;
        const response = await axios.get(url);

        if (response.data.length > 0) {
            return {
                latitude: parseFloat(response.data[0].lat),
                longitude: parseFloat(response.data[0].lon),
            };
        } else {
            console.error(`❌ No location found for address: ${address}`);
            return null;
        }
    } catch (error) {
        console.error(`❌ LocationIQ API Error for address: ${address}`, error.message);
        return null;
    }
}

// ✅ Create Employer API (Optimized)
exports.createEmployer = async (req, res) => {
    try {
        const {
            companyLegalName,
            hqAddress,
            companyNumber,
            companyEmail,
            mainContactPersonName,
            mainContactPersonPosition,
            mainContactPersonNumber,
            accountManager,
            industry,
            contractStartDate,
            contractEndDate,
            contractStatus,
            outlets,
        } = req.body;

        // ✅ Check if employer already exists
        const existingEmployer = await Employer.findOne({ companyEmail });
        if (existingEmployer) {
            return res.status(400).json({ message: "Employer with this email already exists" });
        }

        // ✅ Convert contract dates correctly
        const parseDate = (dateObj) => {
            if (!dateObj || !dateObj.day || !dateObj.month || !dateObj.year) return null;
            const monthMap = {
                January: "01", February: "02", March: "03", April: "04",
                May: "05", June: "06", July: "07", August: "08",
                September: "09", October: "10", November: "11", December: "12",
            };
            const month = monthMap[dateObj.month];
            return new Date(`${dateObj.year}-${month}-${dateObj.day}`);
        };

        const startDate = parseDate(contractStartDate);
        const endDate = parseDate(contractEndDate);

        if (!startDate || !endDate || isNaN(startDate) || isNaN(endDate)) {
            return res.status(400).json({ message: "Invalid contract dates provided" });
        }

        // ✅ Check if an image is uploaded; if not, use the default one
        const companyLogoUrl = req.file?.path || "/static/companyLogo.png";

        // ✅ Create Employer
        const newEmployer = new Employer({
            companyLogo: companyLogoUrl,
            companyLegalName,
            hqAddress,
            companyNumber,
            companyEmail,
            mainContactPersonName,
            mainContactPersonPosition,
            mainContactPersonNumber,
            accountManager,
            industry,
            contractStartDate: startDate,
            contractEndDate: endDate,
            contractStatus,
        });

        await newEmployer.save();

        // ✅ Process Outlets (Only valid ones)
        let validOutlets = (Array.isArray(outlets) ? outlets : [])
            .map((outlet) => ({
                outletName: outlet.name?.trim(),
                outletAddress: outlet.address?.trim(),
                outletType: outlet.type?.trim(),
                outletImage: outlet.image || "/static/outletImage.png",
                employer: newEmployer._id,
            }))
            .filter((outlet) => outlet.outletName && outlet.outletAddress && outlet.outletType);

        if (validOutlets.length > 0) {
            // ✅ Fetch geolocation for all outlets in parallel
            const locationPromises = validOutlets.map((outlet) => getCoordinates(outlet.outletAddress));
            const locations = await Promise.all(locationPromises);

            // ✅ Add geolocation data only to outlets that have valid coordinates
            validOutlets = validOutlets
                .map((outlet, index) => {
                    if (locations[index]) {
                        return {
                            ...outlet,
                            latitude: locations[index].latitude,
                            longitude: locations[index].longitude,
                        };
                    } else {
                        console.warn(`⚠️ Skipping outlet due to invalid location: ${outlet.outletAddress}`);
                        return null;
                    }
                })
                .filter(Boolean); // Remove `null` values (outlets without valid locations)

            // ✅ Store valid outlets in the database
            if (validOutlets.length > 0) {
                const createdOutlets = await Outlet.insertMany(validOutlets);
                newEmployer.outlets = createdOutlets.map((o) => o._id);
                await newEmployer.save();
            }
        }

        return res.status(201).json({ message: "Employer created successfully", employer: newEmployer });
    } catch (error) {
        console.error("❌ Error creating employer:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
};



// ✅ Get all employers
exports.getEmployers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const employers = await Employer.find()
      .populate("outlets") // Ensure outlets are populated
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(parseInt(limit));

    const totalEmployers = await Employer.countDocuments();

    res.status(200).json({
      employers,
      totalPages: Math.ceil(totalEmployers / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching employers:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};


// ✅ Get employer by ID


exports.getEmployerById = async (req, res) => {
  try {
    const employer = await Employer.findById(req.params.id).populate("outlets");

    if (!employer) {
      return res.status(404).json({ message: "Employer not found" });
    }

    // ✅ Fetch jobs with outlet and shift details
    const jobs = await Job.find({ company: employer._id })
      .populate("outlet", "outletName outletAddress")
      .populate("shifts");

    const today = moment().startOf("day");
    let activeJobPostings = 0;

    const formattedJobs = jobs.map((job) => {
      const totalAvailableShifts = job.shifts.length;

      // ✅ Determine if job is "active"
      const jobDate = moment(job.date).startOf("day");
      const totalVacancy = job.shifts.reduce((sum, shift) => sum + shift.vacancy, 0);

      if (jobDate.isSameOrAfter(today) && totalVacancy > 0) {
        activeJobPostings++;
      }

      const shiftSummary = job.shifts.map((shift) => ({
        startTime: shift.startTime,
        startMeridian: shift.startMeridian,
        endTime: shift.endTime,
        endMeridian: shift.endMeridian,
        breakHours: shift.breakHours,
        breakType: shift.breakType,
        rateType: shift.rateType,
        payRate: shift.payRate,
        totalWage: shift.totalWage,
        duration: shift.duration,
        vacancy: shift.vacancy,
        vacancyFilled: shift.vacancyFilled || 0,
        standbyVacancy: shift.standbyVacancy,
        standbyFilled: shift.standbyFilled || 0,
      }));

      return {
        _id: job._id,
        jobName: job.jobName,
        jobStatus: jobDate.isBefore(today) ? "Completed" : "Upcoming",
        jobIcon: job.jobIcon || "/static/jobIcon.png",
        address: job.outlet?.outletAddress || "N/A",
        outletName: job.outlet?.outletName || "N/A",
        date: moment(job.date).format("DD MMM, YY"),
        shifts: shiftSummary,
      };
    });

    return res.status(200).json({
      employer,
      activeJobPostings,
      numberOfOutlets: employer.outlets.length,
      jobs: formattedJobs,
    });
  } catch (error) {
    console.error("Error fetching employer:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

exports.getOutletOverview = async (req, res) => {
  try {
    const { outletId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(outletId)) {
      return res.status(400).json({ message: "Invalid outlet ID" });
    }

    const outlet = await Outlet.findById(outletId).populate("employer", "companyLegalName").lean();
    if (!outlet) return res.status(404).json({ message: "Outlet not found" });

    // Fetch jobs related to this outlet
    const jobs = await Job.find({ outlet: outletId })
      .populate("shifts")
      .lean();

    const totalJobsPosted = jobs.length;

    let activeJobs = 0;
    let attendanceSum = 0;
    let noShowCount = 0;
    let totalShifts = 0;
    const roleFrequency = {};

    const jobList = [];

    for (const job of jobs) {
      const jobDate = moment(job.date).startOf("day");
      const today = moment().startOf("day");

      const shifts = job.shifts || [];
      const shiftCount = shifts.length;

      let totalDuration = 0;
      let totalVacancy = 0;
      let filledVacancy = 0;
      let standbyFilled = 0;
      let totalWage = 0;

      for (const shift of shifts) {
        totalDuration += shift.duration || 0;
        totalVacancy += shift.vacancy || 0;
        filledVacancy += shift.vacancyFilled || 0;
        standbyFilled += shift.standbyFilled || 0;
        totalWage += shift.totalWage || 0;

        const attendanceRate = (shift.vacancyFilled / (shift.vacancy || 1)) * 100;
        attendanceSum += attendanceRate;
        totalShifts++;

        if (attendanceRate < 50) noShowCount++;
      }

      // Count active job
      if (jobDate.isSameOrAfter(today) && totalVacancy > 0) activeJobs++;

      // Count top roles
      roleFrequency[job.jobName] = (roleFrequency[job.jobName] || 0) + 1;

      // Push job details for the table
      jobList.push({
        jobId: job._id,
        jobName: job.jobName,
        jobStatus: job.jobStatus || (jobDate.isBefore(today) ? "Completed" : "Active"),
        date: moment(job.date).format("DD MMM, YY"),
        shifts: shiftCount,
        totalDuration: `${totalDuration} Hrs`,
        break: shifts[0]?.breakHours ? `${shifts[0].breakHours} Hrs (${shifts[0].breakType})` : "N/A",
        rate: shifts[0]?.payRate ? `$${shifts[0].payRate}/hr` : "N/A",
        rateType: shifts[0]?.rateType || "N/A",
        vacancyFilled: `${filledVacancy}/${totalVacancy}`,
        standbyFilled,
        totalPay: `$${totalWage}`,
      });
    }

    // Top 3 most frequent job roles
    const topRoles = Object.entries(roleFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    const avgAttendance = totalShifts > 0 ? (attendanceSum / totalShifts).toFixed(2) : 0;
    const noShowRate = totalShifts > 0 ? ((noShowCount / totalShifts) * 100).toFixed(2) : 0;

    return res.status(200).json({
      outletDetails: {
        name: outlet.outletName,
        address: outlet.outletAddress,
        contact: "+65 1234 5678", // Placeholder
        email: "dominos@gmail.com", // Placeholder
        employer: outlet.employer?.companyLegalName,
      },
      stats: {
        totalJobsPosted,
        activeJobs,
        averageAttendanceRate: `${avgAttendance}%`,
        noShowRate: `${noShowRate}%`,
        topRolesPosted: topRoles
      },
      jobs: jobList,
    });
  } catch (error) {
    console.error("Error in getOutletOverview:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
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
