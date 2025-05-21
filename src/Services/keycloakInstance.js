import Keycloak from 'keycloak-js';
import { createFallbackKeycloak, checkKeycloakServer, ensureHttpsUrl } from '../utils/keycloakHelper';

// Create a single Keycloak instance with HTTPS URL to prevent mixed content warnings
const keycloakConfig = {
    url: ensureHttpsUrl(import.meta.env.VITE_KEYCLOAK_URL || 'https://localhost:8080'),
    realm: import.meta.env.VITE_KEYCLOAK_REALM || 'master',
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'frontend'
};

// Log the Keycloak configuration only in development
if (process.env.NODE_ENV !== 'production') {
    console.log('Keycloak Config:', {
        url: keycloakConfig.url,
        realm: keycloakConfig.realm,
        clientId: keycloakConfig.clientId
    });
}

// Check if Keycloak server is reachable (only log in development)
checkKeycloakServer(keycloakConfig.url)
    .then(isReachable => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`Keycloak server is ${isReachable ? 'reachable' : 'not reachable'}`);
        }
    })
    .catch(error => {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Error checking Keycloak server:', error);
        }
    });

// Create the Keycloak instance with error handling
let keycloak;
try {
    keycloak = new Keycloak(keycloakConfig);
} catch (error) {
    // Log error only in development
    if (process.env.NODE_ENV !== 'production') {
        console.error('Error creating Keycloak instance:', error);
    }
    // Create a fallback instance that won't break the app
    keycloak = createFallbackKeycloak();
}

// Track initialization state
let isInitialized = false;
let initializationPromise = null;

// Function to initialize Keycloak with improved error handling
const initKeycloak = async (onSuccess, onError) => {
    // If already initialized, return the authenticated state
    if (isInitialized) {
        console.log('Keycloak already initialized, skipping duplicate initialization');
        if (onSuccess) {
            onSuccess(keycloak.authenticated || false);
        }
        return;
    }

    // If initialization is in progress, wait for it to complete
    if (initializationPromise) {
        console.log('Keycloak initialization already in progress, waiting for it to complete');
        try {
            const auth = await initializationPromise;
            if (onSuccess) {
                onSuccess(auth);
            }
            return;
        } catch (error) {
            console.error('Error while waiting for Keycloak initialization:', error);
            if (onError) {
                onError(error);
            }
            return;
        }
    }

    // Start initialization with increased timeout
    const INIT_TIMEOUT = 20000; // 20 seconds timeout (increased from 10s)

    initializationPromise = (async () => {
        try {
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Keycloak initialization timed out')), INIT_TIMEOUT);
            });

            // Race between initialization and timeout
            // Use the dynamically created silent check SSO URL if available
            const silentCheckSsoRedirectUri = window.silentCheckSSOUrl ||
                                             (window.location.origin + '/silent-check-sso.html');

            // First attempt with standard settings
            try {
                const auth = await Promise.race([
                    keycloak.init({
                        onLoad: 'check-sso',
                        silentCheckSsoRedirectUri: silentCheckSsoRedirectUri,
                        pkceMethod: 'S256',
                        checkLoginIframe: false, // Disable iframe check to avoid CSP issues
                        enableLogging: true, // Enable logging for debugging
                        flow: 'standard', // Use standard flow instead of implicit
                    }),
                    timeoutPromise
                ]);

                // Mark as initialized
                isInitialized = true;
                console.log('Keycloak initialized successfully:', auth);

                // Call success callback
                if (onSuccess) {
                    onSuccess(auth);
                }

                return auth;
            } catch (initialError) {
                // Log the initial error
                console.warn('Standard Keycloak initialization failed, trying fallback settings:', initialError);

                // Second attempt with fallback settings
                try {
                    // Create a new timeout promise for the fallback attempt
                    const fallbackTimeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Fallback Keycloak initialization timed out')), INIT_TIMEOUT);
                    });

                    // Try with more permissive settings
                    const fallbackAuth = await Promise.race([
                        keycloak.init({
                            onLoad: 'check-sso',
                            silentCheckSsoRedirectUri: silentCheckSsoRedirectUri,
                            pkceMethod: 'S256',
                            checkLoginIframe: false,
                            enableLogging: true,
                            responseMode: 'fragment', // Try fragment mode instead
                            flow: 'standard',
                        }),
                        fallbackTimeoutPromise
                    ]);

                    // Mark as initialized if fallback succeeded
                    isInitialized = true;
                    console.log('Keycloak initialized with fallback settings:', fallbackAuth);

                    // Call success callback
                    if (onSuccess) {
                        onSuccess(fallbackAuth);
                    }

                    return fallbackAuth;
                } catch (fallbackError) {
                    // Both attempts failed, throw the error to be caught by the outer catch
                    throw {
                        initialError,
                        fallbackError,
                        message: 'All Keycloak initialization attempts failed'
                    };
                }
            }
        } catch (error) {
            console.error('Keycloak initialization error:', error);
            // Reset initialization promise so we can try again
            initializationPromise = null;

            // Call error callback with more information
            if (onError) {
                // Provide more context about the error
                const enhancedError = {
                    originalError: error,
                    message: 'Failed to initialize Keycloak authentication after multiple attempts',
                    keycloakConfig: {
                        url: keycloakConfig.url,
                        realm: keycloakConfig.realm,
                        clientId: keycloakConfig.clientId
                    },
                    timestamp: new Date().toISOString(),
                    browserInfo: {
                        userAgent: navigator.userAgent,
                        protocol: window.location.protocol,
                        host: window.location.host
                    }
                };
                onError(enhancedError);
            }

            // Return false instead of throwing to prevent app crashes
            return false;
        }
    })();

    return initializationPromise;
};

export { keycloak, initKeycloak };

