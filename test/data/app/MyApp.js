/*globals Ext:false*/
// Require some third party code
//@require ../vendor/mylib/mylib.js
Ext.application({
    name: 'MyApp',
    requires: [
        'MyApp.store.MyStore',
        'MyApp.view.MyViewport'
    ],

    mixins: { mixinc: 'MyApp.mixin.MixinC' },
    
    controllers: ['MyController'],

    views: ['Main', 'details.Details']
});
