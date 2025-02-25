/**
 * @file postcss.config.js
 * @description Configurazione di PostCSS per integrare Tailwind CSS e Autoprefixer.
 * 
 * Questo file è essenziale per garantire che le direttive di Tailwind (come @tailwind base, components e utilities)
 * vengano processate correttamente durante la compilazione del CSS.
 * 
 * @dependencies
 * - tailwindcss: Plugin per Tailwind CSS.
 * - autoprefixer: Plugin per aggiungere automaticamente prefissi CSS per la compatibilità cross-browser.
 * 
 * @notes
 * - Assicurati di aver installato tailwindcss, autoprefixer e postcss come dipendenze nel tuo progetto.
 */

module.exports = {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  };
  