import { createFileRoute, Link } from '@tanstack/react-router';
import * as styles from '../app/page.css';
import { SearchBar, SearchHistory, StorageManager } from '@/components';

function HomePage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Academic Explorer</h1>
        <p className={styles.description}>
          Explore academic research and literature with powerful tools
        </p>
        
        <SearchBar />
        <SearchHistory />
        
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2>Search Literature</h2>
            <p>Find relevant academic papers and research</p>
            <Link to="/search" style={{ marginTop: '1rem', display: 'inline-block', color: '#3b82f6', textDecoration: 'underline' }}>
              Advanced Search →
            </Link>
          </div>
          
          <div className={styles.card}>
            <h2>Citation Networks</h2>
            <p>Explore citation relationships between papers</p>
          </div>
          
          <div className={styles.card}>
            <h2>Research Analytics</h2>
            <p>Analyse trends and patterns in academic literature</p>
            <Link to="/dashboard" style={{ marginTop: '1rem', display: 'inline-block', color: '#3b82f6', textDecoration: 'underline' }}>
              View Dashboard →
            </Link>
          </div>
          
          <div className={styles.card}>
            <h2>Bibliography Management</h2>
            <p>Organise and manage your research references</p>
          </div>
        </div>
        
        <StorageManager />
      </main>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
});