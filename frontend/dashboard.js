document.addEventListener('DOMContentLoaded', () => {
    const snippets = JSON.parse(localStorage.getItem('daily_snippets')) || [];
    
    // Update Welcome Message
    const welcome = document.getElementById('welcomeUser');
    if (welcome) welcome.innerText = `Welcome Back, Luffy!`;

    // Update Stats
    const stats = document.getElementById('statsSummary');
    if (stats) {
        const langCount = new Set(snippets.map(s => s.language)).size;
        stats.innerHTML = `Managing <span class="highlight">${snippets.length}</span> snippets across <span class="highlight">${langCount}</span> languages.`;
    }

    // Generate Heatmap
    const heatmap = document.getElementById('heatmap');
    if (heatmap) {
        for (let i = 0; i < 28; i++) {
            const block = document.createElement('div');
            block.className = `heatmap-block ${i % 5 === 0 ? 'active' : ''}`;
            heatmap.appendChild(block);
        }
    }

    // Export Functionality
    document.getElementById('exportBackup')?.addEventListener('click', () => {
        const data = JSON.stringify(snippets, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dailycode-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    });
});