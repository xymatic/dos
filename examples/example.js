/*eslint-env node */
(function() {
    "use strict";
    var dos = require("../");
    var namespace = {};
    dos.$class(namespace, "module.path.MyFirstDOSClass", {
        // The $ denotes the class' body.
        $: function(This, Super, Static, Public, Protected, Private) {
            // Declare a private field called myMember
            Private.$field("myMember");
            // A public constructor taking an arbitrary amount of params as a Params object
            Public.$init(function(Params) {
                // Initializes the declared private field myMember with the contents of the required constructor argument myMember
                Private.myMember = Params.get("myMember");
            });
            // a destructor disposing of the private member myMember
            Public.$dispose(function() {
            });
            // A public method called myMethod taking no args and returning Private.myMember
            Public.$method("myMethod", function() {
                return Private.myMember;
            });
        }
    });
})();
