import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function Dropdown({ label, options, selected, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <div className="dropdown-container" ref={dropdownRef} style={{ position: 'relative', minWidth: '140px' }}>
      <button 
        className={`dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0.6rem 1rem',
          backgroundColor: 'var(--bg-panel)',
          border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--rounded-md)',
          color: 'var(--text-main)',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}
      >
        <span>{selected?.label || label || 'Select...'}</span>
        <ChevronDown 
          size={16} 
          style={{ 
            marginLeft: '8px', 
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }} 
        />
      </button>

      {isOpen && (
        <div className="dropdown-menu" style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--rounded-md)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 50,
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease'
        }}>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0.6rem 1rem',
                color: selected?.value === option.value ? 'var(--primary)' : 'var(--text-muted)',
                backgroundColor: selected?.value === option.value ? 'rgba(109, 93, 252, 0.05)' : 'transparent',
                textAlign: 'left',
                fontSize: '0.9rem'
              }}
              onMouseEnter={(e) => {
                if (selected?.value !== option.value) e.currentTarget.style.color = 'var(--text-main)';
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (selected?.value !== option.value) e.currentTarget.style.color = 'var(--text-muted)';
                if (selected?.value !== option.value) e.currentTarget.style.backgroundColor = 'transparent';
                else e.currentTarget.style.backgroundColor = 'rgba(109, 93, 252, 0.05)';
              }}
            >
              {option.label}
              {selected?.value === option.value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
