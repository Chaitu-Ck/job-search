/**
 * Company Career Pages Configuration
 * High-value UK cybersecurity employers
 */

const COMPANY_CAREER_PAGES = {
  // Tech Giants
  amazon: {
    name: 'Amazon',
    careers_url: 'https://www.amazon.jobs',
    search_endpoint: 'https://www.amazon.jobs/en/search.json',
    filters: {
      category: ['security', 'information-technology'],
      location: ['United Kingdom'],
      job_level: ['Entry Level', 'Mid-Level']
    },
    scraping_method: 'api',
    priority: 'high',
    roles: ['Security Operations Analyst', 'Security Engineer', 'SOC Analyst']
  },

  google: {
    name: 'Google',
    careers_url: 'https://careers.google.com/jobs/results/',
    filters: {
      category: 'DATA_CENTER_OPERATIONS,TECHNICAL_INFRASTRUCTURE_ENGINEERING',
      location: 'United Kingdom',
      experience_level: 'ENTRY_LEVEL'
    },
    scraping_method: 'api',
    priority: 'high',
    roles: ['Security Engineer', 'Network Security Engineer']
  },

  microsoft: {
    name: 'Microsoft',
    careers_url: 'https://careers.microsoft.com/professionals/us/en/search-results',
    filters: {
      'job-category': 'Cybersecurity',
      country: 'United Kingdom',
      'experience-level': 'Individual Contributor'
    },
    scraping_method: 'api',
    priority: 'high',
    roles: ['Security Analyst', 'Cybersecurity Analyst']
  },

  // Financial Services
  jpmorgan: {
    name: 'JPMorgan Chase',
    careers_url: 'https://careers.jpmorgan.com/global/en/home',
    search_url: 'https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001',
    filters: {
      categories: 'Cybersecurity & Technology Risk',
      locations: 'United Kingdom',
      experience_level: 'Entry-Level'
    },
    scraping_method: 'browser',
    priority: 'high',
    roles: ['Cyber Security Analyst', 'Technology Risk Analyst']
  },

  hsbc: {
    name: 'HSBC',
    careers_url: 'https://www.hsbc.com/careers/students-and-graduates',
    search_url: 'https://hsbc.taleo.net/careersection/ex/jobsearch.ftl',
    filters: {
      category: 'Technology & Cyber Security',
      location: 'United Kingdom'
    },
    scraping_method: 'browser',
    priority: 'high',
    roles: ['Cyber Security Analyst', 'Security Operations Analyst']
  },

  barclays: {
    name: 'Barclays',
    careers_url: 'https://search.jobs.barclays/search-jobs',
    filters: {
      category: 'Technology',
      sub_category: 'Cyber Security',
      location: 'United Kingdom'
    },
    scraping_method: 'api',
    priority: 'high',
    roles: ['Cyber Security Analyst', 'SOC Analyst']
  },

  // Consulting & Professional Services
  deloitte: {
    name: 'Deloitte UK',
    careers_url: 'https://www2.deloitte.com/uk/en/pages/careers/articles/student-and-graduate-opportunities.html',
    search_url: 'https://jobsearch.deloitte.com/jobs',
    filters: {
      business: 'Cyber',
      location: 'United Kingdom'
    },
    scraping_method: 'api',
    priority: 'high',
    roles: ['Cyber Security Analyst', 'Cyber Consultant']
  },

  pwc: {
    name: 'PwC UK',
    careers_url: 'https://www.pwc.co.uk/careers/student-careers.html',
    search_url: 'https://jobs.pwc.com/job-search-results/',
    filters: {
      category: 'Technology',
      sub_category: 'Cyber Security',
      location: 'United Kingdom'
    },
    scraping_method: 'browser',
    priority: 'high',
    roles: ['Cyber Security Associate', 'Security Analyst']
  },

  accenture: {
    name: 'Accenture UK',
    careers_url: 'https://www.accenture.com/gb-en/careers',
    search_url: 'https://www.accenture.com/gb-en/careers/jobsearch',
    filters: {
      specialization: 'Cybersecurity',
      location: 'United Kingdom',
      career_level: 'Entry Level'
    },
    scraping_method: 'api',
    priority: 'high',
    roles: ['Cybersecurity Analyst', 'Security Operations Analyst']
  },

  // Defense & Government Contractors
  bae_systems: {
    name: 'BAE Systems',
    careers_url: 'https://www.baesystems.com/en/careers/careers-in-the-uk',
    search_url: 'https://baesystems.wd3.myworkdayjobs.com/en-US/BAE_Systems_External_Career_Site',
    filters: {
      function: 'Cyber Security',
      location: 'United Kingdom'
    },
    scraping_method: 'browser',
    priority: 'high',
    requires_clearance: true,
    roles: ['Cyber Security Analyst', 'Security Operations Analyst']
  },

  // Cybersecurity Specialists
  ncc_group: {
    name: 'NCC Group',
    careers_url: 'https://www.nccgroupplc.com/careers/',
    search_url: 'https://www.nccgroupplc.com/careers/current-vacancies/',
    filters: {
      location: 'United Kingdom'
    },
    scraping_method: 'browser',
    priority: 'high',
    roles: ['Security Consultant', 'Penetration Tester', 'SOC Analyst']
  },

  darktrace: {
    name: 'Darktrace',
    careers_url: 'https://careers.darktrace.com/',
    filters: {
      department: 'Security Operations',
      location: 'UK'
    },
    scraping_method: 'browser',
    priority: 'medium',
    roles: ['SOC Analyst', 'Security Analyst']
  },

  // Telecommunications
  bt: {
    name: 'BT Group (British Telecom)',
    careers_url: 'https://www.bt.com/careers',
    search_url: 'https://bt.taleo.net/careersection/ex_professional/jobsearch.ftl',
    filters: {
      category: 'Security',
      location: 'United Kingdom'
    },
    scraping_method: 'browser',
    priority: 'high',
    roles: ['Cyber Security Analyst', 'Security Operations Analyst']
  },

  // UK Government & Public Sector
  gchq: {
    name: 'GCHQ',
    careers_url: 'https://www.gchq-careers.co.uk/early-careers.html',
    filters: {
      role_type: 'Technology',
      specialism: 'Cyber Security'
    },
    scraping_method: 'browser',
    priority: 'high',
    requires_clearance: true,
    roles: ['Cyber Security Analyst', 'Intelligence Analyst']
  },

  ncsc: {
    name: 'National Cyber Security Centre (NCSC)',
    careers_url: 'https://www.ncsc.gov.uk/section/careers',
    parent_org: 'GCHQ',
    scraping_method: 'browser',
    priority: 'high',
    requires_clearance: true
  }
};

// Enhanced search keywords
const SEARCH_KEYWORDS = [
  // Your specified terms
  'SOC Analyst',
  'Security Analyst',
  'Junior Penetration Tester',
  'Linux Administrator',
  'Cybersecurity Analyst',
  
  // Additional high-match terms
  'Security Operations Analyst',
  'Cyber Security Graduate',
  'Junior Security Engineer',
  'Security Analyst Graduate',
  'Cyber Threat Analyst',
  'Information Security Analyst',
  'Security Monitoring Analyst',
  'IT Security Analyst',
  'Cyber Defence Analyst',
  'Security Incident Response',
  'Junior SOC Analyst',
  'Threat Intelligence Analyst',
  'Vulnerability Analyst',
  'Cloud Security Analyst',
  'Network Security Analyst'
];

module.exports = {
  COMPANY_CAREER_PAGES,
  SEARCH_KEYWORDS
};