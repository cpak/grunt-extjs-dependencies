/*globals Ext:false*/
Ext.define('MyApp.model.Base', {
	requires: 'MyApp.model.MyBase'
});


/*globals Ext:false*/
Ext.define('MyApp.model.MyModel', {
	extend: 'MyApp.model.Base'
});

Ext.define('MyApp.model.Require', {
	foobar: function () {
		var fakeName = 'MyApp.CannotRequire';
		Ext.require(fakeName);
		Ext.require('MyApp.Ext.require');
	}
});
