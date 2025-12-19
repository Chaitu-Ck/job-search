const logger = require('../utils/logger');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class AIService {
  async optimizeResume(currentContent, job) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `Optimize this resume for ATS (Applicant Tracking System) compatibility and the specific job:

Job Title: ${job.title}
Company: ${job.company}
Job Description: ${job.description?.substring(0, 500)}

Current Resume:
${currentContent}

Requirements:
1. Improve ATS keyword matching
2. Highlight relevant experience
3. Use action verbs
4. Quantify achievements where possible
5. Maintain professional formatting
6. Keep similar length

Return optimized resume content only (no JSON, no explanations).`;

      const result = await model.generateContent(prompt);
      const optimizedContent = result.response.text().trim();
      
      // Calculate ATS score
      const atsScore = this.calculateATSScore(optimizedContent, job);
      
      return {
        content: optimizedContent,
        atsScore
      };
    } catch (error) {
      logger.error('Resume optimization error:', error);
      return {
        content: currentContent,
        atsScore: job.aiGenerated?.resume?.atsScore || 65
      };
    }
  }

  async optimizeEmail(currentContent, job) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `Optimize this cover email for a job application:

Job Title: ${job.title}
Company: ${job.company}

Current Email:
${currentContent}

Requirements:
1. Make it more compelling and specific
2. Add relevant keywords from job description
3. Show enthusiasm and fit
4. Keep professional tone
5. Stay under 250 words

Generate optimized email with subject and body.
Format as JSON: { "subject": "...", "body": "..." }`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          subject: parsed.subject || `Application for ${job.title} Position`,
          body: parsed.body || currentContent
        };
      }
      
      return {
        subject: `Application for ${job.title} Position at ${job.company}`,
        body: currentContent
      };
    } catch (error) {
      logger.error('Email optimization error:', error);
      return {
        subject: `Application for ${job.title} Position at ${job.company}`,
        body: currentContent
      };
    }
  }

  calculateATSScore(content, job) {
    let score = 60; // Base score
    
    const contentLower = content.toLowerCase();
    const titleLower = job.title.toLowerCase();
    const descLower = (job.description || '').toLowerCase();
    
    // Check for job title keywords
    const titleWords = titleLower.split(' ').filter(w => w.length > 3);
    const titleMatches = titleWords.filter(word => contentLower.includes(word)).length;
    score += (titleMatches / titleWords.length) * 15;
    
    // Check for common tech keywords
    const keywords = ['experience', 'skills', 'project', 'developed', 'implemented', 
                     'managed', 'led', 'team', 'agile', 'software'];
    const keywordMatches = keywords.filter(kw => contentLower.includes(kw)).length;
    score += (keywordMatches / keywords.length) * 15;
    
    // Check length (optimal 400-800 words)
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 400 && wordCount <= 800) score += 10;
    else if (wordCount >= 300 && wordCount <= 1000) score += 5;
    
    return Math.min(Math.round(score), 99);
  }
}

module.exports = new AIService();