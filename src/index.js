const { validateEnv } = require('./config');
validateEnv();

const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  app.set('ready', true);
  console.log(
    `Service ${
      process.env.SERVICE_NAME || 'microservice-sample'
    } listening on ${PORT}`
  );
});

// graceful shutdown
const shutdown = (signal) => {
  console.log(`Received ${signal}, shutting down...`);
  app.set('ready', false);
  server.close(() => {
    console.log('Closed out remaining connections');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forcing shutdown');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
