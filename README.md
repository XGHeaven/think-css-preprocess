# think-css-preprocess

### Install

```javascript
npm install think-css-preprocess --save
```

### How to use

add middleware to your project

```javascript
// in src/common/bootstrap/middleware.js
const think_css_preprocess = require('think-css-preprocess');
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

If `path` is `string`, it will search file in `/static/${path}/${resource_path}`.

For example:
* `path='stylus'`, `/static/css/index/index.css` -> `/static/stylus/index/index.{styl|less|sass}`
* `path='stylus/new'`, `/static/css/index/index.css` -> `/static/stylus/new/index.{styl|less|sass}`

If `path` is `array[string]` and it's length must be 2. It just use first path to replace last path.

For example:
* `path=['stylus', 'css/index']`, `/static/css/index/index.css` -> `/static/stylus/index.css`

### TODO
* [ ] support cache in production mode
* [ ] support compile in compile script
