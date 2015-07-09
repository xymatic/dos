/*eslint-env node, browser */
/*eslint no-underscore-dangle: 0, camelcase: 0, no-use-before-define: 0, no-shadow: 0, no-unused-vars: 0, new-cap: 0 */
"use strict";
var dos = {};
/**
 * minimal helper exception that is thrown in case of invalid class definitions
 */
dos.ClassDefException = function(where, what) {
    return new Error((where || "global") + ": " + (what || "generic exception"));
};

/**
 * minimal helper exception that is thrown in case of invalid class instanciation (abstract classes, for example)
 */
dos.ClassInstanceException = function(where, what) {
    return new Error((where || "global:") + ": " + (what || "generic exception"));
};

/**
 * a class body function
 * @typedef {Function} DOSClassBody
 * @param {Object} Static the Static scope of the class
 * @param {Object} Super the Super scope of the class
 * @param {Object} Public the Public scope of the class
 * @param {Object} Protected the Protected scope of the class
 * @param {Object} Private the Private scope of the class
 */

/**
 * a static class body function
 * @typedef {Function} DOSClassBody
 * @param {Object} Super the Super scope of the class
 * @param {Object} Public the Public scope of the class
 * @param {Object} Protected the Protected scope of the class
 * @param {Object} Private the Private scope of the class
 */

/**
 * a class descriptor type
 * @typedef {Object} DOSClassDescriptor
 * @property {Function} [extends=null] the class' constructor from which to inherit
 * @property {Array} [implements] an array of interface class constructors
 * @property {Boolean} [abstract=false] a boolean flag indicating that this class be abstract
 * @property {Object} [rootModule] a boolean flag indicating that this class be abstract
 * @property {Function} [allocator=dos.PoolAllocator] an allocator constructor. specifies the allocator to be used for this class. the default is a dos.PoolAllocator which pools unused objects for
 *  fast instanciation and asymptotic memory usage in the best case. for more information see the spec on allocator
 *  objects. if null is provided a special vanilla allocator will be injected. this is useful for implementing
 *  allocators.
 * @property {Boolean} [useRawParams=false] a boolean flag indicating whether the class' ctor parameters should be automatically converted to dos.Params (false) or kept in raw javascript format (true)
 * @property {Boolean} [manualSuperInit=false] a boolean flag indicating whether the class' init should automatically
 * call Super init
 * @property {Boolean} [exception=false] a boolean flag indicating that this class be an excpetion
 * @property {Function} [static=undefined] the static class body
 * @property {Function} [$=undefined] the class body
 */

/**
 * @method __dos_Class
 * defines a new class in the dos object system (DOS). do not use this function directly.
 *
 * @param {String} name the canonical class name including the module names seperated with dots. multiple undefined module pathes are allowed and will be created on the fly.
 * @param {DOSClassDescriptor} Params the DOSClassDescriptor of this class
 * @throws {dos.ClassDefException} in case the definition of the class is invalid
 */
