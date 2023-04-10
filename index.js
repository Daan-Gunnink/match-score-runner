// app.js
const path = require('path');
require('dotenv').config()

// required
const Bree = require('bree');
const bree = new Bree({
  jobs: [
    {
      name: 'fetch-countries',
      timeout: false,
      interval: 'at 13:40'
    },
    {
      name: 'fetch-leagues',
      timeout: false,
      interval: 'at 13:42'
    },
    {
      name: 'fetch-standings',
      timeout: false,
      interval: 'at 13:45'
    },
    {
      name: 'fetch-fixtures',
      interval: 'at 13:50'
    }
  
  ],
  errorHandler: (error, job) => {
    console.log('errorHandler', error, job);
  }
});


// start all jobs (this is the equivalent of reloading a crontab):
(async () => {
  await bree.start();
})();