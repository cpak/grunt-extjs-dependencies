Ext.define('MyApp.model.Container', {
	extend: 'MyApp.model.Base',

	requires: [
		'MyApp.model.Leaf',
		'MyApp.ux.ReqA'
	]
});