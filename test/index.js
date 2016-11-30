var assert = require('assert');
var path = require('path');
var fs = require('fs');
var http = require('http');

var rimraf = require('rimraf');

var thinkjs = require('thinkjs');
var instance = new thinkjs({
  RESOURCE_PATH: __dirname + '/resource/'
});
instance.load();
think.env = 'testing';

var Class = require('../lib/index.js').default;

var getHttp = function(url, options){
  var req = new http.IncomingMessage();
  req.headers = {
    'host': 'www.thinkjs.org',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit',
  };
  req.method = 'GET';
  req.httpVersion = '1.1';
  req.url = url;
  var res = new http.ServerResponse(req);
  res.write = function(){
    return true;
  };

  return think.http(req, res).then(function(http){
    if(options){
      for(var key in options){
        http[key] = options[key];
      }
    }
    return http;
  })
};

var execMiddleware = function(url, options){
  return getHttp(url, options).then(function(http){
    var instance = new Class(http);
    return instance.run().then(() => http)
  })
};


describe('think-css-preprocess', function(){
  it('compile stylus', function(done){
    Promise.resolve().then(function(){
      execMiddleware('/static/stylus/index.css').then(function(http) {
        assert.ok(think.isFile(think.RESOURCE_PATH + 'static/stylus/index.css'));
        done();
      }).catch(err => done(err));
    });
  });

  afterEach(function() {
    rimraf.sync(think.RESOURCE_PATH + 'static/**/*.css');
  });
});

describe('compile css file in different path through set config', function() {
  it('path = string', function(done) {
    Promise.resolve().then(function() {
      execMiddleware('/static/target/index.css', {
        _config: {
          css_preprocess: {
            path: 'source1'
          }
        }
      }).then(function(http) {
        assert.ok(
          think.isFile(think.RESOURCE_PATH + 'static/target/index.css'),
          'file not create in static/target'
        );
        done()
      }).catch(err => done(err));
    });
  });

  it('path = array', function(done) {
    Promise.resolve().then(function() {
      execMiddleware('/static/target/target1/index.css', {
        _config: {
          css_preprocess: {
            path: ['source1', 'target/target1']
          }
        }
      }).then(function(http) {
        assert.ok(
          think.isFile(think.RESOURCE_PATH + 'static/target/target1/index.css'),
          'file not create in static/target/target1'
        );
        done();
      }).catch(err => done(err));
    });
  });

  afterEach(function() {
    rimraf.sync(think.RESOURCE_PATH + 'static/**/*.css');
  });
});