Object.defineProperty(dos, "__dos_Class", {
    value: function(name, Params) {
        try {
            //
            // quick reject wrong params
            //
            (function() {
                // TODO: in case of support for anonymous classes, this is obviously not possible
                if(!name || typeof name !== "string") {
                    throw new dos.ClassDefException("DOS Class", "no name parameter or name parameter not of type \"string\" supplied. a name is mandatory");
                }

                if(typeof Params !== "object") {
                    throw new dos.ClassDefException("DOS Class", "invalid param object supplied");
                }
                var validArgs = ["extends", "static", "abstract", "implements", "allocator", "isDefaultAllocator", "allocatorParams", "useRawParams", "manualSuperInit", "exception", "__dos_outerClassCtorProxy", "__dos_nonStaticClassCtorProxy", "__dos_innerClass", "__dos_outerClassName", "__dos_interfaceClass", "__dos_rootModule", "$"];
                Object.keys(Params).filter(function(param) {
                    if(validArgs.indexOf(param) === -1) {
                        throw new dos.ClassDefException("DOS Class", "invalid param \"" + param + "\".");
                    }
                });
            })();

            //
            // types
            //
            var interfaceType = {
                METHOD: 1 << 0,
                GETTER: 1 << 1,
                SETTER: 1 << 2
            };

            var interfaceTypeString = {
                1: "$method",
                2: "$getter",
                4: "$setter",
                6: "$getter/$setter"
            };

            //
            // reserved names
            //
            var reservedNames = {
                className: "className",
                simpleClassName: "simpleClassName",
                class: "class",
                implements: "implements",
                instanceof: "instanceof",
                classHierarchy: "classHierarchy"
            };

            //
            // helper methods
            //

            /**
             * @method copyProp
             * copy property ECMA5 way
             *
             * @param {Object} dst the dst object
             * @param {Object} src the src object
             * @param {String} propertyName the property name
             */
            var copyProp = function(dst, src, propertyName) {
                return Object.defineProperty(dst, propertyName, Object.getOwnPropertyDescriptor(src, propertyName));
            };

            /**
             * @method mergeInto
             * util to merge one object into another
             *
             * @param {Object} dst the destination object to merge into
             * @param {Object} src the source object from which to merge
             * @returns {Object} the dst
             */
            var mergeInto = function(dst, src) {
                if(!src || !dst) {
                    return undefined;
                }
                var srcKeys = Object.keys(src);
                var i, len, attr;
                for(i = 0, len = srcKeys.length; i < len; ++i) {
                    attr = srcKeys[i];
                    Object.defineProperty(dst, attr, Object.getOwnPropertyDescriptor(src, attr));
                }
                return dst;
            };

            /**
             * @method isValidModuleString
             * checks a module path encoded as string for validity
             *
             * @param {String} moduleString the module path as string
             * @returns {Boolean} true if module string is valid
             */
            var isValidModuleString = (function() {
                var pattern = new RegExp(/^(?!.*\.$)(?:[$_a-z][$_a-z\d]*\.?)+$/i);
                return function(moduleString) {
                    return !!moduleString.match(pattern);
                };
            })();

            /**
             * @method getModuleInfoFromCanonicalClassName
             * returns a module object given a canonical class name as a string, building the module space while traversing if
             * necessary
             *
             * @param {Object} rootModule from where to start searching for the modules
             * @param {String} canonicalClassName the canonical class name
             * @returns {Object} the module info of form: { module: <classModule>, className: <className>, canonicalClassName: <canonicalClassName> }
             * @throws dos.ClassDefException if canonical class name is not a valid module path
             */
            var getModuleInfoFromCanonicalClassName = function(rootModule, canonicalClassName) {
                if(!isValidModuleString(canonicalClassName)) {
                    throw new dos.ClassDefException(canonicalClassName, "invalid module format \"" + canonicalClassName + "\" in class definition.");
                }
                var lastModuleSeperatorIndex = canonicalClassName.lastIndexOf(".");
                var className = canonicalClassName.substring(lastModuleSeperatorIndex + 1);
                var moduleName = canonicalClassName.substring(0, lastModuleSeperatorIndex);

                if(moduleName === "") {
                    return {
                        module: rootModule,
                        className: className,
                        canonicalClassName: canonicalClassName
                    };
                }

                var modules = moduleName.split(".");
                var rootModuleName = modules.shift();
                if(!rootModule.hasOwnProperty(rootModuleName)) {
                    rootModule[rootModuleName] = {};
                }
                var classModule = rootModule[rootModuleName];
                var moduleLength = modules.length;
                var i;
                for(i = 0; i < moduleLength; ++i) {
                    if(!classModule.hasOwnProperty(modules[i])) {
                        classModule[modules[i]] = {};
                    }
                    classModule = classModule[modules[i]];
                }
                if(!classModule.hasOwnProperty(className)) {
                    classModule[className] = {};
                }
                return {
                    module: classModule,
                    className: className,
                    canonicalClassName: canonicalClassName
                };
            };

            /**
             * @method getCtorProxyFromCanonicalClassName
             * returns the class' ctorProxy from a given canonicalClassName and rootModule
             *
             * @param {Object} rootModule from where to start searching for the modules
             * @param {String} canonicalClassName the canonical class name
             * @returns {Object} the class' ctorProxy or undefined if it could not be found
             */
            var getCtorProxyFromCanonicalClassName = function(rootModule, canonicalClassName) {
                if(!isValidModuleString(canonicalClassName)) {
                    return undefined;
                }
                var lastModuleSeperatorIndex = canonicalClassName.lastIndexOf(".");
                var className = canonicalClassName.substring(lastModuleSeperatorIndex + 1);
                var moduleName = canonicalClassName.substring(0, lastModuleSeperatorIndex);

                if(moduleName === "") {
                    return rootModule[className];
                }

                var modules = moduleName.split(".");
                var rootModuleName = modules.shift();
                if(!rootModule.hasOwnProperty(rootModuleName)) {
                    return undefined;
                }
                var classModule = rootModule[rootModuleName];
                var moduleLength = modules.length;
                var i;
                for(i = 0; i < moduleLength; ++i) {
                    if(!classModule.hasOwnProperty(modules[i])) {
                        return undefined;
                    }
                    classModule = classModule[modules[i]];
                }
                if(!classModule.hasOwnProperty(className)) {
                    return undefined;
                }
                return classModule[className];
            };

            /**
             * @method copyInitDispose
             * copies init and dispose into super
             *
             * @param {Object} Super the super scope
             * @param {Object} Public the public scope
             */
            var copyInitDispose = function(Super, Public) {
                copyProp(Super, Public, "init");
                copyProp(Super, Public, "dispose");
            };


            // TODO: we should probably combine a few of the functions here to "injectNonEnumerableFunctions"
            /**
             * @method injectSerialization
             * injects serialization magic function into super
             *
             * @param {Object} Super the super scope
             * @param {Object} Public the public scope
             */
            var injectSerialization = function(Super, Public) {
                copyProp(Super, Public, "__dos_initSerializedFields");
                copyProp(Super, Public, "__dos_getFields");
            };

            /**
             * @method injectInitDispose
             * injects init and dispose into super
             *
             * @param {Object} Super the super scope
             * @param {Object} Public the public scope
             */
            var injectInitDispose = function(Super, Public) {
                copyProp(Super, Public, "__dos_init");
                copyProp(Super, Public, "__dos_dispose");
            };

            /**
             * @method injectSetDefaults
             * injects the set defaults magic into super
             *
             * @param {Object} Super the super scope
             * @param {Object} Public the public scope
             */
            var injectSetDefaults = function(Super, Public) {
                copyProp(Super, Public, "__dos_setDefaults");
            };

            /**
             * @method injectInitFields
             * injects the init fields magic into super
             *
             * @param {Object} Super the super scope
             * @param {Object} Public the public scope
             */
            var injectInitFields = function(Super, Public) {
                copyProp(Super, Public, "__dos_initFields");
            };

            /**
             * @method prePopulateSuper
             * pre populates the Super object with methods/fields/getters etc from the super
             *
             * @param {Object} Super the Super object of the derived class
             * @param {Object} Public the Public object of the super class
             * @param {Object} Protected the Protected object of the super class
             * @throws {dos.ClassDefException} if Super is already populated or if a protected method overrides a public method
             */
            var prePopulateSuper = function(Super, Public, Protected) {
                var i, len;
                var publicKeys = Object.keys(Public);
                var superKeys = Object.keys(Super);
                var protectedKeys = Object.keys(Protected);
                for(i = 0, len = publicKeys.length; i < len; ++i) {
                    if(superKeys.indexOf(publicKeys[i]) === -1) {
                        var desc = Object.getOwnPropertyDescriptor(Public, publicKeys[i]);
                        if(desc !== undefined) {
                            Object.defineProperty(Super, publicKeys[i], desc);
                        }
                    } else {
                        throw new dos.ClassDefException(canonicalClassName, "found public property \"" + publicKeys[i] + "\" in Super scope");
                    }
                }
                for(i = 0, len = protectedKeys.length; i < len; ++i) {
                    if(publicKeys.indexOf(protectedKeys[i]) !== -1) {
                        var descPub = Object.getOwnPropertyDescriptor(Public, i);
                        var descProtected = Object.getOwnPropertyDescriptor(Protected, i);
                        if((descPub.get && descProtected.set) || (descPub.set && descProtected.get)) {
                            Object.defineProperty(Super, protectedKeys[i], descProtected);
                        } else {
                            // TODO: in case i is not a method but rather a property, this message will be confusing to
                            // the user
                            throw new dos.ClassDefException(canonicalClassName, "protected method \"" + protectedKeys[i] + "\" overrides public method. invalid interface.");
                        }
                    }
                    if(superKeys.indexOf(protectedKeys[i]) === -1) {
                        Object.defineProperty(Super, protectedKeys[i], Object.getOwnPropertyDescriptor(Protected, protectedKeys[i]));
                    } else {
                        throw new dos.ClassDefException(canonicalClassName, "found protected property \"" + protectedKeys[i] + "\" in Super scope");
                    }
                }
            };

            /**
             * @method injectDefaults
             * injects the default param setter boilerplate
             *
             * @param {Object} Super the Super scope of the class
             * @param {Object} Public the Public scope of the class
             * @param {Boolean} isNotRoot flag indicating whether the call is made from the root of the class definition hierarchy
             *
             */
            var injectDefaults = function(Super, Public, isNotRoot) {
                var setDefaults = Public.__dos_setDefaults || function() {};
                Object.defineProperty(Public, "__dos_setDefaults", {
                    value: function(Defaults) {
                        if(isNotRoot) {
                            Super.__dos_setDefaults(Defaults);
                            if(Super.__dos_setDefaults !== setDefaults) {
                                setDefaults(Defaults);
                            }
                        } else {
                            setDefaults(Defaults);
                        }
                    },
                    configurable: true,
                    enumerable: false
                });
            };

            /**
             * @method injectFieldInit
             * injects the field init boilerplate
             *
             * @param {Object} Super the Super scope of the class
             * @param {Object} Public the Public scope of the class
             * @param {Object} Private the Private scope of the class
             */
            var injectFieldInit = function(Super, Public, Private) {
                Object.defineProperty(Public, "__dos_initFields", {
                    value: function() {
                        if(!isStatic) {
                            if(Super.hasOwnProperty("__dos_initFields")) {
                                Super.__dos_initFields();
                            }
                        }
                        var field, i, len;
                        var fields = Private.__dos_fields;
                        var publicFields = fields.Public;
                        var protectedFields = fields.Protected;
                        var privateFields = fields.Private;
                        var publicFieldsKeys = Object.keys(publicFields);
                        var protectedFieldsKeys = Object.keys(protectedFields);
                        var privateFieldsKeys = Object.keys(privateFields);
                        for(i = 0, len = publicFieldsKeys.length; i < len; ++i) {
                            field = publicFieldsKeys[i];
                            if(!fields.Public[field].params.raw) {
                                fields.Public[field].obj = new dos.Field(publicFields[field].params);
                            }
                        }
                        for(i = 0, len = protectedFieldsKeys.length; i < len; ++i) {
                            field = protectedFieldsKeys[i];
                            if(!fields.Protected[field].params.raw) {
                                fields.Protected[field].obj = new dos.Field(protectedFields[field].params);
                            }
                        }
                        for(i = 0, len = privateFieldsKeys.length; i < len; ++i) {
                            field = privateFieldsKeys[i];
                            if(!fields.Private[field].params.raw) {
                                fields.Private[field].obj = new dos.Field(privateFields[field].params);
                            }
                        }
                    },
                    configurable: true,
                    enumerable: false
                });
            };

            /**
             * @method injectSerializedFieldInit
             * injects the serialized field init boilerplate
             *
             * @param {Object} Super the Super scope of the class
             * @param {Object} Public the Public scope of the class
             * @param {Object} Private the Private scope of the class
             */
            var injectSerializedFieldInit = function(Super, Public, Private) {
                Object.defineProperty(Public, "__dos_initSerializedFields", {
                    value: function(fieldDescs) {
                        if(Super.hasOwnProperty("__dos_initSerializedFields")) {
                            Super.__dos_initSerializedFields(fieldDescs.Super);
                        }
                        var field, i, len;
                        var fields = Private.__dos_fields;
                        var publicFields = fieldDescs.Public;
                        var protectedFields = fieldDescs.Protected;
                        var privateFields = fieldDescs.Private;
                        var publicFieldsKeys = Object.keys(publicFields);
                        var protectedFieldsKeys = Object.keys(protectedFields);
                        var privateFieldsKeys = Object.keys(privateFields);
                        for(i = 0, len = publicFieldsKeys.length; i < len; ++i) {
                            field = publicFieldsKeys[i];
                            fields.Public[field].obj.$ = publicFields[field];
                        }
                        for(i = 0, len = protectedFieldsKeys.length; i < len; ++i) {
                            field = protectedFieldsKeys[i];
                            fields.Protected[field].obj.$ = protectedFields[field];
                        }
                        for(i = 0, len = privateFieldsKeys.length; i < len; ++i) {
                            field = privateFieldsKeys[i];
                            fields.Private[field].obj.$ = privateFields[field];
                        }
                    },
                    configurable: true,
                    enumerable: false
                });
            };

            // TODO: generate a ClassDesc class that is generated to return all info about the class
            // TODO: this ClassDesc could hold all the RTTI info and as such be the complete rtti replacement
            // TODO: this should by lazy-evaluation only, since it will cause immense overhead
            // TODO: use this for reflection to inject new methods/...
            /**
             * @method injectFieldAccessor
             * @param {Object} Super the Super scope of the class
             * @param {Object} Public the Public scope of the class
             * @param {Object} Private the Private scope of the class
             */
            var injectFieldAccessor = function(Super, Public, Private) {
                // NOTE: objectOutput must be of type ObjectOutput
                Object.defineProperty(Public, "__dos_getFields", {
                    value: function(objectOutput) {
                        if(!objectOutput || !dos.isDOSObject(objectOutput)) {
                            return undefined;
                        }
                        var res = {};
                        if(Super.hasOwnProperty("__dos_getFields")) {
                            res.Super = Super.__dos_getFields(objectOutput);
                        }
                        mergeInto(res, Private.__dos_fields);
                        return res;
                    },
                    configurable: true,
                    enumerable: false
                });
            };


            /**
             * @method deepMap
             * a map function that can traverse through deep object hierarchies; calls map on every object encountered
             * @param {Object} parent the parent of an object
             * @param {String} key the key in parent
             * @param {Object} obj the object we want to traverse
             * @param {Function} map the mapping function
             */
            var deepMap = (function() {
                var arrMap = function(a, map) {
                    for(var i = 0, len = a.length; i < len; ++i) {
                        deepMap(a, i, a[i], map);
                    }
                };

                var objMap = function(a, map) {
                    var aKeys = Object.keys(a);
                    for(var i = 0, len = aKeys.length; i < len; ++i) {
                        deepMap(a, aKeys[i], a[aKeys[i]], map);
                    }
                };

                return function(parent, key, obj, map) {
                    if(Array.isArray(obj)) {
                        arrMap(obj, map);
                    } else if(obj !== null && typeof obj === "object") {
                        objMap(obj, map);

                        map(parent, key, obj);
                    }
                };
            })();

            /**
             * @method mapStaticNew
             * traverses a deep object hierarchy adding all found preStaticObjects into a queue
             * @param {Array} out the target queue
             * @param {Object} parent the parent of an object
             * @param {String} key the key in parent
             * @param {Object} obj the object we want to traverse
             */
            var mapStaticNew = function(out, parent, key, obj) {
                if(parent && obj && obj.__dos_preStaticObject) {
                    out.push({
                        parent: parent,
                        key: key,
                        obj: obj
                    });
                }
            };



            /**
             * @method injectInit
             * injects the init boilerplate
             *
             * @param {Object} Super the Super scope of the class
             * @param {Object} Public the Public scope of the class
             * @param {Boolean} superPropagation flag indicating whether superPropagation should be done for init
             * @param {Object} preStaticInitHolder the static init holder that is used for pre static ctor initialization
             * @throws {dos.ClassDefException} when the class has no init interface
             */
            var injectInit = function(Super, Public, superPropagation, preStaticInitHolder) {
                var inject = Public.__dos_init === Super.__dos_init ? function() {} : Public.__dos_init;
                Object.defineProperty(Public, "init", {
                    value: function(Params) {

                        var params, i, len, j, o, out, outLen, StaticInitHolder;
                        // NOTE: in case the user requested to not have super propagation in the init, we deliberately
                        // don't inject it here.
                        if(!classCtorProxy.__dos_classInfo.flags.manualSuperInit && superPropagation) {
                            Super.init(Params);
                        }
                        if(classCtorProxy.__dos_classInfo.flags.useRawParams) {
                            // TODO: this check can be done with a util fn -- useful elsewhere
                            if(Params && Params.instanceof && Params.instanceof(dos.Params)) {
                                params = Params.asForwardParams();
                                inject.call(Public, params);
                            } else {
                                inject.call(Public, Params);
                            }
                        } else {
                            params = new dos.Params(Params);
                            inject.call(Public, params);
                            params.dispose();
                        }

                        // NOTE: order is important here, we need to first call the static init, because of static
                        // polymorphism
                        if(preStaticInitHolder) {
                            for(i = 0, len = preStaticInitHolder.length; i < len; ++i) {
                                StaticInitHolder = preStaticInitHolder[i];
                                params = StaticInitHolder.value.params;
                                if(params !== undefined) {
                                    out = [];
                                    deepMap(StaticInitHolder, "value", StaticInitHolder.value.params, mapStaticNew.bind(this, out));
                                    for(j = 0, outLen = out.length; j < outLen; ++j) {
                                        o = out[j];
                                        o.parent[o.key] = new o.obj.ctor(o.obj.params);
                                    }
                                }
                                StaticInitHolder.value = new StaticInitHolder.value.ctor(params);
                                definePropertyFromDesc(StaticInitHolder.scope, StaticInitHolder);
                            }
                        }
                    },
                    configurable: true,
                    enumerable: true
                });
            };

            // TODO: as an IDEA we could not inject the RTTI functionality into the root of each class, but make it part of a
            // reflect interface that is part of the dos.Class interface. that way we would lower the footprint on the objects
            // and also have a java like way of inspecting class relationships, as well as other reflect functionality like
            // adding methods on the fly to classes or even defining new classes from old ones on the fly.
            /**
             * @method injectRTTI
             * injects the RTTI interface
             *
             * @param {Object} Public the Public object of the class
             * @param {Function} classCtorProxy the class' ctor proxy function
             */
            var injectRTTI = function(Public, classCtorProxy) {

                Public.$getter("className", function() {
                    return classCtorProxy.__dos_classInfo.name;
                }, true);

                Public.$getter("simpleClassName", function() {
                    return classCtorProxy.__dos_classInfo.simpleName;
                }, true);

                // TODO: refactor class to class
                Public.$getter("class", function() {
                    return classCtorProxy.__dos_classInfo.ctor;
                }, true);

                Public.$method("implements", function(otherClassCtorProxy) {
                    var hierarchy = classCtorProxy.__dos_classInfo.hierarchy;
                    var i, j, hierarchyLength, interfacesLength, interfaces;
                    for(i = 0, hierarchyLength = hierarchy.length; i < hierarchyLength; ++i) {
                        interfaces = hierarchy[i].__dos_classInfo.interfaces;
                        for(j = 0, interfacesLength = interfaces.length; j < interfacesLength; ++j) {
                            if(otherClassCtorProxy === interfaces[j]) {
                                return true;
                            }
                        }
                    }
                    return false;
                }, true);

                // TODO: this should also work for mixins...
                Public.$method("instanceof", function(otherClassCtorProxy) {
                    var hierarchy = classCtorProxy.__dos_classInfo.hierarchy;
                    var i, hierarchyLength;
                    for(i = 0, hierarchyLength = hierarchy.length; i < hierarchyLength; ++i) {
                        if(otherClassCtorProxy === hierarchy[i].__dos_classInfo.ctor) {
                            return true;
                        }
                    }
                    return false;
                }, true);

                Public.$getter("classHierarchy", function() {
                    return classCtorProxy.__dos_classInfo.hierarchy;
                }, true);
            };

            /*
             * @method injectReflection
             * injects reflection api
             *
             * @param {Object} Public the Public scope of the class
             * @param {Object} Protected the Protected scope of the class
             * @param {Object} Private the Private scope of the class
             */
            var injectReflection = function(Public, Protected, Private, isStatic, interfaceHolder) {
                Private.$method("$reflect", function(reflectFn) {
                    Public.$method = classDefinitionMethods.$method.bind(this, interfaceHolder, true, "Public", classCtorProxy, Public);
                    Protected.$method = classDefinitionMethods.$method.bind(this, interfaceHolder, true, "Protected", classCtorProxy, Protected);
                    Private.$method = classDefinitionMethods.$method.bind(this, interfaceHolder, true, "Private", classCtorProxy, Private);
                    Public.$getter = classDefinitionMethods.$getter.bind(this, interfaceHolder, true, "Public", classCtorProxy, Public);
                    Protected.$getter = classDefinitionMethods.$getter.bind(this, interfaceHolder, true, "Protected", classCtorProxy, Protected);
                    Private.$getter = classDefinitionMethods.$getter.bind(this, interfaceHolder, true, "Private", classCtorProxy, Private);
                    Public.$setter = classDefinitionMethods.$setter.bind(this, interfaceHolder, true, "Public", classCtorProxy, Public);
                    Protected.$setter = classDefinitionMethods.$setter.bind(this, interfaceHolder, true, "Protected", classCtorProxy, Protected);
                    Private.$setter = classDefinitionMethods.$setter.bind(this, interfaceHolder, true, "Private", classCtorProxy, Private);
                    Public.$import = classDefinitionMethods.$import.bind(this, rootModule, canonicalClassName);

                    if(isStatic) {
                        Public.$const = classDefinitionMethods.$const.bind(this, Public.$field);
                        Protected.$const = classDefinitionMethods.$const.bind(this, Protected.$field);
                        Private.$const = classDefinitionMethods.$const.bind(this, Private.$field);

                        Public.$class = classDefinitionMethods.$makeClass.bind(this, Public, dos.$class);
                        Public.$exception = classDefinitionMethods.$makeClass.bind(this, Public, dos.$exception);
                        Public.$abstract = classDefinitionMethods.$makeClass.bind(this, Public, dos.$abstract);
                        Public.$root = classDefinitionMethods.$makeClass.bind(this, Public, dos.$root);
                        Public.$allocator = classDefinitionMethods.$makeClass.bind(this, Public, dos.$allocator);
                        Public.$static = classDefinitionMethods.$makeClass.bind(this, Public, dos.$static);

                        Protected.$class = classDefinitionMethods.$makeClass.bind(this, Protected, dos.$class);
                        Protected.$exception = classDefinitionMethods.$makeClass.bind(this, Protected, dos.$exception);
                        Protected.$abstract = classDefinitionMethods.$makeClass.bind(this, Protected, dos.$abstract);
                        Protected.$root = classDefinitionMethods.$makeClass.bind(this, Protected, dos.$root);
                        Protected.$allocator = classDefinitionMethods.$makeClass.bind(this, Protected, dos.$allocator);
                        Protected.$static = classDefinitionMethods.$makeClass.bind(this, Protected, dos.$static);

                        Private.$class = classDefinitionMethods.$makeClass.bind(this, Private, dos.$class);
                        Private.$exception = classDefinitionMethods.$makeClass.bind(this, Private, dos.$exception);
                        Private.$abstract = classDefinitionMethods.$makeClass.bind(this, Private, dos.$abstract);
                        Private.$root = classDefinitionMethods.$makeClass.bind(this, Private, dos.$root);
                        Private.$allocator = classDefinitionMethods.$makeClass.bind(this, Private, dos.$allocator);
                        Private.$static = classDefinitionMethods.$makeClass.bind(this, Private, dos.$static);
                    }

                    reflectFn(Public, Protected, Private);

                    delete Public.$method;
                    delete Protected.$method;
                    delete Private.$method;
                    delete Public.$getter;
                    delete Protected.$getter;
                    delete Private.$getter;
                    delete Public.$setter;
                    delete Protected.$setter;
                    delete Private.$setter;
                    if(isStatic) {
                        delete Public.$const;
                        delete Protected.$const;
                        delete Private.$const;

                        delete Public.$class;
                        delete Public.$exception;
                        delete Public.$abstract;
                        delete Public.$root;
                        delete Public.$allocator;
                        delete Public.$static;

                        delete Protected.$class;
                        delete Protected.$exception;
                        delete Protected.$abstract;
                        delete Protected.$root;
                        delete Protected.$allocator;
                        delete Protected.$static;

                        delete Private.$class;
                        delete Private.$exception;
                        delete Private.$abstract;
                        delete Private.$root;
                        delete Private.$allocator;
                        delete Private.$static;

                        mergeInto(nonStaticClassCtorProxy, Public);
                    }
                });
            };

            /**
             * @method injectDispose
             * a helper funtion that injects deallocation code for fields into the class
             * dispose will be called on the fields, but the field descriptors will not be cleared, this is due to the fact that
             * fields will be recreated on a reinit of the class
             *
             * @param {Object} Super the Super scope of the class
             * @param {Object} Public the Public scope of the class
             * @param {Object} Protected the Protected scope of the class
             * @param {Object} Private the Private scope of the class
             * @param {Function} classCtorProxy the classCtorProxy of the class
             */
            var injectDispose = function(Super, Public, Protected, Private, classCtorProxy) {
                var inject = Public.__dos_dispose === Super.__dos_dispose ? function() {} : Public.__dos_dispose;
                Object.defineProperty(Public, "dispose", {
                    value: function(isDisposeRoot) {
                        if(isDisposeRoot === undefined) {
                            isDisposeRoot = true;
                        }
                        inject.call(Public);
                        if(!isStatic) {
                            if(Super.hasOwnProperty("dispose")) {
                                Super.dispose(false);
                            }
                        }
                        var field, i, len;
                        var fields = Private.__dos_fields;
                        var publicFields = fields.Public;
                        var protectedFields = fields.Protected;
                        var privateFields = fields.Private;
                        var publicFieldsKeys = Object.keys(publicFields);
                        var protectedFieldsKeys = Object.keys(protectedFields);
                        var privateFieldsKeys = Object.keys(privateFields);
                        for(i = 0, len = publicFieldsKeys.length; i < len; ++i) {
                            field = publicFieldsKeys[i];
                            if(!Private.__dos_fields.Public[field].params.raw) {
                                Private.__dos_fields.Public[field].obj.dispose();
                            } else if(Private.__dos_fields.Public[field].params.const) {
                                Object.defineProperty(Public, field, {
                                    value: undefined,
                                    writable: true,
                                    configurable: true
                                });
                            } else {
                                Public[field] = undefined;
                            }
                        }
                        for(i = 0, len = protectedFieldsKeys.length; i < len; ++i) {
                            field = protectedFieldsKeys[i];
                            if(!Private.__dos_fields.Protected[field].params.raw) {
                                Private.__dos_fields.Protected[field].obj.dispose();
                            } else if(Private.__dos_fields.Protected[field].params.const) {
                                Object.defineProperty(Protected, field, {
                                    value: undefined,
                                    writable: true,
                                    configurable: true
                                });
                            } else {
                                Protected[field] = undefined;
                            }
                        }
                        for(i = 0, len = privateFieldsKeys.length; i < len; ++i) {
                            field = privateFieldsKeys[i];
                            if(!Private.__dos_fields.Private[field].params.raw) {
                                Private.__dos_fields.Private[field].obj.dispose();
                            } else if(Private.__dos_fields.Private[field].params.const) {
                                Object.defineProperty(Private, field, {
                                    value: undefined,
                                    writable: true,
                                    configurable: true
                                });
                            } else {
                                Private[field] = undefined;
                            }
                        }
                        if(isDisposeRoot) {
                            classCtorProxy.__dos_allocator.dealloc(Public);
                        }
                    },
                    configurable: true,
                    enumerable: true
                });
            };

            /**
             * a property descriptor for DOS
             * @typedef {Object} DOSPropertyDescriptor
             * @property {String} name the property name
             * @property {*} value the property value
             * @property {Boolean} [getter=false] should be a getter
             * @property {Boolean} [setter=false] should be a setter
             * @property {Boolean} [writable=false] property should be writable
             */
            /**
             * @method definePropertyFromDesc
             * defines a property from a property desc
             *
             * @param {Object} scope the scope in which to define the property
             * @param {DOSPropertyDescriptor} desc a property desc object
             * @returns {*} the value of the property defined
             */
            var definePropertyFromDesc = function(scope, desc) {
                if(!desc) {
                    return undefined;
                }
                if(desc.getter) {
                    Object.defineProperty(scope, desc.name, {
                        get: desc.value,
                        enumerable: desc.hidden !== true,
                        configurable: true
                    });
                } else if(desc.setter) {
                    Object.defineProperty(scope, desc.name, {
                        set: desc.value,
                        enumerable: desc.hidden !== true,
                        configurable: true
                    });
                } else {
                    Object.defineProperty(scope, desc.name, {
                        value: desc.value,
                        configurable: true,
                        enumerable: desc.hidden !== true,
                        writable: !!desc.writable
                    });
                }
                return desc.value;
            };

            /**
             * @method emitInterface
             * emits an interface descriptor
             *
             * @param {Object} interfaceHolder the interface holder object
             * @param {String} scopeName the current scope name
             * @param {Function} classCtorProxy the instanced class' ctorProxy
             * @param {Object} scope the current scope
             * @param {String} name the interface name
             * @param {number} type the interface type
             * @throws {dos.ClassDefException}
             */
            var emitInterface = function(interfaceHolder, scopeName, classCtorProxy, scope, name, type) {
                if(isStatic) {
                    throw new dos.ClassDefException(canonicalClassName, "interfaces are not supported in static classes. did you mean to define an interface in the class body instead?");
                }
                if(scopeName === "Private") {
                    throw new dos.ClassDefException(canonicalClassName, "Private interfaces are invalid, because they cannot be overridden by derived classes. did you mean to use a Public or Protected access specifier?");
                }
                var curInterface = interfaceHolder[scopeName][name];
                // NOTE: the flag is here to prevent Object.__proto__ functions to creep into the check
                if(curInterface && curInterface.__dos_interfaceFlag) {
                    if(!(curInterface.type & type) && (curInterface.type & interfaceType.METHOD || type & interfaceType.METHOD)) {
                        // wrong interface type override
                        throw new dos.ClassDefException(canonicalClassName, "cannot override interface \"" + scopeName + "." + name + "\" of type \"" + interfaceTypeString[curInterface.type] + "\" inherited from \"" + curInterface.interface.__dos_classInfo.name + "\" with interface \"" + scopeName + "." + name + "\" of type \"" + interfaceTypeString[type] + "\" inherited from \"" + classCtorProxy.__dos_classInfo.name + "\"");
                    } else {
                        // merge getter and setter interfaces into one type
                        curInterface.type |= type;
                    }
                } else {
                    if(scope.hasOwnProperty(name)) {
                        var curInterfaceDesc = Object.getOwnPropertyDescriptor(scope, name);
                        if(curInterfaceDesc.value && curInterfaceDesc.__dos_interfaceFlag === false) {
                            // check for invalid overrides, but silently drop interface if the interface requirement set by
                            // the newly introduced interface meets the already existing implementation
                            if(type & interfaceType.GETTER && curInterfaceDesc.get === undefined) {
                                throw new dos.ClassDefException(canonicalClassName, "cannot override an implemented $getter interface with an interface of type " + interfaceTypeString[type]);
                            } else if(type & interfaceType.SETTER && curInterfaceDesc.set === undefined) {
                                throw new dos.ClassDefException(canonicalClassName, "cannot override an implemented $setter interface with an interface of type " + interfaceTypeString[type]);
                            } else if(type & interfaceType.METHOD && (curInterfaceDesc.set !== undefined || curInterfaceDesc.get !== undefined) && typeof curInterfaceDesc.value !== "function") {
                                throw new dos.ClassDefException(canonicalClassName, "cannot override an implemented $method interface with an interface of type " + interfaceTypeString[type]);
                            }
                        }
                        return;
                    }
                    scope[name] = {
                        __dos_interfaceFlag: true
                    };
                    interfaceHolder[scopeName][name] = {
                        __dos_interfaceFlag: true,
                        interface: classCtorProxy,
                        type: type
                    };
                }
            };

            /**
             * @method addFieldDesc
             * adds a field desc to the class' ctorproxy for use by the init fields mechanism
             * and serialization
             *
             * @param {Object} Private the Privates cope
             * @param {String} scopeName the current scope name
             * @param {Object} params the field params
             */
            var addFieldDesc = function(Private, scopeName, params) {
                var fieldDesc = Private.__dos_fields[scopeName];
                if(params.name in fieldDesc) {
                    throw new dos.ClassDefException(canonicalClassName, "cannot define multiple fields of same name in same scope (" + scopeName + "." + params.name + ")");
                }
                fieldDesc[params.name] = {
                    params: params,
                    obj: null
                };
            };

            /**
             * @method addRawFieldDesc
             * adds a field desc for a raw field to the class' ctorproxy for use by the init fields mechanism and
             * serialization
             *
             * @param {Object} Private the Privates cope
             * @param {String} scopeName the current scope name
             * @param {Object} scope the current scope
             * @param {Object} params the field params
             */
            var addRawFieldDesc = function(Private, scopeName, scope, params) {
                var fieldDesc = Private.__dos_fields[scopeName];
                if(params.name in fieldDesc) {
                    throw new dos.ClassDefException(canonicalClassName, "cannot define multiple fields of same name in same scope (" + scopeName + "." + params.name + ")");
                }

                var rawFieldDesc = {
                    params: params,
                    obj: {}
                };

                Object.defineProperties(rawFieldDesc.obj, {
                    "name": {
                        value: params.name,
                        enumerable: true,
                        configurable: true,
                        writable: true
                    },
                    "transient": {
                        value: params.transient,
                        enumerable: true,
                        configurable: true,
                        writable: true
                    },
                    "type": {
                        enumerable: true,
                        configurable: true,
                        get: function() {
                            var v = scope[params.name];
                            if(v instanceof Int8Array) {
                                return "Int8Array";
                            } else if(v instanceof Uint8Array) {
                                return "Uint8Array";
                            } else if(v instanceof Uint8ClampedArray) {
                                return "Uint8ClampedArray";
                            } else if(v instanceof Int16Array) {
                                return "Int16Array";
                            } else if(v instanceof Uint16Array) {
                                return "Uint16Array";
                            } else if(v instanceof Int32Array) {
                                return "Int32Array";
                            } else if(v instanceof Uint32Array) {
                                return "Uint32Array";
                            } else if(v instanceof Float32Array) {
                                return "Float32Array";
                            } else if(v instanceof Float64Array) {
                                return "Float64Array";
                            } else if(v instanceof Error) {
                                return "Error";
                            } else if(v instanceof RegExp) {
                                return "RegExp";
                            } else if(v instanceof Date) {
                                return "Date";
                            }
                            return Array.isArray(v) ? "array" : (v && v.class ? v.class : typeof v);
                        }
                    },
                    "$": {
                        enumerable: true,
                        configurable: true,
                        get: function() {
                            return scope[params.name];
                        },
                        set: function(v) {
                            scope[params.name] = v;
                        }
                    }
                });

                fieldDesc[params.name] = rawFieldDesc;
            };

            /**
             * @method resolveInterface
             * resolves an interface that was emitted during class construction
             *
             * @param {Object} interfaceHolder the interface holder object
             * @param {String} scopeName the current scope name
             * @param {Object} scope the current scope
             * @param {String} name the interface name
             * @param {Number} type the interface type
             * @throws {dos.ClassDefException}
             */
            var resolveInterface = function(interfaceHolder, scopeName, scope, name, type) {
                if(isStatic || scopeName === "Private") {
                    return;
                }
                var curInterface = interfaceHolder[scopeName][name];
                // NOTE: the flag is here to prevent Object.__proto__ functions to creep into the check
                if(curInterface && curInterface.__dos_interfaceFlag) {
                    // we have an interface to resolve
                    if(!(curInterface.type & type)) {
                        // wrong interface type override
                        throw new dos.ClassDefException(canonicalClassName, "cannot implement interface \"" + scopeName + "." + name + "\" of type \"" + interfaceTypeString[curInterface.type] + "\" inherited from \"" + curInterface.interface.__dos_classInfo.name + "\" with \"" + scopeName + "." + name + "\" of type \"" + interfaceTypeString[type] + "\"");
                    }
                    curInterface.type ^= type;
                    if(curInterface.type === 0) {
                        delete interfaceHolder[scopeName][name];
                    }
                }
            };

            /**
             * @method throwOnReservedName
             *
             * throws if a name is reserved in DOS
             *
             * @param {String} name the name of the requested method/getter/setter
             * @throws {dos.ClassDefException}
             */
            var throwOnReservedName = function(name) {
                if(reservedNames.hasOwnProperty(name)) {
                    throw new dos.ClassDefException(canonicalClassName, "cannot use reserved name \"" + name + "\" in $method");
                }
            };

            /**
             * the util function set that is injected before calling the impl of the class
             */
            var classDefinitionMethods = {
                $import: function(defaultRootModule, origCanonicalClassName, rootModuleOrCanonialClassName, optCanonicalClassName) {
                    var rootModule = defaultRootModule;
                    var canonicalClassName;
                    if(typeof rootModuleOrCanonialClassName === "object") {
                        rootModule = rootModuleOrCanonialClassName;
                        canonicalClassName = optCanonicalClassName;
                    } else if(typeof rootModuleOrCanonialClassName === "string") {
                        canonicalClassName = rootModuleOrCanonialClassName;
                    }
                    var ctorProxy = getCtorProxyFromCanonicalClassName(rootModule, canonicalClassName);
                    if(ctorProxy === undefined) {
                        throw new dos.ClassDefException(origCanonicalClassName, "$import of \"" + canonicalClassName + "\" failed. no such class/module. did you foget to require it?");
                    }
                    return ctorProxy;
                },
                $method: function(interfaceHolder, isReflect, scopeName, classCtorProxy, scope, name, optImpl, optForceOverride) {
                    if(!name || typeof name !== "string") {
                        throw new dos.ClassDefException(canonicalClassName, "name of method must be a string");
                    }

                    if(optForceOverride !== true) {
                        throwOnReservedName(name);
                    }

                    var impl;
                    if(typeof optImpl === "function") {
                        impl = optImpl;
                    }

                    if(impl === undefined) {
                        if(isReflect) {
                            throw new dos.ClassDefException(canonicalClassName, "cannot create method interface in reflection. did you mean to add a function body to the method?");
                        }
                        emitInterface(interfaceHolder, scopeName, classCtorProxy, scope, name, interfaceType.METHOD);
                    } else {

                        // might implement an interface, or just be a normal method.
                        resolveInterface(interfaceHolder, scopeName, scope, name, interfaceType.METHOD);
                        return definePropertyFromDesc(scope, {
                            name: name,
                            value: impl
                        });
                    }
                },
                $field: function(Public, Protected, Private, interfaceHolder, scopeName, scope, preStaticInitHolder, name, optParams, optForceOverride) {
                    if(!name || typeof name !== "string") {
                        throw new dos.ClassDefException(canonicalClassName, "name of field must be a string. did you forget to pass a string as the first parameter of $field?");
                    }

                    if(optForceOverride !== true) {
                        throwOnReservedName(name);
                    }

                    var params;
                    if(optParams) {
                        params = optParams;
                    } else {
                        params = {};
                    }
                    // TODO: maybe warn if opt params already has a name property
                    params.name = name;


                    var writable = true;
                    if(params.hasOwnProperty("isConst") && params.isConst === true) {
                        writable = false;
                        params.const = true;
                    }
                    if(isStatic && writable) {
                        params.raw = false;
                    }

                    if(params && params.hasOwnProperty("raw") && params.raw === true) {
                        // define a raw field. no wrapper.
                        if(params.autoDispose) {
                            throw new dos.ClassDefException(canonicalClassName, "tried to define autoDispose flag on a raw field \"" + scopeName + "." + name + "\". if you wish to dispose of DOS objects stored in a raw field, you should do it manually in $dispose.");
                        }

                        if(!writable && params.hasOwnProperty("value")) {
                            if(!isStatic || (isStatic && writable)) {
                                throw new dos.ClassDefException(canonicalClassName, "tried to define a value on a  raw field \"" + scopeName + "." + name + "\", that is not const. If you want to define a Static $field, please use $const, or initialize it in Public.$init of static");
                            } else {
                                if(params.value && params.value.__dos_preStaticObject) {
                                    // TODO: should not be necessary to set this to writable = true... test!
                                    writable = true;
                                    preStaticInitHolder.push({
                                        scope: scope,
                                        name: name,
                                        value: params.value,
                                        writable: false
                                    });
                                    params.value = undefined;
                                }
                            }
                        }

                        // NOTE: this is here, so that we save the raw field info for use in serialization (and possibly
                        // later in reflection)
                        addRawFieldDesc(Private, scopeName, scope, params);
                        resolveInterface(interfaceHolder, scopeName, scope, name, interfaceType.SETTER);
                        resolveInterface(interfaceHolder, scopeName, scope, name, interfaceType.GETTER);
                        // NOTE: intended implicit undefined in params .value
                        return definePropertyFromDesc(scope, {
                            name: name,
                            value: params.value,
                            writable: writable
                        });
                    }

                    if(params.hasOwnProperty("value")) {
                        throw new dos.ClassDefException(canonicalClassName, "$field desc cannot have a value");
                    }

                    // TODO: make binding to scope optional
                    var i, len, curScope;
                    if(params.hasOwnProperty("getter")) {
                        if(Array.isArray(params.getter)) {
                            params.getter.push(scope);
                        } else {
                            params.getter = [params.getter, scope];
                        }
                        for(i = 0, len = params.getter.length; i < len; ++i) {
                            curScope = params.getter[i];
                            if(curScope === Public) {
                                resolveInterface(interfaceHolder, "Public", curScope, name, interfaceType.GETTER);
                            } else if(curScope === Protected) {
                                resolveInterface(interfaceHolder, "Protected", curScope, name, interfaceType.GETTER);
                            } else if(curScope === Private) {
                                resolveInterface(interfaceHolder, "Private", curScope, name, interfaceType.GETTER);
                            } else {
                                throw new dos.ClassDefException(canonicalClassName, "$field desc getter only supports {Public, Protected, Private }.");
                            }
                        }
                    } else {
                        params.getter = scope;
                        resolveInterface(interfaceHolder, scopeName, scope, name, interfaceType.GETTER);
                    }
                    if(params.hasOwnProperty("setter")) {
                        if(Array.isArray(params.setter)) {
                            params.setter.push(scope);
                        } else {
                            params.setter = [params.setter, scope];
                        }
                        for(i = 0, len = params.setter.length; i < len; ++i) {
                            curScope = params.setter[i];
                            if(curScope === Public) {
                                resolveInterface(interfaceHolder, "Public", curScope, name, interfaceType.SETTER);
                            } else if(curScope === Protected) {
                                resolveInterface(interfaceHolder, "Protected", curScope, name, interfaceType.SETTER);
                            } else if(curScope === Private) {
                                resolveInterface(interfaceHolder, "Private", curScope, name, interfaceType.SETTER);
                            } else {
                                throw new dos.ClassDefException(canonicalClassName, "$field desc setter only supports {Public, Protected, Private }.");
                            }
                        }
                    } else {
                        params.setter = scope;
                        resolveInterface(interfaceHolder, scopeName, scope, name, interfaceType.SETTER);
                    }
                    addFieldDesc(Private, scopeName, params);
                },
                $const: function($field, name, params) {
                    if(!isStatic) {
                        throw new dos.ClassDefException(canonicalClassName, "$const is only allowed in static context. did you mean to create a constant $field with isConst and assign it's value in $init?");
                    }
                    if(!params.hasOwnProperty("value")) {
                        throw new dos.ClassDefException(canonicalClassName, "missing value in constant field definition. a constant always has to be assigned a value. did you forget to add { value: yourValue } to the $const declaration?");
                    }
                    if(params.hasOwnProperty("raw") && params.raw === false) {
                        throw new dos.ClassDefException(canonicalClassName, "defined $const field that is non-raw. $const fields are always raw and non-writable. you don't need to specify raw: false");
                    }
                    params.isConst = true;
                    params.raw = true;
                    $field(name, params);
                },
                $getter: function(interfaceHolder, isReflect, scopeName, classCtorProxy, scope, name, optImpl, optForceOverride) {
                    if(!name || typeof name !== "string") {
                        throw new dos.ClassDefException(canonicalClassName, "name of getter must be a string");
                    }

                    if(optForceOverride !== true) {
                        throwOnReservedName(name);
                    }

                    var impl;
                    if(typeof optImpl === "function") {
                        impl = optImpl;
                    }

                    if(impl === undefined) {
                        if(isReflect) {
                            throw new dos.ClassDefException(canonicalClassName, "cannot create getter interface in reflection. did you mean to add a function body to the getter?");
                        }
                        emitInterface(interfaceHolder, scopeName, classCtorProxy, scope, name, interfaceType.GETTER);
                    } else {
                        resolveInterface(interfaceHolder, scopeName, scope, name, interfaceType.GETTER);
                        return definePropertyFromDesc(scope, {
                            name: name,
                            value: impl,
                            getter: true
                        });
                    }
                },
                $setter: function(interfaceHolder, isReflect, scopeName, classCtorProxy, scope, name, optImpl, optForceOverride) {
                    if(!name || typeof name !== "string") {
                        throw new dos.ClassDefException(canonicalClassName, "name of setter must be a string");
                    }

                    if(optForceOverride !== true) {
                        throwOnReservedName(name);
                    }

                    var impl;
                    if(typeof optImpl === "function") {
                        impl = optImpl;
                    }

                    if(impl === undefined) {
                        if(isReflect) {
                            throw new dos.ClassDefException(canonicalClassName, "cannot create setter interface in reflection. did you mean to add a function body to the setter?");
                        }
                        emitInterface(interfaceHolder, scopeName, classCtorProxy, scope, name, interfaceType.SETTER);
                    } else {
                        resolveInterface(interfaceHolder, scopeName, scope, name, interfaceType.SETTER);
                        return definePropertyFromDesc(scope, {
                            name: name,
                            value: impl,
                            setter: true
                        });
                    }
                },
                $init: function(isStatic, scope, defaultsOrImpl, optImpl) {
                    var defaults;
                    var impl;
                    var typeDefaultsOrImpl = typeof defaultsOrImpl;
                    var typeOptImpl = typeof optImpl;
                    if(typeDefaultsOrImpl === "function" && typeOptImpl === "function") {
                        defaults = defaultsOrImpl;
                        impl = optImpl;
                    } else if(typeDefaultsOrImpl === "function" && typeOptImpl === "undefined") {
                        impl = defaultsOrImpl;
                        if(!isStatic) {
                            defaults = function() {};
                        }
                    } else {
                        // for now this is an invalid parameter combination.
                        throw new dos.ClassDefException(canonicalClassName, "invalid init method specified. did you forget to add an init function?");
                    }

                    if(isStatic) {
                        if(defaults !== undefined) {
                            throw new dos.ClassDefException(canonicalClassName, "static init should not have a defaults parameter.");
                        }
                        if(impl.length > 0) {
                            throw new dos.ClassDefException(canonicalClassName, "static init should not have any parameters. Did you forget to delete the (Params) argument from init?");
                        }
                    }

                    // a class always has a hidden property that stores the defaults function.
                    Object.defineProperty(scope, "__dos_setDefaults", {
                        value: defaults,
                        configurable: true,
                        enumerable: false
                    });

                    return definePropertyFromDesc(scope, {
                        name: "__dos_init",
                        value: impl,
                        hidden: true
                    });
                },
                $dispose: function(scope, impl) {
                    if(impl && typeof impl === "function") {
                        return definePropertyFromDesc(scope, {
                            name: "__dos_dispose",
                            value: impl,
                            hidden: true
                        });
                    }
                    throw new dos.ClassDefException(canonicalClassName, "tried to define dispose method without a function parameter");
                },
                $makeClass: function(scope, classFactory, name, Params) {
                    if(!Params || Params.hasOwnProperty("__dos_rootModule")) {
                        throw new dos.ClassDefException(canonicalClassName, "invalid inner class definition: no Params supplied or Params contains a rootModule");
                    }
                    if(name && name === "$Static") {
                        throw new dos.ClassDefException(canonicalClassName, "$Static is a reserved name for inner classes.");
                    }
                    Params.__dos_innerClass = true;
                    Params.__dos_outerClassCtorProxy = nonStaticClassCtorProxy;
                    Params.__dos_outerClassName = canonicalClassName;
                    classFactory(scope, name, Params);
                }
            };

            /**
             * @method addClassDefinitionMethods
             * adds the class definition methods to the class scope
             *
             * @param {Object} Public the Public scope of the class
             * @param {Object} Protected the Protected scope of the class
             * @param {Object} Private the Private scope of the class
             * @param {Function} classCtorProxy the class' ctor proxy
             * @param {Object} interfaceHolder the holder for all unresolved interfaces
             * @param {Object} preStaticInitHolder the holder for all unresolved static init calls
             */
            var addClassDefinitionMethods = function(Public, Protected, Private, classCtorProxy, interfaceHolder, preStaticInitHolder) {


                Public.$method = classDefinitionMethods.$method.bind(this, interfaceHolder, false, "Public", classCtorProxy, Public);
                Protected.$method = classDefinitionMethods.$method.bind(this, interfaceHolder, false, "Protected", classCtorProxy, Protected);
                Private.$method = classDefinitionMethods.$method.bind(this, interfaceHolder, false, "Private", classCtorProxy, Private);
                Public.$getter = classDefinitionMethods.$getter.bind(this, interfaceHolder, false, "Public", classCtorProxy, Public);
                Protected.$getter = classDefinitionMethods.$getter.bind(this, interfaceHolder, false, "Protected", classCtorProxy, Protected);
                Private.$getter = classDefinitionMethods.$getter.bind(this, interfaceHolder, false, "Private", classCtorProxy, Private);
                Public.$setter = classDefinitionMethods.$setter.bind(this, interfaceHolder, false, "Public", classCtorProxy, Public);
                Protected.$setter = classDefinitionMethods.$setter.bind(this, interfaceHolder, false, "Protected", classCtorProxy, Protected);
                Private.$setter = classDefinitionMethods.$setter.bind(this, interfaceHolder, false, "Private", classCtorProxy, Private);

                if(!isInterface) {
                    Public.$import = classDefinitionMethods.$import.bind(this, rootModule, canonicalClassName);

                    Public.$field = classDefinitionMethods.$field.bind(this, Public, Protected, Private, interfaceHolder, "Public", Public, preStaticInitHolder);
                    Protected.$field = classDefinitionMethods.$field.bind(this, Public, Protected, Private, interfaceHolder, "Protected", Protected, preStaticInitHolder);
                    Private.$field = classDefinitionMethods.$field.bind(this, Public, Protected, Private, interfaceHolder, "Private", Private, preStaticInitHolder);

                    Public.$dispose = classDefinitionMethods.$dispose.bind(this, Public);
                    Public.$init = classDefinitionMethods.$init.bind(this, isStatic, Public);

                    if(isStatic) {
                        Public.$const = classDefinitionMethods.$const.bind(this, Public.$field);
                        Protected.$const = classDefinitionMethods.$const.bind(this, Protected.$field);
                        Private.$const = classDefinitionMethods.$const.bind(this, Private.$field);

                        Public.$class = classDefinitionMethods.$makeClass.bind(this, Public, dos.$class);
                        Public.$exception = classDefinitionMethods.$makeClass.bind(this, Public, dos.$exception);
                        Public.$abstract = classDefinitionMethods.$makeClass.bind(this, Public, dos.$abstract);
                        Public.$root = classDefinitionMethods.$makeClass.bind(this, Public, dos.$root);
                        Public.$allocator = classDefinitionMethods.$makeClass.bind(this, Public, dos.$allocator);
                        Public.$static = classDefinitionMethods.$makeClass.bind(this, Public, dos.$static);

                        Protected.$class = classDefinitionMethods.$makeClass.bind(this, Protected, dos.$class);
                        Protected.$exception = classDefinitionMethods.$makeClass.bind(this, Protected, dos.$exception);
                        Protected.$abstract = classDefinitionMethods.$makeClass.bind(this, Protected, dos.$abstract);
                        Protected.$root = classDefinitionMethods.$makeClass.bind(this, Protected, dos.$root);
                        Protected.$allocator = classDefinitionMethods.$makeClass.bind(this, Protected, dos.$allocator);
                        Protected.$static = classDefinitionMethods.$makeClass.bind(this, Protected, dos.$static);

                        Private.$class = classDefinitionMethods.$makeClass.bind(this, Private, dos.$class);
                        Private.$exception = classDefinitionMethods.$makeClass.bind(this, Private, dos.$exception);
                        Private.$abstract = classDefinitionMethods.$makeClass.bind(this, Private, dos.$abstract);
                        Private.$root = classDefinitionMethods.$makeClass.bind(this, Private, dos.$root);
                        Private.$allocator = classDefinitionMethods.$makeClass.bind(this, Private, dos.$allocator);
                        Private.$static = classDefinitionMethods.$makeClass.bind(this, Private, dos.$static);
                    }

                }
            };

            /**
             * @method deleteClassDefHelpers
             * deletes the class definition helpers from the class scope
             *
             * @param {Object} Public the Public object of the class
             * @param {Object} Protected the Protected object of the class
             * @param {Object} Private the Private object of the class
             */
            var deleteClassDefHelpers = function(Public, Protected, Private) {
                var i, len, propName;
                var classDefinitionMethodsKeys = Object.keys(classDefinitionMethods);
                for(i = 0, len = classDefinitionMethodsKeys.length; i < len; ++i) {
                    // TODO: optimize cases in which it is cheaper to delete explicitly
                    propName = classDefinitionMethodsKeys[i];
                    if(Public.hasOwnProperty(propName)) {
                        delete Public[propName];
                    }
                    if(Protected.hasOwnProperty(propName)) {
                        delete Protected[propName];
                    }
                    if(Private.hasOwnProperty(propName)) {
                        delete Private[propName];
                    }
                }
                if(isStatic) {
                    delete Public.$class;
                    delete Public.$exception;
                    delete Public.$abstract;
                    delete Public.$root;
                    delete Public.$allocator;
                    delete Public.$static;

                    delete Protected.$class;
                    delete Protected.$exception;
                    delete Protected.$abstract;
                    delete Protected.$root;
                    delete Protected.$allocator;
                    delete Protected.$static;

                    delete Private.$class;
                    delete Private.$exception;
                    delete Private.$abstract;
                    delete Private.$root;
                    delete Private.$allocator;
                    delete Private.$static;
                }
            };

            /**
             * @method validateClass
             * validates a class interface by checking for various constraints
             *
             * @param {Object} interfaceHolder the interface description holder object
             * @throws {dos.ClassDefException} in case of failed validation
             */
            var validateClass = function(interfaceHolder) {
                // collect info from interfaceHolder
                var i, j, scope, name, ifaceLen, scopeLen, iface;
                var interfaceHolderKeys = Object.keys(interfaceHolder);
                var interfaceHolderScopeKeys;
                for(i = 0, ifaceLen = interfaceHolderKeys.length; i < ifaceLen; ++i) {
                    scope = interfaceHolderKeys[i];
                    interfaceHolderScopeKeys = Object.keys(interfaceHolder[scope]);
                    for(j = 0, scopeLen = interfaceHolderScopeKeys.length; j < scopeLen; ++j) {
                        name = interfaceHolderScopeKeys[j];
                        iface = interfaceHolder[scope][name];
                        throw new dos.ClassDefException(canonicalClassName, "failed to implement interface \"" + scope + "." + name + "\" of type \"" + interfaceTypeString[iface.type] + "\" inherited from \"" + iface.interface.__dos_classInfo.name + "\".");
                    }
                }
            };

            /**
             * @method getClassHierarchy
             * creates a flattened class hierarchy and returns it as an array
             *
             * @param {Function} startCtor the ctor proxy object from which to start hierarchy traversal
             * @returns {Array} an array of all class ctor proxies in the class hierarchy
             */
            var getClassHierarchy = function(startCtor) {
                var hierarchy = [];
                var ctor = startCtor;
                while(ctor !== undefined) {
                    hierarchy.push(ctor);
                    ctor = ctor.__dos_classInfo.super;
                }
                return hierarchy;
            };

            /**
             * @method isCtorProxy
             * checks if an object is a dos dos ctor proxy
             *
             * @param {Function} object the object to check
             * @returns {Boolean} true if object is a ctor proxy, false if not
             */
            var isCtorProxy = function(object) {
                return object && typeof object === "function" && object.__dos_classInfo !== undefined; // && object.name === "__dos_ctorProxy";
            };

            /**
             * @method createStaticClassScope
             * creates the static class scope
             *
             * @param {Object} Super the Super scope
             * @param {Object} Public the Public scope
             * @param {Object} Protected the Protected scope
             * @param {Object} Private the Private scope
             *
             * @returns {Object} a new wrapper object around all scopes
             */
            var createStaticClassScope = function(Super, Public, Protected, Private) {
                return {
                    Super: Super,
                    Public: Public,
                    Protected: Protected,
                    Private: Private
                };
            };

            /**
             * @method injectStaticScope
             * injects the static scope into the class scope
             *
             * @param {Object} Super the Super scope
             * @param {Object} Public the Public scope
             * @param {Object} Protected the Protected scope
             * @param {Object} Static the Static scope
             */
            var injectStaticScope = function(Super, Public, Protected, Static) {
                mergeInto(Public, Static.Public);
                mergeInto(Protected, Static.Protected);
                mergeInto(Super, Static.Public);
                mergeInto(Super, Static.Protected);
                copyInitDispose(Public, Static.Public);
                copyInitDispose(Super, Static.Public);
                injectInitFields(Public, Static.Public);
                injectInitFields(Super, Static.Public);
            };

            //
            // class construction
            //

            // alias the class' name param
            var classNameParam = name;

            // TODO: hide these flags from the user. need a new param that cannot be controlled by the user (i.e. a flag
            // param)
            // magic flag that is added to inner classes
            var isInner = Params && Params.hasOwnProperty("__dos_innerClass") && Params.__dos_innerClass === true;

            var outerClassCtorProxy;
            if(isInner) {
                outerClassCtorProxy = Params.__dos_outerClassCtorProxy;
            }

            // magic flag that is added to static classes
            var isStatic = Params && Params.hasOwnProperty("__dos_nonStaticClassCtorProxy") && Params.__dos_nonStaticClassCtorProxy !== undefined;
            if(isStatic) {
                var nonStaticClassCtorProxy = Params.__dos_nonStaticClassCtorProxy;
            }

            // magic flag that is added to interface classes
            var isInterface = Params && Params.hasOwnProperty("__dos_interfaceClass") && Params.__dos_interfaceClass === true;

            // is this a root class
            var isRoot = false;

            // get module from canonical super class name, default to Super in dos namespace
            var superClassCtorProxy;
            var canonicalSuperClassName = null;

            // NOTE: if no "extends" param is given we inherit from "null"
            if(Params.hasOwnProperty("extends")) {
                if(Params.extends === undefined) {
                    throw new dos.ClassDefException(classNameParam, "extends parameter of class cannot be of type \"undefined\". did you forget to include the class you wanted to extend from, or did you mean to write \"null\"?");
                }
                if(Params.extends !== null) {
                    if(isCtorProxy(Params.extends)) {
                        superClassCtorProxy = Params.extends;
                        // TODO: why is this not used?
                        canonicalSuperClassName = superClassCtorProxy.__dos_classInfo.name;
                        // disallow inheritance for interfaces, in we do not inherit interface hierarchies
                        if(isInterface && !superClassCtorProxy.__dos_classInfo.flags.isInterface) {
                            throw new dos.ClassDefException(classNameParam, "cannot extend classes from interfaces. did you mean to implement the interface, or inherit from another interface?");
                        }
                    } else if(typeof Params.extends === "string") {
                        throw new dos.ClassDefException(classNameParam, "extends parameter of type \"string\" is not supported. You have to use the proper super class constructor object");
                    } else {
                        throw new dos.ClassDefException(classNameParam, "extends parameter is neither a class nor a string. you need to pass a class constructor object.");
                    }
                } else {
                    isRoot = true;
                }
            } else {
                isRoot = true;
            }

            // NOTE: when we don't have the optional rootModule param, or no root module in the classInfo of the base, we assume everything should go into the global namespace
            var rootModule;
            if(Params.hasOwnProperty("__dos_rootModule")) {
                rootModule = Params.__dos_rootModule;
            } else {
                if(superClassCtorProxy) {
                    rootModule = superClassCtorProxy.__dos_classInfo.rootModule;
                } else {
                    throw new dos.ClassDefException(classNameParam, "cannot define class without rootModule parameter");
                }
            }

            // gather all interface ctor proxies
            var interfaceCtorProxies = [];
            if(Params.hasOwnProperty("implements")) {
                if(!Array.isArray(Params.implements)) {
                    throw new dos.ClassDefException(classNameParam, "implements parameter must be of array type containing valid constructor objects of interfaces");
                }
                for(var i = 0; i < Params.implements.length; ++i) {
                    if(isCtorProxy(Params.implements[i])) {
                        interfaceCtorProxies.push(Params.implements[i]);
                    } else {
                        throw new dos.ClassDefException(classNameParam, "implements parameter is not a valid class constructor object. you need to pass a valid class constructor object");
                    }
                }
            }

            // get moduleInfo from canonical class name and store in convenience vars
            var canonicalClassName = classNameParam;
            var moduleInfo = getModuleInfoFromCanonicalClassName(rootModule, canonicalClassName);
            var module = moduleInfo.module;
            var className = moduleInfo.className;


            // check for double definition of class and mask out case where Static was injected
            if(isCtorProxy(module) && !isStatic) {
                throw new dos.ClassDefException(canonicalClassName, "invalid definition of class inside another class. did you check your module path?");
            } else if(!isInner && isCtorProxy(module[className])) {
                throw new dos.ClassDefException(canonicalClassName, "double definition of class. did you import your class more than once?");
            }

            // if useRawParams is defined we do not instantiate dos.Fields for param objects passed to this class
            var useRawParams = false;
            if(Params.hasOwnProperty("useRawParams")) {
                useRawParams = (Params.useRawParams === true);
            }

            var manualSuperInit = false;
            if(Params.hasOwnProperty("manualSuperInit")) {
                manualSuperInit = (Params.manualSuperInit === true);
            }

            var isException = false;
            if(Params.hasOwnProperty("exception")) {
                isException = (Params.exception === true);
            }

            // build constructor proxy function
            if(Params.hasOwnProperty("abstract") && Params.abstract === true) {
                Object.defineProperty(module, className, {
                    enumerable: true,
                    configurable: true,
                    writable: true,
                    value: function __dos_abstract() {
                        throw new dos.ClassInstanceException(canonicalClassName, "cannot instantiate abstract class");
                    }
                });
                if(Params.hasOwnProperty("allocator") && Params.allocator !== null) {
                    throw new dos.ClassDefException(canonicalClassName, "abstract classes cannot have an allocator");
                }
            } else {
                if(isStatic) {
                    (function() {
                        Object.defineProperty(module, className, {
                            enumerable: false,
                            configurable: true,
                            writable: true,
                            value: function(Params) {
                                var newObject = module[className].__dos_allocator.alloc(module[className], this);
                                var defaultParams = {};
                                newObject.Public.__dos_initFields();
                                if(isInner) {
                                    Object.defineProperty(outerClassCtorProxy, innerClassShortName, {
                                        enumerable: false,
                                        configurable: true,
                                        writable: true,
                                        value: nonStaticClassCtorProxy
                                    });
                                }
                                newObject.Public.init();
                                var classInfoPropDesc = Object.getOwnPropertyDescriptor(module[className], "__dos_classInfo"); /* hide original ctor proxy */
                                Object.defineProperty(module, className, {
                                    configurable: true,
                                    enumerable: false,
                                    writable: true,
                                    value: function() {
                                        throw new dos.ClassInstanceException(canonicalClassName, "cannot instantiate static class");
                                    }
                                });
                                Object.defineProperty(module[className], "__dos_classInfo", classInfoPropDesc);
                                Object.defineProperty(module[className], "__dos_static", {
                                    value: newObject
                                });
                                return newObject;
                            }
                        });
                    })();
                } else if(isException) {
                    (function() {
                        Object.defineProperty(module, className, {
                            enumerable: true,
                            configurable: true,
                            writable: true,
                            value: function(Params) {
                                var newObject = module[className].__dos_allocator.alloc(module[className], this);
                                var defaultParams = {};
                                newObject.__dos_initFields();
                                newObject.__dos_setDefaults(defaultParams);
                                mergeInto(defaultParams, Params);
                                newObject.init(defaultParams);
                                return newObject;
                            }
                        });
                        module[className].prototype = Object.create(Error.prototype, {
                            constructor: {
                                value: module[className]
                            }
                        });
                    })();
                    (function() {
                        Object.defineProperty(module[className], "$deserialize", {
                            enumerable: false,
                            configurable: true,
                            writable: true,
                            value: function(Params) {
                                var newObject = module[className].__dos_allocator.alloc(module[className], this);
                                newObject.__dos_initFields();
                                return newObject;
                            }
                        });
                        module[className].$deserialize.prototype = Object.create(Error.prototype, {
                            constructor: {
                                value: module[className].$deserialize
                            }
                        });
                    })();
                } else {
                    (function() {
                        Object.defineProperty(module, className, {
                            enumerable: true,
                            configurable: true,
                            writable: true,
                            value: function(Params) {
                                if(!module[className].__dos_preStaticInit) {
                                    return {
                                        __dos_preStaticObject: true,
                                        ctor: module[className],
                                        params: Params
                                    };
                                }
                                var newObject = module[className].__dos_allocator.alloc(module[className], this);
                                var defaultParams = {};
                                newObject.__dos_initFields();
                                newObject.__dos_setDefaults(defaultParams);
                                mergeInto(defaultParams, Params);
                                newObject.init(defaultParams);
                                return newObject;
                            }
                        });
                    })();
                    (function() {
                        Object.defineProperty(module[className], "$deserialize", {
                            enumerable: false,
                            configurable: true,
                            writable: true,
                            value: function(Params) {
                                var newObject = module[className].__dos_allocator.alloc(module[className], this);
                                newObject.__dos_initFields();
                                return newObject;
                            }
                        });
                    })();

                }

            }

            // alias the class' ctor proxy for convenience
            var classCtorProxy = module[className];

            // TODO: classInfo can be a whole interface that exposes rtti functionality like in java.
            // set up class info
            var classInfoName;
            var innerClassShortName;
            if(isStatic) {
                if(isInner) {
                    innerClassShortName = canonicalClassName.replace(/\.\$Static$/g, "");
                    classInfoName = Params.__dos_outerClassName.replace(/\.\$Static$/g, "") + "." + innerClassShortName;
                } else {
                    classInfoName = canonicalClassName.replace(/\.\$Static$/g, "");
                }
            } else if(isInner) {
                classInfoName = Params.__dos_outerClassName.replace(/\.\$Static$/g, "") + "." + canonicalClassName;
            } else {
                classInfoName = canonicalClassName;
            }
            Object.defineProperty(classCtorProxy, "__dos_classInfo", {
                value: {
                    name: classInfoName,
                    simpleName: classInfoName.substring(classInfoName.lastIndexOf(".") + 1),
                    ctor: classCtorProxy,
                    super: superClassCtorProxy,
                    interfaces: interfaceCtorProxies,
                    rootModule: rootModule,
                    flags: {
                        useRawParams: useRawParams,
                        manualSuperInit: manualSuperInit,
                        isInterface: isInterface,
                        isStatic: isStatic,
                        isInner: isInner,
                        isRoot: isRoot
                    }
                }
            });

            // setup the class hierarchy once
            classCtorProxy.__dos_classInfo.hierarchy = getClassHierarchy(classCtorProxy);

            // add the classCtorProxy to the global class graph
            if(!dos.hasOwnProperty("__dos_classGraph")) {
                Object.defineProperty(dos, "__dos_classGraph", {
                    value: []
                });
            }

            // TODO: check whether it is okay to not pull in static class ctors.
            if(!isStatic) {
                dos.__dos_classGraph.push(classCtorProxy);
            }


            // inject a toString method to the classCtorProxy to allow for meaningful outputs in a console or concatenated
            // string
            Object.defineProperty(classCtorProxy, "toString", {
                value: function() {
                    return classInfoName;
                }
            });

            // TODO: experimental api; investigate how to harden it.
            if(isInterface) {
                Object.defineProperty(classCtorProxy, "getAllImplementingClasses", {
                    value: function() {
                        var classGraph = dos.__dos_classGraph;
                        var res = [];
                        for(var i = 0, len = classGraph.length; i < len; ++i) {
                            var curClassCtorProxy = classGraph[i];
                            if(curClassCtorProxy !== classCtorProxy && curClassCtorProxy.implements && curClassCtorProxy.implements(classCtorProxy)) {
                                res.push(curClassCtorProxy);
                            }
                        }
                        return res;
                    }
                });
            } else {
                // NOTE: the class will not be recorded as being derived from itself
                Object.defineProperty(classCtorProxy, "getAllDerivedClasses", {
                    value: function() {
                        var classGraph = dos.__dos_classGraph;
                        var res = [];
                        for(var i = 0, len = classGraph.length; i < len; ++i) {
                            var curClassCtorProxy = classGraph[i];
                            if(curClassCtorProxy !== classCtorProxy && curClassCtorProxy.instanceof && curClassCtorProxy.instanceof(classCtorProxy)) {
                                res.push(curClassCtorProxy);
                            }
                        }
                        return res;
                    }
                });
            }

            var allocatorParams;
            if(Params.hasOwnProperty("allocatorParams")) {
                // TODO: check type of allocatorParams
                allocatorParams = Params.allocatorParams;
            }

            // parse allocator params and setup class allocator as needed
            if(Params.hasOwnProperty("allocator")) {
                if(Params.allocator === undefined) {
                    throw new dos.ClassDefException(classNameParam, "allocator parameter of class cannot be of type \"undefined\". did you mean to write \"null\"?");
                }
                // this basically means that the class to be defined is an allocator itself.
                if(Params.allocator === null) {
                    // TODO: this is not an appropriate emulation of a DOS object. e.g. it is missing the
                    // __dos_classInfo prop etc.
                    Object.defineProperty(classCtorProxy, "__dos_allocator", {
                        value: {},
                        configurable: true
                    });
                    Object.defineProperty(classCtorProxy.__dos_allocator, "alloc", {
                        value: function(ClassCtorProxy, Public) {
                            return ClassCtorProxy.__dos_ctor.call(Public, Public);
                        }
                    });
                    Object.defineProperty(classCtorProxy.__dos_allocator, "dealloc", {
                        value: function(obj) {}
                    });
                    Object.defineProperty(classCtorProxy, "__dos_allocator", {
                        configurable: false
                    });

                    if(!dos.__dos_Class.hasOwnProperty("__dos_defaultAllocator")) {
                        // in case no default was given, but we do not have a default allocator yet, we set the first
                        // encountered as the default
                        Object.defineProperty(dos.__dos_Class, "__dos_defaultAllocator", {
                            value: classCtorProxy,
                            writable: true,
                            enumerable: false
                        });
                    } else if(Params.hasOwnProperty("isDefaultAllocator") && Params.isDefaultAllocator === true) {
                        dos.__dos_Class.__dos_defaultAllocator = classCtorProxy;
                    }

                } else {
                    if(isCtorProxy(Params.allocator)) {
                        Object.defineProperty(classCtorProxy, "__dos_allocator", {
                            value: new Params.allocator(allocatorParams)
                        });
                    } else if(typeof Params.allocator === "string") {
                        throw new dos.ClassDefException(classNameParam, "allocator parameter of type \"string\" is not supported. You have to use the proper allocator class constructor object");
                    } else {
                        throw new dos.ClassDefException(classNameParam, "allocator parameter is invalid. You have to use the proper allocator class constructor object");
                    }
                }
            } else {
                Object.defineProperty(classCtorProxy, "__dos_allocator", {
                    value: new dos.__dos_Class.__dos_defaultAllocator(allocatorParams)
                });
            }

            // TODO: when whe have already built the closure that instantiates this class, we do not longer need to do all
            // the injection, thus we have to early out here and just alias this ctor to the built ctor
            // -> IMPORTANT because otherwise we always rebuild the class in the closure!
            // -> IDEA: put all the stuff in the global class scope as a "prototype" and then clone from that using bind
            // TODO: revise the cases in which an interface class does not need to do anything.
            // TODO: revise cases in which superClassCtorProxy is used, but should not be used in cases of
            // mixins/interfaces
            var isNotRoot = superClassCtorProxy !== undefined;
            var isNotAllocator = Params.allocator !== null;
            var instanceCtorBuilder = function(Public, Protected, isLeaf, interfaceHolder) {
                isLeaf = isLeaf === undefined;
                interfaceHolder = interfaceHolder || {
                    Public: {},
                    Protected: {}
                };

                var preStaticInitHolder;
                if(isStatic) {
                    preStaticInitHolder = [];
                }

                var Super = {};
                Protected = Protected || {};
                var Private = {};

                Object.defineProperty(Private, "__dos_fields", {
                    value: {
                        Public: {},
                        Protected: {},
                        Private: {}
                    }
                });

                if(isNotRoot) {
                    if(isStatic) {
                        injectStaticScope(Super, Public, Protected, superClassCtorProxy.__dos_static);
                    } else {
                        superClassCtorProxy.__dos_ctor.call(Public, Public, Protected, false, interfaceHolder);
                    }
                } else {
                    // define default init and dispose hidden functions as empty, they can be overwritten later.
                    definePropertyFromDesc(Public, {
                        name: "__dos_init",
                        value: function() {},
                        hidden: true
                    });
                    definePropertyFromDesc(Public, {
                        name: "__dos_dispose",
                        value: function() {},
                        hidden: true
                    });
                }

                // TODO: in case of mixins the inits of the mixed-in classes have to be called
                // NOTE: it is an invariant that interface ctor proxy is an array
                if(interfaceCtorProxies) {
                    var interfaces = interfaceCtorProxies.length;
                    for(var i = 0; i < interfaces; ++i) {
                        if(isStatic) {
                            injectStaticScope(Super, Public, Protected, interfaceCtorProxies[i].__dos_static);
                        } else {
                            interfaceCtorProxies[i].__dos_ctor.call(Public, Public, Protected, false, interfaceHolder);
                        }
                    }
                }

                if(!isStatic) {
                    if(!isInterface && isNotRoot) {
                        injectInitDispose(Super, Public);
                        injectSetDefaults(Super, Public);
                        injectInitFields(Super, Public);
                        injectSerialization(Super, Public);
                    }
                    prePopulateSuper(Super, Public, Protected);
                }

                addClassDefinitionMethods(Public, Protected, Private, classCtorProxy, interfaceHolder, preStaticInitHolder);

                if(!isInterface) {
                    injectReflection(Public, Protected, Private, isStatic, interfaceHolder);
                }
                if(Params.$) {
                    if(isStatic) {
                        Params.$.call(Public, Public, Super, Public, Protected, Private);
                    } else {
                        Params.$.call(Public, Public, Super, classCtorProxy.$Static.__dos_static, Public, Protected, Private);
                    }
                }

                if(!isInterface) {
                    if(!isStatic) {
                        injectDefaults(Super, Public, isNotRoot);
                        injectFieldAccessor(Super, Public, Private);
                        injectSerializedFieldInit(Super, Public, Private);
                    }
                    injectRTTI(Public, isStatic ? nonStaticClassCtorProxy : classCtorProxy);
                    injectInit(Super, Public, isNotRoot && !isStatic, preStaticInitHolder);
                    injectFieldInit(Super, Public, Private);
                    if(isNotAllocator || isStatic) {
                        injectDispose(Super, Public, Protected, Private, classCtorProxy);
                    }
                }

                deleteClassDefHelpers(Public, Protected, Private);

                if(isLeaf) {
                    validateClass(interfaceHolder);
                    if(isStatic) {
                        // add magic flag indicating that the static has now been initialized properly, such that
                        // resolving of static $const values can be done in init
                        Object.defineProperty(nonStaticClassCtorProxy, "__dos_preStaticInit", {
                            value: true
                        });
                        // build the static class scope holder
                        var staticClassScope = createStaticClassScope(Super, Public, Protected, Private);
                        // hide init and dispose from the user
                        var initPropDesc = Object.getOwnPropertyDescriptor(staticClassScope.Public, "init");
                        var disposePropDesc = Object.getOwnPropertyDescriptor(staticClassScope.Public, "dispose");
                        initPropDesc.enumerable = false;
                        disposePropDesc.enumerable = false;
                        Object.defineProperty(staticClassScope.Public, "init", initPropDesc);
                        Object.defineProperty(staticClassScope.Public, "dispose", disposePropDesc);
                        // push the static class scope holder into teh .$Static ctor proxy (intermediate, as a flag for
                        // __dos_preStaticInit)
                        Object.defineProperty(classCtorProxy, "__dos_static", {
                            value: staticClassScope,
                            configurable: true
                        });
                        return staticClassScope;
                    }
                    // add magic dos ident flag.
                    // TODO: overhead?
                    Object.defineProperty(Public, "__dos_isObject", {
                        value: true
                    });
                    return Public;
                }
            };

            // define hidden ctor
            Object.defineProperty(classCtorProxy, "__dos_ctor", {
                value: instanceCtorBuilder
            });

            // TODO: this is experimental code; we have to check side effects
            // this injects the ctor of the inner class into outer class before static traversal
            if(isInner && !isStatic) {
                Object.defineProperty(outerClassCtorProxy, className, {
                    value: classCtorProxy,
                    configurable: true
                });
            }

            // build static class part
            if(!isStatic) {
                var StaticImpl;
                if(Params.hasOwnProperty("static")) {
                    if(typeof Params.static !== "function") {
                        throw new dos.ClassDefException(canonicalClassName, "\"static\" parameter of class is not a function.");
                    }
                    StaticImpl = Params.static;
                } else {
                    StaticImpl = function(This, Super, Public, Protected, Private) {};
                }

                // make sure to inject the inner class params, in case tha static is a static of an inner class in which
                // case we need that information to construct the correct class name for the static case of the inner
                // class
                var staticCtor = dos.__dos_Class(canonicalClassName + ".$Static", {
                    __dos_nonStaticClassCtorProxy: classCtorProxy,
                    __dos_innerClass: isInner,
                    __dos_outerClassCtorProxy: outerClassCtorProxy,
                    __dos_outerClassName: Params.__dos_outerClassName,
                    __dos_rootModule: rootModule,
                    extends: superClassCtorProxy === undefined ? null : superClassCtorProxy.$Static,
                    allocator: null,
                    useRawParams: true,
                    $: StaticImpl
                });

                // instantiate newly constructed static class part
                var Static = new staticCtor();

                // merge Public part into the classCtorProxy
                mergeInto(classCtorProxy, Static.Public);

                // lazily create a global structure for all static class instances
                if(!dos.__dos_Class.hasOwnProperty("__dos_statics")) {
                    Object.defineProperty(dos.__dos_Class, "__dos_statics", {
                        value: []
                    });
                }

                // add static class instance into the global statics list (order of definition)
                dos.__dos_Class.__dos_statics.push(Static);

                // lazily create a global method to deinitialize all static class instances for clean teardown of DOS
                if(!dos.__dos_Class.hasOwnProperty("__dos_deinitStatics")) {
                    Object.defineProperty(dos.__dos_Class, "__dos_deinitStatics", {
                        value: function() {
                            var statics = dos.__dos_Class.__dos_statics;
                            for(var i = statics.length - 1; i >= 0; --i) {
                                statics[i].Public.dispose();
                            }
                            statics.length = 0;
                        }
                    });
                }
            }
            // return the classCtorProxy to allow for immediate class definition and instantiation (could be used for
            // anonymous classes)
            return classCtorProxy;
        } catch(e) {
            // in case we catch any error, we delete the class' remnants from the global/rootModule namespace and
            // rethrow
            // NOTE: this allows for automated recovery in case of programmatically built classes
            if(canonicalClassName !== undefined && rootModule !== undefined) {
                // TODO: change definition of function
                var info = getModuleInfoFromCanonicalClassName(rootModule, canonicalClassName);
                delete info.module[info.className];
            }
            throw e;
        }
    }
});

