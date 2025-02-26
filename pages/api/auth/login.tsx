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
 * Now includes logging calls for performance monitoring and debugging.
 *
 * @dependencies
 * - next: For API request/response types.
 * - jsonwebtoken: For JWT token generation.
 * - A user credential verification function (verifyUserCredentials).
 * - Logger service for logging events.
 *
 * @notes
 * - Ensure that the JWT_SECRET environment variable is set in your environment.
 * - The secure attribute in the cookie ensures that it is sent only over HTTPS.
 * - Adjust the cookie attributes as needed for your deployment environment.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import Logger from '../../../services/logger';

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
  Logger.info(`Login endpoint invoked with method ${req.method}.`);

  // Allow only POST requests.
  if (req.method !== 'POST') {
    Logger.warn('Method not allowed on login endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }

  const { username, password } = req.body;

  // Validate input.
  if (!username || !password) {
    Logger.error('Missing username or password in login request.');
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    // Verify the user's credentials.
    const user = await verifyUserCredentials(username, password);
    if (!user) {
      Logger.error('Invalid credentials provided.');
      return res.status(401).json({ error: 'Invalid credentials. Please check your username and password.' });
    }

    // Generate a JWT token with a payload containing user information.
    const payload = { userId: user.id, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1d' });

    // Set the JWT token as an HTTP-only cookie.
    res.setHeader(
      'Set-Cookie',
      `token=${token}; HttpOnly; Path=/; Max-Age=86400; Secure; SameSite=Strict`
    );

    Logger.info(`User ${username} logged in successfully.`);
    // Respond with a success message.
    return res.status(200).json({ message: 'Login successful.' });
  } catch (error: any) {
    Logger.error(`Error during login: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
