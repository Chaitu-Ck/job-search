const Job = require('../models/Job');
const emailGenerationService = require('./emailGenerationService');
const emailService = require('./emailService');
const logger = require('../utils/logger');
const fs = require('fs').promises;

class ApplicationService {
  constructor() {
    // Path to master CV file
    this.masterCVPath = './data/master_cv.txt';
  }

  async processJobWithEmail(jobId) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error('Job not found');

    try {
      // 1. Load master CV (placeholder implementation)
      let masterCVText = 'Sample CV content';
      try {
        masterCVText = await fs.readFile(this.masterCVPath, 'utf-8');
      } catch (err) {
        logger.warn('Master CV not found, using placeholder');
      }
      
      // 2. Optimize CV for this job (placeholder)
      const optimizedCV = `Optimized CV for ${job.title} at ${job.company}\n\n${masterCVText}`;
      
      // 3. Generate CV PDF path (placeholder)
      const cvResult = {
        pdfPath: `./data/cv_${jobId}.pdf`
      };
      
      // 4. Load user profile for email (placeholder)
      const userProfile = {
        skills: ['Cybersecurity', 'Network Security', 'Incident Response'],
        experience: '2 years in cybersecurity operations',
        education: 'BSc Computer Science'
      };
      
      // 5. Generate custom email
      const emailBody = await emailGenerationService.generateCustomEmail(
        {
          title: job.title,
          company: job.company,
          description: job.description
        },
        userProfile
      );
      
      // 6. Generate email subject
      const subject = await emailGenerationService.generateSubject(job);
      
      // 7. Save generated content to job
      job.aiGenerated = job.aiGenerated || {};
      job.aiGenerated.email = {
        subject: subject,
        body: emailBody,
        generatedAt: new Date()
      };
      job.status = 'ready_for_review';
      await job.save();
      
      logger.info(`✅ Job prepared for application: ${job.title} at ${job.company}`);
      
      return {
        job,
        emailSubject: subject,
        emailBody: emailBody,
        cvPath: cvResult.pdfPath
      };
      
    } catch (error) {
      logger.error('Job processing failed:', error);
      job.status = 'failed';
      job.errors = job.errors || [];
      job.errors.push({
        stage: 'application_preparation',
        message: error.message,
        timestamp: new Date()
      });
      await job.save();
      throw error;
    }
  }

  async applyWithEmail(jobId) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error('Job not found');
    
    if (job.status !== 'ready_for_review') {
      throw new Error('Job not ready for application');
    }

    // For this example, we'll simulate email application
    // In a real implementation, you would determine the application method
    return await this.applyViaEmail(job);
  }

  async applyViaEmail(job) {
    try {
      // In a real implementation, you would have the actual CV file path
      const cvPath = `./data/cv_${job._id}.pdf`;
      
      // Create a placeholder CV file for demonstration
      await fs.writeFile(cvPath, `CV for ${job.title} at ${job.company}`, 'utf-8');
      
      const result = await emailService.sendApplicationEmail(
        'jobs@example.com', // Placeholder email
        job.aiGenerated.email.subject,
        job.aiGenerated.email.body,
        cvPath
      );
      
      if (result.success) {
        job.application = job.application || {};
        job.application.method = 'email';
        job.application.submittedAt = new Date();
        job.status = 'applied';
        job.userActions = job.userActions || {};
        job.userActions.appliedAt = new Date();
        await job.save();
        
        logger.info(`✅ Email application sent for ${job.title} at ${job.company}`);
        return { success: true, job };
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      logger.error('Email application failed:', error);
      job.status = 'failed';
      job.errors = job.errors || [];
      job.errors.push({
        stage: 'email_application',
        message: error.message,
        timestamp: new Date()
      });
      await job.save();
      throw error;
    }
  }
}

module.exports = new ApplicationService();