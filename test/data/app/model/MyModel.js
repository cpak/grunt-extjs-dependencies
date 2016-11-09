/*globals Ext:false*/
Ext.define('MyApp.model.Base', {
	requires: 'MyApp.model.MyBase'
});


/*globals Ext:false*/
Ext.define('MyApp.model.MyModel', {
	extend: 'MyApp.model.Base'
});
