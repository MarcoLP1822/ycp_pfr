/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
      // Forza l'unica istanza di @emotion/react
      config.resolve.alias['@emotion/react'] = require.resolve('@emotion/react');
      return config;
    },
  };
  
  module.exports = nextConfig;
  