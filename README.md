# grunt-extjs-dependencies

> Uses static analysis to figure out in what order to load your ExtJs app files.

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-extjs-dependencies --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-extjs-dependencies');
```

## The "extjs_dependencies" task

### Overview
The task scans files for `Ext.define` calls (as well as some other things), parses out dependencies and saves a copy of each file with any `requires: [...]` removed in a temp dir.

Paths will be preserved in the temp output, based on `rootDir` and realtive paths in `src`.

Make sure classes and dependencies are defined and declared in a manner the task understands, or bad things will happen! Read more [below](#details).

After the task has run, `extjs_dependencies_{TARGET NAME}` will contain the list of ordered dependencies. This can then be passed to `concat`, `uglify`, etc. See example below.

In your project's Gruntfile, add a section named `extjs_dependencies` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  extjs_dependencies: {
    options: {
      rootDir: 'path/to/js/project',
      src: [{ path: 'vendor/', parse: false }, 'app/'],
      excludeClasses: ['Ext.*', 'MyApp.some.Class'],
      skipParse: ['**/app/ux/SkipMe.js'],
      resolveFrom: 'MyApp.js'
    }
  },
})
```

### Options

#### options.rootDir
Type: `String`
Default value: `process.cwd()`

Sets the project root. This is used to calculate realtive paths when copying stripped files to the temp dir.

#### options.src
Type: `Array`

These paths will be added to the "classpath", meaning all contained files will be scanned for ExtJs class definitions, unless the `parse: false` option is passed.

Paths can be passed either as strings or as objects containing a `path` property and a `parse` boolean, indicating wether or not the task should try to extract class data from the contained files. Set this to false when adding non-Ext files to the classpath.

#### options.excludeClasses
Type: `Array`
Default: `['Ext.*']`

Array of `minimatch` patterns. Any found class names matching any of these patterns will be excluded from the classpath.

The default value excludes all Ext classes, since the task is biased towards loading e pre-build version of Ext (e.g. from Sencha's CDN).

#### options.skipParse
Type: `Array`
Default: `[]`

Array of file glob patterns. Any files matching any of these patterns will be excluded.

By default no files are excluded.

#### options.resolveFrom
Type: `String|Array`

One or more file or class names, or paths, from where to begin resolving depencies. This should probably be your app's entry point (e.g. `App.js`).


### Usage Examples

#### Default Options
The config below will add all JavaScript files in `./test/data/vendor` and `./test/data/app` to the classpath. Files under `./test/data/vendor` will not be parsed.

All Ext classes will be excluded, as well as the exact class `MyApp.mixin.Bar`.

Dependencies will be resolved from `MyApp.js`. `extjs_dependencies_dist` will contain the ordered dependency list, which can be passed to other tasks (e.g. `concat`).

```js
grunt.initConfig({
  extjs_dependencies: {
    dist: {
      options: {
        rootDir: './test/data',
        src: [{ path: 'vendor/', parse: false }, 'app/'],
        excludeClasses: ['Ext.*', 'MyApp.mixin.Bar'],
        resolveFrom: 'MyApp.js'
      }
    }
  },

  concat: {
    dist: {
      src: ['<%= extjs_dependencies_dist %>'],
      dest: 'dist/app.js'
    }
  }
})
```


## Details

Classes are exptected to be defined using

```js
Ext.define('MyApp.package.ClassName', { /* Class def */ })
```

Alternate class names are accepted via any of these methods

```js
alternateClassName: ['OtherClassName', 'ThisIsTheSameClass']

alternateClassName: 'OtherClassName'

//@alternateClassName MyApp.ShortHandClassName
```

Dependencies are calculated by looking for any of these comments and annotations:

```js
//@require MyApp.ClassName or path/to/file

requires: ['MyApp.ClassName']

uses: ['MyApp.ClassName']

extend: 'MyApp.SuperClassName'

mixins: ['MyApp.MixinA', 'MyApp.MixinB'] or { mixina: 'MyApp.MixinA', mixinb: 'MyApp.MixinB' }

models, views, controllers, stores: ['Users', 'MyApp.users.User']
```

**Note:** Running it against the ExtJs source does currently not work. This is because the dependency order in the ExtJs library relies on tags/annotations (e.g. `@tag`) other than the ones used in most ExtJs projects (e.g. `requires: […]`, `@require`). One solution is to run this task on your own project JavaScript files only, and include a suitable minified version of `ext-all.js`, either self-served or via a CDN. This is not optimal but also not a prioritized problem to solve.

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## TODO
- Use more of grunt's built-in file utils
- Reverse direction when walking AST
- include/exclude patterns
- Extract script tags from HTML, and maybe replace them with URL of concatenated files
