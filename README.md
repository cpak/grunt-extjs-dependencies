# extjs-dependencies

Uses [esprima](http://esprima.org) through [falafel](https://github.com/substack/node-falafel)
to figure out in what order to load your ExtJs app files.

Classes are exptected to be defined using 

	Ext.define('MyApp.package.ClassName', { /* Class def */ })	
Alternate class names are accepted via any of these methods

	alternateClassName: ['OtherClassName', 'ThisIsTheSameClass']
	
	alternateClassName: 'OtherClassName'

	//@alternateClassName MyApp.ShortHandClassName

Dependencies are calculated by looking for any of these comments and annotations:

	//@require MyApp.ClassName or path/to/file
	
	requires: ['MyApp.ClassName']
	
	extend: 'MyApp.SuperClassName'
		
	mixins: ['MyApp.MixinA', 'MyApp.MixinB'] or { mixina: 'MyApp.MixinA', mixinb: 'MyApp.MixinB' } 

In other words, `uses`, `views`, `models`, `controllers`,  `stores` is not supported.

And for sanity and simplicity, why not just stick to this pattern

	Ext.define('MyApp.tools.Sport', {
		extend: 'MyApp.tools.Base',
		requires: ['MyApp.util.Knife', 'MyApp.service.Spoon']
	});



**Note:** Running it against the ExtJs source does currently not work. This is because the dependency order in the ExtJs library relies on tags/annotations (e.g. `@tag`) other than the ones used in most ExtJs projects (e.g. `requires: […]`, `@require`). One solution is to use this module on your own project JS, and then include a suitable minified version of `ext-all.js`, either self-served or via a CDN. This is not optimal but also not a prioritized problem to solve.

## Example

	var extjsDependencies = require('./extjs-dependencies')({
	    excludeClassPattern: /^Dont\.want\.these\./,
	    includeFilePattern: /\.js$/,

	    rootDir: '/path/to/js/root/'
	});

	// Add dirs to "classpath". Passing false as the second argument
	// prevents parsing of the file. Parsing non-Ext files will just
	// end in confusion.

	extjsDependencies.addDir('vendor/', false);
	extjsDependencies.addDir('app/');

	// Resolve dependencies of "app.js" and concat files to output destination.

	extjsDependencies.build('app.js', '/path/to/output/app.js');


## TODO

-	Make configurable
-	Make grunt plugin
-	Add tests
-	Make async
-	Write docs
-	Tidy up
