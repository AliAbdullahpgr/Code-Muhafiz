/** @type {import('next').NextConfig} */
const nextConfig = {
  // The threat-intel snapshot is read with fs at runtime, so tracing can't see it; ship it explicitly.
  outputFileTracingIncludes: {
    '/api/**/*': ['./data/compromised_packages.json'],
  },
};

export default nextConfig;
