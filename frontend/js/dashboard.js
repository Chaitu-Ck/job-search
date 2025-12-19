class JobDashboard {
  constructor() {
    this.jobs = [];
    this.filters = { status: 'all', platform: 'all', search: '' };
    this.init();
  }

  async init() {
    const container = document.getElementById('jobs-container');
    container.innerHTML = '<p style="text-align:center;color:#64748b;padding:40px;">Loading jobs...</p>';
    
    try {
      await this.loadJobs();
      await this.loadStats();
      this.setupEventListeners();
      this.renderJobs();
    } catch (error) {
      console.error('Initialization failed:', error);
      container.innerHTML = `<p style="text-align:center;color:#ef4444;padding:40px;">Failed to load dashboard: ${error.message}</p>`;
    }
  }

  async loadJobs() {
    try {
      console.log('Fetching jobs from /api/jobs...');
      const response = await fetch('/api/jobs?limit=100');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      this.jobs = data.jobs || [];
      console.log(`Loaded ${this.jobs.length} jobs`);
      
      if (this.jobs.length === 0) {
        console.warn('No jobs found in database');
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
      throw error;
    }
  }

  async loadStats() {
    try {
      console.log('Fetching stats from /api/stats...');
      const response = await fetch('/api/stats');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Stats Response:', data);
      
      const stats = data.stats;
      
      document.getElementById('total-jobs').textContent = stats.total || 0;
      document.getElementById('pending-jobs').textContent = stats.byStatus?.scraped || 0;
      document.getElementById('ready-jobs').textContent = stats.byStatus?.ready_for_review || 0;
      document.getElementById('applied-jobs').textContent = stats.byStatus?.applied || 0;
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  setupEventListeners() {
    const filterStatus = document.getElementById('filter-status');
    const filterPlatform = document.getElementById('filter-platform');
    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('refresh-btn');
    const resetDbBtn = document.getElementById('reset-db-btn');

    if (filterStatus) {
      filterStatus.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.renderJobs();
      });
    }

    if (filterPlatform) {
      filterPlatform.addEventListener('change', (e) => {
        this.filters.platform = e.target.value;
        this.renderJobs();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value.toLowerCase();
        this.renderJobs();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
        try {
          await this.loadJobs();
          await this.loadStats();
          this.renderJobs();
        } finally {
          refreshBtn.disabled = false;
          refreshBtn.textContent = 'Refresh';
        }
      });
    }

    if (resetDbBtn) {
      resetDbBtn.addEventListener('click', async () => {
        if (!confirm('⚠️ WARNING: This will DELETE ALL jobs from the database. Are you sure?')) return;
        if (!confirm('This action CANNOT be undone. Proceed with database reset?')) return;
        
        try {
          resetDbBtn.disabled = true;
          resetDbBtn.textContent = 'Resetting...';
          
          const response = await fetch('/api/jobs', {
            method: 'DELETE'
          });
          
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const result = await response.json();
          alert(`✅ Database reset complete! ${result.deletedCount} jobs removed.`);
          
          await this.loadJobs();
          await this.loadStats();
          this.renderJobs();
        } catch (error) {
          alert(`❌ Failed to reset database: ${error.message}`);
          console.error('Reset DB error:', error);
        } finally {
          resetDbBtn.disabled = false;
          resetDbBtn.textContent = 'Reset Database';
        }
      });
    }

    document.querySelectorAll('.modal-close').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
          modal.style.display = 'none';
        });
      });
    });

    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    });
  }

  filterJobs() {
    return this.jobs.filter(job => {
      const matchesStatus = this.filters.status === 'all' || job.status === this.filters.status;
      const matchesPlatform = this.filters.platform === 'all' || job.source?.platform === this.filters.platform;
      const searchLower = this.filters.search;
      const matchesSearch = !searchLower || 
        job.title?.toLowerCase().includes(searchLower) || 
        job.company?.toLowerCase().includes(searchLower) ||
        job.location?.toLowerCase().includes(searchLower);
      return matchesStatus && matchesPlatform && matchesSearch;
    });
  }

  renderJobs() {
    const container = document.getElementById('jobs-container');
    const filteredJobs = this.filterJobs();

    console.log(`Rendering ${filteredJobs.length} jobs (filtered from ${this.jobs.length} total)`);

    if (filteredJobs.length === 0) {
      if (this.jobs.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#64748b;padding:40px;">No jobs in database. Run scrapers to fetch jobs: <code>npm run scrape:now</code></p>';
      } else {
        container.innerHTML = '<p style="text-align:center;color:#64748b;padding:40px;">No jobs match your filters. Try adjusting the filters above.</p>';
      }
      return;
    }

    container.innerHTML = filteredJobs.map(job => this.createJobCard(job)).join('');

    filteredJobs.forEach(job => {
      const viewBtn = document.getElementById(`view-${job._id}`);
      const prepareBtn = document.getElementById(`prepare-${job._id}`);
      const applyBtn = document.getElementById(`apply-${job._id}`);
      const viewCvBtn = document.getElementById(`view-cv-${job._id}`);
      const viewEmailBtn = document.getElementById(`view-email-${job._id}`);
      const regenerateCvBtn = document.getElementById(`regenerate-cv-${job._id}`);
      const regenerateEmailBtn = document.getElementById(`regenerate-email-${job._id}`);

      if (viewBtn) viewBtn.addEventListener('click', () => this.viewJob(job));
      if (prepareBtn) prepareBtn.addEventListener('click', () => this.prepareJob(job));
      if (applyBtn) applyBtn.addEventListener('click', () => this.applyJob(job));
      if (viewCvBtn) viewCvBtn.addEventListener('click', () => this.viewCv(job));
      if (viewEmailBtn) viewEmailBtn.addEventListener('click', () => this.viewEmail(job));
      if (regenerateCvBtn) regenerateCvBtn.addEventListener('click', () => this.regenerateCv(job));
      if (regenerateEmailBtn) regenerateEmailBtn.addEventListener('click', () => this.regenerateEmail(job));
    });
  }

  createJobCard(job) {
    const statusBadge = this.getStatusBadge(job.status);
    const platformBadge = this.getPlatformBadge(job.source?.platform);
    const atsScore = job.aiGenerated?.resume?.atsScore;
    
    let salary = 'Not specified';
    if (job.salary?.min || job.salary?.max) {
      const currency = job.salary.currency || '£';
      const min = job.salary.min ? `${currency}${job.salary.min.toLocaleString()}` : '';
      const max = job.salary.max ? `${currency}${job.salary.max.toLocaleString()}` : '';
      if (min && max) {
        salary = `${min} - ${max}`;
      } else {
        salary = min || max;
      }
    }

    const description = job.description || 'No description available';
    const truncatedDesc = description.length > 200 ? description.substring(0, 200) + '...' : description;

    const hasCv = job.aiGenerated?.resume?.content;
    const hasEmail = job.aiGenerated?.email?.body;

    return `
      <div class="job-card">
        <div class="job-header">
          <div>
            <h3 class="job-title">${this.escapeHtml(job.title)}</h3>
            <div class="job-company">${this.escapeHtml(job.company)}</div>
          </div>
          <div>
            ${statusBadge}
            ${platformBadge}
          </div>
        </div>
        <div class="job-meta">
          <div class="meta-item">📍 ${this.escapeHtml(job.location || 'Not specified')}</div>
          <div class="meta-item">💰 ${salary}</div>
          <div class="meta-item">📅 ${this.formatDate(job.source?.scrapedAt || job.createdAt)}</div>
          ${atsScore ? `<div class="meta-item">📊 ATS Score: <span class="${this.getAtsScoreClass(atsScore)}">${atsScore}%</span></div>` : ''}
        </div>
        <div class="job-description">${this.escapeHtml(truncatedDesc)}</div>
        
        ${hasCv || hasEmail ? `
          <div class="job-ai-section">
            <div style="font-weight:600;margin-bottom:8px;color:#334155;">🤖 AI Generated Content:</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${hasCv ? `
                <button class="btn-action btn-view-small" id="view-cv-${job._id}" style="font-size:13px;padding:6px 12px;">View CV</button>
                <button class="btn-action btn-regenerate" id="regenerate-cv-${job._id}" style="font-size:13px;padding:6px 12px;">Regenerate CV</button>
              ` : ''}
              ${hasEmail ? `
                <button class="btn-action btn-view-small" id="view-email-${job._id}" style="font-size:13px;padding:6px 12px;">View Email</button>
                <button class="btn-action btn-regenerate" id="regenerate-email-${job._id}" style="font-size:13px;padding:6px 12px;">Regenerate Email</button>
              ` : ''}
            </div>
          </div>
        ` : ''}
        
        <div class="job-actions">
          <button class="btn-action btn-view" id="view-${job._id}">View Details</button>
          ${job.status === 'scraped' ? `<button class="btn-action btn-prepare" id="prepare-${job._id}">🤖 Generate CV & Email</button>` : ''}
          ${job.status === 'ready_for_review' ? `
            <button class="btn-action btn-apply" id="apply-${job._id}">✅ Apply Now</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getStatusBadge(status) {
    const badges = {
      scraped: '<span class="badge badge-pending">Scraped</span>',
      validated: '<span class="badge badge-pending">Validated</span>',
      keywords_extracted: '<span class="badge badge-pending">Keywords Extracted</span>',
      resume_pending: '<span class="badge badge-pending">Resume Pending</span>',
      resume_generated: '<span class="badge badge-pending">Resume Generated</span>',
      ready_for_review: '<span class="badge badge-ready">Ready to Apply</span>',
      user_approved: '<span class="badge badge-ready">Approved</span>',
      applied: '<span class="badge badge-applied">Applied</span>',
      failed: '<span class="badge badge-failed">Failed</span>',
      expired: '<span class="badge badge-failed">Expired</span>'
    };
    return badges[status] || '<span class="badge badge-pending">Pending</span>';
  }

  getPlatformBadge(platform) {
    if (!platform) return '';
    const classes = {
      LinkedIn: 'platform-linkedin',
      Reed: 'platform-reed',
      Indeed: 'platform-indeed',
      StudentCircus: 'platform-reed',
      CWJobs: 'platform-indeed',
      TotalJobs: 'platform-indeed'
    };
    return `<span class="platform-badge ${classes[platform] || 'platform-linkedin'}">${platform}</span>`;
  }

  getAtsScoreClass(score) {
    if (score >= 80) return 'ats-score-high';
    if (score >= 60) return 'ats-score-medium';
    return 'ats-score-low';
  }

  formatDate(date) {
    if (!date) return 'Unknown';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return d.toLocaleDateString('en-GB');
  }

  viewJob(job) {
    const modal = document.getElementById('job-modal');
    if (!modal) return;

    document.getElementById('modal-title').textContent = job.title;
    document.getElementById('modal-company').textContent = job.company;
    
    let description = job.description || 'No description available';
    if (job.aiGenerated?.resume?.atsScore) {
      description = `📊 ATS Compatibility Score: ${job.aiGenerated.resume.atsScore}%\n\n` + description;
    }
    document.getElementById('modal-description').textContent = description;
    
    const urlLink = document.getElementById('modal-url');
    if (urlLink) {
      urlLink.href = job.source?.url || '#';
      urlLink.textContent = job.source?.url || 'No URL available';
    }
    
    modal.style.display = 'block';
  }

  async prepareJob(job) {
    if (!confirm(`Prepare application for ${job.title} at ${job.company}?`)) return;

    try {
      const response = await fetch(`/api/jobs/${job._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready_for_review' })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      alert('✅ Application prepared! Status updated to "Ready to Apply"');
      await this.loadJobs();
      await this.loadStats();
      this.renderJobs();
    } catch (error) {
      alert(`❌ Failed to prepare application: ${error.message}`);
      console.error('Prepare job error:', error);
    }
  }

  viewCv(job) {
    const modal = document.getElementById('cv-modal');
    if (!modal) return;

    const content = job.aiGenerated?.resume?.content || 'No CV generated yet.';
    const atsScore = job.aiGenerated?.resume?.atsScore;
    
    document.getElementById('cv-modal-title').textContent = `CV for ${job.title} at ${job.company}`;
    document.getElementById('cv-content').value = content;
    
    if (atsScore) {
      document.getElementById('cv-ats-score').textContent = `ATS Score: ${atsScore}%`;
      document.getElementById('cv-ats-score').className = `cv-ats-badge ${this.getAtsScoreClass(atsScore)}`;
      document.getElementById('cv-ats-score').style.display = 'inline-block';
    } else {
      document.getElementById('cv-ats-score').style.display = 'none';
    }
    
    modal.style.display = 'block';
    
    const saveCvBtn = document.getElementById('save-cv');
    if (saveCvBtn) {
      saveCvBtn.onclick = async () => {
        const newContent = document.getElementById('cv-content').value;
        await this.saveCv(job._id, newContent);
      };
    }

    const aiOptimizeCvBtn = document.getElementById('ai-optimize-cv');
    if (aiOptimizeCvBtn) {
      aiOptimizeCvBtn.onclick = async () => {
        await this.aiOptimizeCv(job);
      };
    }
  }

  viewEmail(job) {
    const modal = document.getElementById('email-modal');
    if (!modal) return;

    const subject = job.aiGenerated?.email?.subject || `Application for ${job.title} Position`;
    const body = job.aiGenerated?.email?.body || 'No email generated yet.';
    
    document.getElementById('email-modal-title').textContent = `Email for ${job.title} at ${job.company}`;
    document.getElementById('email-subject').value = subject;
    document.getElementById('email-body').value = body;
    
    modal.style.display = 'block';
    
    const saveEmailBtn = document.getElementById('save-email');
    if (saveEmailBtn) {
      saveEmailBtn.onclick = async () => {
        const newSubject = document.getElementById('email-subject').value;
        const newBody = document.getElementById('email-body').value;
        await this.saveEmail(job._id, newSubject, newBody);
      };
    }

    const aiOptimizeEmailBtn = document.getElementById('ai-optimize-email');
    if (aiOptimizeEmailBtn) {
      aiOptimizeEmailBtn.onclick = async () => {
        await this.aiOptimizeEmail(job);
      };
    }
  }

  async regenerateCv(job) {
    if (!confirm(`Regenerate CV for ${job.title} at ${job.company} using AI?`)) return;
    
    try {
      const btn = document.getElementById(`regenerate-cv-${job._id}`);
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Generating...';
      }
      
      const response = await fetch(`/api/jobs/${job._id}/regenerate-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: 'Please improve the CV' })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      alert(`✅ CV regenerated successfully! ATS Score: ${result.cv.atsScore || 'N/A'}%`);
      
      await this.loadJobs();
      this.renderJobs();
    } catch (error) {
      alert(`❌ Failed to regenerate CV: ${error.message}`);
      console.error('Regenerate CV error:', error);
    } finally {
      const btn = document.getElementById(`regenerate-cv-${job._id}`);
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Regenerate CV';
      }
    }
  }

  async regenerateEmail(job) {
    if (!confirm(`Regenerate cover email for ${job.title} at ${job.company} using AI?`)) return;
    
    try {
      const btn = document.getElementById(`regenerate-email-${job._id}`);
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Generating...';
      }
      
      const response = await fetch(`/api/jobs/${job._id}/regenerate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: 'Please improve the email' })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      alert('✅ Email regenerated successfully!');
      
      await this.loadJobs();
      this.renderJobs();
    } catch (error) {
      alert(`❌ Failed to regenerate email: ${error.message}`);
      console.error('Regenerate email error:', error);
    } finally {
      const btn = document.getElementById(`regenerate-email-${job._id}`);
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Regenerate Email';
      }
    }
  }

  async saveCv(jobId, content) {
    try {
      const response = await fetch(`/api/jobs/${jobId}/cv`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      alert('✅ CV saved successfully!');
      document.getElementById('cv-modal').style.display = 'none';
      
      await this.loadJobs();
      this.renderJobs();
    } catch (error) {
      alert(`❌ Failed to save CV: ${error.message}`);
      console.error('Save CV error:', error);
    }
  }

  async saveEmail(jobId, subject, body) {
    try {
      const response = await fetch(`/api/jobs/${jobId}/email`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      alert('✅ Email saved successfully!');
      document.getElementById('email-modal').style.display = 'none';
      
      await this.loadJobs();
      this.renderJobs();
    } catch (error) {
      alert(`❌ Failed to save email: ${error.message}`);
      console.error('Save email error:', error);
    }
  }

  async aiOptimizeCv(job) {
    const content = document.getElementById('cv-content').value;
    
    if (!confirm('Use Google AI to optimize this CV for better ATS compatibility?')) return;
    
    try {
      const btn = document.getElementById('ai-optimize-cv');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Optimizing...';
      }
      
      const response = await fetch(`/api/jobs/${job._id}/optimize-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentContent: content })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      
      document.getElementById('cv-content').value = result.optimizedContent;
      
      if (result.atsScore) {
        document.getElementById('cv-ats-score').textContent = `ATS Score: ${result.atsScore}%`;
        document.getElementById('cv-ats-score').className = `cv-ats-badge ${this.getAtsScoreClass(result.atsScore)}`;
      }
      
      alert(`✅ CV optimized! New ATS Score: ${result.atsScore || 'N/A'}%`);
    } catch (error) {
      alert(`❌ Failed to optimize CV: ${error.message}`);
      console.error('AI optimize CV error:', error);
    } finally {
      const btn = document.getElementById('ai-optimize-cv');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'AI Optimize';
      }
    }
  }

  async aiOptimizeEmail(job) {
    const content = document.getElementById('email-body').value;
    
    if (!confirm('Use Google AI to optimize this cover email?')) return;
    
    try {
      const btn = document.getElementById('ai-optimize-email');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Optimizing...';
      }
      
      const response = await fetch(`/api/jobs/${job._id}/optimize-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentContent: content })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      
      document.getElementById('email-subject').value = result.subject;
      document.getElementById('email-body').value = result.body;
      
      alert('✅ Email optimized successfully!');
    } catch (error) {
      alert(`❌ Failed to optimize email: ${error.message}`);
      console.error('AI optimize email error:', error);
    } finally {
      const btn = document.getElementById('ai-optimize-email');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'AI Optimize';
      }
    }
  }

  async prepareJob(job) {
    if (!confirm(`Generate AI-powered CV and email for ${job.title} at ${job.company}?`)) return;

    try {
      const btn = document.getElementById(`prepare-${job._id}`);
      btn.disabled = true;
      btn.textContent = '⏳ Generating...';

      const response = await fetch(`/api/jobs/${job._id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      alert('✅ CV and Email generated successfully!');
      await this.loadJobs();
      await this.loadStats();
      this.renderJobs();

    } catch (error) {
      alert(`❌ Generation failed: ${error.message}`);
    }
  }

  async applyJob(job) {
    if (!confirm(`Submit application to ${job.title} at ${job.company}?`)) return;

    try {
      const response = await fetch(`/api/jobs/${job._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'applied' })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      alert('✅ Application submitted successfully!');
      await this.loadJobs();
      await this.loadStats();
      this.renderJobs();
    } catch (error) {
      alert(`❌ Failed to submit application: ${error.message}`);
      console.error('Apply job error:', error);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard initializing...');
  new JobDashboard();
});