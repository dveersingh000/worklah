const Employer = require("../models/Employer");
const Outlet = require("../models/Outlet");
const Job = require("../models/Job");
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
    // ✅ Fetch employer details with outlets
    const employer = await Employer.findById(req.params.id).populate("outlets");

    if (!employer) {
      return res.status(404).json({ message: "Employer not found" });
    }

    // ✅ Fetch jobs associated with this employer
    const jobs = await Job.find({ company: employer._id }).populate("shifts", "vacancy date");

    // ✅ Count active jobs
    const today = moment().startOf("day");
    const activeJobPostings = jobs.filter((job) => {
      const jobDate = moment(job.date).startOf("day");
      const totalVacancy = job.shifts.reduce((sum, shift) => sum + shift.vacancy, 0);
      return jobDate.isSameOrAfter(today) && totalVacancy > 0; // ✅ Active Jobs
    }).length;

    // ✅ Count number of outlets
    const numberOfOutlets = employer.outlets.length;

    res.status(200).json({
      employer,
      activeJobPostings, // ✅ Fixed Active Job Postings Count
      numberOfOutlets, // ✅ Number of Outlets Count
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
