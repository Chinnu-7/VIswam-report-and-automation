/**
 * Relative Grading Service
 * Implements norm-referenced grading based on student cohort performance.
 */

export const GRADES = [
    { minZ: 1.5, grade: 'S+' },
    { minZ: 0.9, grade: 'S' },
    { minZ: 0.4, grade: 'A+' },
    { minZ: -0.1, grade: 'A' },
    { minZ: -0.6, grade: 'B+' },
    { minZ: -1.1, grade: 'B' },
    { minZ: -1.6, grade: 'C+' },
    { minZ: -Infinity, grade: 'C' }
];

export const calculateGrade = (zScore) => {
    for (const threshold of GRADES) {
        if (zScore >= threshold.minZ) return threshold.grade;
    }
    return 'C';
};

export const computeCohortStats = (reports) => {
    if (!reports || reports.length === 0) return null;

    const subjects = ['maths', 'science', 'english', 'overall'];
    const stats = {};

    subjects.forEach(subject => {
        // Extract raw scores for this subject
        const scores = reports.map(r => {
            if (subject === 'overall') {
                return (Number(r.reportData.maths_score) || 0) +
                    (Number(r.reportData.science_score) || 0) +
                    (Number(r.reportData.english_score) || 0);
            }
            // For individuals, we use the percentage/raw total calculated during upload
            // The doc says "Subject Total = Sum of all correct responses"
            // Our reportData currently stores percentage as _score. Let's stick to the percentages or raw totals.
            // Requirement says "Total = Q1 + Q2 ... + Q15". 
            // Our uploadController calculates percentage as (total/15)*100.
            // Let's use the percentage scores for grading as they are proportional.
            return Number(r.reportData[`${subject}_score`]) || 0;
        });

        const n = scores.length;
        const mean = scores.reduce((a, b) => a + b, 0) / n;

        // Standard Deviation: sqrt(sum((x - mean)^2) / n)
        const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const sd = Math.sqrt(variance) || 1; // Avoid division by zero

        stats[subject] = { mean, sd, n };
    });

    return stats;
};

export const assignRelativeGrades = (reports, stats) => {
    return reports.map(report => {
        const subjects = ['maths', 'science', 'english', 'overall'];
        const relativeGrades = {};

        subjects.forEach(subject => {
            let score = 0;
            if (subject === 'overall') {
                score = (Number(report.reportData.maths_score) || 0) +
                    (Number(report.reportData.science_score) || 0) +
                    (Number(report.reportData.english_score) || 0);
            } else {
                score = Number(report.reportData[`${subject}_score`]) || 0;
            }

            const { mean, sd } = stats[subject];
            const zScore = (score - mean) / sd;
            const grade = calculateGrade(zScore);

            relativeGrades[subject] = {
                score,
                zScore: Number(zScore.toFixed(2)),
                grade
            };
        });

        // Merge back into reportData
        return {
            ...report,
            reportData: {
                ...report.reportData,
                relative_grading: relativeGrades,
                cohort_stats: stats
            }
        };
    });
};
