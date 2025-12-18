const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    unique: true,
    required: [true, 'Job ID is required'],
    index: true,
    trim: true,
  },
  
  title: {
    type: String,
    required: [true, 'Job title is required'],
    index: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  
  company: {
    type: String,
    required: [true, 'Company name is required'],
    index: true,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
  },
  
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
  },
  
  jobType: {
    type: String,
    enum: {
      values: ['Remote', 'Hybrid', 'On-site', 'Not specified'],
      message: '{VALUE} is not a valid job type',
    },
    default: 'Not specified',
  },
  
  salary: {
    min: {
      type: Number,
      min: [0, 'Salary cannot be negative'],
    },
    max: {
      type: Number,
      min: [0, 'Salary cannot be negative'],
      validate: {
        validator: function(value) {
          return !this.salary?.min || value >= this.salary.min;
        },
        message: 'Max salary must be greater than min salary',
      },
    },
    currency: { 
      type: String, 
      default: 'GBP',
      enum: ['GBP', 'USD', 'EUR'],
    },
    period: { 
      type: String, 
      enum: ['per annum', 'per hour', 'per day'],
    },
  },
  
  description: {
    type: String,
    required: [true, 'Job description is required'],
    text: true,
    maxlength: [10000, 'Description cannot exceed 10000 characters'],
  },
  
  requirements: [{
    type: String,
    trim: true,
  }],
  
  benefits: [{
    type: String,
    trim: true,
  }],
  
  source: {
    platform: {
      type: String,
      enum: {
        values: ['LinkedIn', 'Indeed', 'Reed', 'CWJobs', 'CyberSecurityJobs', 'GovUK', 'TotalJobs', 'StudentCircus', 'CompanyCareerPage'],
        message: '{VALUE} is not a valid platform',
      },
      required: [true, 'Source platform is required'],
    },
    url: {
      type: String,
      required: [true, 'Source URL is required'],
      unique: true,
      validate: {
        validator: function(url) {
          return /^https?:\/\/.+/.test(url);
        },
        message: 'Invalid URL format',
      },
    },
    scrapedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  
  postedDate: {
    type: Date,
    index: true,
  },
  
  expiryDate: {
    type: Date,
    index: true,
  },
  
  status: {
    type: String,
    enum: {
      values: [
        'scraped',
        'validated',
        'keywords_extracted',
        'resume_pending',
        'resume_generated',
        'email_pending',
        'email_generated',
        'ready_for_review',
        'user_approved',
        'user_rejected',
        'applying',
        'applied',
        'failed',
        'expired'
      ],
      message: '{VALUE} is not a valid status',
    },
    default: 'scraped',
    index: true,
  },
  
  aiGenerated: {
    resume: {
      content: String,
      filePath: String,
      generatedAt: Date,
      wordCount: {
        type: Number,
        min: 0,
      },
      atsScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      keywordsMatched: [String],
    },
    
    email: {
      subject: {
        type: String,
        maxlength: 200,
      },
      body: String,
      generatedAt: Date,
      wordCount: {
        type: Number,
        min: 0,
      },
      tone: String,
    },
    
    extractedSkills: [String],
    matchedSkills: [String],
    missingSkills: [String],
    
    companyResearch: {
      summary: String,
      industry: String,
      size: String,
      specialization: String,
    },
  },
  
  generatedEmail: {
    subject: String,
    body: String,
    generatedAt: Date,
  },
  
  userActions: {
    viewedAt: Date,
    reviewedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    appliedAt: Date,
    userNotes: {
      type: String,
      maxlength: 1000,
    },
    userRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    resumeEdited: {
      type: Boolean,
      default: false,
    },
    emailEdited: {
      type: Boolean,
      default: false,
    },
  },
  
  application: {
    method: {
      type: String,
      enum: ['email', 'linkedin_easy_apply', 'company_portal', 'external_ats'],
    },
    submittedAt: Date,
    confirmationReceived: {
      type: Boolean,
      default: false,
    },
    responseDate: Date,
    outcome: {
      type: String,
      enum: ['pending', 'interview', 'assessment', 'rejected', 'offer', 'no_response'],
      default: 'pending',
    },
    notes: String,
  },
  
  quality: {
    hasDescription: Boolean,
    hasSalary: {
      type: Boolean,
      default: false,
    },
    hasRequirements: {
      type: Boolean,
      default: false,
    },
    isRemote: {
      type: Boolean,
      default: false,
    },
    isGraduateRole: {
      type: Boolean,
      default: false,
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    priorityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  
  jobHash: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
  },
  
  processingAttempts: {
    type: Number,
    default: 0,
    max: 10,
  },
  
  lastProcessedAt: Date,
  
  errorLogs: [{
    stage: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

JobSchema.virtual('isExpired').get(function() {
  return this.expiryDate && this.expiryDate < new Date();
});

JobSchema.virtual('daysOld').get(function() {
  if (!this.postedDate) return null;
  return Math.floor((Date.now() - this.postedDate.getTime()) / (1000 * 60 * 60 * 24));
});

JobSchema.index({ status: 1, 'quality.matchScore': -1 });
JobSchema.index({ 'source.scrapedAt': -1 });
JobSchema.index({ company: 1, title: 1 });
JobSchema.index({ 'quality.priorityScore': -1 });
JobSchema.index({ createdAt: -1 });
JobSchema.index({ 'source.platform': 1, status: 1 });

JobSchema.pre('save', function(next) {
  if (this.isModified('description')) {
    this.quality.hasDescription = Boolean(this.description);
  }
  if (this.isModified('salary')) {
    this.quality.hasSalary = Boolean(this.salary?.min || this.salary?.max);
  }
  if (this.isModified('requirements')) {
    this.quality.hasRequirements = this.requirements && this.requirements.length > 0;
  }
  next();
});

JobSchema.methods.markAsProcessed = function(stage) {
  this.lastProcessedAt = new Date();
  this.processingAttempts += 1;
  return this.save();
};

JobSchema.methods.addError = function(stage, message) {
  this.errorLogs.push({ stage, message });
  if (this.errorLogs.length > 20) {
    this.errorLogs = this.errorLogs.slice(-20);
  }
  return this.save();
};

JobSchema.statics.findFreshJobs = function(platform, hours = 24) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    'source.platform': platform,
    'source.scrapedAt': { $gte: cutoffDate },
    status: { $nin: ['expired', 'user_rejected'] },
  }).sort({ 'source.scrapedAt': -1 });
};

module.exports = mongoose.model('Job', JobSchema);