/**
 * @file pages/index.tsx
 * @description
 * This file implements the landing page that serves as the login and registration page for the application.
 * Users can enter their email and password to either sign in or register. It integrates with Supabase Auth for
 * user authentication and session management.
 *
 * Key features:
 * - Toggle between "Login" and "Sign Up" modes.
 * - Form validation for email and password.
 * - Displays error messages from Supabase on failed attempts.
 * - Redirects authenticated users to the dashboard.
 *
 * @dependencies
 * - React: For component creation and state management.
 * - Next.js: For routing and page setup.
 * - Supabase Client: For authentication functions.
 * - Next Router: For redirecting users upon successful login/signup.
 *
 * @notes
 * - Ensure that Supabase is properly configured with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * - Adjust the redirection path as necessary based on your application routing.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import supabaseClient from '../services/supabaseclient';

const IndexPage: React.FC = () => {
  // State variables for form fields and mode toggle
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  /**
   * Handles form submission for both login and registration.
   * Uses Supabase Auth methods for authentication.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isSignUp) {
        // Registration process
        const { error: signUpError } = await supabaseClient.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        // Optionally, you can show a confirmation message or redirect
        alert('Registration successful! Please check your email to confirm your account.');
      } else {
        // Login process
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        // Redirect to the dashboard after successful login
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded shadow">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isSignUp ? 'Sign Up' : 'Login'}
        </h2>
        {error && (
          <div className="mb-4 text-red-600 text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 transition-colors"
          >
            {isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button
            className="text-blue-500 hover:underline"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
          >
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IndexPage;
