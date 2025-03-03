/**
 * @file postcss.config.js
 * @description
 * Updated configuration for PostCSS to integrate @tailwindcss/postcss and Autoprefixer.
 * This update replaces the direct use of tailwindcss with the new package @tailwindcss/postcss,
 * as the PostCSS plugin has been moved to a separate package.
 *
 * Key features:
 * - Uses @tailwindcss/postcss as the Tailwind CSS PostCSS plugin.
 * - Integrates autoprefixer to add vendor prefixes automatically.
 *
 * @dependencies
 * - @tailwindcss/postcss: Used to process Tailwind CSS styles with PostCSS.
 * - autoprefixer: Used for adding vendor prefixes for better browser support.
 *
 * @notes
 * - Make sure to install @tailwindcss/postcss as a dev dependency:
 *   Run: npm install --save-dev @tailwindcss/postcss
 */

module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
