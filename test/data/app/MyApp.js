// Require some third party code
//@require ../vendor/mylib/mylib.js
Ext.application({
    name: 'MyApp',
    requires: [
    	'MyApp.controller.MyController',
    	'MyApp.store.MyStore',
    	'MyApp.view.MyViewport'
    ],
    mixins: { mixinc: 'MyApp.mixin.MixinC' }
});
