const axios = require('axios');
const cheerio = require('cheerio');

async function debugReedScraper() {
  try {
    const response = await axios.get('https://www.reed.co.uk/jobs/software-engineer-jobs-in-united-kingdom', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('Page title:', $('title').text());
    
    // Try different selectors
    const selectors = [
      '.job-result',
      '.job-card', 
      '.job-listing',
      '.job',
      'article',
      '[data-job-id]'
    ];
    
    for (const selector of selectors) {
      const elements = $(selector);
      console.log(`Selector "${selector}": ${elements.length} elements found`);
      
      if (elements.length > 0) {
        console.log(`First element HTML snippet:`);
        console.log(elements.first().html().substring(0, 200) + '...');
        break;
      }
    }
    
    // Look for job data in JSON
    const jobDataMatches = response.data.match(/"jobDetail":{[^}]*"jobId":[0-9]*,[^}]*"jobTitle":"[^"]*"/g);
    if (jobDataMatches) {
      console.log(`Found ${jobDataMatches.length} job data entries in JSON`);
      console.log('First entry:', jobDataMatches[0]);
    } else {
      console.log('No job data found in JSON');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugReedScraper();