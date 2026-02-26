'use client';
import { useEffect } from 'react';

/**
 * FontLoader — Client Component
 * Charge les polices de façon non-bloquante via JS (remplace le trick media="print" + onLoad string
 * qui n'est plus compatible React 19 / Next 15).
 */
export default function FontLoader() {
  useEffect(() => {
    const urls = [
      'https://api.fontshare.com/v2/css?f[]=clash-display@700,800,900&display=swap',
      'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&display=swap',
    ];
    urls.forEach(href => {
      if (document.querySelector(`link[href="${href}"]`)) return; // déjà chargé
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
  }, []);

  return null;
}