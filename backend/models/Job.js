const mongoose = require('mongoose');

// MongoDB Schema for job processing pipeline
const JobSchema = new mongoose.Schema({
  // ===== BASIC INFORMATION =====
  jobId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  
  title: {
    type: String,
    required: true,
    index: true
  },
  
  company: {
    type: String,
    required: true,
    index: true
  },
  
  location: {
    type: String,
    required: true
  },
  
  jobType: {
    type: String,
    enum: ['Remote', 'Hybrid', 'On-site', 'Not specified'],
    default: 'Not specified'
  },
  
  salary: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'GBP' },
    period: { type: String, enum: ['per annum', 'per hour', 'per day'] }
  },
  
  // ===== JOB CONTENT =====
  description: {
    type: String,
    required: true,
    text: true // Enable text search
  },
  
  requirements: [String], // Extracted requirements
  
  benefits: [String],
  
  // ===== SOURCE INFORMATION =====
  source: {
    platform: {
      type: String,
      enum: ['LinkedIn', 'Indeed', 'Reed', 'CWJobs', 'CyberSecurityJobs', 'GovUK', 'TotalJobs', 'CompanyCareerPage'],
      required: true
    },
    url: {
      type: String,
      required: true,
      unique: true
    },
    scrapedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  
  postedDate: Date,
  expiryDate: Date,
  
  // ===== PROCESSING STATUS =====
  status: {
    type: String,
    enum: [
      'scraped',           // Just collected
      'validated',         // Passed quality checks
      'keywords_extracted', // AI extracted requirements
      'resume_pending',    // Waiting for CV generation
      'resume_generated',  // CV created
      'email_pending',     // Waiting for email generation
      'email_generated',   // Email created
      'ready_for_review',  // Ready for user review
      'user_approved',     // User approved
      'user_rejected',     // User rejected
      'applying',          // Application in progress
      'applied',           // Successfully applied
      'failed',            // Application failed
      'expired'            // Job expired
    ],
    default: 'scraped',
    index: true
  },
  
  // ===== AI-GENERATED CONTENT =====
  aiGenerated: {
    resume: {
      content: String,
      filePath: String,
      generatedAt: Date,
      wordCount: Number,
      atsScore: Number, // Estimated ATS match %
      keywordsMatched: [String]
    },
    
    email: {
      subject: String,
      body: String,
      generatedAt: Date,
      wordCount: Number,
      tone: String
    },
    
    extractedSkills: [String], // Skills from job description
    matchedSkills: [String],   // Skills from your CV that match
    missingSkills: [String],   // Skills you don't have yet
    
    companyResearch: {
      summary: String,
      industry: String,
      size: String,
      specialization: String
    }
  },
  
  // ===== GENERATED EMAIL =====
  generatedEmail: {
    subject: String,
    body: String,
    generatedAt: Date
  },
  
  // ===== USER INTERACTION =====
  userActions: {
    viewedAt: Date,
    reviewedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    appliedAt: Date,
    
    userNotes: String,
    userRating: {
      type: Number,
      min: 1,
      max: 5
    },
    
    resumeEdited: Boolean,
    emailEdited: Boolean
  },
  
  // ===== APPLICATION TRACKING =====
  application: {
    method: {
      type: String,
      enum: ['email', 'linkedin_easy_apply', 'company_portal', 'external_ats']
    },
    submittedAt: Date,
    confirmationReceived: Boolean,
    responseDate: Date,
    outcome: {
      type: String,
      enum: ['pending', 'interview', 'assessment', 'rejected', 'offer', 'no_response']
    },
    notes: String
  },
  
  // ===== QUALITY METRICS =====
  quality: {
    hasDescription: Boolean,
    hasSalary: Boolean,
    hasRequirements: Boolean,
    isRemote: Boolean,
    isGraduateRole: Boolean,
    matchScore: Number, // Overall match 0-100
    priorityScore: Number // Processing priority
  },
  
  // ===== DEDUPLICATION =====
  jobHash: {
    type: String,
    unique: true,
    index: true
  },
  
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  
  // ===== METADATA =====
  processingAttempts: {
    type: Number,
    default: 0
  },
  
  lastProcessedAt: Date,
  errors: [{
    stage: String,
    message: String,
    timestamp: Date
  }],
  
}, {
  timestamps: true
});

// Indexes for performance
JobSchema.index({ status: 1, 'quality.matchScore': -1 });
JobSchema.index({ 'source.scrapedAt': -1 });
JobSchema.index({ company: 1, title: 1 });
JobSchema.index({ 'quality.priorityScore': -1 });

module.exports = mongoose.model('Job', JobSchema);