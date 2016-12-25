
# Intro
Hydra is a light-weight library for NodeJS designed with the goal of easily creating distributed applications - some of which happen to be microservices.

The core of Hydra allows you to create *services*; which consist of one or more instances (i.e. a *login service* could have 3 instances to handle many requests). It gives your services complex functionlity, such as:

 - **Service Presence:** Can you reach your service?
 - **service Discovery:** Locating services an obtaining their IP/port numbers.
 - **Load Balancing:** Balance requests to service between available instances.

Today, we are going to focus on the **service discovery** feature of Hydra by building 2 services, Ping-Service and Pong-Service, which can find and communicate with each other with very little code.

We will be using `Hydra-Express`; a tiny library that wraps express with Hydra functionlity.

# Setup
Hydra requires access to a [Redis](https://redis.io/) server. If you are not familar, Redis is an in-memory database which is most often used as a cache. The Hydra library leverages Redis to store information like what services are currently running, when they came online and their uptime.

There are many ways to obtain access to a Redis server, but for today I recommend signing up for a free tier at [RedisLabs](https://redislabs.com/).

If you want to know more about Redis, please check out this [video](https://www.youtube.com/watch?v=eX7EamF_WuA).

# Hydra Ping-Service
To get started let's create a new node project called **ping-service**:

```shell
$ mkdir ping-service
$ cd ping-service
$ npm init
$ npm install --save fwsp-hydra-express
```

In the **ping-service** directory, create a file named **index.js** and add the following code:

```javascript
const hydraExpress = require('fwsp-hydra-express');
let config = require('./config.json');

hydraExpress.init(config, () => {
  let express = hydraExpress.getExpress();
  let api = express.Router();

  api.get('/', (req, res) => {
    res.send(`Ping!`);
  });

  hydraExpress.registerRoutes({
    '': api
  });
});
```

At the start of our app we have imported Hydra-Express and also a config file which we'll take a look at soon.

We start our Hydra-Express app by using the *init* function, which takes in a configuration object and a callback that allows us to register routes.

We use express router to define a simple API endpoint and register it with The *hydraExpress.registerRoutes* function.

This brings us back to the **config.json** file. In order for Hydra-Express to run, it needs an object that has a few key pieces of information:

  - **serviceName:** allows other Hydra enabled services to locate this service/instance by name (instead of IP/port).
  - **serviceDescription:**
  - **servicePort:** tells Hydra what port to run our service on. If we set the port to `0`, Hydra will figure this out for us.
  - **redis:** specifies our connection info for ```Redis```.

 In the **ping-service** directory, create another file named **config.json** and add the following JSON:

```javascript
{
  "hydra": {
   "serviceName": "ping-service",
   "serviceDescription": "Ping Service",
   "servicePort": 3000,
   "redis": {
     "url": "redis-15988.c8.us-east-1-3.ec2.cloud.redislabs.com",
     "port": 100000
   }
  }
}
```

Let's run our Hydra Service by running `node index.js`. If we open our browser and access our app (`127.0.0.1:3000/`) we should something like this:

`Ping!`

The *service name* is very useful as it allows hydra services to communicate to each other without having to know the IP addresses or ports of each other. The *service Id* is a unique hash created by the Hydra library, allowing each of our services to have a unique identifier.

Let's add one more piece of code that allows our app to find talk to our yet to be launched `pong-service`:

```javascript
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
        res.send(data.body);
      } else {
        res.send(data);
      }
    })
    .catch((error) => {
      res.send(error);
    });
});
```

There's a lot going on in these few lines. *hydraExpress.getHydra()* allows our express app to
access core Hydra functions.  

Hydra itself uses UMF style (link to article) for message routing, so we create a message with the *to* field
in the form of *[service-name]:[HTTP VERB]*.

*hydra.makeAPIRequest()* does quite a few things besides taking in a message. It figures out what service the message is
intended to be sent to, figures out if it's available using Hydra's *presence* feature and either sends it to the service or returns a response saying it could not Locate it.

Save your app, restart the service and try to hit the new api `http://127.0.0.1:3333/send-ping`. You should see something similar to:

```
{
  "statusCode":503,
  "statusMessage":"Service Unavailable",
  "statusDescription":"The server is currently unable to handle the request due to a temporary overloading or maintenance of the server. The implication is that this is a temporary condition which will be alleviated after some delay",
  "result":{
    "reason":"Unavailable pong-service instances"
  }
}
```

# Hydra Pong-Service
Let's build a service for our `ping-service` to find. In a new terminal tab, create a new node project called **pong-service**:

```shell
$ mkdir pong-service
$ cd pong-service
$ npm init
$ npm install --save fwsp-hydra-express
```

In the **pong-service** directory, create a file named **index.js** and add the following code:

```javascript
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
```

Now, create a `config.json` file:
```javascript
{
  "hydra": {
   "serviceName": "pong-service",
   "serviceDescription": "Pong Service",
   "redis": {
     "url": "redis-15988.c8.us-east-1-3.ec2.cloud.redislabs.com",
     "port": 100000
   }
  }
}
```

Notice, how we left out the `servicePort`. Hydra will look at the services and ports running on that IP and figure out an appropriate port to run the service on.  start your service `node index.js`


# Results
As of now, you should have two node services running: **ping-service** running on port 3333 and
**ping-service** running on an unknown port.

If we go type in `http://127.0.0.1:3333/send-ping` into our browser we should be greeting with `Pong!`. Based on a service name, Hydra figured our new service and send it a message!


If we close our **pong-service** and try again we will see that Hydra find that our service is down and responds accordingly.
