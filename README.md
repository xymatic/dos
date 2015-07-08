dos -- DELIGHT object system
=========
An advanced OO-Framework for JavaScript. This framework was used in production in the [DELIGHT engine](http://delight-engine.com/). Supports both [node](http://nodejs.org)/[io](http://iojs.org) environments as well as all major browsers using [browserify](http://browserify.org).

# Install

To install just use [npm](http://npmjs.com/).

```bash
    npm install dos
```

# Example

A small example of defining and using a class in dos.

```javascript
var dos = require("dos");
var namespace = {};
dos.$class(namespace, "subns.MyClass", {
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
// use it right away
var myObject = new namespace.subns.MyClass();
// or export for later use
module.exports = namespace;
```

# Functionality

Just a quick overview of what you can do with dos. This section is very rough and incomplete as of now. Feel free to ask and/or browse the code.

## Defining

The main functionality of the dos is to define classes. There are different kinds of classes that you can define: 

### Normal Classes

Your standard classes that everybody should know.

```javascript
dos.$class(ns, "Class", { /* ... */ });
```

### Abstract Classes

Classes that cannot be instantiated using new -- they can contain interface methods.

```javascript
dos.$abstract(ns, "AbstractClass", { /* ... */ });
```

### Static Classes

Classes that only have a static part, most commonly used as util holders.

```javascript
dos.$static(ns, "StaticClass", { /* ... */ });
```

### Interfaces

Interfaces are orthogonal to the class hierarchy. They cannot contain data. You can implement multiple interfaces in one class.

```javascript
dos.$interface(ns, "Interface", { /* ... */ });
```

### Exceptions

Wrapping Error objects in dos. This functionality comes in handy when serializing exceptions (not covered in this guide),

```javascript
dos.$exception(ns, "Exception", { /* ... */ });
```

### Allocators

In dos you can control how new behaves on a class. The default is a PoolAllocator, but you can write custom ones using this notation. See below for a small example on how to subclass PoolAllocator.

```javascript
dos.$allocator(ns, "Allocator", { /* ... */ });
```

## Class Descriptor

In dos the actual class description is encoded in a class descriptor. Here are some of the most important options you can use. There are more advanced ones that this small guide does not cover. Please ask and/or look at the code for more information.

### Extends

Simple single inheritance using the extends option.

```javascript
var ns = {};
dos.$class(ns, "Class", {
    extends: SomeBaseClass
    /* ... */
});
```
### Implements

Simple implementation of multiple interfaces using implements.

```javascript
var ns = {};
dos.$class(ns, "Class", {
    implements: [ SomeInterface, SomeOtherInterface ]
    /* ... */
});
```
### Non-Static

The $ sign holds a class definition function for all non-static members. There are many things that you can define inside of the function, most of which are outlined below. The parameters to the function are:

**This** A reference to the object.

**Super** A reference to the super class members

**Public** The public class definition functions of the class.

**Protected** The private class definition functions of the class.

**Private** The private class definition functions of the class.

```javascript
var ns = {};
dos.$class(ns, "Class", {
    $: function(This, Super, Public, Protected, Private) {

        // fields 
        Public.$field("somePublicField", { autoDispose: true });
        Protected.$field("someProtectedField", {
            getter: Public
        });
        Private.$field("somePrivateField", { transient: true });

        // methods
        Public.$method("somePublicMethod", function() {
            return Private.somePrivateField;
        });
        Protected.$method("someProtectedMethod", function() {
            return "foo";
        });
        Private.$method("somePublicMethod", function(baz) {
            return baz;
        });

        // partial interface
        Public.$method("toBeImplemented");

        // getter
        Public.$getter("x", function() {
            return 0;
        });
        Protected.$getter("y", function() {
            return 1;
        });
        Private.$getter("z", function() {
            return 2;
        });

        // setter
        Public.$setter("x", function(v) {
            Private.somePrivateField = v;
        });
        Protected.$setter("y", function(v) {
            Private.somePrivateField = v;
        });
        Private.$setter("z", function(v) {
            Private.somePrivateField = v;
        });

        // constructor / init
        Public.$init(function(Defaults) {
            Defaults.someField = 42;
        }, function(Params) {
            Private.somePrivateField = Params.getType("someField", dos.Types.Number);
            Public.somePublicField = Params.getType("someField", someNamespace.SomeOtherClass);
        });

        // destructor / dispose
        Public.$dispose(function() {
            // free some system resources
        });

        Private.$reflect(function(Public, Protected, Private) {
            Public.$method("reflectedMethod", function() {
                return "reflected!";
            });
        });

    }
    /* ... */
});
```

### Static

Most notably you define nested classes in the static part of your class definition. You can also define constants and even create a constant of the same type as the class that you are currently defining.

```javascript
var ns = {};
dos.$class(ns, "Class", {
    static: function(This, Super, Public, Protected, Private) {
        // static constants
        Public.$const("somePublicStaticConstant", { value: "foo23" });
        Protected.$const("someProtectedStaticConstant", { value: 42 });
        Private.$const("somePrivateStaticConstant", { value: new ns.Class() });

        // nested classes
        dos.$class("StaticInnerClass", { /* everything supported as in outer class */ });
        
        /*
            everything as in $ except $reflect
        */

    }
    /* ... */
});

```

### Interface

In interfaces you just write $method,$getter and so on but not supply an implementation. You will have to implement those in classes that use the interfaces.

```javascript
var ns = {};
dos.$interface(ns, "Interface", {
    $: function(This, Super, Public, Protected, Private) {
        Public.$method("someInterfaceMethod");
        Public.$getter("someInterfaceGetter");
        Protected.$method("someProtectedInterfaceMethod");
    }  
    /* ... */
});

```

### Allocators

Custom allocators allow you to control how objects are managed between init and dispose. The default should work well for most cases, but if you for example want to get some allocation pattern info for debugging purposes, you can subclass an Allocator.

```javascript
var ns = {};

dos.$allocator(ns, "CustomAllocator", {
    extends: dos.PoolAllocator,
    $: function(This, Super, Static, Public, Protected, Private) {
        Public.$init(function(Params) {
        });
        Public.$method("alloc", function(ClassCtorProxy, Public) {
            // custom allocation code goes here
            return Super.alloc(ClassCtorProxy, Public);
        });
        Public.$method("dealloc", function(obj) {
            Super.dealloc(obj);
            // custom deallocation code goes here
        });
    }
}),         

dos.$class(ns, "SomeCustomAllocatorClass", {
    allocator: ns.CustomAllocator, 
    $: function(This, Super, Static, Public, Protected, Private) {
        /* ... */
    }
});

new ns.SomeCustomAllocatorClass(); // uses CustomAllocator
```

## RTTI

The dos has a rich set of run-time type information features. Please note that they work on instances of as well as classes.

```javascript
var ns = {};
dos.$class(ns, "subns.Class", {
    extends: SomeBaseClass,
    implements: [ SomeInterface, SomeOtherInterface ]
    /* ... */
});

ns.subns.Class.instanceof(SomeBaseClass);
ns.subns.Class.implements(SomeInterface);

var foo = new ns.subns.Class();

foo.instanceof(SomeBaseClass); // true
foo.implements(SomeOtherInterface); // true

SomeBaseClass.getAllDerivedClasses(); // outputs array: [ ns.subns.Class ]
SomeInterface.getAllImplementingClasses(); // outputs array: [ ns.subns.Class ]


ns.subns.Class.class; // this is the class ctor

ns.subns.Class.className; // "subns.Class" 
ns.subns.Class.simpleClassName; // "Class" 

ns.subns.Class.classHierarchy; // outputs array: [ ns.subns.Class.class, SomeBaseClass.class ];
```

## Params

The dos works with named parameters. The init method (or constructor) of dos classes has a magic Params object which helps you validate the parameters given to the class at construction time. 

Here are some examples, but there are more things you can do with it like extend on the validator pattern to write your own parameter validation.

```javascript
var ns = {};
dos.$class(ns, "Class", {
    $: function(This, Super, Public, Protected, Private) {
        Public.$init(Params) {
            var x = Params.getType("x", dos.Types.Uint16Array);
            var y = Params.getOptionalType("y", dos.Types.RegExp);
            Private.myMember = Params.getType("myMember", dl8.core.Types.Number, dl8.core.Params.validIfNumberBetween(23, 42));
            /* ... TODO: see code as reference for now ... */
        });
    }
});
```
# Tests

To run unit and coverage tests do the following on your favorite shell:

```bash
# install dev dependencies
npm install -d
# test in a browser
npm run test
# test in node
npm run testNode
# show test coverage
npm run coverage
```

# Credits
(c) 2012-2015 xymatic GmbH. MIT License. See LICENSE file for more information.
