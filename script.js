document.addEventListener('DOMContentLoaded', () => {
    // Global state
    let allPublications = [];
    let allAuthors = [];
    let isSortedAsc = false;

    // Chart instances
    let sourceChart, yearChart;

    // DOM Elements
    const pubList = document.getElementById('publication-list');
    const searchInput = document.getElementById('search-input');
    const authorFilter = document.getElementById('author-filter');
    const sourceFilter = document.getElementById('source-filter');
    const yearFilter = document.getElementById('year-filter');
    const sortButton = document.getElementById('sort-button');
    const resultsCount = document.getElementById('results-count');
    const lastUpdated = document.getElementById('last-updated');

    // --- Data Loading ---
    async function loadData() {
        try {
            const response = await fetch('publications.json');
            if (!response.ok) throw new Error('Data not found');
            const data = await response.json();
            
            allAuthors = data.authors;
            allPublications = data.authors.flatMap(author =>
                author.publications.map(pub => ({ ...pub, authorName: author.name, department: author.department }))
            );

            lastUpdated.textContent = `Data last updated: ${new Date(data.last_updated).toLocaleDateString()}`;
            
            populateFilters();
            render();
        } catch (error) {
            pubList.innerHTML = `<p style="color:red;">Error loading publication data. The data file might not have been generated yet. Please check back later.</p>`;
            console.error(error);
        }
    }

    // --- Filter Population ---
    function populateFilters() {
        const authors = [...new Set(allPublications.map(p => p.authorName))];
        const sources = [...new Set(allPublications.map(p => p.source))];
        const years = [...new Set(allPublications.map(p => p.year))].sort((a, b) => b - a);

        authors.forEach(name => authorFilter.innerHTML += `<option value="${name}">${name}</option>`);
        sources.forEach(source => sourceFilter.innerHTML += `<option value="${source}">${source}</option>`);
        years.forEach(year => yearFilter.innerHTML += `<option value="${year}">${year}</option>`);
    }

    // --- Rendering ---
    function render() {
        // 1. Get filter values
        const searchTerm = searchInput.value.toLowerCase();
        const selectedAuthor = authorFilter.value;
        const selectedSource = sourceFilter.value;
        const selectedYear = yearFilter.value;

        // 2. Filter data
        let filteredPubs = allPublications.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchTerm);
            const matchesAuthor = selectedAuthor === 'all' || p.authorName === selectedAuthor;
            const matchesSource = selectedSource === 'all' || p.source === selectedSource;
            const matchesYear = selectedYear === 'all' || p.year == selectedYear;
            return matchesSearch && matchesAuthor && matchesSource && matchesYear;
        });

        // 3. Sort data
        filteredPubs.sort((a, b) => isSortedAsc ? a.year - b.year : b.year - a.year);

        // 4. Display publications
        pubList.innerHTML = filteredPubs.length ? 
            filteredPubs.map(createPubCard).join('') : 
            '<p>No publications match your criteria.</p>';

        resultsCount.textContent = `Showing ${filteredPubs.length} of ${allPublications.length} publications.`;
        
        // 5. Update charts
        updateCharts(filteredPubs);
    }

    function createPubCard(pub) {
        const sourceClass = `source-${pub.source.replace(/[/ ]/g, '-')}`;
        return `
            <div class="publication-card">
                <h3>${pub.title}</h3>
                <div class="meta">
                    <span class="author"><strong>Author:</strong> ${pub.authorName} (${pub.department})</span>
                    <span class="year"><strong>Year:</strong> ${pub.year}</span>
                    <span class="source ${sourceClass}"><strong>Source:</strong> ${pub.source}</span>
                </div>
            </div>
        `;
    }

    // --- Charting ---
    function updateCharts(data) {
        // Source Chart
        const sourceCounts = data.reduce((acc, p) => {
            acc[p.source] = (acc[p.source] || 0) + 1;
            return acc;
        }, {});
        if (sourceChart) sourceChart.destroy();
        sourceChart = new Chart(document.getElementById('source-chart'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(sourceCounts),
                datasets: [{ data: Object.values(sourceCounts) }]
            }
        });

        // Year Chart
        const yearCounts = data.reduce((acc, p) => {
            acc[p.year] = (acc[p.year] || 0) + 1;
            return acc;
        }, {});
        const sortedYears = Object.keys(yearCounts).sort((a,b)=>a-b);
        if (yearChart) yearChart.destroy();
        yearChart = new Chart(document.getElementById('year-chart'), {
            type: 'bar',
            data: {
                labels: sortedYears,
                datasets: [{ 
                    label: 'Publications',
                    data: sortedYears.map(year => yearCounts[year]),
                    backgroundColor: 'rgba(0, 51, 102, 0.7)'
                }]
            }
        });
    }

    // --- Event Listeners ---
    [searchInput, authorFilter, sourceFilter, yearFilter].forEach(el => el.addEventListener('input', render));
    sortButton.addEventListener('click', () => {
        isSortedAsc = !isSortedAsc;
        sortButton.textContent = `Sort by Year (${isSortedAsc ? 'Oldest' : 'Newest'})`;
        render();
    });

    // --- Initial Load ---
    loadData();
});
