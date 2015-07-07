/*eslint-env node, browser */
/*eslint no-underscore-dangle: 0, camelcase: 0, no-use-before-define: 0, no-shadow: 0, no-unused-vars: 0, new-cap: 0 */
"use strict";
var dos = require("../");
var test = require("tape");

test("should define core functions", function(t) {
    t.notStrictEqual(dos, undefined, "defines dos");
    t.equal(typeof dos.__dos_Class, "function", "defines __dos_Class");
    t.equal(typeof dos.$class, "function", "defines $class");
    t.equal(typeof dos.$abstract, "function", "defines $abstract");
    t.equal(typeof dos.$exception, "function", "defines $exeption");
    t.equal(typeof dos.$root, "function", "defines $root");
    t.equal(typeof dos.$static, "function", "defines $static");
    t.equal(typeof dos.$allocator, "function", "defines $allocator");
    t.equal(typeof dos.$deinit, "function", "defines $deinit");
    t.equal(typeof dos.ClassDefException, "function", "defines ClassDefException");
    t.equal(typeof dos.ClassInstanceException, "function", "defines ClassInstanceException");
    t.end();
});

test("should have class factory function param validation", function(t) {
    t.throws(function() {
        dos.__dos_Class(undefined);
    }, Error, "should not accept undefined as param");
    t.throws(function() {
        dos.__dos_Class("string", "string");
    }, Error, "should not accept two strings as param");
    t.throws(function() {
        dos.__dos_Class(10);
    }, Error, "should not accept a number as param");
    t.throws(function() {
        dos.__dos_Class(true);
    }, Error, "should not accept a boolean as param");
    t.throws(function() {
        dos.__dos_Class({});
    }, Error, "should not accept an object as param");
    t.throws(function() {
        dos.__dos_Class("");
    }, Error, "should not accept an empty string as param");
    t.throws(function() {
        dos.__dos_Class("1.blah");
    }, Error, "should not accept a namespace starting with a numeral");
    t.throws(function() {
        dos.__dos_Class("#");
    }, Error, "should not accept a string consisting only of \"#\"");
    t.end();
});

