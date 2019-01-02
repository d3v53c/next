nx = {
  BREAKER: {},
  VERSION: '1.5.3',
  DEBUG: false,
  GLOBAL: function() {
    return this;
  }.call(null)
};

(function(nx, global) {
  var DOT = '.';
  var NUMBER = 'number';
  var ARRAY_PROTO = Array.prototype;

  //global.nx will be 'undefined' in webpack/node env:
  global.nx = global.nx || nx;

  nx.noop = function() {};

  nx.error = function(inMsg) {
    throw new Error(inMsg);
  };

  nx.forEach = function(inArray, inCallback, inContext) {
    var length = inArray.length;
    var i;
    var result;
    for (i = 0; i < length; i++) {
      result = inCallback.call(inContext, inArray[i], i, inArray);
      if (result === nx.BREAKER) {
        break;
      }
    }
  };

  nx.forIn = function(inObject, inCallback, inContext) {
    var key;
    var result;
    for (key in inObject) {
      if (inObject.hasOwnProperty(key)) {
        result = inCallback.call(inContext, key, inObject[key], inObject);
        if (result === nx.BREAKER) {
          break;
        }
      }
    }
  };

  nx.each = function(inTarget, inCallback, inContext) {
    var key, length;
    var iterator = function(inKey, inValue) {
      return (
        inCallback.call(inContext, inKey, inValue, inTarget) === nx.BREAKER
      );
    };

    if (inTarget) {
      if (inTarget.each) {
        return inTarget.each(inCallback, inContext);
      } else {
        length = inTarget.length;
        if (typeof length === NUMBER) {
          for (key = 0; key < length; key++) {
            if (iterator(key, inTarget[key])) {
              break;
            }
          }
        } else {
          for (key in inTarget) {
            if (inTarget.hasOwnProperty(key)) {
              if (iterator(key, inTarget[key])) {
                break;
              }
            }
          }
        }
      }
    }
  };

  nx.map = function(inTarget, inCallback, inContext) {
    var keys = typeof inTarget.length === NUMBER ? null : Object.keys(inTarget);
    var length = (keys || inTarget).length;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      result[index] = inCallback.call(
        inContext,
        currentKey,
        inTarget[currentKey],
        inTarget
      );
    }
    return result;
  };

  nx.mix = function(inTarget) {
    var target = inTarget || {};
    var i, length;
    var args = arguments;
    for (i = 1, length = args.length; i < length; i++) {
      nx.forIn(args[i], function(key, val) {
        target[key] = val;
      });
    }
    return target;
  };

  nx.slice = function(inTarget, inStart, inEnd) {
    return ARRAY_PROTO.slice.call(inTarget, inStart, inEnd);
  };

  nx.set = function(inTarget, inPath, inValue) {
    var paths = inPath.split(DOT);
    var result = inTarget || nx.global;
    var last;

    last = paths.pop();
    paths.forEach(function(path) {
      result = result[path] = result[path] || {};
    });
    result[last] = inValue;
    return result;
  };

  nx.get = function(inTarget, inPath) {
    var paths = inPath.split(DOT);
    var result = inTarget || nx.global;

    paths.forEach(function(path) {
      result = result && result[path];
    });
    return result;
  };

  nx.path = function(inTarget, inPath, inValue) {
    return inValue == null
      ? this.get(inTarget, inPath)
      : this.set(inTarget, inPath, inValue);
  };
})(nx, nx.GLOBAL);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = nx;
} else {
  if (typeof define === 'function' && define.amd) {
    define([], function() {
      return nx;
    });
  } else {
    window.nx = nx;
  }
}

(function(nx, global) {
  var RootClass = function() {};
  var classMeta = {
    __classId__: 0,
    __type__: 'nx.RootClass',
    __module__: 'root',
    __base__: Object,
    __meta__: {},
    __init__: nx.noop,
    __static_init__: nx.noop,
    __mixins__: [],
    __statics__: {},
    __properties__: [],
    __methods__: {}
  };

  classMeta.__methods__ = RootClass.prototype = {
    constructor: RootClass,
    init: nx.noop,
    destroy: nx.noop,
    base: function() {
      var caller = this.base.caller;
      var baseMethod;
      if (caller && (baseMethod = caller.__base__)) {
        return baseMethod.apply(this, arguments);
      }
    },
    parent: function(inName) {
      var args = nx.slice(arguments, 1);
      return this.$base[inName].apply(this, args);
    },
    toString: function() {
      return '[Class@' + this.__type__ + ']';
    }
  };

  //mix && export:
  nx.mix(RootClass, classMeta);
  nx.RootClass = RootClass;
})(nx, nx.GLOBAL);

