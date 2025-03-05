/**
 * @file pages/index.tsx
 * @description
 * Login (and signup) page styled entirely with Material UI components.
 * This page provides a form for users to log in or sign up, with state management for toggling between modes.
 * It uses Material UI Container, Box, Typography, TextField, Button, and Alert for a consistent Material Design look.
 *
 * Key features:
 * - Material UI layout components for consistent styling
 * - Form fields for email and password using TextField
 * - Toggle between Login and Sign Up modes
 * - Error display using Alert component
 *
 * @dependencies
 * - React: For state management
 * - Next.js: For routing
 * - @mui/material: For UI components and styling
 * - @supabase/auth-helpers-react: For authentication actions
 *
 * @notes
 * - Make sure you have installed @mui/material, @emotion/react, and @emotion/styled
 * - This page is wrapped in the ThemeProvider (in _app.tsx) so it uses the custom Material UI theme
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
} from '@mui/material';

const IndexPage: React.FC = () => {
  const router = useRouter();
  const supabase = useSupabaseClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          return;
        }
        alert('Registrazione avvenuta con successo! Controlla la tua email per confermare il tuo account.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          return;
        }
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Si è verificato un errore imprevisto.');
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Box
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          backgroundColor: 'background.paper',
          boxShadow: 3,
          borderRadius: 2,
        }}
      >
        <Typography variant="h4" component="h1" align="center">
          {isSignUp ? 'Sign Up' : 'Login'}
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mb: 2 }}
          >
            {isSignUp ? 'Registrati' : 'Login'}
          </Button>
        </form>
        <Button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
          fullWidth
        >
          {isSignUp ? 'Hai già un account? Login' : "Non hai un account? Registrati"}
        </Button>
      </Box>
    </Container>
  );
};

export default IndexPage;