/**
 * @method $deinit
 * static deinitialization. deinits all static data in reverse order of its creation, by calling all static dispose
 * methods
 */
dos.$deinit = function() {
    if(dos.__dos_Class.hasOwnProperty("__dos_deinitStatics")) {
        dos.__dos_Class.__dos_deinitStatics();
    }
};

var getParamsAndRootModule = function(rootModule, name, Params) {
    Params.__dos_rootModule = rootModule;
    return {
        name: name,
        Params: Params
    };
};

/**
 * @method $class
 * defines a concrete class.
 */
dos.$class = function(rootModule, name, Params) {
    var p = getParamsAndRootModule(rootModule, name, Params);
    if(p.Params.hasOwnProperty("abstract") && p.Params.abstract === true) {
        throw new dos.ClassDefException(p.name || "$class", "a concrete class cannot be abstract. use dos.$abstract to define abstract classes.");
    }
    if(p.Params.hasOwnProperty("exception") && p.Params.exception === true) {
        throw new dos.ClassDefException(p.name || "$class", "a concrete class cannot be an exception. use dos.$exception to define exceptions.");
    }
    return dos.__dos_Class(p.name, p.Params);
};

/**
 * @method $exception
 * defines an exception class. exception classes can be thrown and produce correct stack-traces.
 */
