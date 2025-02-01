const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// Cloudinary Storage for Profile Pictures (Stored in WorkLah/ProfilePictures)
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "WorkLah/ProfilePictures",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 500, height: 500, crop: "fill" }], // Resize profile pictures
  },
});

// Cloudinary Storage for General Document Uploads (NRIC, FIN, etc.)
const generalStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "WorkLah/Documents",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
  },
});

// Multer Uploads
const uploadProfile = multer({ storage: profileStorage }); // For Profile Picture Upload
const uploadGeneral = multer({ storage: generalStorage }); // For General Documents

module.exports = { uploadProfile, uploadGeneral };
