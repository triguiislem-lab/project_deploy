/**
 * Helper functions for Keycloak integration
 */

/**
 * Sets up Keycloak framing support
 * Note: frame-ancestors CSP directive can only be set via HTTP headers, not meta tags
 * This function now only creates the silent check SSO iframe
 */
export const setupKeycloakFraming = () => {
  try {
    // Log that CSP headers should be configured server-side
    console.log('Keycloak framing should be configured via server headers');

    // Create a silent check SSO iframe
    const createSilentCheckSSOFile = () => {
      // This is a workaround for Keycloak silent check SSO
      const silentCheckSSOHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Silent SSO check</title>
          <script>
            parent.postMessage(location.href, location.origin);
          </script>
        </head>
        <body>
          Silent check SSO iframe
        </body>
        </html>
      `;

      // Create a blob and get its URL
      const blob = new Blob([silentCheckSSOHtml], { type: 'text/html' });
      const silentCheckSSOUrl = URL.createObjectURL(blob);

      // Store the URL for Keycloak to use
      window.silentCheckSSOUrl = silentCheckSSOUrl;

      return silentCheckSSOUrl;
    };

    // Create the silent check SSO file
    createSilentCheckSSOFile();

    return true;
  } catch (error) {
    console.error('Failed to setup Keycloak framing:', error);
    return false;
  }
};

/**
 * Checks if Keycloak server is reachable
 * @param {string} url - The URL to check
 * @returns {Promise<boolean>} True if server is reachable
 */
export const checkKeycloakServer = async (url) => {
  try {
    // Ensure URL uses HTTPS if needed
    const secureUrl = ensureHttpsUrl(url);

    // Use a simple HEAD request to check if the server is reachable
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(secureUrl, {
      method: 'HEAD',
      mode: 'no-cors', // This is needed for CORS restrictions
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // If we get here, the server is reachable (no-cors won't give status)
    return true;
  } catch (error) {
    console.error('Keycloak server check failed:', error);
    return false;
  }
};

/**
 * Performs a comprehensive network diagnostic check
 * @param {string} url - The URL to check
 * @returns {Promise<Object>} Diagnostic information
 */
export const performNetworkDiagnostics = async (url) => {
  if (!url) return { success: false, error: 'No URL provided' };

  try {
    // Ensure URL uses HTTPS if needed
    const secureUrl = ensureHttpsUrl(url);

    // Create an AbortController to handle timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Try to fetch with different modes
    const diagnostics = {
      timestamp: new Date().toISOString(),
      url: secureUrl,
      browserInfo: {
        userAgent: navigator.userAgent,
        protocol: window.location.protocol,
        host: window.location.host,
        online: navigator.onLine
      },
      tests: {}
    };

    // Test 1: Basic no-cors HEAD request
    try {
      await fetch(secureUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });
      diagnostics.tests.basicHead = { success: true };
    } catch (error) {
      diagnostics.tests.basicHead = {
        success: false,
        error: error.message || 'Unknown error',
        aborted: error.name === 'AbortError'
      };
    }

    // Test 2: Try with credentials
    try {
      await fetch(secureUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        credentials: 'include',
        signal: controller.signal
      });
      diagnostics.tests.withCredentials = { success: true };
    } catch (error) {
      diagnostics.tests.withCredentials = {
        success: false,
        error: error.message || 'Unknown error',
        aborted: error.name === 'AbortError'
      };
    }

    // Clean up timeout
    clearTimeout(timeoutId);

    // Overall result
    diagnostics.success = diagnostics.tests.basicHead.success || diagnostics.tests.withCredentials.success;

    return diagnostics;
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Creates a fallback Keycloak instance that won't break the app
 */
export const createFallbackKeycloak = () => {
  return {
    authenticated: false,
    login: () => console.warn('Keycloak not properly initialized. Login unavailable.'),
    logout: () => console.warn('Keycloak not properly initialized. Logout unavailable.'),
    register: () => console.warn('Keycloak not properly initialized. Register unavailable.'),
    updateToken: () => Promise.resolve(false),
    init: () => Promise.resolve(false)
  };
};

/**
 * Ensures a URL uses HTTPS if the current page is loaded over HTTPS
 * This helps prevent mixed content warnings
 * @param {string} url - The URL to check and potentially modify
 * @returns {string} - The URL with the correct protocol
 */
export const ensureHttpsUrl = (url) => {
  if (!url) return url;

  // If we're on HTTPS and the URL is HTTP, convert it to HTTPS
  if (window.location.protocol === 'https:' && url.startsWith('http:')) {
    return url.replace('http:', 'https:');
  }

  return url;
};

export default {
  setupKeycloakFraming,
  checkKeycloakServer,
  createFallbackKeycloak,
  ensureHttpsUrl,
  performNetworkDiagnostics
};
