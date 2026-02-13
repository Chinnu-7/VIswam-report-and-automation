import React from 'react';

export default function GradeCard({ grade, improvements = [], themeColor = '#1e3a8a' }) {
    return (
        <div style={{
            backgroundColor: '#FFF8F0', // Light beige/warm background from screenshot
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            borderTop: `4px solid ${themeColor}`, // Theme color accent
            padding: '0.6rem', // REDUCED
            height: '100%',
            fontFamily: "'Outfit', sans-serif",
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
            <h4 style={{
                margin: '0 0 0.6rem 0', // REDUCED
                fontSize: '0.85rem', // REDUCED
                fontWeight: '700',
                color: themeColor,
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '0.3rem' // REDUCED
            }}>
                Grade {grade}
            </h4>

            <div style={{ flex: 1 }}>
                <p style={{
                    fontSize: '0.7rem', // REDUCED
                    fontWeight: '600',
                    margin: '0 0 0.3rem 0', // REDUCED
                    color: '#334155',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    Areas of Improvement
                </p>
                <ul style={{
                    listStyleType: 'none',
                    paddingLeft: '0',
                    margin: 0
                }}>
                    {improvements.map((item, index) => {
                        // Split logic: supports " : " and " - " separators
                        let topic = item;
                        let percentage = '';

                        // Try matching with regex for percentage at the end
                        const match = item.match(/(.+) (?:\:|-) (\d+\%)$/);
                        if (match) {
                            topic = match[1].trim();
                            percentage = match[2].trim();
                        }

                        return (
                            <li key={index} style={{
                                fontSize: '0.65rem', // REDUCED
                                color: '#475569',
                                marginBottom: '0.3rem', // REDUCED
                                lineHeight: '1.3', // TIGHTENED
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                borderBottom: '1px dotted #e2e8f0',
                                paddingBottom: '0.15rem' // REDUCED
                            }}>
                                <span style={{ flex: 1, paddingRight: '0.5rem' }}>{topic}</span>
                                <span style={{
                                    fontWeight: '600',
                                    color: '#0f172a',
                                    whiteSpace: 'nowrap'
                                }}>{percentage}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
