import fs from 'fs';

try {
    const html = fs.readFileSync('test_report.html', 'utf8');
    
    // Look for spans with specific background colors that indicate a grade
    const badgeRegex = /<span style="[^"]*background-color[^"]*">([^<]+)<\/span>/g;
    const matches = Array.from(html.matchAll(badgeRegex));
    
    const grades = matches.map(m => m[1].trim()).filter(g => ['O', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D'].includes(g));
    
    if (grades.length > 0) {
        console.log(`SUCCESS! Found ${grades.length} letter grades in the HTML.`);
        console.log('Sample of first 20 grades:', grades.slice(0, 20).join(', '));
        
        const countDashes = (html.match(/>-</g) || []).length;
        console.log(`Found ${countDashes} default dashes (should be minimal).`);
    } else {
        console.log('FAILED! No valid letter grades found in the HTML!');
        const countDashes = (html.match(/>-</g) || []).length;
        console.log(`Found ${countDashes} default dashes.`);
    }
} catch (e) {
    console.error('Error parsing HTML:', e);
}
