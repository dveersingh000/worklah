const BookMark = require('../models/bookmarkModel');
const Job = require('../models/Job');

exports.addBookMark = async (req, res) => {
  try {
    const { jobId, userId } = req.body;

    if (!jobId || !userId) {
      return res.status(400).json({ success: false, message: "Missing jobId or userId" });
    }

    let bookmark = await BookMark.findOne({ jobId, userId });

    if (bookmark) {
      bookmark.status = !bookmark.status; // Toggle status
      await bookmark.save();
      return res.status(200).json({
        success: true,
        message: "Bookmark updated successfully",
        bookmarkStatus: bookmark.status, // ✅ Send bookmark status for UI
      });
    }

    // Create new bookmark if it doesn't exist
    const newBookmark = new BookMark({ jobId, userId, status: true });
    await newBookmark.save();

    return res.status(201).json({
      success: true,
      message: "Bookmark created successfully",
      bookmarkStatus: newBookmark.status, // ✅ Send status for UI update
    });

  } catch (error) {
    console.error("❌ Error adding bookmark:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};



exports.getBookMarks = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "Missing userId" });
    }

    // Fetch active bookmarked jobs (`status: true`) with required fields
    const bookmarks = await BookMark.find({ userId, status: true }).populate({
      path: "jobId",
      populate: [
        { path: "company", select: "companyLegalName companyLogo" },
        { path: "outlet", select: "outletName outletAddress" },
        { path: "shifts" }
      ],
    });

    // Format response similar to `getAllJobs`
    const formattedBookmarks = bookmarks.map((bookmark) => {
      const job = bookmark.jobId;
      if (!job) return null; // Skip invalid bookmarks

      const shifts = job.shifts || [];
      let outletTiming = "Not Available";
      let estimatedWage = 0;
      let payRatePerHour = "Not Available";
      let slotLabel = "New";

      if (shifts.length > 0) {
        const firstShift = shifts[0];
        outletTiming = `${firstShift.startTime}${firstShift.startMeridian} - ${firstShift.endTime}${firstShift.endMeridian}`;
        estimatedWage = shifts.reduce((sum, shift) => sum + shift.totalWage, 0);
        payRatePerHour = `$${firstShift.payRate}/Hr`;

        const totalVacancies = shifts.reduce((sum, shift) => sum + shift.vacancy, 0);
        const totalStandby = shifts.reduce((sum, shift) => sum + shift.standbyVacancy, 0);

        if (totalVacancies >= 10) {
          slotLabel = "Trending";
        } else if (totalVacancies > 3) {
          slotLabel = "Limited Slots";
        } else if (totalVacancies === 1) {
          slotLabel = "Last Slot";
        } else if (totalVacancies === 0 && totalStandby > 0) {
          slotLabel = "Standby Slot Available";
        }
      }

      return {
        bookmarkId: bookmark._id,
        jobId: job._id,
        jobName: job.jobName,
        outletName: job.outlet?.outletName || "Unknown",
        outletImage: job.outletImage || "/default-image.png",
        estimatedWage,
        payRatePerHour,
        location: job.outlet?.outletAddress || "Location not available",
        outletTiming,
        slotLabel,
        bookmarkedAt: bookmark.createdAt,
      };
    }).filter(Boolean); // Remove null values if any

    return res.status(200).json({
      success: true,
      message: "Bookmarks fetched successfully",
      bookmarks: formattedBookmarks,
    });

  } catch (error) {
    console.error("❌ Error fetching bookmarks:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

