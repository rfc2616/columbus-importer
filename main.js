var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.

var fs = require('fs');
var ipc = require('ipc');
var parse = require('csv-parse');
var uuid = require('uuid');

FOLDER = "/Volumes/COLUMBUS"

ipc.on('get_available_files', function(event, arg) {
  list = fs.readdirSync(FOLDER);
  _results = [];
  for (_i = 0, _len = list.length; _i < _len; _i++) {
    _results.push(list[_i]);
  }
  event.sender.send('has_available_files', _results);
});

ipc.on('import_file', function(event, file) {
  event.sender.send('import_progress', "Importing "+file);
  var guts = fs.readFileSync("" + FOLDER + "/" + file, 'utf8')
  event.sender.send('import_progress', "Importing "+file+" ("+(guts.split(/\r\n|\r|\n/).length)+" lines)");
  var feature_collection_all = {
    "type": "FeatureCollection",
    features: []
  };
  parse(guts,function(err,output){
    if(err){
      event.sender.send('import_progress', "Failed: "+err);
    } else {
      for (_i = 0, _len = output.length; _i < _len; _i++) {
        var row = output[_i];
        var e = {};
        e['tag'] = row[1];
        e['date'] = row[2];
        e['time'] = row[3];
        e['latitude'] = row[4];
        e['longitude'] = row[5];
        e['height'] = row[6];
        e['speed'] = row[7];
        e['heading'] = row[8];
        e['vox'] = row[9];
        if(e['tag'] == 'V' || e['tag'] == 'C'){
          var instance_uuid = uuid.v1();
          var name = 'Columbus Waypoint'
          if(e['tag'] == 'V') {
            name = 'Columbus Voice Memo'
          }
          float_coordinates = [];
          var long = e['longitude']
          if(long.match(/E/)){
            float_coordinates.push(parseFloat(long.replace(/[^0-9\.]+/g,'')));
          } else {
            float_coordinates.push(-parseFloat(long.replace(/[^0-9\.]+/g,'')));
          }
          var lat = e['latitude']
          if(lat.match(/N/)){
            float_coordinates.push(parseFloat(lat.replace(/[^0-9\.]+/g,'')));
          } else {
            float_coordinates.push(-parseFloat(lat.replace(/[^0-9\.]+/g,'')));
          }
          float_coordinates.push(-parseFloat(e['height']));
          var properties = {
            'meta': {
              instanceId: "uuid:" + instance_uuid,
              instanceName: name,
              formId: "monitoring_form_v1",
              version: 1.0,
              submissionTime: (e['date'] + e['time']),
              deviceId: 'Columbus V900'
            }
          }
          if(e['tag'] == 'V') {
            properties['voice_memo'] = e['vox'].replace("\u0000",'.WAV')
          }
          var geometry = {
            "type": "Point",
            "coordinates": float_coordinates
          };
          var feature = {
            "type": "Feature",
            "geometry": geometry,
            "properties": properties
          };
          feature_collection_all['features'].push(feature);
        } else {
          // we don't do anything with tracks yet
        }
      }
      var target = FOLDER + "/" + file.replace(/CSV/i, 'geojson')
      console.log(target)
      fs.writeFileSync(target, JSON.stringify(feature_collection_all, null, 4), 'utf8');
      event.sender.send('import_progress', "Imported "+file);
    }
  });
});

// Report crashes to our server.
require('crash-reporter').start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform != 'darwin') {
     app.quit();
  // }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600});

  // and load the index.html of the app.
  mainWindow.loadUrl('file://' + __dirname + '/index.html');

  // Open the DevTools.
  // mainWindow.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});