test("should allow simple class definitions", function(t) {
    var nsOuterClass = {};
    var OuterClass = dos.$class(nsOuterClass, "OuterClass", {
        static: function(This, Super, Public, Protected, Private) {
            Private.$class("InnerClass", {
                static: function(This, Super, Public, Protected, Private) {
                    Public.$const("constantStorage", {
                        value: 3000
                    });
                },
                $: function(This, Super, Static, Public, Protected, Private) {
                    // nothing here
                }
            });
            Public.$class("PublicInnerClass", {
                $: function(This, Super, Static, Public, Protected, Private) {
                    // nothing here
                }
            });
        },
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$field("staticInnerClassDefInstance");
            Public.$init(function(Params) {
                Public.staticInnerClassDefInstance = new Static.Private.InnerClass();
            });
            Public.$method("getStaticPrivateInnerConst", function() {
                return Static.Private.InnerClass.constantStorage;
            });
        }
    });

    var x = new OuterClass();
    t.strictEqual(x.staticInnerClassDefInstance.className, "OuterClass.InnerClass", "should generate correct private inner className in RTTI");
    t.strictEqual(x.getStaticPrivateInnerConst(), 3000, "should have working methods");
    t.strictEqual(OuterClass.PublicInnerClass.className, "OuterClass.PublicInnerClass", "should generate correct public innner className in RTTI");

    var nsComparable = {};
    var Comparable = dos.$interface(nsComparable, "Comparable", {
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$method("compareTo");
            // TODO: make more explicit tests
        }
    });

    var nsCompareInterfaceTestNoImplement = {};
    var CompareInterfaceTestNoImplement = dos.$class(nsCompareInterfaceTestNoImplement, "CompareInterfaceTestNoImplement", {
        implements: [Comparable],
        $: function(This, Super, Static, Public, Protected, Private) {}
    });


    var nsCompareInterfaceTestImplement = {};
    var CompareInterfaceTestImplement = dos.$class(nsCompareInterfaceTestImplement, "CompareInterfaceTestImplement", {
        implements: [Comparable],
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$method("compareTo", function() {});
        }
    });

    var noop = new CompareInterfaceTestImplement();

    t.throws(function() {
        var noop = new CompareInterfaceTestNoImplement();
    }, Error, "should throw on not completely implemented interface");


    var nsGetterInterface = {};
    var GetterInterface = dos.$interface(nsGetterInterface, "GetterInterface", {
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$getter("getter");
        }
    });

    var nsSetterInterface = {};
    var SetterInterface = dos.$interface(nsSetterInterface, "SetterInterface", {
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$setter("setter");
        }
    });

    var nsGetterAndSetterInterface = {};
    var GetterAndSetterInterface = dos.$interface(nsGetterAndSetterInterface, "GetterAndSetterInterface", {
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$getter("getset");
            Public.$setter("getset");
        }
    });

    var nsMethodInterface = {};
    var MethodInterface = dos.$interface(nsMethodInterface, "MethodInterface", {
        static: function(This, Super, Public, Protected, Private) {
            Public.$const("constantField", {
                value: 100
            });
        },
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$method("method");
        }
    });

    var nsImplementGetterSetterMethodInterface = {};
    var ImplementGetterSetterMethodInterface = dos.$class(nsImplementGetterSetterMethodInterface, "ImplementGetterSetterMethodInterface", {
        implements: [GetterInterface, SetterInterface, MethodInterface],
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$init(function(Params) {});
            Public.$getter("getter", function() {});
            Public.$setter("setter", function() {});
            Public.$method("method", function() {});
        }
    });

    var nsImplementGetterSetterMethodInterfaceMissingGetter = {};
    var ImplementGetterSetterMethodInterfaceMissingGetter = dos.$class(nsImplementGetterSetterMethodInterfaceMissingGetter, "ImplementGetterSetterMethodInterfaceMissingGetter", {
        implements: [GetterInterface, SetterInterface, MethodInterface],
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$init(function(Params) {});
            Public.$setter("setter", function() {});
            Public.$method("method", function() {});
        }
    });

    var nsImplementGetterSetterMethodInterfaceMissingSetter = {};
    var ImplementGetterSetterMethodInterfaceMissingSetter = dos.$class(nsImplementGetterSetterMethodInterfaceMissingSetter, "ImplementGetterSetterMethodInterfaceMissingSetter", {
        implements: [GetterInterface, SetterInterface, MethodInterface],
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$init(function(Params) {});
            Public.$getter("getter", function() {});
            Public.$method("method", function() {});
        }
    });

    var nsImplementGetterSetterMethodInterfaceMissingMethod = {};
    var ImplementGetterSetterMethodInterfaceMissingMethod = dos.$class(nsImplementGetterSetterMethodInterfaceMissingMethod, "ImplementGetterSetterMethodInterfaceMissingMethod", {
        implements: [GetterInterface, SetterInterface, MethodInterface],
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$init(function(Params) {});
            Public.$getter("getter", function() {});
            Public.$setter("setter", function() {});
        }
    });

    var nsImplementGetterAndSetterInterface = {};
    var ImplementGetterAndSetterInterface = dos.$class(nsImplementGetterAndSetterInterface, "ImplementGetterAndSetterInterface", {
        implements: [GetterAndSetterInterface],
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$init(function(Params) {});
            Public.$getter("getset", function() {});
            Public.$setter("getset", function() {});
        }
    });

    var nsImplementGetterAndSetterInterfaceWithMethod = {};
    var ImplementGetterAndSetterInterfaceWithMethod = dos.$class(nsImplementGetterAndSetterInterfaceWithMethod, "ImplementGetterAndSetterInterfaceWithMethod", {
        implements: [GetterAndSetterInterface],
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$init(function(Params) {});
            Public.$method("getset", function() {});
        }
    });

    var nsImplementGetterAndSetterInterfaceMissingGetter = {};
    var ImplementGetterAndSetterInterfaceMissingGetter = dos.$class(nsImplementGetterAndSetterInterfaceMissingGetter, "ImplementGetterAndSetterInterfaceMissingGetter", {
        implements: [GetterAndSetterInterface],
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$init(function(Params) {});
            Public.$setter("getset", function() {});
        }
    });

    var nsImplementGetterAndSetterInterfaceMissingSetter = {};
    var ImplementGetterAndSetterInterfaceMissingSetter = dos.$class(nsImplementGetterAndSetterInterfaceMissingSetter, "ImplementGetterAndSetterInterfaceMissingSetter", {
        implements: [GetterAndSetterInterface],
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$init(function(Params) {});
            Public.$getter("getset", function() {});
        }
    });



    t.throws(function() {
        var noop = new ImplementGetterSetterMethodInterfaceMissingGetter();
    }, Error, "should throw on partly implemented interface missing a getter");
    t.throws(function() {
        var noop = new ImplementGetterSetterMethodInterfaceMissingSetter();
    }, Error, "should throw on partly implemented interface missing a setter");
    t.throws(function() {
        var noop = new ImplementGetterSetterMethodInterfaceMissingMethod();
    }, Error, "should throw on partly implemented interface missing a method");
    t.throws(function() {
        var noop = new ImplementGetterAndSetterInterfaceWithMethod();
    }, Error, "should throw on wrongly implemented interface using a method as getter/setter");
    t.throws(function() {
        var noop = new ImplementGetterAndSetterInterfaceMissingGetter();
    }, Error, "should throw on partly implemented getter/setter interface missing a getter");
    t.throws(function() {
        var noop = new ImplementGetterAndSetterInterfaceMissingSetter();
    }, Error, "should throw on partly implemented getter/setter interface missing a setter");

    t.strictEqual(MethodInterface.constantField, 100, "should have working constant fields");
    x = new ImplementGetterSetterMethodInterface();
    t.true(x.instanceof(ImplementGetterSetterMethodInterface), "should have working instanceof");
    t.true(x.implements(GetterInterface), "should have working implements (1/3)");
    t.true(x.implements(SetterInterface), "should have working implements (2/3)");
    t.true(x.implements(MethodInterface), "should have working implements (3/3)");

    var y = new ImplementGetterAndSetterInterface();
    t.true(y.instanceof(ImplementGetterAndSetterInterface), "should have working instanceof");
    t.true(y.implements(GetterAndSetterInterface), "should have working implements");
    t.end();
});