dos.$exception = function(rootModule, name, Params) {
    var p = getParamsAndRootModule(rootModule, name, Params);
    Object.defineProperty(p.Params, "exception", {
        value: true
    });
    return dos.__dos_Class(p.name, p.Params);
};

/**
 * @method $abstract
 * defines an abstract class. abstract classes cannot be instantiated.
 */
dos.$abstract = function(rootModule, name, Params) {
    var p = getParamsAndRootModule(rootModule, name, Params);
    Object.defineProperty(p.Params, "abstract", {
        value: true
    });
    return dos.__dos_Class(p.name, p.Params);
};

/**
 * @method $root
 * defines a root class, that is an inheritance base for a class hierarchy.
 * NOTE: this is just useful if you are building a larger system requiring some abstract base.
 */
dos.$root = function(rootModule, name, Params) {
    var p = getParamsAndRootModule(rootModule, name, Params);
    Object.defineProperty(p.Params, "extends", {
        value: null
    });
    Object.defineProperty(p.Params, "abstract", {
        value: true
    });
    return dos.__dos_Class(p.name, p.Params);
};

/**
 * @method $allocator
 * defines an allocator class
 */
dos.$allocator = function(rootModule, name, Params) {
    var p = getParamsAndRootModule(rootModule, name, Params);
    Object.defineProperty(p.Params, "allocator", {
        value: null
    });
    return dos.__dos_Class(p.name, p.Params);
};

