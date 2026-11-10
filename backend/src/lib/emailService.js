import nodemailer from "nodemailer";

// Create transporter dynamically based on env credentials
const getTransporter = () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Standard Gmail App Password
      },
    });
  }
  return null;
};

/**
 * Sends a premium verification OTP email to the user
 * @param {string} toEmail 
 * @param {string} otp 
 */
export const sendOtpEmail = async (toEmail, otp) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.log("\n========================================================");
    console.log("⚠️ EMAIL CREDENTIALS NOT FOUND IN .env!");
    console.log("To send real emails to Gmail, please add to your .env file:");
    console.log("EMAIL_USER=your-gmail@gmail.com");
    console.log("EMAIL_PASS=your-gmail-app-password");
    console.log(`📨 FALLBACK OTP FOR ${toEmail} IS: ${otp}`);
    console.log("========================================================\n");
    return false;
  }

  const mailOptions = {
    from: `"LawConnect Support" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "LawConnect Account Verification OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 26px; font-weight: bold; letter-spacing: 1px;">LAWCONNECT</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">Connect With Lawyers Instantly</p>
        </div>
        <div style="border-top: 2px solid #2563eb; padding-top: 20px;">
          <p style="font-size: 16px; color: #374151; line-height: 1.5;">Hello,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.5;">Thank you for registering with LawConnect. Please use the following 6-digit One-Time Password (OTP) to verify your email address and finalize your account creation:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #1e3a8a; background-color: #f3f4f6; padding: 12px 24px; border-radius: 8px; border: 1px dashed #2563eb; display: inline-block;">
              ${otp}
            </span>
          </div>
          
          <p style="font-size: 14px; color: #ef4444; font-weight: 500;">Please note: This verification code is valid for exactly 5 minutes. Do not share this OTP with anyone for security purposes.</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">This is an automated verification email. Please do not reply directly to this mail.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📨 Real Gmail OTP sent to ${toEmail} | MessageID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send email via nodemailer SMTP:", error);
    return false;
  }
};
