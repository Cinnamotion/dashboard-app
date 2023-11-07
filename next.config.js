/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'dashboard-app-drab-seven.vercel.app',
			}
		]
	}
};

module.exports = nextConfig;