/**
 * @method $static
 * defines a static class. a static class can only contain static definitions and is as such invariantly abstract.
 */
dos.$static = function(rootModule, name, Params) {
    var p = getParamsAndRootModule(rootModule, name, Params);
    if(p.Params.hasOwnProperty("$")) {
        throw new dos.ClassDefException(p.name || "$static", "a static class cannot have a class body.");
    }
    if(p.Params.hasOwnProperty("abstract") && p.Params.abstract === true) {
        throw new dos.ClassDefException(p.name || "$static", "a static class cannot be concrete. you don't need to specify the abstract parameter, it will be added by default.");
    }
    if(p.Params.hasOwnProperty("exception") && p.Params.exception === true) {
        throw new dos.ClassDefException(p.name || "$static", "a static class cannot be an exception. use dos.$exception to define exceptions.");
    }
    if(p.Params.hasOwnProperty("allocator") && p.Params.allocator !== null) {
        throw new dos.ClassDefException(p.name || "$static", "a static class cannot have an allocator.");
    }
    Object.defineProperty(p.Params, "abstract", {
        value: true
    });
    return dos.__dos_Class(p.name, p.Params);
};

/**
 * @method $interface
 * defines an interface. interfaces are abstract and cannot contain any data or implementation.
 */
dos.$interface = function(rootModule, name, Params) {
    var p = getParamsAndRootModule(rootModule, name, Params);
    if(p.Params.hasOwnProperty("abstract") && p.Params.abstract === true) {
        throw new dos.ClassDefException(p.name || "$interface", "an interface class cannot be concrete. you don't need to specify the abstract parameter, it will be added by default.");
    }
    if(p.Params.hasOwnProperty("exception") && p.Params.exception === true) {
        throw new dos.ClassDefException(p.name || "$interface", "an interface class cannot be an exception. use dos.$exception to define exceptions.");
    }
    if(p.Params.hasOwnProperty("allocator") && p.Params.allocator !== null) {
        throw new dos.ClassDefException(p.name || "$interface", "an interface class cannot have an allocator.");
    }
    Object.defineProperty(p.Params, "abstract", {
        value: true
    });
    Object.defineProperty(p.Params, "__dos_interfaceClass", {
        value: true
    });
    return dos.__dos_Class(p.name, p.Params);
};

