module.exports = {
  apps: [
    {
      name: "ai-virtual-hq",
      script: "server.py",
      interpreter: "python3",
      args: "-u",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        PYTHONUNBUFFERED: "1",
      },
    },
  ],
};
