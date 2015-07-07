dos.\$static($namespace, "$fully_qualified_class_name", {
#if( $extends != "") 
    extends: $extends,
#end
#if( $implements != "") 
    implements: $implements, 
#end
    static: function(This, Super, Public, Protected, Private) {
    }
});
