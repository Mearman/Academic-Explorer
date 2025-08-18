import { ActionIcon, Affix, Transition } from '@mantine/core';
import { useState, useEffect } from 'react';

import { Icon } from '../atoms/icon';

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
    <Affix position={{ bottom: 20, right: 20 }}>
      <Transition transition="slide-up" mounted={showBackToTop}>
        {(transitionStyles) => (
          <ActionIcon
            style={transitionStyles}
            onClick={scrollToTop}
            aria-label="Back to top"
            title="Back to top"
            size="lg"
            color="blue"
            variant="filled"
          >
            <Icon name="up" size="md" aria-hidden="true" />
          </ActionIcon>
        )}
      </Transition>
    </Affix>
  );
}