(function (nx, global) {

  nx.defineProperty = function (inTarget, inName, inMeta, inMixins) {
    var key = '@' + inName;
    var getter, setter, descriptor;
    var value, filed;
    var meta = (inMeta && typeof inMeta === 'object') ? inMeta : {
        value: inMeta
      };

    if ('value' in meta) {
      value = meta.value;
      filed = '_' + inName;

      getter = function () {
        return filed in this ? this[filed] : (typeof value === 'function') ? value.call(this) : value;
      };

      setter = function (inValue) {
        this[filed] = inValue;
      };

    } else {
      getter = inMeta.get || inTarget[key] && inTarget[key].get || nx.noop;
      setter = inMeta.set || inTarget[key] && inTarget[key].set || nx.noop;
    }

    //remain base setter/getter:
    if (key in inTarget) {
      getter.__base__ = inTarget[key].get;
      setter.__base__ = inTarget[key].set;
    }

    descriptor = inTarget[key] = {
      __meta__: inMeta,
      __name__: inName,
      __type__: 'property',
      get: getter,
      set: setter,
      configurable: true
    };

    Object.defineProperty(inTarget, inName, descriptor);

    return descriptor;
  };

  nx.defineMethod = function (inTarget, inName, inMeta, inMixins) {
    var key = '@' + inName;

    inMixins.forEach(function (mixin) {
      var prototype = mixin.prototype;
      key in prototype && (inMeta.__base__ = prototype[key].__meta__);
    });

    key in inTarget && (inMeta.__base__ = inTarget[key].__meta__);

    inTarget[inName] = inMeta;
    return inTarget[key] = {
      __meta__: inMeta,
      __name__: inName,
      __type__: 'method'
    };
  };

  nx.defineBombMethod = function(inTarget, inName, inMeta, inMixins){
    var keys = inName.split(',');
    keys.forEach(function(key){
      nx.defineMethod(inTarget, key, inMeta.call(inTarget,key), inMixins);
    });
  };

  nx.defineStatic = function (inTarget, inName, inMeta, inMixins) {
    var key = '@' + inName;

    inMixins.forEach(function (mixin) {
      key in mixin && (inMeta.__base__ = mixin[key].__meta__);
    });

    (key in inTarget) && (inMeta.__base__ = inTarget[key].__meta__);

    inTarget[inName] = inMeta;
    return inTarget[key] = {
      __meta__: inMeta,
      __name__: inName,
      __type__: 'static'
    };
  };

  nx.defineMembers = function (inMember, inTarget, inObject, inMixins) {
    var memberAction = 'define' + inMember.charAt(0).toUpperCase() + inMember.slice(1);
    nx.each(inObject, function (key, val) {
      if (key.indexOf(',') > -1) {
        nx.defineBombMethod(inTarget, key, val, inMixins);
      } else {
        nx[memberAction](inTarget, key, val, inMixins);
      }
    });
  };

}(nx, nx.GLOBAL));

