const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');

class ATSService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.masterCV = null;
  }

  async loadMasterCV() {
    if (this.masterCV) return this.masterCV;

    try {
      const cvPath = path.join(__dirname, '../../data/master-cv.docx');
      const result = await mammoth.extractRawText({path: cvPath});
      this.masterCV = result.value;
      logger.info('✅ Master CV (DOCX) loaded');
      return this.masterCV;
    } catch (error) {
      logger.error('Failed to load master CV (DOCX):', error.message);
      // Fallback to default text
      this.masterCV = 'Cybersecurity professional with experience in network security, threat analysis, and incident response.';
      return this.masterCV;
    }
  }

  async calculateATSScore(job) {
    try {
      const cv = await this.loadMasterCV();

      const prompt = `
You are an ATS (Applicant Tracking System) analyzer. Analyze the compatibility between this CV and job posting.

JOB TITLE: ${job.title}
COMPANY: ${job.company}
LOCATION: ${job.location}
DESCRIPTION: ${job.description}

MY CV:
${cv}

Provide:
1. ATS Compatibility Score (0-100)
2. Matched Skills (list)
3. Missing Skills (list)
4. Key Recommendations

Format response as JSON:
{
  "atsScore": 85,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3"],
  "recommendations": ["rec1", "rec2"]
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('No JSON found in AI response, using fallback score');
        return this.generateFallbackScore(job, cv);
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      return {
        atsScore: Math.min(100, Math.max(0, analysis.atsScore || 75)),
        matchedSkills: analysis.matchedSkills || [],
        missingSkills: analysis.missingSkills || [],
        recommendations: analysis.recommendations || []
      };

    } catch (error) {
      logger.error('ATS score calculation failed:', error.message);
      return this.generateFallbackScore(job, await this.loadMasterCV());
    }
  }

  generateFallbackScore(job, cv) {
    const cvLower = cv.toLowerCase();
    const descLower = (job.description || '').toLowerCase();
    
    const keywords = ['security', 'cyber', 'network', 'threat', 'analysis', 'monitoring', 'incident', 'soc', 'siem', 'firewall'];
    
    let matchCount = 0;
    const matched = [];
    const missing = [];

    keywords.forEach(keyword => {
      const inCV = cvLower.includes(keyword);
      const inJob = descLower.includes(keyword);
      
      if (inCV && inJob) {
        matchCount++;
        matched.push(keyword);
      } else if (inJob && !inCV) {
        missing.push(keyword);
      }
    });

    const score = Math.min(95, 60 + (matchCount * 5));

    return {
      atsScore: score,
      matchedSkills: matched,
      missingSkills: missing,
      recommendations: [
        'Tailor resume to highlight relevant experience',
        'Include specific technical skills from job description',
        'Quantify achievements with metrics'
      ]
    };
  }

  async processJobBatch(jobs) {
    const results = [];
    
    for (const job of jobs) {
      try {
        const analysis = await this.calculateATSScore(job);
        results.push({
          jobId: job._id,
          ...analysis
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(`Failed to process job ${job._id}:`, error.message);
      }
    }

    return results;
  }
}

module.exports = new ATSService();