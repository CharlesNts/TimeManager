import client from './client';

/**
 * Triggers the password reset email for the given email address.
 * @param {string} email 
 * @returns {Promise<void>}
 */
export const forgotPassword = async (email) => {
  await client.post('/api/auth/password/forgot', { email });
};

/**
 * Resets the password using the token and new password.
 * @param {string} token 
 * @param {string} newPassword 
 * @returns {Promise<void>}
 */
export const resetPassword = async (token, newPassword) => {
  await client.post('/api/auth/password/reset', { token, newPassword });
};