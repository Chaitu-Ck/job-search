// Dashboard JavaScript for Job Automation System
// Handles job loading, filtering, and user interactions

class JobDashboard {
  constructor() {
    this.jobs = [];
    this.filteredJobs = [];
    this.currentPage = 1;
    this.jobsPerPage = 10;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadJobs();
    this.loadStats();
    this.setupFilters();
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }

    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleFilter(e.target.dataset.filter));
    });

    // Platform filter
    const platformFilter = document.getElementById('platformFilter');
    if (platformFilter) {
      platformFilter.addEventListener('change', (e) => this.handlePlatformFilter(e.target.value));
    }

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => this.handleStatusFilter(e.target.value));
    }

    // Pagination
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.addEventListener('click', () => this.changePage(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.changePage(1));
  }

  async loadJobs() {
    try {
      showLoading();
      const response = await fetch('/api/jobs');
      if (!response.ok) throw new Error('Failed to load jobs');
      
      this.jobs = await response.json();
      this.filteredJobs = [...this.jobs];
      this.renderJobs();
      hideLoading();
    } catch (error) {
      console.error('Error loading jobs:', error);
      showError('Failed to load jobs. Please try again.');
      hideLoading();
    }
  }

  async loadStats() {
    try {
      const response = await fetch('/api/jobs/stats');
      if (!response.ok) throw new Error('Failed to load stats');
      
      const stats = await response.json();
      this.updateStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  updateStats(stats) {
    // Update stat cards with real data
    document.querySelectorAll('.stat-card').forEach(card => {
      const type = card.dataset.type;
      const numberElement = card.querySelector('.number');
      if (numberElement && stats[type] !== undefined) {
        numberElement.textContent = stats[type];
      }
    });
  }

  handleSearch(query) {
    if (!query) {
      this.filteredJobs = [...this.jobs];
    } else {
      const searchTerm = query.toLowerCase();
      this.filteredJobs = this.jobs.filter(job => 
        job.title.toLowerCase().includes(searchTerm) ||
        job.company.toLowerCase().includes(searchTerm) ||
        job.description.toLowerCase().includes(searchTerm)
      );
    }
    this.currentPage = 1;
    this.renderJobs();
  }

  handleFilter(filter) {
    // Remove active class from all buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Add active class to clicked button
    const button = document.querySelector(`[data-filter="${filter}"]`);
    if (button) button.classList.add('active');

    // Apply filter
    switch (filter) {
      case 'all':
        this.filteredJobs = [...this.jobs];
        break;
      case 'pending':
        this.filteredJobs = this.jobs.filter(job => job.status === 'pending');
        break;
      case 'applied':
        this.filteredJobs = this.jobs.filter(job => job.status === 'applied');
        break;
      case 'interview':
        this.filteredJobs = this.jobs.filter(job => job.application?.outcome === 'interview');
        break;
      default:
        this.filteredJobs = [...this.jobs];
    }
    
    this.currentPage = 1;
    this.renderJobs();
  }

  handlePlatformFilter(platform) {
    if (platform === 'all') {
      this.filteredJobs = [...this.jobs];
    } else {
      this.filteredJobs = this.jobs.filter(job => job.platform === platform);
    }
    this.currentPage = 1;
    this.renderJobs();
  }

  handleStatusFilter(status) {
    if (status === 'all') {
      this.filteredJobs = [...this.jobs];
    } else {
      this.filteredJobs = this.jobs.filter(job => job.status === status);
    }
    this.currentPage = 1;
    this.renderJobs();
  }

  renderJobs() {
    const container = document.getElementById('jobsContainer');
    if (!container) return;

    // Calculate pagination
    const startIndex = (this.currentPage - 1) * this.jobsPerPage;
    const endIndex = startIndex + this.jobsPerPage;
    const paginatedJobs = this.filteredJobs.slice(startIndex, endIndex);

    if (paginatedJobs.length === 0) {
      container.innerHTML = '<div class="no-jobs">No jobs found matching your criteria</div>';
      this.updatePagination();
      return;
    }

    container.innerHTML = paginatedJobs.map(job => this.createJobCard(job)).join('');
    
    // Add event listeners to action buttons
    this.setupJobActions();
    
    this.updatePagination();
  }

  createJobCard(job) {
    const postedDate = new Date(job.postedDate || job.createdAt).toLocaleDateString();
    const atsScore = job.aiGenerated?.resume?.atsScore || 'N/A';
    const statusClass = this.getStatusClass(job.status);
    
    return `
      <div class="job-card" data-job-id="${job._id}">
        <div class="job-header">
          <div class="job-title-section">
            <h3>${job.title}</h3>
            <span class="company">${job.company}</span>
            <span class="location">${job.location}</span>
          </div>
          <div class="job-meta">
            <span class="date">Posted: ${postedDate}</span>
            <span class="platform ${job.platform.toLowerCase().replace(/\s+/g, '-')}">${job.platform}</span>
            <span class="status ${statusClass}">${job.status}</span>
          </div>
        </div>
        
        <div class="job-content">
          <div class="job-details">
            <p class="description">${this.truncateText(job.description, 200)}</p>
            ${job.salary ? `<div class="salary">£${job.salary.min || ''} - £${job.salary.max || ''} ${job.salary.period || ''}</div>` : ''}
          </div>
          
          <div class="job-metrics">
            <div class="metric">
              <span class="label">ATS Score:</span>
              <span class="value">${atsScore}%</span>
            </div>
            ${job.quality?.matchScore ? `
            <div class="metric">
              <span class="label">Match:</span>
              <span class="value">${job.quality.matchScore}%</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <div class="job-actions">
          <button class="btn prepare-btn" data-job-id="${job._id}">
            ${job.status === 'resume_generated' ? 'Review' : 'Prepare'}
          </button>
          <button class="btn edit-btn" data-job-id="${job._id}" ${!job.userActions?.resumeEdited && job.status !== 'resume_generated' ? 'disabled' : ''}>
            Edit
          </button>
          <button class="btn apply-btn" data-job-id="${job._id}" ${job.status !== 'resume_generated' && job.status !== 'user_approved' ? 'disabled' : ''}>
            Apply
          </button>
        </div>
      </div>
    `;
  }

  getStatusClass(status) {
    const statusClasses = {
      'pending': 'status-pending',
      'resume_generated': 'status-prepared',
      'user_approved': 'status-approved',
      'applied': 'status-applied',
      'interview': 'status-interview',
      'rejected': 'status-rejected'
    };
    return statusClasses[status] || 'status-default';
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  }

  setupJobActions() {
    // Prepare/Review button
    document.querySelectorAll('.prepare-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const jobId = e.target.dataset.jobId;
        this.prepareJob(jobId);
      });
    });

    // Edit button
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const jobId = e.target.dataset.jobId;
        this.editJob(jobId);
      });
    });

    // Apply button
    document.querySelectorAll('.apply-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const jobId = e.target.dataset.jobId;
        this.applyToJob(jobId);
      });
    });
  }

  async prepareJob(jobId) {
    try {
      showLoading();
      const response = await fetch(`/api/jobs/${jobId}/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to prepare job');
      
      const result = await response.json();
      showSuccess('Job prepared successfully!');
      
      // Reload jobs to update status
      await this.loadJobs();
      
    } catch (error) {
      console.error('Error preparing job:', error);
      showError('Failed to prepare job. Please try again.');
    } finally {
      hideLoading();
    }
  }

  editJob(jobId) {
    // Open modal with job details for editing
    const job = this.jobs.find(j => j._id === jobId);
    if (job) {
      this.openEditModal(job);
    }
  }

  openEditModal(job) {
    // Create and show modal with job editing form
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Edit Job Application</h2>
        <form id="editJobForm">
          <input type="hidden" id="editJobId" value="${job._id}">
          
          <div class="form-group">
            <label for="editResume">Optimized Resume:</label>
            <textarea id="editResume" rows="15">${job.aiGenerated?.resume?.content || ''}</textarea>
          </div>
          
          <div class="form-group">
            <label for="editCoverLetter">Cover Letter:</label>
            <textarea id="editCoverLetter" rows="10">${job.aiGenerated?.email?.body || ''}</textarea>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn cancel-btn">Cancel</button>
            <button type="submit" class="btn save-btn">Save Changes</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const form = modal.querySelector('#editJobForm');
    
    const closeModal = () => {
      document.body.removeChild(modal);
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveJobEdits();
      closeModal();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  async saveJobEdits() {
    try {
      const jobId = document.getElementById('editJobId').value;
      const resumeContent = document.getElementById('editResume').value;
      const coverLetterContent = document.getElementById('editCoverLetter').value;
      
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          'aiGenerated.resume.content': resumeContent,
          'aiGenerated.email.body': coverLetterContent,
          'userActions.resumeEdited': true,
          'userActions.emailEdited': true
        })
      });
      
      if (!response.ok) throw new Error('Failed to save edits');
      
      showSuccess('Changes saved successfully!');
      await this.loadJobs();
      
    } catch (error) {
      console.error('Error saving edits:', error);
      showError('Failed to save changes. Please try again.');
    }
  }

  async applyToJob(jobId) {
    if (!confirm('Are you sure you want to apply to this job?')) {
      return;
    }
    
    try {
      showLoading();
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to apply');
      
      const result = await response.json();
      showSuccess('Application sent successfully!');
      
      // Reload jobs to update status
      await this.loadJobs();
      
    } catch (error) {
      console.error('Error applying to job:', error);
      showError('Failed to send application. Please try again.');
    } finally {
      hideLoading();
    }
  }

  changePage(direction) {
    const newPage = this.currentPage + direction;
    const maxPage = Math.ceil(this.filteredJobs.length / this.jobsPerPage);
    
    if (newPage >= 1 && newPage <= maxPage) {
      this.currentPage = newPage;
      this.renderJobs();
    }
  }

  updatePagination() {
    const totalPages = Math.ceil(this.filteredJobs.length / this.jobsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (pageInfo) {
      pageInfo.textContent = `Page ${this.currentPage} of ${totalPages || 1}`;
    }
    
    if (prevBtn) {
      prevBtn.disabled = this.currentPage === 1;
    }
    
    if (nextBtn) {
      nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;
    }
  }

  setupFilters() {
    // Initialize filter buttons
    const allBtn = document.querySelector('[data-filter="all"]');
    if (allBtn) allBtn.classList.add('active');
  }
}

// Utility functions
function showLoading() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'block';
}

function hideLoading() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
}

function showSuccess(message) {
  const alert = document.createElement('div');
  alert.className = 'alert alert-success';
  alert.textContent = message;
  document.body.appendChild(alert);
  
  setTimeout(() => {
    document.body.removeChild(alert);
  }, 3000);
}

function showError(message) {
  const alert = document.createElement('div');
  alert.className = 'alert alert-error';
  alert.textContent = message;
  document.body.appendChild(alert);
  
  setTimeout(() => {
    document.body.removeChild(alert);
  }, 5000);
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new JobDashboard();
});