/**
 * @method isDOSClass
 * checks if given object is a DOS class constructor
 * TODO: replace in case of new RTTI
 *
 * @param {Function} object the object to check
 * @returns {Boolean} true if object is a DOS class constructor, false if not
 */
dos.isDOSClass = function(object) {
    return object && typeof object === "function" && object.__dos_classInfo !== undefined;
};

dos.isDOSObject = function(object) {
    return object && typeof object === "object" && object.__dos_isObject === true;
};

dos.$allocator(dos, "Allocator", {
    isDefaultAllocator: true,
    useRawParams: true,
    abstract: true,
    static: function(This, Super, Public, Protected, Private) {
        Protected.$const("allocationMap", {
            value: {}
        });
        Protected.$const("deallocationMap", {
            value: {}
        });
        Protected.$const("allocDeallocDiffMap", {
            value: {}
        });

        // NOTE: we can not use dos.Field here since this class must be included before it.
        Public.$getter("allocationMap", function() {
            return Protected.allocationMap;
        });
        Public.$getter("deallocationMap", function() {
            return Protected.deallocationMap;
        });
        Public.$getter("allocDeallocDiffMap", function() {
            return Protected.allocDeallocDiffMap;
        });

        Protected.$method("addToAllocationMap", function(name) {
            Protected.allocationMap[name] = Protected.allocationMap[name] !== undefined ? Protected.allocationMap[name] : 0;
            Protected.allocDeallocDiffMap[name] = Protected.allocDeallocDiffMap[name] !== undefined ? Protected.allocDeallocDiffMap[name] : 0;
            ++Protected.allocationMap[name];
            ++Protected.allocDeallocDiffMap[name];
        });
        Protected.$method("addToDeallocationMap", function(name) {
            Protected.deallocationMap[name] = Protected.deallocationMap[name] !== undefined ? Protected.deallocationMap[name] : 0;
            Protected.allocDeallocDiffMap[name] = Protected.allocDeallocDiffMap[name] !== undefined ? Protected.allocDeallocDiffMap[name] : 0;
            ++Protected.deallocationMap[name];
            --Protected.allocDeallocDiffMap[name];
        });
    },
    $: function(This, Super, Static, Public, Protected, Private) {
        Protected.$field("debug", {
            raw: true
        });
        Public.$init(function(Params) {
            Protected.debug = !!Params.debug;
        });
        Public.$method("alloc", function(ClassCtorProxy, Public) {
            if(Protected.debug) {
                Static.Protected.addToAllocationMap(ClassCtorProxy.__dos_classInfo.name);
            }
        });
        Public.$method("dealloc", function(obj) {
            if(Protected.debug) {
                Static.Protected.addToDeallocationMap(obj.className);
            }
        });
    }
});