test("should allow for interface inheritance", function(t) {

    var nsSomeBaseInterface = {};
    var SomeBaseInterface = dos.$interface(nsSomeBaseInterface, "SomeBaseInterface", {
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$method("baseMethod");
        }
    });

    var nsPotentialInterfaceBaseClass = {};
    var PotentialInterfaceBaseClass = dos.$class(nsPotentialInterfaceBaseClass, "PotentialInterfaceBaseClass", {
        $: function(This, Super, Static, Public, Protected, Private) {}
    });

    // possible to inherit interface from interface
    var nsSomeDerivedInterface = {};
    var SomeDerivedInterface = dos.$interface(nsSomeDerivedInterface, "SomeDerivedInterface", {
        extends: SomeBaseInterface,
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$method("derivedMethod");
        }
    });

    // not possible to inherit interfaces from class
    t.throws(function() {
        var nsSomeDerivedInterfaceFromClass = {};
        var SomeDerivedInterfaceFromClass = dos.$interface(nsSomeDerivedInterfaceFromClass, "SomeDerivedInterfaceFromClass", {
            extends: PotentialInterfaceBaseClass,
            $: function(This, Super, Static, Public, Protected, Private) {
                Public.$method("baseMethod");
            }
        });
    }, Error, "should not be able to inherit interfaces from class");

    // implement only derived interface to see whether the derived interfaces work.
    var nsImplementDerivedInterfaces = {};
    var ImplementDerivedInterfaces = dos.$class(nsImplementDerivedInterfaces, "ImplementDerivedInterfaces", {
        implements: [SomeDerivedInterface],
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$method("derivedMethod", function() {
                return 42;
            });
        }
    });
    t.throws(function() {
        var noop = new ImplementDerivedInterfaces();
    }, Error, "should have working derived interfaces");

    // implement derived and base interface to see whether the  interfaces work.
    var nsImplementBaseAndDerivedInterfaces = {};
    var ImplementBaseAndDerivedInterfaces = dos.$class(nsImplementBaseAndDerivedInterfaces, "ImplementBaseAndDerivedInterfaces", {
        implements: [SomeDerivedInterface],
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$method("derivedMethod", function() {
                return 42;
            });
            Public.$method("baseMethod", function() {
                return 23;
            });
        }
    });
    var x = new ImplementBaseAndDerivedInterfaces();
    t.equal(x.derivedMethod(), 42, "should have working derived/base interface implementation (1/2)");
    t.equal(x.baseMethod(), 23, "should have working derived/base interface implementation (2/2)");
    t.end();
});

test("should support instanciation of Type in static of Type", function(t) {
    var nsSameTypeInStatic = {};
    dos.$class(nsSameTypeInStatic, "SameTypeInStatic", {
        static: function(This, Super, Public, Protected, Private) {
            Public.$method("staticMethod", function() {
                return Public.EASY;
            });
            // TODO: (new SameTypeInStatic()).dispose()
            Public.$const("EASY", {
                value: new nsSameTypeInStatic.SameTypeInStatic()
            });
            Public.$const("ADVANCED", {
                value: new nsSameTypeInStatic.SameTypeInStatic({
                    advanced: new nsSameTypeInStatic.SameTypeInStatic()
                })
            });
            Public.$const("ULTRA_ADVANCED", {
                value: new nsSameTypeInStatic.SameTypeInStatic({
                    a: null,
                    advanced: new nsSameTypeInStatic.SameTypeInStatic({
                        x: [null, null, undefined, {},
                            0, "bleh", NaN, false, []
                        ],
                        y: {
                            a: "bleh",
                            b: 0,
                            c: false,
                            d: null,
                            e: NaN,
                            f: {}
                        },
                        b: null,
                        advanced: new nsSameTypeInStatic.SameTypeInStatic()
                    })
                })
            });
        },
        $: function(This, Super, Static, Public, Protected, Private) {
            Private.$field("easy", {
                getter: Public
            });
            Private.$field("advanced", {
                getter: Public
            });
            Public.$init(function(Params) {
                Private.easy = Static.Public.staticMethod();
                Private.advanced = Params.getOptionalType("advanced", nsSameTypeInStatic.SameTypeInStatic);
            });
        }
    });
    var x = new nsSameTypeInStatic.SameTypeInStatic();
    t.equal(x.easy, nsSameTypeInStatic.SameTypeInStatic.EASY, "should support simple Type instanciations in static of Type");
    t.equal(nsSameTypeInStatic.SameTypeInStatic.ADVANCED.advanced.easy, nsSameTypeInStatic.SameTypeInStatic.EASY, "should support nested Type instanciations in static of Type");
    t.equal(nsSameTypeInStatic.SameTypeInStatic.ULTRA_ADVANCED.advanced.advanced.easy, nsSameTypeInStatic.SameTypeInStatic.EASY, "should support deeply nested, complex Type instanciations in static of Type");
    t.end();
});

