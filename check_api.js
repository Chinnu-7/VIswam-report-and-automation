fetch('https://viswam-report-card.vercel.app/api')
    .then(r => r.json())
    .then(data => {
        console.log('--- VERCEL DEPLOYMENT STATUS ---');
        console.log('Current LIVE Version on Vercel:', data.version);
        console.log('Should be at least v1.2.3-principal-report-fix to indicate it auto-updated');
        console.log('--------------------------------');
    })
    .catch(e => console.error('Fetch error:', e));
