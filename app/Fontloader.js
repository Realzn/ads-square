'use client';
import { useEffect } from 'react';

/**
 * FontLoader — Star Citizen Grade
 * Loads Rajdhani (UI headers) + JetBrains Mono (data readouts) non-blocking.
 */
export default function FontLoader() {
  useEffect(() => {
    const urls = [
      'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Sora:wght@400;600;700&display=swap',
    ];
    urls.forEach(href => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
  }, []);

  return null;
}