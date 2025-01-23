const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

dotenv.config();

const app = express();

// Import Routes
const userRouter = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const jobRoutes = require('./routes/jobRoutes'); 
const shiftRoutes = require('./routes/shiftRoutes');
const homeRoutes = require('./routes/homeRoutes');
const workerRoutes = require('./routes/workerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const walletRoutes = require('./routes/walletRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const employerRoutes = require('./routes/employerRoutes');
const qrRoutes = require('./routes/qrRoutes');
const requirementRoutes = require('./routes/requirementRoutes');
const penaltyRoutes = require('./routes/penaltyRoutes');
const outletRoutes = require('./routes/outletRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const profileRoutes = require('./routes/profileRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const cancellationRoutes = require('./routes/cancellationRoutes');

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',  
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,  // Allow cookies with requests
}));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static Files
app.use('/static', express.static('public'));

// Routes
app.use("/api/user", userRouter);
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/shifts", shiftRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/employers', employerRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/penalties', penaltyRoutes);
app.use('/api/outlets', outletRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/cancellation', cancellationRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGOOSE_URI_STRING, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
    // Start the server after successful DB connection
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server is running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
