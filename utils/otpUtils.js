const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendOTP = async (phoneNumber) => {
  try {
    const verification = await client.verify.v2
      .services(process.env.VERIFY_SERVICE_SID)
      .verifications.create({ to: `+${phoneNumber}`, channel: 'sms' });

    return verification.status; // e.g., "pending"
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    throw new Error('Failed to send OTP');
  }
};

exports.verifyOTP = async (phoneNumber, code) => {
  try {
    const verificationCheck = await client.verify.v2
      .services(process.env.VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: `+${phoneNumber}`, code });

    return verificationCheck.status === 'approved';
  } catch (error) {
    console.error('Error verifying OTP:', error.message);
    return false; // Verification failed
  }
};