test("should support nested classes", function(t) {
    var nsNestedInnerClasses = {};
    dos.$class(nsNestedInnerClasses, "NestedInnerClasses", {
        static: function(This, Super, Public, Protected, Private) {
            Public.$class("Inner1", {
                static: function(This, Super, Public, Protected, Private) {
                    Public.$class("Inner2", {
                        static: function(This, Super, Public, Protected, Private) {
                            Public.$class("Inner3", {
                                static: function(This, Super, Public, Protected, Private) {
                                    Public.$class("Inner4", {
                                        static: function(This, Super, Public, Protected, Private) {
                                            Public.$class("Inner5", {
                                                static: function(This, Super, Public, Protected, Private) {
                                                    Public.$const("EASY", {
                                                        value: new nsNestedInnerClasses.NestedInnerClasses.Inner1.Inner2.Inner3.Inner4.Inner5()
                                                    });
                                                },
                                                $: function(This, Super, Static, Public, Protected, Private) {
                                                    Public.$field("someValue");
                                                    Public.$init(function(Params) {
                                                        Public.someValue = 9001;
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
    var noop = new nsNestedInnerClasses.NestedInnerClasses();
    t.equal(nsNestedInnerClasses.NestedInnerClasses.Inner1.Inner2.Inner3.Inner4.Inner5.EASY.someValue, 9001, "should allow instanciation and access of deeply nested classes");
    t.end();
});

test("should support inner class hiding", function(t) {
    var nsOuterClassBase = {};
    var OuterClassBase = dos.$class(nsOuterClassBase, "OuterClassBase", {
        static: function(This, Super, Public, Protected, Private) {
            Public.$abstract("Inner", {});
        },
        $: function(This, Super, Static, Public, Protected, Private) {}
    });

    var nsOuterClassDerived = {};
    var OuterClassDerived = dos.$class(nsOuterClassDerived, "OuterClassDerived", {
        extends: OuterClassBase,
        static: function(This, Super, Public, Protected, Private) {
            Public.$class("Inner", {
                extends: OuterClassBase.Inner,
                $: function(This, Super, Static, Public, Protected, Private) {}
            });
        },
        $: function(This, Super, Static, Public, Protected, Private) {
            Private.$field("innerInstance", {
                getter: Public
            });
            Public.$init(function(Params) {
                Private.innerInstance = new Static.Public.Inner();
            });
        }
    });

    var x = new OuterClassDerived();
    t.true(x.innerInstance.instanceof(OuterClassBase.Inner), "instanceof should return true for inner base class");
    t.true(x.innerInstance.instanceof(OuterClassDerived.Inner), "instanceof should return true for inner derived class");
    t.end();

});

/*
    test("should support static polymorphism", function(t) {
        var nsStaticCounter = {};
 var StaticCounter = dos.$class(nsStaticCounter, "StaticCounter", {
            static: function(This, Super, Public, Protected, Private) {
                Public.$field("id");
                Public.$init(function() {
                    console.log(Public.className);
                    console.log(Public);
                });
            },
            $: function(This, Super, Static, Public, Protected, Private) {
            }
        });

        var nsStaticCounter0 = {};
 var StaticCounter0 = dos.$class(nsStaticCounter0, "StaticCounter0", { extends: StaticCounter,
            static: function(This, Super, Public, Protected, Private) {
                Public.$init(function() {
                    Public.id = 10;
                    console.log(Public.className);
                    console.log(Public);
                });
            }
        });
        var nsStaticCounter1 = {};
 var StaticCounter1 = dos.$class(nsStaticCounter1, "StaticCounter1", { extends: StaticCounter });
        var nsStaticCounter2 = {};
 var StaticCounter2 = dos.$class(nsStaticCounter2, "StaticCounter2", { extends: StaticCounter });

        t.equal(StaticCounter0.id, 0);
        t.equal(StaticCounter1.id, 1);
        t.equal(StaticCounter2.id, 2);
    });
    */

test("should support static", function(t) {
    var nsSomeStaticBase = {};
    var SomeStaticBase = dos.$class(nsSomeStaticBase, "SomeStaticBase", {
        static: function(This, Super, Public, Protected, Private) {
            Protected.$field("val");
            Public.$init(function() {
                Protected.val = 42;
                //console.log(Protected);
            });
            Protected.$method("staticMethod", function(out) {
                return out || 42;
            });
            Protected.$method("getValue", function() {
                //console.log(Protected);
                return Protected.val;
            });
        },
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$method("accessStatic", function() {
                return Static.Protected.staticMethod();
            });
            Public.$method("getValue", function() {
                return Static.Protected.getValue();
            });
        }
    });

    var nsSomeStaticDerived = {};
    var SomeStaticDerived = dos.$class(nsSomeStaticDerived, "SomeStaticDerived", {
        extends: SomeStaticBase,
        static: function(This, Super, Public, Protected, Private) {
            Public.$init(function() {
                Protected.val = 20;
                Protected.bleh = 10;
                //console.log(Protected);
            });
            Protected.$method("staticMethod", function() {
                return Super.staticMethod(23);
            });
        },
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$method("accessStatic", function() {
                return Static.Protected.staticMethod();
            });
            Public.$method("getValue", function() {
                return Static.Protected.getValue();
            });
        }
    });


    var x = new SomeStaticBase();
    var y = new SomeStaticDerived();
    t.strictEqual(x.accessStatic(), 42, "should allow access to static members via public method in base class");
    t.strictEqual(y.accessStatic(), 23, "should allow access to static base members via public method in derived class");
    t.strictEqual(y.getValue(), 20, "should support static init overload in derived classes");
    t.strictEqual(x.getValue(), y.getValue(), "should share static of base with derived");
    t.end();
});

test("should support getter/setter", function(t) {
    var nsMyBaseWithManualGetterSetter = {};
    var MyBaseWithManualGetterSetter = dos.$class(nsMyBaseWithManualGetterSetter, "MyBaseWithManualGetterSetter", {
        $: function(This, Super, Static, Public, Protected, Private) {
            Private.$field("x");
            Public.$init(function(Params) {
                Private.x = Params.getOptionalType("x", dos.Types.Number);
            });
            Public.$setter("x", function(value) {
                Private.x = value;
            });
            Public.$getter("x", function() {
                return Private.x;
            });
            Public.$method("getX", function() {
                return Private.x;
            });
        }
    });

    var nsMyChildInheritingManualGetterSetter = {};
    var MyChildInheritingManualGetterSetter = dos.$class(nsMyChildInheritingManualGetterSetter, "MyChildInheritingManualGetterSetter", {
        extends: MyBaseWithManualGetterSetter,
        $: function(This, Super, Static, Public, Protected, Private) {}
    });

    var base1 = new MyBaseWithManualGetterSetter({
        x: 42
    });
    t.true(base1.hasOwnProperty("x"), "should have correct getter/setter property");
    t.equal(base1.x, base1.getX(), "should have working getter/method equality");

    var base2 = new MyBaseWithManualGetterSetter();
    base2.x = 23;
    t.equal(base2.x, base2.getX(), "should have working setter/method equality");
    t.equal(base1.x, 42, "should have working getter");
    t.equal(base2.x, 23, "should have working setter");

    var child1 = new MyChildInheritingManualGetterSetter({
        x: 42
    });
    var child2 = new MyChildInheritingManualGetterSetter();
    t.true(child2.hasOwnProperty("x"), "should have correct inherited getter/setter property");
    child2.x = 23;

    t.equal(child1.x, child1.getX(), "should have working inherited getter/method equality");
    t.equal(child2.x, child2.getX(), "should have working inherited setter/method equality");
    t.equal(child1.x, 42, "should have working inherited getter");
    t.equal(child2.x, 23, "should have working inherited setter");
    t.end();
});

test("should support automatic generation of getter/setter", function(t) {
    var nsMyBaseWithAutoGetterSetter = {};
    var MyBaseWithAutoGetterSetter = dos.$class(nsMyBaseWithAutoGetterSetter, "MyBaseWithAutoGetterSetter", {
        $: function(This, Super, Static, Public, Protected, Private) {
            Private.$field("x", {
                getter: Public,
                setter: Public
            });
            Public.$init(function(Params) {
                Private.x = Params.getOptionalType("x", dos.Types.Number);
            });
            Public.$method("getX", function() {
                return Private.x;
            });
        }
    });

    var nsMyChildInheritingAutoGetterSetter = {};
    var MyChildInheritingAutoGetterSetter = dos.$class(nsMyChildInheritingAutoGetterSetter, "MyChildInheritingAutoGetterSetter", {
        extends: MyBaseWithAutoGetterSetter,
        $: function(This, Super, Static, Public, Protected, Private) {}
    });

    var base1 = new MyBaseWithAutoGetterSetter({
        x: 42
    });
    var base2 = new MyBaseWithAutoGetterSetter();
    base2.x = 23;

    t.equal(base1.x, base1.getX(), "should have working generated getter/method equality");
    t.equal(base2.x, base2.getX(), "should have working generated setter/method equality");
    t.equal(base1.x, 42, "should have working generated getter");
    t.equal(base2.x, 23, "should have working generated setter");

    var child1 = new MyChildInheritingAutoGetterSetter({
        x: 42
    });
    var child2 = new MyChildInheritingAutoGetterSetter();

    t.true(child2.hasOwnProperty("x"), "should have correct generated inherited getter/setter property");
    child2.x = 23;

    t.equal(child1.x, child1.getX(), "should have working inherited generated getter/method equality");
    t.equal(child2.x, child2.getX(), "should have working inherited generated setter/method equality");
    t.equal(child1.x, 42, "should have working inherited generated getter");
    t.equal(child2.x, 23, "should have working inherited generated setter");
    t.end();
});

test("should re-bind getter/setter after dispose", function(t) {
    var nsMyBaseWithAutoGetter = {};
    var MyBaseWithAutoGetter = dos.$class(nsMyBaseWithAutoGetter, "MyBaseWithAutoGetter", {
        $: function(This, Super, Static, Public, Protected, Private) {
            Private.$field("x", {
                getter: Public
            });
            Public.$init(function(Params) {
                Private.x = Params.getOptionalType("x", dos.Types.Number);
            });
            Public.$setter("x", function(v) {
                Private.x = v;
                throw new Error("access to setter");
            });
            Public.$method("getX", function() {
                return Private.x;
            });
        }
    });

    var base1 = new MyBaseWithAutoGetter({
        x: 42
    });
    t.equal(base1.x, 42, "should have working getter");

    t.throws(function() {
        base1.x = 43;
    }, Error, "should invoke setter");

    t.equal(base1.x, 43, "should have working setter");
    base1.dispose();

    var base2 = new MyBaseWithAutoGetter({
        x: 44
    });
    t.equal(base2.x, 44, "should have rebound getter after dispose");

    t.throws(function() {
        base2.x = 45;
    }, Error, "should have invoked rebound setter after dispose");

    t.equal(base2.x, 45, "should have working getter after dispose");
    base2.dispose();
    t.end();
});

// test if it is possible to instantiate the defined class in it's static scope
// test if classNames of static and instances equal
test("should support correct super class names for static Type nested instanciation", function(t) {
    var nsConcreteShallow = {};
    dos.$class(nsConcreteShallow, "ConcreteShallow", {
        static: function(This, Super, Public, Protected, Private) {
            Public.$const("instance", {
                value: new nsConcreteShallow.ConcreteShallow()
            });
            Public.$method("superClassName", function() {
                return Super.className;
            });

        },
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$method("superClassName", function() {
                return Super.className;
            });
        }
    });
    var x = new nsConcreteShallow.ConcreteShallow();
    t.strictEqual(nsConcreteShallow.ConcreteShallow.className, x.className, "should have same class names for nested and outer class");
    t.strictEqual(nsConcreteShallow.ConcreteShallow.superClassName(), x.superClassName(), "should have same calss names for nested and outer class' super class");
    t.end();
});

// test manualSuperInit flag in init
test("should support manual super init", function(t) {
    var nsThrowingInitBase = {};
    var ThrowingInitBase = dos.$class(nsThrowingInitBase, "ThrowingInitBase", {
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$init(function(Params) {
                throw dos.Exception({
                    what: "called init of manualSuperInit base"
                });
            });
        }
    });

    var nsNoSuperPropagation = {};
    var NoSuperPropagation = dos.$class(nsNoSuperPropagation, "NoSuperPropagation", {
        manualSuperInit: true,
        extends: ThrowingInitBase,
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$init(function(Params) {});
        }
    });

    t.doesNotThrow(function() {
        var noop = new NoSuperPropagation();
    }, "should not propagate init to super");

    t.throws(function() {
        var nsSuperPropagation = {};
        var SuperPropagation = dos.$class(nsSuperPropagation, "SuperPropagation", {
            manualSuperInit: false,
            extends: ThrowingInitBase,
            $: function(This, Super, Static, Public, Protected, Private) {
                Public.$init(function(Params) {});
            }
        });
        var noop = new SuperPropagation();
    }, Object, "should propagate init to super");
    t.end();
});

test("should detect various illegal definitions", function(t) {
    var holder = {};
    var RootClassWithoutInit = dos.$root(holder, "RootClassWithoutInit", {});
    t.strictEqual(RootClassWithoutInit, holder.RootClassWithoutInit);
    t.throws(function() {
        var noop = new RootClassWithoutInit();
    }, Error, "should not allow instanciation of root classes without init");

    var nsInheritedFromRootClassWithoutInit = {};
    t.doesNotThrow(function() {
        dos.$class(nsInheritedFromRootClassWithoutInit, "InheritedFromRootClassWithoutInit", {
            extends: RootClassWithoutInit
        });
    }, "should allow inheriting from root class without init");

    t.throws(function() {
        var noop = new nsInheritedFromRootClassWithoutInit.InheritedFromRootClassWithoutinit();
    }, Error, "should not allow instanciation of inherited root class without init");

    // double definitions of class
    t.throws(function() {
        dos.$class(nsInheritedFromRootClassWithoutInit, "InheritedFromRootClassWithoutInit", {
            extends: RootClassWithoutInit
        });
    }, Error, "should not allow double definitions of class");

    var nsInheritedFromRootClassWithoutInitInvalidSuper = {};
    // invalid super object (wrong type)
    t.throws(function() {
        dos.$class(nsInheritedFromRootClassWithoutInitInvalidSuper, "InheritedFromRootClassWithoutInitInvalidSuper", {
            extends: true
        });
    }, Error, "should not allow extension of boolean");

    t.throws(function() {
        dos.$class(nsInheritedFromRootClassWithoutInitInvalidSuper, "InheritedFromRootClassWithoutInitInvalidSuper", {
            extends: "blah"
        });
    }, Error, "should not allow extension of string");

    t.throws(function() {
        dos.$class(nsInheritedFromRootClassWithoutInitInvalidSuper, "InheritedFromRootClassWithoutInitInvalidSuper", {
            extends: 1
        });
    }, Error, "should not allow extension of number");

    t.throws(function() {
        dos.$class(nsInheritedFromRootClassWithoutInitInvalidSuper, "InheritedFromRootClassWithoutInitInvalidSuper", {
            extends: undefined
        });
    }, Error, "should not allow extension of undefined");

    // test if the scope is cleaned up after a catched throw of a ClassDefException
    t.strictEqual(nsInheritedFromRootClassWithoutInitInvalidSuper.InheritedFromRootClassWithoutInitInvalidSuper, undefined, "should clean up after exception");
    t.end();
});

/*
    test("should support separate root modules", function(t) {
        var testRootModule = {};
        var nstestRootClassCtorProxy = {};
 var testRootClassCtorProxy = dos.$root(nstestRootClassCtorProxy, "test.RootClass", {
            rootModule: testRootModule,
            $: function(This, Super, Static, Public, Protected, Private) {
                Public.$init(function(Params) {
                });
            }
        });

        t.strictEqual(testRootModule.test.RootClass, testRootClassCtorProxy);
        t.throws(function() { new testRootModule.test.RootClass; }, "dos.ClassInstanceException");

        dos.$class("test.InheritedFromRootClass", {
            extends: testRootModule.test.RootClass
        });

        new testRootModule.test.InheritedFromRootClass;

    });
    */


/*
 * auto dispose of fields -> not dispose when autoDispose: false, etc..
 * auto dispose of overridden default params
 * $interface in static scope
 * $const in dynamic scope
 * $field with valud in dynamic scope
 * useRawParams test in setDefaults
 * check merging of default params
 * argCount interface tests
 * test $interface, especially over more than one abstract class level
 * test $method behavior -> check if they are correctly injected into the proper scopes
 * test super scopes
 * overriding of protected/public methods with the same name, and getter/setter exceptions
 * check if private scope does not bleed into public/protected
 * check if protected scope does not bleed into private/public
 * check if public scope does not bleed into private/protected
 * check if one can instantiate an instance of a class in it's static scope
 * check the rtti system
 * check reflect system
 * check double definition of methods
 * check $import for invalid module pathes and so on
 * check all the classDefinitionMethods for invalid params
 * define const field in dynamic scope and first set in $init
 * check bleeding of init/dispose in Static class ctor proxy
 * internal  -> test all hidden properties etc.
 */

test("should support default interfaces and reflection", function(t) {
    var nsPartialInterface = {};
    var PartialInterface = dos.$class(nsPartialInterface, "PartialInterface", {
        static: function(This, Super, Public, Protected, Private) {
            Private.$field("id", {
                raw: true
            });
            Public.$const("constant", {
                raw: true,
                value: "someConstantString"
            });
            Public.$init(function() {
                Private.id = 0;
            });
            Protected.$getter("id", function() {
                return Private.id;
            });
            Protected.$setter("id", function(v) {
                Private.id = v;
            });
        },
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$init(function(Params) {
                Static.Protected.id++;
            });
            Public.$method("getId");
        }
    });

    var nsImplementPartialInterface = {};
    var ImplementPartialInterface = dos.$class(nsImplementPartialInterface, "ImplementPartialInterface", {
        extends: PartialInterface,
        $: function(This, Super, Static, Public, Protected, Private) {
            var exception = Public.$import(dos, "Exception");
            Public.$init(function(Params) {});
            Public.$method("getId", function() {
                Private.$reflect(function(Public, Protected, Private) {
                    Public.$method("reflectedMethod", function() {
                        return "reflected!";
                    });
                });
                return Static.Protected.id;
            });
        }
    });

    var x = new ImplementPartialInterface();
    t.equal(x.getId(), 1, "should allow implementing of default interfaces");
    t.equal(x.reflectedMethod(), "reflected!", "should allow dynamic method reflection");

    var y = new ImplementPartialInterface();
    t.equal(y.getId(), 2, "should allow sharing of static in implementation for default interfaces");
    t.equal(ImplementPartialInterface.constant, "someConstantString", "should allow access to static constants of default interface in implementation");

    // cannot instantiate static class
    t.throws(function() {
        var noop = new ImplementPartialInterface.$Static();
    }, Error, "should not allow instantiation of a static class of default interface implementation");

    t.end();
});

test("should correctly dispose in case of Protected/Public fields", function(t) {
    var nsSomePayload = {};
    var SomePayload = dos.$class(nsSomePayload, "SomePayload", {
        allocator: dos.$allocator(nsSomePayload, "ThrowingCheckingAllocator", {
            extends: dos.Allocator,
            useRawParams: true,
            $: function(This, Super, Static, Public, Protected, Private) {
                Private.$field("unused", {
                    raw: true
                });
                Public.$init(function(Params) {
                    Private.unused = [];
                });
                Public.$method("alloc", function(ClassCtorProxy, Public) {
                    Super.alloc(ClassCtorProxy, Public);
                    if(Private.unused.length > 0) {
                        return Private.unused.pop().obj;
                    } else {
                        return ClassCtorProxy.__dos_ctor.call(Public, Public);
                    }
                });
                Public.$method("dealloc", function(obj) {
                    for(var i = 0, len = Private.unused.length; i < len; ++i) {
                        if(obj === Private.unused[i].obj) {
                            throw new Error("duplicate dispose");
                        }
                        if(obj.className !== Private.unused[i].obj.className) {
                            throw new Error("different type");
                        }
                    }
                    Private.unused.push({
                        obj: obj,
                        stack: new Error().stack
                    });
                });
            }
        }),
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$field("publicField");
            Protected.$field("protectedField");
        }
    });

    var nsSomePayloadChild = {};
    var SomePayloadChild = dos.$class(nsSomePayloadChild, "SomePayloadChild", {
        extends: SomePayload,
        $: function(This, Super, Static, Public, Protected, Private) {}
    });
    var x = new SomePayloadChild();
    t.doesNotThrow(function() {
        x.dispose();
    }, "should correctly dispose Protected and Public fields");
    t.end();
});

test("should warn about duplicate fields", function(t) {
    t.throws(function() {
        var nsDuplicateFields = {};
        var DuplicateFields = dos.$class(nsDuplicateFields, "DuplicateFields", {
            $: function(This, Super, Static, Public, Protected, Private) {
                Public.$field("dup");
                Public.$field("dup");
            }
        });
        var noop = new DuplicateFields();
    }, Error, "should warn about duplicate fields");
    t.end();

});


test("should disallow autoDispose on raw fields", function(t) {
    t.throws(function() {
        var nsAutoDisposeRawFieldTrue = {};
        var AutoDisposeRawFieldTrue = dos.$class(nsAutoDisposeRawFieldTrue, "AutoDisposeRawFieldTrue", {
            $: function(This, Super, Static, Public, Protected, Private) {
                Public.$field("test", {
                    raw: true,
                    autoDispose: true
                });
                Public.$init(function(Params) {
                    Public.vector = [0, 0, 0];
                });
            }
        });
        var x = new AutoDisposeRawFieldTrue();
    }, Error, "should disallow autoDispose on raw fields");
    t.end();
});

test("should have a working class graph", function(t) {
    var ns = {};
    dos.$interface(ns, "A", {});
    dos.$interface(ns, "B", {});
    dos.$interface(ns, "C", {});
    dos.$interface(ns, "D", {});

    dos.$class(ns, "X", {
        implements: [
            ns.A,
            ns.B
        ]
    });

    dos.$class(ns, "Y", {
        extends: ns.X,
        implements: [
            ns.C,
            ns.D
        ]
    });

    ns.A.getAllImplementingClasses().map(function(elem) {
        t.true(elem === ns.X || elem === ns.Y, "should correctly enumerate all implementing classes of base interface");
    });

    ns.D.getAllImplementingClasses().map(function(elem) {
        t.false(elem === ns.X, "should correctly enumerate all implementing classes of derived interface");
    });
    t.end();
});

test("should not overwrite internal functions in static", function(t) {
    t.throws(function() {
        var nsStaticScopeInternalOverrideBase = {};
        var StaticScopeInternalOverrideBase = dos.$abstract(nsStaticScopeInternalOverrideBase, "StaticScopeInternalOverrideBase", {});
        var nsStaticScopeInternalOverrideIface = {};
        var StaticScopeInternalOverrideIface = dos.$interface(nsStaticScopeInternalOverrideIface, "StaticScopeInternalOverrideIface", {});
        var nsStaticScopeInternalOverride = {};
        var StaticScopeInternalOverride = dos.$static(nsStaticScopeInternalOverride, "StaticScopeInternalOverride", {
            extends: StaticScopeInternalOverrideBase,
            implements: [StaticScopeInternalOverrideIface],
            static: function(This, Super, Public, Protected, Private) {
                Public.$method("implements", function() {
                    throw new dos.Exception();
                });
                Public.$method("instanceof", function() {
                    throw new dos.Exception();
                });
            }
        });
    }, Object, "should not allow overwrite for internal functions in static");
    t.end();
});

test("should have a simple class name getter", function(t) {
    var nsSimpleClassName = {};
    var SimpleClassName = dos.$abstract(nsSimpleClassName, "blah.SimpleClassName", {});
    t.equal(nsSimpleClassName.blah.SimpleClassName.simpleClassName, "SimpleClassName", "should have simple class name getter");
    t.end();
});

test("should support fields with typesafe polymorphic assignments", function(t) {
    var nsPolymorphicBase = {};
    var PolymorphicBase = dos.$class(nsPolymorphicBase, "PolymorphicBase", {
        $: function(This, Super, Static, Public, Protected, Private) {
            Public.$field("polymorphicField", {
                type: PolymorphicBase,
                polymorphic: true
            });
            Public.$field("nonPolymorphicField", {
                type: PolymorphicBase
            });
        }
    });

    var nsPolymorphicDerived = {};
    var PolymorphicDerived = dos.$class(nsPolymorphicDerived, "PolymorphicDerived", {
        extends: PolymorphicBase,
        $: function(This, Super, Static, Public, Protected, Private) {}
    });

    var x = new PolymorphicBase();
    var y = new PolymorphicBase();
    var z = new PolymorphicDerived();
    x.polymorphicField = y;
    x.polymorphicField = z;
    x.polymorphicField = y;
    x.polymorphicField = z;

    t.throws(function() {
        x.nonPolymorphicField = y;
        x.nonPolymorphicField = z;
        x.nonPolymorphicField = y;
        x.nonPolymorphicField = z;
    }, Error, "should support fields with typesafe polymorphic assignments");
    t.end();
});

test("should de-init statics", function(t) {
    var ns = {};
    dos.$class(ns, "SomeStaticStuff", {
        static: function(This, Super, Public, Protected, Private) {
            Public.$const("a", {
                value: 1
            });
            Protected.$const("b", {
                value: 2
            });
            Private.$const("c", {
                value: 3
            });
        }
    });
    dos.$deinit();
    t.doesNotThrow(function() {
        if((ns.SomeStaticStuff.a !== 1)) {
            throw new Error("failed");
        }
    }, "should dispose of static data after deinit");
    t.end();
});

test("shutdown", function(t) {
    t.end();
});
