const User = require('../models/User');
const Profile = require('../models/Profile');

// Get all employees (users with role 'USER')
exports.getAllEmployees = async (req, res) => {
    try {
        const users = await User.find({ role: 'USER' })
            .populate('profileId')
            .select('-password'); // Exclude password field

        // Format response
        const response = users.map(user => ({
            id: user._id,
            fullName: user.fullName,
            avatarUrl: user.profilePicture || '/assets/default-avatar.png',
            gender: user.profileId?.gender || "Not Specified",
            mobile: user.phoneNumber,
            icNumber: user.profileId?.nricNumber || "N/A",
            dob: user.profileId?.dob ? new Date(user.profileId.dob).toLocaleDateString() : "N/A",
            registrationDate: new Date(user.createdAt).toLocaleDateString(),
            turnUpRate: "0%", // This can be calculated based on job history
            workingHours: "0 Hrs", // This can be derived from job applications
            avgAttendRate: "0%", // Placeholder, needs logic
            workPassStatus: user.profileCompleted ? "Verified" : "Pending"
        }));

        res.status(200).json(response);
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * Get a single employee by ID (View Candidate)
 */
exports.getEmployeeById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('profileId')
            .select('-password');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const response = {
            id: user._id,
            fullName: user.fullName,
            avatarUrl: user.profilePicture || '/assets/default-avatar.png',
            gender: user.profileId?.gender || "Not Specified",
            mobile: user.phoneNumber,
            icNumber: user.profileId?.nricNumber || "N/A",
            dob: user.profileId?.dob ? new Date(user.profileId.dob).toLocaleDateString() : "N/A",
            registrationDate: new Date(user.createdAt).toLocaleDateString(),
            turnUpRate: "0%",
            workingHours: "0 Hrs",
            avgAttendRate: "0%",
            workPassStatus: user.profileCompleted ? "Verified" : "Pending",
            email: user.email,
            employmentStatus: user.employmentStatus,
            nationality: user.profileId?.nationality || "N/A",
            eWalletAmount: user.eWallet?.balance || 0
        };

        res.status(200).json(response);
    } catch (error) {
        console.error("Error fetching user details:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * Update employee details (Edit Candidate)
 */
exports.updateEmployee = async (req, res) => {
    try {
        const { fullName, phoneNumber, email, gender, dob, employmentStatus, nationality } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.fullName = fullName || user.fullName;
        user.phoneNumber = phoneNumber || user.phoneNumber;
        user.email = email || user.email;
        user.employmentStatus = employmentStatus || user.employmentStatus;

        await user.save();

        if (user.profileId) {
            await Profile.findByIdAndUpdate(user.profileId, {
                gender: gender || user.profileId.gender,
                dob: dob || user.profileId.dob,
                nationality: nationality || user.profileId.nationality
            });
        }

        res.status(200).json({ message: "Candidate updated successfully" });
    } catch (error) {
        console.error("Error updating employee:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * Block an employee (Block Candidate)
 */
exports.blockEmployee = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.role = 'BLOCKED'; // Change role to BLOCKED or add a status field
        await user.save();

        res.status(200).json({ message: "User has been blocked successfully" });
    } catch (error) {
        console.error("Error blocking user:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};