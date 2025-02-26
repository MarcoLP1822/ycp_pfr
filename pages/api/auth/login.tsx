/**
 * @file pages/api/auth/login.tsx
 * @description
 * Login API endpoint that authenticates the user, generates a JWT,
 * and sets it as an HTTP-only cookie for secure authentication.
 *
 * This endpoint expects a POST request with a JSON body containing
 * the fields "username" and "password". On successful authentication,
 * a JWT token is generated and returned to the client via a secure cookie.
 *
 * Key Features:
 * - Validates HTTP method to accept only POST requests.
 * - Verifies user credentials using a helper function (verifyUserCredentials).
 * - Generates a JWT token with an expiration time of 1 day.
 * - Sets the token as an HTTP-only, secure cookie with appropriate attributes.
 *
 * @dependencies
 * - next: For API request/response types.
 * - jsonwebtoken: For JWT token generation.
 * - A user credential verification function (verifyUserCredentials).
 *
 * @notes
 * - Ensure that the JWT_SECRET environment variable is set in your environment.
 * - The secure attribute in the cookie ensures that it is sent only over HTTPS.
 * - Adjust the cookie attributes as needed for your deployment environment.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

/**
 * Dummy function for verifying user credentials.
 * Replace this with your actual user authentication logic.
 *
 * @param username - The username provided in the login request.
 * @param password - The password provided in the login request.
 * @returns A user object if credentials are valid, otherwise null.
 */
async function verifyUserCredentials(username: string, password: string) {
  // For demonstration purposes, we assume that if username and password are "admin", then authentication is successful.
  if (username === 'admin' && password === 'admin') {
    return { id: '1', email: 'admin@example.com' };
  }
  // In a real-world scenario, fetch user data from your database and verify the password.
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow only POST requests.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }

  const { username, password } = req.body;

  // Validate input.
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    // Verify the user's credentials.
    const user = await verifyUserCredentials(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your username and password.' });
    }

    // Generate a JWT token with a payload containing user information.
    const payload = { userId: user.id, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1d' });

    // Set the JWT token as an HTTP-only cookie.
    // Attributes:
    // - HttpOnly: Cookie is not accessible via client-side JavaScript.
    // - Secure: Cookie is sent only over HTTPS.
    // - Path=/ : Cookie is available for all routes.
    // - Max-Age=86400: Cookie expires in 1 day (86400 seconds).
    // - SameSite=Strict: Cookie is not sent with cross-site requests.
    res.setHeader(
      'Set-Cookie',
      `token=${token}; HttpOnly; Path=/; Max-Age=86400; Secure; SameSite=Strict`
    );

    // Respond with a success message.
    return res.status(200).json({ message: 'Login successful.' });
  } catch (error: any) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
