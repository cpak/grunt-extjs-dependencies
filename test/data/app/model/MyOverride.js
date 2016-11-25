Ext.require('MyApp.AnotherRequire', function () {
	doSomething();
});

Ext.define('Ext.overrides.Component', {
	override: 'Ext.Component'
});
