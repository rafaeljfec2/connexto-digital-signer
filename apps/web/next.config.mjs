import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals = config.externals ?? [];
    if (Array.isArray(config.externals)) {
      config.externals.push({ 'pdfjs-dist': 'pdfjs-dist' });
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
