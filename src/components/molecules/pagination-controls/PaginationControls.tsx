import React from 'react';

import * as styles from '../../organisms/search-results.css';

interface PaginationControlsProps {
  currentPage: number;
  totalCount: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  totalCount,
  perPage,
  onPageChange,
}: PaginationControlsProps) {
  const totalPages = Math.ceil(totalCount / perPage);
  
  if (totalCount <= perPage) return null;

  return (
    <div className={styles.pagination}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={styles.paginationButton}
      >
        Previous
      </button>
      
      <span className={styles.paginationInfo}>
        Page {currentPage} of {totalPages}
      </span>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={styles.paginationButton}
      >
        Next
      </button>
    </div>
  );
}