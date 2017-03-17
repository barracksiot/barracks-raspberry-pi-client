#!/usr/bin/env node

var Barracks = require('barracks-sdk');
var config = require('./config');
var unzip = require('unzip');
var spawn = require('child_process').spawn;
var fs = require('fs');

var barracks = new Barracks(config.barracks);

function saveCurrentVersion(version) {
  return new Promise(function (resolve, reject) {
    fs.writeFile('/etc/currentVersion', version, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function getCurrentVersion() {
  return new Promise(function (resolve, reject) {
    fs.readFile('/etc/currentVersion', function (err, content) {
      if (err) {
        reject(err);
      } else {
        resolve(content.toString());
      }
    });
  });
}

function installUpdate(file) {
  return new Promise(function (resolve, reject) {
    fs.createReadStream(file)
      .pipe(unzip.Extract({ path: '/tmp/update' }))
      .on('close', function ()
       {
        var updateSh = spawn('sh', [ 'update.sh' ], {
          cwd: '/tmp/update',
          env: Object.assign({}, process.env, { PATH: process.env.PATH + ':/usr/local/bin' })
        });
        updateSh.stdout.on('data', function (data) {
          console.log('stdout: ' + data);
        });
        updateSh.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
        });
        updateSh.on('close', function (code) {
          console.log('closing code: ' + code);
          if (code === 0) {
            resolve();
          } else {
            reject('Update script returned non zero code: ' + code);
          }
        });
      });
  });
}

var inProgress;

function checkUpdate() {
  if (!inProgress) {
    inProgress = true;
    var newVersion;
    var skip = false;
    console.log('Checking for update...');
    getCurrentVersion().then(function (version) {
      console.log('Current version is ' + version);
      return barracks.checkUpdate(version);
    }).then(function (update) {
      if (update) {
        newVersion = update.versionId;
        console.log('The new version '+ newVersion + ' is available!');
        return update.download();
      } else {
        console.log('No update available');
        skip = true;
      }
    }).then(function (file) {
      if (!skip) {
        console.log('Update downloaded. Installing...');
        return installUpdate(file);
      }
    }).then(function () {
      if (!skip) {
        console.log('Install successful. Updating current version...');
        return saveCurrentVersion(newVersion);
      }
    }).then(function () {
      inProgress = false;
      if (!skip) {
        console.log('New version ' + newVersion + ' has been installed');
        checkUpdate();
      }
      
    }).catch(function (err) {
      console.log('Error during update: ' + JSON.stringify(err));
      inProgress = false;
    });
  }
}

checkUpdate();

setInterval(checkUpdate, config.pingInterval);