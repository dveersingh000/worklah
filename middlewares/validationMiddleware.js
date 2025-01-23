const { check, validationResult } = require('express-validator');

exports.validateUserRegistration = [
  check('fullName').notEmpty().withMessage('Full Name is required'),
  check('phoneNumber').isMobilePhone().withMessage('Valid Phone Number is required'),
  check('email').isEmail().withMessage('Valid Email is required'),
  check('workPassStatus').notEmpty().withMessage('Work Pass Status is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

exports.validateGenerateOTP = [ 
  check('country_code').notEmpty().withMessage('Country Code is required'), 
  check('mobile_number').isMobilePhone().withMessage('Valid Mobile Number is required'), 
  (req, res, next) => { 
    const errors = validationResult(req); 
    if (!errors.isEmpty()) { 
      return res.status(400).json({ errors: errors.array() }); 
    } 
    next(); 
  } 
]; 

exports.validateVerifyOTP = [ 
  check('country_code').notEmpty().withMessage('Country Code is required'), 
  check('mobile_number').isMobilePhone().withMessage('Valid Mobile Number is required'), 
  check('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'), 
  (req, res, next) => { 
    const errors = validationResult(req); 
    if (!errors.isEmpty()) { 
      return res.status(400).json({ errors: errors.array() }); 
    } 
    next(); 
  } 
];
