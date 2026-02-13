import React from 'react';
import { Home, BarChart2, Users, Settings, PieChart, Layers, Box } from 'lucide-react';

export default function Sidebar() {
    const menuItems = [
        { icon: <Home size={20} />, label: 'Overview', active: true },
        { icon: <BarChart2 size={20} />, label: 'Analytics' },
        { icon: <PieChart size={20} />, label: 'Reports' },
        { icon: <Users size={20} />, label: 'Customers' },
        { icon: <Layers size={20} />, label: 'Projects' },
        { icon: <Box size={20} />, label: 'Products' },
        { icon: <Settings size={20} />, label: 'Settings' },
    ];

    return (
        <div style={{
            width: 'var(--sidebar-width)',
            height: '100vh',
            backgroundColor: 'var(--bg-panel)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            left: 0,
            top: 0
        }}>
            {/* Brand */}
            <div style={{
                height: 'var(--header-height)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 1.5rem',
                borderBottom: '1px solid var(--border-subtle)'
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    borderRadius: '8px',
                    marginRight: '12px'
                }}></div>
                <span style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    letterSpacing: '-0.5px'
                }}>Viswam</span>
            </div>

            {/* Menu */}
            <nav style={{ padding: '1.5rem 1rem', flex: 1 }}>
                <p style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    color: 'var(--text-dim)',
                    fontWeight: 600,
                    marginBottom: '1rem',
                    paddingLeft: '0.75rem'
                }}>Dashboards</p>

                <ul style={{ listStyle: 'none' }}>
                    {menuItems.map((item, index) => (
                        <li key={index} style={{ marginBottom: '0.5rem' }}>
                            <button style={{
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--rounded-md)',
                                color: item.active ? 'var(--text-main)' : 'var(--text-muted)',
                                backgroundColor: item.active ? 'rgba(109, 93, 252, 0.1)' : 'transparent',
                                fontWeight: item.active ? 600 : 400
                            }}
                                onMouseEnter={(e) => {
                                    if (!item.active) {
                                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                        e.currentTarget.style.color = 'var(--text-main)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!item.active) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-muted)';
                                    }
                                }}
                            >
                                <div style={{ marginRight: '12px', color: item.active ? 'var(--primary)' : 'inherit' }}>
                                    {item.icon}
                                </div>
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* User */}
            <div style={{
                padding: '1.5rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center'
            }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                }}>JD</div>
                <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>John Doe</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Admin</div>
                </div>
            </div>
        </div>
    );
}
