import React, { useEffect } from 'react';

/**
 * ResourceHints component for optimizing resource loading
 *
 * This component adds resource hints to the document head
 * to improve performance by preloading, prefetching, and preconnecting
 * to resources that will be needed soon.
 */
const ResourceHints = () => {
  useEffect(() => {
    // Add preconnect hints for external domains
    const preconnectDomains = [
      'https://laravel-api.fly.dev',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdnjs.cloudflare.com',
      'https://keycloak-prod.1squalq6nmfj.eu-de.codeengine.appdomain.cloud'
    ];

    preconnectDomains.forEach(domain => {
      if (!document.querySelector(`link[rel="preconnect"][href="${domain}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    });

    // Add DNS prefetch hints for external domains
    const dnsPrefetchDomains = [
      'https://laravel-api.fly.dev',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdnjs.cloudflare.com',
      'https://keycloak-prod.1squalq6nmfj.eu-de.codeengine.appdomain.cloud'
    ];

    dnsPrefetchDomains.forEach(domain => {
      if (!document.querySelector(`link[rel="dns-prefetch"][href="${domain}"]`)) {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = domain;
        document.head.appendChild(link);
      }
    });

    // Preload critical resources - only include files that actually exist
    // First check if the files exist before preloading
    const criticalResources = [
      // We'll check if these files exist before preloading
      { href: '/img/interior-moodboard.png', as: 'image' }
    ];

    // Function to check if a file exists before preloading
    const checkAndPreload = async (resource) => {
      try {
        // Check if the resource already has a preload link
        if (document.querySelector(`link[rel="preload"][href="${resource.href}"]`)) {
          return;
        }

        // Check if the file exists
        const response = await fetch(resource.href, { method: 'HEAD' });
        if (response.ok) {
          // File exists, create preload link
          const link = document.createElement('link');
          link.rel = 'preload';
          link.href = resource.href;
          link.as = resource.as;

          if (resource.type) {
            link.type = resource.type;
          }

          if (resource.crossOrigin) {
            link.crossOrigin = resource.crossOrigin;
          }

          document.head.appendChild(link);
        }
      } catch (error) {
        // Silent fail - don't preload if there's an error
        console.warn(`Failed to preload ${resource.href}:`, error);
      }
    };

    // Check and preload each resource
    criticalResources.forEach(resource => {
      checkAndPreload(resource);
    });

    // Prefetch likely navigation paths
    const prefetchPaths = [
      '/products',
      '/Produit/AllCat',
      '/marque'
    ];

    prefetchPaths.forEach(path => {
      if (!document.querySelector(`link[rel="prefetch"][href="${path}"]`)) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = path;
        link.as = 'document';
        document.head.appendChild(link);
      }
    });

    // Add stylesheet links for web fonts and icons (don't use preload)
    const fontLinks = [
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;700&display=swap',
      'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap',
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css'
    ];

    fontLinks.forEach(href => {
      if (!document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
        // Add the stylesheet link directly - no preload
        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = href;
        document.head.appendChild(styleLink);
      }
    });

    return () => {
      // Cleanup function if needed
    };
  }, []);

  // This component doesn't render anything
  return null;
};

export default ResourceHints;
