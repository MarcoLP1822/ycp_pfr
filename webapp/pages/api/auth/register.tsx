/**
 * @file pages/register.tsx
 * @description
 * Pagina di registrazione personalizzata utilizzando "username" e "password".
 * Chiama l'API Route /api/auth/register per salvare l'utente nella tabella custom `app_users`.
 *
 * @notes
 * - Assicurarsi di aver configurato la tabella `app_users` su Supabase con i campi `username` e `hashed_password`.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Errore durante la registrazione');
        return;
      }

      setSuccess('Registrazione completata con successo!');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Register error:', err);
      setError('Si è verificato un errore imprevisto.');
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded shadow">
        <h2 className="text-2xl font-bold mb-6 text-center">Registrazione</h2>
        {error && (
          <div className="mb-4 text-red-600 text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-green-600 text-center">
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-700 font-medium mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Inserisci il tuo username"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              placeholder="Inserisci la tua password"
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
            Registrati
          </button>
        </form>
        <div className="mt-4 text-center">
          <a
            href="/login"
            className="text-blue-500 hover:underline"
          >
            Hai già un account? Effettua il login
          </a>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
