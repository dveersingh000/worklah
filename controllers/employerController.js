const Job = require("../models/Job");
const Employer = require("../models/Employer");
const Outlet = require("../models/Outlet");
const mongoose = require("mongoose");
const moment = require("moment");

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

    // ✅ Convert contract dates correctly (Fix JSON.parse issue)
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

    const startDate = parseDate(contractStartDate); // 🔹 Remove JSON.parse()
    const endDate = parseDate(contractEndDate); // 🔹 Remove JSON.parse()

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

    // ✅ Filter & Create Outlets (Ignore empty ones)
    const validOutlets = (Array.isArray(outlets) ? outlets : [])
      .map((outlet) => ({
        outletName: outlet.name?.trim(),
        outletAddress: outlet.address?.trim(),
        outletType: outlet.type?.trim(),
        outletImage: outlet.image || "/static/outletImage.png",
        employer: newEmployer._id,
      }))
      .filter((outlet) => outlet.outletName && outlet.outletAddress && outlet.outletType);

    if (validOutlets.length > 0) {
      const createdOutlets = await Outlet.insertMany(validOutlets);
      newEmployer.outlets = createdOutlets.map((o) => o._id);
      await newEmployer.save();
    }

    return res.status(201).json({ message: "Employer created successfully", employer: newEmployer });
  } catch (error) {
    console.error("Error creating employer:", error);
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
    const employerId = req.params.id;

    // ✅ Fetch Employer Data with Outlets
    const employer = await Employer.findById(employerId)
      .populate("outlets", "outletName outletAddress")
      .lean();

    if (!employer) {
      return res.status(404).json({ message: "Employer not found" });
    }

    // ✅ Fetch Employer's Job Postings
    const jobs = await Job.find({ company: employerId })
      .populate("outlet", "outletName outletAddress")
      .populate("shifts", "startTime startMeridian endTime endMeridian vacancy vacancyFilled standbyVacancy standbyFilled duration breakHours breakType rateType payRate totalWage")
      .lean();

    const formattedJobs = jobs.map((job) => {
      let totalVacancy = 0;
      let totalStandby = 0;
      let totalWage = 0;
      let totalDuration = 0;
      let rateType = "Flat Rate"; // Default

      job.shifts.forEach((shift) => {
        totalVacancy += shift.vacancy;
        totalStandby += shift.standbyVacancy;
        totalWage += shift.totalWage;
        totalDuration += shift.duration;
        rateType = shift.rateType;
      });

      // ✅ Determine Job Status
      const today = moment().startOf("day");
      const jobDate = moment(job.date).startOf("day");

      let jobStatus = "Unknown";
      if (jobDate.isAfter(today)) jobStatus = "Upcoming";
      else if (totalVacancy === 0) jobStatus = "Completed";
      else jobStatus = "Active";

      return {
        jobId: job._id,
        jobName: job.jobName,
        outlet: {
          name: job.outlet?.outletName || "Unknown",
          address: job.outlet?.outletAddress || "Unknown Address",
        },
        date: moment(job.date).format("DD MMM, YY"),
        availableShifts: job.shifts.length,
        vacancyFilled: `${totalVacancy}/${job.shifts.reduce((sum, shift) => sum + shift.vacancy, 0)}`,
        standbyFilled: `${totalStandby}/${job.shifts.reduce((sum, shift) => sum + shift.standbyVacancy, 0)}`,
        breaksIncluded: `${job.shifts[0]?.breakHours} Hrs ${job.shifts[0]?.breakType}`,
        totalDuration: `${totalDuration} Hrs`,
        rateType,
        rate: `$${job.shifts[0]?.payRate}/hr`,
        jobStatus,
        totalWage: `$${totalWage}`,
      };
    });

    // ✅ Response Object
    res.status(200).json({
      success: true,
      employerDetails: {
        employerId: employer._id,
        companyLegalName: employer.companyLegalName,
        companyLogo: employer.companyLogo,
        hqAddress: employer.hqAddress,
        companyNumber: employer.companyNumber,
        contactPerson: {
          name: employer.mainContactPersonName || "Not Available",
          position: employer.mainContactPersonPosition || "Not Available",
          phoneNumber: employer.mainContactPersonNumber || "Not Available",
        },
        industry: employer.industry,
        contract: {
          startDate: moment(employer.contractStartDate).format("DD MMM, YYYY"),
          endDate: moment(employer.contractEndDate).format("DD MMM, YYYY"),
          status: employer.contractStatus,
        },
        serviceAgreement: employer.serviceAgreement,
        accountManager: employer.accountManager,
        jobPostingLimit: employer.jobPostingLimit,
      },
      outletSummary: {
        numberOfOutlets: employer.outlets.length,
        outlets: employer.outlets.map((outlet) => ({
          name: outlet.outletName,
          address: outlet.outletAddress,
        })),
      },
      jobSummary: {
        activeJobs: formattedJobs.filter((job) => job.jobStatus === "Active").length,
        totalJobPostings: formattedJobs.length,
      },
      jobPostings: formattedJobs,
    });
  } catch (error) {
    console.error("Error fetching employer:", error);
    res.status(500).json({ message: "Internal server error", error });
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
