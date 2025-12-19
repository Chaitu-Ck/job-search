const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class EmailGenerationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateEmail(job, cvContent) {
    try {
      const prompt = `
You are a professional email writer. Create a compelling job application email.

JOB DETAILS:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}

MY QUALIFICATIONS (from CV):
${cvContent?.substring(0, 300)}

REQUIREMENTS:
1. Professional and enthusiastic tone
2. Highlight 2-3 key qualifications
3. Show genuine interest in the company
4. Include strong call to action
5. Keep it concise (150-200 words)

Generate:
1. Email subject line
2. Email body

Format as:
SUBJECT: [subject line]

BODY:
[email body]`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const emailText = response.text();

      const subjectMatch = emailText.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
      const bodyMatch = emailText.match(/BODY:\s*([\s\S]+)/i);

      const subject = subjectMatch 
        ? subjectMatch[1].trim() 
        : `Application for ${job.title} Position`;
      
      const body = bodyMatch 
        ? bodyMatch[1].trim() 
        : `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${job.company}.

Best regards`;

      return {
        subject,
        body,
        wordCount: body.split(/\s+/).length,
        tone: 'professional',
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Email generation failed:', error.message);
      throw error;
    }
  }

  async regenerateEmail(job, userFeedback, currentEmail) {
    try {
      const prompt = `
Regenerate this job application email based on user feedback.

JOB: ${job.title} at ${job.company}

CURRENT EMAIL:
Subject: ${currentEmail.subject}
Body: ${currentEmail.body}

USER FEEDBACK:
${userFeedback}

Generate an improved email. Keep it professional and concise (150-200 words).

Format as:
SUBJECT: [subject line]

BODY:
[email body]`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const emailText = response.text();

      const subjectMatch = emailText.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
      const bodyMatch = emailText.match(/BODY:\s*([\s\S]+)/i);

      return {
        subject: subjectMatch ? subjectMatch[1].trim() : currentEmail.subject,
        body: bodyMatch ? bodyMatch[1].trim() : currentEmail.body,
        wordCount: bodyMatch ? bodyMatch[1].trim().split(/\s+/).length : 0,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Email regeneration failed:', error.message);
      throw error;
    }
  }
}

module.exports = new EmailGenerationService();