(function(nx, global) {

  var classId = 1,
    instanceId = 0;
  var NX_ANONYMOUS = 'nx.Anonymous';
  var arrayProto = Array.prototype;
  var slice = arrayProto.slice;
  var concat = arrayProto.concat;

  /**
   * Private
   * @returns {Array|Array.<T>|*}
   */
  function union() {
    var map = {};
    var result = concat.apply(arrayProto, arguments);
    return result.filter(function(val) {
      return !map[val.__type__] && (map[val.__type__] = true);
    });
  }

  function LifeCycle(inType, inMeta) {
    this.type = inType;
    this.meta = inMeta;
    this.base = inMeta.extends || nx.RootClass;
    this.module = inMeta.module;
    this.$base = this.base.prototype;
    this.__classMeta__ = {};
    this.__Class__ = null;
    this.__constructor__ = null;
  }

  LifeCycle.prototype = {
    constructor: LifeCycle,
    initMetaProcessor: function() {
      var methods = this.meta.methods || {};
      var statics = this.meta.statics || {};
      nx.mix(this.__classMeta__, {
        __type__: this.type,
        __meta__: this.meta,
        __base__: this.base,
        __module__: this.module,
        __classId__: classId++,
        __init__: methods.init || this.base.__init__,
        __static_init__: statics.init || this.base.__static_init__,
        __static_pure__: !this.meta.methods && !!this.meta.statics
      });
    },
    createClassProcessor: function() {
      var self = this;
      this.__Class__ = function() {
        this.__id__ = ++instanceId;
        self.__constructor__.apply(this, arguments);
      };
    },
    mixinItemsProcessor: function() {
      var base = this.base;
      var mixins = this.meta.mixins || [];
      var classMeta = this.__classMeta__;
      var mixinMixins = [],
        mixinMethods = {},
        mixinProperties = {},
        mixinStatics = {},
        mixItemMixins = [],
        mixinItemMethods = {},
        mixinItemProperties = {},
        mixinItemStatics = {};

      nx.each(mixins, function(index, mixinItem) {
        mixItemMixins = mixinItem.__mixins__;
        mixinItemMethods = mixinItem.__methods__;
        mixinItemProperties = mixinItem.__properties__;
        mixinItemStatics = mixinItem.__statics__;

        mixinMixins = mixinMixins.concat(mixItemMixins);
        nx.mix(mixinMethods, mixinItemMethods);
        nx.mix(mixinProperties, mixinItemProperties);
        nx.mix(mixinStatics, mixinItemStatics);
      });

      classMeta.__mixins__ = union(mixinMixins, base.__mixins__, mixins);
      classMeta.__methods__ = nx.mix(mixinMethods, base.__methods__);
      classMeta.__properties__ = nx.mix(mixinProperties, base.__properties__);
      classMeta.__statics__ = nx.mix(mixinStatics, base.__statics__);
    },
    inheritProcessor: function() {
      var classMeta = this.__classMeta__;
      this.copyAtProps(classMeta);
      this.defineMethods(classMeta);
      this.defineProperties(classMeta);
      this.defineStatics(classMeta);
    },
    copyBaseProto: function() {
      this.__Class__.prototype.$base = this.$base;
    },
    copyAtProps: function(inClassMeta) {
      var prototype = this.$base;
      nx.each(
        prototype,
        function(name, prop) {
          if (name.indexOf('@') > -1) {
            this.__Class__.prototype[name] = prop;
          }
        },
        this
      );
    },
    defineMethods: function(inClassMeta) {
      var methods = nx.mix(inClassMeta.__methods__, this.meta.methods);
      nx.defineMembers('method', this.__Class__.prototype, methods, inClassMeta.__mixins__);
    },
    defineProperties: function(inClassMeta) {
      var target = inClassMeta.__static_pure__ ? this.__Class__ : this.__Class__.prototype;
      var properties = nx.mix(inClassMeta.__properties__, this.meta.properties);
      nx.defineMembers('property', target, properties, inClassMeta.__mixins__);
    },
    defineStatics: function(inClassMeta) {
      var statics = nx.mix(inClassMeta.__statics__, this.meta.statics);
      nx.defineMembers('static', this.__Class__, statics, inClassMeta.__mixins__);
    },
    methodsConstructorProcessor: function() {
      var classMeta = this.__classMeta__;
      var mixins = classMeta.__mixins__;
      this.__constructor__ = function() {
        var args = slice.call(arguments);
        nx.each(
          mixins,
          function(_, mixItem) {
            mixItem.__init__.call(this);
          },
          this
        );
        classMeta.__init__.apply(this, args);
      };
    },
    staticsConstructorProcessor: function() {
      var classMeta = this.__classMeta__;
      classMeta.__static_init__.call(this.__Class__);
    },
    registerNsProcessor: function() {
      var Class = this.__Class__;
      var type = this.type;
      var classMeta = this.__classMeta__;

      nx.mix(Class.prototype, classMeta, { constructor: Class });
      nx.mix(Class, classMeta);
      if (type !== NX_ANONYMOUS + classId) {
        nx.path(global, type, Class);
      }
    }
  };

  nx.declare = function(inType, inMeta) {
    var type = typeof inType === 'string' ? inType : NX_ANONYMOUS + classId;
    var meta = inMeta || inType;
    var lifeCycle = new LifeCycle(type, meta);
    lifeCycle.initMetaProcessor();
    lifeCycle.createClassProcessor();
    lifeCycle.copyBaseProto();
    lifeCycle.mixinItemsProcessor();
    lifeCycle.inheritProcessor();
    lifeCycle.methodsConstructorProcessor();
    lifeCycle.staticsConstructorProcessor();
    lifeCycle.registerNsProcessor();
    return lifeCycle.__Class__;
  };

})(nx, nx.GLOBAL);
