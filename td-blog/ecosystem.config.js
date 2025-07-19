module.exports = {
  apps: [{
    name: 'td-blog',
    script: './bin/www',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      PORT: process.env.PORT || 3000
    }
  }]
};