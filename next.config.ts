import type { NextConfig } from "next";

// If deployed to https://<user>.github.io/<repo>/, set basePath to '/<repo>'
const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const repositoryName = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split("/")[1]}`
  : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages && !process.env.CUSTOM_DOMAIN ? repositoryName : "",
  images: {
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
