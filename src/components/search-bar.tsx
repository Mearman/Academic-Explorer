'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import * as styles from './search-bar.css';

export function SearchBar() {
  const { searchQuery, setSearchQuery, addToSearchHistory } = useAppStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      setSearchQuery(localQuery);
      addToSearchHistory(localQuery);
      console.log('Searching for:', localQuery);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        placeholder="Search academic literature..."
        className={styles.input}
        aria-label="Search"
      />
      <button type="submit" className={styles.button}>
        Search
      </button>
    </form>
  );
}