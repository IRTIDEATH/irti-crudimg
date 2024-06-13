/** @type {import('next').NextConfig} */
const nextConfig = {
    images:{
        remotePatterns:[
            {
                protocol: "https",
                hostname: "9zzjnakcehqt1nbz.public.blob.vercel-storage.com"
            }
        ]
    }
};

export default nextConfig;
