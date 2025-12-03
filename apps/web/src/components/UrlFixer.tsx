import { logger } from "@bibgraph/utils/logger";
import { useEffect } from 'react';

/**
 * Component that fixes URL display issues immediately when mounted.
 * Handles both double hash issues and collapsed protocol slashes.
 */
export const UrlFixer = () => {
  useEffect(() => {
    const fixUrl = () => {
      const currentHash = window.location.hash;
      if (!currentHash || currentHash === '#') return;

      let needsUpdate = false;
      let fixedHash = currentHash;

      // Fix double hash (##/... should become #/...)
      if (currentHash.startsWith('##')) {
        fixedHash = '#' + currentHash.slice(2);
        needsUpdate = true;
      }

      // Fix collapsed protocol slashes (https:/doi.org should become https://doi.org)
      const collapsedRegex = new RegExp(String.raw`(^|\/)(https?:\/\/)([^/])`, 'g');
      if (collapsedRegex.test(fixedHash)) {
        fixedHash = fixedHash.replaceAll(collapsedRegex, '$1$2$3');
        needsUpdate = true;
      }

      // Apply fix if needed
      if (needsUpdate && fixedHash !== currentHash) {
        const newUrl = window.location.pathname + window.location.search + fixedHash;
        window.history.replaceState(window.history.state, '', newUrl);
        logger.debug('routing', 'URL fix applied:', { original: currentHash, fixed: fixedHash });
      }
    };

    // Run immediately
    fixUrl();

    // Also run after short delays to catch any timing issues
    const timeouts = [100, 500, 1000, 2000].map(delay => setTimeout(fixUrl, delay));

    return () => timeouts.forEach(clearTimeout);
  }, []);

  // This component doesn't render anything
  return null;
};