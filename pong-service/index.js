const hydraExpress = require('fwsp-hydra-express');
let config = require('./config.json');

hydraExpress.init(config, () => {
  let express = hydraExpress.getExpress();
  let api = express.Router();

  api.get('/', (req, res) => {
    res.send(`Pong!`);
  });

  hydraExpress.registerRoutes({
    '': api
  });
});
