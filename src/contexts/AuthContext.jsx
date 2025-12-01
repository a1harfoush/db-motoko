import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [principal, setPrincipal] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Internet Identity URL configuration
  // Check if we're on IC mainnet (production) or local development
  const isProduction = window.location.hostname.includes('.ic0.app') || 
                      window.location.hostname.includes('.icp0.io') ||
                      import.meta.env.MODE === 'production';
  
  const II_URL = isProduction
    ? 'https://identity.ic0.app'
    : `http://localhost:8000/?canisterId=${import.meta.env.VITE_INTERNET_IDENTITY_CANISTER_ID || 'rdmx6-jaaaa-aaaaa-aaadq-cai'}`;

  // Development-only fake auth: enabled by default in development to bypass login
  // - To explicitly disable, set VITE_DISABLE_FAKE_AUTH=true
  // - Or remove localStorage flag FAKE_AUTH
  // You can also force-enable via VITE_FAKE_AUTH=true or localStorage 'FAKE_AUTH' = '1'.
  const envFake = import.meta.env.VITE_FAKE_AUTH === 'true' || import.meta.env.VITE_FAKE_AUTH === '1';
  const envDisable = import.meta.env.VITE_DISABLE_FAKE_AUTH === 'true' || import.meta.env.VITE_DISABLE_FAKE_AUTH === '1';
  const lsFake = typeof window !== 'undefined' && window.localStorage?.getItem('FAKE_AUTH') === '1';
  const FAKE_AUTH = false;

  useEffect(() => {
    if (FAKE_AUTH) {
      console.warn('FAKE_AUTH enabled (dev only) - providing a fake identity. Do not commit this to production.');
      const fakePrincipal = Principal.fromText(import.meta.env.VITE_FAKE_PRINCIPAL || '2vxsx-fae');
      const fakeIdentity = { getPrincipal: () => fakePrincipal };
      setIdentity(fakeIdentity);
      setPrincipal(fakePrincipal);
      setIsAuthenticated(true);
      setAuthClient(null);
      setLoading(false);
    } else {
      initAuth();
    }
  }, []);

  const initAuth = async () => {
    try {
      console.log('Initializing auth with II_URL:', II_URL);
      console.log('Is production:', isProduction);
      console.log('Current hostname:', window.location.hostname);
      
      const client = await AuthClient.create({
        idleOptions: {
          idleTimeout: 1000 * 60 * 30, // 30 minutes
          disableDefaultIdleCallback: true,
        },
      });

      setAuthClient(client);

      const isAuth = await client.isAuthenticated();
      console.log('Is authenticated:', isAuth);
      
      if (isAuth) {
        handleAuthenticated(client);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticated = async (client) => {
    const identity = client.getIdentity();
    const principal = identity.getPrincipal();

    setIdentity(identity);
    setPrincipal(principal);
    setIsAuthenticated(true);

    console.log('Authenticated as:', principal.toString());
  };

  const login = async () => {
    if (!authClient) {
      throw new Error('Auth client not initialized');
    }

    try {
      setLoading(true);
      
      await new Promise((resolve, reject) => {
        authClient.login({
          identityProvider: II_URL,
          windowOpenerFeatures: `
            left=${window.screen.width / 2 - 200},
            top=${window.screen.height / 2 - 300},
            toolbar=0,
            location=0,
            menubar=0,
            width=400,
            height=600
          `,
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      });

      await handleAuthenticated(authClient);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!authClient) return;

    try {
      setLoading(true);
      await authClient.logout();
      
      setIdentity(null);
      setPrincipal(null);
      setIsAuthenticated(false);
      
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      identity,
      principal,
      authClient,
      login,
      logout,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};