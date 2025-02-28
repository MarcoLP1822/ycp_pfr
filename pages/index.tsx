// pages/index.tsx
import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

export default function IndexPage() {
  const router = useRouter()
  // Otteniamo l'istanza di Supabase dal context
  const supabase = useSupabaseClient()

  // Stati
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    try {
      if (isSignUp) {
        // Registrazione
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) {
          setError(error.message)
          return
        }
        alert('Registrazione completata! Controlla la tua email per confermare l’account.')
      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          setError(error.message)
          return
        }
        // Se il login ha successo, reindirizza
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Si è verificato un errore imprevisto.')
    }
  }

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
              setIsSignUp(!isSignUp)
              setError('')
            }}
          >
            {isSignUp ? 'Hai già un account? Effettua il login' : "Non hai un account? Registrati"}
          </button>
        </div>
      </div>
    </div>
  )
}