dos.$allocator(dos, "PoolAllocator", {
    isDefaultAllocator: true,
    useRawParams: true,
    extends: dos.Allocator,
    $: function(This, Super, Static, Public, Protected, Private) {
        Private.$field("unused", {
            raw: true
        });
        Public.$init(function() {
            Private.unused = [];
        });
        Public.$method("alloc", function(ClassCtorProxy, Public) {
            Super.alloc(ClassCtorProxy, Public);
            if(Private.unused.length > 0) {
                return Private.unused.pop();
            } else {
                return ClassCtorProxy.__dos_ctor.call(Public, Public);
            }
        });
        Public.$method("dealloc", function(obj) {
            Super.dealloc(obj);
            Private.unused.push(obj);
        });
    }
});

dos.$class(dos, "Field", {
    useRawParams: true,
    static: function(This, Super, Public, Protected, Private) {
        Private.$const("types", {
            raw: true,
            value: ["undefined", "boolean", "number", "object", "string", "array", "function", "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "Float32Array", "Float64Array", "Error", "RegExp", "Date"]
        });
        Public.$method("getType", function(v) {
            if(v && v.class) {
                return v.class;
            } else if(v instanceof Int8Array) {
                return "Int8Array";
            } else if(v instanceof Uint8Array) {
                return "Uint8Array";
            } else if(v instanceof Uint8ClampedArray) {
                return "Uint8ClampedArray";
            } else if(v instanceof Int16Array) {
                return "Int16Array";
            } else if(v instanceof Uint16Array) {
                return "Uint16Array";
            } else if(v instanceof Int32Array) {
                return "Int32Array";
            } else if(v instanceof Uint32Array) {
                return "Uint32Array";
            } else if(v instanceof Float32Array) {
                return "Float32Array";
            } else if(v instanceof Float64Array) {
                return "Float64Array";
            } else if(v instanceof Error) {
                return "Error";
            } else if(v instanceof RegExp) {
                return "RegExp";
            } else if(v instanceof Date) {
                return "Date";
            } else if(Array.isArray(v)) {
                return "array";
            } else {
                return typeof v;
            }
        });

    },
    $: function(This, Super, Static, Public, Protected, Private) {
        Private.$field("onTypeChange", {
            raw: true
        });
        Private.$field("onValueChange", {
            raw: true
        });
        Private.$field("konzt", {
            raw: true
        });
        Private.$field("constInited", {
            raw: true
        });
        /** @field {Boolean} [polymorphic=false] Whether this field is type-safe. */
        Private.$field("typesafe", {
            raw: true
        });
        /** @field {Boolean} [nonPolymorphic=true] Whether this field is not polymorphic-type-safe. */
        Private.$field("nonPolymorphic", {
            raw: true
        });
        Private.$field("type", {
            raw: true
        });
        Private.$field("value", {
            raw: true
        });
        Private.$field("name", {
            raw: true
        });
        Private.$field("setterBindTargets", {
            raw: true
        });
        Private.$field("getterBindTargets", {
            raw: true
        });
        Private.$field("autoDispose", {
            raw: true
        });
        Private.$field("transient", {
            raw: true
        });

        Private.$method("init", function(v) {
            var newType = Static.Public.getType(v);
            if(v !== null && v !== undefined) {
                if(Private.typesafe && Private.type !== "undefined" && Private.type !== newType &&
                    Private.nonPolymorphic && (dos.isDOSClass(Private.type) && dos.isDOSClass(newType) && !newType.instanceof(Private.type))) {
                    throw new TypeError("cannot assign \"" + newType + "\" to typesafe property of type: \"" + Private.type + "\"");
                }
                Private.type = newType;
            }
            Private.value = v;
        });

        Public.$init(function(Params) {
            var callbacks = Params.callbacks || {};

            if(Array.isArray(Private.setterBindTargets)) {
                Private.setterBindTargets.length = 0;
            } else {
                Private.setterBindTargets = [];
            }
            if(Array.isArray(Private.getterBindTargets)) {
                Private.getterBindTargets.length = 0;
            } else {
                Private.getterBindTargets = [];
            }
            // NOTE: deliberate implicit undefined here.
            Private.onTypeChange = callbacks.onTypeChange;
            Private.onValueChange = callbacks.onValueChange;

            Private.konzt = !!Params.isConst;
            Private.constInited = false;
            Private.typesafe = Params.typesafe === undefined ? true : !!Params.typesafe;
            Private.transient = Params.transient === undefined ? false : !!Params.transient;
            Private.nonPolymorphic = Params.polymorphic === undefined ? true : !Params.polymorphic;

            // FIXME: in case of class types we end up undefined type. so first set decides. do we need to fix that?
            Private.type = Static.Private.types.indexOf(Params.type) === -1 ? "undefined" : Params.type;
            Private.name = Params.name;
            Private.autoDispose = !!Params.autoDispose;

            Private.init(Params.value);
            Private.setupGetSetBinding(Params);
        });

        Public.$getter("name", function() {
            return Private.name;
        });

        Public.$getter("transient", function() {
            return Private.transient;
        });

        Public.$setter("onValueChange", function(v) {
            Private.onValueChange = v;
        });

        Public.$setter("onTypeChange", function(v) {
            Private.onTypeChange = v;
        });

        Public.$getter("type", function() {
            return Private.type;
        });

        Private.$method("setupGetSetBinding", function(Params) {
            var i;
            if(Params.getter) {
                if(Array.isArray(Params.getter)) {
                    for(i = 0; i < Params.getter.length; ++i) {
                        Public.bindGetter(Params.getter[i]);
                    }
                } else {
                    Public.bindGetter(Params.getter);
                }
            }
            if(Params.setter) {
                if(Array.isArray(Params.setter)) {
                    for(i = 0; i < Params.setter.length; ++i) {
                        Public.bindSetter(Params.setter[i]);
                    }
                } else {
                    Public.bindSetter(Params.setter);
                }
            }
        });

        Private.$method("get", function() {
            return Private.value;
        });

        Private.$method("set", function(v) {
            if(Private.konzt) {
                if(Private.constInited) {
                    return;
                } else {
                    Private.constInited = true;
                }
            }
            var typeChange = false,
                valueChange = false;
            var newType = Static.Public.getType(v);
            if(v !== null && v !== undefined) {
                if(Private.typesafe && Private.type !== "undefined" && Private.type !== newType &&
                    // TODO: need isAssignableFrom semantic for interfaces
                    Private.nonPolymorphic && (dos.isDOSClass(Private.type) && dos.isDOSClass(newType) && !newType.instanceof(Private.type))) {

                    throw new TypeError("cannot assign \"" + newType + "\" to typesafe property of type: \"" + Private.type + "\"");
                }
                if(Private.nonPolymorphic) {
                    typeChange = newType !== Private.type;
                    Private.type = newType;
                }
            }
            valueChange = v !== Private.value;
            var oldValue = Private.value;
            Private.value = v;
            if(Private.onTypeChange && typeChange) {
                Private.onTypeChange(Private.type);
            }
            if(Private.onValueChange && valueChange) {
                Private.onValueChange(Private.value, oldValue);
            }
            // if the field is set to autoDispose we need to dispose of the value when someone sets it to a new value
            if(Private.autoDispose && valueChange) {
                if(dos.isDOSObject(oldValue)) {
                    oldValue.dispose();
                }
            }
        });

        Public.$getter("$", Private.get);
        Public.$setter("$", Private.set);

        Public.$method("bindGetter", function(target) {
            Private.getterBindTargets.push(target);
            Object.defineProperty(target, Private.name, {
                get: Private.get,
                enumerable: true,
                configurable: true
            });
        });

        Public.$method("bindSetter", function(target) {
            Private.setterBindTargets.push(target);
            Object.defineProperty(target, Private.name, {
                set: Private.set,
                enumerable: true,
                configurable: true
            });
        });

        Public.$dispose(function() {
            var name = Private.name;
            // delete all get/set bind targets
            var len = Private.setterBindTargets.length;
            var i, curTarget, curBindingDesc;
            for(i = 0; i < len; ++i) {
                curTarget = Private.setterBindTargets[i];
                curBindingDesc = Object.getOwnPropertyDescriptor(curTarget, name);
                curBindingDesc.set = undefined;
                Object.defineProperty(curTarget, name, curBindingDesc);
            }
            Private.setterBindTargets.length = 0;
            len = Private.getterBindTargets.length;
            for(i = 0; i < len; ++i) {
                curTarget = Private.getterBindTargets[i];
                curBindingDesc = Object.getOwnPropertyDescriptor(curTarget, name);
                curBindingDesc.get = undefined;
                Object.defineProperty(curTarget, name, curBindingDesc);
            }
            Private.getterBindTargets.length = 0;

            if(Private.autoDispose) {
                // TODO: if we have class based types we can replace this check with a generic one
                if(dos.isDOSObject(Private.value)) {
                    Private.value.dispose();
                }
            }
            Private.value = undefined;
            Private.onTypeChange = undefined;
            Private.onValueChange = undefined;
        });
    }
});

dos.$static(dos, "Types", {
    static: function(This, Super, Public, Protected, Private) {
        Public.$const("Undefined", {
            value: "undefined"
        });
        Public.$const("Number", {
            value: "number"
        });
        Public.$const("Object", {
            value: "object"
        });
        Public.$const("String", {
            value: "string"
        });
        Public.$const("Array", {
            value: "array"
        });
        Public.$const("Boolean", {
            value: "boolean"
        });
        Public.$const("Function", {
            value: "function"
        });
        Public.$const("RegExp", {
            value: "RegExp"
        });
        Public.$const("Error", {
            value: "Error"
        });
        Public.$const("Date", {
            value: "Date"
        });

        Public.$const("Int8Array", {
            value: "Int8Array"
        });
        Public.$const("Uint8Array", {
            value: "Uint8Array"
        });
        Public.$const("Uint8ClampedArray", {
            value: "Uint8ClampedArray"
        });
        Public.$const("Int16Array", {
            value: "Int16Array"
        });
        Public.$const("Uint16Array", {
            value: "Uint16Array"
        });
        Public.$const("Int32Array", {
            value: "Int32Array"
        });
        Public.$const("Uint32Array", {
            value: "Uint32Array"
        });
        Public.$const("Float32Array", {
            value: "Float32Array"
        });
        Public.$const("Float64Array", {
            value: "Float64Array"
        });

        Public.$const("TypedArrays", {
            value: [
                Public.Int8Array,
                Public.Uint8Array,
                Public.Uint8ClampedArray,
                Public.Int16Array,
                Public.Uint16Array,
                Public.Int32Array,
                Public.Uint32Array,
                Public.Float32Array,
                Public.Float64Array
            ]
        });
    }
});


dos.$exception(dos, "Exception", {
    $: function(This, Super, Static, Public, Protected, Private) {
        Private.$field("what", {
            getter: Public
        });
        Private.$field("name", {
            getter: Public
        });
        Private.$field("stack", {
            getter: Public
        });
        Public.$init(function(Defaults) {
            Defaults.what = "";
        }, function(Params) {
            Private.what = Params.getType("what", dos.Types.String);
            var e = Error.apply(This, [Private.what]);
            Private.stack = e.stack;
            Private.name = Public.className;
        });
        Public.$getter("message", function() {
            return Private.what;
        });
        Public.$method("toString", function() {
            return "" + Public.name + ": " + Public.what;
        });
    }
});

dos.$exception(dos, "ParamException", {
    extends: dos.Exception
});

dos.$class(dos, "Params", {
    useRawParams: true,
    static: function(This, Super, Public, Protected, Private) {
        Public.$method("throwIfNotImplementsType", function(param, type, optParamName) {
            if(!dos.isDOSObject(param) || !param.implements(type)) {
                throw new dos.ParamException({
                    what: "supplied param " + (optParamName ? "\"" + optParamName + "\"" : "") + " which is not implementing type \"" + type + "\"."
                });
            }
        });
        Public.$method("throwIfNotInstanceofType", function(param, type, optParamName) {
            if(!dos.isDOSObject(param) || !param.instanceof(type)) {
                throw new dos.ParamException({
                    what: "supplied param " + (optParamName ? "\"" + optParamName + "\"" : "") + " which is not of type \"" + type + "\"."
                });
            }
        });
        Public.$method("validIfNumberBetween", function(low, high) {
            return function(v) {
                return low <= v && v <= high;
            };
        });
        Public.$method("validIfNumberLess", function(high) {
            return function(v) {
                return v < high;
            };
        });
        Public.$method("validIfNumberLessOrEqual", function(high) {
            return function(v) {
                return v <= high;
            };
        });

        Public.$method("validIfNumberGreater", function(low) {
            return function(v) {
                return v > low;
            };
        });
        Public.$method("validIfNumberGreaterOrEqual", function(low) {
            return function(v) {
                return v >= low;
            };
        });
        Public.$method("validIfArrayOfType", function(type) {
            return function(v) {
                if(!Array.isArray(v)) {
                    return false;
                }
                for(var i = 0, len = v.length, accum = true; i < len; ++i) {
                    accum = accum && typeof v[i] === type;
                    if(!accum) {
                        return false;
                    }
                }
                return true;
            };
        });
        Public.$method("validIfArrayOfDOSType", function(dosType) {
            return function(v) {
                if(!Array.isArray(v)) {
                    return false;
                }
                for(var i = 0, len = v.length, accum = true; i < len; ++i) {
                    accum = accum && dos.isDOSObject(v[i]) && v[i].instanceof(dosType);
                    if(!accum) {
                        return false;
                    }
                }
                return true;
            };
        });
    },
    $: function(This, Super, Static, Public, Protected, Private) {
        Private.$field("internalParams", {
            raw: true
        });
        Public.$init(function(Params) {
            Private.internalParams = {};
            Private.set(Params || {});
        });
        Private.$method("set", function(rawObject) {
            if(rawObject.className === "Params") {
                Public.merge(rawObject);
            } else {
                for(var i in rawObject) {
                    Private.internalParams[i] = new dos.Field({
                        value: rawObject[i],
                        name: i
                    });
                }
            }
        });

        Private.$method("validate", function(v, validator) {
            if(!validator(v)) {
                throw new dos.ParamException({
                    what: "param " + v + " did not pass validation"
                });
            }
        });

        Public.$getter("params", function() {
            return Private.internalParams;
        });

        Public.$method("asForwardParamsWithFilter", function(filter) {
            if(!Array.isArray(filter)) {
                throw new dos.ParamException({
                    what: "invalid filter parameter. must be an array."
                });
            }
            var out = {};
            for(var i in Private.internalParams) {
                if(filter.indexOf(i) !== -1) {
                    out[i] = Private.internalParams[i].$;
                }
            }
            return out;
        });

        Public.$method("asForwardParams", function() {
            var out = {};
            for(var i in Private.internalParams) {
                out[i] = Private.internalParams[i].$;
            }
            return out;
        });

        Public.$method("merge", function(otherParamsObject) {
            var otherParams = otherParamsObject.params;
            for(var i in otherParams) {
                Private.internalParams[i] = otherParams[i];
            }
            otherParamsObject.dispose();
        });

        Private.$method("getRequiredParamErrorFn", function(name) {
            throw new dos.ParamException({
                what: name + " is a required param"
            });
        });

        Public.$method("get", function(name, validator) {
            if(!(name in Private.internalParams)) {
                Private.getRequiredParamErrorFn(name);
                return undefined;
            }
            var v = Private.internalParams[name].$;
            if(validator) {
                Private.validate(v, validator);
            }
            return v;
        });

        Private.$method("getRequiredTypeErrorFn", function(name, gotType, expectedType) {
            throw new dos.ParamException({
                what: name + " is of invalid type (should be \"" + expectedType + "\" but is \"" + gotType + "\")"
            });
        });

        Public.$method("getType", function(name, typeOrClassName, validator) {
            if(!(name in Private.internalParams)) {
                Private.getRequiredParamErrorFn(name);
                return undefined;
            }
            var param = Private.internalParams[name];
            if(param.type === typeOrClassName || (dos.isDOSClass(typeOrClassName) && (param.type.instanceof(typeOrClassName) || param.type.implements(typeOrClassName))) || (dos.isDOSClass(typeOrClassName) && dos.isDOSObject(param.$) && (param.$.instanceof(typeOrClassName) || param.$.implements(typeOrClassName)))) {
                var v = param.$;
                if(validator) {
                    Private.validate(v, validator);
                }
                return v;
            }
            // TODO: refine error in case of wrong class
            Private.getRequiredTypeErrorFn(name, param.type, typeOrClassName);
            return undefined;
        });

        Public.$method("getOptional", function(name, validator) {
            if(!(name in Private.internalParams)) {
                return undefined;
            }
            var v = Private.internalParams[name].$;
            if(validator) {
                Private.validate(v, validator);
            }
            return v;
        });

        Public.$method("getOptionalType", function(name, typeOrClassName, validator) {
            if(!(name in Private.internalParams)) {
                return undefined;
            }
            var param = Private.internalParams[name];
            if(param.type === typeOrClassName || (dos.isDOSClass(typeOrClassName) && (param.type.instanceof(typeOrClassName) || param.type.implements(typeOrClassName))) || (dos.isDOSClass(typeOrClassName) && dos.isDOSObject(param.$) && (param.$.instanceof(typeOrClassName) || param.$.implements(typeOrClassName)))) {
                var v = param.$;
                if(validator) {
                    Private.validate(v, validator);
                }
                return v;
            }
            return undefined;
        });

        Public.$method("set", function(name, value) {
            if(Public.has(name)) {
                Private.internalParams[name].$ = value;
            } else {
                Private.internalParams[name] = new dos.Field({
                    name: name,
                    value: value
                });
            }
        });

        Public.$method("delete", function(name) {
            if(Public.has(name)) {
                var p = Private.internalParams[name];
                delete Private.internalParams[name];
                p.dispose();
            }
        });


        Public.$method("has", function(name) {
            return Public.getOptional(name) !== undefined;
        });

        Public.$method("getRaw", function(name) {
            return Private.internalParams[name];
        });

        Public.$dispose(function() {
            for(var i in Private.internalParams) {
                var p = Private.internalParams[i];
                p.dispose();
            }
        });
    }
});

dos.$static(dos, "Util", {
    static: function(This, Super, Public, Protected, Private) {
        Public.$method("toEnum", function(arr) {
            var obj = {};
            for(var i = 0, len = arr.length; i < len; ++i) {
                var val = arr[i];
                obj[val] = val;
            }
            Public.assert(!obj.Validator);
            obj.Validator = Public.getEnumValidator(obj);
            return obj;
        });

        Public.$method("getEnumValidator", function(enumObj) {
            return function(str) {
                return typeof str === "string" && enumObj[str] === str;
            };
        });
    }
});

module.exports = dos;
