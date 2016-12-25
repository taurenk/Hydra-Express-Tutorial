const hydraExpress = require('fwsp-hydra-express');
let config = require('./config.json');

hydraExpress.init(config, () => {
  let express = hydraExpress.getExpress();
  let api = express.Router();
  let hydra = hydraExpress.getHydra();

  api.get('/', (req, res) => {
    res.send(`Ping!`);
  });

  let hydra = hydraExpress.getHydra();
  api.get('/send-ping', (req, res) => {

    let message = hydra.createUMFMessage({
      to: 'pong-service:[GET]/' ,
      from: 'ping-service',
      body: {}
    })

    hydra.makeAPIRequest(message)
      .then((data) => {
        if (data.statusCode === 200) {
          console.log(1);
          res.send(data.body);
        } else {
          console.log(2);
          res.send(data);
        }
      })
      .catch((error) => {
        res.send(error);
      });
  });

  hydraExpress.registerRoutes({
    '': api
  });
});
