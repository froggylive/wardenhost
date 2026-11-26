module.exports = {
  apps: [
    {
      name: "wardenhost-website",
      cwd: "/root",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        PATH: "/opt/node/bin:/usr/local/bin:/usr/bin:/bin",
      },
    },
    {
      name: "froggylive-portfolio",
      cwd: "/root/froggylive-site",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PATH: "/opt/node/bin:/usr/local/bin:/usr/bin:/bin",
      },
    },
  ],
};
