'use strict';
const path   = require('path');
const config = require(path.join(__dirname, 'lambda-config.json'));
const AWS    = require('aws-sdk');
const clc    = require('cli-color');
const moment = require('moment');

const cloudwatchlogs = new AWS.CloudWatchLogs({
  region: config.Region
});

const logGroupName = `/aws/lambda/${config.ConfigOptions.FunctionName}`;

let lastGettedLogTime = 0;

module.exports = class CwLogs {
  static printLogs(startTime) {
    let params = {
      logGroupName: logGroupName,
      descending: true,
      limit: 1,
      orderBy: 'LastEventTime'
    };
    cloudwatchlogs.describeLogStreams(params, function(err, data) {
      if (err) console.log(clc.red(err));
      else {
        let params = {
          logGroupName: logGroupName,
          logStreamName: data.logStreams[0].logStreamName,
          startTime: typeof startTime === 'undefined'? lastGettedLogTime : startTime
        };
        cloudwatchlogs.getLogEvents(params, function(err, data) {
          if (err) console.log(clc.red(err));
          else {
            if (data.events.length) {
              lastGettedLogTime = data.events[data.events.length - 1].timestamp + 1;

              data.events.map(event => {
                const timestamp   = moment(event.timestamp).format('DD/MM/YYYY hh:mm:ss:SSS');
                let   splitted    = event.message.split('\t');
                let   header      = splitted.shift().split(' ');
                let   message     = splitted.join(' ');
                let   preMessage  = '';

                switch (header[0].toUpperCase()){
                  case 'START':
                    preMessage = clc.magenta(header[0]);
                    break;

                  case 'END':
                    preMessage = clc.magenta(header[0]);
                    break;

                  case 'REPORT':
                    preMessage = clc.yellow(header[0]);
                    break;
                }

                console.log(clc.blue(timestamp), preMessage, message);
              });
            }
          }
        });
      }
    });
  }
};
