/**
 * PM2 ecosystem file for the production VPS at /opt/minizi.
 *
 * Mirrors the existing inline `pm2 start … --name minizi` invocation so
 * the operator can pin process settings in git instead of re-typing
 * them. Use:
 *
 *     cd /opt/minizi && pm2 reload ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "minizi",
      cwd: "/opt/minizi",
      script: "./node_modules/.bin/next",
      args: "start -p 3001",
      // Production env. AUTH_URL etc. live in /opt/minizi/.env and are
      // picked up by Next at runtime — they're not duplicated here so
      // we never accidentally check secrets in to git.
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
      // PM2 normally restarts crashing processes immediately; back off
      // exponentially so a broken deploy doesn't burn CPU.
      exp_backoff_restart_delay: 1500,
      // Keep at least the last 1000 lines of stdout/stderr per file so
      // log rotation has something to copy. PM2's default 10k lines is
      // overkill for this app.
      max_restarts: 20,
      autorestart: true,
      // Graceful shutdown — give Next.js 5s to drain in-flight requests
      // before SIGKILL.
      kill_timeout: 5000,
      listen_timeout: 8000,
      // Watch is OFF in production. `pm2 reload` triggered by deploy.sh
      // is the only restart trigger.
      watch: false,
    },
  ],
};
