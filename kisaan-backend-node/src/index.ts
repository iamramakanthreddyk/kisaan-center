import app from './app';

if (require.main === module) {
  (async () => {
    if (process.env.DB_DIALECT === 'sqlite') {
      const seed = await import('../../scripts/generate_sqlite_bootstrap.js');
      await seed.default();
    }

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })();
}

export default app;
