const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const errorRecovery = require('../utils/errorRecovery');

class EmailGenerationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async generateCustomEmail(jobData, resumeData) {
    try {
      const prompt = `Create a professional, compelling job application email for the following position:

**Job Details:**
- Position: ${jobData.title}
- Company: ${jobData.company}
- Description: ${jobData.description}

**Candidate Profile:**
- Skills: ${resumeData.skills.join(', ')}
- Experience: ${resumeData.experience}
- Education: ${resumeData.education}

**Requirements:**
1. Express genuine interest in the role
2. Highlight 2-3 relevant skills that match the job description
3. Show enthusiasm for the company
4. Keep it concise (150-200 words)
5. Professional but personable tone
6. Include a strong call to action

Generate ONLY the email body (no subject line, no signature).`;

      const result = await errorRecovery.retryWithBackoff(async () => {
        const response = await this.model.generateContent(prompt);
        return response.response.text().trim();
      }, 3, 2000);

      logger.info(`✅ Generated custom email for ${jobData.title} at ${jobData.company}`);
      return result;

    } catch (error) {
      logger.error('Email generation failed:', error);
      
      // Fallback template
      return this.getFallbackEmail(jobData, resumeData);
    }
  }

  getFallbackEmail(jobData, resumeData) {
    return `Dear Hiring Manager,

I am writing to express my strong interest in the ${jobData.title} position at ${jobData.company}. With my background in ${resumeData.skills[0]} and ${resumeData.skills[1]}, I am confident I can contribute effectively to your team.

My experience in ${resumeData.experience} aligns well with your requirements, and I am particularly excited about the opportunity to work with your organization.

I would welcome the opportunity to discuss how my skills and experience can benefit ${jobData.company}. Thank you for considering my application.

Best regards`;
  }

  async generateSubject(jobData) {
    return `Application for ${jobData.title} Position - ${jobData.company}`;
  }
}

module.exports = new EmailGenerationService();