const withSerwist = require("@serwist/next").default({
  swSrc: "app/sw.js",
  swDest: "public/sw.js",
  // En développement, le service worker gêne le rechargement à chaud : on le
  // désactive. Il s'active en build/production (et sur Vercel).
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = withSerwist(nextConfig);
