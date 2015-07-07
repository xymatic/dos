dos.\$class($namespace, "$fully_qualified_class_name", {
#if( $extends != "") 
    extends: $extends,
#end
#if( $implements != "") 
    implements: $implements, 
#end
    static: function(This, Super, Public, Protected, Private) {
    },
    $: function(This, Super, Static, Public, Protected, Private) {
        Public.\$init(function(Defaults) {
            
        }, function(Params) {
            
        });
        
        Public.\$dispose(function() {
            
        });
    }
});
