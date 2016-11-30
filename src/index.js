'use strict';

import accord from 'accord';
import path from 'path';
import fs from 'fs';

const writeFile = think.promisify(fs.writeFile, fs);

export default class extends think.middleware.base {
  init(...args) {
    super.init(...args);
    this._compilerCaches = {};
    this._compilers = {
      stylus: '.styl',
      less: '.less',
      sass: '.sass'
    }
  }

  getCompiler(name) {
    if (!this._compilerCaches[name]) {
      this._compilerCaches[name] = accord.load(name);
    }
    return this._compilerCaches[name];
  }

  splitPath(p) {
    p = p.split('/');
    if (p[0] === '') p.shift();
    if (p[p.length-1] === '') p.pop();
    return p;
  }

  arrayHasPrefix(prefix, array) {
    for (let i=0; i<prefix.length; i++) {
      if (prefix[i] !== array[i]) {
        return false;
      }
    }
    return true;
  }

  getRelativeFilePath(ext) {
    let config = this.config('css_preprocess.path');
    let url = this.http.url;
    let dirs = this.splitPath(url);
    dirs.shift(); // remove 'static'
    if (think.isString(config)) {
      let nDirs = this.splitPath(config);
      // dirs include file, but nDirs not
      if (nDirs.length < dirs.length)
        dirs.splice(0, nDirs.length, ...nDirs);
    } else if (think.isArray(config) && config.length === 2) {
      let nDirs = this.splitPath(config[0]);
      let rDirs = this.splitPath(config[1]);
      if (this.arrayHasPrefix(rDirs, dirs))
        dirs.splice(0, rDirs.length, ...nDirs);
    }
    dirs.unshift('static');
    let pathInfo = path.parse(path.join(think.RESOURCE_PATH, ...dirs));
    pathInfo.ext = ext;
    delete pathInfo.base;
    return path.format(pathInfo);
  }

  async run() {
    let url = this.http.url;
    if (path.parse(url).ext !== '.css') {
      // only compiler css file
      return 'not css';
    }
    let oldFilePath = path.join(think.RESOURCE_PATH, url);
    for (let name in this._compilers) {
      let newFilePath = this.getRelativeFilePath(this._compilers[name]);
      if (
        !think.isFile(newFilePath) ||
        (think.env === 'production' && !this.newThanOld(newFilePath))) {
        continue;
      }
      try {
        let compiler = this.getCompiler(name);
        let output = await new Promise((resolve, reject) => {
          return compiler
          .renderFile(newFilePath)
          .done(res => resolve(res.result), err => reject(err))
        });
        await writeFile(oldFilePath, output);
        return;
      } catch (e) {
        this.http.status(500).end(e.message);
        if (think.env === 'testing') return;
        return think.prevent();
      }
    }
    return 'no match';
  }
}
