import type {NextConfig} from "next";
const nextConfig:NextConfig={reactStrictMode:true,outputFileTracingIncludes:{"/*":["./data/ncert-index.json"],"/api/videos":["./scripts/yt_niche_search.py","./data/youtube-video-cache.json"]}};
export default nextConfig;
