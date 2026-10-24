const serverModule = require('./dist/server.js');
const app = serverModule.default || serverModule;

module.exports = app;
