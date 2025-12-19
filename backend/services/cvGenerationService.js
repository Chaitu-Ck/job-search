const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class CVGenerationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.masterCV = null;
  }

  async loadMasterCV() {
    if (this.masterCV) return this.masterCV;

    try {
      const cvPath = path.join(__dirname, '../../data/master_cv.txt');
      this.masterCV = await fs.readFile(cvPath, 'utf-8');
      return this.masterCV;
    } catch (error) {
      logger.error('Failed to load master CV:', error.message);
      return 'Professional with experience in technology and security.';
    }
  }

  async generateTailoredCV(job, existingCV = null) {
    try {
      const masterCV = existingCV || await this.loadMasterCV();

      const prompt = `
You are an expert CV writer and ATS optimization specialist. Create a tailored CV for this specific job.

JOB DETAILS:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description}

MASTER CV:
${masterCV}

REQUIREMENTS:
1. Tailor the CV to highlight relevant skills and experience for this specific job
2. Use keywords from the job description
3. Keep professional formatting
4. Include quantifiable achievements
5. Optimize for ATS (Applicant Tracking Systems)
6. Maximum 500 words

Generate a tailored CV in plain text format:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const tailoredCV = response.text();

      return {
        content: tailoredCV,
        wordCount: tailoredCV.split(/\s+/).length,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('CV generation failed:', error.message);
      throw error;
    }
  }

  async regenerateCV(job, userFeedback, currentCV) {
    try {
      const prompt = `
You are an expert CV writer. Regenerate this CV based on user feedback.

JOB: ${job.title} at ${job.company}

CURRENT CV:
${currentCV}

USER FEEDBACK:
${userFeedback}

Generate an improved CV incorporating the feedback. Keep it professional and ATS-optimized.
Maximum 500 words:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const improvedCV = response.text();

      return {
        content: improvedCV,
        wordCount: improvedCV.split(/\s+/).length,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('CV regeneration failed:', error.message);
      throw error;
    }
  }
}

module.exports = new CVGenerationService();