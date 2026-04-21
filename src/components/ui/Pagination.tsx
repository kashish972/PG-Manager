'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange, onPageSizeChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--surface-elevated)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    minWidth: '44px',
    minHeight: '44px',
  };

  const selectStyle: React.CSSProperties = {
    background: 'var(--surface-elevated)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    minWidth: '80px',
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 12px',
    marginTop: '16px',
    borderTop: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    flexWrap: 'wrap',
    gap: '12px',
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 500 }}>
            {startItem}-{endItem} of {totalItems} items
          </span>
          
          {onPageSizeChange && (
            <select 
              value={itemsPerPage}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={selectStyle}
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          )}
        </div>
        
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', paddingTop: '8px' }}>
            <button
              style={buttonStyle}
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              title="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600, minWidth: '70px', textAlign: 'center' }}>
              {currentPage} / {totalPages}
            </span>
            
            <button
              style={buttonStyle}
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              title="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}