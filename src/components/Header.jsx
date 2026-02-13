import React from 'react';
import { Bell, Search } from 'lucide-react';

export default function Header() {
    return (
        <header style={{
            height: 'var(--header-height)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2rem',
            backgroundColor: 'rgba(15, 16, 20, 0.8)', // Glassy
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 10
        }}>
            {/* Search */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--rounded-md)',
                padding: '0.5rem 1rem',
                width: '300px'
            }}>
                <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                <input
                    type="text"
                    placeholder="Search analytics..."
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-main)',
                        width: '100%',
                        outline: 'none',
                        fontSize: '0.9rem'
                    }}
                />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button className="flex-center" style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)'
                }}>
                    <Bell size={20} />
                </button>
            </div>
        </header>
    );
}
