try {
    const controller = require('./controllers/customFieldController');
    const routes = require('./routes/customFieldRoutes');
    console.log('Successfully loaded controller and routes');
} catch (error) {
    console.error('Error loading modules:', error);
    process.exit(1);
}
