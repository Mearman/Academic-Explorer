'use client';

import { useAppStore } from '@/stores/app-store';

import * as styles from './search-history.css';

export function SearchHistory() {
  const { searchHistory, setSearchQuery, clearSearchHistory } = useAppStore();

  if (searchHistory.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Recent Searches</h3>
        <button
          onClick={clearSearchHistory}
          className={styles.clearButton}
          aria-label="Clear search history"
        >
          Clear
        </button>
      </div>
      <ul className={styles.list}>
        {searchHistory.map((query, index) => (
          <li key={index}>
            <button
              onClick={() => setSearchQuery(query)}
              className={styles.historyItem}
            >
              {query}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}