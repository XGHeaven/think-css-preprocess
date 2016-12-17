'use strict';

import accord from 'accord';
import path from 'path';
import fs from 'fs';

const writeFile = think.promisify(fs.writeFile, fs);

export default class CSSPreProcess extends think.middleware.base {
  static configName = 'css-preprocess';
  static globFilter = ['static/**/*.styl', 'static/**/*.sass', 'static/**/*.less'];
  static compilers = {
    stylus: '.styl',
    less: '.less',
    sass: '.sass'
  };
  static compilerCaches = {};

  static splitPath(p) {
    p = p.split('/');
    if (p[0] === '') p.shift();
    if (p[p.length-1] === '') p.pop();
    return p;
  }

  static arrayHasPrefix(prefix, array) {
    for (let i=0; i<prefix.length; i++) {
      if (prefix[i] !== array[i]) {
        return false;
      }
    }
    return true;
  }

  static getCompiler(name) {
    if (!this.compilerCaches[name]) {
      this.compilerCaches[name] = accord.load(name);
    }
    return this.compilerCaches[name];
  }

  static replacePath(uri, replacer, ext, revert = false) {
    let dirs = CSSPreProcess.splitPath(uri);
    dirs.shift(); // remove 'static'
    if (think.isString(replacer)) {
      console.warn("path which string is removed. please use array instead");
      replacer = [];
    } else if (
      think.isArray(replacer) &&
      replacer.length === 2 &&
      think.isString(replacer[0]) &&
      think.isString(replacer[1])
    ) {
      replacer = [replacer];
    } else if (!think.isArray(replacer)) {
      replacer = [];
    }
    for (let rep of replacer) {
      if (!think.isArray(rep) || rep.length != 2) {
        continue;
      }
      let nDirs = CSSPreProcess.splitPath(rep[+revert]);
      let rDirs = CSSPreProcess.splitPath(rep[+!revert]);
      if (CSSPreProcess.arrayHasPrefix(rDirs, dirs))
        dirs.splice(0, rDirs.length, ...nDirs);
      break;
    }
    dirs.unshift('static');
    let pathInfo = path.parse(path.join(think.RESOURCE_PATH, ...dirs));
    pathInfo.ext = ext;
    delete pathInfo.base;
    return path.format(pathInfo);
  }

  init(...args) {
    super.init(...args);
  }

  getRelativeFilePath(ext) {
    let config = this.config(`${CSSPreProcess.configName}.path`);
    let url = this.http.url;
    return CSSPreProcess.replacePath(url, config, ext);
  }

  sourceNewDest(sourceFilePath, destFilePath) {
    if (!think.isFile(destFilePath)) {
      return true;
    }
    const sourceStats = fs.statSync(sourceFilePath);
    const destStat = fs.statSync(destFilePath);
    return sourceStats.mtime.getTime() > destStat.mtime.getTime();
  }

  async run() {
    let url = this.http.url;
    if (path.parse(url).ext !== '.css') {
      // only compiler css file
      return 'not css';
    }
    let destFilePath = path.join(think.RESOURCE_PATH, url);
    for (let name in CSSPreProcess.compilers) {
      let sourceFilePath = this.getRelativeFilePath(CSSPreProcess.compilers[name]);
      if (
        !think.isFile(sourceFilePath) ||
        (think.env === 'production' &&
        !this.sourceNewDest(sourceFilePath, destFilePath))) {
        continue;
      }
      try {
        let compiler = CSSPreProcess.getCompiler(name);
        let output = await new Promise((resolve, reject) => {
          return compiler
          .renderFile(sourceFilePath)
          .done(res => resolve(res.result), err => reject(err))
        });
        await writeFile(destFilePath, output);
        return;
      } catch (e) {
        this.http.status(500).end(e.message);
        if (think.env === 'testing') return;
        return think.prevent();
      }
    }
    return 'no match';
  }

  static async compile(resourcePath, config) {
    const readdir = require('readdir');
    const replacer = config.path;
    let promises = [];
    for (let name in CSSPreProcess.compilers) {
      const paths = readdir.readSync(resourcePath, [`static/**/*${CSSPreProcess.compilers[name]}`]);
      for (let p of paths) {
        promises.push(new Promise((res, rej) => {
          CSSPreProcess
          .getCompiler(name)
          .renderFile(path.join(resourcePath, p))
          .done(output => res(output.result), rej);
        }).then(function(data) {
          return writeFile(CSSPreProcess.replacePath(p, replacer, '.css', true), data);
        }).catch(function(){}));
      }
    }
    await Promise.all(promises);
  }
}
