Ext.define('MyApp.ux.ReqA', {
	extend: 'Ext.ux.SomeUxCls',
	mixins: {
		foo: 'Ext.mixin.Foo',
		bar: 'MyApp.mixin.Bar'
	}
});