const { app, connectDB } = require('./app');

// Render free planda uyqudan uyg'onishda Mongo ulanishi sekin bo'lishi mumkin —
// server baribir o'rnidan turishi shart (health check 200 qaytishi uchun).
connectDB().catch((err) => {
  console.error('Initial DB connect failed, will retry on requests:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));