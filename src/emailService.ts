import nodemailer from 'nodemailer';
import type { ContactQuery } from './schema.js';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email templates
const getUserConfirmationEmail = (query: ContactQuery) => ({
  subject: `Thank you for contacting Traveon - Query #${query.id}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0ea5e9, #0284c7); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Traveon</h1>
        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your Travel Partner</p>
      </div>
      
      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1e293b; margin-bottom: 20px;">Thank you for contacting us!</h2>
        
        <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
          Dear ${query.name},
        </p>
        
        <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
          We have received your message and our team will get back to you within 24 hours. 
          Here are the details of your query:
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Query ID:</strong> #${query.id}</p>
          <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${query.subject}</p>
          <p style="margin: 0 0 10px 0;"><strong>Message:</strong></p>
          <p style="margin: 0; color: #64748b; font-style: italic;">${query.message}</p>
        </div>
        
        <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
          If you have any urgent questions, you can also reach us at:
        </p>
        
        <ul style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
          <li>Phone: +91 9540111207, +91 9540111307</li>
          <li>Email: info@traveon.in</li>
          <li>WhatsApp: +91 9540111207</li>
        </ul>
        
        <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
          Best regards,<br>
          The Traveon Team
        </p>
      </div>
      
      <div style="background: #1e293b; padding: 20px; text-align: center;">
        <p style="color: #94a3b8; margin: 0; font-size: 14px;">
          © 2024 Traveon. All rights reserved.<br>
          128, D-Mall, NSP, Delhi-110034
        </p>
      </div>
    </div>
  `
});

const getAdminNotificationEmail = (query: ContactQuery) => ({
  subject: `New Contact Query #${query.id} - ${query.subject}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">New Contact Query</h1>
        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Traveon Admin Notification</p>
      </div>
      
      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1e293b; margin-bottom: 20px;">New Contact Query Received</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Query ID:</strong> #${query.id}</p>
          <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${query.name} (${query.email})</p>
          <p style="margin: 0 0 10px 0;"><strong>Phone:</strong> ${query.phone || 'Not provided'}</p>
          <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${query.subject}</p>
          <p style="margin: 0 0 10px 0;"><strong>Priority:</strong> ${query.priority}</p>
          <p style="margin: 0 0 10px 0;"><strong>Status:</strong> ${query.status}</p>
          <p style="margin: 0 0 10px 0;"><strong>Message:</strong></p>
          <p style="margin: 0; color: #64748b; font-style: italic;">${query.message}</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8;">
            Received on: ${new Date(query.createdAt as Date).toLocaleString('en-IN', { 
              timeZone: 'Asia/Kolkata' 
            })}
          </p>
        </div>
        
        <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
          Please respond to this query within 24 hours to maintain our service standards.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.ADMIN_DASHBOARD_URL || 'http://localhost:5173/admin'}" 
             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View in Admin Dashboard
          </a>
        </div>
      </div>
      
      <div style="background: #1e293b; padding: 20px; text-align: center;">
        <p style="color: #94a3b8; margin: 0; font-size: 14px;">
          © 2024 Traveon. All rights reserved.
        </p>
      </div>
    </div>
  `
});

export class EmailService {
  static async sendUserConfirmation(query: ContactQuery): Promise<void> {
    try {
      const emailContent = getUserConfirmationEmail(query);
      
      await transporter.sendMail({
        from: `"Traveon" <${process.env.SMTP_USER}>`,
        to: query.email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
      
      console.log(`User confirmation email sent to ${query.email} for query #${query.id}`);
    } catch (error) {
      console.error('Error sending user confirmation email:', error);
      throw error;
    }
  }

  static async sendAdminNotification(query: ContactQuery): Promise<void> {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'info@traveon.in';
      const emailContent = getAdminNotificationEmail(query);
      
      await transporter.sendMail({
        from: `"Traveon Contact System" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      });
      
      console.log(`Admin notification email sent to ${adminEmail} for query #${query.id}`);
    } catch (error) {
      console.error('Error sending admin notification email:', error);
      throw error;
    }
  }

  static async sendContactQueryEmails(query: ContactQuery): Promise<void> {
    try {
      // Send emails in parallel
      await Promise.all([
        this.sendUserConfirmation(query),
        this.sendAdminNotification(query)
      ]);
    } catch (error) {
      console.error('Error sending contact query emails:', error);
      throw error;
    }
  }
} 