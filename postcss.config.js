/**
 * @file postcss.config.js
 * @description
 * Configurazione aggiornata di PostCSS per integrare @tailwindcss/postcss e Autoprefixer.
 * Ora utilizziamo @tailwindcss/postcss come plugin per Tailwind CSS.
 *
 * @dependencies
 * - @tailwindcss/postcss: Plugin per utilizzare Tailwind CSS con PostCSS.
 * - autoprefixer: Plugin per aggiungere automaticamente prefissi CSS.
 *
 * @notes
 * - Assicurati di aver installato @tailwindcss/postcss come dipendenza di sviluppo.
 */

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
