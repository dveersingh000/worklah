const { check, validationResult } = require('express-validator');

exports.validateUser = [
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
