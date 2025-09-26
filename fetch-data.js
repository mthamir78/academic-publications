// This script runs in a Node.js environment on GitHub Actions.
// It uses built-in modules to read files and fetch data.
import { readFileSync, writeFileSync } from 'fs';

// --- Configuration ---
const AUTHORS_FILE = 'authors.csv';
const OUTPUT_FILE = 'publications.json'; // This file will be served to the frontend

// --- Helper Functions ---
function parseCSV(csvData) {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index];
      return obj;
    }, {});
  });
}

function determineSource(externalIds) {
  if (!externalIds || externalIds.length === 0) return "ORCID / Other";
  const ids = externalIds.map(id => id['external-id-type']);
  if (ids.includes('eid')) return "Scopus"; // Scopus EID
  if (ids.includes('wosuid')) return "Clarivate"; // Web of Science
  return "ORCID / Other";
}

// --- Main Execution ---
async function main() {
  console.log('Starting publication data fetch...');

  // 1. Read the authors from the CSV file
  const authors = parseCSV(readFileSync(AUTHORS_FILE, 'utf-8'));
  const allData = {
    authors: [],
    last_updated: new Date().toISOString()
  };

  // 2. Process each author
  for (const author of authors) {
    if (!author.orcid_id) continue;
    console.log(`Fetching data for ${author.name}...`);

    const authorProfile = { ...author, publications: [] };
    const apiUrl = `https://pub.orcid.org/v3.0/${author.orcid_id}/works`;
    
    try {
      const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
      
      const data = await response.json();

      // 3. Extract and categorize publications
      data.group.forEach(workGroup => {
        const summary = workGroup['work-summary'][0];
        const title = summary.title?.title?.value || "Title not available";
        const year = summary['publication-date']?.year?.value || "N/A";
        const source = determineSource(summary['external-ids']?.['external-id']);
        
        authorProfile.publications.push({ title, year, source });
      });
      allData.authors.push(authorProfile);
    } catch (error) {
      console.error(`Failed to process ${author.name}: ${error.message}`);
    }
  }

  // 4. Write the final JSON file
  writeFileSync(OUTPUT_FILE, JSON.stringify(allData, null, 2));
  console.log(`✅ Successfully created ${OUTPUT_FILE} with data for ${allData.authors.length} authors.`);
}

main();
