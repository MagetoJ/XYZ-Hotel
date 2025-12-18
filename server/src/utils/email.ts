import nodemailer from 'nodemailer';
import config from '../config/environment';

// Email transporter setup
export const emailTransporter = nodemailer.createTransport({
  host: config.EMAIL.HOST,
  port: config.EMAIL.PORT,
  secure: config.EMAIL.SECURE,
  auth: {
    user: config.EMAIL.USER,
    pass: config.EMAIL.PASSWORD
  },
  tls: {
    rejectUnauthorized: false // For development only
  }
});

// Generate 6-digit numeric code
export const generateResetCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send password reset email
export const sendResetEmail = async (email: string, code: string, name: string): Promise<boolean> => {
  try {
    const mailOptions = {
      from: config.EMAIL.FROM,
      to: email,
      subject: 'Password Reset Code - Maria Havens POS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f59e0b; margin: 0;">Maria Havens POS</h1>
            <p style="color: #666; margin: 5px 0;">Point of Sale System</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #555;">Hello ${name},</p>
            <p style="color: #555;">You requested a password reset for your Maria Havens POS account.</p>
            <p style="color: #555;">Your password reset code is:</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #f59e0b; background-color: #fff; padding: 15px 20px; border-radius: 8px; border: 2px solid #f59e0b; letter-spacing: 3px;">${code}</span>
            </div>
            
            <p style="color: #555;">This code will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #555;">If you didn't request this reset, please ignore this email.</p>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 14px;">
            <p>© 2024 Maria Havens POS System</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      `
    };

    await emailTransporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};