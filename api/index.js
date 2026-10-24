const serverModule = require('../backend/dist/server.js');
const app = serverModule.default || serverModule;

module.exports = app;

