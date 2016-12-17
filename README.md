# think-css-preprocess

[![Build Status](https://travis-ci.org/XGHeaven/think-css-preprocess.svg?branch=master)](https://travis-ci.org/XGHeaven/think-css-preprocess)

### Install

```javascript
npm install think-css-preprocess --save
```

### How to use

add middleware to your project

```javascript
// in src/common/bootstrap/middleware.js
const think_css_preprocess = require('think-css-preprocess').default;
think.middleware('css-preprogress', think_css_preprocess);
```

add hook to your project

```javascript
// in src/common/config/hook.js
export default {
  resource: ['prepend', 'css-preprocess']
}
```

### Config

The config file must be named `css-preprocess` in `src/common/config`.

The default config if there no `css-preprocess.js` file as follow

```javascript
export default {
  path: undefined
}
```

#### path

Determine where to find stylus/less/sass file.

FORMAT: `path: [String | Array[String]]`

If `path` omitted, it find file in same directory as css file placed.

For example: You request uri `/static/css/index.css`, it will search `index.{styl|less|sass}` file in `/static/css` folder.

removed in v0.2.0
~~If `path` is `string`, it will search file in `/static/${path}/${resource_path}`.~~

~~For example:~~
~~* `path='stylus'`, `/static/css/index/index.css` -> `/static/stylus/index/index.{styl|less|sass}`~~
~~* `path='stylus/new'`, `/static/css/index/index.css` -> `/static/stylus/new/index.{styl|less|sass}`~~

If `path` is `array[array[string]]` with follow format:

```
[[src, dest], [src, dest], ...]
```

* `src` source folder
* `dest` dest folder

```
[['stylus', 'css'], ['sass', 'css']]
'/static/stylus' -> '/static/css'
'/static/sass' -> '/static/css'
```

If `path` is `array[string]` and it's length must be 2. It just use first path to replace last path.

For example:
* `path=['stylus', 'css/index']`, `/static/css/index/index.css` -> `/static/stylus/index.css`

> If you use window, please use `/` not `\\` as sep

### Compile

You only add follow code in `bin/compile.js` for auto compile css

```js
var css_pre_process = require('think-css-preprocess');
css_pre_process.compile(RESOURCE_PATH, CONFIG).then(...);
```

### TODO
* [x] support cache in production mode
* [x] support compile in compile script
