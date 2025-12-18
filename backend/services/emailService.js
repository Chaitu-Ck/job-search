const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD // Use app-specific password
      }
    });
  }

  async sendApplicationEmail(to, subject, body, resumePath) {
    try {
      const mailOptions = {
        from: `"${process.env.YOUR_NAME}" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: this.formatEmailHTML(body),
        attachments: [
          {
            filename: 'Resume.pdf',
            path: resumePath
          }
        ]
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Email sent successfully to ${to}: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      logger.error('❌ Email sending failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  formatEmailHTML(body) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .signature { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="email-container">
          ${body.replace(/\n/g, '<br>')}
          <div class="signature">
            <p><strong>${process.env.YOUR_NAME}</strong><br>
            ${process.env.YOUR_PHONE || ''}<br>
            ${process.env.YOUR_LINKEDIN || ''}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('✅ Email service connection verified');
      return true;
    } catch (error) {
      logger.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();