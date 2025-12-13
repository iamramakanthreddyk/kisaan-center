import app from './app';

if (require.main === module) {
  (async () => {
    if (process.env.DB_DIALECT === 'sqlite') {
      const seed = require('../../scripts/generate_sqlite_bootstrap.js');
      await seed();
    }

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })();
}

export default app;
