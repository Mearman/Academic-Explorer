import { useState, useEffect } from 'react';

import { Icon } from '../atoms/icon';

import * as styles from './floating-actions.css';

export function FloatingActions() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Handle scroll to show/hide back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.floatingActions}>
      {showBackToTop && (
        <button
          className={styles.backToTop}
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
        >
          <Icon name="up" size="md" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}