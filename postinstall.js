// postinstall.js
// Skip Chromium download on Railway
if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('🚂 Railway detected - skipping Chromium download');
    process.exit(0);
  }