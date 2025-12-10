module.exports = {
  apps: [
    {
      name: 'api',
      script: './dist/index.js',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'google-worker',
      script: './dist/workers/google.worker.js',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'website-worker',
      script: './dist/workers/website.worker.js',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'instagram-worker',
      script: './dist/workers/instagram.worker.js',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

