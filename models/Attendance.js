const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true }, // Links to application
    date: { type: Date, required: true },
    
    clockInTime: { type: Date },
    clockOutTime: { type: Date },
    
    checkInLocation: { 
        latitude: { type: Number },
        longitude: { type: Number },
    },

    checkOutLocation: { 
        latitude: { type: Number },
        longitude: { type: Number },
    },

    status: { type: String, enum: ['Clocked In', 'Clocked Out', 'Missed', 'Late', 'Left Early'], default: 'Clocked In' },

    // Optional fields for admin approvals & penalties
    isLate: { type: Boolean, default: false }, 
    isEarlyLeave: { type: Boolean, default: false },
    penalty: { type: Number, default: 0 }, 

}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
