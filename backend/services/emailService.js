const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT, 10) || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.initialized = true;
      logger.info('Email service initialized');
    } catch (err) {
      logger.error('Failed to initialize email service:', err);
      throw err;
    }
  }

  async testConnection() {
    await this.initialize();
    
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (err) {
      logger.error('Email connection test failed:', err);
      throw err;
    }
  }

  async sendEmail({ to, subject, html, text }) {
    await this.initialize();

    if (!to || !subject || (!html && !text)) {
      throw new Error('Missing required email fields: to, subject, and (html or text)');
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"Job Automation" <${process.env.EMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text,
        html,
      });

      logger.info(`Email sent: ${info.messageId}`, { to, subject });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error('Failed to send email:', err);
      throw err;
    }
  }

  async sendJobApplicationEmail(job, customMessage) {
    const subject = `Application for ${job.title} at ${job.company}`;
    const html = `
      <h2>Job Application</h2>
      <p>Dear Hiring Manager,</p>
      <p>${customMessage || 'I am writing to express my strong interest in this position.'}</p>
      <h3>Job Details:</h3>
      <ul>
        <li><strong>Position:</strong> ${job.title}</li>
        <li><strong>Company:</strong> ${job.company}</li>
        <li><strong>Location:</strong> ${job.location}</li>
      </ul>
      <p>Best regards,<br>${process.env.USER_NAME || 'Applicant'}</p>
    `;

    return this.sendEmail({
      to: job.contactEmail || process.env.EMAIL_USER,
      subject,
      html,
    });
  }
}

module.exports = new EmailService();