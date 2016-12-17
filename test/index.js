var assert = require('assert');
var path = require('path');
var fs = require('fs');
var http = require('http');
var touch = require('touch');

var rimraf = require('rimraf');

var thinkjs = require('thinkjs');
var instance = new thinkjs({
  RESOURCE_PATH: __dirname + '/resource/'
});
instance.load();
think.env = 'testing';

var Class = require('../lib/index.js').default;

var getHttp = function(url, options) {
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
  res.write = function() {
    return true;
  };

  return think.http(req, res).then(function(http) {
    if(options) {
      for(var key in options) {
        http[key] = options[key];
      }
    }
    return http;
  })
};

var execMiddleware = function(url, options) {
  return getHttp(url, options).then(function(http) {
    var instance = new Class(http);
    return instance.run().then(() => http)
  })
};

var execMiddlewareForResult = function(url, options) {
  return getHttp(url, options).then(function(http) {
    var instance = new Class(http);
    return instance.run()
  })
};

describe('core.replacePath', function() {
  it('undefined config', function() {
    assert.equal(
      Class.replacePath('/static/stylus/index.css', undefined, '.styl'),
      think.RESOURCE_PATH + 'static/stylus/index.styl'
    );
    assert.equal(
      Class.replacePath('/static/stylus/index.styl', undefined, '.css', true),
      think.RESOURCE_PATH + 'static/stylus/index.css'
    );
  });

  it('array config', function() {
    assert.equal(
      Class.replacePath('/static/stylus/index.css', ['target', 'stylus'], '.styl'),
      think.RESOURCE_PATH + 'static/target/index.styl'
    );
    assert.equal(
      Class.replacePath('/static/target/index.styl', ['target', 'stylus'] , '.css', true),
      think.RESOURCE_PATH + 'static/stylus/index.css'
    );
  })
});

describe('default compile', function() {
  it('compile stylus', function() {
    return execMiddleware('/static/stylus/index.css').then(function(http) {
      assert.ok(think.isFile(think.RESOURCE_PATH + 'static/stylus/index.css'));
    });
  });

  it('not css file', function() {
    return execMiddlewareForResult('/static/img/index.png').then(function(result) {
      assert.equal(result, 'not css');
    });
  });

  it('no match file to compile', function() {
    return execMiddlewareForResult('/static/css/index.css').then(function(result) {
      assert.equal(result, 'no match');
    });
  });

  afterEach(function() {
    rimraf.sync(think.RESOURCE_PATH + 'static/**/*.css');
  });
});

describe('compile css file in different path through set config', function() {
  it('path = array', function() {
    return execMiddleware('/static/target/index.css', {
      _config: {
        'css-preprocess': {
          path: ['source1', 'target']
        }
      }
    }).then(function(http) {
      assert.ok(
        think.isFile(think.RESOURCE_PATH + 'static/target/index.css'),
        'file not create in static/target'
      );
    });
  });

  it('path = array with multi dir', function() {
    return execMiddleware('/static/target/target1/index.css', {
      _config: {
        'css-preprocess': {
          path: ['source1', 'target/target1']
        }
      }
    }).then(function(http) {
      assert.ok(
        think.isFile(think.RESOURCE_PATH + 'static/target/target1/index.css'),
        'file not create in static/target/target1'
      );
    });
  });

  it('path = array<array>', function() {
    return execMiddleware('/static/target/target1/index.css', {
      _config: {
        'css-preprocess': {
          path: [['source1', 'target/target1']]
        }
      }
    }).then(function(http) {
      assert.ok(
        think.isFile(think.RESOURCE_PATH + 'static/target/target1/index.css'),
        'file not create in static/target/target1'
      );
    });
  });

  afterEach(function() {
    rimraf.sync(think.RESOURCE_PATH + 'static/**/*.css');
  });
});

describe('compile error', function() {
  it('stylus syntax error', function() {
    return execMiddleware('/static/source2/index.css').then(function(http) {
      assert.equal(http.res.statusCode, 500);
      assert.ok(
        !think.isFile(think.RESOURCE_PATH + 'static/source2/index.css'),
        'should not create file in static/source2/'
      );
    });
  });
});

describe('production mode', function() {
  before(function() {
    think.env = 'production';
  });

  it('compile when source new', function() {
    return execMiddleware('/static/target/index.css', {
      _config: {
        'css-preprocess': {
          path: ['source1', 'target']
        }
      }
    }).then(function(http) {
      assert.ok(
        think.isFile(think.RESOURCE_PATH + 'static/target/index.css'),
        'file not create in static/target'
      );
      touch.sync(think.RESOURCE_PATH + 'static/source1/index.styl', {
        mtime: true
      });
      rimraf.sync(think.RESOURCE_PATH + 'static/target/index.css');
      return execMiddleware('/static/target/index.css', {
        _config: {
          'css-preprocess': {
            path: ['source1', 'target']
          }
        }
      });
    }).then(function() {
      assert.ok(
        think.isFile(think.RESOURCE_PATH + 'static/target/index.css'),
        'file not create when source file updated'
      );
    })
  });

  afterEach(function() {
    rimraf.sync(think.RESOURCE_PATH + 'static/**/*.css');
  });

  after(function() {
    think.env = 'testing';
  });
});

describe('compile script', function() {
  before(function() {
    rimraf.sync(think.RESOURCE_PATH + 'static/**/*.css');
  });

  it('compile all file', function() {
    return Class.compile(think.RESOURCE_PATH, {
      path: ['source1', 'target']
    }).then(function() {
      assert.ok(
        think.isFile(think.RESOURCE_PATH + 'static/target/index.css'),
        'file not create when compile in target'
      );
      assert.ok(
        think.isFile(think.RESOURCE_PATH + 'static/stylus/index.css'),
        'file not create when compile in stylus'
      );
      assert.ok(
        !think.isFile(think.RESOURCE_PATH + 'static/source1/index.css'),
        'file create when compile in source1'
      );
      assert.ok(
        !think.isFile(think.RESOURCE_PATH + 'static/source2/index.css'),
        'file create when compile in source2'
      );
    })
  });

  after(function() {
    rimraf.sync(think.RESOURCE_PATH + 'static/**/*.css');
  });
});
