#!/usr/bin/env node
// Generated from packages/server/src/server.ts by scripts/bundle-claude-code.js (npm run bundle:claude-code). Do not edit.
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/vscode-languageserver/lib/common/utils/is.js
var require_is = __commonJS({
  "node_modules/vscode-languageserver/lib/common/utils/is.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.thenable = exports2.typedArray = exports2.stringArray = exports2.array = exports2.func = exports2.error = exports2.number = exports2.string = exports2.boolean = void 0;
    function boolean(value) {
      return value === true || value === false;
    }
    exports2.boolean = boolean;
    function string(value) {
      return typeof value === "string" || value instanceof String;
    }
    exports2.string = string;
    function number(value) {
      return typeof value === "number" || value instanceof Number;
    }
    exports2.number = number;
    function error(value) {
      return value instanceof Error;
    }
    exports2.error = error;
    function func(value) {
      return typeof value === "function";
    }
    exports2.func = func;
    function array(value) {
      return Array.isArray(value);
    }
    exports2.array = array;
    function stringArray(value) {
      return array(value) && value.every((elem) => string(elem));
    }
    exports2.stringArray = stringArray;
    function typedArray(value, check5) {
      return Array.isArray(value) && value.every(check5);
    }
    exports2.typedArray = typedArray;
    function thenable(value) {
      return value && func(value.then);
    }
    exports2.thenable = thenable;
  }
});

// node_modules/vscode-jsonrpc/lib/common/is.js
var require_is2 = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/is.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.stringArray = exports2.array = exports2.func = exports2.error = exports2.number = exports2.string = exports2.boolean = void 0;
    function boolean(value) {
      return value === true || value === false;
    }
    exports2.boolean = boolean;
    function string(value) {
      return typeof value === "string" || value instanceof String;
    }
    exports2.string = string;
    function number(value) {
      return typeof value === "number" || value instanceof Number;
    }
    exports2.number = number;
    function error(value) {
      return value instanceof Error;
    }
    exports2.error = error;
    function func(value) {
      return typeof value === "function";
    }
    exports2.func = func;
    function array(value) {
      return Array.isArray(value);
    }
    exports2.array = array;
    function stringArray(value) {
      return array(value) && value.every((elem) => string(elem));
    }
    exports2.stringArray = stringArray;
  }
});

// node_modules/vscode-jsonrpc/lib/common/messages.js
var require_messages = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/messages.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Message = exports2.NotificationType9 = exports2.NotificationType8 = exports2.NotificationType7 = exports2.NotificationType6 = exports2.NotificationType5 = exports2.NotificationType4 = exports2.NotificationType3 = exports2.NotificationType2 = exports2.NotificationType1 = exports2.NotificationType0 = exports2.NotificationType = exports2.RequestType9 = exports2.RequestType8 = exports2.RequestType7 = exports2.RequestType6 = exports2.RequestType5 = exports2.RequestType4 = exports2.RequestType3 = exports2.RequestType2 = exports2.RequestType1 = exports2.RequestType = exports2.RequestType0 = exports2.AbstractMessageSignature = exports2.ParameterStructures = exports2.ResponseError = exports2.ErrorCodes = void 0;
    var is = require_is2();
    var ErrorCodes2;
    (function(ErrorCodes3) {
      ErrorCodes3.ParseError = -32700;
      ErrorCodes3.InvalidRequest = -32600;
      ErrorCodes3.MethodNotFound = -32601;
      ErrorCodes3.InvalidParams = -32602;
      ErrorCodes3.InternalError = -32603;
      ErrorCodes3.jsonrpcReservedErrorRangeStart = -32099;
      ErrorCodes3.serverErrorStart = -32099;
      ErrorCodes3.MessageWriteError = -32099;
      ErrorCodes3.MessageReadError = -32098;
      ErrorCodes3.PendingResponseRejected = -32097;
      ErrorCodes3.ConnectionInactive = -32096;
      ErrorCodes3.ServerNotInitialized = -32002;
      ErrorCodes3.UnknownErrorCode = -32001;
      ErrorCodes3.jsonrpcReservedErrorRangeEnd = -32e3;
      ErrorCodes3.serverErrorEnd = -32e3;
    })(ErrorCodes2 || (exports2.ErrorCodes = ErrorCodes2 = {}));
    var ResponseError2 = class _ResponseError extends Error {
      constructor(code3, message, data) {
        super(message);
        this.code = is.number(code3) ? code3 : ErrorCodes2.UnknownErrorCode;
        this.data = data;
        Object.setPrototypeOf(this, _ResponseError.prototype);
      }
      toJson() {
        const result = {
          code: this.code,
          message: this.message
        };
        if (this.data !== void 0) {
          result.data = this.data;
        }
        return result;
      }
    };
    exports2.ResponseError = ResponseError2;
    var ParameterStructures = class _ParameterStructures {
      constructor(kind) {
        this.kind = kind;
      }
      static is(value) {
        return value === _ParameterStructures.auto || value === _ParameterStructures.byName || value === _ParameterStructures.byPosition;
      }
      toString() {
        return this.kind;
      }
    };
    exports2.ParameterStructures = ParameterStructures;
    ParameterStructures.auto = new ParameterStructures("auto");
    ParameterStructures.byPosition = new ParameterStructures("byPosition");
    ParameterStructures.byName = new ParameterStructures("byName");
    var AbstractMessageSignature = class {
      constructor(method, numberOfParams) {
        this.method = method;
        this.numberOfParams = numberOfParams;
      }
      get parameterStructures() {
        return ParameterStructures.auto;
      }
    };
    exports2.AbstractMessageSignature = AbstractMessageSignature;
    var RequestType0 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 0);
      }
    };
    exports2.RequestType0 = RequestType0;
    var RequestType = class extends AbstractMessageSignature {
      constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
      }
      get parameterStructures() {
        return this._parameterStructures;
      }
    };
    exports2.RequestType = RequestType;
    var RequestType1 = class extends AbstractMessageSignature {
      constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
      }
      get parameterStructures() {
        return this._parameterStructures;
      }
    };
    exports2.RequestType1 = RequestType1;
    var RequestType2 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 2);
      }
    };
    exports2.RequestType2 = RequestType2;
    var RequestType3 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 3);
      }
    };
    exports2.RequestType3 = RequestType3;
    var RequestType4 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 4);
      }
    };
    exports2.RequestType4 = RequestType4;
    var RequestType5 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 5);
      }
    };
    exports2.RequestType5 = RequestType5;
    var RequestType6 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 6);
      }
    };
    exports2.RequestType6 = RequestType6;
    var RequestType7 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 7);
      }
    };
    exports2.RequestType7 = RequestType7;
    var RequestType8 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 8);
      }
    };
    exports2.RequestType8 = RequestType8;
    var RequestType9 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 9);
      }
    };
    exports2.RequestType9 = RequestType9;
    var NotificationType = class extends AbstractMessageSignature {
      constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
      }
      get parameterStructures() {
        return this._parameterStructures;
      }
    };
    exports2.NotificationType = NotificationType;
    var NotificationType0 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 0);
      }
    };
    exports2.NotificationType0 = NotificationType0;
    var NotificationType1 = class extends AbstractMessageSignature {
      constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
      }
      get parameterStructures() {
        return this._parameterStructures;
      }
    };
    exports2.NotificationType1 = NotificationType1;
    var NotificationType2 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 2);
      }
    };
    exports2.NotificationType2 = NotificationType2;
    var NotificationType3 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 3);
      }
    };
    exports2.NotificationType3 = NotificationType3;
    var NotificationType4 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 4);
      }
    };
    exports2.NotificationType4 = NotificationType4;
    var NotificationType5 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 5);
      }
    };
    exports2.NotificationType5 = NotificationType5;
    var NotificationType6 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 6);
      }
    };
    exports2.NotificationType6 = NotificationType6;
    var NotificationType7 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 7);
      }
    };
    exports2.NotificationType7 = NotificationType7;
    var NotificationType8 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 8);
      }
    };
    exports2.NotificationType8 = NotificationType8;
    var NotificationType9 = class extends AbstractMessageSignature {
      constructor(method) {
        super(method, 9);
      }
    };
    exports2.NotificationType9 = NotificationType9;
    var Message;
    (function(Message2) {
      function isRequest(message) {
        const candidate = message;
        return candidate && is.string(candidate.method) && (is.string(candidate.id) || is.number(candidate.id));
      }
      Message2.isRequest = isRequest;
      function isNotification(message) {
        const candidate = message;
        return candidate && is.string(candidate.method) && message.id === void 0;
      }
      Message2.isNotification = isNotification;
      function isResponse(message) {
        const candidate = message;
        return candidate && (candidate.result !== void 0 || !!candidate.error) && (is.string(candidate.id) || is.number(candidate.id) || candidate.id === null);
      }
      Message2.isResponse = isResponse;
    })(Message || (exports2.Message = Message = {}));
  }
});

// node_modules/vscode-jsonrpc/lib/common/linkedMap.js
var require_linkedMap = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/linkedMap.js"(exports2) {
    "use strict";
    var _a;
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LRUCache = exports2.LinkedMap = exports2.Touch = void 0;
    var Touch;
    (function(Touch2) {
      Touch2.None = 0;
      Touch2.First = 1;
      Touch2.AsOld = Touch2.First;
      Touch2.Last = 2;
      Touch2.AsNew = Touch2.Last;
    })(Touch || (exports2.Touch = Touch = {}));
    var LinkedMap = class {
      constructor() {
        this[_a] = "LinkedMap";
        this._map = /* @__PURE__ */ new Map();
        this._head = void 0;
        this._tail = void 0;
        this._size = 0;
        this._state = 0;
      }
      clear() {
        this._map.clear();
        this._head = void 0;
        this._tail = void 0;
        this._size = 0;
        this._state++;
      }
      isEmpty() {
        return !this._head && !this._tail;
      }
      get size() {
        return this._size;
      }
      get first() {
        return this._head?.value;
      }
      get last() {
        return this._tail?.value;
      }
      has(key2) {
        return this._map.has(key2);
      }
      get(key2, touch = Touch.None) {
        const item = this._map.get(key2);
        if (!item) {
          return void 0;
        }
        if (touch !== Touch.None) {
          this.touch(item, touch);
        }
        return item.value;
      }
      set(key2, value, touch = Touch.None) {
        let item = this._map.get(key2);
        if (item) {
          item.value = value;
          if (touch !== Touch.None) {
            this.touch(item, touch);
          }
        } else {
          item = { key: key2, value, next: void 0, previous: void 0 };
          switch (touch) {
            case Touch.None:
              this.addItemLast(item);
              break;
            case Touch.First:
              this.addItemFirst(item);
              break;
            case Touch.Last:
              this.addItemLast(item);
              break;
            default:
              this.addItemLast(item);
              break;
          }
          this._map.set(key2, item);
          this._size++;
        }
        return this;
      }
      delete(key2) {
        return !!this.remove(key2);
      }
      remove(key2) {
        const item = this._map.get(key2);
        if (!item) {
          return void 0;
        }
        this._map.delete(key2);
        this.removeItem(item);
        this._size--;
        return item.value;
      }
      shift() {
        if (!this._head && !this._tail) {
          return void 0;
        }
        if (!this._head || !this._tail) {
          throw new Error("Invalid list");
        }
        const item = this._head;
        this._map.delete(item.key);
        this.removeItem(item);
        this._size--;
        return item.value;
      }
      forEach(callbackfn, thisArg) {
        const state = this._state;
        let current = this._head;
        while (current) {
          if (thisArg) {
            callbackfn.bind(thisArg)(current.value, current.key, this);
          } else {
            callbackfn(current.value, current.key, this);
          }
          if (this._state !== state) {
            throw new Error(`LinkedMap got modified during iteration.`);
          }
          current = current.next;
        }
      }
      keys() {
        const state = this._state;
        let current = this._head;
        const iterator = {
          [Symbol.iterator]: () => {
            return iterator;
          },
          next: () => {
            if (this._state !== state) {
              throw new Error(`LinkedMap got modified during iteration.`);
            }
            if (current) {
              const result = { value: current.key, done: false };
              current = current.next;
              return result;
            } else {
              return { value: void 0, done: true };
            }
          }
        };
        return iterator;
      }
      values() {
        const state = this._state;
        let current = this._head;
        const iterator = {
          [Symbol.iterator]: () => {
            return iterator;
          },
          next: () => {
            if (this._state !== state) {
              throw new Error(`LinkedMap got modified during iteration.`);
            }
            if (current) {
              const result = { value: current.value, done: false };
              current = current.next;
              return result;
            } else {
              return { value: void 0, done: true };
            }
          }
        };
        return iterator;
      }
      entries() {
        const state = this._state;
        let current = this._head;
        const iterator = {
          [Symbol.iterator]: () => {
            return iterator;
          },
          next: () => {
            if (this._state !== state) {
              throw new Error(`LinkedMap got modified during iteration.`);
            }
            if (current) {
              const result = { value: [current.key, current.value], done: false };
              current = current.next;
              return result;
            } else {
              return { value: void 0, done: true };
            }
          }
        };
        return iterator;
      }
      [(_a = Symbol.toStringTag, Symbol.iterator)]() {
        return this.entries();
      }
      trimOld(newSize) {
        if (newSize >= this.size) {
          return;
        }
        if (newSize === 0) {
          this.clear();
          return;
        }
        let current = this._head;
        let currentSize = this.size;
        while (current && currentSize > newSize) {
          this._map.delete(current.key);
          current = current.next;
          currentSize--;
        }
        this._head = current;
        this._size = currentSize;
        if (current) {
          current.previous = void 0;
        }
        this._state++;
      }
      addItemFirst(item) {
        if (!this._head && !this._tail) {
          this._tail = item;
        } else if (!this._head) {
          throw new Error("Invalid list");
        } else {
          item.next = this._head;
          this._head.previous = item;
        }
        this._head = item;
        this._state++;
      }
      addItemLast(item) {
        if (!this._head && !this._tail) {
          this._head = item;
        } else if (!this._tail) {
          throw new Error("Invalid list");
        } else {
          item.previous = this._tail;
          this._tail.next = item;
        }
        this._tail = item;
        this._state++;
      }
      removeItem(item) {
        if (item === this._head && item === this._tail) {
          this._head = void 0;
          this._tail = void 0;
        } else if (item === this._head) {
          if (!item.next) {
            throw new Error("Invalid list");
          }
          item.next.previous = void 0;
          this._head = item.next;
        } else if (item === this._tail) {
          if (!item.previous) {
            throw new Error("Invalid list");
          }
          item.previous.next = void 0;
          this._tail = item.previous;
        } else {
          const next = item.next;
          const previous = item.previous;
          if (!next || !previous) {
            throw new Error("Invalid list");
          }
          next.previous = previous;
          previous.next = next;
        }
        item.next = void 0;
        item.previous = void 0;
        this._state++;
      }
      touch(item, touch) {
        if (!this._head || !this._tail) {
          throw new Error("Invalid list");
        }
        if (touch !== Touch.First && touch !== Touch.Last) {
          return;
        }
        if (touch === Touch.First) {
          if (item === this._head) {
            return;
          }
          const next = item.next;
          const previous = item.previous;
          if (item === this._tail) {
            previous.next = void 0;
            this._tail = previous;
          } else {
            next.previous = previous;
            previous.next = next;
          }
          item.previous = void 0;
          item.next = this._head;
          this._head.previous = item;
          this._head = item;
          this._state++;
        } else if (touch === Touch.Last) {
          if (item === this._tail) {
            return;
          }
          const next = item.next;
          const previous = item.previous;
          if (item === this._head) {
            next.previous = void 0;
            this._head = next;
          } else {
            next.previous = previous;
            previous.next = next;
          }
          item.next = void 0;
          item.previous = this._tail;
          this._tail.next = item;
          this._tail = item;
          this._state++;
        }
      }
      toJSON() {
        const data = [];
        this.forEach((value, key2) => {
          data.push([key2, value]);
        });
        return data;
      }
      fromJSON(data) {
        this.clear();
        for (const [key2, value] of data) {
          this.set(key2, value);
        }
      }
    };
    exports2.LinkedMap = LinkedMap;
    var LRUCache = class extends LinkedMap {
      constructor(limit, ratio = 1) {
        super();
        this._limit = limit;
        this._ratio = Math.min(Math.max(0, ratio), 1);
      }
      get limit() {
        return this._limit;
      }
      set limit(limit) {
        this._limit = limit;
        this.checkTrim();
      }
      get ratio() {
        return this._ratio;
      }
      set ratio(ratio) {
        this._ratio = Math.min(Math.max(0, ratio), 1);
        this.checkTrim();
      }
      get(key2, touch = Touch.AsNew) {
        return super.get(key2, touch);
      }
      peek(key2) {
        return super.get(key2, Touch.None);
      }
      set(key2, value) {
        super.set(key2, value, Touch.Last);
        this.checkTrim();
        return this;
      }
      checkTrim() {
        if (this.size > this._limit) {
          this.trimOld(Math.round(this._limit * this._ratio));
        }
      }
    };
    exports2.LRUCache = LRUCache;
  }
});

// node_modules/vscode-jsonrpc/lib/common/disposable.js
var require_disposable = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/disposable.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Disposable = void 0;
    var Disposable;
    (function(Disposable2) {
      function create(func) {
        return {
          dispose: func
        };
      }
      Disposable2.create = create;
    })(Disposable || (exports2.Disposable = Disposable = {}));
  }
});

// node_modules/vscode-jsonrpc/lib/common/ral.js
var require_ral = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/ral.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _ral;
    function RAL() {
      if (_ral === void 0) {
        throw new Error(`No runtime abstraction layer installed`);
      }
      return _ral;
    }
    (function(RAL2) {
      function install(ral) {
        if (ral === void 0) {
          throw new Error(`No runtime abstraction layer provided`);
        }
        _ral = ral;
      }
      RAL2.install = install;
    })(RAL || (RAL = {}));
    exports2.default = RAL;
  }
});

// node_modules/vscode-jsonrpc/lib/common/events.js
var require_events = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/events.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Emitter = exports2.Event = void 0;
    var ral_1 = require_ral();
    var Event;
    (function(Event2) {
      const _disposable = { dispose() {
      } };
      Event2.None = function() {
        return _disposable;
      };
    })(Event || (exports2.Event = Event = {}));
    var CallbackList = class {
      add(callback, context = null, bucket) {
        if (!this._callbacks) {
          this._callbacks = [];
          this._contexts = [];
        }
        this._callbacks.push(callback);
        this._contexts.push(context);
        if (Array.isArray(bucket)) {
          bucket.push({ dispose: () => this.remove(callback, context) });
        }
      }
      remove(callback, context = null) {
        if (!this._callbacks) {
          return;
        }
        let foundCallbackWithDifferentContext = false;
        for (let i = 0, len = this._callbacks.length; i < len; i++) {
          if (this._callbacks[i] === callback) {
            if (this._contexts[i] === context) {
              this._callbacks.splice(i, 1);
              this._contexts.splice(i, 1);
              return;
            } else {
              foundCallbackWithDifferentContext = true;
            }
          }
        }
        if (foundCallbackWithDifferentContext) {
          throw new Error("When adding a listener with a context, you should remove it with the same context");
        }
      }
      invoke(...args) {
        if (!this._callbacks) {
          return [];
        }
        const ret = [], callbacks = this._callbacks.slice(0), contexts = this._contexts.slice(0);
        for (let i = 0, len = callbacks.length; i < len; i++) {
          try {
            ret.push(callbacks[i].apply(contexts[i], args));
          } catch (e) {
            (0, ral_1.default)().console.error(e);
          }
        }
        return ret;
      }
      isEmpty() {
        return !this._callbacks || this._callbacks.length === 0;
      }
      dispose() {
        this._callbacks = void 0;
        this._contexts = void 0;
      }
    };
    var Emitter = class _Emitter {
      constructor(_options) {
        this._options = _options;
      }
      /**
       * For the public to allow to subscribe
       * to events from this Emitter
       */
      get event() {
        if (!this._event) {
          this._event = (listener, thisArgs, disposables) => {
            if (!this._callbacks) {
              this._callbacks = new CallbackList();
            }
            if (this._options && this._options.onFirstListenerAdd && this._callbacks.isEmpty()) {
              this._options.onFirstListenerAdd(this);
            }
            this._callbacks.add(listener, thisArgs);
            const result = {
              dispose: () => {
                if (!this._callbacks) {
                  return;
                }
                this._callbacks.remove(listener, thisArgs);
                result.dispose = _Emitter._noop;
                if (this._options && this._options.onLastListenerRemove && this._callbacks.isEmpty()) {
                  this._options.onLastListenerRemove(this);
                }
              }
            };
            if (Array.isArray(disposables)) {
              disposables.push(result);
            }
            return result;
          };
        }
        return this._event;
      }
      /**
       * To be kept private to fire an event to
       * subscribers
       */
      fire(event) {
        if (this._callbacks) {
          this._callbacks.invoke.call(this._callbacks, event);
        }
      }
      dispose() {
        if (this._callbacks) {
          this._callbacks.dispose();
          this._callbacks = void 0;
        }
      }
    };
    exports2.Emitter = Emitter;
    Emitter._noop = function() {
    };
  }
});

// node_modules/vscode-jsonrpc/lib/common/cancellation.js
var require_cancellation = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/cancellation.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CancellationTokenSource = exports2.CancellationToken = void 0;
    var ral_1 = require_ral();
    var Is = require_is2();
    var events_1 = require_events();
    var CancellationToken;
    (function(CancellationToken2) {
      CancellationToken2.None = Object.freeze({
        isCancellationRequested: false,
        onCancellationRequested: events_1.Event.None
      });
      CancellationToken2.Cancelled = Object.freeze({
        isCancellationRequested: true,
        onCancellationRequested: events_1.Event.None
      });
      function is(value) {
        const candidate = value;
        return candidate && (candidate === CancellationToken2.None || candidate === CancellationToken2.Cancelled || Is.boolean(candidate.isCancellationRequested) && !!candidate.onCancellationRequested);
      }
      CancellationToken2.is = is;
    })(CancellationToken || (exports2.CancellationToken = CancellationToken = {}));
    var shortcutEvent = Object.freeze(function(callback, context) {
      const handle = (0, ral_1.default)().timer.setTimeout(callback.bind(context), 0);
      return { dispose() {
        handle.dispose();
      } };
    });
    var MutableToken = class {
      constructor() {
        this._isCancelled = false;
      }
      cancel() {
        if (!this._isCancelled) {
          this._isCancelled = true;
          if (this._emitter) {
            this._emitter.fire(void 0);
            this.dispose();
          }
        }
      }
      get isCancellationRequested() {
        return this._isCancelled;
      }
      get onCancellationRequested() {
        if (this._isCancelled) {
          return shortcutEvent;
        }
        if (!this._emitter) {
          this._emitter = new events_1.Emitter();
        }
        return this._emitter.event;
      }
      dispose() {
        if (this._emitter) {
          this._emitter.dispose();
          this._emitter = void 0;
        }
      }
    };
    var CancellationTokenSource = class {
      get token() {
        if (!this._token) {
          this._token = new MutableToken();
        }
        return this._token;
      }
      cancel() {
        if (!this._token) {
          this._token = CancellationToken.Cancelled;
        } else {
          this._token.cancel();
        }
      }
      dispose() {
        if (!this._token) {
          this._token = CancellationToken.None;
        } else if (this._token instanceof MutableToken) {
          this._token.dispose();
        }
      }
    };
    exports2.CancellationTokenSource = CancellationTokenSource;
  }
});

// node_modules/vscode-jsonrpc/lib/common/sharedArrayCancellation.js
var require_sharedArrayCancellation = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/sharedArrayCancellation.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SharedArrayReceiverStrategy = exports2.SharedArraySenderStrategy = void 0;
    var cancellation_1 = require_cancellation();
    var CancellationState;
    (function(CancellationState2) {
      CancellationState2.Continue = 0;
      CancellationState2.Cancelled = 1;
    })(CancellationState || (CancellationState = {}));
    var SharedArraySenderStrategy = class {
      constructor() {
        this.buffers = /* @__PURE__ */ new Map();
      }
      enableCancellation(request) {
        if (request.id === null) {
          return;
        }
        const buffer = new SharedArrayBuffer(4);
        const data = new Int32Array(buffer, 0, 1);
        data[0] = CancellationState.Continue;
        this.buffers.set(request.id, buffer);
        request.$cancellationData = buffer;
      }
      async sendCancellation(_conn, id) {
        const buffer = this.buffers.get(id);
        if (buffer === void 0) {
          return;
        }
        const data = new Int32Array(buffer, 0, 1);
        Atomics.store(data, 0, CancellationState.Cancelled);
      }
      cleanup(id) {
        this.buffers.delete(id);
      }
      dispose() {
        this.buffers.clear();
      }
    };
    exports2.SharedArraySenderStrategy = SharedArraySenderStrategy;
    var SharedArrayBufferCancellationToken = class {
      constructor(buffer) {
        this.data = new Int32Array(buffer, 0, 1);
      }
      get isCancellationRequested() {
        return Atomics.load(this.data, 0) === CancellationState.Cancelled;
      }
      get onCancellationRequested() {
        throw new Error(`Cancellation over SharedArrayBuffer doesn't support cancellation events`);
      }
    };
    var SharedArrayBufferCancellationTokenSource = class {
      constructor(buffer) {
        this.token = new SharedArrayBufferCancellationToken(buffer);
      }
      cancel() {
      }
      dispose() {
      }
    };
    var SharedArrayReceiverStrategy = class {
      constructor() {
        this.kind = "request";
      }
      createCancellationTokenSource(request) {
        const buffer = request.$cancellationData;
        if (buffer === void 0) {
          return new cancellation_1.CancellationTokenSource();
        }
        return new SharedArrayBufferCancellationTokenSource(buffer);
      }
    };
    exports2.SharedArrayReceiverStrategy = SharedArrayReceiverStrategy;
  }
});

// node_modules/vscode-jsonrpc/lib/common/semaphore.js
var require_semaphore = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/semaphore.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Semaphore = void 0;
    var ral_1 = require_ral();
    var Semaphore = class {
      constructor(capacity = 1) {
        if (capacity <= 0) {
          throw new Error("Capacity must be greater than 0");
        }
        this._capacity = capacity;
        this._active = 0;
        this._waiting = [];
      }
      lock(thunk) {
        return new Promise((resolve4, reject) => {
          this._waiting.push({ thunk, resolve: resolve4, reject });
          this.runNext();
        });
      }
      get active() {
        return this._active;
      }
      runNext() {
        if (this._waiting.length === 0 || this._active === this._capacity) {
          return;
        }
        (0, ral_1.default)().timer.setImmediate(() => this.doRunNext());
      }
      doRunNext() {
        if (this._waiting.length === 0 || this._active === this._capacity) {
          return;
        }
        const next = this._waiting.shift();
        this._active++;
        if (this._active > this._capacity) {
          throw new Error(`To many thunks active`);
        }
        try {
          const result = next.thunk();
          if (result instanceof Promise) {
            result.then((value) => {
              this._active--;
              next.resolve(value);
              this.runNext();
            }, (err) => {
              this._active--;
              next.reject(err);
              this.runNext();
            });
          } else {
            this._active--;
            next.resolve(result);
            this.runNext();
          }
        } catch (err) {
          this._active--;
          next.reject(err);
          this.runNext();
        }
      }
    };
    exports2.Semaphore = Semaphore;
  }
});

// node_modules/vscode-jsonrpc/lib/common/messageReader.js
var require_messageReader = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/messageReader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReadableStreamMessageReader = exports2.AbstractMessageReader = exports2.MessageReader = void 0;
    var ral_1 = require_ral();
    var Is = require_is2();
    var events_1 = require_events();
    var semaphore_1 = require_semaphore();
    var MessageReader;
    (function(MessageReader2) {
      function is(value) {
        let candidate = value;
        return candidate && Is.func(candidate.listen) && Is.func(candidate.dispose) && Is.func(candidate.onError) && Is.func(candidate.onClose) && Is.func(candidate.onPartialMessage);
      }
      MessageReader2.is = is;
    })(MessageReader || (exports2.MessageReader = MessageReader = {}));
    var AbstractMessageReader = class {
      constructor() {
        this.errorEmitter = new events_1.Emitter();
        this.closeEmitter = new events_1.Emitter();
        this.partialMessageEmitter = new events_1.Emitter();
      }
      dispose() {
        this.errorEmitter.dispose();
        this.closeEmitter.dispose();
      }
      get onError() {
        return this.errorEmitter.event;
      }
      fireError(error) {
        this.errorEmitter.fire(this.asError(error));
      }
      get onClose() {
        return this.closeEmitter.event;
      }
      fireClose() {
        this.closeEmitter.fire(void 0);
      }
      get onPartialMessage() {
        return this.partialMessageEmitter.event;
      }
      firePartialMessage(info) {
        this.partialMessageEmitter.fire(info);
      }
      asError(error) {
        if (error instanceof Error) {
          return error;
        } else {
          return new Error(`Reader received error. Reason: ${Is.string(error.message) ? error.message : "unknown"}`);
        }
      }
    };
    exports2.AbstractMessageReader = AbstractMessageReader;
    var ResolvedMessageReaderOptions;
    (function(ResolvedMessageReaderOptions2) {
      function fromOptions(options) {
        let charset;
        let result;
        let contentDecoder;
        const contentDecoders = /* @__PURE__ */ new Map();
        let contentTypeDecoder;
        const contentTypeDecoders = /* @__PURE__ */ new Map();
        if (options === void 0 || typeof options === "string") {
          charset = options ?? "utf-8";
        } else {
          charset = options.charset ?? "utf-8";
          if (options.contentDecoder !== void 0) {
            contentDecoder = options.contentDecoder;
            contentDecoders.set(contentDecoder.name, contentDecoder);
          }
          if (options.contentDecoders !== void 0) {
            for (const decoder of options.contentDecoders) {
              contentDecoders.set(decoder.name, decoder);
            }
          }
          if (options.contentTypeDecoder !== void 0) {
            contentTypeDecoder = options.contentTypeDecoder;
            contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
          }
          if (options.contentTypeDecoders !== void 0) {
            for (const decoder of options.contentTypeDecoders) {
              contentTypeDecoders.set(decoder.name, decoder);
            }
          }
        }
        if (contentTypeDecoder === void 0) {
          contentTypeDecoder = (0, ral_1.default)().applicationJson.decoder;
          contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
        }
        return { charset, contentDecoder, contentDecoders, contentTypeDecoder, contentTypeDecoders };
      }
      ResolvedMessageReaderOptions2.fromOptions = fromOptions;
    })(ResolvedMessageReaderOptions || (ResolvedMessageReaderOptions = {}));
    var ReadableStreamMessageReader = class extends AbstractMessageReader {
      constructor(readable, options) {
        super();
        this.readable = readable;
        this.options = ResolvedMessageReaderOptions.fromOptions(options);
        this.buffer = (0, ral_1.default)().messageBuffer.create(this.options.charset);
        this._partialMessageTimeout = 1e4;
        this.nextMessageLength = -1;
        this.messageToken = 0;
        this.readSemaphore = new semaphore_1.Semaphore(1);
      }
      set partialMessageTimeout(timeout) {
        this._partialMessageTimeout = timeout;
      }
      get partialMessageTimeout() {
        return this._partialMessageTimeout;
      }
      listen(callback) {
        this.nextMessageLength = -1;
        this.messageToken = 0;
        this.partialMessageTimer = void 0;
        this.callback = callback;
        const result = this.readable.onData((data) => {
          this.onData(data);
        });
        this.readable.onError((error) => this.fireError(error));
        this.readable.onClose(() => this.fireClose());
        return result;
      }
      onData(data) {
        try {
          this.buffer.append(data);
          while (true) {
            if (this.nextMessageLength === -1) {
              const headers = this.buffer.tryReadHeaders(true);
              if (!headers) {
                return;
              }
              const contentLength = headers.get("content-length");
              if (!contentLength) {
                this.fireError(new Error(`Header must provide a Content-Length property.
${JSON.stringify(Object.fromEntries(headers))}`));
                return;
              }
              const length = parseInt(contentLength);
              if (isNaN(length)) {
                this.fireError(new Error(`Content-Length value must be a number. Got ${contentLength}`));
                return;
              }
              this.nextMessageLength = length;
            }
            const body = this.buffer.tryReadBody(this.nextMessageLength);
            if (body === void 0) {
              this.setPartialMessageTimer();
              return;
            }
            this.clearPartialMessageTimer();
            this.nextMessageLength = -1;
            this.readSemaphore.lock(async () => {
              const bytes = this.options.contentDecoder !== void 0 ? await this.options.contentDecoder.decode(body) : body;
              const message = await this.options.contentTypeDecoder.decode(bytes, this.options);
              this.callback(message);
            }).catch((error) => {
              this.fireError(error);
            });
          }
        } catch (error) {
          this.fireError(error);
        }
      }
      clearPartialMessageTimer() {
        if (this.partialMessageTimer) {
          this.partialMessageTimer.dispose();
          this.partialMessageTimer = void 0;
        }
      }
      setPartialMessageTimer() {
        this.clearPartialMessageTimer();
        if (this._partialMessageTimeout <= 0) {
          return;
        }
        this.partialMessageTimer = (0, ral_1.default)().timer.setTimeout((token, timeout) => {
          this.partialMessageTimer = void 0;
          if (token === this.messageToken) {
            this.firePartialMessage({ messageToken: token, waitingTime: timeout });
            this.setPartialMessageTimer();
          }
        }, this._partialMessageTimeout, this.messageToken, this._partialMessageTimeout);
      }
    };
    exports2.ReadableStreamMessageReader = ReadableStreamMessageReader;
  }
});

// node_modules/vscode-jsonrpc/lib/common/messageWriter.js
var require_messageWriter = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/messageWriter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WriteableStreamMessageWriter = exports2.AbstractMessageWriter = exports2.MessageWriter = void 0;
    var ral_1 = require_ral();
    var Is = require_is2();
    var semaphore_1 = require_semaphore();
    var events_1 = require_events();
    var ContentLength = "Content-Length: ";
    var CRLF = "\r\n";
    var MessageWriter;
    (function(MessageWriter2) {
      function is(value) {
        let candidate = value;
        return candidate && Is.func(candidate.dispose) && Is.func(candidate.onClose) && Is.func(candidate.onError) && Is.func(candidate.write);
      }
      MessageWriter2.is = is;
    })(MessageWriter || (exports2.MessageWriter = MessageWriter = {}));
    var AbstractMessageWriter = class {
      constructor() {
        this.errorEmitter = new events_1.Emitter();
        this.closeEmitter = new events_1.Emitter();
      }
      dispose() {
        this.errorEmitter.dispose();
        this.closeEmitter.dispose();
      }
      get onError() {
        return this.errorEmitter.event;
      }
      fireError(error, message, count) {
        this.errorEmitter.fire([this.asError(error), message, count]);
      }
      get onClose() {
        return this.closeEmitter.event;
      }
      fireClose() {
        this.closeEmitter.fire(void 0);
      }
      asError(error) {
        if (error instanceof Error) {
          return error;
        } else {
          return new Error(`Writer received error. Reason: ${Is.string(error.message) ? error.message : "unknown"}`);
        }
      }
    };
    exports2.AbstractMessageWriter = AbstractMessageWriter;
    var ResolvedMessageWriterOptions;
    (function(ResolvedMessageWriterOptions2) {
      function fromOptions(options) {
        if (options === void 0 || typeof options === "string") {
          return { charset: options ?? "utf-8", contentTypeEncoder: (0, ral_1.default)().applicationJson.encoder };
        } else {
          return { charset: options.charset ?? "utf-8", contentEncoder: options.contentEncoder, contentTypeEncoder: options.contentTypeEncoder ?? (0, ral_1.default)().applicationJson.encoder };
        }
      }
      ResolvedMessageWriterOptions2.fromOptions = fromOptions;
    })(ResolvedMessageWriterOptions || (ResolvedMessageWriterOptions = {}));
    var WriteableStreamMessageWriter = class extends AbstractMessageWriter {
      constructor(writable, options) {
        super();
        this.writable = writable;
        this.options = ResolvedMessageWriterOptions.fromOptions(options);
        this.errorCount = 0;
        this.writeSemaphore = new semaphore_1.Semaphore(1);
        this.writable.onError((error) => this.fireError(error));
        this.writable.onClose(() => this.fireClose());
      }
      async write(msg) {
        return this.writeSemaphore.lock(async () => {
          const payload = this.options.contentTypeEncoder.encode(msg, this.options).then((buffer) => {
            if (this.options.contentEncoder !== void 0) {
              return this.options.contentEncoder.encode(buffer);
            } else {
              return buffer;
            }
          });
          return payload.then((buffer) => {
            const headers = [];
            headers.push(ContentLength, buffer.byteLength.toString(), CRLF);
            headers.push(CRLF);
            return this.doWrite(msg, headers, buffer);
          }, (error) => {
            this.fireError(error);
            throw error;
          });
        });
      }
      async doWrite(msg, headers, data) {
        try {
          await this.writable.write(headers.join(""), "ascii");
          return this.writable.write(data);
        } catch (error) {
          this.handleError(error, msg);
          return Promise.reject(error);
        }
      }
      handleError(error, msg) {
        this.errorCount++;
        this.fireError(error, msg, this.errorCount);
      }
      end() {
        this.writable.end();
      }
    };
    exports2.WriteableStreamMessageWriter = WriteableStreamMessageWriter;
  }
});

// node_modules/vscode-jsonrpc/lib/common/messageBuffer.js
var require_messageBuffer = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/messageBuffer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AbstractMessageBuffer = void 0;
    var CR = 13;
    var LF = 10;
    var CRLF = "\r\n";
    var AbstractMessageBuffer = class {
      constructor(encoding = "utf-8") {
        this._encoding = encoding;
        this._chunks = [];
        this._totalLength = 0;
      }
      get encoding() {
        return this._encoding;
      }
      append(chunk) {
        const toAppend = typeof chunk === "string" ? this.fromString(chunk, this._encoding) : chunk;
        this._chunks.push(toAppend);
        this._totalLength += toAppend.byteLength;
      }
      tryReadHeaders(lowerCaseKeys = false) {
        if (this._chunks.length === 0) {
          return void 0;
        }
        let state = 0;
        let chunkIndex = 0;
        let offset = 0;
        let chunkBytesRead = 0;
        row: while (chunkIndex < this._chunks.length) {
          const chunk = this._chunks[chunkIndex];
          offset = 0;
          column: while (offset < chunk.length) {
            const value = chunk[offset];
            switch (value) {
              case CR:
                switch (state) {
                  case 0:
                    state = 1;
                    break;
                  case 2:
                    state = 3;
                    break;
                  default:
                    state = 0;
                }
                break;
              case LF:
                switch (state) {
                  case 1:
                    state = 2;
                    break;
                  case 3:
                    state = 4;
                    offset++;
                    break row;
                  default:
                    state = 0;
                }
                break;
              default:
                state = 0;
            }
            offset++;
          }
          chunkBytesRead += chunk.byteLength;
          chunkIndex++;
        }
        if (state !== 4) {
          return void 0;
        }
        const buffer = this._read(chunkBytesRead + offset);
        const result = /* @__PURE__ */ new Map();
        const headers = this.toString(buffer, "ascii").split(CRLF);
        if (headers.length < 2) {
          return result;
        }
        for (let i = 0; i < headers.length - 2; i++) {
          const header = headers[i];
          const index2 = header.indexOf(":");
          if (index2 === -1) {
            throw new Error(`Message header must separate key and value using ':'
${header}`);
          }
          const key2 = header.substr(0, index2);
          const value = header.substr(index2 + 1).trim();
          result.set(lowerCaseKeys ? key2.toLowerCase() : key2, value);
        }
        return result;
      }
      tryReadBody(length) {
        if (this._totalLength < length) {
          return void 0;
        }
        return this._read(length);
      }
      get numberOfBytes() {
        return this._totalLength;
      }
      _read(byteCount) {
        if (byteCount === 0) {
          return this.emptyBuffer();
        }
        if (byteCount > this._totalLength) {
          throw new Error(`Cannot read so many bytes!`);
        }
        if (this._chunks[0].byteLength === byteCount) {
          const chunk = this._chunks[0];
          this._chunks.shift();
          this._totalLength -= byteCount;
          return this.asNative(chunk);
        }
        if (this._chunks[0].byteLength > byteCount) {
          const chunk = this._chunks[0];
          const result2 = this.asNative(chunk, byteCount);
          this._chunks[0] = chunk.slice(byteCount);
          this._totalLength -= byteCount;
          return result2;
        }
        const result = this.allocNative(byteCount);
        let resultOffset = 0;
        let chunkIndex = 0;
        while (byteCount > 0) {
          const chunk = this._chunks[chunkIndex];
          if (chunk.byteLength > byteCount) {
            const chunkPart = chunk.slice(0, byteCount);
            result.set(chunkPart, resultOffset);
            resultOffset += byteCount;
            this._chunks[chunkIndex] = chunk.slice(byteCount);
            this._totalLength -= byteCount;
            byteCount -= byteCount;
          } else {
            result.set(chunk, resultOffset);
            resultOffset += chunk.byteLength;
            this._chunks.shift();
            this._totalLength -= chunk.byteLength;
            byteCount -= chunk.byteLength;
          }
        }
        return result;
      }
    };
    exports2.AbstractMessageBuffer = AbstractMessageBuffer;
  }
});

// node_modules/vscode-jsonrpc/lib/common/connection.js
var require_connection = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/connection.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createMessageConnection = exports2.ConnectionOptions = exports2.MessageStrategy = exports2.CancellationStrategy = exports2.CancellationSenderStrategy = exports2.CancellationReceiverStrategy = exports2.RequestCancellationReceiverStrategy = exports2.IdCancellationReceiverStrategy = exports2.ConnectionStrategy = exports2.ConnectionError = exports2.ConnectionErrors = exports2.LogTraceNotification = exports2.SetTraceNotification = exports2.TraceFormat = exports2.TraceValues = exports2.Trace = exports2.NullLogger = exports2.ProgressType = exports2.ProgressToken = void 0;
    var ral_1 = require_ral();
    var Is = require_is2();
    var messages_1 = require_messages();
    var linkedMap_1 = require_linkedMap();
    var events_1 = require_events();
    var cancellation_1 = require_cancellation();
    var CancelNotification;
    (function(CancelNotification2) {
      CancelNotification2.type = new messages_1.NotificationType("$/cancelRequest");
    })(CancelNotification || (CancelNotification = {}));
    var ProgressToken;
    (function(ProgressToken2) {
      function is(value) {
        return typeof value === "string" || typeof value === "number";
      }
      ProgressToken2.is = is;
    })(ProgressToken || (exports2.ProgressToken = ProgressToken = {}));
    var ProgressNotification;
    (function(ProgressNotification2) {
      ProgressNotification2.type = new messages_1.NotificationType("$/progress");
    })(ProgressNotification || (ProgressNotification = {}));
    var ProgressType = class {
      constructor() {
      }
    };
    exports2.ProgressType = ProgressType;
    var StarRequestHandler;
    (function(StarRequestHandler2) {
      function is(value) {
        return Is.func(value);
      }
      StarRequestHandler2.is = is;
    })(StarRequestHandler || (StarRequestHandler = {}));
    exports2.NullLogger = Object.freeze({
      error: () => {
      },
      warn: () => {
      },
      info: () => {
      },
      log: () => {
      }
    });
    var Trace;
    (function(Trace2) {
      Trace2[Trace2["Off"] = 0] = "Off";
      Trace2[Trace2["Messages"] = 1] = "Messages";
      Trace2[Trace2["Compact"] = 2] = "Compact";
      Trace2[Trace2["Verbose"] = 3] = "Verbose";
    })(Trace || (exports2.Trace = Trace = {}));
    var TraceValues;
    (function(TraceValues2) {
      TraceValues2.Off = "off";
      TraceValues2.Messages = "messages";
      TraceValues2.Compact = "compact";
      TraceValues2.Verbose = "verbose";
    })(TraceValues || (exports2.TraceValues = TraceValues = {}));
    (function(Trace2) {
      function fromString(value) {
        if (!Is.string(value)) {
          return Trace2.Off;
        }
        value = value.toLowerCase();
        switch (value) {
          case "off":
            return Trace2.Off;
          case "messages":
            return Trace2.Messages;
          case "compact":
            return Trace2.Compact;
          case "verbose":
            return Trace2.Verbose;
          default:
            return Trace2.Off;
        }
      }
      Trace2.fromString = fromString;
      function toString(value) {
        switch (value) {
          case Trace2.Off:
            return "off";
          case Trace2.Messages:
            return "messages";
          case Trace2.Compact:
            return "compact";
          case Trace2.Verbose:
            return "verbose";
          default:
            return "off";
        }
      }
      Trace2.toString = toString;
    })(Trace || (exports2.Trace = Trace = {}));
    var TraceFormat;
    (function(TraceFormat2) {
      TraceFormat2["Text"] = "text";
      TraceFormat2["JSON"] = "json";
    })(TraceFormat || (exports2.TraceFormat = TraceFormat = {}));
    (function(TraceFormat2) {
      function fromString(value) {
        if (!Is.string(value)) {
          return TraceFormat2.Text;
        }
        value = value.toLowerCase();
        if (value === "json") {
          return TraceFormat2.JSON;
        } else {
          return TraceFormat2.Text;
        }
      }
      TraceFormat2.fromString = fromString;
    })(TraceFormat || (exports2.TraceFormat = TraceFormat = {}));
    var SetTraceNotification;
    (function(SetTraceNotification2) {
      SetTraceNotification2.type = new messages_1.NotificationType("$/setTrace");
    })(SetTraceNotification || (exports2.SetTraceNotification = SetTraceNotification = {}));
    var LogTraceNotification;
    (function(LogTraceNotification2) {
      LogTraceNotification2.type = new messages_1.NotificationType("$/logTrace");
    })(LogTraceNotification || (exports2.LogTraceNotification = LogTraceNotification = {}));
    var ConnectionErrors;
    (function(ConnectionErrors2) {
      ConnectionErrors2[ConnectionErrors2["Closed"] = 1] = "Closed";
      ConnectionErrors2[ConnectionErrors2["Disposed"] = 2] = "Disposed";
      ConnectionErrors2[ConnectionErrors2["AlreadyListening"] = 3] = "AlreadyListening";
    })(ConnectionErrors || (exports2.ConnectionErrors = ConnectionErrors = {}));
    var ConnectionError = class _ConnectionError extends Error {
      constructor(code3, message) {
        super(message);
        this.code = code3;
        Object.setPrototypeOf(this, _ConnectionError.prototype);
      }
    };
    exports2.ConnectionError = ConnectionError;
    var ConnectionStrategy;
    (function(ConnectionStrategy2) {
      function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.cancelUndispatched);
      }
      ConnectionStrategy2.is = is;
    })(ConnectionStrategy || (exports2.ConnectionStrategy = ConnectionStrategy = {}));
    var IdCancellationReceiverStrategy;
    (function(IdCancellationReceiverStrategy2) {
      function is(value) {
        const candidate = value;
        return candidate && (candidate.kind === void 0 || candidate.kind === "id") && Is.func(candidate.createCancellationTokenSource) && (candidate.dispose === void 0 || Is.func(candidate.dispose));
      }
      IdCancellationReceiverStrategy2.is = is;
    })(IdCancellationReceiverStrategy || (exports2.IdCancellationReceiverStrategy = IdCancellationReceiverStrategy = {}));
    var RequestCancellationReceiverStrategy;
    (function(RequestCancellationReceiverStrategy2) {
      function is(value) {
        const candidate = value;
        return candidate && candidate.kind === "request" && Is.func(candidate.createCancellationTokenSource) && (candidate.dispose === void 0 || Is.func(candidate.dispose));
      }
      RequestCancellationReceiverStrategy2.is = is;
    })(RequestCancellationReceiverStrategy || (exports2.RequestCancellationReceiverStrategy = RequestCancellationReceiverStrategy = {}));
    var CancellationReceiverStrategy;
    (function(CancellationReceiverStrategy2) {
      CancellationReceiverStrategy2.Message = Object.freeze({
        createCancellationTokenSource(_) {
          return new cancellation_1.CancellationTokenSource();
        }
      });
      function is(value) {
        return IdCancellationReceiverStrategy.is(value) || RequestCancellationReceiverStrategy.is(value);
      }
      CancellationReceiverStrategy2.is = is;
    })(CancellationReceiverStrategy || (exports2.CancellationReceiverStrategy = CancellationReceiverStrategy = {}));
    var CancellationSenderStrategy;
    (function(CancellationSenderStrategy2) {
      CancellationSenderStrategy2.Message = Object.freeze({
        sendCancellation(conn, id) {
          return conn.sendNotification(CancelNotification.type, { id });
        },
        cleanup(_) {
        }
      });
      function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.sendCancellation) && Is.func(candidate.cleanup);
      }
      CancellationSenderStrategy2.is = is;
    })(CancellationSenderStrategy || (exports2.CancellationSenderStrategy = CancellationSenderStrategy = {}));
    var CancellationStrategy;
    (function(CancellationStrategy2) {
      CancellationStrategy2.Message = Object.freeze({
        receiver: CancellationReceiverStrategy.Message,
        sender: CancellationSenderStrategy.Message
      });
      function is(value) {
        const candidate = value;
        return candidate && CancellationReceiverStrategy.is(candidate.receiver) && CancellationSenderStrategy.is(candidate.sender);
      }
      CancellationStrategy2.is = is;
    })(CancellationStrategy || (exports2.CancellationStrategy = CancellationStrategy = {}));
    var MessageStrategy;
    (function(MessageStrategy2) {
      function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.handleMessage);
      }
      MessageStrategy2.is = is;
    })(MessageStrategy || (exports2.MessageStrategy = MessageStrategy = {}));
    var ConnectionOptions;
    (function(ConnectionOptions2) {
      function is(value) {
        const candidate = value;
        return candidate && (CancellationStrategy.is(candidate.cancellationStrategy) || ConnectionStrategy.is(candidate.connectionStrategy) || MessageStrategy.is(candidate.messageStrategy));
      }
      ConnectionOptions2.is = is;
    })(ConnectionOptions || (exports2.ConnectionOptions = ConnectionOptions = {}));
    var ConnectionState;
    (function(ConnectionState2) {
      ConnectionState2[ConnectionState2["New"] = 1] = "New";
      ConnectionState2[ConnectionState2["Listening"] = 2] = "Listening";
      ConnectionState2[ConnectionState2["Closed"] = 3] = "Closed";
      ConnectionState2[ConnectionState2["Disposed"] = 4] = "Disposed";
    })(ConnectionState || (ConnectionState = {}));
    function createMessageConnection(messageReader, messageWriter, _logger, options) {
      const logger = _logger !== void 0 ? _logger : exports2.NullLogger;
      let sequenceNumber = 0;
      let notificationSequenceNumber = 0;
      let unknownResponseSequenceNumber = 0;
      const version = "2.0";
      let starRequestHandler = void 0;
      const requestHandlers = /* @__PURE__ */ new Map();
      let starNotificationHandler = void 0;
      const notificationHandlers = /* @__PURE__ */ new Map();
      const progressHandlers = /* @__PURE__ */ new Map();
      let timer;
      let messageQueue = new linkedMap_1.LinkedMap();
      let responsePromises = /* @__PURE__ */ new Map();
      let knownCanceledRequests = /* @__PURE__ */ new Set();
      let requestTokens = /* @__PURE__ */ new Map();
      let trace = Trace.Off;
      let traceFormat = TraceFormat.Text;
      let tracer;
      let state = ConnectionState.New;
      const errorEmitter = new events_1.Emitter();
      const closeEmitter = new events_1.Emitter();
      const unhandledNotificationEmitter = new events_1.Emitter();
      const unhandledProgressEmitter = new events_1.Emitter();
      const disposeEmitter = new events_1.Emitter();
      const cancellationStrategy = options && options.cancellationStrategy ? options.cancellationStrategy : CancellationStrategy.Message;
      function createRequestQueueKey(id) {
        if (id === null) {
          throw new Error(`Can't send requests with id null since the response can't be correlated.`);
        }
        return "req-" + id.toString();
      }
      function createResponseQueueKey(id) {
        if (id === null) {
          return "res-unknown-" + (++unknownResponseSequenceNumber).toString();
        } else {
          return "res-" + id.toString();
        }
      }
      function createNotificationQueueKey() {
        return "not-" + (++notificationSequenceNumber).toString();
      }
      function addMessageToQueue(queue, message) {
        if (messages_1.Message.isRequest(message)) {
          queue.set(createRequestQueueKey(message.id), message);
        } else if (messages_1.Message.isResponse(message)) {
          queue.set(createResponseQueueKey(message.id), message);
        } else {
          queue.set(createNotificationQueueKey(), message);
        }
      }
      function cancelUndispatched(_message) {
        return void 0;
      }
      function isListening() {
        return state === ConnectionState.Listening;
      }
      function isClosed() {
        return state === ConnectionState.Closed;
      }
      function isDisposed() {
        return state === ConnectionState.Disposed;
      }
      function closeHandler() {
        if (state === ConnectionState.New || state === ConnectionState.Listening) {
          state = ConnectionState.Closed;
          closeEmitter.fire(void 0);
        }
      }
      function readErrorHandler(error) {
        errorEmitter.fire([error, void 0, void 0]);
      }
      function writeErrorHandler(data) {
        errorEmitter.fire(data);
      }
      messageReader.onClose(closeHandler);
      messageReader.onError(readErrorHandler);
      messageWriter.onClose(closeHandler);
      messageWriter.onError(writeErrorHandler);
      function triggerMessageQueue() {
        if (timer || messageQueue.size === 0) {
          return;
        }
        timer = (0, ral_1.default)().timer.setImmediate(() => {
          timer = void 0;
          processMessageQueue();
        });
      }
      function handleMessage(message) {
        if (messages_1.Message.isRequest(message)) {
          handleRequest(message);
        } else if (messages_1.Message.isNotification(message)) {
          handleNotification(message);
        } else if (messages_1.Message.isResponse(message)) {
          handleResponse(message);
        } else {
          handleInvalidMessage(message);
        }
      }
      function processMessageQueue() {
        if (messageQueue.size === 0) {
          return;
        }
        const message = messageQueue.shift();
        try {
          const messageStrategy = options?.messageStrategy;
          if (MessageStrategy.is(messageStrategy)) {
            messageStrategy.handleMessage(message, handleMessage);
          } else {
            handleMessage(message);
          }
        } finally {
          triggerMessageQueue();
        }
      }
      const callback = (message) => {
        try {
          if (messages_1.Message.isNotification(message) && message.method === CancelNotification.type.method) {
            const cancelId = message.params.id;
            const key2 = createRequestQueueKey(cancelId);
            const toCancel = messageQueue.get(key2);
            if (messages_1.Message.isRequest(toCancel)) {
              const strategy = options?.connectionStrategy;
              const response = strategy && strategy.cancelUndispatched ? strategy.cancelUndispatched(toCancel, cancelUndispatched) : cancelUndispatched(toCancel);
              if (response && (response.error !== void 0 || response.result !== void 0)) {
                messageQueue.delete(key2);
                requestTokens.delete(cancelId);
                response.id = toCancel.id;
                traceSendingResponse(response, message.method, Date.now());
                messageWriter.write(response).catch(() => logger.error(`Sending response for canceled message failed.`));
                return;
              }
            }
            const cancellationToken = requestTokens.get(cancelId);
            if (cancellationToken !== void 0) {
              cancellationToken.cancel();
              traceReceivedNotification(message);
              return;
            } else {
              knownCanceledRequests.add(cancelId);
            }
          }
          addMessageToQueue(messageQueue, message);
        } finally {
          triggerMessageQueue();
        }
      };
      function handleRequest(requestMessage) {
        if (isDisposed()) {
          return;
        }
        function reply(resultOrError, method, startTime2) {
          const message = {
            jsonrpc: version,
            id: requestMessage.id
          };
          if (resultOrError instanceof messages_1.ResponseError) {
            message.error = resultOrError.toJson();
          } else {
            message.result = resultOrError === void 0 ? null : resultOrError;
          }
          traceSendingResponse(message, method, startTime2);
          messageWriter.write(message).catch(() => logger.error(`Sending response failed.`));
        }
        function replyError(error, method, startTime2) {
          const message = {
            jsonrpc: version,
            id: requestMessage.id,
            error: error.toJson()
          };
          traceSendingResponse(message, method, startTime2);
          messageWriter.write(message).catch(() => logger.error(`Sending response failed.`));
        }
        function replySuccess(result, method, startTime2) {
          if (result === void 0) {
            result = null;
          }
          const message = {
            jsonrpc: version,
            id: requestMessage.id,
            result
          };
          traceSendingResponse(message, method, startTime2);
          messageWriter.write(message).catch(() => logger.error(`Sending response failed.`));
        }
        traceReceivedRequest(requestMessage);
        const element = requestHandlers.get(requestMessage.method);
        let type;
        let requestHandler;
        if (element) {
          type = element.type;
          requestHandler = element.handler;
        }
        const startTime = Date.now();
        if (requestHandler || starRequestHandler) {
          const tokenKey = requestMessage.id ?? String(Date.now());
          const cancellationSource = IdCancellationReceiverStrategy.is(cancellationStrategy.receiver) ? cancellationStrategy.receiver.createCancellationTokenSource(tokenKey) : cancellationStrategy.receiver.createCancellationTokenSource(requestMessage);
          if (requestMessage.id !== null && knownCanceledRequests.has(requestMessage.id)) {
            cancellationSource.cancel();
          }
          if (requestMessage.id !== null) {
            requestTokens.set(tokenKey, cancellationSource);
          }
          try {
            let handlerResult;
            if (requestHandler) {
              if (requestMessage.params === void 0) {
                if (type !== void 0 && type.numberOfParams !== 0) {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines ${type.numberOfParams} params but received none.`), requestMessage.method, startTime);
                  return;
                }
                handlerResult = requestHandler(cancellationSource.token);
              } else if (Array.isArray(requestMessage.params)) {
                if (type !== void 0 && type.parameterStructures === messages_1.ParameterStructures.byName) {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines parameters by name but received parameters by position`), requestMessage.method, startTime);
                  return;
                }
                handlerResult = requestHandler(...requestMessage.params, cancellationSource.token);
              } else {
                if (type !== void 0 && type.parameterStructures === messages_1.ParameterStructures.byPosition) {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines parameters by position but received parameters by name`), requestMessage.method, startTime);
                  return;
                }
                handlerResult = requestHandler(requestMessage.params, cancellationSource.token);
              }
            } else if (starRequestHandler) {
              handlerResult = starRequestHandler(requestMessage.method, requestMessage.params, cancellationSource.token);
            }
            const promise = handlerResult;
            if (!handlerResult) {
              requestTokens.delete(tokenKey);
              replySuccess(handlerResult, requestMessage.method, startTime);
            } else if (promise.then) {
              promise.then((resultOrError) => {
                requestTokens.delete(tokenKey);
                reply(resultOrError, requestMessage.method, startTime);
              }, (error) => {
                requestTokens.delete(tokenKey);
                if (error instanceof messages_1.ResponseError) {
                  replyError(error, requestMessage.method, startTime);
                } else if (error && Is.string(error.message)) {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`), requestMessage.method, startTime);
                } else {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`), requestMessage.method, startTime);
                }
              });
            } else {
              requestTokens.delete(tokenKey);
              reply(handlerResult, requestMessage.method, startTime);
            }
          } catch (error) {
            requestTokens.delete(tokenKey);
            if (error instanceof messages_1.ResponseError) {
              reply(error, requestMessage.method, startTime);
            } else if (error && Is.string(error.message)) {
              replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`), requestMessage.method, startTime);
            } else {
              replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`), requestMessage.method, startTime);
            }
          }
        } else {
          replyError(new messages_1.ResponseError(messages_1.ErrorCodes.MethodNotFound, `Unhandled method ${requestMessage.method}`), requestMessage.method, startTime);
        }
      }
      function handleResponse(responseMessage) {
        if (isDisposed()) {
          return;
        }
        if (responseMessage.id === null) {
          if (responseMessage.error) {
            logger.error(`Received response message without id: Error is: 
${JSON.stringify(responseMessage.error, void 0, 4)}`);
          } else {
            logger.error(`Received response message without id. No further error information provided.`);
          }
        } else {
          const key2 = responseMessage.id;
          const responsePromise = responsePromises.get(key2);
          traceReceivedResponse(responseMessage, responsePromise);
          if (responsePromise !== void 0) {
            responsePromises.delete(key2);
            try {
              if (responseMessage.error) {
                const error = responseMessage.error;
                responsePromise.reject(new messages_1.ResponseError(error.code, error.message, error.data));
              } else if (responseMessage.result !== void 0) {
                responsePromise.resolve(responseMessage.result);
              } else {
                throw new Error("Should never happen.");
              }
            } catch (error) {
              if (error.message) {
                logger.error(`Response handler '${responsePromise.method}' failed with message: ${error.message}`);
              } else {
                logger.error(`Response handler '${responsePromise.method}' failed unexpectedly.`);
              }
            }
          }
        }
      }
      function handleNotification(message) {
        if (isDisposed()) {
          return;
        }
        let type = void 0;
        let notificationHandler;
        if (message.method === CancelNotification.type.method) {
          const cancelId = message.params.id;
          knownCanceledRequests.delete(cancelId);
          traceReceivedNotification(message);
          return;
        } else {
          const element = notificationHandlers.get(message.method);
          if (element) {
            notificationHandler = element.handler;
            type = element.type;
          }
        }
        if (notificationHandler || starNotificationHandler) {
          try {
            traceReceivedNotification(message);
            if (notificationHandler) {
              if (message.params === void 0) {
                if (type !== void 0) {
                  if (type.numberOfParams !== 0 && type.parameterStructures !== messages_1.ParameterStructures.byName) {
                    logger.error(`Notification ${message.method} defines ${type.numberOfParams} params but received none.`);
                  }
                }
                notificationHandler();
              } else if (Array.isArray(message.params)) {
                const params = message.params;
                if (message.method === ProgressNotification.type.method && params.length === 2 && ProgressToken.is(params[0])) {
                  notificationHandler({ token: params[0], value: params[1] });
                } else {
                  if (type !== void 0) {
                    if (type.parameterStructures === messages_1.ParameterStructures.byName) {
                      logger.error(`Notification ${message.method} defines parameters by name but received parameters by position`);
                    }
                    if (type.numberOfParams !== message.params.length) {
                      logger.error(`Notification ${message.method} defines ${type.numberOfParams} params but received ${params.length} arguments`);
                    }
                  }
                  notificationHandler(...params);
                }
              } else {
                if (type !== void 0 && type.parameterStructures === messages_1.ParameterStructures.byPosition) {
                  logger.error(`Notification ${message.method} defines parameters by position but received parameters by name`);
                }
                notificationHandler(message.params);
              }
            } else if (starNotificationHandler) {
              starNotificationHandler(message.method, message.params);
            }
          } catch (error) {
            if (error.message) {
              logger.error(`Notification handler '${message.method}' failed with message: ${error.message}`);
            } else {
              logger.error(`Notification handler '${message.method}' failed unexpectedly.`);
            }
          }
        } else {
          unhandledNotificationEmitter.fire(message);
        }
      }
      function handleInvalidMessage(message) {
        if (!message) {
          logger.error("Received empty message.");
          return;
        }
        logger.error(`Received message which is neither a response nor a notification message:
${JSON.stringify(message, null, 4)}`);
        const responseMessage = message;
        if (Is.string(responseMessage.id) || Is.number(responseMessage.id)) {
          const key2 = responseMessage.id;
          const responseHandler = responsePromises.get(key2);
          if (responseHandler) {
            responseHandler.reject(new Error("The received response has neither a result nor an error property."));
          }
        }
      }
      function stringifyTrace(params) {
        if (params === void 0 || params === null) {
          return void 0;
        }
        switch (trace) {
          case Trace.Verbose:
            return JSON.stringify(params, null, 4);
          case Trace.Compact:
            return JSON.stringify(params);
          default:
            return void 0;
        }
      }
      function traceSendingRequest(message) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = void 0;
          if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params) {
            data = `Params: ${stringifyTrace(message.params)}

`;
          }
          tracer.log(`Sending request '${message.method} - (${message.id})'.`, data);
        } else {
          logLSPMessage("send-request", message);
        }
      }
      function traceSendingNotification(message) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = void 0;
          if (trace === Trace.Verbose || trace === Trace.Compact) {
            if (message.params) {
              data = `Params: ${stringifyTrace(message.params)}

`;
            } else {
              data = "No parameters provided.\n\n";
            }
          }
          tracer.log(`Sending notification '${message.method}'.`, data);
        } else {
          logLSPMessage("send-notification", message);
        }
      }
      function traceSendingResponse(message, method, startTime) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = void 0;
          if (trace === Trace.Verbose || trace === Trace.Compact) {
            if (message.error && message.error.data) {
              data = `Error data: ${stringifyTrace(message.error.data)}

`;
            } else {
              if (message.result) {
                data = `Result: ${stringifyTrace(message.result)}

`;
              } else if (message.error === void 0) {
                data = "No result returned.\n\n";
              }
            }
          }
          tracer.log(`Sending response '${method} - (${message.id})'. Processing request took ${Date.now() - startTime}ms`, data);
        } else {
          logLSPMessage("send-response", message);
        }
      }
      function traceReceivedRequest(message) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = void 0;
          if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params) {
            data = `Params: ${stringifyTrace(message.params)}

`;
          }
          tracer.log(`Received request '${message.method} - (${message.id})'.`, data);
        } else {
          logLSPMessage("receive-request", message);
        }
      }
      function traceReceivedNotification(message) {
        if (trace === Trace.Off || !tracer || message.method === LogTraceNotification.type.method) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = void 0;
          if (trace === Trace.Verbose || trace === Trace.Compact) {
            if (message.params) {
              data = `Params: ${stringifyTrace(message.params)}

`;
            } else {
              data = "No parameters provided.\n\n";
            }
          }
          tracer.log(`Received notification '${message.method}'.`, data);
        } else {
          logLSPMessage("receive-notification", message);
        }
      }
      function traceReceivedResponse(message, responsePromise) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = void 0;
          if (trace === Trace.Verbose || trace === Trace.Compact) {
            if (message.error && message.error.data) {
              data = `Error data: ${stringifyTrace(message.error.data)}

`;
            } else {
              if (message.result) {
                data = `Result: ${stringifyTrace(message.result)}

`;
              } else if (message.error === void 0) {
                data = "No result returned.\n\n";
              }
            }
          }
          if (responsePromise) {
            const error = message.error ? ` Request failed: ${message.error.message} (${message.error.code}).` : "";
            tracer.log(`Received response '${responsePromise.method} - (${message.id})' in ${Date.now() - responsePromise.timerStart}ms.${error}`, data);
          } else {
            tracer.log(`Received response ${message.id} without active response promise.`, data);
          }
        } else {
          logLSPMessage("receive-response", message);
        }
      }
      function logLSPMessage(type, message) {
        if (!tracer || trace === Trace.Off) {
          return;
        }
        const lspMessage = {
          isLSPMessage: true,
          type,
          message,
          timestamp: Date.now()
        };
        tracer.log(lspMessage);
      }
      function throwIfClosedOrDisposed() {
        if (isClosed()) {
          throw new ConnectionError(ConnectionErrors.Closed, "Connection is closed.");
        }
        if (isDisposed()) {
          throw new ConnectionError(ConnectionErrors.Disposed, "Connection is disposed.");
        }
      }
      function throwIfListening() {
        if (isListening()) {
          throw new ConnectionError(ConnectionErrors.AlreadyListening, "Connection is already listening");
        }
      }
      function throwIfNotListening() {
        if (!isListening()) {
          throw new Error("Call listen() first.");
        }
      }
      function undefinedToNull(param) {
        if (param === void 0) {
          return null;
        } else {
          return param;
        }
      }
      function nullToUndefined(param) {
        if (param === null) {
          return void 0;
        } else {
          return param;
        }
      }
      function isNamedParam(param) {
        return param !== void 0 && param !== null && !Array.isArray(param) && typeof param === "object";
      }
      function computeSingleParam(parameterStructures, param) {
        switch (parameterStructures) {
          case messages_1.ParameterStructures.auto:
            if (isNamedParam(param)) {
              return nullToUndefined(param);
            } else {
              return [undefinedToNull(param)];
            }
          case messages_1.ParameterStructures.byName:
            if (!isNamedParam(param)) {
              throw new Error(`Received parameters by name but param is not an object literal.`);
            }
            return nullToUndefined(param);
          case messages_1.ParameterStructures.byPosition:
            return [undefinedToNull(param)];
          default:
            throw new Error(`Unknown parameter structure ${parameterStructures.toString()}`);
        }
      }
      function computeMessageParams(type, params) {
        let result;
        const numberOfParams = type.numberOfParams;
        switch (numberOfParams) {
          case 0:
            result = void 0;
            break;
          case 1:
            result = computeSingleParam(type.parameterStructures, params[0]);
            break;
          default:
            result = [];
            for (let i = 0; i < params.length && i < numberOfParams; i++) {
              result.push(undefinedToNull(params[i]));
            }
            if (params.length < numberOfParams) {
              for (let i = params.length; i < numberOfParams; i++) {
                result.push(null);
              }
            }
            break;
        }
        return result;
      }
      const connection2 = {
        sendNotification: (type, ...args) => {
          throwIfClosedOrDisposed();
          let method;
          let messageParams;
          if (Is.string(type)) {
            method = type;
            const first = args[0];
            let paramStart = 0;
            let parameterStructures = messages_1.ParameterStructures.auto;
            if (messages_1.ParameterStructures.is(first)) {
              paramStart = 1;
              parameterStructures = first;
            }
            let paramEnd = args.length;
            const numberOfParams = paramEnd - paramStart;
            switch (numberOfParams) {
              case 0:
                messageParams = void 0;
                break;
              case 1:
                messageParams = computeSingleParam(parameterStructures, args[paramStart]);
                break;
              default:
                if (parameterStructures === messages_1.ParameterStructures.byName) {
                  throw new Error(`Received ${numberOfParams} parameters for 'by Name' notification parameter structure.`);
                }
                messageParams = args.slice(paramStart, paramEnd).map((value) => undefinedToNull(value));
                break;
            }
          } else {
            const params = args;
            method = type.method;
            messageParams = computeMessageParams(type, params);
          }
          const notificationMessage = {
            jsonrpc: version,
            method,
            params: messageParams
          };
          traceSendingNotification(notificationMessage);
          return messageWriter.write(notificationMessage).catch((error) => {
            logger.error(`Sending notification failed.`);
            throw error;
          });
        },
        onNotification: (type, handler) => {
          throwIfClosedOrDisposed();
          let method;
          if (Is.func(type)) {
            starNotificationHandler = type;
          } else if (handler) {
            if (Is.string(type)) {
              method = type;
              notificationHandlers.set(type, { type: void 0, handler });
            } else {
              method = type.method;
              notificationHandlers.set(type.method, { type, handler });
            }
          }
          return {
            dispose: () => {
              if (method !== void 0) {
                notificationHandlers.delete(method);
              } else {
                starNotificationHandler = void 0;
              }
            }
          };
        },
        onProgress: (_type, token, handler) => {
          if (progressHandlers.has(token)) {
            throw new Error(`Progress handler for token ${token} already registered`);
          }
          progressHandlers.set(token, handler);
          return {
            dispose: () => {
              progressHandlers.delete(token);
            }
          };
        },
        sendProgress: (_type, token, value) => {
          return connection2.sendNotification(ProgressNotification.type, { token, value });
        },
        onUnhandledProgress: unhandledProgressEmitter.event,
        sendRequest: (type, ...args) => {
          throwIfClosedOrDisposed();
          throwIfNotListening();
          let method;
          let messageParams;
          let token = void 0;
          if (Is.string(type)) {
            method = type;
            const first = args[0];
            const last = args[args.length - 1];
            let paramStart = 0;
            let parameterStructures = messages_1.ParameterStructures.auto;
            if (messages_1.ParameterStructures.is(first)) {
              paramStart = 1;
              parameterStructures = first;
            }
            let paramEnd = args.length;
            if (cancellation_1.CancellationToken.is(last)) {
              paramEnd = paramEnd - 1;
              token = last;
            }
            const numberOfParams = paramEnd - paramStart;
            switch (numberOfParams) {
              case 0:
                messageParams = void 0;
                break;
              case 1:
                messageParams = computeSingleParam(parameterStructures, args[paramStart]);
                break;
              default:
                if (parameterStructures === messages_1.ParameterStructures.byName) {
                  throw new Error(`Received ${numberOfParams} parameters for 'by Name' request parameter structure.`);
                }
                messageParams = args.slice(paramStart, paramEnd).map((value) => undefinedToNull(value));
                break;
            }
          } else {
            const params = args;
            method = type.method;
            messageParams = computeMessageParams(type, params);
            const numberOfParams = type.numberOfParams;
            token = cancellation_1.CancellationToken.is(params[numberOfParams]) ? params[numberOfParams] : void 0;
          }
          const id = sequenceNumber++;
          let disposable;
          if (token) {
            disposable = token.onCancellationRequested(() => {
              const p = cancellationStrategy.sender.sendCancellation(connection2, id);
              if (p === void 0) {
                logger.log(`Received no promise from cancellation strategy when cancelling id ${id}`);
                return Promise.resolve();
              } else {
                return p.catch(() => {
                  logger.log(`Sending cancellation messages for id ${id} failed`);
                });
              }
            });
          }
          const requestMessage = {
            jsonrpc: version,
            id,
            method,
            params: messageParams
          };
          traceSendingRequest(requestMessage);
          if (typeof cancellationStrategy.sender.enableCancellation === "function") {
            cancellationStrategy.sender.enableCancellation(requestMessage);
          }
          return new Promise(async (resolve4, reject) => {
            const resolveWithCleanup = (r) => {
              resolve4(r);
              cancellationStrategy.sender.cleanup(id);
              disposable?.dispose();
            };
            const rejectWithCleanup = (r) => {
              reject(r);
              cancellationStrategy.sender.cleanup(id);
              disposable?.dispose();
            };
            const responsePromise = { method, timerStart: Date.now(), resolve: resolveWithCleanup, reject: rejectWithCleanup };
            try {
              await messageWriter.write(requestMessage);
              responsePromises.set(id, responsePromise);
            } catch (error) {
              logger.error(`Sending request failed.`);
              responsePromise.reject(new messages_1.ResponseError(messages_1.ErrorCodes.MessageWriteError, error.message ? error.message : "Unknown reason"));
              throw error;
            }
          });
        },
        onRequest: (type, handler) => {
          throwIfClosedOrDisposed();
          let method = null;
          if (StarRequestHandler.is(type)) {
            method = void 0;
            starRequestHandler = type;
          } else if (Is.string(type)) {
            method = null;
            if (handler !== void 0) {
              method = type;
              requestHandlers.set(type, { handler, type: void 0 });
            }
          } else {
            if (handler !== void 0) {
              method = type.method;
              requestHandlers.set(type.method, { type, handler });
            }
          }
          return {
            dispose: () => {
              if (method === null) {
                return;
              }
              if (method !== void 0) {
                requestHandlers.delete(method);
              } else {
                starRequestHandler = void 0;
              }
            }
          };
        },
        hasPendingResponse: () => {
          return responsePromises.size > 0;
        },
        trace: async (_value, _tracer, sendNotificationOrTraceOptions) => {
          let _sendNotification = false;
          let _traceFormat = TraceFormat.Text;
          if (sendNotificationOrTraceOptions !== void 0) {
            if (Is.boolean(sendNotificationOrTraceOptions)) {
              _sendNotification = sendNotificationOrTraceOptions;
            } else {
              _sendNotification = sendNotificationOrTraceOptions.sendNotification || false;
              _traceFormat = sendNotificationOrTraceOptions.traceFormat || TraceFormat.Text;
            }
          }
          trace = _value;
          traceFormat = _traceFormat;
          if (trace === Trace.Off) {
            tracer = void 0;
          } else {
            tracer = _tracer;
          }
          if (_sendNotification && !isClosed() && !isDisposed()) {
            await connection2.sendNotification(SetTraceNotification.type, { value: Trace.toString(_value) });
          }
        },
        onError: errorEmitter.event,
        onClose: closeEmitter.event,
        onUnhandledNotification: unhandledNotificationEmitter.event,
        onDispose: disposeEmitter.event,
        end: () => {
          messageWriter.end();
        },
        dispose: () => {
          if (isDisposed()) {
            return;
          }
          state = ConnectionState.Disposed;
          disposeEmitter.fire(void 0);
          const error = new messages_1.ResponseError(messages_1.ErrorCodes.PendingResponseRejected, "Pending response rejected since connection got disposed");
          for (const promise of responsePromises.values()) {
            promise.reject(error);
          }
          responsePromises = /* @__PURE__ */ new Map();
          requestTokens = /* @__PURE__ */ new Map();
          knownCanceledRequests = /* @__PURE__ */ new Set();
          messageQueue = new linkedMap_1.LinkedMap();
          if (Is.func(messageWriter.dispose)) {
            messageWriter.dispose();
          }
          if (Is.func(messageReader.dispose)) {
            messageReader.dispose();
          }
        },
        listen: () => {
          throwIfClosedOrDisposed();
          throwIfListening();
          state = ConnectionState.Listening;
          messageReader.listen(callback);
        },
        inspect: () => {
          (0, ral_1.default)().console.log("inspect");
        }
      };
      connection2.onNotification(LogTraceNotification.type, (params) => {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        const verbose = trace === Trace.Verbose || trace === Trace.Compact;
        tracer.log(params.message, verbose ? params.verbose : void 0);
      });
      connection2.onNotification(ProgressNotification.type, (params) => {
        const handler = progressHandlers.get(params.token);
        if (handler) {
          handler(params.value);
        } else {
          unhandledProgressEmitter.fire(params);
        }
      });
      return connection2;
    }
    exports2.createMessageConnection = createMessageConnection;
  }
});

// node_modules/vscode-jsonrpc/lib/common/api.js
var require_api = __commonJS({
  "node_modules/vscode-jsonrpc/lib/common/api.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProgressType = exports2.ProgressToken = exports2.createMessageConnection = exports2.NullLogger = exports2.ConnectionOptions = exports2.ConnectionStrategy = exports2.AbstractMessageBuffer = exports2.WriteableStreamMessageWriter = exports2.AbstractMessageWriter = exports2.MessageWriter = exports2.ReadableStreamMessageReader = exports2.AbstractMessageReader = exports2.MessageReader = exports2.SharedArrayReceiverStrategy = exports2.SharedArraySenderStrategy = exports2.CancellationToken = exports2.CancellationTokenSource = exports2.Emitter = exports2.Event = exports2.Disposable = exports2.LRUCache = exports2.Touch = exports2.LinkedMap = exports2.ParameterStructures = exports2.NotificationType9 = exports2.NotificationType8 = exports2.NotificationType7 = exports2.NotificationType6 = exports2.NotificationType5 = exports2.NotificationType4 = exports2.NotificationType3 = exports2.NotificationType2 = exports2.NotificationType1 = exports2.NotificationType0 = exports2.NotificationType = exports2.ErrorCodes = exports2.ResponseError = exports2.RequestType9 = exports2.RequestType8 = exports2.RequestType7 = exports2.RequestType6 = exports2.RequestType5 = exports2.RequestType4 = exports2.RequestType3 = exports2.RequestType2 = exports2.RequestType1 = exports2.RequestType0 = exports2.RequestType = exports2.Message = exports2.RAL = void 0;
    exports2.MessageStrategy = exports2.CancellationStrategy = exports2.CancellationSenderStrategy = exports2.CancellationReceiverStrategy = exports2.ConnectionError = exports2.ConnectionErrors = exports2.LogTraceNotification = exports2.SetTraceNotification = exports2.TraceFormat = exports2.TraceValues = exports2.Trace = void 0;
    var messages_1 = require_messages();
    Object.defineProperty(exports2, "Message", { enumerable: true, get: function() {
      return messages_1.Message;
    } });
    Object.defineProperty(exports2, "RequestType", { enumerable: true, get: function() {
      return messages_1.RequestType;
    } });
    Object.defineProperty(exports2, "RequestType0", { enumerable: true, get: function() {
      return messages_1.RequestType0;
    } });
    Object.defineProperty(exports2, "RequestType1", { enumerable: true, get: function() {
      return messages_1.RequestType1;
    } });
    Object.defineProperty(exports2, "RequestType2", { enumerable: true, get: function() {
      return messages_1.RequestType2;
    } });
    Object.defineProperty(exports2, "RequestType3", { enumerable: true, get: function() {
      return messages_1.RequestType3;
    } });
    Object.defineProperty(exports2, "RequestType4", { enumerable: true, get: function() {
      return messages_1.RequestType4;
    } });
    Object.defineProperty(exports2, "RequestType5", { enumerable: true, get: function() {
      return messages_1.RequestType5;
    } });
    Object.defineProperty(exports2, "RequestType6", { enumerable: true, get: function() {
      return messages_1.RequestType6;
    } });
    Object.defineProperty(exports2, "RequestType7", { enumerable: true, get: function() {
      return messages_1.RequestType7;
    } });
    Object.defineProperty(exports2, "RequestType8", { enumerable: true, get: function() {
      return messages_1.RequestType8;
    } });
    Object.defineProperty(exports2, "RequestType9", { enumerable: true, get: function() {
      return messages_1.RequestType9;
    } });
    Object.defineProperty(exports2, "ResponseError", { enumerable: true, get: function() {
      return messages_1.ResponseError;
    } });
    Object.defineProperty(exports2, "ErrorCodes", { enumerable: true, get: function() {
      return messages_1.ErrorCodes;
    } });
    Object.defineProperty(exports2, "NotificationType", { enumerable: true, get: function() {
      return messages_1.NotificationType;
    } });
    Object.defineProperty(exports2, "NotificationType0", { enumerable: true, get: function() {
      return messages_1.NotificationType0;
    } });
    Object.defineProperty(exports2, "NotificationType1", { enumerable: true, get: function() {
      return messages_1.NotificationType1;
    } });
    Object.defineProperty(exports2, "NotificationType2", { enumerable: true, get: function() {
      return messages_1.NotificationType2;
    } });
    Object.defineProperty(exports2, "NotificationType3", { enumerable: true, get: function() {
      return messages_1.NotificationType3;
    } });
    Object.defineProperty(exports2, "NotificationType4", { enumerable: true, get: function() {
      return messages_1.NotificationType4;
    } });
    Object.defineProperty(exports2, "NotificationType5", { enumerable: true, get: function() {
      return messages_1.NotificationType5;
    } });
    Object.defineProperty(exports2, "NotificationType6", { enumerable: true, get: function() {
      return messages_1.NotificationType6;
    } });
    Object.defineProperty(exports2, "NotificationType7", { enumerable: true, get: function() {
      return messages_1.NotificationType7;
    } });
    Object.defineProperty(exports2, "NotificationType8", { enumerable: true, get: function() {
      return messages_1.NotificationType8;
    } });
    Object.defineProperty(exports2, "NotificationType9", { enumerable: true, get: function() {
      return messages_1.NotificationType9;
    } });
    Object.defineProperty(exports2, "ParameterStructures", { enumerable: true, get: function() {
      return messages_1.ParameterStructures;
    } });
    var linkedMap_1 = require_linkedMap();
    Object.defineProperty(exports2, "LinkedMap", { enumerable: true, get: function() {
      return linkedMap_1.LinkedMap;
    } });
    Object.defineProperty(exports2, "LRUCache", { enumerable: true, get: function() {
      return linkedMap_1.LRUCache;
    } });
    Object.defineProperty(exports2, "Touch", { enumerable: true, get: function() {
      return linkedMap_1.Touch;
    } });
    var disposable_1 = require_disposable();
    Object.defineProperty(exports2, "Disposable", { enumerable: true, get: function() {
      return disposable_1.Disposable;
    } });
    var events_1 = require_events();
    Object.defineProperty(exports2, "Event", { enumerable: true, get: function() {
      return events_1.Event;
    } });
    Object.defineProperty(exports2, "Emitter", { enumerable: true, get: function() {
      return events_1.Emitter;
    } });
    var cancellation_1 = require_cancellation();
    Object.defineProperty(exports2, "CancellationTokenSource", { enumerable: true, get: function() {
      return cancellation_1.CancellationTokenSource;
    } });
    Object.defineProperty(exports2, "CancellationToken", { enumerable: true, get: function() {
      return cancellation_1.CancellationToken;
    } });
    var sharedArrayCancellation_1 = require_sharedArrayCancellation();
    Object.defineProperty(exports2, "SharedArraySenderStrategy", { enumerable: true, get: function() {
      return sharedArrayCancellation_1.SharedArraySenderStrategy;
    } });
    Object.defineProperty(exports2, "SharedArrayReceiverStrategy", { enumerable: true, get: function() {
      return sharedArrayCancellation_1.SharedArrayReceiverStrategy;
    } });
    var messageReader_1 = require_messageReader();
    Object.defineProperty(exports2, "MessageReader", { enumerable: true, get: function() {
      return messageReader_1.MessageReader;
    } });
    Object.defineProperty(exports2, "AbstractMessageReader", { enumerable: true, get: function() {
      return messageReader_1.AbstractMessageReader;
    } });
    Object.defineProperty(exports2, "ReadableStreamMessageReader", { enumerable: true, get: function() {
      return messageReader_1.ReadableStreamMessageReader;
    } });
    var messageWriter_1 = require_messageWriter();
    Object.defineProperty(exports2, "MessageWriter", { enumerable: true, get: function() {
      return messageWriter_1.MessageWriter;
    } });
    Object.defineProperty(exports2, "AbstractMessageWriter", { enumerable: true, get: function() {
      return messageWriter_1.AbstractMessageWriter;
    } });
    Object.defineProperty(exports2, "WriteableStreamMessageWriter", { enumerable: true, get: function() {
      return messageWriter_1.WriteableStreamMessageWriter;
    } });
    var messageBuffer_1 = require_messageBuffer();
    Object.defineProperty(exports2, "AbstractMessageBuffer", { enumerable: true, get: function() {
      return messageBuffer_1.AbstractMessageBuffer;
    } });
    var connection_1 = require_connection();
    Object.defineProperty(exports2, "ConnectionStrategy", { enumerable: true, get: function() {
      return connection_1.ConnectionStrategy;
    } });
    Object.defineProperty(exports2, "ConnectionOptions", { enumerable: true, get: function() {
      return connection_1.ConnectionOptions;
    } });
    Object.defineProperty(exports2, "NullLogger", { enumerable: true, get: function() {
      return connection_1.NullLogger;
    } });
    Object.defineProperty(exports2, "createMessageConnection", { enumerable: true, get: function() {
      return connection_1.createMessageConnection;
    } });
    Object.defineProperty(exports2, "ProgressToken", { enumerable: true, get: function() {
      return connection_1.ProgressToken;
    } });
    Object.defineProperty(exports2, "ProgressType", { enumerable: true, get: function() {
      return connection_1.ProgressType;
    } });
    Object.defineProperty(exports2, "Trace", { enumerable: true, get: function() {
      return connection_1.Trace;
    } });
    Object.defineProperty(exports2, "TraceValues", { enumerable: true, get: function() {
      return connection_1.TraceValues;
    } });
    Object.defineProperty(exports2, "TraceFormat", { enumerable: true, get: function() {
      return connection_1.TraceFormat;
    } });
    Object.defineProperty(exports2, "SetTraceNotification", { enumerable: true, get: function() {
      return connection_1.SetTraceNotification;
    } });
    Object.defineProperty(exports2, "LogTraceNotification", { enumerable: true, get: function() {
      return connection_1.LogTraceNotification;
    } });
    Object.defineProperty(exports2, "ConnectionErrors", { enumerable: true, get: function() {
      return connection_1.ConnectionErrors;
    } });
    Object.defineProperty(exports2, "ConnectionError", { enumerable: true, get: function() {
      return connection_1.ConnectionError;
    } });
    Object.defineProperty(exports2, "CancellationReceiverStrategy", { enumerable: true, get: function() {
      return connection_1.CancellationReceiverStrategy;
    } });
    Object.defineProperty(exports2, "CancellationSenderStrategy", { enumerable: true, get: function() {
      return connection_1.CancellationSenderStrategy;
    } });
    Object.defineProperty(exports2, "CancellationStrategy", { enumerable: true, get: function() {
      return connection_1.CancellationStrategy;
    } });
    Object.defineProperty(exports2, "MessageStrategy", { enumerable: true, get: function() {
      return connection_1.MessageStrategy;
    } });
    var ral_1 = require_ral();
    exports2.RAL = ral_1.default;
  }
});

// node_modules/vscode-jsonrpc/lib/node/ril.js
var require_ril = __commonJS({
  "node_modules/vscode-jsonrpc/lib/node/ril.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var util_1 = require("util");
    var api_1 = require_api();
    var MessageBuffer = class _MessageBuffer extends api_1.AbstractMessageBuffer {
      constructor(encoding = "utf-8") {
        super(encoding);
      }
      emptyBuffer() {
        return _MessageBuffer.emptyBuffer;
      }
      fromString(value, encoding) {
        return Buffer.from(value, encoding);
      }
      toString(value, encoding) {
        if (value instanceof Buffer) {
          return value.toString(encoding);
        } else {
          return new util_1.TextDecoder(encoding).decode(value);
        }
      }
      asNative(buffer, length) {
        if (length === void 0) {
          return buffer instanceof Buffer ? buffer : Buffer.from(buffer);
        } else {
          return buffer instanceof Buffer ? buffer.slice(0, length) : Buffer.from(buffer, 0, length);
        }
      }
      allocNative(length) {
        return Buffer.allocUnsafe(length);
      }
    };
    MessageBuffer.emptyBuffer = Buffer.allocUnsafe(0);
    var ReadableStreamWrapper = class {
      constructor(stream) {
        this.stream = stream;
      }
      onClose(listener) {
        this.stream.on("close", listener);
        return api_1.Disposable.create(() => this.stream.off("close", listener));
      }
      onError(listener) {
        this.stream.on("error", listener);
        return api_1.Disposable.create(() => this.stream.off("error", listener));
      }
      onEnd(listener) {
        this.stream.on("end", listener);
        return api_1.Disposable.create(() => this.stream.off("end", listener));
      }
      onData(listener) {
        this.stream.on("data", listener);
        return api_1.Disposable.create(() => this.stream.off("data", listener));
      }
    };
    var WritableStreamWrapper = class {
      constructor(stream) {
        this.stream = stream;
      }
      onClose(listener) {
        this.stream.on("close", listener);
        return api_1.Disposable.create(() => this.stream.off("close", listener));
      }
      onError(listener) {
        this.stream.on("error", listener);
        return api_1.Disposable.create(() => this.stream.off("error", listener));
      }
      onEnd(listener) {
        this.stream.on("end", listener);
        return api_1.Disposable.create(() => this.stream.off("end", listener));
      }
      write(data, encoding) {
        return new Promise((resolve4, reject) => {
          const callback = (error) => {
            if (error === void 0 || error === null) {
              resolve4();
            } else {
              reject(error);
            }
          };
          if (typeof data === "string") {
            this.stream.write(data, encoding, callback);
          } else {
            this.stream.write(data, callback);
          }
        });
      }
      end() {
        this.stream.end();
      }
    };
    var _ril = Object.freeze({
      messageBuffer: Object.freeze({
        create: (encoding) => new MessageBuffer(encoding)
      }),
      applicationJson: Object.freeze({
        encoder: Object.freeze({
          name: "application/json",
          encode: (msg, options) => {
            try {
              return Promise.resolve(Buffer.from(JSON.stringify(msg, void 0, 0), options.charset));
            } catch (err) {
              return Promise.reject(err);
            }
          }
        }),
        decoder: Object.freeze({
          name: "application/json",
          decode: (buffer, options) => {
            try {
              if (buffer instanceof Buffer) {
                return Promise.resolve(JSON.parse(buffer.toString(options.charset)));
              } else {
                return Promise.resolve(JSON.parse(new util_1.TextDecoder(options.charset).decode(buffer)));
              }
            } catch (err) {
              return Promise.reject(err);
            }
          }
        })
      }),
      stream: Object.freeze({
        asReadableStream: (stream) => new ReadableStreamWrapper(stream),
        asWritableStream: (stream) => new WritableStreamWrapper(stream)
      }),
      console,
      timer: Object.freeze({
        setTimeout(callback, ms, ...args) {
          const handle = setTimeout(callback, ms, ...args);
          return { dispose: () => clearTimeout(handle) };
        },
        setImmediate(callback, ...args) {
          const handle = setImmediate(callback, ...args);
          return { dispose: () => clearImmediate(handle) };
        },
        setInterval(callback, ms, ...args) {
          const handle = setInterval(callback, ms, ...args);
          return { dispose: () => clearInterval(handle) };
        }
      })
    });
    function RIL() {
      return _ril;
    }
    (function(RIL2) {
      function install() {
        api_1.RAL.install(_ril);
      }
      RIL2.install = install;
    })(RIL || (RIL = {}));
    exports2.default = RIL;
  }
});

// node_modules/vscode-jsonrpc/lib/node/main.js
var require_main = __commonJS({
  "node_modules/vscode-jsonrpc/lib/node/main.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createMessageConnection = exports2.createServerSocketTransport = exports2.createClientSocketTransport = exports2.createServerPipeTransport = exports2.createClientPipeTransport = exports2.generateRandomPipeName = exports2.StreamMessageWriter = exports2.StreamMessageReader = exports2.SocketMessageWriter = exports2.SocketMessageReader = exports2.PortMessageWriter = exports2.PortMessageReader = exports2.IPCMessageWriter = exports2.IPCMessageReader = void 0;
    var ril_1 = require_ril();
    ril_1.default.install();
    var path8 = require("path");
    var os = require("os");
    var crypto_1 = require("crypto");
    var net_1 = require("net");
    var api_1 = require_api();
    __exportStar(require_api(), exports2);
    var IPCMessageReader = class extends api_1.AbstractMessageReader {
      constructor(process2) {
        super();
        this.process = process2;
        let eventEmitter = this.process;
        eventEmitter.on("error", (error) => this.fireError(error));
        eventEmitter.on("close", () => this.fireClose());
      }
      listen(callback) {
        this.process.on("message", callback);
        return api_1.Disposable.create(() => this.process.off("message", callback));
      }
    };
    exports2.IPCMessageReader = IPCMessageReader;
    var IPCMessageWriter = class extends api_1.AbstractMessageWriter {
      constructor(process2) {
        super();
        this.process = process2;
        this.errorCount = 0;
        const eventEmitter = this.process;
        eventEmitter.on("error", (error) => this.fireError(error));
        eventEmitter.on("close", () => this.fireClose);
      }
      write(msg) {
        try {
          if (typeof this.process.send === "function") {
            this.process.send(msg, void 0, void 0, (error) => {
              if (error) {
                this.errorCount++;
                this.handleError(error, msg);
              } else {
                this.errorCount = 0;
              }
            });
          }
          return Promise.resolve();
        } catch (error) {
          this.handleError(error, msg);
          return Promise.reject(error);
        }
      }
      handleError(error, msg) {
        this.errorCount++;
        this.fireError(error, msg, this.errorCount);
      }
      end() {
      }
    };
    exports2.IPCMessageWriter = IPCMessageWriter;
    var PortMessageReader = class extends api_1.AbstractMessageReader {
      constructor(port) {
        super();
        this.onData = new api_1.Emitter();
        port.on("close", () => this.fireClose);
        port.on("error", (error) => this.fireError(error));
        port.on("message", (message) => {
          this.onData.fire(message);
        });
      }
      listen(callback) {
        return this.onData.event(callback);
      }
    };
    exports2.PortMessageReader = PortMessageReader;
    var PortMessageWriter = class extends api_1.AbstractMessageWriter {
      constructor(port) {
        super();
        this.port = port;
        this.errorCount = 0;
        port.on("close", () => this.fireClose());
        port.on("error", (error) => this.fireError(error));
      }
      write(msg) {
        try {
          this.port.postMessage(msg);
          return Promise.resolve();
        } catch (error) {
          this.handleError(error, msg);
          return Promise.reject(error);
        }
      }
      handleError(error, msg) {
        this.errorCount++;
        this.fireError(error, msg, this.errorCount);
      }
      end() {
      }
    };
    exports2.PortMessageWriter = PortMessageWriter;
    var SocketMessageReader = class extends api_1.ReadableStreamMessageReader {
      constructor(socket, encoding = "utf-8") {
        super((0, ril_1.default)().stream.asReadableStream(socket), encoding);
      }
    };
    exports2.SocketMessageReader = SocketMessageReader;
    var SocketMessageWriter = class extends api_1.WriteableStreamMessageWriter {
      constructor(socket, options) {
        super((0, ril_1.default)().stream.asWritableStream(socket), options);
        this.socket = socket;
      }
      dispose() {
        super.dispose();
        this.socket.destroy();
      }
    };
    exports2.SocketMessageWriter = SocketMessageWriter;
    var StreamMessageReader = class extends api_1.ReadableStreamMessageReader {
      constructor(readable, encoding) {
        super((0, ril_1.default)().stream.asReadableStream(readable), encoding);
      }
    };
    exports2.StreamMessageReader = StreamMessageReader;
    var StreamMessageWriter = class extends api_1.WriteableStreamMessageWriter {
      constructor(writable, options) {
        super((0, ril_1.default)().stream.asWritableStream(writable), options);
      }
    };
    exports2.StreamMessageWriter = StreamMessageWriter;
    var XDG_RUNTIME_DIR = process.env["XDG_RUNTIME_DIR"];
    var safeIpcPathLengths = /* @__PURE__ */ new Map([
      ["linux", 107],
      ["darwin", 103]
    ]);
    function generateRandomPipeName() {
      const randomSuffix = (0, crypto_1.randomBytes)(21).toString("hex");
      if (process.platform === "win32") {
        return `\\\\.\\pipe\\vscode-jsonrpc-${randomSuffix}-sock`;
      }
      let result;
      if (XDG_RUNTIME_DIR) {
        result = path8.join(XDG_RUNTIME_DIR, `vscode-ipc-${randomSuffix}.sock`);
      } else {
        result = path8.join(os.tmpdir(), `vscode-${randomSuffix}.sock`);
      }
      const limit = safeIpcPathLengths.get(process.platform);
      if (limit !== void 0 && result.length > limit) {
        (0, ril_1.default)().console.warn(`WARNING: IPC handle "${result}" is longer than ${limit} characters.`);
      }
      return result;
    }
    exports2.generateRandomPipeName = generateRandomPipeName;
    function createClientPipeTransport(pipeName, encoding = "utf-8") {
      let connectResolve;
      const connected = new Promise((resolve4, _reject) => {
        connectResolve = resolve4;
      });
      return new Promise((resolve4, reject) => {
        let server = (0, net_1.createServer)((socket) => {
          server.close();
          connectResolve([
            new SocketMessageReader(socket, encoding),
            new SocketMessageWriter(socket, encoding)
          ]);
        });
        server.on("error", reject);
        server.listen(pipeName, () => {
          server.removeListener("error", reject);
          resolve4({
            onConnected: () => {
              return connected;
            }
          });
        });
      });
    }
    exports2.createClientPipeTransport = createClientPipeTransport;
    function createServerPipeTransport(pipeName, encoding = "utf-8") {
      const socket = (0, net_1.createConnection)(pipeName);
      return [
        new SocketMessageReader(socket, encoding),
        new SocketMessageWriter(socket, encoding)
      ];
    }
    exports2.createServerPipeTransport = createServerPipeTransport;
    function createClientSocketTransport(port, encoding = "utf-8") {
      let connectResolve;
      const connected = new Promise((resolve4, _reject) => {
        connectResolve = resolve4;
      });
      return new Promise((resolve4, reject) => {
        const server = (0, net_1.createServer)((socket) => {
          server.close();
          connectResolve([
            new SocketMessageReader(socket, encoding),
            new SocketMessageWriter(socket, encoding)
          ]);
        });
        server.on("error", reject);
        server.listen(port, "127.0.0.1", () => {
          server.removeListener("error", reject);
          resolve4({
            onConnected: () => {
              return connected;
            }
          });
        });
      });
    }
    exports2.createClientSocketTransport = createClientSocketTransport;
    function createServerSocketTransport(port, encoding = "utf-8") {
      const socket = (0, net_1.createConnection)(port, "127.0.0.1");
      return [
        new SocketMessageReader(socket, encoding),
        new SocketMessageWriter(socket, encoding)
      ];
    }
    exports2.createServerSocketTransport = createServerSocketTransport;
    function isReadableStream(value) {
      const candidate = value;
      return candidate.read !== void 0 && candidate.addListener !== void 0;
    }
    function isWritableStream(value) {
      const candidate = value;
      return candidate.write !== void 0 && candidate.addListener !== void 0;
    }
    function createMessageConnection(input, output, logger, options) {
      if (!logger) {
        logger = api_1.NullLogger;
      }
      const reader = isReadableStream(input) ? new StreamMessageReader(input) : input;
      const writer = isWritableStream(output) ? new StreamMessageWriter(output) : output;
      if (api_1.ConnectionStrategy.is(options)) {
        options = { connectionStrategy: options };
      }
      return (0, api_1.createMessageConnection)(reader, writer, logger, options);
    }
    exports2.createMessageConnection = createMessageConnection;
  }
});

// node_modules/vscode-jsonrpc/node.js
var require_node = __commonJS({
  "node_modules/vscode-jsonrpc/node.js"(exports2, module2) {
    "use strict";
    module2.exports = require_main();
  }
});

// node_modules/vscode-languageserver-types/lib/umd/main.js
var require_main2 = __commonJS({
  "node_modules/vscode-languageserver-types/lib/umd/main.js"(exports2, module2) {
    (function(factory) {
      if (typeof module2 === "object" && typeof module2.exports === "object") {
        var v = factory(require, exports2);
        if (v !== void 0) module2.exports = v;
      } else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
      }
    })(function(require2, exports3) {
      "use strict";
      Object.defineProperty(exports3, "__esModule", { value: true });
      exports3.TextDocument = exports3.EOL = exports3.WorkspaceFolder = exports3.InlineCompletionContext = exports3.SelectedCompletionInfo = exports3.InlineCompletionTriggerKind = exports3.InlineCompletionList = exports3.InlineCompletionItem = exports3.StringValue = exports3.InlayHint = exports3.InlayHintLabelPart = exports3.InlayHintKind = exports3.InlineValueContext = exports3.InlineValueEvaluatableExpression = exports3.InlineValueVariableLookup = exports3.InlineValueText = exports3.SemanticTokens = exports3.SemanticTokenModifiers = exports3.SemanticTokenTypes = exports3.SelectionRange = exports3.DocumentLink = exports3.FormattingOptions = exports3.CodeLens = exports3.CodeAction = exports3.CodeActionContext = exports3.CodeActionTriggerKind = exports3.CodeActionKind = exports3.DocumentSymbol = exports3.WorkspaceSymbol = exports3.SymbolInformation = exports3.SymbolTag = exports3.SymbolKind = exports3.DocumentHighlight = exports3.DocumentHighlightKind = exports3.SignatureInformation = exports3.ParameterInformation = exports3.Hover = exports3.MarkedString = exports3.CompletionList = exports3.CompletionItem = exports3.CompletionItemLabelDetails = exports3.InsertTextMode = exports3.InsertReplaceEdit = exports3.CompletionItemTag = exports3.InsertTextFormat = exports3.CompletionItemKind = exports3.MarkupContent = exports3.MarkupKind = exports3.TextDocumentItem = exports3.OptionalVersionedTextDocumentIdentifier = exports3.VersionedTextDocumentIdentifier = exports3.TextDocumentIdentifier = exports3.WorkspaceChange = exports3.WorkspaceEdit = exports3.DeleteFile = exports3.RenameFile = exports3.CreateFile = exports3.TextDocumentEdit = exports3.AnnotatedTextEdit = exports3.ChangeAnnotationIdentifier = exports3.ChangeAnnotation = exports3.TextEdit = exports3.Command = exports3.Diagnostic = exports3.CodeDescription = exports3.DiagnosticTag = exports3.DiagnosticSeverity = exports3.DiagnosticRelatedInformation = exports3.FoldingRange = exports3.FoldingRangeKind = exports3.ColorPresentation = exports3.ColorInformation = exports3.Color = exports3.LocationLink = exports3.Location = exports3.Range = exports3.Position = exports3.uinteger = exports3.integer = exports3.URI = exports3.DocumentUri = void 0;
      var DocumentUri;
      (function(DocumentUri2) {
        function is(value) {
          return typeof value === "string";
        }
        DocumentUri2.is = is;
      })(DocumentUri || (exports3.DocumentUri = DocumentUri = {}));
      var URI;
      (function(URI2) {
        function is(value) {
          return typeof value === "string";
        }
        URI2.is = is;
      })(URI || (exports3.URI = URI = {}));
      var integer;
      (function(integer2) {
        integer2.MIN_VALUE = -2147483648;
        integer2.MAX_VALUE = 2147483647;
        function is(value) {
          return typeof value === "number" && integer2.MIN_VALUE <= value && value <= integer2.MAX_VALUE;
        }
        integer2.is = is;
      })(integer || (exports3.integer = integer = {}));
      var uinteger;
      (function(uinteger2) {
        uinteger2.MIN_VALUE = 0;
        uinteger2.MAX_VALUE = 2147483647;
        function is(value) {
          return typeof value === "number" && uinteger2.MIN_VALUE <= value && value <= uinteger2.MAX_VALUE;
        }
        uinteger2.is = is;
      })(uinteger || (exports3.uinteger = uinteger = {}));
      var Position;
      (function(Position2) {
        function create(line, character) {
          if (line === Number.MAX_VALUE) {
            line = uinteger.MAX_VALUE;
          }
          if (character === Number.MAX_VALUE) {
            character = uinteger.MAX_VALUE;
          }
          return { line, character };
        }
        Position2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.uinteger(candidate.line) && Is.uinteger(candidate.character);
        }
        Position2.is = is;
      })(Position || (exports3.Position = Position = {}));
      var Range;
      (function(Range2) {
        function create(one, two, three, four) {
          if (Is.uinteger(one) && Is.uinteger(two) && Is.uinteger(three) && Is.uinteger(four)) {
            return { start: Position.create(one, two), end: Position.create(three, four) };
          } else if (Position.is(one) && Position.is(two)) {
            return { start: one, end: two };
          } else {
            throw new Error("Range#create called with invalid arguments[".concat(one, ", ").concat(two, ", ").concat(three, ", ").concat(four, "]"));
          }
        }
        Range2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Position.is(candidate.start) && Position.is(candidate.end);
        }
        Range2.is = is;
      })(Range || (exports3.Range = Range = {}));
      var Location;
      (function(Location2) {
        function create(uri, range) {
          return { uri, range };
        }
        Location2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Range.is(candidate.range) && (Is.string(candidate.uri) || Is.undefined(candidate.uri));
        }
        Location2.is = is;
      })(Location || (exports3.Location = Location = {}));
      var LocationLink;
      (function(LocationLink2) {
        function create(targetUri, targetRange, targetSelectionRange, originSelectionRange) {
          return { targetUri, targetRange, targetSelectionRange, originSelectionRange };
        }
        LocationLink2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Range.is(candidate.targetRange) && Is.string(candidate.targetUri) && Range.is(candidate.targetSelectionRange) && (Range.is(candidate.originSelectionRange) || Is.undefined(candidate.originSelectionRange));
        }
        LocationLink2.is = is;
      })(LocationLink || (exports3.LocationLink = LocationLink = {}));
      var Color;
      (function(Color2) {
        function create(red, green, blue, alpha) {
          return {
            red,
            green,
            blue,
            alpha
          };
        }
        Color2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.numberRange(candidate.red, 0, 1) && Is.numberRange(candidate.green, 0, 1) && Is.numberRange(candidate.blue, 0, 1) && Is.numberRange(candidate.alpha, 0, 1);
        }
        Color2.is = is;
      })(Color || (exports3.Color = Color = {}));
      var ColorInformation;
      (function(ColorInformation2) {
        function create(range, color) {
          return {
            range,
            color
          };
        }
        ColorInformation2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Range.is(candidate.range) && Color.is(candidate.color);
        }
        ColorInformation2.is = is;
      })(ColorInformation || (exports3.ColorInformation = ColorInformation = {}));
      var ColorPresentation;
      (function(ColorPresentation2) {
        function create(label, textEdit, additionalTextEdits) {
          return {
            label,
            textEdit,
            additionalTextEdits
          };
        }
        ColorPresentation2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.string(candidate.label) && (Is.undefined(candidate.textEdit) || TextEdit.is(candidate)) && (Is.undefined(candidate.additionalTextEdits) || Is.typedArray(candidate.additionalTextEdits, TextEdit.is));
        }
        ColorPresentation2.is = is;
      })(ColorPresentation || (exports3.ColorPresentation = ColorPresentation = {}));
      var FoldingRangeKind2;
      (function(FoldingRangeKind3) {
        FoldingRangeKind3.Comment = "comment";
        FoldingRangeKind3.Imports = "imports";
        FoldingRangeKind3.Region = "region";
      })(FoldingRangeKind2 || (exports3.FoldingRangeKind = FoldingRangeKind2 = {}));
      var FoldingRange2;
      (function(FoldingRange3) {
        function create(startLine, endLine, startCharacter, endCharacter, kind, collapsedText) {
          var result = {
            startLine,
            endLine
          };
          if (Is.defined(startCharacter)) {
            result.startCharacter = startCharacter;
          }
          if (Is.defined(endCharacter)) {
            result.endCharacter = endCharacter;
          }
          if (Is.defined(kind)) {
            result.kind = kind;
          }
          if (Is.defined(collapsedText)) {
            result.collapsedText = collapsedText;
          }
          return result;
        }
        FoldingRange3.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.uinteger(candidate.startLine) && Is.uinteger(candidate.startLine) && (Is.undefined(candidate.startCharacter) || Is.uinteger(candidate.startCharacter)) && (Is.undefined(candidate.endCharacter) || Is.uinteger(candidate.endCharacter)) && (Is.undefined(candidate.kind) || Is.string(candidate.kind));
        }
        FoldingRange3.is = is;
      })(FoldingRange2 || (exports3.FoldingRange = FoldingRange2 = {}));
      var DiagnosticRelatedInformation;
      (function(DiagnosticRelatedInformation2) {
        function create(location, message) {
          return {
            location,
            message
          };
        }
        DiagnosticRelatedInformation2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Location.is(candidate.location) && Is.string(candidate.message);
        }
        DiagnosticRelatedInformation2.is = is;
      })(DiagnosticRelatedInformation || (exports3.DiagnosticRelatedInformation = DiagnosticRelatedInformation = {}));
      var DiagnosticSeverity2;
      (function(DiagnosticSeverity3) {
        DiagnosticSeverity3.Error = 1;
        DiagnosticSeverity3.Warning = 2;
        DiagnosticSeverity3.Information = 3;
        DiagnosticSeverity3.Hint = 4;
      })(DiagnosticSeverity2 || (exports3.DiagnosticSeverity = DiagnosticSeverity2 = {}));
      var DiagnosticTag;
      (function(DiagnosticTag2) {
        DiagnosticTag2.Unnecessary = 1;
        DiagnosticTag2.Deprecated = 2;
      })(DiagnosticTag || (exports3.DiagnosticTag = DiagnosticTag = {}));
      var CodeDescription;
      (function(CodeDescription2) {
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.string(candidate.href);
        }
        CodeDescription2.is = is;
      })(CodeDescription || (exports3.CodeDescription = CodeDescription = {}));
      var Diagnostic;
      (function(Diagnostic2) {
        function create(range, message, severity, code3, source, relatedInformation) {
          var result = { range, message };
          if (Is.defined(severity)) {
            result.severity = severity;
          }
          if (Is.defined(code3)) {
            result.code = code3;
          }
          if (Is.defined(source)) {
            result.source = source;
          }
          if (Is.defined(relatedInformation)) {
            result.relatedInformation = relatedInformation;
          }
          return result;
        }
        Diagnostic2.create = create;
        function is(value) {
          var _a;
          var candidate = value;
          return Is.defined(candidate) && Range.is(candidate.range) && Is.string(candidate.message) && (Is.number(candidate.severity) || Is.undefined(candidate.severity)) && (Is.integer(candidate.code) || Is.string(candidate.code) || Is.undefined(candidate.code)) && (Is.undefined(candidate.codeDescription) || Is.string((_a = candidate.codeDescription) === null || _a === void 0 ? void 0 : _a.href)) && (Is.string(candidate.source) || Is.undefined(candidate.source)) && (Is.undefined(candidate.relatedInformation) || Is.typedArray(candidate.relatedInformation, DiagnosticRelatedInformation.is));
        }
        Diagnostic2.is = is;
      })(Diagnostic || (exports3.Diagnostic = Diagnostic = {}));
      var Command;
      (function(Command2) {
        function create(title, command2) {
          var args = [];
          for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
          }
          var result = { title, command: command2 };
          if (Is.defined(args) && args.length > 0) {
            result.arguments = args;
          }
          return result;
        }
        Command2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.string(candidate.title) && Is.string(candidate.command);
        }
        Command2.is = is;
      })(Command || (exports3.Command = Command = {}));
      var TextEdit;
      (function(TextEdit2) {
        function replace(range, newText) {
          return { range, newText };
        }
        TextEdit2.replace = replace;
        function insert(position, newText) {
          return { range: { start: position, end: position }, newText };
        }
        TextEdit2.insert = insert;
        function del(range) {
          return { range, newText: "" };
        }
        TextEdit2.del = del;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.string(candidate.newText) && Range.is(candidate.range);
        }
        TextEdit2.is = is;
      })(TextEdit || (exports3.TextEdit = TextEdit = {}));
      var ChangeAnnotation;
      (function(ChangeAnnotation2) {
        function create(label, needsConfirmation, description) {
          var result = { label };
          if (needsConfirmation !== void 0) {
            result.needsConfirmation = needsConfirmation;
          }
          if (description !== void 0) {
            result.description = description;
          }
          return result;
        }
        ChangeAnnotation2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Is.string(candidate.label) && (Is.boolean(candidate.needsConfirmation) || candidate.needsConfirmation === void 0) && (Is.string(candidate.description) || candidate.description === void 0);
        }
        ChangeAnnotation2.is = is;
      })(ChangeAnnotation || (exports3.ChangeAnnotation = ChangeAnnotation = {}));
      var ChangeAnnotationIdentifier;
      (function(ChangeAnnotationIdentifier2) {
        function is(value) {
          var candidate = value;
          return Is.string(candidate);
        }
        ChangeAnnotationIdentifier2.is = is;
      })(ChangeAnnotationIdentifier || (exports3.ChangeAnnotationIdentifier = ChangeAnnotationIdentifier = {}));
      var AnnotatedTextEdit;
      (function(AnnotatedTextEdit2) {
        function replace(range, newText, annotation) {
          return { range, newText, annotationId: annotation };
        }
        AnnotatedTextEdit2.replace = replace;
        function insert(position, newText, annotation) {
          return { range: { start: position, end: position }, newText, annotationId: annotation };
        }
        AnnotatedTextEdit2.insert = insert;
        function del(range, annotation) {
          return { range, newText: "", annotationId: annotation };
        }
        AnnotatedTextEdit2.del = del;
        function is(value) {
          var candidate = value;
          return TextEdit.is(candidate) && (ChangeAnnotation.is(candidate.annotationId) || ChangeAnnotationIdentifier.is(candidate.annotationId));
        }
        AnnotatedTextEdit2.is = is;
      })(AnnotatedTextEdit || (exports3.AnnotatedTextEdit = AnnotatedTextEdit = {}));
      var TextDocumentEdit;
      (function(TextDocumentEdit2) {
        function create(textDocument, edits) {
          return { textDocument, edits };
        }
        TextDocumentEdit2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && OptionalVersionedTextDocumentIdentifier.is(candidate.textDocument) && Array.isArray(candidate.edits);
        }
        TextDocumentEdit2.is = is;
      })(TextDocumentEdit || (exports3.TextDocumentEdit = TextDocumentEdit = {}));
      var CreateFile;
      (function(CreateFile2) {
        function create(uri, options, annotation) {
          var result = {
            kind: "create",
            uri
          };
          if (options !== void 0 && (options.overwrite !== void 0 || options.ignoreIfExists !== void 0)) {
            result.options = options;
          }
          if (annotation !== void 0) {
            result.annotationId = annotation;
          }
          return result;
        }
        CreateFile2.create = create;
        function is(value) {
          var candidate = value;
          return candidate && candidate.kind === "create" && Is.string(candidate.uri) && (candidate.options === void 0 || (candidate.options.overwrite === void 0 || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === void 0 || Is.boolean(candidate.options.ignoreIfExists))) && (candidate.annotationId === void 0 || ChangeAnnotationIdentifier.is(candidate.annotationId));
        }
        CreateFile2.is = is;
      })(CreateFile || (exports3.CreateFile = CreateFile = {}));
      var RenameFile;
      (function(RenameFile2) {
        function create(oldUri, newUri, options, annotation) {
          var result = {
            kind: "rename",
            oldUri,
            newUri
          };
          if (options !== void 0 && (options.overwrite !== void 0 || options.ignoreIfExists !== void 0)) {
            result.options = options;
          }
          if (annotation !== void 0) {
            result.annotationId = annotation;
          }
          return result;
        }
        RenameFile2.create = create;
        function is(value) {
          var candidate = value;
          return candidate && candidate.kind === "rename" && Is.string(candidate.oldUri) && Is.string(candidate.newUri) && (candidate.options === void 0 || (candidate.options.overwrite === void 0 || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === void 0 || Is.boolean(candidate.options.ignoreIfExists))) && (candidate.annotationId === void 0 || ChangeAnnotationIdentifier.is(candidate.annotationId));
        }
        RenameFile2.is = is;
      })(RenameFile || (exports3.RenameFile = RenameFile = {}));
      var DeleteFile;
      (function(DeleteFile2) {
        function create(uri, options, annotation) {
          var result = {
            kind: "delete",
            uri
          };
          if (options !== void 0 && (options.recursive !== void 0 || options.ignoreIfNotExists !== void 0)) {
            result.options = options;
          }
          if (annotation !== void 0) {
            result.annotationId = annotation;
          }
          return result;
        }
        DeleteFile2.create = create;
        function is(value) {
          var candidate = value;
          return candidate && candidate.kind === "delete" && Is.string(candidate.uri) && (candidate.options === void 0 || (candidate.options.recursive === void 0 || Is.boolean(candidate.options.recursive)) && (candidate.options.ignoreIfNotExists === void 0 || Is.boolean(candidate.options.ignoreIfNotExists))) && (candidate.annotationId === void 0 || ChangeAnnotationIdentifier.is(candidate.annotationId));
        }
        DeleteFile2.is = is;
      })(DeleteFile || (exports3.DeleteFile = DeleteFile = {}));
      var WorkspaceEdit;
      (function(WorkspaceEdit2) {
        function is(value) {
          var candidate = value;
          return candidate && (candidate.changes !== void 0 || candidate.documentChanges !== void 0) && (candidate.documentChanges === void 0 || candidate.documentChanges.every(function(change) {
            if (Is.string(change.kind)) {
              return CreateFile.is(change) || RenameFile.is(change) || DeleteFile.is(change);
            } else {
              return TextDocumentEdit.is(change);
            }
          }));
        }
        WorkspaceEdit2.is = is;
      })(WorkspaceEdit || (exports3.WorkspaceEdit = WorkspaceEdit = {}));
      var TextEditChangeImpl = (
        /** @class */
        (function() {
          function TextEditChangeImpl2(edits, changeAnnotations) {
            this.edits = edits;
            this.changeAnnotations = changeAnnotations;
          }
          TextEditChangeImpl2.prototype.insert = function(position, newText, annotation) {
            var edit;
            var id;
            if (annotation === void 0) {
              edit = TextEdit.insert(position, newText);
            } else if (ChangeAnnotationIdentifier.is(annotation)) {
              id = annotation;
              edit = AnnotatedTextEdit.insert(position, newText, annotation);
            } else {
              this.assertChangeAnnotations(this.changeAnnotations);
              id = this.changeAnnotations.manage(annotation);
              edit = AnnotatedTextEdit.insert(position, newText, id);
            }
            this.edits.push(edit);
            if (id !== void 0) {
              return id;
            }
          };
          TextEditChangeImpl2.prototype.replace = function(range, newText, annotation) {
            var edit;
            var id;
            if (annotation === void 0) {
              edit = TextEdit.replace(range, newText);
            } else if (ChangeAnnotationIdentifier.is(annotation)) {
              id = annotation;
              edit = AnnotatedTextEdit.replace(range, newText, annotation);
            } else {
              this.assertChangeAnnotations(this.changeAnnotations);
              id = this.changeAnnotations.manage(annotation);
              edit = AnnotatedTextEdit.replace(range, newText, id);
            }
            this.edits.push(edit);
            if (id !== void 0) {
              return id;
            }
          };
          TextEditChangeImpl2.prototype.delete = function(range, annotation) {
            var edit;
            var id;
            if (annotation === void 0) {
              edit = TextEdit.del(range);
            } else if (ChangeAnnotationIdentifier.is(annotation)) {
              id = annotation;
              edit = AnnotatedTextEdit.del(range, annotation);
            } else {
              this.assertChangeAnnotations(this.changeAnnotations);
              id = this.changeAnnotations.manage(annotation);
              edit = AnnotatedTextEdit.del(range, id);
            }
            this.edits.push(edit);
            if (id !== void 0) {
              return id;
            }
          };
          TextEditChangeImpl2.prototype.add = function(edit) {
            this.edits.push(edit);
          };
          TextEditChangeImpl2.prototype.all = function() {
            return this.edits;
          };
          TextEditChangeImpl2.prototype.clear = function() {
            this.edits.splice(0, this.edits.length);
          };
          TextEditChangeImpl2.prototype.assertChangeAnnotations = function(value) {
            if (value === void 0) {
              throw new Error("Text edit change is not configured to manage change annotations.");
            }
          };
          return TextEditChangeImpl2;
        })()
      );
      var ChangeAnnotations = (
        /** @class */
        (function() {
          function ChangeAnnotations2(annotations) {
            this._annotations = annotations === void 0 ? /* @__PURE__ */ Object.create(null) : annotations;
            this._counter = 0;
            this._size = 0;
          }
          ChangeAnnotations2.prototype.all = function() {
            return this._annotations;
          };
          Object.defineProperty(ChangeAnnotations2.prototype, "size", {
            get: function() {
              return this._size;
            },
            enumerable: false,
            configurable: true
          });
          ChangeAnnotations2.prototype.manage = function(idOrAnnotation, annotation) {
            var id;
            if (ChangeAnnotationIdentifier.is(idOrAnnotation)) {
              id = idOrAnnotation;
            } else {
              id = this.nextId();
              annotation = idOrAnnotation;
            }
            if (this._annotations[id] !== void 0) {
              throw new Error("Id ".concat(id, " is already in use."));
            }
            if (annotation === void 0) {
              throw new Error("No annotation provided for id ".concat(id));
            }
            this._annotations[id] = annotation;
            this._size++;
            return id;
          };
          ChangeAnnotations2.prototype.nextId = function() {
            this._counter++;
            return this._counter.toString();
          };
          return ChangeAnnotations2;
        })()
      );
      var WorkspaceChange = (
        /** @class */
        (function() {
          function WorkspaceChange2(workspaceEdit) {
            var _this = this;
            this._textEditChanges = /* @__PURE__ */ Object.create(null);
            if (workspaceEdit !== void 0) {
              this._workspaceEdit = workspaceEdit;
              if (workspaceEdit.documentChanges) {
                this._changeAnnotations = new ChangeAnnotations(workspaceEdit.changeAnnotations);
                workspaceEdit.changeAnnotations = this._changeAnnotations.all();
                workspaceEdit.documentChanges.forEach(function(change) {
                  if (TextDocumentEdit.is(change)) {
                    var textEditChange = new TextEditChangeImpl(change.edits, _this._changeAnnotations);
                    _this._textEditChanges[change.textDocument.uri] = textEditChange;
                  }
                });
              } else if (workspaceEdit.changes) {
                Object.keys(workspaceEdit.changes).forEach(function(key2) {
                  var textEditChange = new TextEditChangeImpl(workspaceEdit.changes[key2]);
                  _this._textEditChanges[key2] = textEditChange;
                });
              }
            } else {
              this._workspaceEdit = {};
            }
          }
          Object.defineProperty(WorkspaceChange2.prototype, "edit", {
            /**
             * Returns the underlying {@link WorkspaceEdit} literal
             * use to be returned from a workspace edit operation like rename.
             */
            get: function() {
              this.initDocumentChanges();
              if (this._changeAnnotations !== void 0) {
                if (this._changeAnnotations.size === 0) {
                  this._workspaceEdit.changeAnnotations = void 0;
                } else {
                  this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
                }
              }
              return this._workspaceEdit;
            },
            enumerable: false,
            configurable: true
          });
          WorkspaceChange2.prototype.getTextEditChange = function(key2) {
            if (OptionalVersionedTextDocumentIdentifier.is(key2)) {
              this.initDocumentChanges();
              if (this._workspaceEdit.documentChanges === void 0) {
                throw new Error("Workspace edit is not configured for document changes.");
              }
              var textDocument = { uri: key2.uri, version: key2.version };
              var result = this._textEditChanges[textDocument.uri];
              if (!result) {
                var edits = [];
                var textDocumentEdit = {
                  textDocument,
                  edits
                };
                this._workspaceEdit.documentChanges.push(textDocumentEdit);
                result = new TextEditChangeImpl(edits, this._changeAnnotations);
                this._textEditChanges[textDocument.uri] = result;
              }
              return result;
            } else {
              this.initChanges();
              if (this._workspaceEdit.changes === void 0) {
                throw new Error("Workspace edit is not configured for normal text edit changes.");
              }
              var result = this._textEditChanges[key2];
              if (!result) {
                var edits = [];
                this._workspaceEdit.changes[key2] = edits;
                result = new TextEditChangeImpl(edits);
                this._textEditChanges[key2] = result;
              }
              return result;
            }
          };
          WorkspaceChange2.prototype.initDocumentChanges = function() {
            if (this._workspaceEdit.documentChanges === void 0 && this._workspaceEdit.changes === void 0) {
              this._changeAnnotations = new ChangeAnnotations();
              this._workspaceEdit.documentChanges = [];
              this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
            }
          };
          WorkspaceChange2.prototype.initChanges = function() {
            if (this._workspaceEdit.documentChanges === void 0 && this._workspaceEdit.changes === void 0) {
              this._workspaceEdit.changes = /* @__PURE__ */ Object.create(null);
            }
          };
          WorkspaceChange2.prototype.createFile = function(uri, optionsOrAnnotation, options) {
            this.initDocumentChanges();
            if (this._workspaceEdit.documentChanges === void 0) {
              throw new Error("Workspace edit is not configured for document changes.");
            }
            var annotation;
            if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
              annotation = optionsOrAnnotation;
            } else {
              options = optionsOrAnnotation;
            }
            var operation;
            var id;
            if (annotation === void 0) {
              operation = CreateFile.create(uri, options);
            } else {
              id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
              operation = CreateFile.create(uri, options, id);
            }
            this._workspaceEdit.documentChanges.push(operation);
            if (id !== void 0) {
              return id;
            }
          };
          WorkspaceChange2.prototype.renameFile = function(oldUri, newUri, optionsOrAnnotation, options) {
            this.initDocumentChanges();
            if (this._workspaceEdit.documentChanges === void 0) {
              throw new Error("Workspace edit is not configured for document changes.");
            }
            var annotation;
            if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
              annotation = optionsOrAnnotation;
            } else {
              options = optionsOrAnnotation;
            }
            var operation;
            var id;
            if (annotation === void 0) {
              operation = RenameFile.create(oldUri, newUri, options);
            } else {
              id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
              operation = RenameFile.create(oldUri, newUri, options, id);
            }
            this._workspaceEdit.documentChanges.push(operation);
            if (id !== void 0) {
              return id;
            }
          };
          WorkspaceChange2.prototype.deleteFile = function(uri, optionsOrAnnotation, options) {
            this.initDocumentChanges();
            if (this._workspaceEdit.documentChanges === void 0) {
              throw new Error("Workspace edit is not configured for document changes.");
            }
            var annotation;
            if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
              annotation = optionsOrAnnotation;
            } else {
              options = optionsOrAnnotation;
            }
            var operation;
            var id;
            if (annotation === void 0) {
              operation = DeleteFile.create(uri, options);
            } else {
              id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
              operation = DeleteFile.create(uri, options, id);
            }
            this._workspaceEdit.documentChanges.push(operation);
            if (id !== void 0) {
              return id;
            }
          };
          return WorkspaceChange2;
        })()
      );
      exports3.WorkspaceChange = WorkspaceChange;
      var TextDocumentIdentifier;
      (function(TextDocumentIdentifier2) {
        function create(uri) {
          return { uri };
        }
        TextDocumentIdentifier2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.string(candidate.uri);
        }
        TextDocumentIdentifier2.is = is;
      })(TextDocumentIdentifier || (exports3.TextDocumentIdentifier = TextDocumentIdentifier = {}));
      var VersionedTextDocumentIdentifier;
      (function(VersionedTextDocumentIdentifier2) {
        function create(uri, version) {
          return { uri, version };
        }
        VersionedTextDocumentIdentifier2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.string(candidate.uri) && Is.integer(candidate.version);
        }
        VersionedTextDocumentIdentifier2.is = is;
      })(VersionedTextDocumentIdentifier || (exports3.VersionedTextDocumentIdentifier = VersionedTextDocumentIdentifier = {}));
      var OptionalVersionedTextDocumentIdentifier;
      (function(OptionalVersionedTextDocumentIdentifier2) {
        function create(uri, version) {
          return { uri, version };
        }
        OptionalVersionedTextDocumentIdentifier2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.string(candidate.uri) && (candidate.version === null || Is.integer(candidate.version));
        }
        OptionalVersionedTextDocumentIdentifier2.is = is;
      })(OptionalVersionedTextDocumentIdentifier || (exports3.OptionalVersionedTextDocumentIdentifier = OptionalVersionedTextDocumentIdentifier = {}));
      var TextDocumentItem;
      (function(TextDocumentItem2) {
        function create(uri, languageId, version, text) {
          return { uri, languageId, version, text };
        }
        TextDocumentItem2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.string(candidate.uri) && Is.string(candidate.languageId) && Is.integer(candidate.version) && Is.string(candidate.text);
        }
        TextDocumentItem2.is = is;
      })(TextDocumentItem || (exports3.TextDocumentItem = TextDocumentItem = {}));
      var MarkupKind2;
      (function(MarkupKind3) {
        MarkupKind3.PlainText = "plaintext";
        MarkupKind3.Markdown = "markdown";
        function is(value) {
          var candidate = value;
          return candidate === MarkupKind3.PlainText || candidate === MarkupKind3.Markdown;
        }
        MarkupKind3.is = is;
      })(MarkupKind2 || (exports3.MarkupKind = MarkupKind2 = {}));
      var MarkupContent;
      (function(MarkupContent2) {
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(value) && MarkupKind2.is(candidate.kind) && Is.string(candidate.value);
        }
        MarkupContent2.is = is;
      })(MarkupContent || (exports3.MarkupContent = MarkupContent = {}));
      var CompletionItemKind2;
      (function(CompletionItemKind3) {
        CompletionItemKind3.Text = 1;
        CompletionItemKind3.Method = 2;
        CompletionItemKind3.Function = 3;
        CompletionItemKind3.Constructor = 4;
        CompletionItemKind3.Field = 5;
        CompletionItemKind3.Variable = 6;
        CompletionItemKind3.Class = 7;
        CompletionItemKind3.Interface = 8;
        CompletionItemKind3.Module = 9;
        CompletionItemKind3.Property = 10;
        CompletionItemKind3.Unit = 11;
        CompletionItemKind3.Value = 12;
        CompletionItemKind3.Enum = 13;
        CompletionItemKind3.Keyword = 14;
        CompletionItemKind3.Snippet = 15;
        CompletionItemKind3.Color = 16;
        CompletionItemKind3.File = 17;
        CompletionItemKind3.Reference = 18;
        CompletionItemKind3.Folder = 19;
        CompletionItemKind3.EnumMember = 20;
        CompletionItemKind3.Constant = 21;
        CompletionItemKind3.Struct = 22;
        CompletionItemKind3.Event = 23;
        CompletionItemKind3.Operator = 24;
        CompletionItemKind3.TypeParameter = 25;
      })(CompletionItemKind2 || (exports3.CompletionItemKind = CompletionItemKind2 = {}));
      var InsertTextFormat2;
      (function(InsertTextFormat3) {
        InsertTextFormat3.PlainText = 1;
        InsertTextFormat3.Snippet = 2;
      })(InsertTextFormat2 || (exports3.InsertTextFormat = InsertTextFormat2 = {}));
      var CompletionItemTag;
      (function(CompletionItemTag2) {
        CompletionItemTag2.Deprecated = 1;
      })(CompletionItemTag || (exports3.CompletionItemTag = CompletionItemTag = {}));
      var InsertReplaceEdit;
      (function(InsertReplaceEdit2) {
        function create(newText, insert, replace) {
          return { newText, insert, replace };
        }
        InsertReplaceEdit2.create = create;
        function is(value) {
          var candidate = value;
          return candidate && Is.string(candidate.newText) && Range.is(candidate.insert) && Range.is(candidate.replace);
        }
        InsertReplaceEdit2.is = is;
      })(InsertReplaceEdit || (exports3.InsertReplaceEdit = InsertReplaceEdit = {}));
      var InsertTextMode;
      (function(InsertTextMode2) {
        InsertTextMode2.asIs = 1;
        InsertTextMode2.adjustIndentation = 2;
      })(InsertTextMode || (exports3.InsertTextMode = InsertTextMode = {}));
      var CompletionItemLabelDetails;
      (function(CompletionItemLabelDetails2) {
        function is(value) {
          var candidate = value;
          return candidate && (Is.string(candidate.detail) || candidate.detail === void 0) && (Is.string(candidate.description) || candidate.description === void 0);
        }
        CompletionItemLabelDetails2.is = is;
      })(CompletionItemLabelDetails || (exports3.CompletionItemLabelDetails = CompletionItemLabelDetails = {}));
      var CompletionItem2;
      (function(CompletionItem3) {
        function create(label) {
          return { label };
        }
        CompletionItem3.create = create;
      })(CompletionItem2 || (exports3.CompletionItem = CompletionItem2 = {}));
      var CompletionList;
      (function(CompletionList2) {
        function create(items, isIncomplete) {
          return { items: items ? items : [], isIncomplete: !!isIncomplete };
        }
        CompletionList2.create = create;
      })(CompletionList || (exports3.CompletionList = CompletionList = {}));
      var MarkedString;
      (function(MarkedString2) {
        function fromPlainText(plainText) {
          return plainText.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
        }
        MarkedString2.fromPlainText = fromPlainText;
        function is(value) {
          var candidate = value;
          return Is.string(candidate) || Is.objectLiteral(candidate) && Is.string(candidate.language) && Is.string(candidate.value);
        }
        MarkedString2.is = is;
      })(MarkedString || (exports3.MarkedString = MarkedString = {}));
      var Hover;
      (function(Hover2) {
        function is(value) {
          var candidate = value;
          return !!candidate && Is.objectLiteral(candidate) && (MarkupContent.is(candidate.contents) || MarkedString.is(candidate.contents) || Is.typedArray(candidate.contents, MarkedString.is)) && (value.range === void 0 || Range.is(value.range));
        }
        Hover2.is = is;
      })(Hover || (exports3.Hover = Hover = {}));
      var ParameterInformation;
      (function(ParameterInformation2) {
        function create(label, documentation) {
          return documentation ? { label, documentation } : { label };
        }
        ParameterInformation2.create = create;
      })(ParameterInformation || (exports3.ParameterInformation = ParameterInformation = {}));
      var SignatureInformation;
      (function(SignatureInformation2) {
        function create(label, documentation) {
          var parameters = [];
          for (var _i = 2; _i < arguments.length; _i++) {
            parameters[_i - 2] = arguments[_i];
          }
          var result = { label };
          if (Is.defined(documentation)) {
            result.documentation = documentation;
          }
          if (Is.defined(parameters)) {
            result.parameters = parameters;
          } else {
            result.parameters = [];
          }
          return result;
        }
        SignatureInformation2.create = create;
      })(SignatureInformation || (exports3.SignatureInformation = SignatureInformation = {}));
      var DocumentHighlightKind2;
      (function(DocumentHighlightKind3) {
        DocumentHighlightKind3.Text = 1;
        DocumentHighlightKind3.Read = 2;
        DocumentHighlightKind3.Write = 3;
      })(DocumentHighlightKind2 || (exports3.DocumentHighlightKind = DocumentHighlightKind2 = {}));
      var DocumentHighlight;
      (function(DocumentHighlight2) {
        function create(range, kind) {
          var result = { range };
          if (Is.number(kind)) {
            result.kind = kind;
          }
          return result;
        }
        DocumentHighlight2.create = create;
      })(DocumentHighlight || (exports3.DocumentHighlight = DocumentHighlight = {}));
      var SymbolKind3;
      (function(SymbolKind4) {
        SymbolKind4.File = 1;
        SymbolKind4.Module = 2;
        SymbolKind4.Namespace = 3;
        SymbolKind4.Package = 4;
        SymbolKind4.Class = 5;
        SymbolKind4.Method = 6;
        SymbolKind4.Property = 7;
        SymbolKind4.Field = 8;
        SymbolKind4.Constructor = 9;
        SymbolKind4.Enum = 10;
        SymbolKind4.Interface = 11;
        SymbolKind4.Function = 12;
        SymbolKind4.Variable = 13;
        SymbolKind4.Constant = 14;
        SymbolKind4.String = 15;
        SymbolKind4.Number = 16;
        SymbolKind4.Boolean = 17;
        SymbolKind4.Array = 18;
        SymbolKind4.Object = 19;
        SymbolKind4.Key = 20;
        SymbolKind4.Null = 21;
        SymbolKind4.EnumMember = 22;
        SymbolKind4.Struct = 23;
        SymbolKind4.Event = 24;
        SymbolKind4.Operator = 25;
        SymbolKind4.TypeParameter = 26;
      })(SymbolKind3 || (exports3.SymbolKind = SymbolKind3 = {}));
      var SymbolTag;
      (function(SymbolTag2) {
        SymbolTag2.Deprecated = 1;
      })(SymbolTag || (exports3.SymbolTag = SymbolTag = {}));
      var SymbolInformation;
      (function(SymbolInformation2) {
        function create(name, kind, range, uri, containerName) {
          var result = {
            name,
            kind,
            location: { uri, range }
          };
          if (containerName) {
            result.containerName = containerName;
          }
          return result;
        }
        SymbolInformation2.create = create;
      })(SymbolInformation || (exports3.SymbolInformation = SymbolInformation = {}));
      var WorkspaceSymbol;
      (function(WorkspaceSymbol2) {
        function create(name, kind, uri, range) {
          return range !== void 0 ? { name, kind, location: { uri, range } } : { name, kind, location: { uri } };
        }
        WorkspaceSymbol2.create = create;
      })(WorkspaceSymbol || (exports3.WorkspaceSymbol = WorkspaceSymbol = {}));
      var DocumentSymbol2;
      (function(DocumentSymbol3) {
        function create(name, detail, kind, range, selectionRange, children2) {
          var result = {
            name,
            detail,
            kind,
            range,
            selectionRange
          };
          if (children2 !== void 0) {
            result.children = children2;
          }
          return result;
        }
        DocumentSymbol3.create = create;
        function is(value) {
          var candidate = value;
          return candidate && Is.string(candidate.name) && Is.number(candidate.kind) && Range.is(candidate.range) && Range.is(candidate.selectionRange) && (candidate.detail === void 0 || Is.string(candidate.detail)) && (candidate.deprecated === void 0 || Is.boolean(candidate.deprecated)) && (candidate.children === void 0 || Array.isArray(candidate.children)) && (candidate.tags === void 0 || Array.isArray(candidate.tags));
        }
        DocumentSymbol3.is = is;
      })(DocumentSymbol2 || (exports3.DocumentSymbol = DocumentSymbol2 = {}));
      var CodeActionKind2;
      (function(CodeActionKind3) {
        CodeActionKind3.Empty = "";
        CodeActionKind3.QuickFix = "quickfix";
        CodeActionKind3.Refactor = "refactor";
        CodeActionKind3.RefactorExtract = "refactor.extract";
        CodeActionKind3.RefactorInline = "refactor.inline";
        CodeActionKind3.RefactorRewrite = "refactor.rewrite";
        CodeActionKind3.Source = "source";
        CodeActionKind3.SourceOrganizeImports = "source.organizeImports";
        CodeActionKind3.SourceFixAll = "source.fixAll";
      })(CodeActionKind2 || (exports3.CodeActionKind = CodeActionKind2 = {}));
      var CodeActionTriggerKind;
      (function(CodeActionTriggerKind2) {
        CodeActionTriggerKind2.Invoked = 1;
        CodeActionTriggerKind2.Automatic = 2;
      })(CodeActionTriggerKind || (exports3.CodeActionTriggerKind = CodeActionTriggerKind = {}));
      var CodeActionContext;
      (function(CodeActionContext2) {
        function create(diagnostics, only, triggerKind) {
          var result = { diagnostics };
          if (only !== void 0 && only !== null) {
            result.only = only;
          }
          if (triggerKind !== void 0 && triggerKind !== null) {
            result.triggerKind = triggerKind;
          }
          return result;
        }
        CodeActionContext2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.typedArray(candidate.diagnostics, Diagnostic.is) && (candidate.only === void 0 || Is.typedArray(candidate.only, Is.string)) && (candidate.triggerKind === void 0 || candidate.triggerKind === CodeActionTriggerKind.Invoked || candidate.triggerKind === CodeActionTriggerKind.Automatic);
        }
        CodeActionContext2.is = is;
      })(CodeActionContext || (exports3.CodeActionContext = CodeActionContext = {}));
      var CodeAction;
      (function(CodeAction2) {
        function create(title, kindOrCommandOrEdit, kind) {
          var result = { title };
          var checkKind = true;
          if (typeof kindOrCommandOrEdit === "string") {
            checkKind = false;
            result.kind = kindOrCommandOrEdit;
          } else if (Command.is(kindOrCommandOrEdit)) {
            result.command = kindOrCommandOrEdit;
          } else {
            result.edit = kindOrCommandOrEdit;
          }
          if (checkKind && kind !== void 0) {
            result.kind = kind;
          }
          return result;
        }
        CodeAction2.create = create;
        function is(value) {
          var candidate = value;
          return candidate && Is.string(candidate.title) && (candidate.diagnostics === void 0 || Is.typedArray(candidate.diagnostics, Diagnostic.is)) && (candidate.kind === void 0 || Is.string(candidate.kind)) && (candidate.edit !== void 0 || candidate.command !== void 0) && (candidate.command === void 0 || Command.is(candidate.command)) && (candidate.isPreferred === void 0 || Is.boolean(candidate.isPreferred)) && (candidate.edit === void 0 || WorkspaceEdit.is(candidate.edit));
        }
        CodeAction2.is = is;
      })(CodeAction || (exports3.CodeAction = CodeAction = {}));
      var CodeLens;
      (function(CodeLens2) {
        function create(range, data) {
          var result = { range };
          if (Is.defined(data)) {
            result.data = data;
          }
          return result;
        }
        CodeLens2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.command) || Command.is(candidate.command));
        }
        CodeLens2.is = is;
      })(CodeLens || (exports3.CodeLens = CodeLens = {}));
      var FormattingOptions;
      (function(FormattingOptions2) {
        function create(tabSize, insertSpaces) {
          return { tabSize, insertSpaces };
        }
        FormattingOptions2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.uinteger(candidate.tabSize) && Is.boolean(candidate.insertSpaces);
        }
        FormattingOptions2.is = is;
      })(FormattingOptions || (exports3.FormattingOptions = FormattingOptions = {}));
      var DocumentLink;
      (function(DocumentLink2) {
        function create(range, target, data) {
          return { range, target, data };
        }
        DocumentLink2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.target) || Is.string(candidate.target));
        }
        DocumentLink2.is = is;
      })(DocumentLink || (exports3.DocumentLink = DocumentLink = {}));
      var SelectionRange;
      (function(SelectionRange2) {
        function create(range, parent) {
          return { range, parent };
        }
        SelectionRange2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Range.is(candidate.range) && (candidate.parent === void 0 || SelectionRange2.is(candidate.parent));
        }
        SelectionRange2.is = is;
      })(SelectionRange || (exports3.SelectionRange = SelectionRange = {}));
      var SemanticTokenTypes;
      (function(SemanticTokenTypes2) {
        SemanticTokenTypes2["namespace"] = "namespace";
        SemanticTokenTypes2["type"] = "type";
        SemanticTokenTypes2["class"] = "class";
        SemanticTokenTypes2["enum"] = "enum";
        SemanticTokenTypes2["interface"] = "interface";
        SemanticTokenTypes2["struct"] = "struct";
        SemanticTokenTypes2["typeParameter"] = "typeParameter";
        SemanticTokenTypes2["parameter"] = "parameter";
        SemanticTokenTypes2["variable"] = "variable";
        SemanticTokenTypes2["property"] = "property";
        SemanticTokenTypes2["enumMember"] = "enumMember";
        SemanticTokenTypes2["event"] = "event";
        SemanticTokenTypes2["function"] = "function";
        SemanticTokenTypes2["method"] = "method";
        SemanticTokenTypes2["macro"] = "macro";
        SemanticTokenTypes2["keyword"] = "keyword";
        SemanticTokenTypes2["modifier"] = "modifier";
        SemanticTokenTypes2["comment"] = "comment";
        SemanticTokenTypes2["string"] = "string";
        SemanticTokenTypes2["number"] = "number";
        SemanticTokenTypes2["regexp"] = "regexp";
        SemanticTokenTypes2["operator"] = "operator";
        SemanticTokenTypes2["decorator"] = "decorator";
      })(SemanticTokenTypes || (exports3.SemanticTokenTypes = SemanticTokenTypes = {}));
      var SemanticTokenModifiers;
      (function(SemanticTokenModifiers2) {
        SemanticTokenModifiers2["declaration"] = "declaration";
        SemanticTokenModifiers2["definition"] = "definition";
        SemanticTokenModifiers2["readonly"] = "readonly";
        SemanticTokenModifiers2["static"] = "static";
        SemanticTokenModifiers2["deprecated"] = "deprecated";
        SemanticTokenModifiers2["abstract"] = "abstract";
        SemanticTokenModifiers2["async"] = "async";
        SemanticTokenModifiers2["modification"] = "modification";
        SemanticTokenModifiers2["documentation"] = "documentation";
        SemanticTokenModifiers2["defaultLibrary"] = "defaultLibrary";
      })(SemanticTokenModifiers || (exports3.SemanticTokenModifiers = SemanticTokenModifiers = {}));
      var SemanticTokens;
      (function(SemanticTokens2) {
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && (candidate.resultId === void 0 || typeof candidate.resultId === "string") && Array.isArray(candidate.data) && (candidate.data.length === 0 || typeof candidate.data[0] === "number");
        }
        SemanticTokens2.is = is;
      })(SemanticTokens || (exports3.SemanticTokens = SemanticTokens = {}));
      var InlineValueText;
      (function(InlineValueText2) {
        function create(range, text) {
          return { range, text };
        }
        InlineValueText2.create = create;
        function is(value) {
          var candidate = value;
          return candidate !== void 0 && candidate !== null && Range.is(candidate.range) && Is.string(candidate.text);
        }
        InlineValueText2.is = is;
      })(InlineValueText || (exports3.InlineValueText = InlineValueText = {}));
      var InlineValueVariableLookup;
      (function(InlineValueVariableLookup2) {
        function create(range, variableName, caseSensitiveLookup) {
          return { range, variableName, caseSensitiveLookup };
        }
        InlineValueVariableLookup2.create = create;
        function is(value) {
          var candidate = value;
          return candidate !== void 0 && candidate !== null && Range.is(candidate.range) && Is.boolean(candidate.caseSensitiveLookup) && (Is.string(candidate.variableName) || candidate.variableName === void 0);
        }
        InlineValueVariableLookup2.is = is;
      })(InlineValueVariableLookup || (exports3.InlineValueVariableLookup = InlineValueVariableLookup = {}));
      var InlineValueEvaluatableExpression;
      (function(InlineValueEvaluatableExpression2) {
        function create(range, expression2) {
          return { range, expression: expression2 };
        }
        InlineValueEvaluatableExpression2.create = create;
        function is(value) {
          var candidate = value;
          return candidate !== void 0 && candidate !== null && Range.is(candidate.range) && (Is.string(candidate.expression) || candidate.expression === void 0);
        }
        InlineValueEvaluatableExpression2.is = is;
      })(InlineValueEvaluatableExpression || (exports3.InlineValueEvaluatableExpression = InlineValueEvaluatableExpression = {}));
      var InlineValueContext;
      (function(InlineValueContext2) {
        function create(frameId, stoppedLocation) {
          return { frameId, stoppedLocation };
        }
        InlineValueContext2.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Range.is(value.stoppedLocation);
        }
        InlineValueContext2.is = is;
      })(InlineValueContext || (exports3.InlineValueContext = InlineValueContext = {}));
      var InlayHintKind;
      (function(InlayHintKind2) {
        InlayHintKind2.Type = 1;
        InlayHintKind2.Parameter = 2;
        function is(value) {
          return value === 1 || value === 2;
        }
        InlayHintKind2.is = is;
      })(InlayHintKind || (exports3.InlayHintKind = InlayHintKind = {}));
      var InlayHintLabelPart;
      (function(InlayHintLabelPart2) {
        function create(value) {
          return { value };
        }
        InlayHintLabelPart2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && (candidate.tooltip === void 0 || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip)) && (candidate.location === void 0 || Location.is(candidate.location)) && (candidate.command === void 0 || Command.is(candidate.command));
        }
        InlayHintLabelPart2.is = is;
      })(InlayHintLabelPart || (exports3.InlayHintLabelPart = InlayHintLabelPart = {}));
      var InlayHint;
      (function(InlayHint2) {
        function create(position, label, kind) {
          var result = { position, label };
          if (kind !== void 0) {
            result.kind = kind;
          }
          return result;
        }
        InlayHint2.create = create;
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && Position.is(candidate.position) && (Is.string(candidate.label) || Is.typedArray(candidate.label, InlayHintLabelPart.is)) && (candidate.kind === void 0 || InlayHintKind.is(candidate.kind)) && candidate.textEdits === void 0 || Is.typedArray(candidate.textEdits, TextEdit.is) && (candidate.tooltip === void 0 || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip)) && (candidate.paddingLeft === void 0 || Is.boolean(candidate.paddingLeft)) && (candidate.paddingRight === void 0 || Is.boolean(candidate.paddingRight));
        }
        InlayHint2.is = is;
      })(InlayHint || (exports3.InlayHint = InlayHint = {}));
      var StringValue;
      (function(StringValue2) {
        function createSnippet(value) {
          return { kind: "snippet", value };
        }
        StringValue2.createSnippet = createSnippet;
      })(StringValue || (exports3.StringValue = StringValue = {}));
      var InlineCompletionItem;
      (function(InlineCompletionItem2) {
        function create(insertText, filterText, range, command2) {
          return { insertText, filterText, range, command: command2 };
        }
        InlineCompletionItem2.create = create;
      })(InlineCompletionItem || (exports3.InlineCompletionItem = InlineCompletionItem = {}));
      var InlineCompletionList;
      (function(InlineCompletionList2) {
        function create(items) {
          return { items };
        }
        InlineCompletionList2.create = create;
      })(InlineCompletionList || (exports3.InlineCompletionList = InlineCompletionList = {}));
      var InlineCompletionTriggerKind;
      (function(InlineCompletionTriggerKind2) {
        InlineCompletionTriggerKind2.Invoked = 0;
        InlineCompletionTriggerKind2.Automatic = 1;
      })(InlineCompletionTriggerKind || (exports3.InlineCompletionTriggerKind = InlineCompletionTriggerKind = {}));
      var SelectedCompletionInfo;
      (function(SelectedCompletionInfo2) {
        function create(range, text) {
          return { range, text };
        }
        SelectedCompletionInfo2.create = create;
      })(SelectedCompletionInfo || (exports3.SelectedCompletionInfo = SelectedCompletionInfo = {}));
      var InlineCompletionContext;
      (function(InlineCompletionContext2) {
        function create(triggerKind, selectedCompletionInfo) {
          return { triggerKind, selectedCompletionInfo };
        }
        InlineCompletionContext2.create = create;
      })(InlineCompletionContext || (exports3.InlineCompletionContext = InlineCompletionContext = {}));
      var WorkspaceFolder;
      (function(WorkspaceFolder2) {
        function is(value) {
          var candidate = value;
          return Is.objectLiteral(candidate) && URI.is(candidate.uri) && Is.string(candidate.name);
        }
        WorkspaceFolder2.is = is;
      })(WorkspaceFolder || (exports3.WorkspaceFolder = WorkspaceFolder = {}));
      exports3.EOL = ["\n", "\r\n", "\r"];
      var TextDocument2;
      (function(TextDocument3) {
        function create(uri, languageId, version, content) {
          return new FullTextDocument2(uri, languageId, version, content);
        }
        TextDocument3.create = create;
        function is(value) {
          var candidate = value;
          return Is.defined(candidate) && Is.string(candidate.uri) && (Is.undefined(candidate.languageId) || Is.string(candidate.languageId)) && Is.uinteger(candidate.lineCount) && Is.func(candidate.getText) && Is.func(candidate.positionAt) && Is.func(candidate.offsetAt) ? true : false;
        }
        TextDocument3.is = is;
        function applyEdits3(document, edits) {
          var text = document.getText();
          var sortedEdits = mergeSort2(edits, function(a, b) {
            var diff = a.range.start.line - b.range.start.line;
            if (diff === 0) {
              return a.range.start.character - b.range.start.character;
            }
            return diff;
          });
          var lastModifiedOffset = text.length;
          for (var i = sortedEdits.length - 1; i >= 0; i--) {
            var e = sortedEdits[i];
            var startOffset = document.offsetAt(e.range.start);
            var endOffset = document.offsetAt(e.range.end);
            if (endOffset <= lastModifiedOffset) {
              text = text.substring(0, startOffset) + e.newText + text.substring(endOffset, text.length);
            } else {
              throw new Error("Overlapping edit");
            }
            lastModifiedOffset = startOffset;
          }
          return text;
        }
        TextDocument3.applyEdits = applyEdits3;
        function mergeSort2(data, compare5) {
          if (data.length <= 1) {
            return data;
          }
          var p = data.length / 2 | 0;
          var left = data.slice(0, p);
          var right = data.slice(p);
          mergeSort2(left, compare5);
          mergeSort2(right, compare5);
          var leftIdx = 0;
          var rightIdx = 0;
          var i = 0;
          while (leftIdx < left.length && rightIdx < right.length) {
            var ret = compare5(left[leftIdx], right[rightIdx]);
            if (ret <= 0) {
              data[i++] = left[leftIdx++];
            } else {
              data[i++] = right[rightIdx++];
            }
          }
          while (leftIdx < left.length) {
            data[i++] = left[leftIdx++];
          }
          while (rightIdx < right.length) {
            data[i++] = right[rightIdx++];
          }
          return data;
        }
      })(TextDocument2 || (exports3.TextDocument = TextDocument2 = {}));
      var FullTextDocument2 = (
        /** @class */
        (function() {
          function FullTextDocument3(uri, languageId, version, content) {
            this._uri = uri;
            this._languageId = languageId;
            this._version = version;
            this._content = content;
            this._lineOffsets = void 0;
          }
          Object.defineProperty(FullTextDocument3.prototype, "uri", {
            get: function() {
              return this._uri;
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(FullTextDocument3.prototype, "languageId", {
            get: function() {
              return this._languageId;
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(FullTextDocument3.prototype, "version", {
            get: function() {
              return this._version;
            },
            enumerable: false,
            configurable: true
          });
          FullTextDocument3.prototype.getText = function(range) {
            if (range) {
              var start = this.offsetAt(range.start);
              var end = this.offsetAt(range.end);
              return this._content.substring(start, end);
            }
            return this._content;
          };
          FullTextDocument3.prototype.update = function(event, version) {
            this._content = event.text;
            this._version = version;
            this._lineOffsets = void 0;
          };
          FullTextDocument3.prototype.getLineOffsets = function() {
            if (this._lineOffsets === void 0) {
              var lineOffsets = [];
              var text = this._content;
              var isLineStart = true;
              for (var i = 0; i < text.length; i++) {
                if (isLineStart) {
                  lineOffsets.push(i);
                  isLineStart = false;
                }
                var ch = text.charAt(i);
                isLineStart = ch === "\r" || ch === "\n";
                if (ch === "\r" && i + 1 < text.length && text.charAt(i + 1) === "\n") {
                  i++;
                }
              }
              if (isLineStart && text.length > 0) {
                lineOffsets.push(text.length);
              }
              this._lineOffsets = lineOffsets;
            }
            return this._lineOffsets;
          };
          FullTextDocument3.prototype.positionAt = function(offset) {
            offset = Math.max(Math.min(offset, this._content.length), 0);
            var lineOffsets = this.getLineOffsets();
            var low = 0, high = lineOffsets.length;
            if (high === 0) {
              return Position.create(0, offset);
            }
            while (low < high) {
              var mid = Math.floor((low + high) / 2);
              if (lineOffsets[mid] > offset) {
                high = mid;
              } else {
                low = mid + 1;
              }
            }
            var line = low - 1;
            return Position.create(line, offset - lineOffsets[line]);
          };
          FullTextDocument3.prototype.offsetAt = function(position) {
            var lineOffsets = this.getLineOffsets();
            if (position.line >= lineOffsets.length) {
              return this._content.length;
            } else if (position.line < 0) {
              return 0;
            }
            var lineOffset = lineOffsets[position.line];
            var nextLineOffset = position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : this._content.length;
            return Math.max(Math.min(lineOffset + position.character, nextLineOffset), lineOffset);
          };
          Object.defineProperty(FullTextDocument3.prototype, "lineCount", {
            get: function() {
              return this.getLineOffsets().length;
            },
            enumerable: false,
            configurable: true
          });
          return FullTextDocument3;
        })()
      );
      var Is;
      (function(Is2) {
        var toString = Object.prototype.toString;
        function defined(value) {
          return typeof value !== "undefined";
        }
        Is2.defined = defined;
        function undefined2(value) {
          return typeof value === "undefined";
        }
        Is2.undefined = undefined2;
        function boolean(value) {
          return value === true || value === false;
        }
        Is2.boolean = boolean;
        function string(value) {
          return toString.call(value) === "[object String]";
        }
        Is2.string = string;
        function number(value) {
          return toString.call(value) === "[object Number]";
        }
        Is2.number = number;
        function numberRange(value, min, max) {
          return toString.call(value) === "[object Number]" && min <= value && value <= max;
        }
        Is2.numberRange = numberRange;
        function integer2(value) {
          return toString.call(value) === "[object Number]" && -2147483648 <= value && value <= 2147483647;
        }
        Is2.integer = integer2;
        function uinteger2(value) {
          return toString.call(value) === "[object Number]" && 0 <= value && value <= 2147483647;
        }
        Is2.uinteger = uinteger2;
        function func(value) {
          return toString.call(value) === "[object Function]";
        }
        Is2.func = func;
        function objectLiteral(value) {
          return value !== null && typeof value === "object";
        }
        Is2.objectLiteral = objectLiteral;
        function typedArray(value, check5) {
          return Array.isArray(value) && value.every(check5);
        }
        Is2.typedArray = typedArray;
      })(Is || (Is = {}));
    });
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/messages.js
var require_messages2 = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/messages.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProtocolNotificationType = exports2.ProtocolNotificationType0 = exports2.ProtocolRequestType = exports2.ProtocolRequestType0 = exports2.RegistrationType = exports2.MessageDirection = void 0;
    var vscode_jsonrpc_1 = require_main();
    var MessageDirection;
    (function(MessageDirection2) {
      MessageDirection2["clientToServer"] = "clientToServer";
      MessageDirection2["serverToClient"] = "serverToClient";
      MessageDirection2["both"] = "both";
    })(MessageDirection || (exports2.MessageDirection = MessageDirection = {}));
    var RegistrationType = class {
      constructor(method) {
        this.method = method;
      }
    };
    exports2.RegistrationType = RegistrationType;
    var ProtocolRequestType0 = class extends vscode_jsonrpc_1.RequestType0 {
      constructor(method) {
        super(method);
      }
    };
    exports2.ProtocolRequestType0 = ProtocolRequestType0;
    var ProtocolRequestType = class extends vscode_jsonrpc_1.RequestType {
      constructor(method) {
        super(method, vscode_jsonrpc_1.ParameterStructures.byName);
      }
    };
    exports2.ProtocolRequestType = ProtocolRequestType;
    var ProtocolNotificationType0 = class extends vscode_jsonrpc_1.NotificationType0 {
      constructor(method) {
        super(method);
      }
    };
    exports2.ProtocolNotificationType0 = ProtocolNotificationType0;
    var ProtocolNotificationType = class extends vscode_jsonrpc_1.NotificationType {
      constructor(method) {
        super(method, vscode_jsonrpc_1.ParameterStructures.byName);
      }
    };
    exports2.ProtocolNotificationType = ProtocolNotificationType;
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/utils/is.js
var require_is3 = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/utils/is.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.objectLiteral = exports2.typedArray = exports2.stringArray = exports2.array = exports2.func = exports2.error = exports2.number = exports2.string = exports2.boolean = void 0;
    function boolean(value) {
      return value === true || value === false;
    }
    exports2.boolean = boolean;
    function string(value) {
      return typeof value === "string" || value instanceof String;
    }
    exports2.string = string;
    function number(value) {
      return typeof value === "number" || value instanceof Number;
    }
    exports2.number = number;
    function error(value) {
      return value instanceof Error;
    }
    exports2.error = error;
    function func(value) {
      return typeof value === "function";
    }
    exports2.func = func;
    function array(value) {
      return Array.isArray(value);
    }
    exports2.array = array;
    function stringArray(value) {
      return array(value) && value.every((elem) => string(elem));
    }
    exports2.stringArray = stringArray;
    function typedArray(value, check5) {
      return Array.isArray(value) && value.every(check5);
    }
    exports2.typedArray = typedArray;
    function objectLiteral(value) {
      return value !== null && typeof value === "object";
    }
    exports2.objectLiteral = objectLiteral;
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.implementation.js
var require_protocol_implementation = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.implementation.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ImplementationRequest = void 0;
    var messages_1 = require_messages2();
    var ImplementationRequest;
    (function(ImplementationRequest2) {
      ImplementationRequest2.method = "textDocument/implementation";
      ImplementationRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      ImplementationRequest2.type = new messages_1.ProtocolRequestType(ImplementationRequest2.method);
    })(ImplementationRequest || (exports2.ImplementationRequest = ImplementationRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.typeDefinition.js
var require_protocol_typeDefinition = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.typeDefinition.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TypeDefinitionRequest = void 0;
    var messages_1 = require_messages2();
    var TypeDefinitionRequest;
    (function(TypeDefinitionRequest2) {
      TypeDefinitionRequest2.method = "textDocument/typeDefinition";
      TypeDefinitionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      TypeDefinitionRequest2.type = new messages_1.ProtocolRequestType(TypeDefinitionRequest2.method);
    })(TypeDefinitionRequest || (exports2.TypeDefinitionRequest = TypeDefinitionRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.workspaceFolder.js
var require_protocol_workspaceFolder = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.workspaceFolder.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DidChangeWorkspaceFoldersNotification = exports2.WorkspaceFoldersRequest = void 0;
    var messages_1 = require_messages2();
    var WorkspaceFoldersRequest;
    (function(WorkspaceFoldersRequest2) {
      WorkspaceFoldersRequest2.method = "workspace/workspaceFolders";
      WorkspaceFoldersRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      WorkspaceFoldersRequest2.type = new messages_1.ProtocolRequestType0(WorkspaceFoldersRequest2.method);
    })(WorkspaceFoldersRequest || (exports2.WorkspaceFoldersRequest = WorkspaceFoldersRequest = {}));
    var DidChangeWorkspaceFoldersNotification;
    (function(DidChangeWorkspaceFoldersNotification2) {
      DidChangeWorkspaceFoldersNotification2.method = "workspace/didChangeWorkspaceFolders";
      DidChangeWorkspaceFoldersNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidChangeWorkspaceFoldersNotification2.type = new messages_1.ProtocolNotificationType(DidChangeWorkspaceFoldersNotification2.method);
    })(DidChangeWorkspaceFoldersNotification || (exports2.DidChangeWorkspaceFoldersNotification = DidChangeWorkspaceFoldersNotification = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.configuration.js
var require_protocol_configuration = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.configuration.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConfigurationRequest = void 0;
    var messages_1 = require_messages2();
    var ConfigurationRequest;
    (function(ConfigurationRequest2) {
      ConfigurationRequest2.method = "workspace/configuration";
      ConfigurationRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      ConfigurationRequest2.type = new messages_1.ProtocolRequestType(ConfigurationRequest2.method);
    })(ConfigurationRequest || (exports2.ConfigurationRequest = ConfigurationRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.colorProvider.js
var require_protocol_colorProvider = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.colorProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ColorPresentationRequest = exports2.DocumentColorRequest = void 0;
    var messages_1 = require_messages2();
    var DocumentColorRequest;
    (function(DocumentColorRequest2) {
      DocumentColorRequest2.method = "textDocument/documentColor";
      DocumentColorRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentColorRequest2.type = new messages_1.ProtocolRequestType(DocumentColorRequest2.method);
    })(DocumentColorRequest || (exports2.DocumentColorRequest = DocumentColorRequest = {}));
    var ColorPresentationRequest;
    (function(ColorPresentationRequest2) {
      ColorPresentationRequest2.method = "textDocument/colorPresentation";
      ColorPresentationRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      ColorPresentationRequest2.type = new messages_1.ProtocolRequestType(ColorPresentationRequest2.method);
    })(ColorPresentationRequest || (exports2.ColorPresentationRequest = ColorPresentationRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.foldingRange.js
var require_protocol_foldingRange = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.foldingRange.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FoldingRangeRefreshRequest = exports2.FoldingRangeRequest = void 0;
    var messages_1 = require_messages2();
    var FoldingRangeRequest;
    (function(FoldingRangeRequest2) {
      FoldingRangeRequest2.method = "textDocument/foldingRange";
      FoldingRangeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      FoldingRangeRequest2.type = new messages_1.ProtocolRequestType(FoldingRangeRequest2.method);
    })(FoldingRangeRequest || (exports2.FoldingRangeRequest = FoldingRangeRequest = {}));
    var FoldingRangeRefreshRequest;
    (function(FoldingRangeRefreshRequest2) {
      FoldingRangeRefreshRequest2.method = `workspace/foldingRange/refresh`;
      FoldingRangeRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      FoldingRangeRefreshRequest2.type = new messages_1.ProtocolRequestType0(FoldingRangeRefreshRequest2.method);
    })(FoldingRangeRefreshRequest || (exports2.FoldingRangeRefreshRequest = FoldingRangeRefreshRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.declaration.js
var require_protocol_declaration = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.declaration.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DeclarationRequest = void 0;
    var messages_1 = require_messages2();
    var DeclarationRequest;
    (function(DeclarationRequest2) {
      DeclarationRequest2.method = "textDocument/declaration";
      DeclarationRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DeclarationRequest2.type = new messages_1.ProtocolRequestType(DeclarationRequest2.method);
    })(DeclarationRequest || (exports2.DeclarationRequest = DeclarationRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.selectionRange.js
var require_protocol_selectionRange = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.selectionRange.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SelectionRangeRequest = void 0;
    var messages_1 = require_messages2();
    var SelectionRangeRequest;
    (function(SelectionRangeRequest2) {
      SelectionRangeRequest2.method = "textDocument/selectionRange";
      SelectionRangeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      SelectionRangeRequest2.type = new messages_1.ProtocolRequestType(SelectionRangeRequest2.method);
    })(SelectionRangeRequest || (exports2.SelectionRangeRequest = SelectionRangeRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.progress.js
var require_protocol_progress = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.progress.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WorkDoneProgressCancelNotification = exports2.WorkDoneProgressCreateRequest = exports2.WorkDoneProgress = void 0;
    var vscode_jsonrpc_1 = require_main();
    var messages_1 = require_messages2();
    var WorkDoneProgress;
    (function(WorkDoneProgress2) {
      WorkDoneProgress2.type = new vscode_jsonrpc_1.ProgressType();
      function is(value) {
        return value === WorkDoneProgress2.type;
      }
      WorkDoneProgress2.is = is;
    })(WorkDoneProgress || (exports2.WorkDoneProgress = WorkDoneProgress = {}));
    var WorkDoneProgressCreateRequest;
    (function(WorkDoneProgressCreateRequest2) {
      WorkDoneProgressCreateRequest2.method = "window/workDoneProgress/create";
      WorkDoneProgressCreateRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      WorkDoneProgressCreateRequest2.type = new messages_1.ProtocolRequestType(WorkDoneProgressCreateRequest2.method);
    })(WorkDoneProgressCreateRequest || (exports2.WorkDoneProgressCreateRequest = WorkDoneProgressCreateRequest = {}));
    var WorkDoneProgressCancelNotification;
    (function(WorkDoneProgressCancelNotification2) {
      WorkDoneProgressCancelNotification2.method = "window/workDoneProgress/cancel";
      WorkDoneProgressCancelNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      WorkDoneProgressCancelNotification2.type = new messages_1.ProtocolNotificationType(WorkDoneProgressCancelNotification2.method);
    })(WorkDoneProgressCancelNotification || (exports2.WorkDoneProgressCancelNotification = WorkDoneProgressCancelNotification = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.callHierarchy.js
var require_protocol_callHierarchy = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.callHierarchy.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CallHierarchyOutgoingCallsRequest = exports2.CallHierarchyIncomingCallsRequest = exports2.CallHierarchyPrepareRequest = void 0;
    var messages_1 = require_messages2();
    var CallHierarchyPrepareRequest;
    (function(CallHierarchyPrepareRequest2) {
      CallHierarchyPrepareRequest2.method = "textDocument/prepareCallHierarchy";
      CallHierarchyPrepareRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CallHierarchyPrepareRequest2.type = new messages_1.ProtocolRequestType(CallHierarchyPrepareRequest2.method);
    })(CallHierarchyPrepareRequest || (exports2.CallHierarchyPrepareRequest = CallHierarchyPrepareRequest = {}));
    var CallHierarchyIncomingCallsRequest;
    (function(CallHierarchyIncomingCallsRequest2) {
      CallHierarchyIncomingCallsRequest2.method = "callHierarchy/incomingCalls";
      CallHierarchyIncomingCallsRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CallHierarchyIncomingCallsRequest2.type = new messages_1.ProtocolRequestType(CallHierarchyIncomingCallsRequest2.method);
    })(CallHierarchyIncomingCallsRequest || (exports2.CallHierarchyIncomingCallsRequest = CallHierarchyIncomingCallsRequest = {}));
    var CallHierarchyOutgoingCallsRequest;
    (function(CallHierarchyOutgoingCallsRequest2) {
      CallHierarchyOutgoingCallsRequest2.method = "callHierarchy/outgoingCalls";
      CallHierarchyOutgoingCallsRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CallHierarchyOutgoingCallsRequest2.type = new messages_1.ProtocolRequestType(CallHierarchyOutgoingCallsRequest2.method);
    })(CallHierarchyOutgoingCallsRequest || (exports2.CallHierarchyOutgoingCallsRequest = CallHierarchyOutgoingCallsRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.semanticTokens.js
var require_protocol_semanticTokens = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.semanticTokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SemanticTokensRefreshRequest = exports2.SemanticTokensRangeRequest = exports2.SemanticTokensDeltaRequest = exports2.SemanticTokensRequest = exports2.SemanticTokensRegistrationType = exports2.TokenFormat = void 0;
    var messages_1 = require_messages2();
    var TokenFormat;
    (function(TokenFormat2) {
      TokenFormat2.Relative = "relative";
    })(TokenFormat || (exports2.TokenFormat = TokenFormat = {}));
    var SemanticTokensRegistrationType;
    (function(SemanticTokensRegistrationType2) {
      SemanticTokensRegistrationType2.method = "textDocument/semanticTokens";
      SemanticTokensRegistrationType2.type = new messages_1.RegistrationType(SemanticTokensRegistrationType2.method);
    })(SemanticTokensRegistrationType || (exports2.SemanticTokensRegistrationType = SemanticTokensRegistrationType = {}));
    var SemanticTokensRequest;
    (function(SemanticTokensRequest2) {
      SemanticTokensRequest2.method = "textDocument/semanticTokens/full";
      SemanticTokensRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      SemanticTokensRequest2.type = new messages_1.ProtocolRequestType(SemanticTokensRequest2.method);
      SemanticTokensRequest2.registrationMethod = SemanticTokensRegistrationType.method;
    })(SemanticTokensRequest || (exports2.SemanticTokensRequest = SemanticTokensRequest = {}));
    var SemanticTokensDeltaRequest;
    (function(SemanticTokensDeltaRequest2) {
      SemanticTokensDeltaRequest2.method = "textDocument/semanticTokens/full/delta";
      SemanticTokensDeltaRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      SemanticTokensDeltaRequest2.type = new messages_1.ProtocolRequestType(SemanticTokensDeltaRequest2.method);
      SemanticTokensDeltaRequest2.registrationMethod = SemanticTokensRegistrationType.method;
    })(SemanticTokensDeltaRequest || (exports2.SemanticTokensDeltaRequest = SemanticTokensDeltaRequest = {}));
    var SemanticTokensRangeRequest;
    (function(SemanticTokensRangeRequest2) {
      SemanticTokensRangeRequest2.method = "textDocument/semanticTokens/range";
      SemanticTokensRangeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      SemanticTokensRangeRequest2.type = new messages_1.ProtocolRequestType(SemanticTokensRangeRequest2.method);
      SemanticTokensRangeRequest2.registrationMethod = SemanticTokensRegistrationType.method;
    })(SemanticTokensRangeRequest || (exports2.SemanticTokensRangeRequest = SemanticTokensRangeRequest = {}));
    var SemanticTokensRefreshRequest;
    (function(SemanticTokensRefreshRequest2) {
      SemanticTokensRefreshRequest2.method = `workspace/semanticTokens/refresh`;
      SemanticTokensRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      SemanticTokensRefreshRequest2.type = new messages_1.ProtocolRequestType0(SemanticTokensRefreshRequest2.method);
    })(SemanticTokensRefreshRequest || (exports2.SemanticTokensRefreshRequest = SemanticTokensRefreshRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.showDocument.js
var require_protocol_showDocument = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.showDocument.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ShowDocumentRequest = void 0;
    var messages_1 = require_messages2();
    var ShowDocumentRequest;
    (function(ShowDocumentRequest2) {
      ShowDocumentRequest2.method = "window/showDocument";
      ShowDocumentRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      ShowDocumentRequest2.type = new messages_1.ProtocolRequestType(ShowDocumentRequest2.method);
    })(ShowDocumentRequest || (exports2.ShowDocumentRequest = ShowDocumentRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.linkedEditingRange.js
var require_protocol_linkedEditingRange = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.linkedEditingRange.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LinkedEditingRangeRequest = void 0;
    var messages_1 = require_messages2();
    var LinkedEditingRangeRequest;
    (function(LinkedEditingRangeRequest2) {
      LinkedEditingRangeRequest2.method = "textDocument/linkedEditingRange";
      LinkedEditingRangeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      LinkedEditingRangeRequest2.type = new messages_1.ProtocolRequestType(LinkedEditingRangeRequest2.method);
    })(LinkedEditingRangeRequest || (exports2.LinkedEditingRangeRequest = LinkedEditingRangeRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.fileOperations.js
var require_protocol_fileOperations = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.fileOperations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WillDeleteFilesRequest = exports2.DidDeleteFilesNotification = exports2.DidRenameFilesNotification = exports2.WillRenameFilesRequest = exports2.DidCreateFilesNotification = exports2.WillCreateFilesRequest = exports2.FileOperationPatternKind = void 0;
    var messages_1 = require_messages2();
    var FileOperationPatternKind;
    (function(FileOperationPatternKind2) {
      FileOperationPatternKind2.file = "file";
      FileOperationPatternKind2.folder = "folder";
    })(FileOperationPatternKind || (exports2.FileOperationPatternKind = FileOperationPatternKind = {}));
    var WillCreateFilesRequest;
    (function(WillCreateFilesRequest2) {
      WillCreateFilesRequest2.method = "workspace/willCreateFiles";
      WillCreateFilesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WillCreateFilesRequest2.type = new messages_1.ProtocolRequestType(WillCreateFilesRequest2.method);
    })(WillCreateFilesRequest || (exports2.WillCreateFilesRequest = WillCreateFilesRequest = {}));
    var DidCreateFilesNotification;
    (function(DidCreateFilesNotification2) {
      DidCreateFilesNotification2.method = "workspace/didCreateFiles";
      DidCreateFilesNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidCreateFilesNotification2.type = new messages_1.ProtocolNotificationType(DidCreateFilesNotification2.method);
    })(DidCreateFilesNotification || (exports2.DidCreateFilesNotification = DidCreateFilesNotification = {}));
    var WillRenameFilesRequest;
    (function(WillRenameFilesRequest2) {
      WillRenameFilesRequest2.method = "workspace/willRenameFiles";
      WillRenameFilesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WillRenameFilesRequest2.type = new messages_1.ProtocolRequestType(WillRenameFilesRequest2.method);
    })(WillRenameFilesRequest || (exports2.WillRenameFilesRequest = WillRenameFilesRequest = {}));
    var DidRenameFilesNotification;
    (function(DidRenameFilesNotification2) {
      DidRenameFilesNotification2.method = "workspace/didRenameFiles";
      DidRenameFilesNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidRenameFilesNotification2.type = new messages_1.ProtocolNotificationType(DidRenameFilesNotification2.method);
    })(DidRenameFilesNotification || (exports2.DidRenameFilesNotification = DidRenameFilesNotification = {}));
    var DidDeleteFilesNotification;
    (function(DidDeleteFilesNotification2) {
      DidDeleteFilesNotification2.method = "workspace/didDeleteFiles";
      DidDeleteFilesNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidDeleteFilesNotification2.type = new messages_1.ProtocolNotificationType(DidDeleteFilesNotification2.method);
    })(DidDeleteFilesNotification || (exports2.DidDeleteFilesNotification = DidDeleteFilesNotification = {}));
    var WillDeleteFilesRequest;
    (function(WillDeleteFilesRequest2) {
      WillDeleteFilesRequest2.method = "workspace/willDeleteFiles";
      WillDeleteFilesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WillDeleteFilesRequest2.type = new messages_1.ProtocolRequestType(WillDeleteFilesRequest2.method);
    })(WillDeleteFilesRequest || (exports2.WillDeleteFilesRequest = WillDeleteFilesRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.moniker.js
var require_protocol_moniker = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.moniker.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MonikerRequest = exports2.MonikerKind = exports2.UniquenessLevel = void 0;
    var messages_1 = require_messages2();
    var UniquenessLevel;
    (function(UniquenessLevel2) {
      UniquenessLevel2.document = "document";
      UniquenessLevel2.project = "project";
      UniquenessLevel2.group = "group";
      UniquenessLevel2.scheme = "scheme";
      UniquenessLevel2.global = "global";
    })(UniquenessLevel || (exports2.UniquenessLevel = UniquenessLevel = {}));
    var MonikerKind;
    (function(MonikerKind2) {
      MonikerKind2.$import = "import";
      MonikerKind2.$export = "export";
      MonikerKind2.local = "local";
    })(MonikerKind || (exports2.MonikerKind = MonikerKind = {}));
    var MonikerRequest;
    (function(MonikerRequest2) {
      MonikerRequest2.method = "textDocument/moniker";
      MonikerRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      MonikerRequest2.type = new messages_1.ProtocolRequestType(MonikerRequest2.method);
    })(MonikerRequest || (exports2.MonikerRequest = MonikerRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.typeHierarchy.js
var require_protocol_typeHierarchy = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.typeHierarchy.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TypeHierarchySubtypesRequest = exports2.TypeHierarchySupertypesRequest = exports2.TypeHierarchyPrepareRequest = void 0;
    var messages_1 = require_messages2();
    var TypeHierarchyPrepareRequest;
    (function(TypeHierarchyPrepareRequest2) {
      TypeHierarchyPrepareRequest2.method = "textDocument/prepareTypeHierarchy";
      TypeHierarchyPrepareRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      TypeHierarchyPrepareRequest2.type = new messages_1.ProtocolRequestType(TypeHierarchyPrepareRequest2.method);
    })(TypeHierarchyPrepareRequest || (exports2.TypeHierarchyPrepareRequest = TypeHierarchyPrepareRequest = {}));
    var TypeHierarchySupertypesRequest;
    (function(TypeHierarchySupertypesRequest2) {
      TypeHierarchySupertypesRequest2.method = "typeHierarchy/supertypes";
      TypeHierarchySupertypesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      TypeHierarchySupertypesRequest2.type = new messages_1.ProtocolRequestType(TypeHierarchySupertypesRequest2.method);
    })(TypeHierarchySupertypesRequest || (exports2.TypeHierarchySupertypesRequest = TypeHierarchySupertypesRequest = {}));
    var TypeHierarchySubtypesRequest;
    (function(TypeHierarchySubtypesRequest2) {
      TypeHierarchySubtypesRequest2.method = "typeHierarchy/subtypes";
      TypeHierarchySubtypesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      TypeHierarchySubtypesRequest2.type = new messages_1.ProtocolRequestType(TypeHierarchySubtypesRequest2.method);
    })(TypeHierarchySubtypesRequest || (exports2.TypeHierarchySubtypesRequest = TypeHierarchySubtypesRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.inlineValue.js
var require_protocol_inlineValue = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.inlineValue.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InlineValueRefreshRequest = exports2.InlineValueRequest = void 0;
    var messages_1 = require_messages2();
    var InlineValueRequest;
    (function(InlineValueRequest2) {
      InlineValueRequest2.method = "textDocument/inlineValue";
      InlineValueRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      InlineValueRequest2.type = new messages_1.ProtocolRequestType(InlineValueRequest2.method);
    })(InlineValueRequest || (exports2.InlineValueRequest = InlineValueRequest = {}));
    var InlineValueRefreshRequest;
    (function(InlineValueRefreshRequest2) {
      InlineValueRefreshRequest2.method = `workspace/inlineValue/refresh`;
      InlineValueRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      InlineValueRefreshRequest2.type = new messages_1.ProtocolRequestType0(InlineValueRefreshRequest2.method);
    })(InlineValueRefreshRequest || (exports2.InlineValueRefreshRequest = InlineValueRefreshRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.inlayHint.js
var require_protocol_inlayHint = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.inlayHint.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InlayHintRefreshRequest = exports2.InlayHintResolveRequest = exports2.InlayHintRequest = void 0;
    var messages_1 = require_messages2();
    var InlayHintRequest;
    (function(InlayHintRequest2) {
      InlayHintRequest2.method = "textDocument/inlayHint";
      InlayHintRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      InlayHintRequest2.type = new messages_1.ProtocolRequestType(InlayHintRequest2.method);
    })(InlayHintRequest || (exports2.InlayHintRequest = InlayHintRequest = {}));
    var InlayHintResolveRequest;
    (function(InlayHintResolveRequest2) {
      InlayHintResolveRequest2.method = "inlayHint/resolve";
      InlayHintResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      InlayHintResolveRequest2.type = new messages_1.ProtocolRequestType(InlayHintResolveRequest2.method);
    })(InlayHintResolveRequest || (exports2.InlayHintResolveRequest = InlayHintResolveRequest = {}));
    var InlayHintRefreshRequest;
    (function(InlayHintRefreshRequest2) {
      InlayHintRefreshRequest2.method = `workspace/inlayHint/refresh`;
      InlayHintRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      InlayHintRefreshRequest2.type = new messages_1.ProtocolRequestType0(InlayHintRefreshRequest2.method);
    })(InlayHintRefreshRequest || (exports2.InlayHintRefreshRequest = InlayHintRefreshRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.diagnostic.js
var require_protocol_diagnostic = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.diagnostic.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DiagnosticRefreshRequest = exports2.WorkspaceDiagnosticRequest = exports2.DocumentDiagnosticRequest = exports2.DocumentDiagnosticReportKind = exports2.DiagnosticServerCancellationData = void 0;
    var vscode_jsonrpc_1 = require_main();
    var Is = require_is3();
    var messages_1 = require_messages2();
    var DiagnosticServerCancellationData;
    (function(DiagnosticServerCancellationData2) {
      function is(value) {
        const candidate = value;
        return candidate && Is.boolean(candidate.retriggerRequest);
      }
      DiagnosticServerCancellationData2.is = is;
    })(DiagnosticServerCancellationData || (exports2.DiagnosticServerCancellationData = DiagnosticServerCancellationData = {}));
    var DocumentDiagnosticReportKind;
    (function(DocumentDiagnosticReportKind2) {
      DocumentDiagnosticReportKind2.Full = "full";
      DocumentDiagnosticReportKind2.Unchanged = "unchanged";
    })(DocumentDiagnosticReportKind || (exports2.DocumentDiagnosticReportKind = DocumentDiagnosticReportKind = {}));
    var DocumentDiagnosticRequest;
    (function(DocumentDiagnosticRequest2) {
      DocumentDiagnosticRequest2.method = "textDocument/diagnostic";
      DocumentDiagnosticRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentDiagnosticRequest2.type = new messages_1.ProtocolRequestType(DocumentDiagnosticRequest2.method);
      DocumentDiagnosticRequest2.partialResult = new vscode_jsonrpc_1.ProgressType();
    })(DocumentDiagnosticRequest || (exports2.DocumentDiagnosticRequest = DocumentDiagnosticRequest = {}));
    var WorkspaceDiagnosticRequest;
    (function(WorkspaceDiagnosticRequest2) {
      WorkspaceDiagnosticRequest2.method = "workspace/diagnostic";
      WorkspaceDiagnosticRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WorkspaceDiagnosticRequest2.type = new messages_1.ProtocolRequestType(WorkspaceDiagnosticRequest2.method);
      WorkspaceDiagnosticRequest2.partialResult = new vscode_jsonrpc_1.ProgressType();
    })(WorkspaceDiagnosticRequest || (exports2.WorkspaceDiagnosticRequest = WorkspaceDiagnosticRequest = {}));
    var DiagnosticRefreshRequest;
    (function(DiagnosticRefreshRequest2) {
      DiagnosticRefreshRequest2.method = `workspace/diagnostic/refresh`;
      DiagnosticRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      DiagnosticRefreshRequest2.type = new messages_1.ProtocolRequestType0(DiagnosticRefreshRequest2.method);
    })(DiagnosticRefreshRequest || (exports2.DiagnosticRefreshRequest = DiagnosticRefreshRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.notebook.js
var require_protocol_notebook = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.notebook.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DidCloseNotebookDocumentNotification = exports2.DidSaveNotebookDocumentNotification = exports2.DidChangeNotebookDocumentNotification = exports2.NotebookCellArrayChange = exports2.DidOpenNotebookDocumentNotification = exports2.NotebookDocumentSyncRegistrationType = exports2.NotebookDocument = exports2.NotebookCell = exports2.ExecutionSummary = exports2.NotebookCellKind = void 0;
    var vscode_languageserver_types_1 = require_main2();
    var Is = require_is3();
    var messages_1 = require_messages2();
    var NotebookCellKind;
    (function(NotebookCellKind2) {
      NotebookCellKind2.Markup = 1;
      NotebookCellKind2.Code = 2;
      function is(value) {
        return value === 1 || value === 2;
      }
      NotebookCellKind2.is = is;
    })(NotebookCellKind || (exports2.NotebookCellKind = NotebookCellKind = {}));
    var ExecutionSummary;
    (function(ExecutionSummary2) {
      function create(executionOrder, success) {
        const result = { executionOrder };
        if (success === true || success === false) {
          result.success = success;
        }
        return result;
      }
      ExecutionSummary2.create = create;
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && vscode_languageserver_types_1.uinteger.is(candidate.executionOrder) && (candidate.success === void 0 || Is.boolean(candidate.success));
      }
      ExecutionSummary2.is = is;
      function equals(one, other) {
        if (one === other) {
          return true;
        }
        if (one === null || one === void 0 || other === null || other === void 0) {
          return false;
        }
        return one.executionOrder === other.executionOrder && one.success === other.success;
      }
      ExecutionSummary2.equals = equals;
    })(ExecutionSummary || (exports2.ExecutionSummary = ExecutionSummary = {}));
    var NotebookCell;
    (function(NotebookCell2) {
      function create(kind, document) {
        return { kind, document };
      }
      NotebookCell2.create = create;
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && NotebookCellKind.is(candidate.kind) && vscode_languageserver_types_1.DocumentUri.is(candidate.document) && (candidate.metadata === void 0 || Is.objectLiteral(candidate.metadata));
      }
      NotebookCell2.is = is;
      function diff(one, two) {
        const result = /* @__PURE__ */ new Set();
        if (one.document !== two.document) {
          result.add("document");
        }
        if (one.kind !== two.kind) {
          result.add("kind");
        }
        if (one.executionSummary !== two.executionSummary) {
          result.add("executionSummary");
        }
        if ((one.metadata !== void 0 || two.metadata !== void 0) && !equalsMetadata(one.metadata, two.metadata)) {
          result.add("metadata");
        }
        if ((one.executionSummary !== void 0 || two.executionSummary !== void 0) && !ExecutionSummary.equals(one.executionSummary, two.executionSummary)) {
          result.add("executionSummary");
        }
        return result;
      }
      NotebookCell2.diff = diff;
      function equalsMetadata(one, other) {
        if (one === other) {
          return true;
        }
        if (one === null || one === void 0 || other === null || other === void 0) {
          return false;
        }
        if (typeof one !== typeof other) {
          return false;
        }
        if (typeof one !== "object") {
          return false;
        }
        const oneArray = Array.isArray(one);
        const otherArray = Array.isArray(other);
        if (oneArray !== otherArray) {
          return false;
        }
        if (oneArray && otherArray) {
          if (one.length !== other.length) {
            return false;
          }
          for (let i = 0; i < one.length; i++) {
            if (!equalsMetadata(one[i], other[i])) {
              return false;
            }
          }
        }
        if (Is.objectLiteral(one) && Is.objectLiteral(other)) {
          const oneKeys = Object.keys(one);
          const otherKeys = Object.keys(other);
          if (oneKeys.length !== otherKeys.length) {
            return false;
          }
          oneKeys.sort();
          otherKeys.sort();
          if (!equalsMetadata(oneKeys, otherKeys)) {
            return false;
          }
          for (let i = 0; i < oneKeys.length; i++) {
            const prop = oneKeys[i];
            if (!equalsMetadata(one[prop], other[prop])) {
              return false;
            }
          }
        }
        return true;
      }
    })(NotebookCell || (exports2.NotebookCell = NotebookCell = {}));
    var NotebookDocument;
    (function(NotebookDocument2) {
      function create(uri, notebookType, version, cells) {
        return { uri, notebookType, version, cells };
      }
      NotebookDocument2.create = create;
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && Is.string(candidate.uri) && vscode_languageserver_types_1.integer.is(candidate.version) && Is.typedArray(candidate.cells, NotebookCell.is);
      }
      NotebookDocument2.is = is;
    })(NotebookDocument || (exports2.NotebookDocument = NotebookDocument = {}));
    var NotebookDocumentSyncRegistrationType;
    (function(NotebookDocumentSyncRegistrationType2) {
      NotebookDocumentSyncRegistrationType2.method = "notebookDocument/sync";
      NotebookDocumentSyncRegistrationType2.messageDirection = messages_1.MessageDirection.clientToServer;
      NotebookDocumentSyncRegistrationType2.type = new messages_1.RegistrationType(NotebookDocumentSyncRegistrationType2.method);
    })(NotebookDocumentSyncRegistrationType || (exports2.NotebookDocumentSyncRegistrationType = NotebookDocumentSyncRegistrationType = {}));
    var DidOpenNotebookDocumentNotification;
    (function(DidOpenNotebookDocumentNotification2) {
      DidOpenNotebookDocumentNotification2.method = "notebookDocument/didOpen";
      DidOpenNotebookDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidOpenNotebookDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidOpenNotebookDocumentNotification2.method);
      DidOpenNotebookDocumentNotification2.registrationMethod = NotebookDocumentSyncRegistrationType.method;
    })(DidOpenNotebookDocumentNotification || (exports2.DidOpenNotebookDocumentNotification = DidOpenNotebookDocumentNotification = {}));
    var NotebookCellArrayChange;
    (function(NotebookCellArrayChange2) {
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && vscode_languageserver_types_1.uinteger.is(candidate.start) && vscode_languageserver_types_1.uinteger.is(candidate.deleteCount) && (candidate.cells === void 0 || Is.typedArray(candidate.cells, NotebookCell.is));
      }
      NotebookCellArrayChange2.is = is;
      function create(start, deleteCount, cells) {
        const result = { start, deleteCount };
        if (cells !== void 0) {
          result.cells = cells;
        }
        return result;
      }
      NotebookCellArrayChange2.create = create;
    })(NotebookCellArrayChange || (exports2.NotebookCellArrayChange = NotebookCellArrayChange = {}));
    var DidChangeNotebookDocumentNotification;
    (function(DidChangeNotebookDocumentNotification2) {
      DidChangeNotebookDocumentNotification2.method = "notebookDocument/didChange";
      DidChangeNotebookDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidChangeNotebookDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidChangeNotebookDocumentNotification2.method);
      DidChangeNotebookDocumentNotification2.registrationMethod = NotebookDocumentSyncRegistrationType.method;
    })(DidChangeNotebookDocumentNotification || (exports2.DidChangeNotebookDocumentNotification = DidChangeNotebookDocumentNotification = {}));
    var DidSaveNotebookDocumentNotification;
    (function(DidSaveNotebookDocumentNotification2) {
      DidSaveNotebookDocumentNotification2.method = "notebookDocument/didSave";
      DidSaveNotebookDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidSaveNotebookDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidSaveNotebookDocumentNotification2.method);
      DidSaveNotebookDocumentNotification2.registrationMethod = NotebookDocumentSyncRegistrationType.method;
    })(DidSaveNotebookDocumentNotification || (exports2.DidSaveNotebookDocumentNotification = DidSaveNotebookDocumentNotification = {}));
    var DidCloseNotebookDocumentNotification;
    (function(DidCloseNotebookDocumentNotification2) {
      DidCloseNotebookDocumentNotification2.method = "notebookDocument/didClose";
      DidCloseNotebookDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidCloseNotebookDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidCloseNotebookDocumentNotification2.method);
      DidCloseNotebookDocumentNotification2.registrationMethod = NotebookDocumentSyncRegistrationType.method;
    })(DidCloseNotebookDocumentNotification || (exports2.DidCloseNotebookDocumentNotification = DidCloseNotebookDocumentNotification = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.inlineCompletion.js
var require_protocol_inlineCompletion = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.inlineCompletion.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InlineCompletionRequest = void 0;
    var messages_1 = require_messages2();
    var InlineCompletionRequest;
    (function(InlineCompletionRequest2) {
      InlineCompletionRequest2.method = "textDocument/inlineCompletion";
      InlineCompletionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      InlineCompletionRequest2.type = new messages_1.ProtocolRequestType(InlineCompletionRequest2.method);
    })(InlineCompletionRequest || (exports2.InlineCompletionRequest = InlineCompletionRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/protocol.js
var require_protocol = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/protocol.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WorkspaceSymbolRequest = exports2.CodeActionResolveRequest = exports2.CodeActionRequest = exports2.DocumentSymbolRequest = exports2.DocumentHighlightRequest = exports2.ReferencesRequest = exports2.DefinitionRequest = exports2.SignatureHelpRequest = exports2.SignatureHelpTriggerKind = exports2.HoverRequest = exports2.CompletionResolveRequest = exports2.CompletionRequest = exports2.CompletionTriggerKind = exports2.PublishDiagnosticsNotification = exports2.WatchKind = exports2.RelativePattern = exports2.FileChangeType = exports2.DidChangeWatchedFilesNotification = exports2.WillSaveTextDocumentWaitUntilRequest = exports2.WillSaveTextDocumentNotification = exports2.TextDocumentSaveReason = exports2.DidSaveTextDocumentNotification = exports2.DidCloseTextDocumentNotification = exports2.DidChangeTextDocumentNotification = exports2.TextDocumentContentChangeEvent = exports2.DidOpenTextDocumentNotification = exports2.TextDocumentSyncKind = exports2.TelemetryEventNotification = exports2.LogMessageNotification = exports2.ShowMessageRequest = exports2.ShowMessageNotification = exports2.MessageType = exports2.DidChangeConfigurationNotification = exports2.ExitNotification = exports2.ShutdownRequest = exports2.InitializedNotification = exports2.InitializeErrorCodes = exports2.InitializeRequest = exports2.WorkDoneProgressOptions = exports2.TextDocumentRegistrationOptions = exports2.StaticRegistrationOptions = exports2.PositionEncodingKind = exports2.FailureHandlingKind = exports2.ResourceOperationKind = exports2.UnregistrationRequest = exports2.RegistrationRequest = exports2.DocumentSelector = exports2.NotebookCellTextDocumentFilter = exports2.NotebookDocumentFilter = exports2.TextDocumentFilter = void 0;
    exports2.MonikerRequest = exports2.MonikerKind = exports2.UniquenessLevel = exports2.WillDeleteFilesRequest = exports2.DidDeleteFilesNotification = exports2.WillRenameFilesRequest = exports2.DidRenameFilesNotification = exports2.WillCreateFilesRequest = exports2.DidCreateFilesNotification = exports2.FileOperationPatternKind = exports2.LinkedEditingRangeRequest = exports2.ShowDocumentRequest = exports2.SemanticTokensRegistrationType = exports2.SemanticTokensRefreshRequest = exports2.SemanticTokensRangeRequest = exports2.SemanticTokensDeltaRequest = exports2.SemanticTokensRequest = exports2.TokenFormat = exports2.CallHierarchyPrepareRequest = exports2.CallHierarchyOutgoingCallsRequest = exports2.CallHierarchyIncomingCallsRequest = exports2.WorkDoneProgressCancelNotification = exports2.WorkDoneProgressCreateRequest = exports2.WorkDoneProgress = exports2.SelectionRangeRequest = exports2.DeclarationRequest = exports2.FoldingRangeRefreshRequest = exports2.FoldingRangeRequest = exports2.ColorPresentationRequest = exports2.DocumentColorRequest = exports2.ConfigurationRequest = exports2.DidChangeWorkspaceFoldersNotification = exports2.WorkspaceFoldersRequest = exports2.TypeDefinitionRequest = exports2.ImplementationRequest = exports2.ApplyWorkspaceEditRequest = exports2.ExecuteCommandRequest = exports2.PrepareRenameRequest = exports2.RenameRequest = exports2.PrepareSupportDefaultBehavior = exports2.DocumentOnTypeFormattingRequest = exports2.DocumentRangesFormattingRequest = exports2.DocumentRangeFormattingRequest = exports2.DocumentFormattingRequest = exports2.DocumentLinkResolveRequest = exports2.DocumentLinkRequest = exports2.CodeLensRefreshRequest = exports2.CodeLensResolveRequest = exports2.CodeLensRequest = exports2.WorkspaceSymbolResolveRequest = void 0;
    exports2.InlineCompletionRequest = exports2.DidCloseNotebookDocumentNotification = exports2.DidSaveNotebookDocumentNotification = exports2.DidChangeNotebookDocumentNotification = exports2.NotebookCellArrayChange = exports2.DidOpenNotebookDocumentNotification = exports2.NotebookDocumentSyncRegistrationType = exports2.NotebookDocument = exports2.NotebookCell = exports2.ExecutionSummary = exports2.NotebookCellKind = exports2.DiagnosticRefreshRequest = exports2.WorkspaceDiagnosticRequest = exports2.DocumentDiagnosticRequest = exports2.DocumentDiagnosticReportKind = exports2.DiagnosticServerCancellationData = exports2.InlayHintRefreshRequest = exports2.InlayHintResolveRequest = exports2.InlayHintRequest = exports2.InlineValueRefreshRequest = exports2.InlineValueRequest = exports2.TypeHierarchySupertypesRequest = exports2.TypeHierarchySubtypesRequest = exports2.TypeHierarchyPrepareRequest = void 0;
    var messages_1 = require_messages2();
    var vscode_languageserver_types_1 = require_main2();
    var Is = require_is3();
    var protocol_implementation_1 = require_protocol_implementation();
    Object.defineProperty(exports2, "ImplementationRequest", { enumerable: true, get: function() {
      return protocol_implementation_1.ImplementationRequest;
    } });
    var protocol_typeDefinition_1 = require_protocol_typeDefinition();
    Object.defineProperty(exports2, "TypeDefinitionRequest", { enumerable: true, get: function() {
      return protocol_typeDefinition_1.TypeDefinitionRequest;
    } });
    var protocol_workspaceFolder_1 = require_protocol_workspaceFolder();
    Object.defineProperty(exports2, "WorkspaceFoldersRequest", { enumerable: true, get: function() {
      return protocol_workspaceFolder_1.WorkspaceFoldersRequest;
    } });
    Object.defineProperty(exports2, "DidChangeWorkspaceFoldersNotification", { enumerable: true, get: function() {
      return protocol_workspaceFolder_1.DidChangeWorkspaceFoldersNotification;
    } });
    var protocol_configuration_1 = require_protocol_configuration();
    Object.defineProperty(exports2, "ConfigurationRequest", { enumerable: true, get: function() {
      return protocol_configuration_1.ConfigurationRequest;
    } });
    var protocol_colorProvider_1 = require_protocol_colorProvider();
    Object.defineProperty(exports2, "DocumentColorRequest", { enumerable: true, get: function() {
      return protocol_colorProvider_1.DocumentColorRequest;
    } });
    Object.defineProperty(exports2, "ColorPresentationRequest", { enumerable: true, get: function() {
      return protocol_colorProvider_1.ColorPresentationRequest;
    } });
    var protocol_foldingRange_1 = require_protocol_foldingRange();
    Object.defineProperty(exports2, "FoldingRangeRequest", { enumerable: true, get: function() {
      return protocol_foldingRange_1.FoldingRangeRequest;
    } });
    Object.defineProperty(exports2, "FoldingRangeRefreshRequest", { enumerable: true, get: function() {
      return protocol_foldingRange_1.FoldingRangeRefreshRequest;
    } });
    var protocol_declaration_1 = require_protocol_declaration();
    Object.defineProperty(exports2, "DeclarationRequest", { enumerable: true, get: function() {
      return protocol_declaration_1.DeclarationRequest;
    } });
    var protocol_selectionRange_1 = require_protocol_selectionRange();
    Object.defineProperty(exports2, "SelectionRangeRequest", { enumerable: true, get: function() {
      return protocol_selectionRange_1.SelectionRangeRequest;
    } });
    var protocol_progress_1 = require_protocol_progress();
    Object.defineProperty(exports2, "WorkDoneProgress", { enumerable: true, get: function() {
      return protocol_progress_1.WorkDoneProgress;
    } });
    Object.defineProperty(exports2, "WorkDoneProgressCreateRequest", { enumerable: true, get: function() {
      return protocol_progress_1.WorkDoneProgressCreateRequest;
    } });
    Object.defineProperty(exports2, "WorkDoneProgressCancelNotification", { enumerable: true, get: function() {
      return protocol_progress_1.WorkDoneProgressCancelNotification;
    } });
    var protocol_callHierarchy_1 = require_protocol_callHierarchy();
    Object.defineProperty(exports2, "CallHierarchyIncomingCallsRequest", { enumerable: true, get: function() {
      return protocol_callHierarchy_1.CallHierarchyIncomingCallsRequest;
    } });
    Object.defineProperty(exports2, "CallHierarchyOutgoingCallsRequest", { enumerable: true, get: function() {
      return protocol_callHierarchy_1.CallHierarchyOutgoingCallsRequest;
    } });
    Object.defineProperty(exports2, "CallHierarchyPrepareRequest", { enumerable: true, get: function() {
      return protocol_callHierarchy_1.CallHierarchyPrepareRequest;
    } });
    var protocol_semanticTokens_1 = require_protocol_semanticTokens();
    Object.defineProperty(exports2, "TokenFormat", { enumerable: true, get: function() {
      return protocol_semanticTokens_1.TokenFormat;
    } });
    Object.defineProperty(exports2, "SemanticTokensRequest", { enumerable: true, get: function() {
      return protocol_semanticTokens_1.SemanticTokensRequest;
    } });
    Object.defineProperty(exports2, "SemanticTokensDeltaRequest", { enumerable: true, get: function() {
      return protocol_semanticTokens_1.SemanticTokensDeltaRequest;
    } });
    Object.defineProperty(exports2, "SemanticTokensRangeRequest", { enumerable: true, get: function() {
      return protocol_semanticTokens_1.SemanticTokensRangeRequest;
    } });
    Object.defineProperty(exports2, "SemanticTokensRefreshRequest", { enumerable: true, get: function() {
      return protocol_semanticTokens_1.SemanticTokensRefreshRequest;
    } });
    Object.defineProperty(exports2, "SemanticTokensRegistrationType", { enumerable: true, get: function() {
      return protocol_semanticTokens_1.SemanticTokensRegistrationType;
    } });
    var protocol_showDocument_1 = require_protocol_showDocument();
    Object.defineProperty(exports2, "ShowDocumentRequest", { enumerable: true, get: function() {
      return protocol_showDocument_1.ShowDocumentRequest;
    } });
    var protocol_linkedEditingRange_1 = require_protocol_linkedEditingRange();
    Object.defineProperty(exports2, "LinkedEditingRangeRequest", { enumerable: true, get: function() {
      return protocol_linkedEditingRange_1.LinkedEditingRangeRequest;
    } });
    var protocol_fileOperations_1 = require_protocol_fileOperations();
    Object.defineProperty(exports2, "FileOperationPatternKind", { enumerable: true, get: function() {
      return protocol_fileOperations_1.FileOperationPatternKind;
    } });
    Object.defineProperty(exports2, "DidCreateFilesNotification", { enumerable: true, get: function() {
      return protocol_fileOperations_1.DidCreateFilesNotification;
    } });
    Object.defineProperty(exports2, "WillCreateFilesRequest", { enumerable: true, get: function() {
      return protocol_fileOperations_1.WillCreateFilesRequest;
    } });
    Object.defineProperty(exports2, "DidRenameFilesNotification", { enumerable: true, get: function() {
      return protocol_fileOperations_1.DidRenameFilesNotification;
    } });
    Object.defineProperty(exports2, "WillRenameFilesRequest", { enumerable: true, get: function() {
      return protocol_fileOperations_1.WillRenameFilesRequest;
    } });
    Object.defineProperty(exports2, "DidDeleteFilesNotification", { enumerable: true, get: function() {
      return protocol_fileOperations_1.DidDeleteFilesNotification;
    } });
    Object.defineProperty(exports2, "WillDeleteFilesRequest", { enumerable: true, get: function() {
      return protocol_fileOperations_1.WillDeleteFilesRequest;
    } });
    var protocol_moniker_1 = require_protocol_moniker();
    Object.defineProperty(exports2, "UniquenessLevel", { enumerable: true, get: function() {
      return protocol_moniker_1.UniquenessLevel;
    } });
    Object.defineProperty(exports2, "MonikerKind", { enumerable: true, get: function() {
      return protocol_moniker_1.MonikerKind;
    } });
    Object.defineProperty(exports2, "MonikerRequest", { enumerable: true, get: function() {
      return protocol_moniker_1.MonikerRequest;
    } });
    var protocol_typeHierarchy_1 = require_protocol_typeHierarchy();
    Object.defineProperty(exports2, "TypeHierarchyPrepareRequest", { enumerable: true, get: function() {
      return protocol_typeHierarchy_1.TypeHierarchyPrepareRequest;
    } });
    Object.defineProperty(exports2, "TypeHierarchySubtypesRequest", { enumerable: true, get: function() {
      return protocol_typeHierarchy_1.TypeHierarchySubtypesRequest;
    } });
    Object.defineProperty(exports2, "TypeHierarchySupertypesRequest", { enumerable: true, get: function() {
      return protocol_typeHierarchy_1.TypeHierarchySupertypesRequest;
    } });
    var protocol_inlineValue_1 = require_protocol_inlineValue();
    Object.defineProperty(exports2, "InlineValueRequest", { enumerable: true, get: function() {
      return protocol_inlineValue_1.InlineValueRequest;
    } });
    Object.defineProperty(exports2, "InlineValueRefreshRequest", { enumerable: true, get: function() {
      return protocol_inlineValue_1.InlineValueRefreshRequest;
    } });
    var protocol_inlayHint_1 = require_protocol_inlayHint();
    Object.defineProperty(exports2, "InlayHintRequest", { enumerable: true, get: function() {
      return protocol_inlayHint_1.InlayHintRequest;
    } });
    Object.defineProperty(exports2, "InlayHintResolveRequest", { enumerable: true, get: function() {
      return protocol_inlayHint_1.InlayHintResolveRequest;
    } });
    Object.defineProperty(exports2, "InlayHintRefreshRequest", { enumerable: true, get: function() {
      return protocol_inlayHint_1.InlayHintRefreshRequest;
    } });
    var protocol_diagnostic_1 = require_protocol_diagnostic();
    Object.defineProperty(exports2, "DiagnosticServerCancellationData", { enumerable: true, get: function() {
      return protocol_diagnostic_1.DiagnosticServerCancellationData;
    } });
    Object.defineProperty(exports2, "DocumentDiagnosticReportKind", { enumerable: true, get: function() {
      return protocol_diagnostic_1.DocumentDiagnosticReportKind;
    } });
    Object.defineProperty(exports2, "DocumentDiagnosticRequest", { enumerable: true, get: function() {
      return protocol_diagnostic_1.DocumentDiagnosticRequest;
    } });
    Object.defineProperty(exports2, "WorkspaceDiagnosticRequest", { enumerable: true, get: function() {
      return protocol_diagnostic_1.WorkspaceDiagnosticRequest;
    } });
    Object.defineProperty(exports2, "DiagnosticRefreshRequest", { enumerable: true, get: function() {
      return protocol_diagnostic_1.DiagnosticRefreshRequest;
    } });
    var protocol_notebook_1 = require_protocol_notebook();
    Object.defineProperty(exports2, "NotebookCellKind", { enumerable: true, get: function() {
      return protocol_notebook_1.NotebookCellKind;
    } });
    Object.defineProperty(exports2, "ExecutionSummary", { enumerable: true, get: function() {
      return protocol_notebook_1.ExecutionSummary;
    } });
    Object.defineProperty(exports2, "NotebookCell", { enumerable: true, get: function() {
      return protocol_notebook_1.NotebookCell;
    } });
    Object.defineProperty(exports2, "NotebookDocument", { enumerable: true, get: function() {
      return protocol_notebook_1.NotebookDocument;
    } });
    Object.defineProperty(exports2, "NotebookDocumentSyncRegistrationType", { enumerable: true, get: function() {
      return protocol_notebook_1.NotebookDocumentSyncRegistrationType;
    } });
    Object.defineProperty(exports2, "DidOpenNotebookDocumentNotification", { enumerable: true, get: function() {
      return protocol_notebook_1.DidOpenNotebookDocumentNotification;
    } });
    Object.defineProperty(exports2, "NotebookCellArrayChange", { enumerable: true, get: function() {
      return protocol_notebook_1.NotebookCellArrayChange;
    } });
    Object.defineProperty(exports2, "DidChangeNotebookDocumentNotification", { enumerable: true, get: function() {
      return protocol_notebook_1.DidChangeNotebookDocumentNotification;
    } });
    Object.defineProperty(exports2, "DidSaveNotebookDocumentNotification", { enumerable: true, get: function() {
      return protocol_notebook_1.DidSaveNotebookDocumentNotification;
    } });
    Object.defineProperty(exports2, "DidCloseNotebookDocumentNotification", { enumerable: true, get: function() {
      return protocol_notebook_1.DidCloseNotebookDocumentNotification;
    } });
    var protocol_inlineCompletion_1 = require_protocol_inlineCompletion();
    Object.defineProperty(exports2, "InlineCompletionRequest", { enumerable: true, get: function() {
      return protocol_inlineCompletion_1.InlineCompletionRequest;
    } });
    var TextDocumentFilter;
    (function(TextDocumentFilter2) {
      function is(value) {
        const candidate = value;
        return Is.string(candidate) || (Is.string(candidate.language) || Is.string(candidate.scheme) || Is.string(candidate.pattern));
      }
      TextDocumentFilter2.is = is;
    })(TextDocumentFilter || (exports2.TextDocumentFilter = TextDocumentFilter = {}));
    var NotebookDocumentFilter;
    (function(NotebookDocumentFilter2) {
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && (Is.string(candidate.notebookType) || Is.string(candidate.scheme) || Is.string(candidate.pattern));
      }
      NotebookDocumentFilter2.is = is;
    })(NotebookDocumentFilter || (exports2.NotebookDocumentFilter = NotebookDocumentFilter = {}));
    var NotebookCellTextDocumentFilter;
    (function(NotebookCellTextDocumentFilter2) {
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && (Is.string(candidate.notebook) || NotebookDocumentFilter.is(candidate.notebook)) && (candidate.language === void 0 || Is.string(candidate.language));
      }
      NotebookCellTextDocumentFilter2.is = is;
    })(NotebookCellTextDocumentFilter || (exports2.NotebookCellTextDocumentFilter = NotebookCellTextDocumentFilter = {}));
    var DocumentSelector;
    (function(DocumentSelector2) {
      function is(value) {
        if (!Array.isArray(value)) {
          return false;
        }
        for (let elem of value) {
          if (!Is.string(elem) && !TextDocumentFilter.is(elem) && !NotebookCellTextDocumentFilter.is(elem)) {
            return false;
          }
        }
        return true;
      }
      DocumentSelector2.is = is;
    })(DocumentSelector || (exports2.DocumentSelector = DocumentSelector = {}));
    var RegistrationRequest;
    (function(RegistrationRequest2) {
      RegistrationRequest2.method = "client/registerCapability";
      RegistrationRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      RegistrationRequest2.type = new messages_1.ProtocolRequestType(RegistrationRequest2.method);
    })(RegistrationRequest || (exports2.RegistrationRequest = RegistrationRequest = {}));
    var UnregistrationRequest;
    (function(UnregistrationRequest2) {
      UnregistrationRequest2.method = "client/unregisterCapability";
      UnregistrationRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      UnregistrationRequest2.type = new messages_1.ProtocolRequestType(UnregistrationRequest2.method);
    })(UnregistrationRequest || (exports2.UnregistrationRequest = UnregistrationRequest = {}));
    var ResourceOperationKind;
    (function(ResourceOperationKind2) {
      ResourceOperationKind2.Create = "create";
      ResourceOperationKind2.Rename = "rename";
      ResourceOperationKind2.Delete = "delete";
    })(ResourceOperationKind || (exports2.ResourceOperationKind = ResourceOperationKind = {}));
    var FailureHandlingKind;
    (function(FailureHandlingKind2) {
      FailureHandlingKind2.Abort = "abort";
      FailureHandlingKind2.Transactional = "transactional";
      FailureHandlingKind2.TextOnlyTransactional = "textOnlyTransactional";
      FailureHandlingKind2.Undo = "undo";
    })(FailureHandlingKind || (exports2.FailureHandlingKind = FailureHandlingKind = {}));
    var PositionEncodingKind;
    (function(PositionEncodingKind2) {
      PositionEncodingKind2.UTF8 = "utf-8";
      PositionEncodingKind2.UTF16 = "utf-16";
      PositionEncodingKind2.UTF32 = "utf-32";
    })(PositionEncodingKind || (exports2.PositionEncodingKind = PositionEncodingKind = {}));
    var StaticRegistrationOptions;
    (function(StaticRegistrationOptions2) {
      function hasId(value) {
        const candidate = value;
        return candidate && Is.string(candidate.id) && candidate.id.length > 0;
      }
      StaticRegistrationOptions2.hasId = hasId;
    })(StaticRegistrationOptions || (exports2.StaticRegistrationOptions = StaticRegistrationOptions = {}));
    var TextDocumentRegistrationOptions;
    (function(TextDocumentRegistrationOptions2) {
      function is(value) {
        const candidate = value;
        return candidate && (candidate.documentSelector === null || DocumentSelector.is(candidate.documentSelector));
      }
      TextDocumentRegistrationOptions2.is = is;
    })(TextDocumentRegistrationOptions || (exports2.TextDocumentRegistrationOptions = TextDocumentRegistrationOptions = {}));
    var WorkDoneProgressOptions;
    (function(WorkDoneProgressOptions2) {
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && (candidate.workDoneProgress === void 0 || Is.boolean(candidate.workDoneProgress));
      }
      WorkDoneProgressOptions2.is = is;
      function hasWorkDoneProgress(value) {
        const candidate = value;
        return candidate && Is.boolean(candidate.workDoneProgress);
      }
      WorkDoneProgressOptions2.hasWorkDoneProgress = hasWorkDoneProgress;
    })(WorkDoneProgressOptions || (exports2.WorkDoneProgressOptions = WorkDoneProgressOptions = {}));
    var InitializeRequest;
    (function(InitializeRequest2) {
      InitializeRequest2.method = "initialize";
      InitializeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      InitializeRequest2.type = new messages_1.ProtocolRequestType(InitializeRequest2.method);
    })(InitializeRequest || (exports2.InitializeRequest = InitializeRequest = {}));
    var InitializeErrorCodes;
    (function(InitializeErrorCodes2) {
      InitializeErrorCodes2.unknownProtocolVersion = 1;
    })(InitializeErrorCodes || (exports2.InitializeErrorCodes = InitializeErrorCodes = {}));
    var InitializedNotification;
    (function(InitializedNotification2) {
      InitializedNotification2.method = "initialized";
      InitializedNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      InitializedNotification2.type = new messages_1.ProtocolNotificationType(InitializedNotification2.method);
    })(InitializedNotification || (exports2.InitializedNotification = InitializedNotification = {}));
    var ShutdownRequest;
    (function(ShutdownRequest2) {
      ShutdownRequest2.method = "shutdown";
      ShutdownRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      ShutdownRequest2.type = new messages_1.ProtocolRequestType0(ShutdownRequest2.method);
    })(ShutdownRequest || (exports2.ShutdownRequest = ShutdownRequest = {}));
    var ExitNotification;
    (function(ExitNotification2) {
      ExitNotification2.method = "exit";
      ExitNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      ExitNotification2.type = new messages_1.ProtocolNotificationType0(ExitNotification2.method);
    })(ExitNotification || (exports2.ExitNotification = ExitNotification = {}));
    var DidChangeConfigurationNotification2;
    (function(DidChangeConfigurationNotification3) {
      DidChangeConfigurationNotification3.method = "workspace/didChangeConfiguration";
      DidChangeConfigurationNotification3.messageDirection = messages_1.MessageDirection.clientToServer;
      DidChangeConfigurationNotification3.type = new messages_1.ProtocolNotificationType(DidChangeConfigurationNotification3.method);
    })(DidChangeConfigurationNotification2 || (exports2.DidChangeConfigurationNotification = DidChangeConfigurationNotification2 = {}));
    var MessageType;
    (function(MessageType2) {
      MessageType2.Error = 1;
      MessageType2.Warning = 2;
      MessageType2.Info = 3;
      MessageType2.Log = 4;
      MessageType2.Debug = 5;
    })(MessageType || (exports2.MessageType = MessageType = {}));
    var ShowMessageNotification;
    (function(ShowMessageNotification2) {
      ShowMessageNotification2.method = "window/showMessage";
      ShowMessageNotification2.messageDirection = messages_1.MessageDirection.serverToClient;
      ShowMessageNotification2.type = new messages_1.ProtocolNotificationType(ShowMessageNotification2.method);
    })(ShowMessageNotification || (exports2.ShowMessageNotification = ShowMessageNotification = {}));
    var ShowMessageRequest;
    (function(ShowMessageRequest2) {
      ShowMessageRequest2.method = "window/showMessageRequest";
      ShowMessageRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      ShowMessageRequest2.type = new messages_1.ProtocolRequestType(ShowMessageRequest2.method);
    })(ShowMessageRequest || (exports2.ShowMessageRequest = ShowMessageRequest = {}));
    var LogMessageNotification;
    (function(LogMessageNotification2) {
      LogMessageNotification2.method = "window/logMessage";
      LogMessageNotification2.messageDirection = messages_1.MessageDirection.serverToClient;
      LogMessageNotification2.type = new messages_1.ProtocolNotificationType(LogMessageNotification2.method);
    })(LogMessageNotification || (exports2.LogMessageNotification = LogMessageNotification = {}));
    var TelemetryEventNotification;
    (function(TelemetryEventNotification2) {
      TelemetryEventNotification2.method = "telemetry/event";
      TelemetryEventNotification2.messageDirection = messages_1.MessageDirection.serverToClient;
      TelemetryEventNotification2.type = new messages_1.ProtocolNotificationType(TelemetryEventNotification2.method);
    })(TelemetryEventNotification || (exports2.TelemetryEventNotification = TelemetryEventNotification = {}));
    var TextDocumentSyncKind2;
    (function(TextDocumentSyncKind3) {
      TextDocumentSyncKind3.None = 0;
      TextDocumentSyncKind3.Full = 1;
      TextDocumentSyncKind3.Incremental = 2;
    })(TextDocumentSyncKind2 || (exports2.TextDocumentSyncKind = TextDocumentSyncKind2 = {}));
    var DidOpenTextDocumentNotification;
    (function(DidOpenTextDocumentNotification2) {
      DidOpenTextDocumentNotification2.method = "textDocument/didOpen";
      DidOpenTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidOpenTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidOpenTextDocumentNotification2.method);
    })(DidOpenTextDocumentNotification || (exports2.DidOpenTextDocumentNotification = DidOpenTextDocumentNotification = {}));
    var TextDocumentContentChangeEvent;
    (function(TextDocumentContentChangeEvent2) {
      function isIncremental(event) {
        let candidate = event;
        return candidate !== void 0 && candidate !== null && typeof candidate.text === "string" && candidate.range !== void 0 && (candidate.rangeLength === void 0 || typeof candidate.rangeLength === "number");
      }
      TextDocumentContentChangeEvent2.isIncremental = isIncremental;
      function isFull(event) {
        let candidate = event;
        return candidate !== void 0 && candidate !== null && typeof candidate.text === "string" && candidate.range === void 0 && candidate.rangeLength === void 0;
      }
      TextDocumentContentChangeEvent2.isFull = isFull;
    })(TextDocumentContentChangeEvent || (exports2.TextDocumentContentChangeEvent = TextDocumentContentChangeEvent = {}));
    var DidChangeTextDocumentNotification;
    (function(DidChangeTextDocumentNotification2) {
      DidChangeTextDocumentNotification2.method = "textDocument/didChange";
      DidChangeTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidChangeTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidChangeTextDocumentNotification2.method);
    })(DidChangeTextDocumentNotification || (exports2.DidChangeTextDocumentNotification = DidChangeTextDocumentNotification = {}));
    var DidCloseTextDocumentNotification;
    (function(DidCloseTextDocumentNotification2) {
      DidCloseTextDocumentNotification2.method = "textDocument/didClose";
      DidCloseTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidCloseTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidCloseTextDocumentNotification2.method);
    })(DidCloseTextDocumentNotification || (exports2.DidCloseTextDocumentNotification = DidCloseTextDocumentNotification = {}));
    var DidSaveTextDocumentNotification;
    (function(DidSaveTextDocumentNotification2) {
      DidSaveTextDocumentNotification2.method = "textDocument/didSave";
      DidSaveTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      DidSaveTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(DidSaveTextDocumentNotification2.method);
    })(DidSaveTextDocumentNotification || (exports2.DidSaveTextDocumentNotification = DidSaveTextDocumentNotification = {}));
    var TextDocumentSaveReason;
    (function(TextDocumentSaveReason2) {
      TextDocumentSaveReason2.Manual = 1;
      TextDocumentSaveReason2.AfterDelay = 2;
      TextDocumentSaveReason2.FocusOut = 3;
    })(TextDocumentSaveReason || (exports2.TextDocumentSaveReason = TextDocumentSaveReason = {}));
    var WillSaveTextDocumentNotification;
    (function(WillSaveTextDocumentNotification2) {
      WillSaveTextDocumentNotification2.method = "textDocument/willSave";
      WillSaveTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
      WillSaveTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(WillSaveTextDocumentNotification2.method);
    })(WillSaveTextDocumentNotification || (exports2.WillSaveTextDocumentNotification = WillSaveTextDocumentNotification = {}));
    var WillSaveTextDocumentWaitUntilRequest;
    (function(WillSaveTextDocumentWaitUntilRequest2) {
      WillSaveTextDocumentWaitUntilRequest2.method = "textDocument/willSaveWaitUntil";
      WillSaveTextDocumentWaitUntilRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WillSaveTextDocumentWaitUntilRequest2.type = new messages_1.ProtocolRequestType(WillSaveTextDocumentWaitUntilRequest2.method);
    })(WillSaveTextDocumentWaitUntilRequest || (exports2.WillSaveTextDocumentWaitUntilRequest = WillSaveTextDocumentWaitUntilRequest = {}));
    var DidChangeWatchedFilesNotification2;
    (function(DidChangeWatchedFilesNotification3) {
      DidChangeWatchedFilesNotification3.method = "workspace/didChangeWatchedFiles";
      DidChangeWatchedFilesNotification3.messageDirection = messages_1.MessageDirection.clientToServer;
      DidChangeWatchedFilesNotification3.type = new messages_1.ProtocolNotificationType(DidChangeWatchedFilesNotification3.method);
    })(DidChangeWatchedFilesNotification2 || (exports2.DidChangeWatchedFilesNotification = DidChangeWatchedFilesNotification2 = {}));
    var FileChangeType;
    (function(FileChangeType2) {
      FileChangeType2.Created = 1;
      FileChangeType2.Changed = 2;
      FileChangeType2.Deleted = 3;
    })(FileChangeType || (exports2.FileChangeType = FileChangeType = {}));
    var RelativePattern;
    (function(RelativePattern2) {
      function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && (vscode_languageserver_types_1.URI.is(candidate.baseUri) || vscode_languageserver_types_1.WorkspaceFolder.is(candidate.baseUri)) && Is.string(candidate.pattern);
      }
      RelativePattern2.is = is;
    })(RelativePattern || (exports2.RelativePattern = RelativePattern = {}));
    var WatchKind;
    (function(WatchKind2) {
      WatchKind2.Create = 1;
      WatchKind2.Change = 2;
      WatchKind2.Delete = 4;
    })(WatchKind || (exports2.WatchKind = WatchKind = {}));
    var PublishDiagnosticsNotification;
    (function(PublishDiagnosticsNotification2) {
      PublishDiagnosticsNotification2.method = "textDocument/publishDiagnostics";
      PublishDiagnosticsNotification2.messageDirection = messages_1.MessageDirection.serverToClient;
      PublishDiagnosticsNotification2.type = new messages_1.ProtocolNotificationType(PublishDiagnosticsNotification2.method);
    })(PublishDiagnosticsNotification || (exports2.PublishDiagnosticsNotification = PublishDiagnosticsNotification = {}));
    var CompletionTriggerKind;
    (function(CompletionTriggerKind2) {
      CompletionTriggerKind2.Invoked = 1;
      CompletionTriggerKind2.TriggerCharacter = 2;
      CompletionTriggerKind2.TriggerForIncompleteCompletions = 3;
    })(CompletionTriggerKind || (exports2.CompletionTriggerKind = CompletionTriggerKind = {}));
    var CompletionRequest;
    (function(CompletionRequest2) {
      CompletionRequest2.method = "textDocument/completion";
      CompletionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CompletionRequest2.type = new messages_1.ProtocolRequestType(CompletionRequest2.method);
    })(CompletionRequest || (exports2.CompletionRequest = CompletionRequest = {}));
    var CompletionResolveRequest;
    (function(CompletionResolveRequest2) {
      CompletionResolveRequest2.method = "completionItem/resolve";
      CompletionResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CompletionResolveRequest2.type = new messages_1.ProtocolRequestType(CompletionResolveRequest2.method);
    })(CompletionResolveRequest || (exports2.CompletionResolveRequest = CompletionResolveRequest = {}));
    var HoverRequest;
    (function(HoverRequest2) {
      HoverRequest2.method = "textDocument/hover";
      HoverRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      HoverRequest2.type = new messages_1.ProtocolRequestType(HoverRequest2.method);
    })(HoverRequest || (exports2.HoverRequest = HoverRequest = {}));
    var SignatureHelpTriggerKind;
    (function(SignatureHelpTriggerKind2) {
      SignatureHelpTriggerKind2.Invoked = 1;
      SignatureHelpTriggerKind2.TriggerCharacter = 2;
      SignatureHelpTriggerKind2.ContentChange = 3;
    })(SignatureHelpTriggerKind || (exports2.SignatureHelpTriggerKind = SignatureHelpTriggerKind = {}));
    var SignatureHelpRequest;
    (function(SignatureHelpRequest2) {
      SignatureHelpRequest2.method = "textDocument/signatureHelp";
      SignatureHelpRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      SignatureHelpRequest2.type = new messages_1.ProtocolRequestType(SignatureHelpRequest2.method);
    })(SignatureHelpRequest || (exports2.SignatureHelpRequest = SignatureHelpRequest = {}));
    var DefinitionRequest;
    (function(DefinitionRequest2) {
      DefinitionRequest2.method = "textDocument/definition";
      DefinitionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DefinitionRequest2.type = new messages_1.ProtocolRequestType(DefinitionRequest2.method);
    })(DefinitionRequest || (exports2.DefinitionRequest = DefinitionRequest = {}));
    var ReferencesRequest;
    (function(ReferencesRequest2) {
      ReferencesRequest2.method = "textDocument/references";
      ReferencesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      ReferencesRequest2.type = new messages_1.ProtocolRequestType(ReferencesRequest2.method);
    })(ReferencesRequest || (exports2.ReferencesRequest = ReferencesRequest = {}));
    var DocumentHighlightRequest;
    (function(DocumentHighlightRequest2) {
      DocumentHighlightRequest2.method = "textDocument/documentHighlight";
      DocumentHighlightRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentHighlightRequest2.type = new messages_1.ProtocolRequestType(DocumentHighlightRequest2.method);
    })(DocumentHighlightRequest || (exports2.DocumentHighlightRequest = DocumentHighlightRequest = {}));
    var DocumentSymbolRequest;
    (function(DocumentSymbolRequest2) {
      DocumentSymbolRequest2.method = "textDocument/documentSymbol";
      DocumentSymbolRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentSymbolRequest2.type = new messages_1.ProtocolRequestType(DocumentSymbolRequest2.method);
    })(DocumentSymbolRequest || (exports2.DocumentSymbolRequest = DocumentSymbolRequest = {}));
    var CodeActionRequest;
    (function(CodeActionRequest2) {
      CodeActionRequest2.method = "textDocument/codeAction";
      CodeActionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CodeActionRequest2.type = new messages_1.ProtocolRequestType(CodeActionRequest2.method);
    })(CodeActionRequest || (exports2.CodeActionRequest = CodeActionRequest = {}));
    var CodeActionResolveRequest;
    (function(CodeActionResolveRequest2) {
      CodeActionResolveRequest2.method = "codeAction/resolve";
      CodeActionResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CodeActionResolveRequest2.type = new messages_1.ProtocolRequestType(CodeActionResolveRequest2.method);
    })(CodeActionResolveRequest || (exports2.CodeActionResolveRequest = CodeActionResolveRequest = {}));
    var WorkspaceSymbolRequest;
    (function(WorkspaceSymbolRequest2) {
      WorkspaceSymbolRequest2.method = "workspace/symbol";
      WorkspaceSymbolRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WorkspaceSymbolRequest2.type = new messages_1.ProtocolRequestType(WorkspaceSymbolRequest2.method);
    })(WorkspaceSymbolRequest || (exports2.WorkspaceSymbolRequest = WorkspaceSymbolRequest = {}));
    var WorkspaceSymbolResolveRequest;
    (function(WorkspaceSymbolResolveRequest2) {
      WorkspaceSymbolResolveRequest2.method = "workspaceSymbol/resolve";
      WorkspaceSymbolResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      WorkspaceSymbolResolveRequest2.type = new messages_1.ProtocolRequestType(WorkspaceSymbolResolveRequest2.method);
    })(WorkspaceSymbolResolveRequest || (exports2.WorkspaceSymbolResolveRequest = WorkspaceSymbolResolveRequest = {}));
    var CodeLensRequest;
    (function(CodeLensRequest2) {
      CodeLensRequest2.method = "textDocument/codeLens";
      CodeLensRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CodeLensRequest2.type = new messages_1.ProtocolRequestType(CodeLensRequest2.method);
    })(CodeLensRequest || (exports2.CodeLensRequest = CodeLensRequest = {}));
    var CodeLensResolveRequest;
    (function(CodeLensResolveRequest2) {
      CodeLensResolveRequest2.method = "codeLens/resolve";
      CodeLensResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      CodeLensResolveRequest2.type = new messages_1.ProtocolRequestType(CodeLensResolveRequest2.method);
    })(CodeLensResolveRequest || (exports2.CodeLensResolveRequest = CodeLensResolveRequest = {}));
    var CodeLensRefreshRequest2;
    (function(CodeLensRefreshRequest3) {
      CodeLensRefreshRequest3.method = `workspace/codeLens/refresh`;
      CodeLensRefreshRequest3.messageDirection = messages_1.MessageDirection.serverToClient;
      CodeLensRefreshRequest3.type = new messages_1.ProtocolRequestType0(CodeLensRefreshRequest3.method);
    })(CodeLensRefreshRequest2 || (exports2.CodeLensRefreshRequest = CodeLensRefreshRequest2 = {}));
    var DocumentLinkRequest;
    (function(DocumentLinkRequest2) {
      DocumentLinkRequest2.method = "textDocument/documentLink";
      DocumentLinkRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentLinkRequest2.type = new messages_1.ProtocolRequestType(DocumentLinkRequest2.method);
    })(DocumentLinkRequest || (exports2.DocumentLinkRequest = DocumentLinkRequest = {}));
    var DocumentLinkResolveRequest;
    (function(DocumentLinkResolveRequest2) {
      DocumentLinkResolveRequest2.method = "documentLink/resolve";
      DocumentLinkResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentLinkResolveRequest2.type = new messages_1.ProtocolRequestType(DocumentLinkResolveRequest2.method);
    })(DocumentLinkResolveRequest || (exports2.DocumentLinkResolveRequest = DocumentLinkResolveRequest = {}));
    var DocumentFormattingRequest;
    (function(DocumentFormattingRequest2) {
      DocumentFormattingRequest2.method = "textDocument/formatting";
      DocumentFormattingRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentFormattingRequest2.type = new messages_1.ProtocolRequestType(DocumentFormattingRequest2.method);
    })(DocumentFormattingRequest || (exports2.DocumentFormattingRequest = DocumentFormattingRequest = {}));
    var DocumentRangeFormattingRequest;
    (function(DocumentRangeFormattingRequest2) {
      DocumentRangeFormattingRequest2.method = "textDocument/rangeFormatting";
      DocumentRangeFormattingRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentRangeFormattingRequest2.type = new messages_1.ProtocolRequestType(DocumentRangeFormattingRequest2.method);
    })(DocumentRangeFormattingRequest || (exports2.DocumentRangeFormattingRequest = DocumentRangeFormattingRequest = {}));
    var DocumentRangesFormattingRequest;
    (function(DocumentRangesFormattingRequest2) {
      DocumentRangesFormattingRequest2.method = "textDocument/rangesFormatting";
      DocumentRangesFormattingRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentRangesFormattingRequest2.type = new messages_1.ProtocolRequestType(DocumentRangesFormattingRequest2.method);
    })(DocumentRangesFormattingRequest || (exports2.DocumentRangesFormattingRequest = DocumentRangesFormattingRequest = {}));
    var DocumentOnTypeFormattingRequest;
    (function(DocumentOnTypeFormattingRequest2) {
      DocumentOnTypeFormattingRequest2.method = "textDocument/onTypeFormatting";
      DocumentOnTypeFormattingRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      DocumentOnTypeFormattingRequest2.type = new messages_1.ProtocolRequestType(DocumentOnTypeFormattingRequest2.method);
    })(DocumentOnTypeFormattingRequest || (exports2.DocumentOnTypeFormattingRequest = DocumentOnTypeFormattingRequest = {}));
    var PrepareSupportDefaultBehavior;
    (function(PrepareSupportDefaultBehavior2) {
      PrepareSupportDefaultBehavior2.Identifier = 1;
    })(PrepareSupportDefaultBehavior || (exports2.PrepareSupportDefaultBehavior = PrepareSupportDefaultBehavior = {}));
    var RenameRequest;
    (function(RenameRequest2) {
      RenameRequest2.method = "textDocument/rename";
      RenameRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      RenameRequest2.type = new messages_1.ProtocolRequestType(RenameRequest2.method);
    })(RenameRequest || (exports2.RenameRequest = RenameRequest = {}));
    var PrepareRenameRequest;
    (function(PrepareRenameRequest2) {
      PrepareRenameRequest2.method = "textDocument/prepareRename";
      PrepareRenameRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      PrepareRenameRequest2.type = new messages_1.ProtocolRequestType(PrepareRenameRequest2.method);
    })(PrepareRenameRequest || (exports2.PrepareRenameRequest = PrepareRenameRequest = {}));
    var ExecuteCommandRequest;
    (function(ExecuteCommandRequest2) {
      ExecuteCommandRequest2.method = "workspace/executeCommand";
      ExecuteCommandRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
      ExecuteCommandRequest2.type = new messages_1.ProtocolRequestType(ExecuteCommandRequest2.method);
    })(ExecuteCommandRequest || (exports2.ExecuteCommandRequest = ExecuteCommandRequest = {}));
    var ApplyWorkspaceEditRequest;
    (function(ApplyWorkspaceEditRequest2) {
      ApplyWorkspaceEditRequest2.method = "workspace/applyEdit";
      ApplyWorkspaceEditRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
      ApplyWorkspaceEditRequest2.type = new messages_1.ProtocolRequestType("workspace/applyEdit");
    })(ApplyWorkspaceEditRequest || (exports2.ApplyWorkspaceEditRequest = ApplyWorkspaceEditRequest = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/connection.js
var require_connection2 = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/connection.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createProtocolConnection = void 0;
    var vscode_jsonrpc_1 = require_main();
    function createProtocolConnection(input, output, logger, options) {
      if (vscode_jsonrpc_1.ConnectionStrategy.is(options)) {
        options = { connectionStrategy: options };
      }
      return (0, vscode_jsonrpc_1.createMessageConnection)(input, output, logger, options);
    }
    exports2.createProtocolConnection = createProtocolConnection;
  }
});

// node_modules/vscode-languageserver-protocol/lib/common/api.js
var require_api2 = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/common/api.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LSPErrorCodes = exports2.createProtocolConnection = void 0;
    __exportStar(require_main(), exports2);
    __exportStar(require_main2(), exports2);
    __exportStar(require_messages2(), exports2);
    __exportStar(require_protocol(), exports2);
    var connection_1 = require_connection2();
    Object.defineProperty(exports2, "createProtocolConnection", { enumerable: true, get: function() {
      return connection_1.createProtocolConnection;
    } });
    var LSPErrorCodes;
    (function(LSPErrorCodes2) {
      LSPErrorCodes2.lspReservedErrorRangeStart = -32899;
      LSPErrorCodes2.RequestFailed = -32803;
      LSPErrorCodes2.ServerCancelled = -32802;
      LSPErrorCodes2.ContentModified = -32801;
      LSPErrorCodes2.RequestCancelled = -32800;
      LSPErrorCodes2.lspReservedErrorRangeEnd = -32800;
    })(LSPErrorCodes || (exports2.LSPErrorCodes = LSPErrorCodes = {}));
  }
});

// node_modules/vscode-languageserver-protocol/lib/node/main.js
var require_main3 = __commonJS({
  "node_modules/vscode-languageserver-protocol/lib/node/main.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createProtocolConnection = void 0;
    var node_1 = require_node();
    __exportStar(require_node(), exports2);
    __exportStar(require_api2(), exports2);
    function createProtocolConnection(input, output, logger, options) {
      return (0, node_1.createMessageConnection)(input, output, logger, options);
    }
    exports2.createProtocolConnection = createProtocolConnection;
  }
});

// node_modules/vscode-languageserver/lib/common/utils/uuid.js
var require_uuid = __commonJS({
  "node_modules/vscode-languageserver/lib/common/utils/uuid.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.generateUuid = exports2.parse = exports2.isUUID = exports2.v4 = exports2.empty = void 0;
    var ValueUUID = class {
      constructor(_value) {
        this._value = _value;
      }
      asHex() {
        return this._value;
      }
      equals(other) {
        return this.asHex() === other.asHex();
      }
    };
    var V4UUID = class _V4UUID extends ValueUUID {
      static _oneOf(array) {
        return array[Math.floor(array.length * Math.random())];
      }
      static _randomHex() {
        return _V4UUID._oneOf(_V4UUID._chars);
      }
      constructor() {
        super([
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          "-",
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          "-",
          "4",
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          "-",
          _V4UUID._oneOf(_V4UUID._timeHighBits),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          "-",
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex(),
          _V4UUID._randomHex()
        ].join(""));
      }
    };
    V4UUID._chars = ["0", "1", "2", "3", "4", "5", "6", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    V4UUID._timeHighBits = ["8", "9", "a", "b"];
    exports2.empty = new ValueUUID("00000000-0000-0000-0000-000000000000");
    function v4() {
      return new V4UUID();
    }
    exports2.v4 = v4;
    var _UUIDPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    function isUUID(value) {
      return _UUIDPattern.test(value);
    }
    exports2.isUUID = isUUID;
    function parse2(value) {
      if (!isUUID(value)) {
        throw new Error("invalid uuid");
      }
      return new ValueUUID(value);
    }
    exports2.parse = parse2;
    function generateUuid() {
      return v4().asHex();
    }
    exports2.generateUuid = generateUuid;
  }
});

// node_modules/vscode-languageserver/lib/common/progress.js
var require_progress = __commonJS({
  "node_modules/vscode-languageserver/lib/common/progress.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.attachPartialResult = exports2.ProgressFeature = exports2.attachWorkDone = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var uuid_1 = require_uuid();
    var WorkDoneProgressReporterImpl = class _WorkDoneProgressReporterImpl {
      constructor(_connection, _token) {
        this._connection = _connection;
        this._token = _token;
        _WorkDoneProgressReporterImpl.Instances.set(this._token, this);
      }
      begin(title, percentage, message, cancellable) {
        let param = {
          kind: "begin",
          title,
          percentage,
          message,
          cancellable
        };
        this._connection.sendProgress(vscode_languageserver_protocol_1.WorkDoneProgress.type, this._token, param);
      }
      report(arg0, arg1) {
        let param = {
          kind: "report"
        };
        if (typeof arg0 === "number") {
          param.percentage = arg0;
          if (arg1 !== void 0) {
            param.message = arg1;
          }
        } else {
          param.message = arg0;
        }
        this._connection.sendProgress(vscode_languageserver_protocol_1.WorkDoneProgress.type, this._token, param);
      }
      done() {
        _WorkDoneProgressReporterImpl.Instances.delete(this._token);
        this._connection.sendProgress(vscode_languageserver_protocol_1.WorkDoneProgress.type, this._token, { kind: "end" });
      }
    };
    WorkDoneProgressReporterImpl.Instances = /* @__PURE__ */ new Map();
    var WorkDoneProgressServerReporterImpl = class extends WorkDoneProgressReporterImpl {
      constructor(connection2, token) {
        super(connection2, token);
        this._source = new vscode_languageserver_protocol_1.CancellationTokenSource();
      }
      get token() {
        return this._source.token;
      }
      done() {
        this._source.dispose();
        super.done();
      }
      cancel() {
        this._source.cancel();
      }
    };
    var NullProgressReporter = class {
      constructor() {
      }
      begin() {
      }
      report() {
      }
      done() {
      }
    };
    var NullProgressServerReporter = class extends NullProgressReporter {
      constructor() {
        super();
        this._source = new vscode_languageserver_protocol_1.CancellationTokenSource();
      }
      get token() {
        return this._source.token;
      }
      done() {
        this._source.dispose();
      }
      cancel() {
        this._source.cancel();
      }
    };
    function attachWorkDone(connection2, params) {
      if (params === void 0 || params.workDoneToken === void 0) {
        return new NullProgressReporter();
      }
      const token = params.workDoneToken;
      delete params.workDoneToken;
      return new WorkDoneProgressReporterImpl(connection2, token);
    }
    exports2.attachWorkDone = attachWorkDone;
    var ProgressFeature = (Base) => {
      return class extends Base {
        constructor() {
          super();
          this._progressSupported = false;
        }
        initialize(capabilities) {
          super.initialize(capabilities);
          if (capabilities?.window?.workDoneProgress === true) {
            this._progressSupported = true;
            this.connection.onNotification(vscode_languageserver_protocol_1.WorkDoneProgressCancelNotification.type, (params) => {
              let progress = WorkDoneProgressReporterImpl.Instances.get(params.token);
              if (progress instanceof WorkDoneProgressServerReporterImpl || progress instanceof NullProgressServerReporter) {
                progress.cancel();
              }
            });
          }
        }
        attachWorkDoneProgress(token) {
          if (token === void 0) {
            return new NullProgressReporter();
          } else {
            return new WorkDoneProgressReporterImpl(this.connection, token);
          }
        }
        createWorkDoneProgress() {
          if (this._progressSupported) {
            const token = (0, uuid_1.generateUuid)();
            return this.connection.sendRequest(vscode_languageserver_protocol_1.WorkDoneProgressCreateRequest.type, { token }).then(() => {
              const result = new WorkDoneProgressServerReporterImpl(this.connection, token);
              return result;
            });
          } else {
            return Promise.resolve(new NullProgressServerReporter());
          }
        }
      };
    };
    exports2.ProgressFeature = ProgressFeature;
    var ResultProgress;
    (function(ResultProgress2) {
      ResultProgress2.type = new vscode_languageserver_protocol_1.ProgressType();
    })(ResultProgress || (ResultProgress = {}));
    var ResultProgressReporterImpl = class {
      constructor(_connection, _token) {
        this._connection = _connection;
        this._token = _token;
      }
      report(data) {
        this._connection.sendProgress(ResultProgress.type, this._token, data);
      }
    };
    function attachPartialResult(connection2, params) {
      if (params === void 0 || params.partialResultToken === void 0) {
        return void 0;
      }
      const token = params.partialResultToken;
      delete params.partialResultToken;
      return new ResultProgressReporterImpl(connection2, token);
    }
    exports2.attachPartialResult = attachPartialResult;
  }
});

// node_modules/vscode-languageserver/lib/common/configuration.js
var require_configuration = __commonJS({
  "node_modules/vscode-languageserver/lib/common/configuration.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConfigurationFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var Is = require_is();
    var ConfigurationFeature = (Base) => {
      return class extends Base {
        getConfiguration(arg) {
          if (!arg) {
            return this._getConfiguration({});
          } else if (Is.string(arg)) {
            return this._getConfiguration({ section: arg });
          } else {
            return this._getConfiguration(arg);
          }
        }
        _getConfiguration(arg) {
          let params = {
            items: Array.isArray(arg) ? arg : [arg]
          };
          return this.connection.sendRequest(vscode_languageserver_protocol_1.ConfigurationRequest.type, params).then((result) => {
            if (Array.isArray(result)) {
              return Array.isArray(arg) ? result : result[0];
            } else {
              return Array.isArray(arg) ? [] : null;
            }
          });
        }
      };
    };
    exports2.ConfigurationFeature = ConfigurationFeature;
  }
});

// node_modules/vscode-languageserver/lib/common/workspaceFolder.js
var require_workspaceFolder = __commonJS({
  "node_modules/vscode-languageserver/lib/common/workspaceFolder.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WorkspaceFoldersFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var WorkspaceFoldersFeature = (Base) => {
      return class extends Base {
        constructor() {
          super();
          this._notificationIsAutoRegistered = false;
        }
        initialize(capabilities) {
          super.initialize(capabilities);
          let workspaceCapabilities = capabilities.workspace;
          if (workspaceCapabilities && workspaceCapabilities.workspaceFolders) {
            this._onDidChangeWorkspaceFolders = new vscode_languageserver_protocol_1.Emitter();
            this.connection.onNotification(vscode_languageserver_protocol_1.DidChangeWorkspaceFoldersNotification.type, (params) => {
              this._onDidChangeWorkspaceFolders.fire(params.event);
            });
          }
        }
        fillServerCapabilities(capabilities) {
          super.fillServerCapabilities(capabilities);
          const changeNotifications = capabilities.workspace?.workspaceFolders?.changeNotifications;
          this._notificationIsAutoRegistered = changeNotifications === true || typeof changeNotifications === "string";
        }
        getWorkspaceFolders() {
          return this.connection.sendRequest(vscode_languageserver_protocol_1.WorkspaceFoldersRequest.type);
        }
        get onDidChangeWorkspaceFolders() {
          if (!this._onDidChangeWorkspaceFolders) {
            throw new Error("Client doesn't support sending workspace folder change events.");
          }
          if (!this._notificationIsAutoRegistered && !this._unregistration) {
            this._unregistration = this.connection.client.register(vscode_languageserver_protocol_1.DidChangeWorkspaceFoldersNotification.type);
          }
          return this._onDidChangeWorkspaceFolders.event;
        }
      };
    };
    exports2.WorkspaceFoldersFeature = WorkspaceFoldersFeature;
  }
});

// node_modules/vscode-languageserver/lib/common/callHierarchy.js
var require_callHierarchy = __commonJS({
  "node_modules/vscode-languageserver/lib/common/callHierarchy.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CallHierarchyFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var CallHierarchyFeature = (Base) => {
      return class extends Base {
        get callHierarchy() {
          return {
            onPrepare: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.CallHierarchyPrepareRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), void 0);
              });
            },
            onIncomingCalls: (handler) => {
              const type = vscode_languageserver_protocol_1.CallHierarchyIncomingCallsRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            },
            onOutgoingCalls: (handler) => {
              const type = vscode_languageserver_protocol_1.CallHierarchyOutgoingCallsRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            }
          };
        }
      };
    };
    exports2.CallHierarchyFeature = CallHierarchyFeature;
  }
});

// node_modules/vscode-languageserver/lib/common/semanticTokens.js
var require_semanticTokens = __commonJS({
  "node_modules/vscode-languageserver/lib/common/semanticTokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SemanticTokensBuilder = exports2.SemanticTokensDiff = exports2.SemanticTokensFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var SemanticTokensFeature = (Base) => {
      return class extends Base {
        get semanticTokens() {
          return {
            refresh: () => {
              return this.connection.sendRequest(vscode_languageserver_protocol_1.SemanticTokensRefreshRequest.type);
            },
            on: (handler) => {
              const type = vscode_languageserver_protocol_1.SemanticTokensRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            },
            onDelta: (handler) => {
              const type = vscode_languageserver_protocol_1.SemanticTokensDeltaRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            },
            onRange: (handler) => {
              const type = vscode_languageserver_protocol_1.SemanticTokensRangeRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            }
          };
        }
      };
    };
    exports2.SemanticTokensFeature = SemanticTokensFeature;
    var SemanticTokensDiff = class {
      constructor(originalSequence, modifiedSequence) {
        this.originalSequence = originalSequence;
        this.modifiedSequence = modifiedSequence;
      }
      computeDiff() {
        const originalLength = this.originalSequence.length;
        const modifiedLength = this.modifiedSequence.length;
        let startIndex = 0;
        while (startIndex < modifiedLength && startIndex < originalLength && this.originalSequence[startIndex] === this.modifiedSequence[startIndex]) {
          startIndex++;
        }
        if (startIndex < modifiedLength && startIndex < originalLength) {
          let originalEndIndex = originalLength - 1;
          let modifiedEndIndex = modifiedLength - 1;
          while (originalEndIndex >= startIndex && modifiedEndIndex >= startIndex && this.originalSequence[originalEndIndex] === this.modifiedSequence[modifiedEndIndex]) {
            originalEndIndex--;
            modifiedEndIndex--;
          }
          if (originalEndIndex < startIndex || modifiedEndIndex < startIndex) {
            originalEndIndex++;
            modifiedEndIndex++;
          }
          const deleteCount = originalEndIndex - startIndex + 1;
          const newData = this.modifiedSequence.slice(startIndex, modifiedEndIndex + 1);
          if (newData.length === 1 && newData[0] === this.originalSequence[originalEndIndex]) {
            return [
              { start: startIndex, deleteCount: deleteCount - 1 }
            ];
          } else {
            return [
              { start: startIndex, deleteCount, data: newData }
            ];
          }
        } else if (startIndex < modifiedLength) {
          return [
            { start: startIndex, deleteCount: 0, data: this.modifiedSequence.slice(startIndex) }
          ];
        } else if (startIndex < originalLength) {
          return [
            { start: startIndex, deleteCount: originalLength - startIndex }
          ];
        } else {
          return [];
        }
      }
    };
    exports2.SemanticTokensDiff = SemanticTokensDiff;
    var SemanticTokensBuilder = class {
      constructor() {
        this._prevData = void 0;
        this.initialize();
      }
      initialize() {
        this._id = Date.now();
        this._prevLine = 0;
        this._prevChar = 0;
        this._data = [];
        this._dataLen = 0;
      }
      push(line, char, length, tokenType, tokenModifiers) {
        let pushLine = line;
        let pushChar = char;
        if (this._dataLen > 0) {
          pushLine -= this._prevLine;
          if (pushLine === 0) {
            pushChar -= this._prevChar;
          }
        }
        this._data[this._dataLen++] = pushLine;
        this._data[this._dataLen++] = pushChar;
        this._data[this._dataLen++] = length;
        this._data[this._dataLen++] = tokenType;
        this._data[this._dataLen++] = tokenModifiers;
        this._prevLine = line;
        this._prevChar = char;
      }
      get id() {
        return this._id.toString();
      }
      previousResult(id) {
        if (this.id === id) {
          this._prevData = this._data;
        }
        this.initialize();
      }
      build() {
        this._prevData = void 0;
        return {
          resultId: this.id,
          data: this._data
        };
      }
      canBuildEdits() {
        return this._prevData !== void 0;
      }
      buildEdits() {
        if (this._prevData !== void 0) {
          return {
            resultId: this.id,
            edits: new SemanticTokensDiff(this._prevData, this._data).computeDiff()
          };
        } else {
          return this.build();
        }
      }
    };
    exports2.SemanticTokensBuilder = SemanticTokensBuilder;
  }
});

// node_modules/vscode-languageserver/lib/common/showDocument.js
var require_showDocument = __commonJS({
  "node_modules/vscode-languageserver/lib/common/showDocument.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ShowDocumentFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var ShowDocumentFeature = (Base) => {
      return class extends Base {
        showDocument(params) {
          return this.connection.sendRequest(vscode_languageserver_protocol_1.ShowDocumentRequest.type, params);
        }
      };
    };
    exports2.ShowDocumentFeature = ShowDocumentFeature;
  }
});

// node_modules/vscode-languageserver/lib/common/fileOperations.js
var require_fileOperations = __commonJS({
  "node_modules/vscode-languageserver/lib/common/fileOperations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FileOperationsFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var FileOperationsFeature = (Base) => {
      return class extends Base {
        onDidCreateFiles(handler) {
          return this.connection.onNotification(vscode_languageserver_protocol_1.DidCreateFilesNotification.type, (params) => {
            handler(params);
          });
        }
        onDidRenameFiles(handler) {
          return this.connection.onNotification(vscode_languageserver_protocol_1.DidRenameFilesNotification.type, (params) => {
            handler(params);
          });
        }
        onDidDeleteFiles(handler) {
          return this.connection.onNotification(vscode_languageserver_protocol_1.DidDeleteFilesNotification.type, (params) => {
            handler(params);
          });
        }
        onWillCreateFiles(handler) {
          return this.connection.onRequest(vscode_languageserver_protocol_1.WillCreateFilesRequest.type, (params, cancel) => {
            return handler(params, cancel);
          });
        }
        onWillRenameFiles(handler) {
          return this.connection.onRequest(vscode_languageserver_protocol_1.WillRenameFilesRequest.type, (params, cancel) => {
            return handler(params, cancel);
          });
        }
        onWillDeleteFiles(handler) {
          return this.connection.onRequest(vscode_languageserver_protocol_1.WillDeleteFilesRequest.type, (params, cancel) => {
            return handler(params, cancel);
          });
        }
      };
    };
    exports2.FileOperationsFeature = FileOperationsFeature;
  }
});

// node_modules/vscode-languageserver/lib/common/linkedEditingRange.js
var require_linkedEditingRange = __commonJS({
  "node_modules/vscode-languageserver/lib/common/linkedEditingRange.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LinkedEditingRangeFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var LinkedEditingRangeFeature = (Base) => {
      return class extends Base {
        onLinkedEditingRange(handler) {
          return this.connection.onRequest(vscode_languageserver_protocol_1.LinkedEditingRangeRequest.type, (params, cancel) => {
            return handler(params, cancel, this.attachWorkDoneProgress(params), void 0);
          });
        }
      };
    };
    exports2.LinkedEditingRangeFeature = LinkedEditingRangeFeature;
  }
});

// node_modules/vscode-languageserver/lib/common/typeHierarchy.js
var require_typeHierarchy = __commonJS({
  "node_modules/vscode-languageserver/lib/common/typeHierarchy.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TypeHierarchyFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var TypeHierarchyFeature = (Base) => {
      return class extends Base {
        get typeHierarchy() {
          return {
            onPrepare: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.TypeHierarchyPrepareRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), void 0);
              });
            },
            onSupertypes: (handler) => {
              const type = vscode_languageserver_protocol_1.TypeHierarchySupertypesRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            },
            onSubtypes: (handler) => {
              const type = vscode_languageserver_protocol_1.TypeHierarchySubtypesRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            }
          };
        }
      };
    };
    exports2.TypeHierarchyFeature = TypeHierarchyFeature;
  }
});

// node_modules/vscode-languageserver/lib/common/inlineValue.js
var require_inlineValue = __commonJS({
  "node_modules/vscode-languageserver/lib/common/inlineValue.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InlineValueFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var InlineValueFeature = (Base) => {
      return class extends Base {
        get inlineValue() {
          return {
            refresh: () => {
              return this.connection.sendRequest(vscode_languageserver_protocol_1.InlineValueRefreshRequest.type);
            },
            on: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.InlineValueRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params));
              });
            }
          };
        }
      };
    };
    exports2.InlineValueFeature = InlineValueFeature;
  }
});

// node_modules/vscode-languageserver/lib/common/foldingRange.js
var require_foldingRange = __commonJS({
  "node_modules/vscode-languageserver/lib/common/foldingRange.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FoldingRangeFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var FoldingRangeFeature = (Base) => {
      return class extends Base {
        get foldingRange() {
          return {
            refresh: () => {
              return this.connection.sendRequest(vscode_languageserver_protocol_1.FoldingRangeRefreshRequest.type);
            },
            on: (handler) => {
              const type = vscode_languageserver_protocol_1.FoldingRangeRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            }
          };
        }
      };
    };
    exports2.FoldingRangeFeature = FoldingRangeFeature;
  }
});

// node_modules/vscode-languageserver/lib/common/inlayHint.js
var require_inlayHint = __commonJS({
  "node_modules/vscode-languageserver/lib/common/inlayHint.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InlayHintFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var InlayHintFeature = (Base) => {
      return class extends Base {
        get inlayHint() {
          return {
            refresh: () => {
              return this.connection.sendRequest(vscode_languageserver_protocol_1.InlayHintRefreshRequest.type);
            },
            on: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.InlayHintRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params));
              });
            },
            resolve: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.InlayHintResolveRequest.type, (params, cancel) => {
                return handler(params, cancel);
              });
            }
          };
        }
      };
    };
    exports2.InlayHintFeature = InlayHintFeature;
  }
});

// node_modules/vscode-languageserver/lib/common/diagnostic.js
var require_diagnostic = __commonJS({
  "node_modules/vscode-languageserver/lib/common/diagnostic.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DiagnosticFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var DiagnosticFeature = (Base) => {
      return class extends Base {
        get diagnostics() {
          return {
            refresh: () => {
              return this.connection.sendRequest(vscode_languageserver_protocol_1.DiagnosticRefreshRequest.type);
            },
            on: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.DocumentDiagnosticRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(vscode_languageserver_protocol_1.DocumentDiagnosticRequest.partialResult, params));
              });
            },
            onWorkspace: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.WorkspaceDiagnosticRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(vscode_languageserver_protocol_1.WorkspaceDiagnosticRequest.partialResult, params));
              });
            }
          };
        }
      };
    };
    exports2.DiagnosticFeature = DiagnosticFeature;
  }
});

// node_modules/vscode-languageserver/lib/common/textDocuments.js
var require_textDocuments = __commonJS({
  "node_modules/vscode-languageserver/lib/common/textDocuments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TextDocuments = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var TextDocuments2 = class {
      /**
       * Create a new text document manager.
       */
      constructor(configuration) {
        this._configuration = configuration;
        this._syncedDocuments = /* @__PURE__ */ new Map();
        this._onDidChangeContent = new vscode_languageserver_protocol_1.Emitter();
        this._onDidOpen = new vscode_languageserver_protocol_1.Emitter();
        this._onDidClose = new vscode_languageserver_protocol_1.Emitter();
        this._onDidSave = new vscode_languageserver_protocol_1.Emitter();
        this._onWillSave = new vscode_languageserver_protocol_1.Emitter();
      }
      /**
       * An event that fires when a text document managed by this manager
       * has been opened.
       */
      get onDidOpen() {
        return this._onDidOpen.event;
      }
      /**
       * An event that fires when a text document managed by this manager
       * has been opened or the content changes.
       */
      get onDidChangeContent() {
        return this._onDidChangeContent.event;
      }
      /**
       * An event that fires when a text document managed by this manager
       * will be saved.
       */
      get onWillSave() {
        return this._onWillSave.event;
      }
      /**
       * Sets a handler that will be called if a participant wants to provide
       * edits during a text document save.
       */
      onWillSaveWaitUntil(handler) {
        this._willSaveWaitUntil = handler;
      }
      /**
       * An event that fires when a text document managed by this manager
       * has been saved.
       */
      get onDidSave() {
        return this._onDidSave.event;
      }
      /**
       * An event that fires when a text document managed by this manager
       * has been closed.
       */
      get onDidClose() {
        return this._onDidClose.event;
      }
      /**
       * Returns the document for the given URI. Returns undefined if
       * the document is not managed by this instance.
       *
       * @param uri The text document's URI to retrieve.
       * @return the text document or `undefined`.
       */
      get(uri) {
        return this._syncedDocuments.get(uri);
      }
      /**
       * Returns all text documents managed by this instance.
       *
       * @return all text documents.
       */
      all() {
        return Array.from(this._syncedDocuments.values());
      }
      /**
       * Returns the URIs of all text documents managed by this instance.
       *
       * @return the URI's of all text documents.
       */
      keys() {
        return Array.from(this._syncedDocuments.keys());
      }
      /**
       * Listens for `low level` notification on the given connection to
       * update the text documents managed by this instance.
       *
       * Please note that the connection only provides handlers not an event model. Therefore
       * listening on a connection will overwrite the following handlers on a connection:
       * `onDidOpenTextDocument`, `onDidChangeTextDocument`, `onDidCloseTextDocument`,
       * `onWillSaveTextDocument`, `onWillSaveTextDocumentWaitUntil` and `onDidSaveTextDocument`.
       *
       * Use the corresponding events on the TextDocuments instance instead.
       *
       * @param connection The connection to listen on.
       */
      listen(connection2) {
        connection2.__textDocumentSync = vscode_languageserver_protocol_1.TextDocumentSyncKind.Incremental;
        const disposables = [];
        disposables.push(connection2.onDidOpenTextDocument((event) => {
          const td = event.textDocument;
          const document = this._configuration.create(td.uri, td.languageId, td.version, td.text);
          this._syncedDocuments.set(td.uri, document);
          const toFire = Object.freeze({ document });
          this._onDidOpen.fire(toFire);
          this._onDidChangeContent.fire(toFire);
        }));
        disposables.push(connection2.onDidChangeTextDocument((event) => {
          const td = event.textDocument;
          const changes = event.contentChanges;
          if (changes.length === 0) {
            return;
          }
          const { version } = td;
          if (version === null || version === void 0) {
            throw new Error(`Received document change event for ${td.uri} without valid version identifier`);
          }
          let syncedDocument = this._syncedDocuments.get(td.uri);
          if (syncedDocument !== void 0) {
            syncedDocument = this._configuration.update(syncedDocument, changes, version);
            this._syncedDocuments.set(td.uri, syncedDocument);
            this._onDidChangeContent.fire(Object.freeze({ document: syncedDocument }));
          }
        }));
        disposables.push(connection2.onDidCloseTextDocument((event) => {
          let syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
          if (syncedDocument !== void 0) {
            this._syncedDocuments.delete(event.textDocument.uri);
            this._onDidClose.fire(Object.freeze({ document: syncedDocument }));
          }
        }));
        disposables.push(connection2.onWillSaveTextDocument((event) => {
          let syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
          if (syncedDocument !== void 0) {
            this._onWillSave.fire(Object.freeze({ document: syncedDocument, reason: event.reason }));
          }
        }));
        disposables.push(connection2.onWillSaveTextDocumentWaitUntil((event, token) => {
          let syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
          if (syncedDocument !== void 0 && this._willSaveWaitUntil) {
            return this._willSaveWaitUntil(Object.freeze({ document: syncedDocument, reason: event.reason }), token);
          } else {
            return [];
          }
        }));
        disposables.push(connection2.onDidSaveTextDocument((event) => {
          let syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
          if (syncedDocument !== void 0) {
            this._onDidSave.fire(Object.freeze({ document: syncedDocument }));
          }
        }));
        return vscode_languageserver_protocol_1.Disposable.create(() => {
          disposables.forEach((disposable) => disposable.dispose());
        });
      }
    };
    exports2.TextDocuments = TextDocuments2;
  }
});

// node_modules/vscode-languageserver/lib/common/notebook.js
var require_notebook = __commonJS({
  "node_modules/vscode-languageserver/lib/common/notebook.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NotebookDocuments = exports2.NotebookSyncFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var textDocuments_1 = require_textDocuments();
    var NotebookSyncFeature = (Base) => {
      return class extends Base {
        get synchronization() {
          return {
            onDidOpenNotebookDocument: (handler) => {
              return this.connection.onNotification(vscode_languageserver_protocol_1.DidOpenNotebookDocumentNotification.type, (params) => {
                handler(params);
              });
            },
            onDidChangeNotebookDocument: (handler) => {
              return this.connection.onNotification(vscode_languageserver_protocol_1.DidChangeNotebookDocumentNotification.type, (params) => {
                handler(params);
              });
            },
            onDidSaveNotebookDocument: (handler) => {
              return this.connection.onNotification(vscode_languageserver_protocol_1.DidSaveNotebookDocumentNotification.type, (params) => {
                handler(params);
              });
            },
            onDidCloseNotebookDocument: (handler) => {
              return this.connection.onNotification(vscode_languageserver_protocol_1.DidCloseNotebookDocumentNotification.type, (params) => {
                handler(params);
              });
            }
          };
        }
      };
    };
    exports2.NotebookSyncFeature = NotebookSyncFeature;
    var CellTextDocumentConnection = class _CellTextDocumentConnection {
      onDidOpenTextDocument(handler) {
        this.openHandler = handler;
        return vscode_languageserver_protocol_1.Disposable.create(() => {
          this.openHandler = void 0;
        });
      }
      openTextDocument(params) {
        this.openHandler && this.openHandler(params);
      }
      onDidChangeTextDocument(handler) {
        this.changeHandler = handler;
        return vscode_languageserver_protocol_1.Disposable.create(() => {
          this.changeHandler = handler;
        });
      }
      changeTextDocument(params) {
        this.changeHandler && this.changeHandler(params);
      }
      onDidCloseTextDocument(handler) {
        this.closeHandler = handler;
        return vscode_languageserver_protocol_1.Disposable.create(() => {
          this.closeHandler = void 0;
        });
      }
      closeTextDocument(params) {
        this.closeHandler && this.closeHandler(params);
      }
      onWillSaveTextDocument() {
        return _CellTextDocumentConnection.NULL_DISPOSE;
      }
      onWillSaveTextDocumentWaitUntil() {
        return _CellTextDocumentConnection.NULL_DISPOSE;
      }
      onDidSaveTextDocument() {
        return _CellTextDocumentConnection.NULL_DISPOSE;
      }
    };
    CellTextDocumentConnection.NULL_DISPOSE = Object.freeze({ dispose: () => {
    } });
    var NotebookDocuments = class {
      constructor(configurationOrTextDocuments) {
        if (configurationOrTextDocuments instanceof textDocuments_1.TextDocuments) {
          this._cellTextDocuments = configurationOrTextDocuments;
        } else {
          this._cellTextDocuments = new textDocuments_1.TextDocuments(configurationOrTextDocuments);
        }
        this.notebookDocuments = /* @__PURE__ */ new Map();
        this.notebookCellMap = /* @__PURE__ */ new Map();
        this._onDidOpen = new vscode_languageserver_protocol_1.Emitter();
        this._onDidChange = new vscode_languageserver_protocol_1.Emitter();
        this._onDidSave = new vscode_languageserver_protocol_1.Emitter();
        this._onDidClose = new vscode_languageserver_protocol_1.Emitter();
      }
      get cellTextDocuments() {
        return this._cellTextDocuments;
      }
      getCellTextDocument(cell) {
        return this._cellTextDocuments.get(cell.document);
      }
      getNotebookDocument(uri) {
        return this.notebookDocuments.get(uri);
      }
      getNotebookCell(uri) {
        const value = this.notebookCellMap.get(uri);
        return value && value[0];
      }
      findNotebookDocumentForCell(cell) {
        const key2 = typeof cell === "string" ? cell : cell.document;
        const value = this.notebookCellMap.get(key2);
        return value && value[1];
      }
      get onDidOpen() {
        return this._onDidOpen.event;
      }
      get onDidSave() {
        return this._onDidSave.event;
      }
      get onDidChange() {
        return this._onDidChange.event;
      }
      get onDidClose() {
        return this._onDidClose.event;
      }
      /**
       * Listens for `low level` notification on the given connection to
       * update the notebook documents managed by this instance.
       *
       * Please note that the connection only provides handlers not an event model. Therefore
       * listening on a connection will overwrite the following handlers on a connection:
       * `onDidOpenNotebookDocument`, `onDidChangeNotebookDocument`, `onDidSaveNotebookDocument`,
       *  and `onDidCloseNotebookDocument`.
       *
       * @param connection The connection to listen on.
       */
      listen(connection2) {
        const cellTextDocumentConnection = new CellTextDocumentConnection();
        const disposables = [];
        disposables.push(this.cellTextDocuments.listen(cellTextDocumentConnection));
        disposables.push(connection2.notebooks.synchronization.onDidOpenNotebookDocument((params) => {
          this.notebookDocuments.set(params.notebookDocument.uri, params.notebookDocument);
          for (const cellTextDocument of params.cellTextDocuments) {
            cellTextDocumentConnection.openTextDocument({ textDocument: cellTextDocument });
          }
          this.updateCellMap(params.notebookDocument);
          this._onDidOpen.fire(params.notebookDocument);
        }));
        disposables.push(connection2.notebooks.synchronization.onDidChangeNotebookDocument((params) => {
          const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
          if (notebookDocument === void 0) {
            return;
          }
          notebookDocument.version = params.notebookDocument.version;
          const oldMetadata = notebookDocument.metadata;
          let metadataChanged = false;
          const change = params.change;
          if (change.metadata !== void 0) {
            metadataChanged = true;
            notebookDocument.metadata = change.metadata;
          }
          const opened = [];
          const closed = [];
          const data = [];
          const text = [];
          if (change.cells !== void 0) {
            const changedCells = change.cells;
            if (changedCells.structure !== void 0) {
              const array = changedCells.structure.array;
              notebookDocument.cells.splice(array.start, array.deleteCount, ...array.cells !== void 0 ? array.cells : []);
              if (changedCells.structure.didOpen !== void 0) {
                for (const open of changedCells.structure.didOpen) {
                  cellTextDocumentConnection.openTextDocument({ textDocument: open });
                  opened.push(open.uri);
                }
              }
              if (changedCells.structure.didClose) {
                for (const close of changedCells.structure.didClose) {
                  cellTextDocumentConnection.closeTextDocument({ textDocument: close });
                  closed.push(close.uri);
                }
              }
            }
            if (changedCells.data !== void 0) {
              const cellUpdates = new Map(changedCells.data.map((cell) => [cell.document, cell]));
              for (let i = 0; i <= notebookDocument.cells.length; i++) {
                const change2 = cellUpdates.get(notebookDocument.cells[i].document);
                if (change2 !== void 0) {
                  const old = notebookDocument.cells.splice(i, 1, change2);
                  data.push({ old: old[0], new: change2 });
                  cellUpdates.delete(change2.document);
                  if (cellUpdates.size === 0) {
                    break;
                  }
                }
              }
            }
            if (changedCells.textContent !== void 0) {
              for (const cellTextDocument of changedCells.textContent) {
                cellTextDocumentConnection.changeTextDocument({ textDocument: cellTextDocument.document, contentChanges: cellTextDocument.changes });
                text.push(cellTextDocument.document.uri);
              }
            }
          }
          this.updateCellMap(notebookDocument);
          const changeEvent = { notebookDocument };
          if (metadataChanged) {
            changeEvent.metadata = { old: oldMetadata, new: notebookDocument.metadata };
          }
          const added = [];
          for (const open of opened) {
            added.push(this.getNotebookCell(open));
          }
          const removed = [];
          for (const close of closed) {
            removed.push(this.getNotebookCell(close));
          }
          const textContent = [];
          for (const change2 of text) {
            textContent.push(this.getNotebookCell(change2));
          }
          if (added.length > 0 || removed.length > 0 || data.length > 0 || textContent.length > 0) {
            changeEvent.cells = { added, removed, changed: { data, textContent } };
          }
          if (changeEvent.metadata !== void 0 || changeEvent.cells !== void 0) {
            this._onDidChange.fire(changeEvent);
          }
        }));
        disposables.push(connection2.notebooks.synchronization.onDidSaveNotebookDocument((params) => {
          const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
          if (notebookDocument === void 0) {
            return;
          }
          this._onDidSave.fire(notebookDocument);
        }));
        disposables.push(connection2.notebooks.synchronization.onDidCloseNotebookDocument((params) => {
          const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
          if (notebookDocument === void 0) {
            return;
          }
          this._onDidClose.fire(notebookDocument);
          for (const cellTextDocument of params.cellTextDocuments) {
            cellTextDocumentConnection.closeTextDocument({ textDocument: cellTextDocument });
          }
          this.notebookDocuments.delete(params.notebookDocument.uri);
          for (const cell of notebookDocument.cells) {
            this.notebookCellMap.delete(cell.document);
          }
        }));
        return vscode_languageserver_protocol_1.Disposable.create(() => {
          disposables.forEach((disposable) => disposable.dispose());
        });
      }
      updateCellMap(notebookDocument) {
        for (const cell of notebookDocument.cells) {
          this.notebookCellMap.set(cell.document, [cell, notebookDocument]);
        }
      }
    };
    exports2.NotebookDocuments = NotebookDocuments;
  }
});

// node_modules/vscode-languageserver/lib/common/moniker.js
var require_moniker = __commonJS({
  "node_modules/vscode-languageserver/lib/common/moniker.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MonikerFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var MonikerFeature = (Base) => {
      return class extends Base {
        get moniker() {
          return {
            on: (handler) => {
              const type = vscode_languageserver_protocol_1.MonikerRequest.type;
              return this.connection.onRequest(type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
              });
            }
          };
        }
      };
    };
    exports2.MonikerFeature = MonikerFeature;
  }
});

// node_modules/vscode-languageserver/lib/common/server.js
var require_server = __commonJS({
  "node_modules/vscode-languageserver/lib/common/server.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createConnection = exports2.combineFeatures = exports2.combineNotebooksFeatures = exports2.combineLanguagesFeatures = exports2.combineWorkspaceFeatures = exports2.combineWindowFeatures = exports2.combineClientFeatures = exports2.combineTracerFeatures = exports2.combineTelemetryFeatures = exports2.combineConsoleFeatures = exports2._NotebooksImpl = exports2._LanguagesImpl = exports2.BulkUnregistration = exports2.BulkRegistration = exports2.ErrorMessageTracker = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var Is = require_is();
    var UUID = require_uuid();
    var progress_1 = require_progress();
    var configuration_1 = require_configuration();
    var workspaceFolder_1 = require_workspaceFolder();
    var callHierarchy_1 = require_callHierarchy();
    var semanticTokens_1 = require_semanticTokens();
    var showDocument_1 = require_showDocument();
    var fileOperations_1 = require_fileOperations();
    var linkedEditingRange_1 = require_linkedEditingRange();
    var typeHierarchy_1 = require_typeHierarchy();
    var inlineValue_1 = require_inlineValue();
    var foldingRange_1 = require_foldingRange();
    var inlayHint_1 = require_inlayHint();
    var diagnostic_1 = require_diagnostic();
    var notebook_1 = require_notebook();
    var moniker_1 = require_moniker();
    function null2Undefined(value) {
      if (value === null) {
        return void 0;
      }
      return value;
    }
    var ErrorMessageTracker = class {
      constructor() {
        this._messages = /* @__PURE__ */ Object.create(null);
      }
      /**
       * Add a message to the tracker.
       *
       * @param message The message to add.
       */
      add(message) {
        let count = this._messages[message];
        if (!count) {
          count = 0;
        }
        count++;
        this._messages[message] = count;
      }
      /**
       * Send all tracked messages to the connection's window.
       *
       * @param connection The connection established between client and server.
       */
      sendErrors(connection2) {
        Object.keys(this._messages).forEach((message) => {
          connection2.window.showErrorMessage(message);
        });
      }
    };
    exports2.ErrorMessageTracker = ErrorMessageTracker;
    var RemoteConsoleImpl = class {
      constructor() {
      }
      rawAttach(connection2) {
        this._rawConnection = connection2;
      }
      attach(connection2) {
        this._connection = connection2;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      fillServerCapabilities(_capabilities) {
      }
      initialize(_capabilities) {
      }
      error(message) {
        this.send(vscode_languageserver_protocol_1.MessageType.Error, message);
      }
      warn(message) {
        this.send(vscode_languageserver_protocol_1.MessageType.Warning, message);
      }
      info(message) {
        this.send(vscode_languageserver_protocol_1.MessageType.Info, message);
      }
      log(message) {
        this.send(vscode_languageserver_protocol_1.MessageType.Log, message);
      }
      debug(message) {
        this.send(vscode_languageserver_protocol_1.MessageType.Debug, message);
      }
      send(type, message) {
        if (this._rawConnection) {
          this._rawConnection.sendNotification(vscode_languageserver_protocol_1.LogMessageNotification.type, { type, message }).catch(() => {
            (0, vscode_languageserver_protocol_1.RAL)().console.error(`Sending log message failed`);
          });
        }
      }
    };
    var _RemoteWindowImpl = class {
      constructor() {
      }
      attach(connection2) {
        this._connection = connection2;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      showErrorMessage(message, ...actions) {
        let params = { type: vscode_languageserver_protocol_1.MessageType.Error, message, actions };
        return this.connection.sendRequest(vscode_languageserver_protocol_1.ShowMessageRequest.type, params).then(null2Undefined);
      }
      showWarningMessage(message, ...actions) {
        let params = { type: vscode_languageserver_protocol_1.MessageType.Warning, message, actions };
        return this.connection.sendRequest(vscode_languageserver_protocol_1.ShowMessageRequest.type, params).then(null2Undefined);
      }
      showInformationMessage(message, ...actions) {
        let params = { type: vscode_languageserver_protocol_1.MessageType.Info, message, actions };
        return this.connection.sendRequest(vscode_languageserver_protocol_1.ShowMessageRequest.type, params).then(null2Undefined);
      }
    };
    var RemoteWindowImpl = (0, showDocument_1.ShowDocumentFeature)((0, progress_1.ProgressFeature)(_RemoteWindowImpl));
    var BulkRegistration;
    (function(BulkRegistration2) {
      function create() {
        return new BulkRegistrationImpl();
      }
      BulkRegistration2.create = create;
    })(BulkRegistration || (exports2.BulkRegistration = BulkRegistration = {}));
    var BulkRegistrationImpl = class {
      constructor() {
        this._registrations = [];
        this._registered = /* @__PURE__ */ new Set();
      }
      add(type, registerOptions) {
        const method = Is.string(type) ? type : type.method;
        if (this._registered.has(method)) {
          throw new Error(`${method} is already added to this registration`);
        }
        const id = UUID.generateUuid();
        this._registrations.push({
          id,
          method,
          registerOptions: registerOptions || {}
        });
        this._registered.add(method);
      }
      asRegistrationParams() {
        return {
          registrations: this._registrations
        };
      }
    };
    var BulkUnregistration;
    (function(BulkUnregistration2) {
      function create() {
        return new BulkUnregistrationImpl(void 0, []);
      }
      BulkUnregistration2.create = create;
    })(BulkUnregistration || (exports2.BulkUnregistration = BulkUnregistration = {}));
    var BulkUnregistrationImpl = class {
      constructor(_connection, unregistrations) {
        this._connection = _connection;
        this._unregistrations = /* @__PURE__ */ new Map();
        unregistrations.forEach((unregistration) => {
          this._unregistrations.set(unregistration.method, unregistration);
        });
      }
      get isAttached() {
        return !!this._connection;
      }
      attach(connection2) {
        this._connection = connection2;
      }
      add(unregistration) {
        this._unregistrations.set(unregistration.method, unregistration);
      }
      dispose() {
        let unregistrations = [];
        for (let unregistration of this._unregistrations.values()) {
          unregistrations.push(unregistration);
        }
        let params = {
          unregisterations: unregistrations
        };
        this._connection.sendRequest(vscode_languageserver_protocol_1.UnregistrationRequest.type, params).catch(() => {
          this._connection.console.info(`Bulk unregistration failed.`);
        });
      }
      disposeSingle(arg) {
        const method = Is.string(arg) ? arg : arg.method;
        const unregistration = this._unregistrations.get(method);
        if (!unregistration) {
          return false;
        }
        let params = {
          unregisterations: [unregistration]
        };
        this._connection.sendRequest(vscode_languageserver_protocol_1.UnregistrationRequest.type, params).then(() => {
          this._unregistrations.delete(method);
        }, (_error) => {
          this._connection.console.info(`Un-registering request handler for ${unregistration.id} failed.`);
        });
        return true;
      }
    };
    var RemoteClientImpl = class {
      attach(connection2) {
        this._connection = connection2;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      register(typeOrRegistrations, registerOptionsOrType, registerOptions) {
        if (typeOrRegistrations instanceof BulkRegistrationImpl) {
          return this.registerMany(typeOrRegistrations);
        } else if (typeOrRegistrations instanceof BulkUnregistrationImpl) {
          return this.registerSingle1(typeOrRegistrations, registerOptionsOrType, registerOptions);
        } else {
          return this.registerSingle2(typeOrRegistrations, registerOptionsOrType);
        }
      }
      registerSingle1(unregistration, type, registerOptions) {
        const method = Is.string(type) ? type : type.method;
        const id = UUID.generateUuid();
        let params = {
          registrations: [{ id, method, registerOptions: registerOptions || {} }]
        };
        if (!unregistration.isAttached) {
          unregistration.attach(this.connection);
        }
        return this.connection.sendRequest(vscode_languageserver_protocol_1.RegistrationRequest.type, params).then((_result) => {
          unregistration.add({ id, method });
          return unregistration;
        }, (_error) => {
          this.connection.console.info(`Registering request handler for ${method} failed.`);
          return Promise.reject(_error);
        });
      }
      registerSingle2(type, registerOptions) {
        const method = Is.string(type) ? type : type.method;
        const id = UUID.generateUuid();
        let params = {
          registrations: [{ id, method, registerOptions: registerOptions || {} }]
        };
        return this.connection.sendRequest(vscode_languageserver_protocol_1.RegistrationRequest.type, params).then((_result) => {
          return vscode_languageserver_protocol_1.Disposable.create(() => {
            this.unregisterSingle(id, method).catch(() => {
              this.connection.console.info(`Un-registering capability with id ${id} failed.`);
            });
          });
        }, (_error) => {
          this.connection.console.info(`Registering request handler for ${method} failed.`);
          return Promise.reject(_error);
        });
      }
      unregisterSingle(id, method) {
        let params = {
          unregisterations: [{ id, method }]
        };
        return this.connection.sendRequest(vscode_languageserver_protocol_1.UnregistrationRequest.type, params).catch(() => {
          this.connection.console.info(`Un-registering request handler for ${id} failed.`);
        });
      }
      registerMany(registrations) {
        let params = registrations.asRegistrationParams();
        return this.connection.sendRequest(vscode_languageserver_protocol_1.RegistrationRequest.type, params).then(() => {
          return new BulkUnregistrationImpl(this._connection, params.registrations.map((registration) => {
            return { id: registration.id, method: registration.method };
          }));
        }, (_error) => {
          this.connection.console.info(`Bulk registration failed.`);
          return Promise.reject(_error);
        });
      }
    };
    var _RemoteWorkspaceImpl = class {
      constructor() {
      }
      attach(connection2) {
        this._connection = connection2;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      applyEdit(paramOrEdit) {
        function isApplyWorkspaceEditParams(value) {
          return value && !!value.edit;
        }
        let params = isApplyWorkspaceEditParams(paramOrEdit) ? paramOrEdit : { edit: paramOrEdit };
        return this.connection.sendRequest(vscode_languageserver_protocol_1.ApplyWorkspaceEditRequest.type, params);
      }
    };
    var RemoteWorkspaceImpl = (0, fileOperations_1.FileOperationsFeature)((0, workspaceFolder_1.WorkspaceFoldersFeature)((0, configuration_1.ConfigurationFeature)(_RemoteWorkspaceImpl)));
    var TracerImpl = class {
      constructor() {
        this._trace = vscode_languageserver_protocol_1.Trace.Off;
      }
      attach(connection2) {
        this._connection = connection2;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      set trace(value) {
        this._trace = value;
      }
      log(message, verbose) {
        if (this._trace === vscode_languageserver_protocol_1.Trace.Off) {
          return;
        }
        this.connection.sendNotification(vscode_languageserver_protocol_1.LogTraceNotification.type, {
          message,
          verbose: this._trace === vscode_languageserver_protocol_1.Trace.Verbose ? verbose : void 0
        }).catch(() => {
        });
      }
    };
    var TelemetryImpl = class {
      constructor() {
      }
      attach(connection2) {
        this._connection = connection2;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      logEvent(data) {
        this.connection.sendNotification(vscode_languageserver_protocol_1.TelemetryEventNotification.type, data).catch(() => {
          this.connection.console.log(`Sending TelemetryEventNotification failed`);
        });
      }
    };
    var _LanguagesImpl = class {
      constructor() {
      }
      attach(connection2) {
        this._connection = connection2;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      attachWorkDoneProgress(params) {
        return (0, progress_1.attachWorkDone)(this.connection, params);
      }
      attachPartialResultProgress(_type, params) {
        return (0, progress_1.attachPartialResult)(this.connection, params);
      }
    };
    exports2._LanguagesImpl = _LanguagesImpl;
    var LanguagesImpl = (0, foldingRange_1.FoldingRangeFeature)((0, moniker_1.MonikerFeature)((0, diagnostic_1.DiagnosticFeature)((0, inlayHint_1.InlayHintFeature)((0, inlineValue_1.InlineValueFeature)((0, typeHierarchy_1.TypeHierarchyFeature)((0, linkedEditingRange_1.LinkedEditingRangeFeature)((0, semanticTokens_1.SemanticTokensFeature)((0, callHierarchy_1.CallHierarchyFeature)(_LanguagesImpl)))))))));
    var _NotebooksImpl = class {
      constructor() {
      }
      attach(connection2) {
        this._connection = connection2;
      }
      get connection() {
        if (!this._connection) {
          throw new Error("Remote is not attached to a connection yet.");
        }
        return this._connection;
      }
      initialize(_capabilities) {
      }
      fillServerCapabilities(_capabilities) {
      }
      attachWorkDoneProgress(params) {
        return (0, progress_1.attachWorkDone)(this.connection, params);
      }
      attachPartialResultProgress(_type, params) {
        return (0, progress_1.attachPartialResult)(this.connection, params);
      }
    };
    exports2._NotebooksImpl = _NotebooksImpl;
    var NotebooksImpl = (0, notebook_1.NotebookSyncFeature)(_NotebooksImpl);
    function combineConsoleFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineConsoleFeatures = combineConsoleFeatures;
    function combineTelemetryFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineTelemetryFeatures = combineTelemetryFeatures;
    function combineTracerFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineTracerFeatures = combineTracerFeatures;
    function combineClientFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineClientFeatures = combineClientFeatures;
    function combineWindowFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineWindowFeatures = combineWindowFeatures;
    function combineWorkspaceFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineWorkspaceFeatures = combineWorkspaceFeatures;
    function combineLanguagesFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineLanguagesFeatures = combineLanguagesFeatures;
    function combineNotebooksFeatures(one, two) {
      return function(Base) {
        return two(one(Base));
      };
    }
    exports2.combineNotebooksFeatures = combineNotebooksFeatures;
    function combineFeatures(one, two) {
      function combine(one2, two2, func) {
        if (one2 && two2) {
          return func(one2, two2);
        } else if (one2) {
          return one2;
        } else {
          return two2;
        }
      }
      let result = {
        __brand: "features",
        console: combine(one.console, two.console, combineConsoleFeatures),
        tracer: combine(one.tracer, two.tracer, combineTracerFeatures),
        telemetry: combine(one.telemetry, two.telemetry, combineTelemetryFeatures),
        client: combine(one.client, two.client, combineClientFeatures),
        window: combine(one.window, two.window, combineWindowFeatures),
        workspace: combine(one.workspace, two.workspace, combineWorkspaceFeatures),
        languages: combine(one.languages, two.languages, combineLanguagesFeatures),
        notebooks: combine(one.notebooks, two.notebooks, combineNotebooksFeatures)
      };
      return result;
    }
    exports2.combineFeatures = combineFeatures;
    function createConnection2(connectionFactory, watchDog, factories) {
      const logger = factories && factories.console ? new (factories.console(RemoteConsoleImpl))() : new RemoteConsoleImpl();
      const connection2 = connectionFactory(logger);
      logger.rawAttach(connection2);
      const tracer = factories && factories.tracer ? new (factories.tracer(TracerImpl))() : new TracerImpl();
      const telemetry = factories && factories.telemetry ? new (factories.telemetry(TelemetryImpl))() : new TelemetryImpl();
      const client = factories && factories.client ? new (factories.client(RemoteClientImpl))() : new RemoteClientImpl();
      const remoteWindow = factories && factories.window ? new (factories.window(RemoteWindowImpl))() : new RemoteWindowImpl();
      const workspace = factories && factories.workspace ? new (factories.workspace(RemoteWorkspaceImpl))() : new RemoteWorkspaceImpl();
      const languages = factories && factories.languages ? new (factories.languages(LanguagesImpl))() : new LanguagesImpl();
      const notebooks = factories && factories.notebooks ? new (factories.notebooks(NotebooksImpl))() : new NotebooksImpl();
      const allRemotes = [logger, tracer, telemetry, client, remoteWindow, workspace, languages, notebooks];
      function asPromise(value) {
        if (value instanceof Promise) {
          return value;
        } else if (Is.thenable(value)) {
          return new Promise((resolve4, reject) => {
            value.then((resolved) => resolve4(resolved), (error) => reject(error));
          });
        } else {
          return Promise.resolve(value);
        }
      }
      let shutdownHandler = void 0;
      let initializeHandler = void 0;
      let exitHandler = void 0;
      let protocolConnection = {
        listen: () => connection2.listen(),
        sendRequest: (type, ...params) => connection2.sendRequest(Is.string(type) ? type : type.method, ...params),
        onRequest: (type, handler) => connection2.onRequest(type, handler),
        sendNotification: (type, param) => {
          const method = Is.string(type) ? type : type.method;
          return connection2.sendNotification(method, param);
        },
        onNotification: (type, handler) => connection2.onNotification(type, handler),
        onProgress: connection2.onProgress,
        sendProgress: connection2.sendProgress,
        onInitialize: (handler) => {
          initializeHandler = handler;
          return {
            dispose: () => {
              initializeHandler = void 0;
            }
          };
        },
        onInitialized: (handler) => connection2.onNotification(vscode_languageserver_protocol_1.InitializedNotification.type, handler),
        onShutdown: (handler) => {
          shutdownHandler = handler;
          return {
            dispose: () => {
              shutdownHandler = void 0;
            }
          };
        },
        onExit: (handler) => {
          exitHandler = handler;
          return {
            dispose: () => {
              exitHandler = void 0;
            }
          };
        },
        get console() {
          return logger;
        },
        get telemetry() {
          return telemetry;
        },
        get tracer() {
          return tracer;
        },
        get client() {
          return client;
        },
        get window() {
          return remoteWindow;
        },
        get workspace() {
          return workspace;
        },
        get languages() {
          return languages;
        },
        get notebooks() {
          return notebooks;
        },
        onDidChangeConfiguration: (handler) => connection2.onNotification(vscode_languageserver_protocol_1.DidChangeConfigurationNotification.type, handler),
        onDidChangeWatchedFiles: (handler) => connection2.onNotification(vscode_languageserver_protocol_1.DidChangeWatchedFilesNotification.type, handler),
        __textDocumentSync: void 0,
        onDidOpenTextDocument: (handler) => connection2.onNotification(vscode_languageserver_protocol_1.DidOpenTextDocumentNotification.type, handler),
        onDidChangeTextDocument: (handler) => connection2.onNotification(vscode_languageserver_protocol_1.DidChangeTextDocumentNotification.type, handler),
        onDidCloseTextDocument: (handler) => connection2.onNotification(vscode_languageserver_protocol_1.DidCloseTextDocumentNotification.type, handler),
        onWillSaveTextDocument: (handler) => connection2.onNotification(vscode_languageserver_protocol_1.WillSaveTextDocumentNotification.type, handler),
        onWillSaveTextDocumentWaitUntil: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.WillSaveTextDocumentWaitUntilRequest.type, handler),
        onDidSaveTextDocument: (handler) => connection2.onNotification(vscode_languageserver_protocol_1.DidSaveTextDocumentNotification.type, handler),
        sendDiagnostics: (params) => connection2.sendNotification(vscode_languageserver_protocol_1.PublishDiagnosticsNotification.type, params),
        onHover: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.HoverRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), void 0);
        }),
        onCompletion: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.CompletionRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onCompletionResolve: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.CompletionResolveRequest.type, handler),
        onSignatureHelp: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.SignatureHelpRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), void 0);
        }),
        onDeclaration: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.DeclarationRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onDefinition: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.DefinitionRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onTypeDefinition: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.TypeDefinitionRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onImplementation: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.ImplementationRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onReferences: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.ReferencesRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onDocumentHighlight: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.DocumentHighlightRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onDocumentSymbol: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.DocumentSymbolRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onWorkspaceSymbol: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.WorkspaceSymbolRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onWorkspaceSymbolResolve: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.WorkspaceSymbolResolveRequest.type, handler),
        onCodeAction: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.CodeActionRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onCodeActionResolve: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.CodeActionResolveRequest.type, (params, cancel) => {
          return handler(params, cancel);
        }),
        onCodeLens: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.CodeLensRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onCodeLensResolve: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.CodeLensResolveRequest.type, (params, cancel) => {
          return handler(params, cancel);
        }),
        onDocumentFormatting: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.DocumentFormattingRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), void 0);
        }),
        onDocumentRangeFormatting: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.DocumentRangeFormattingRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), void 0);
        }),
        onDocumentOnTypeFormatting: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.DocumentOnTypeFormattingRequest.type, (params, cancel) => {
          return handler(params, cancel);
        }),
        onRenameRequest: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.RenameRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), void 0);
        }),
        onPrepareRename: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.PrepareRenameRequest.type, (params, cancel) => {
          return handler(params, cancel);
        }),
        onDocumentLinks: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.DocumentLinkRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onDocumentLinkResolve: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.DocumentLinkResolveRequest.type, (params, cancel) => {
          return handler(params, cancel);
        }),
        onDocumentColor: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.DocumentColorRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onColorPresentation: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.ColorPresentationRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onFoldingRanges: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.FoldingRangeRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onSelectionRanges: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.SelectionRangeRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), (0, progress_1.attachPartialResult)(connection2, params));
        }),
        onExecuteCommand: (handler) => connection2.onRequest(vscode_languageserver_protocol_1.ExecuteCommandRequest.type, (params, cancel) => {
          return handler(params, cancel, (0, progress_1.attachWorkDone)(connection2, params), void 0);
        }),
        dispose: () => connection2.dispose()
      };
      for (let remote of allRemotes) {
        remote.attach(protocolConnection);
      }
      connection2.onRequest(vscode_languageserver_protocol_1.InitializeRequest.type, (params) => {
        watchDog.initialize(params);
        if (Is.string(params.trace)) {
          tracer.trace = vscode_languageserver_protocol_1.Trace.fromString(params.trace);
        }
        for (let remote of allRemotes) {
          remote.initialize(params.capabilities);
        }
        if (initializeHandler) {
          let result = initializeHandler(params, new vscode_languageserver_protocol_1.CancellationTokenSource().token, (0, progress_1.attachWorkDone)(connection2, params), void 0);
          return asPromise(result).then((value) => {
            if (value instanceof vscode_languageserver_protocol_1.ResponseError) {
              return value;
            }
            let result2 = value;
            if (!result2) {
              result2 = { capabilities: {} };
            }
            let capabilities = result2.capabilities;
            if (!capabilities) {
              capabilities = {};
              result2.capabilities = capabilities;
            }
            if (capabilities.textDocumentSync === void 0 || capabilities.textDocumentSync === null) {
              capabilities.textDocumentSync = Is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : vscode_languageserver_protocol_1.TextDocumentSyncKind.None;
            } else if (!Is.number(capabilities.textDocumentSync) && !Is.number(capabilities.textDocumentSync.change)) {
              capabilities.textDocumentSync.change = Is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : vscode_languageserver_protocol_1.TextDocumentSyncKind.None;
            }
            for (let remote of allRemotes) {
              remote.fillServerCapabilities(capabilities);
            }
            return result2;
          });
        } else {
          let result = { capabilities: { textDocumentSync: vscode_languageserver_protocol_1.TextDocumentSyncKind.None } };
          for (let remote of allRemotes) {
            remote.fillServerCapabilities(result.capabilities);
          }
          return result;
        }
      });
      connection2.onRequest(vscode_languageserver_protocol_1.ShutdownRequest.type, () => {
        watchDog.shutdownReceived = true;
        if (shutdownHandler) {
          return shutdownHandler(new vscode_languageserver_protocol_1.CancellationTokenSource().token);
        } else {
          return void 0;
        }
      });
      connection2.onNotification(vscode_languageserver_protocol_1.ExitNotification.type, () => {
        try {
          if (exitHandler) {
            exitHandler();
          }
        } finally {
          if (watchDog.shutdownReceived) {
            watchDog.exit(0);
          } else {
            watchDog.exit(1);
          }
        }
      });
      connection2.onNotification(vscode_languageserver_protocol_1.SetTraceNotification.type, (params) => {
        tracer.trace = vscode_languageserver_protocol_1.Trace.fromString(params.value);
      });
      return protocolConnection;
    }
    exports2.createConnection = createConnection2;
  }
});

// node_modules/vscode-languageserver/lib/node/files.js
var require_files = __commonJS({
  "node_modules/vscode-languageserver/lib/node/files.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.resolveModulePath = exports2.FileSystem = exports2.resolveGlobalYarnPath = exports2.resolveGlobalNodePath = exports2.resolve = exports2.uriToFilePath = void 0;
    var url = require("url");
    var path8 = require("path");
    var fs = require("fs");
    var child_process_1 = require("child_process");
    function uriToFilePath(uri) {
      let parsed = url.parse(uri);
      if (parsed.protocol !== "file:" || !parsed.path) {
        return void 0;
      }
      let segments = parsed.path.split("/");
      for (var i = 0, len = segments.length; i < len; i++) {
        segments[i] = decodeURIComponent(segments[i]);
      }
      if (process.platform === "win32" && segments.length > 1) {
        let first = segments[0];
        let second = segments[1];
        if (first.length === 0 && second.length > 1 && second[1] === ":") {
          segments.shift();
        }
      }
      return path8.normalize(segments.join("/"));
    }
    exports2.uriToFilePath = uriToFilePath;
    function isWindows() {
      return process.platform === "win32";
    }
    function resolve4(moduleName, nodePath, cwd, tracer) {
      const nodePathKey = "NODE_PATH";
      const app = [
        "var p = process;",
        "p.on('message',function(m){",
        "if(m.c==='e'){",
        "p.exit(0);",
        "}",
        "else if(m.c==='rs'){",
        "try{",
        "var r=require.resolve(m.a);",
        "p.send({c:'r',s:true,r:r});",
        "}",
        "catch(err){",
        "p.send({c:'r',s:false});",
        "}",
        "}",
        "});"
      ].join("");
      return new Promise((resolve5, reject) => {
        let env = process.env;
        let newEnv = /* @__PURE__ */ Object.create(null);
        Object.keys(env).forEach((key2) => newEnv[key2] = env[key2]);
        if (nodePath && fs.existsSync(nodePath)) {
          if (newEnv[nodePathKey]) {
            newEnv[nodePathKey] = nodePath + path8.delimiter + newEnv[nodePathKey];
          } else {
            newEnv[nodePathKey] = nodePath;
          }
          if (tracer) {
            tracer(`NODE_PATH value is: ${newEnv[nodePathKey]}`);
          }
        }
        newEnv["ELECTRON_RUN_AS_NODE"] = "1";
        try {
          let cp = (0, child_process_1.fork)("", [], {
            cwd,
            env: newEnv,
            execArgv: ["-e", app]
          });
          if (cp.pid === void 0) {
            reject(new Error(`Starting process to resolve node module  ${moduleName} failed`));
            return;
          }
          cp.on("error", (error) => {
            reject(error);
          });
          cp.on("message", (message2) => {
            if (message2.c === "r") {
              cp.send({ c: "e" });
              if (message2.s) {
                resolve5(message2.r);
              } else {
                reject(new Error(`Failed to resolve module: ${moduleName}`));
              }
            }
          });
          let message = {
            c: "rs",
            a: moduleName
          };
          cp.send(message);
        } catch (error) {
          reject(error);
        }
      });
    }
    exports2.resolve = resolve4;
    function resolveGlobalNodePath(tracer) {
      let npmCommand = "npm";
      const env = /* @__PURE__ */ Object.create(null);
      Object.keys(process.env).forEach((key2) => env[key2] = process.env[key2]);
      env["NO_UPDATE_NOTIFIER"] = "true";
      const options = {
        encoding: "utf8",
        env
      };
      if (isWindows()) {
        npmCommand = "npm.cmd";
        options.shell = true;
      }
      let handler = () => {
      };
      try {
        process.on("SIGPIPE", handler);
        let stdout = (0, child_process_1.spawnSync)(npmCommand, ["config", "get", "prefix"], options).stdout;
        if (!stdout) {
          if (tracer) {
            tracer(`'npm config get prefix' didn't return a value.`);
          }
          return void 0;
        }
        let prefix = stdout.trim();
        if (tracer) {
          tracer(`'npm config get prefix' value is: ${prefix}`);
        }
        if (prefix.length > 0) {
          if (isWindows()) {
            return path8.join(prefix, "node_modules");
          } else {
            return path8.join(prefix, "lib", "node_modules");
          }
        }
        return void 0;
      } catch (err) {
        return void 0;
      } finally {
        process.removeListener("SIGPIPE", handler);
      }
    }
    exports2.resolveGlobalNodePath = resolveGlobalNodePath;
    function resolveGlobalYarnPath(tracer) {
      let yarnCommand = "yarn";
      let options = {
        encoding: "utf8"
      };
      if (isWindows()) {
        yarnCommand = "yarn.cmd";
        options.shell = true;
      }
      let handler = () => {
      };
      try {
        process.on("SIGPIPE", handler);
        let results = (0, child_process_1.spawnSync)(yarnCommand, ["global", "dir", "--json"], options);
        let stdout = results.stdout;
        if (!stdout) {
          if (tracer) {
            tracer(`'yarn global dir' didn't return a value.`);
            if (results.stderr) {
              tracer(results.stderr);
            }
          }
          return void 0;
        }
        let lines = stdout.trim().split(/\r?\n/);
        for (let line of lines) {
          try {
            let yarn = JSON.parse(line);
            if (yarn.type === "log") {
              return path8.join(yarn.data, "node_modules");
            }
          } catch (e) {
          }
        }
        return void 0;
      } catch (err) {
        return void 0;
      } finally {
        process.removeListener("SIGPIPE", handler);
      }
    }
    exports2.resolveGlobalYarnPath = resolveGlobalYarnPath;
    var FileSystem;
    (function(FileSystem2) {
      let _isCaseSensitive = void 0;
      function isCaseSensitive() {
        if (_isCaseSensitive !== void 0) {
          return _isCaseSensitive;
        }
        if (process.platform === "win32") {
          _isCaseSensitive = false;
        } else {
          _isCaseSensitive = !fs.existsSync(__filename.toUpperCase()) || !fs.existsSync(__filename.toLowerCase());
        }
        return _isCaseSensitive;
      }
      FileSystem2.isCaseSensitive = isCaseSensitive;
      function isParent(parent, child) {
        if (isCaseSensitive()) {
          return path8.normalize(child).indexOf(path8.normalize(parent)) === 0;
        } else {
          return path8.normalize(child).toLowerCase().indexOf(path8.normalize(parent).toLowerCase()) === 0;
        }
      }
      FileSystem2.isParent = isParent;
    })(FileSystem || (exports2.FileSystem = FileSystem = {}));
    function resolveModulePath(workspaceRoot, moduleName, nodePath, tracer) {
      if (nodePath) {
        if (!path8.isAbsolute(nodePath)) {
          nodePath = path8.join(workspaceRoot, nodePath);
        }
        return resolve4(moduleName, nodePath, nodePath, tracer).then((value) => {
          if (FileSystem.isParent(nodePath, value)) {
            return value;
          } else {
            return Promise.reject(new Error(`Failed to load ${moduleName} from node path location.`));
          }
        }).then(void 0, (_error) => {
          return resolve4(moduleName, resolveGlobalNodePath(tracer), workspaceRoot, tracer);
        });
      } else {
        return resolve4(moduleName, resolveGlobalNodePath(tracer), workspaceRoot, tracer);
      }
    }
    exports2.resolveModulePath = resolveModulePath;
  }
});

// node_modules/vscode-languageserver-protocol/node.js
var require_node2 = __commonJS({
  "node_modules/vscode-languageserver-protocol/node.js"(exports2, module2) {
    "use strict";
    module2.exports = require_main3();
  }
});

// node_modules/vscode-languageserver/lib/common/inlineCompletion.proposed.js
var require_inlineCompletion_proposed = __commonJS({
  "node_modules/vscode-languageserver/lib/common/inlineCompletion.proposed.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InlineCompletionFeature = void 0;
    var vscode_languageserver_protocol_1 = require_main3();
    var InlineCompletionFeature = (Base) => {
      return class extends Base {
        get inlineCompletion() {
          return {
            on: (handler) => {
              return this.connection.onRequest(vscode_languageserver_protocol_1.InlineCompletionRequest.type, (params, cancel) => {
                return handler(params, cancel, this.attachWorkDoneProgress(params));
              });
            }
          };
        }
      };
    };
    exports2.InlineCompletionFeature = InlineCompletionFeature;
  }
});

// node_modules/vscode-languageserver/lib/common/api.js
var require_api3 = __commonJS({
  "node_modules/vscode-languageserver/lib/common/api.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProposedFeatures = exports2.NotebookDocuments = exports2.TextDocuments = exports2.SemanticTokensBuilder = void 0;
    var semanticTokens_1 = require_semanticTokens();
    Object.defineProperty(exports2, "SemanticTokensBuilder", { enumerable: true, get: function() {
      return semanticTokens_1.SemanticTokensBuilder;
    } });
    var ic = require_inlineCompletion_proposed();
    __exportStar(require_main3(), exports2);
    var textDocuments_1 = require_textDocuments();
    Object.defineProperty(exports2, "TextDocuments", { enumerable: true, get: function() {
      return textDocuments_1.TextDocuments;
    } });
    var notebook_1 = require_notebook();
    Object.defineProperty(exports2, "NotebookDocuments", { enumerable: true, get: function() {
      return notebook_1.NotebookDocuments;
    } });
    __exportStar(require_server(), exports2);
    var ProposedFeatures2;
    (function(ProposedFeatures3) {
      ProposedFeatures3.all = {
        __brand: "features",
        languages: ic.InlineCompletionFeature
      };
    })(ProposedFeatures2 || (exports2.ProposedFeatures = ProposedFeatures2 = {}));
  }
});

// node_modules/vscode-languageserver/lib/node/main.js
var require_main4 = __commonJS({
  "node_modules/vscode-languageserver/lib/node/main.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createConnection = exports2.Files = void 0;
    var node_util_1 = require("node:util");
    var Is = require_is();
    var server_1 = require_server();
    var fm = require_files();
    var node_1 = require_node2();
    __exportStar(require_node2(), exports2);
    __exportStar(require_api3(), exports2);
    var Files;
    (function(Files2) {
      Files2.uriToFilePath = fm.uriToFilePath;
      Files2.resolveGlobalNodePath = fm.resolveGlobalNodePath;
      Files2.resolveGlobalYarnPath = fm.resolveGlobalYarnPath;
      Files2.resolve = fm.resolve;
      Files2.resolveModulePath = fm.resolveModulePath;
    })(Files || (exports2.Files = Files = {}));
    var _protocolConnection;
    function endProtocolConnection() {
      if (_protocolConnection === void 0) {
        return;
      }
      try {
        _protocolConnection.end();
      } catch (_err) {
      }
    }
    var _shutdownReceived = false;
    var exitTimer = void 0;
    function setupExitTimer() {
      const argName = "--clientProcessId";
      function runTimer(value) {
        try {
          let processId = parseInt(value);
          if (!isNaN(processId)) {
            exitTimer = setInterval(() => {
              try {
                process.kill(processId, 0);
              } catch (ex) {
                endProtocolConnection();
                process.exit(_shutdownReceived ? 0 : 1);
              }
            }, 3e3);
          }
        } catch (e) {
        }
      }
      for (let i = 2; i < process.argv.length; i++) {
        let arg = process.argv[i];
        if (arg === argName && i + 1 < process.argv.length) {
          runTimer(process.argv[i + 1]);
          return;
        } else {
          let args = arg.split("=");
          if (args[0] === argName) {
            runTimer(args[1]);
          }
        }
      }
    }
    setupExitTimer();
    var watchDog = {
      initialize: (params) => {
        const processId = params.processId;
        if (Is.number(processId) && exitTimer === void 0) {
          setInterval(() => {
            try {
              process.kill(processId, 0);
            } catch (ex) {
              process.exit(_shutdownReceived ? 0 : 1);
            }
          }, 3e3);
        }
      },
      get shutdownReceived() {
        return _shutdownReceived;
      },
      set shutdownReceived(value) {
        _shutdownReceived = value;
      },
      exit: (code3) => {
        endProtocolConnection();
        process.exit(code3);
      }
    };
    function createConnection2(arg1, arg2, arg3, arg4) {
      let factories;
      let input;
      let output;
      let options;
      if (arg1 !== void 0 && arg1.__brand === "features") {
        factories = arg1;
        arg1 = arg2;
        arg2 = arg3;
        arg3 = arg4;
      }
      if (node_1.ConnectionStrategy.is(arg1) || node_1.ConnectionOptions.is(arg1)) {
        options = arg1;
      } else {
        input = arg1;
        output = arg2;
        options = arg3;
      }
      return _createConnection(input, output, options, factories);
    }
    exports2.createConnection = createConnection2;
    function _createConnection(input, output, options, factories) {
      let stdio = false;
      if (!input && !output && process.argv.length > 2) {
        let port = void 0;
        let pipeName = void 0;
        let argv = process.argv.slice(2);
        for (let i = 0; i < argv.length; i++) {
          let arg = argv[i];
          if (arg === "--node-ipc") {
            input = new node_1.IPCMessageReader(process);
            output = new node_1.IPCMessageWriter(process);
            break;
          } else if (arg === "--stdio") {
            stdio = true;
            input = process.stdin;
            output = process.stdout;
            break;
          } else if (arg === "--socket") {
            port = parseInt(argv[i + 1]);
            break;
          } else if (arg === "--pipe") {
            pipeName = argv[i + 1];
            break;
          } else {
            var args = arg.split("=");
            if (args[0] === "--socket") {
              port = parseInt(args[1]);
              break;
            } else if (args[0] === "--pipe") {
              pipeName = args[1];
              break;
            }
          }
        }
        if (port) {
          let transport = (0, node_1.createServerSocketTransport)(port);
          input = transport[0];
          output = transport[1];
        } else if (pipeName) {
          let transport = (0, node_1.createServerPipeTransport)(pipeName);
          input = transport[0];
          output = transport[1];
        }
      }
      var commandLineMessage = "Use arguments of createConnection or set command line parameters: '--node-ipc', '--stdio' or '--socket={number}'";
      if (!input) {
        throw new Error("Connection input stream is not set. " + commandLineMessage);
      }
      if (!output) {
        throw new Error("Connection output stream is not set. " + commandLineMessage);
      }
      if (Is.func(input.read) && Is.func(input.on)) {
        let inputStream = input;
        inputStream.on("end", () => {
          endProtocolConnection();
          process.exit(_shutdownReceived ? 0 : 1);
        });
        inputStream.on("close", () => {
          endProtocolConnection();
          process.exit(_shutdownReceived ? 0 : 1);
        });
      }
      const connectionFactory = (logger) => {
        const result = (0, node_1.createProtocolConnection)(input, output, logger, options);
        if (stdio) {
          patchConsole(logger);
        }
        return result;
      };
      return (0, server_1.createConnection)(connectionFactory, watchDog, factories);
    }
    function patchConsole(logger) {
      function serialize(args) {
        return args.map((arg) => typeof arg === "string" ? arg : (0, node_util_1.inspect)(arg)).join(" ");
      }
      const counters = /* @__PURE__ */ new Map();
      console.assert = function assert(assertion, ...args) {
        if (assertion) {
          return;
        }
        if (args.length === 0) {
          logger.error("Assertion failed");
        } else {
          const [message, ...rest] = args;
          logger.error(`Assertion failed: ${message} ${serialize(rest)}`);
        }
      };
      console.count = function count(label = "default") {
        const message = String(label);
        let counter = counters.get(message) ?? 0;
        counter += 1;
        counters.set(message, counter);
        logger.log(`${message}: ${message}`);
      };
      console.countReset = function countReset(label) {
        if (label === void 0) {
          counters.clear();
        } else {
          counters.delete(String(label));
        }
      };
      console.debug = function debug(...args) {
        logger.log(serialize(args));
      };
      console.dir = function dir(arg, options) {
        logger.log((0, node_util_1.inspect)(arg, options));
      };
      console.log = function log(...args) {
        logger.log(serialize(args));
      };
      console.error = function error(...args) {
        logger.error(serialize(args));
      };
      console.trace = function trace(...args) {
        const stack = new Error().stack.replace(/(.+\n){2}/, "");
        let message = "Trace";
        if (args.length !== 0) {
          message += `: ${serialize(args)}`;
        }
        logger.log(`${message}
${stack}`);
      };
      console.warn = function warn(...args) {
        logger.warn(serialize(args));
      };
    }
  }
});

// node_modules/vscode-languageserver/node.js
var require_node3 = __commonJS({
  "node_modules/vscode-languageserver/node.js"(exports2, module2) {
    "use strict";
    module2.exports = require_main4();
  }
});

// packages/server/src/server.ts
var import_node4 = __toESM(require_node3());

// node_modules/vscode-languageserver-textdocument/lib/esm/main.js
var FullTextDocument = class _FullTextDocument {
  constructor(uri, languageId, version, content) {
    this._uri = uri;
    this._languageId = languageId;
    this._version = version;
    this._content = content;
    this._lineOffsets = void 0;
  }
  get uri() {
    return this._uri;
  }
  get languageId() {
    return this._languageId;
  }
  get version() {
    return this._version;
  }
  getText(range) {
    if (range) {
      const start = this.offsetAt(range.start);
      const end = this.offsetAt(range.end);
      return this._content.substring(start, end);
    }
    return this._content;
  }
  update(changes, version) {
    for (const change of changes) {
      if (_FullTextDocument.isIncremental(change)) {
        const range = getWellformedRange(change.range);
        const startOffset = this.offsetAt(range.start);
        const endOffset = this.offsetAt(range.end);
        this._content = this._content.substring(0, startOffset) + change.text + this._content.substring(endOffset, this._content.length);
        const startLine = Math.max(range.start.line, 0);
        const endLine = Math.max(range.end.line, 0);
        let lineOffsets = this._lineOffsets;
        const addedLineOffsets = computeLineOffsets(change.text, false, startOffset);
        if (endLine - startLine === addedLineOffsets.length) {
          for (let i = 0, len = addedLineOffsets.length; i < len; i++) {
            lineOffsets[i + startLine + 1] = addedLineOffsets[i];
          }
        } else {
          if (addedLineOffsets.length < 1e4) {
            lineOffsets.splice(startLine + 1, endLine - startLine, ...addedLineOffsets);
          } else {
            this._lineOffsets = lineOffsets = lineOffsets.slice(0, startLine + 1).concat(addedLineOffsets, lineOffsets.slice(endLine + 1));
          }
        }
        const diff = change.text.length - (endOffset - startOffset);
        if (diff !== 0) {
          for (let i = startLine + 1 + addedLineOffsets.length, len = lineOffsets.length; i < len; i++) {
            lineOffsets[i] = lineOffsets[i] + diff;
          }
        }
      } else if (_FullTextDocument.isFull(change)) {
        this._content = change.text;
        this._lineOffsets = void 0;
      } else {
        throw new Error("Unknown change event received");
      }
    }
    this._version = version;
  }
  getLineOffsets() {
    if (this._lineOffsets === void 0) {
      this._lineOffsets = computeLineOffsets(this._content, true);
    }
    return this._lineOffsets;
  }
  positionAt(offset) {
    offset = Math.max(Math.min(offset, this._content.length), 0);
    const lineOffsets = this.getLineOffsets();
    let low = 0, high = lineOffsets.length;
    if (high === 0) {
      return { line: 0, character: offset };
    }
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (lineOffsets[mid] > offset) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    const line = low - 1;
    offset = this.ensureBeforeEOL(offset, lineOffsets[line]);
    return { line, character: offset - lineOffsets[line] };
  }
  offsetAt(position) {
    const lineOffsets = this.getLineOffsets();
    if (position.line >= lineOffsets.length) {
      return this._content.length;
    } else if (position.line < 0) {
      return 0;
    }
    const lineOffset = lineOffsets[position.line];
    if (position.character <= 0) {
      return lineOffset;
    }
    const nextLineOffset = position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : this._content.length;
    const offset = Math.min(lineOffset + position.character, nextLineOffset);
    return this.ensureBeforeEOL(offset, lineOffset);
  }
  getLineRange(line) {
    const lineOffsets = this.getLineOffsets();
    if (line >= lineOffsets.length) {
      const lastLine = lineOffsets.length - 1;
      return { start: { line: lastLine, character: 0 }, end: { line: lastLine, character: this._content.length - lineOffsets[lastLine] } };
    } else if (line < 0) {
      return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
    }
    const startOffset = lineOffsets[line];
    const nextLineOffset = line + 1 < lineOffsets.length ? lineOffsets[line + 1] : this._content.length;
    const endOffset = this.ensureBeforeEOL(nextLineOffset, startOffset);
    return { start: { line, character: 0 }, end: { line, character: endOffset - startOffset } };
  }
  getEOLCharacters(line) {
    const lineOffsets = this.getLineOffsets();
    if (line >= lineOffsets.length) {
      return "";
    } else if (line < 0) {
      return "";
    }
    const nextLineOffset = line + 1 < lineOffsets.length ? lineOffsets[line + 1] : this._content.length;
    const eolOffset = this.ensureBeforeEOL(nextLineOffset, lineOffsets[line]);
    return this._content.substring(eolOffset, nextLineOffset);
  }
  ensureBeforeEOL(offset, lineOffset) {
    while (offset > lineOffset && isEOL(this._content.charCodeAt(offset - 1))) {
      offset--;
    }
    return offset;
  }
  get lineCount() {
    return this.getLineOffsets().length;
  }
  static isIncremental(event) {
    const candidate = event;
    return candidate !== void 0 && candidate !== null && typeof candidate.text === "string" && candidate.range !== void 0 && (candidate.rangeLength === void 0 || typeof candidate.rangeLength === "number");
  }
  static isFull(event) {
    const candidate = event;
    return candidate !== void 0 && candidate !== null && typeof candidate.text === "string" && candidate.range === void 0 && candidate.rangeLength === void 0;
  }
};
var TextDocument;
(function(TextDocument2) {
  function create(uri, languageId, version, content) {
    return new FullTextDocument(uri, languageId, version, content);
  }
  TextDocument2.create = create;
  function update(document, changes, version) {
    if (document instanceof FullTextDocument) {
      document.update(changes, version);
      return document;
    } else {
      throw new Error("TextDocument.update: document must be created by TextDocument.create");
    }
  }
  TextDocument2.update = update;
  function applyEdits3(document, edits) {
    const text = document.getText();
    const sortedEdits = mergeSort(edits.map(getWellformedEdit), (a, b) => {
      const diff = a.range.start.line - b.range.start.line;
      if (diff === 0) {
        return a.range.start.character - b.range.start.character;
      }
      return diff;
    });
    let lastModifiedOffset = 0;
    const spans = [];
    for (const e of sortedEdits) {
      const startOffset = document.offsetAt(e.range.start);
      if (startOffset < lastModifiedOffset) {
        throw new Error("Overlapping edit");
      } else if (startOffset > lastModifiedOffset) {
        spans.push(text.substring(lastModifiedOffset, startOffset));
      }
      if (e.newText.length) {
        spans.push(e.newText);
      }
      lastModifiedOffset = document.offsetAt(e.range.end);
    }
    spans.push(text.substr(lastModifiedOffset));
    return spans.join("");
  }
  TextDocument2.applyEdits = applyEdits3;
})(TextDocument || (TextDocument = {}));
function mergeSort(data, compare5) {
  if (data.length <= 1) {
    return data;
  }
  const p = data.length / 2 | 0;
  const left = data.slice(0, p);
  const right = data.slice(p);
  mergeSort(left, compare5);
  mergeSort(right, compare5);
  let leftIdx = 0;
  let rightIdx = 0;
  let i = 0;
  while (leftIdx < left.length && rightIdx < right.length) {
    const ret = compare5(left[leftIdx], right[rightIdx]);
    if (ret <= 0) {
      data[i++] = left[leftIdx++];
    } else {
      data[i++] = right[rightIdx++];
    }
  }
  while (leftIdx < left.length) {
    data[i++] = left[leftIdx++];
  }
  while (rightIdx < right.length) {
    data[i++] = right[rightIdx++];
  }
  return data;
}
function computeLineOffsets(text, isAtLineStart, textOffset = 0) {
  const result = isAtLineStart ? [textOffset] : [];
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (isEOL(ch)) {
      if (ch === 13 && i + 1 < text.length && text.charCodeAt(i + 1) === 10) {
        i++;
      }
      result.push(textOffset + i + 1);
    }
  }
  return result;
}
function isEOL(char) {
  return char === 13 || char === 10;
}
function getWellformedRange(range) {
  const start = range.start;
  const end = range.end;
  if (start.line > end.line || start.line === end.line && start.character > end.character) {
    return { start: end, end: start };
  }
  return range;
}
function getWellformedEdit(textEdit) {
  const range = getWellformedRange(textEdit.range);
  if (range !== textEdit.range) {
    return { newText: textEdit.newText, range };
  }
  return textEdit;
}

// packages/server/src/server.ts
var import_node_os2 = require("node:os");
var path7 = __toESM(require("node:path"));
var import_node_url2 = require("node:url");

// packages/core/src/logicalEntries.ts
var DEF_RE = /^\s*\/@?def\b/i;
var FOR_RE = /^\s*\/for\b/i;
var OTHER_MACRO_BODY_RE = /^\s*\/(?:alias|@?(?:bind|hook|edit|gag|hilite)|trigpc|trigc|trigp|trig)\b/i;
function isTfSpace(ch) {
  return ch === " " || ch === "	" || ch === "\r" || ch === "\f" || ch === "\v";
}
function leadingWhitespaceLength(line) {
  let i = 0;
  while (i < line.length && isTfSpace(line[i])) i += 1;
  return i;
}
function isCommentLine(line) {
  const first = line[leadingWhitespaceLength(line)];
  return first === ";" || first === "#";
}
function isBlankLine(line) {
  return leadingWhitespaceLength(line) === line.length;
}
function continuesToNextLine(line) {
  if (!line.endsWith("\\")) return false;
  return !(line.length >= 2 && line[line.length - 2] === "%");
}
function splitRawLines(text) {
  return text.split("\n");
}
function fileLineCount(lines) {
  return lines.length > 0 && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
}
function splitLogicalEntries(text) {
  const lines = splitRawLines(text);
  const count = fileLineCount(lines);
  const entries = [];
  let i = 0;
  while (i < count) {
    const firstLine = lines[i] ?? "";
    if (isCommentLine(firstLine)) {
      i += 1;
      continue;
    }
    const startLine = i;
    const parts = [];
    const partLeadingLens = [];
    let lineIdx = i;
    let incomplete = false;
    while (true) {
      const line = lines[lineIdx] ?? "";
      const continues = continuesToNextLine(line);
      const sliced = continues ? line.slice(0, -1) : line;
      const leadingLen = leadingWhitespaceLength(sliced);
      parts.push({ line: lineIdx, text: sliced.slice(leadingLen) });
      partLeadingLens.push(leadingLen);
      if (!continues) break;
      let nextIdx = lineIdx + 1;
      while (nextIdx < count && isCommentLine(lines[nextIdx] ?? "")) {
        nextIdx += 1;
      }
      if (nextIdx >= count) {
        incomplete = true;
        break;
      }
      lineIdx = nextIdx;
    }
    const joinedText2 = parts.map((p) => p.text).join("");
    const offsetMap = [];
    parts.forEach((part, idx) => {
      const leadingLen = partLeadingLens[idx] ?? 0;
      for (let c = 0; c < part.text.length; c += 1) {
        offsetMap.push({ line: part.line, character: leadingLen + c });
      }
    });
    entries.push({
      text: joinedText2,
      isDefBody: DEF_RE.test(joinedText2),
      isForLoop: FOR_RE.test(joinedText2),
      isOtherMacroBody: OTHER_MACRO_BODY_RE.test(joinedText2),
      startLine,
      endLine: lineIdx,
      incomplete,
      parts,
      offsetMap
    });
    i = lineIdx + 1;
  }
  return entries;
}

// packages/core/src/symbols.ts
var DEFINING_COMMAND_RE = /^\s*\/(def|alias|bind|hook|trigpc|trigc|trigp|trig)\b/i;
var DEF_OPTS_WITH_ARG = /* @__PURE__ */ new Set(["p", "c", "b", "B", "E", "t", "w", "h", "A", "a", "f", "P", "T", "n", "m"]);
var DEF_OPTS = /* @__PURE__ */ new Set([...DEF_OPTS_WITH_ARG, "F", "i", "I", "1", "q"]);
function isQuote(ch) {
  return ch === '"' || ch === "'" || ch === "`";
}
function skipSpaces(text, i) {
  while (i < text.length && isTfSpace(text[i])) i += 1;
  return i;
}
function skipWord(text, i) {
  while (i < text.length && !isTfSpace(text[i])) i += 1;
  return i;
}
function skipQuoted(text, i) {
  const quote = text[i];
  i += 1;
  while (i < text.length && text[i] !== quote) {
    if (text[i] === "\\" && (text[i + 1] === quote || text[i + 1] === "\\")) i += 1;
    i += 1;
  }
  return i < text.length ? i + 1 : i;
}
function defOptionsEnd(text, i) {
  return skipDefOptions(text, i).end;
}
function defHasInvalidOption(text, i) {
  return skipDefOptions(text, i).invalid === true;
}
function defIsInvisible(text, i) {
  return skipDefOptions(text, i).invisible === true;
}
function skipDefOptions(text, i) {
  const result = { end: i };
  while (true) {
    i = skipSpaces(text, i);
    if (text[i] !== "-") break;
    i += 1;
    if (text[i] === "-") {
      i += 1;
      if (i < text.length && !isTfSpace(text[i])) result.invalid = true;
    }
    if (i >= text.length || isTfSpace(text[i])) {
      result.end = skipSpaces(text, i);
      return result;
    }
    while (i < text.length && !isTfSpace(text[i]) && text[i] !== "=") {
      const opt = text[i];
      i += 1;
      if (opt === "i") result.invisible = true;
      if (!DEF_OPTS.has(opt)) result.invalid = true;
      if (!DEF_OPTS_WITH_ARG.has(opt)) continue;
      const argStart = i;
      i = isQuote(text[i]) ? skipQuoted(text, i) : skipWord(text, i);
      const raw = text.slice(argStart, i);
      const value = isQuote(raw[0]) && raw.length >= 2 && raw.endsWith(raw[0]) ? raw.slice(1, -1) : raw;
      if (opt === "t") result.trigger = value;
      else if (opt === "h") result.hook = value;
      else if (opt === "b" || opt === "B") result.key = value;
    }
    result.end = i;
  }
  result.end = i;
  return result;
}
function trimSpan(text, start, end) {
  while (start < end && isTfSpace(text[start])) start += 1;
  while (end > start && isTfSpace(text[end - 1])) end -= 1;
  return end > start ? { start, end } : void 0;
}
function spanBeforeEquals(text, from) {
  const eq = text.indexOf("=", from);
  return trimSpan(text, from, eq === -1 ? text.length : eq);
}
function findDefinition(text) {
  const m = DEFINING_COMMAND_RE.exec(text);
  if (!m) return void 0;
  const command2 = m[1].toLowerCase();
  const commandStart = m[0].length - command2.length - 1;
  let i = m[0].length;
  switch (command2) {
    case "def": {
      const opts = skipDefOptions(text, i);
      const span = spanBeforeEquals(text, opts.end);
      const detail = text.slice(commandStart, opts.end).trim().replace(/\s+/g, " ");
      if (span) return { kind: "def", detail, name: text.slice(span.start, span.end), span };
      if (opts.trigger !== void 0) return { kind: "trig", detail: `${detail} (anonymous trigger)`, name: opts.trigger };
      if (opts.hook !== void 0) return { kind: "hook", detail: `${detail} (anonymous hook)`, name: opts.hook };
      if (opts.key !== void 0) return { kind: "bind", detail: `${detail} (anonymous binding)`, name: opts.key };
      return void 0;
    }
    case "alias": {
      const nameStart = skipSpaces(text, i);
      const nameEnd = skipWord(text, nameStart);
      if (nameEnd === nameStart) return void 0;
      if (skipWord(text, skipSpaces(text, nameEnd)) === skipSpaces(text, nameEnd)) return void 0;
      return { kind: "alias", detail: "/alias", name: text.slice(nameStart, nameEnd), span: { start: nameStart, end: nameEnd } };
    }
    case "hook": {
      const rest = text.slice(i).trim().toLowerCase();
      if (rest === "" || rest === "on" || rest === "off") return void 0;
      const span = spanBeforeEquals(text, i);
      return span && { kind: "hook", detail: "/hook", name: text.slice(span.start, span.end), span };
    }
    case "bind": {
      const span = spanBeforeEquals(text, i);
      return span && { kind: "bind", detail: "/bind", name: text.slice(span.start, span.end), span };
    }
    default: {
      const leadingNumbers = command2 === "trigpc" ? 2 : command2 === "trig" ? 0 : 1;
      for (let n = 0; n < leadingNumbers; n += 1) i = skipWord(text, skipSpaces(text, i));
      const span = spanBeforeEquals(text, i);
      return span && { kind: "trig", detail: `/${command2}`, name: text.slice(span.start, span.end), span };
    }
  }
}
function definedMacro(entry) {
  const found = findDefinition(entry.text);
  return found?.kind === "def" && found.span ? found.name : void 0;
}
function spanToRange(entry, span) {
  const start = entry.offsetMap[span.start];
  const last = entry.offsetMap[span.end - 1];
  if (!start || !last) return void 0;
  return { start, end: { line: last.line, character: last.character + 1 } };
}
function getDocumentSymbols(text) {
  const lines = splitRawLines(text);
  const symbols = [];
  for (const entry of splitLogicalEntries(text)) {
    if (entry.incomplete) continue;
    const found = findDefinition(entry.text);
    if (!found) continue;
    const range = {
      start: { line: entry.startLine, character: 0 },
      end: { line: entry.endLine, character: (lines[entry.endLine] ?? "").length }
    };
    const commandRange = spanToRange(entry, { start: 0, end: Math.min(entry.text.length, 1) }) ?? range;
    const selectionRange = (found.span && spanToRange(entry, found.span)) ?? commandRange;
    symbols.push({ name: found.name, kind: found.kind, detail: found.detail, range, selectionRange });
  }
  return symbols;
}

// packages/core/src/structure.ts
function shiftIssue(issue, by) {
  return {
    ...issue,
    start: issue.start + by,
    end: issue.end + by,
    ...issue.related ? { related: issue.related.map((n) => ({ ...n, start: n.start + by, end: n.end + by })) } : {},
    ...issue.fix ? { fix: { ...issue.fix, edits: issue.fix.edits.map((e) => ({ ...e, start: e.start + by, end: e.end + by })) } } : {},
    ...issue.alternative ? { alternative: { ...issue.alternative, edits: issue.alternative.edits.map((e) => ({ ...e, start: e.start + by, end: e.end + by })) } } : {}
  };
}
var levelOf = (subs) => subs >= FULL ? "full" : subs >= NEWLINE ? "newline" : "keyword";
var KEYWORDS = /* @__PURE__ */ new Set([
  "break",
  "do",
  "done",
  "else",
  "elseif",
  "endif",
  "exit",
  "if",
  "let",
  "result",
  "return",
  "set",
  "setenv",
  "test",
  "then",
  "while"
]);
var INNER_KEYWORDS = /* @__PURE__ */ new Set(["then", "else", "elseif", "endif", "do", "done"]);
var KEYWORD = 1;
var NEWLINE = 2;
var FULL = 3;
var Stop = class extends Error {
};
var TooDeep = class extends Stop {
};
var MAX_DEPTH = 400;
var TAKES_COMMANDS = /^(?:def|edit|bind|hook|gag|hilite|trig|trigc|trigp|trigpc|alias|repeat|at|quote|eval|for|not)$/;
var LET_ASSIGNMENT_RE = /^\/[@!]*(let|set|setenv)\b\s+([A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff]*)(\s*=\s*|\s+)/i;
function assignmentIn(text) {
  const m = LET_ASSIGNMENT_RE.exec(text);
  return m ? { command: m[1].toLowerCase(), valueStart: m[0].length } : void 0;
}
function swallower(s, stmt, end, command2) {
  const assignment = assignmentIn(s.slice(stmt, end));
  if (assignment) return `the /${assignment.command} value`;
  if (!command2) return "the text before it";
  return ["test", "return", "result"].includes(command2) ? `the /${command2} expression` : `the /${command2} command`;
}
function takesTheRest(command2, word, what) {
  if (what.endsWith(" value")) {
    const set = what.slice("the ".length, -" value".length);
    return `${code(set)} takes the rest of the statement, up to the next ${code("%;")}, as its value, so ${code(`/${word}`)} ends up in the value.`;
  }
  if (what.endsWith(" expression")) {
    return `${code(`/${command2}`)} reads its expression up to the next ${code("%;")}, so ${code(`/${word}`)} becomes part of the expression.`;
  }
  return command2 ? `There is no ${code("%;")} before ${code(`/${word}`)}, so ${code(`/${command2}`)} takes it, and everything after it up to the next ${code("%;")}, as its own text.` : `There is no ${code("%;")} before ${code(`/${word}`)}, so it is read as part of the text before it.`;
}
function isNameChar(ch) {
  return ch !== void 0 && (/[A-Za-z0-9_]/.test(ch) || ch.charCodeAt(0) >= 128);
}
var COMMAND_RE = /^\/([@!]*)([^\s%)]*)/;
function commandParts(s, start) {
  if (s[start] !== "/") return { prefix: "", word: "" };
  const m = COMMAND_RE.exec(s.slice(start));
  return { prefix: m?.[1] ?? "", word: (m?.[2] ?? "").toLowerCase() };
}
var GLUABLE_KEYWORDS = /* @__PURE__ */ new Set(["if", "elseif", "while", "then", "else", "endif", "do", "done", "break"]);
var GLUE_RE = /[(/;,:"'`[{$!?*+=<>|&^~#@]/;
function gluedKeywordAt(s, start) {
  if (s[start] !== "/") return void 0;
  let p = start + 1;
  if (s[p] === "@") p += 1;
  let q = p;
  while (q < s.length && /[A-Za-z]/.test(s[q])) q += 1;
  const word = s.slice(p, q).toLowerCase();
  if (!GLUABLE_KEYWORDS.has(word) || !GLUE_RE.test(s[q] ?? "")) return void 0;
  let e = q;
  while (e < s.length && !isTfSpace(s[e]) && s[e] !== "%") e += 1;
  return { word, nameEnd: q, tokenEnd: e };
}
function afterParens(s, open) {
  let depth = 0;
  for (let p = open; p < s.length; p += 1) {
    const ch = s[p];
    if (ch === '"' || ch === "'" || ch === "`") {
      p += 1;
      while (p < s.length && s[p] !== ch) p += s[p] === "\\" ? 2 : 1;
    } else if (ch === "(") depth += 1;
    else if (ch === ")" && --depth === 0) {
      let q = p + 1;
      while (isTfSpace(s[q])) q += 1;
      return q;
    }
  }
  return s.length;
}
function commandWord(s, start) {
  return commandParts(s, start).word;
}
function isDigit(ch) {
  return ch !== void 0 && ch >= "0" && ch <= "9";
}
function code(text) {
  return text.includes("`") ? `\`\` ${text} \`\`` : `\`${text}\``;
}
function charName(ch) {
  if (ch === " ") return "space";
  if (ch === "	") return "tab";
  if (ch === "\r") return "carriage return";
  return ch < " " ? `control character U+${ch.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase()}` : `'${ch}'`;
}
var CONTINUATION_EXPLANATION = `In a file, every command ends at the end of its line, unless the line ends in ${code("\\")}: then tf joins the next line on. So a block has to be complete within one command: on one line with ${code("%;")} between its statements, or on lines that each end in ${code("\\")} but the last. (On a top-level line that starts with ${code("/if")} or ${code("/while")}, ${code("%;")} separates statements, but ${code("%")} substitutions such as ${code("%{x}")} aren't done in its commands; a variable in its condition still works. Put the block in a ${code("/def")} to substitute in the commands too.)`;
function continuation(word, missing, conditionList) {
  return {
    message: conditionList ? `This /${word}'s command ends before the /${missing} of its condition list: end each line but the last with \\.` : `This /${word}'s command ends without ${missing === "endif" ? "an" : "a"} /${missing}: add %; /${missing}, or end each line but the last with \\.`,
    label: `no /${missing} in this command`,
    explanation: CONTINUATION_EXPLANATION
  };
}
function describeBlock(block) {
  switch (block) {
    case "then":
      return "in an /if body";
    case "do":
      return "in a /while body";
    case "if":
    case "elseif":
      return "in an /if condition, before its /then";
    case "while":
      return "in a /while condition, before its /do";
    case "else":
      return "after /else";
    default:
      return "outside any /if or /while";
  }
}
var Parser = class _Parser {
  constructor(s, mode) {
    this.s = s;
    this.mode = mode;
  }
  s;
  mode;
  i = 0;
  block = "";
  cmdsub = 0;
  /** Where each `$(` the parser is inside starts, outermost first, and whether it is an expression operand. */
  cmdsubStarts = [];
  depth = 0;
  open = [];
  mids = [];
  /**
   * Every keyword glued to what follows it, the keyword glued on after its `/` if any (`/break/done`),
   * and its issue, to note the problems it leads to on.
   */
  glued = [];
  /** Every keyword glued to punctuation, which may be a macro's name (`/endif;`, `/done:x`). */
  gluedPunct = [];
  /** Where the last `(condition)` ended (after its blanks), and the keyword it belongs to. */
  conditionEnd;
  issues = [];
  /** Every plain command statement read, in order (not `/test`, `/return` or `/result`). */
  statements = [];
  /** Every expression read, in the order each one ended. */
  expressions = [];
  /** The inside of every `$(...)` read, which runs in a variable scope of its own. */
  cmdsubs = [];
  /** Every substitution, condition, parenthesis and string read, in the order each one ended. */
  spans = [];
  /** Every block that closed, in the order each one closed. */
  blocks = [];
  /** Where the last /endif or /done read ends. */
  closeEnd = 0;
  /** Compiling stopped at an error, so tf runs none of this text. */
  stopped = false;
  /** /ifs and /endifs swallowed by a /let or /set value (for keyword-mid-statement). */
  swallowed = [];
  /** For each "keyword-warning" issue, its keyword and what took it, should it turn out to be the error (parseSettled()). */
  warned = /* @__PURE__ */ new Map();
  /** Every statement and block, in the order each one ended, with the list it is in. */
  units = [];
  lists = [];
  listId = -1;
  /** The keyword or condition the next statement follows, for an empty statement's message. */
  emptyAfter;
  /** The separator that ended the last statement, and where: an empty statement after `%|` is an error, not a send. */
  lastSep;
  /** The block each open `$(...)` was in: tf's `block` is one global, which a `$(...)` doesn't reset. */
  cmdsubBlocks = [];
  run() {
    try {
      if (this.mode === "body") this.list(FULL);
      else if (this.mode === "newline") this.list(NEWLINE);
      else this.list(KEYWORD);
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
      if (!(e instanceof TooDeep)) this.stopped = true;
    }
  }
  /** `is_end_of_statement()`: `%` then `;`, `|` or `\` (`IS_STATEND` in util.c; `%\` proven to separate). */
  isStatEnd(p) {
    const next = this.s[p + 1];
    return this.s[p] === "%" && (next === ";" || next === "|" || next === "\\");
  }
  isCmdsubEnd(p) {
    return this.cmdsub > 0 && this.s[p] === ")";
  }
  skipSpace() {
    while (isTfSpace(this.s[this.i])) this.i += 1;
  }
  /** The keyword starting at `p` (just after its `/`), as `keyword_parse()` reads it. */
  keywordAt(p) {
    const start = this.s[p] === "@" ? p + 1 : p;
    let end = start;
    while (end < this.s.length && !isTfSpace(this.s[end]) && this.s[end] !== "%" && this.s[end] !== ")") end += 1;
    const word = this.s.slice(start, end).toLowerCase();
    if (!KEYWORDS.has(word)) return void 0;
    let next = end;
    while (isTfSpace(this.s[next])) next += 1;
    return { word, end, next };
  }
  fail(kind, start, end, detail) {
    const d = typeof detail === "string" ? { message: detail } : detail;
    this.issues.push({ kind, start, end: Math.max(end, start + 1), ...d });
    throw new Stop();
  }
  /** `p` pulled back over the blanks before it, but not over a blank escaped with `\`. */
  pullBack(p) {
    let q = p;
    while (q > 0 && isTfSpace(this.s[q - 1]) && this.s[q - 2] !== "\\") q -= 1;
    return q;
  }
  /** Where to insert a `%;` so it ends the statement before `p`: after its last non-blank. */
  separatorBefore(p) {
    const q = this.pullBack(p);
    if (q === p || this.s[q - 1] === "%" || this.s[q - 1] === "\\") return { start: p, end: p, newText: "%; " };
    return { start: q, end: q, newText: "%;" };
  }
  /** Insert `text` at `p`, pulled back over the blanks before it (the end of a statement). */
  insertAtEnd(p, text) {
    const q = this.pullBack(p);
    return { start: q, end: q, newText: text };
  }
  /** Add the statement `/word` at `p`, the end of the body: after a `%;` if one isn't there already. */
  appendStatement(p, word) {
    const q = this.pullBack(p);
    if (this.s[q - 1] === ";" && this.s[q - 2] === "%" && this.s[q - 3] !== "%") return { start: q, end: q, newText: ` /${word}` };
    const pad = this.s[q - 1] === "%" || this.s[q - 1] === "\\" ? " " : "";
    return { start: q, end: q, newText: `${pad}%; /${word}` };
  }
  /** The innermost open /if or /while, as a related note. */
  openNote() {
    const open = this.open[this.open.length - 1];
    return open ? [{ start: open.start, end: open.end, message: `this /${open.keyword}` }] : [];
  }
  /**
   * A block error. When `fix`, the keyword that would have fixed it, sits in the middle of a
   * statement since the innermost block opened, point at that instead: the likely fix is a `%;`
   * before it. Keywords inside a block that has since closed, or inside a `$(...)`, don't count.
   */
  blockError(start, end, problem, fix, kind = "block", searchTo = start) {
    const since = this.open.length > 0 ? this.open[this.open.length - 1].start : -1;
    if (fix && this.gluedBefore(fix, searchTo, since, { start, end, message: `this /${this.open[this.open.length - 1]?.keyword ?? fix}, left open` })) throw new Stop();
    const closerFrom = fix === "endif" ? Math.max(since, this.open[this.open.length - 1]?.branch ?? -1) : since;
    const fixer = fix ? this.mids.find((m) => m.word === fix && m.start > closerFrom && m.start < searchTo) : void 0;
    const mid = fixer && this.mids.find((m) => m.stmt === fixer.stmt && m.start > since);
    if (fixer && mid) this.fail("keyword", mid.start, mid.end, this.midKeyword(mid, fixer, since));
    this.fail(kind, start, end, problem);
  }
  /**
   * A `%;` before each swallowed keyword, and after a swallowed `/endif` or `/done` that has more
   * text after it (which would otherwise be "text after /endif").
   */
  separateSwallowed(swallowed) {
    const at2 = /* @__PURE__ */ new Set();
    for (const m of swallowed) {
      at2.add(m.start);
      if (m.word !== "endif" && m.word !== "done") continue;
      let k = m.end;
      while (isTfSpace(this.s[k])) k += 1;
      if (k < this.s.length && !this.isStatEnd(k) && !this.isCmdsubEnd(k)) at2.add(k);
    }
    return [...at2].sort((a, b) => a - b).map((p) => this.separatorBefore(p));
  }
  /**
   * Whether a keyword among `swallowed` (all of one statement) is the first word of an assignment's
   * value: a %; before it would leave `/set name` (`/set v /else ...`, rev-s4c c48, c93), which
   * shows the variable instead of setting it.
   */
  startsValue(swallowed) {
    const first = swallowed[0];
    if (!first) return false;
    const assignment = assignmentIn(this.s.slice(first.stmt, first.start));
    return !!assignment && swallowed.some((m) => m.start === m.stmt + assignment.valueStart);
  }
  /**
   * A statement in a condition list that isn't a command (`/if x == 1%; /then`): tf sends it to
   * the world when the condition is tested, and warns "statement starting with 'x' in /IF condition
   * sends text to server" (list() in expand.c). Compiling carries on. No fix: what was meant may
   * be an expression, but the text may not be one.
   */
  conditionText(start) {
    const keyword = this.block === "while" ? "while" : this.block === "elseif" ? "elseif" : "if";
    const then = keyword === "while" ? "do" : "then";
    let end = start + 1;
    while (end < this.s.length && !isTfSpace(this.s[end]) && !this.isStatEnd(end) && !this.isCmdsubEnd(end)) end += 1;
    this.issues.push({
      kind: "condition-text",
      start,
      end,
      message: `This text in the /${keyword}'s condition list isn't a command, so tf sends it to the world: write the condition in parentheses, as in /${keyword} (x == 1).`,
      label: "sent to the world",
      explanation: `After ${code(`/${keyword}`)}, commands up to ${code(`/${then}`)} are its condition, and the result of the last one decides it. A statement that doesn't start with ${code("/")} isn't a command: it is text, and tf sends text to the world each time the condition is tested. To test an expression, put it in parentheses, ${code(`/${keyword} (x == 1) ...`)}, or test it with ${code("/test")}: ${code(`/${keyword} /test x == 1%; /${then} ...`)}`
    });
  }
  /**
   * Whether a keyword `word` glued to what follows it sits between `after` and `before`: if so,
   * `note` (the problem it leads to) is added to its issue, and that is the one reported.
   */
  gluedBefore(word, before2, after, note) {
    for (let k = this.glued.length - 1; k >= 0; k -= 1) {
      const g = this.glued[k];
      if (g.start >= before2 || g.start <= after || g.word !== word && g.next !== word) continue;
      (g.issue.related ??= []).push(note);
      return true;
    }
    return false;
  }
  /**
   * A statement at `start` whose command is a block keyword glued to what follows it (`/if(1)`,
   * `/else/echo b`): keyword_parse() reads the word up to a blank, `%` or `)`, so tf takes the
   * whole of it as a command name, and finds none.
   */
  gluedKeyword(start) {
    const glued = gluedKeywordAt(this.s, start);
    if (!glued) return;
    const { word, nameEnd, tokenEnd } = glued;
    const written = this.s.slice(start, tokenEnd);
    const named = this.s[start + 1] === "@" ? `the builtin command ${written.slice(2)}` : `a command named ${written.slice(1)}`;
    const next = this.s[nameEnd];
    const ends = (word === "endif" || word === "done" || word === "break") && next === "/";
    const noCondition = next === "(" && (word === "else" || word === "then" || word === "do");
    const punct = next !== "(" && next !== "/";
    const betweenParenAndSeparator = () => {
      if (next !== "(") return "";
      const after = afterParens(this.s, nameEnd);
      if (!this.isStatEnd(after)) return "";
      let close = after;
      while (close > nameEnd && isTfSpace(this.s[close - 1])) close -= 1;
      return `, and a command between the ${this.s.slice(nameEnd, close)} and the ${this.s.slice(after, after + 2)}`;
    };
    const advice = noCondition ? word === "else" ? `did you mean /elseif ${written.slice(nameEnd - start)}?` : `/${word} takes no (condition).` : !punct ? `put ${ends ? "%;" : "a space"} after /${word}${betweenParenAndSeparator()}.` : `unless a macro named ${written.slice(1)} is defined elsewhere, take the ${next} away or put a blank before it.`;
    const issue = {
      kind: punct ? "glued-punct" : "glued",
      start,
      end: tokenEnd,
      message: `tf reads ${written} as ${named}, not as /${word}: ${advice}`,
      label: `not /${word}`,
      explanation: `tf reads a keyword up to the next blank, ${code("%")} or ${code(")")}, so ${code(written)} isn't ${code(`/${word}`)}: tf runs it as ${named}${punct ? ", which is only there if some file defines it" : ", and there is none"}. ` + (noCondition ? `${code(`/${word}`)} takes no ${code("(condition)")}${word === "else" ? `: a branch with one is ${code("/elseif (...)")}` : ""}.` : ends ? `${code(`/${word}`)} ends its statement, so the command after it needs a ${code("%;")} before it.` : `A blank after ${code(`/${word}`)} makes it the keyword.`)
    };
    if (!noCondition && (next === "/" || next === "(" && !this.isStatEnd(afterParens(this.s, nameEnd)))) {
      issue.fix = ends ? { title: `Put %; after /${word}`, edits: [{ start: nameEnd, end: nameEnd, newText: "%; " }] } : { title: `Put a space after /${word}`, edits: [{ start: nameEnd, end: nameEnd, newText: " " }] };
    }
    this.issues.push(issue);
    if (punct) this.gluedPunct.push({ word, start });
    else {
      const next2 = this.s[nameEnd] === "/" ? (/^@?([A-Za-z]+)/.exec(this.s.slice(nameEnd + 1))?.[1] ?? "").toLowerCase() : "";
      this.glued.push({ word, next: next2, start, issue });
    }
  }
  /** A keyword swallowed by the statement it sits in, which leaves its block unfinished. */
  midKeyword(mid, fixer, since) {
    const what = swallower(this.s, mid.stmt, mid.start, mid.command);
    const consequence = {
      endif: "the /if is never closed",
      done: "the /while is never closed",
      then: "the /if never reaches its /then",
      do: "the /while never reaches its /do"
    };
    const swallowed = this.mids.filter((m) => m.stmt === mid.stmt && m.start > since);
    const words2 = swallowed.map((m) => `/${m.word}`);
    const list = words2.length > 1 ? `${words2.slice(0, -1).join(", ")} and ${words2[words2.length - 1]}` : `${words2[0]}`;
    const reads = takesTheRest(mid.command, mid.word, what);
    return {
      message: `/${mid.word} here is not a keyword: it is part of ${what}, so ${consequence[fixer.word] ?? "its block is never finished"}.`,
      label: `part of ${what}`,
      explanation: `tf only reads a keyword at the start of a statement, and statements are separated by ${code("%;")}. ${reads} Put ${code("%;")} before each keyword that should start a statement.`,
      related: [
        ...this.openNote(),
        ...fixer !== mid ? [{ start: fixer.start, end: fixer.end, message: `/${fixer.word} is text too` }] : []
      ],
      // Not where the keyword starts a `name value` value, which would leave `/set name`, a query.
      // Text that the %; makes a statement of its own is offered all the same: it is sent to the
      // world, as text in a body is (policy, 2026-10-15).
      ...this.startsValue(swallowed) ? {} : { fix: { title: `Put %; before ${list}`, edits: this.separateSwallowed(swallowed) } }
    };
  }
  /**
   * `fn()` one level deeper. Blocks, `$(...)`, `$[...]` and substitution defaults nest by recursion,
   * so a pathological nesting (thousands of `/if`s) would overflow the stack; past MAX_DEPTH the
   * check stops there, and says so. It doesn't count as tf stopping (`stopped`): tf runs the text,
   * so the statements read so far are kept.
   */
  deeper(fn) {
    if (this.depth >= MAX_DEPTH) {
      this.issues.push({
        kind: "too-deep",
        start: this.i,
        end: this.i + 1,
        message: `This command nests more than ${MAX_DEPTH} levels deep, so the rest of it isn't checked.`,
        label: `${MAX_DEPTH} levels deep`,
        explanation: `Blocks (${code("/if")}, ${code("/while")}) and substitutions (${code("$(...)")}, ${code("$[...]")}, ${code("%{...}")} defaults) nested this deep are past what this check follows. That says nothing about tf: the rest of the command may well be fine, it just isn't checked.`
      });
      throw new TooDeep();
    }
    this.depth += 1;
    try {
      return fn();
    } finally {
      this.depth -= 1;
    }
  }
  list(subsIn) {
    const outer = this.listId;
    try {
      this.deeper(() => this.listAt(subsIn));
    } finally {
      this.listId = outer;
    }
  }
  /** The statements from here on run in a list of their own. */
  newList(kind) {
    this.lists.push({ kind: this.cmdsub > 0 ? "cmdsub" : kind });
    this.listId = this.lists.length - 1;
  }
  /** The statement or block that started at `start` ends here. */
  unit(start, word, block = false) {
    this.units.push({ start, end: this.i, list: this.listId, word, block });
  }
  listAt(subsIn) {
    let subs = subsIn;
    this.newList(this.block === "if" || this.block === "elseif" || this.block === "while" ? "condition" : "body");
    let first = true;
    let unreachable = false;
    do {
      if (subs >= NEWLINE) {
        while (isTfSpace(this.s[this.i]) || this.s[this.i] === "\\" && isTfSpace(this.s[this.i + 1])) this.i += 1;
        if (!unreachable) this.emptyStatement(first);
      }
      first = false;
      this.emptyAfter = void 0;
      this.lastSep = void 0;
      const stmtStart = this.i;
      let special = "";
      if (this.s[this.i] === "/" && this.s[this.i + 1] !== "/") {
        const kw = this.keywordAt(this.i + 1);
        const kwEnd = kw ? kw.end : this.i + 1;
        const word = kw?.word ?? "";
        const label = `/${this.s.slice(stmtStart + 1, kwEnd)}`;
        if (kw) this.i = kw.next;
        switch (word) {
          case "if":
          case "while": {
            this.openBlock(word, stmtStart, kwEnd, subs === KEYWORD ? NEWLINE : subs);
            this.unit(stmtStart, word, true);
            if (subs === KEYWORD) subs = NEWLINE;
            special = word;
            break;
          }
          case "then":
            if (this.block !== "if" && this.block !== "elseif") this.unexpected(word, stmtStart, kwEnd);
            this.block = "then";
            this.bodyStarts();
            this.newList("body");
            this.emptyAfter = { label, warns: false };
            unreachable = false;
            continue;
          case "do":
            if (this.block !== "while") this.unexpected(word, stmtStart, kwEnd);
            this.block = "do";
            this.bodyStarts();
            this.newList("body");
            this.emptyAfter = { label, warns: false };
            unreachable = false;
            continue;
          case "else":
          case "elseif":
            if (this.block !== "then") this.unexpected(word, stmtStart, kwEnd);
            this.endPart(stmtStart);
            this.block = word;
            this.newList(word === "else" ? "body" : "condition");
            this.open[this.open.length - 1].branch = stmtStart;
            unreachable = false;
            if (word === "else") {
              this.bodyStarts();
              this.emptyAfter = { label, warns: true };
            }
            continue;
          case "endif":
            if (this.block !== "then" && this.block !== "else") this.unexpected(word, stmtStart, kwEnd);
            this.endPart(stmtStart);
            this.closeEnd = kwEnd;
            this.block = "endif";
            return;
          case "done":
            if (this.block !== "do") this.unexpected(word, stmtStart, kwEnd);
            this.endPart(stmtStart);
            this.closeEnd = kwEnd;
            this.block = "done";
            return;
          case "break":
            this.breakStatement(stmtStart, kwEnd);
            unreachable = true;
            if (this.isCmdsubEnd(this.i)) return;
            continue;
          case "test":
          case "return":
          case "result":
            this.expressionStatement(subs, word);
            this.unit(stmtStart, word);
            if (word !== "test") unreachable = true;
            break;
          default:
            this.i = stmtStart;
            if (!kw) this.gluedKeyword(stmtStart);
            this.statement(subs);
            this.unit(stmtStart, commandWord(this.s, stmtStart));
        }
      } else if (this.block === "if" || this.block === "elseif" || this.block === "while") {
        if (this.s[this.i] === "(") {
          const keyword = this.block === "while" ? "/while" : `/${this.block}`;
          this.condition(keyword);
          this.skipSpace();
          this.conditionEnd = { at: this.i, keyword };
          this.block = this.block === "while" ? "do" : "then";
          this.bodyStarts();
          this.newList("body");
          this.emptyAfter = { label: `${keyword} (...)`, warns: true };
          continue;
        }
        if (this.i < this.s.length && !this.isStatEnd(this.i) && !this.isCmdsubEnd(this.i)) this.conditionText(stmtStart);
        this.statement(subs);
        this.unit(stmtStart, commandWord(this.s, stmtStart));
      } else {
        this.statement(subs);
        this.unit(stmtStart, commandWord(this.s, stmtStart));
      }
      if (this.isCmdsubEnd(this.i)) return;
      if (this.isStatEnd(this.i)) {
        const sep = { at: this.i, char: this.s[this.i + 1] };
        this.i += 2;
        this.skipSpace();
        this.lastSep = sep;
      } else if (this.i < this.s.length) {
        const after = special === "if" ? "/endif" : special === "while" ? "/done" : "";
        let end = this.i + 1;
        while (end < this.s.length && !isTfSpace(this.s[end]) && !this.isStatEnd(end)) end += 1;
        this.fail("block", this.i, end, {
          message: after ? `Text after ${after} needs a %; before it.` : "This text needs a %; before it.",
          label: "needs a %; before it",
          explanation: after ? `${code(after)} ends its statement, so the next command has to start a new one, after a ${code("%;")}.` : `The statement before it has ended, so this has to start a new one, after a ${code("%;")}.`,
          // Before text too, which then is a statement sent to the world, as text in a body is
          // (rev-s4b g08 `/endif)`, g14 `/endif "x"`; policy, 2026-10-15).
          fix: { title: "Put %; before it", edits: [this.separatorBefore(this.i)] }
        });
      }
    } while (this.i < this.s.length);
  }
  /** The innermost open block's current body part starts here. */
  bodyStarts() {
    const open = this.open[this.open.length - 1];
    if (open) open.body = this.i;
  }
  /** The innermost open block's current body part ends at `at` (where its next keyword starts). */
  endPart(at2) {
    const open = this.open[this.open.length - 1];
    if (open?.body !== void 0) open.parts.push({ start: open.body, end: at2 });
  }
  openBlock(keyword, start, end, subs) {
    const outer = this.block;
    this.block = keyword;
    const opened = { keyword, start, end, cmdsub: this.cmdsub, parts: [] };
    this.open.push(opened);
    this.list(subs);
    const ended = this.block;
    if (ended === "endif" || ended === "done") this.blocks.push({ start, end: this.closeEnd, parts: opened.parts });
    const to = this.i + 1;
    if (ended === "endif" || ended === "done") this.takenAsText(start);
    const where2 = this.cmdsub > 0 ? "before the )" : this.mode === "top" ? "at the end of the line" : "at the end of the body";
    const body = this.open[this.open.length - 1].body;
    const empty = body !== void 0 && this.s.slice(body, this.i).trim() === "";
    const gluedCloser = (word) => this.gluedPunct.some((g) => g.word === word && g.start > start) || this.glued.some((g) => g.start > start && g.next === word);
    const cutBackslash = (word) => {
      let k = this.i;
      while (k > 0 && /[ \t\r\f\v]/.test(this.s[k - 1])) k -= 1;
      if (k === this.i || this.s[k - 1] !== "\\") return false;
      let m = k - 1;
      while (m > 0 && /[A-Za-z]/.test(this.s[m - 1])) m -= 1;
      const slash = this.s[m - 1] === "/" || this.s[m - 1] === "@" && this.s[m - 2] === "/";
      return slash && this.s.slice(m, k - 1).toLowerCase() === word;
    };
    const closer = (word) => empty || gluedCloser(word) || cutBackslash(word) ? void 0 : { title: `Add %; /${word} ${where2}`, edits: [this.appendStatement(this.i, word)] };
    const conditionList = (word, then) => ({
      message: `This /${word}'s condition list has no /${then}.`,
      label: `no /${then}`,
      explanation: `When ${code(`/${word}`)} is followed by commands instead of a ${code("(condition)")}, they are its condition, up to a ${code(`/${then}`)} at the start of a statement: ${code(`/${word} /test x%; /${then} ...`)}`
    });
    const top = this.mode === "top" && this.cmdsub === 0 && this.i >= this.s.length;
    if (keyword === "if") {
      if (ended === "if" || ended === "elseif") {
        if (top) this.blockError(start, end, continuation("if", "then", true), "then", "continuation", to);
        else this.blockError(start, end, conditionList("if", "then"), "then", "block", to);
      } else if (ended === "then" || ended === "else") {
        this.blockError(
          start,
          end,
          top ? { ...continuation("if", "endif", false), fix: closer("endif") } : {
            message: "This /if has no /endif.",
            label: "never closed",
            explanation: `An ${code("/if")} needs an ${code("/endif")} later in the same macro body, at the start of a statement (after a ${code("%;")}).`,
            fix: closer("endif")
          },
          "endif",
          top ? "continuation" : "block",
          to
        );
      }
    } else if (ended === "while") {
      if (top) this.blockError(start, end, continuation("while", "do", true), "do", "continuation", to);
      else this.blockError(start, end, conditionList("while", "do"), "do", "block", to);
    } else if (ended === "do") {
      this.blockError(
        start,
        end,
        top ? { ...continuation("while", "done", false), fix: closer("done") } : {
          message: "This /while has no /done.",
          label: "never closed",
          explanation: `A ${code("/while")} needs a ${code("/done")} later in the same macro body, at the start of a statement (after a ${code("%;")}).`,
          fix: closer("done")
        },
        "done",
        top ? "continuation" : "block",
        to
      );
    }
    this.open.pop();
    this.dropMids(start);
    this.block = outer;
  }
  /** Forget mid-statement keywords after `from`: they sit in a block or `$(...)` that has closed. */
  dropMids(from) {
    while (this.mids.length > 0 && this.mids[this.mids.length - 1].start > from) this.mids.pop();
  }
  unexpected(word, start, end) {
    const outer = this.block;
    const opener = word === "do" || word === "done" ? "while" : "if";
    const verb = word === "endif" || word === "done" ? "close" : "belong to";
    if (!outer && this.gluedBefore(opener, start, -1, { start, end, message: `this /${word}, left with no /${opener} to ${verb}` })) throw new Stop();
    const where2 = outer ? `: it is ${describeBlock(outer)}` : "";
    const problem = {
      message: `This /${word} has no /${opener} to ${verb}${where2}.`,
      label: `no /${opener} to ${verb}`,
      related: this.openNote()
    };
    let next = end;
    while (isTfSpace(this.s[next])) next += 1;
    if (this.isStatEnd(next)) {
      next += 2;
      while (isTfSpace(this.s[next])) next += 1;
    }
    const drop = { title: `Remove /${word}`, edits: [{ start, end: next, newText: "" }] };
    const afterCondition = this.conditionEnd?.at === start ? this.conditionEnd.keyword : void 0;
    if (afterCondition && (word === "then" && outer === "then" || word === "do" && outer === "do")) {
      const list = word === "then" ? "/if" : "/while";
      problem.message = `This /${word} can't follow a (condition): the condition after ${afterCondition} already ends it.`;
      problem.label = "not allowed after a (condition)";
      problem.explanation = `${code(`${afterCondition} (condition)`)} takes the next statement as its body, so this ${code(`/${word}`)} is read as the first statement of the body, where tf doesn't expect it. ${code(`/${word}`)} only follows a condition list: ${code(`${list} /test x%; /${word} ...`)}`;
      problem.fix = drop;
    } else if (word === "then" && outer === "then" || word === "do" && outer === "do") {
      problem.message = `This /${word} is inside the /${opener}'s body, where it doesn't belong: /${word} only ends a condition list.`;
      problem.label = `inside the /${opener}'s body`;
    } else if (word === "else" && outer === "else") {
      problem.message = "This is a second /else in the same /if.";
      problem.label = "second /else";
    } else if (word === "elseif" && outer === "else") {
      problem.message = "This /elseif comes after /else: /else has to be last.";
      problem.label = "after /else";
    } else if (outer === "if" || outer === "elseif" || outer === "while") {
      const [keyword, then] = outer === "while" ? ["while", "do"] : ["if", "then"];
      problem.message = `This /${word} comes before the /${then} of the condition list.`;
      problem.label = `before the /${then}`;
      problem.explanation = `A condition list runs up to ${code(`/${then}`)} at the start of a statement: ${code(`/${keyword} /test x%; /${then} ...`)}`;
    }
    if (this.mode === "top" && !outer) {
      const a = opener === "if" ? "an" : "a";
      problem.explanation = `In a file, every command ends at the end of its line, unless the line ends in ${code("\\")}. If this belongs to ${a} ${code(`/${opener}`)} on an earlier line, end every line from that ${code(`/${opener}`)} to here with ${code("\\")}.`;
    }
    const fix = outer === "if" || outer === "elseif" ? "then" : outer === "while" ? "do" : void 0;
    this.blockError(start, end, problem, fix);
  }
  /**
   * A statement that starts at a `%;` or `%\`, or at the `)` that ends a `$(...)`, is empty, and
   * `statement()` compiles it as an OP_SEND of nothing: tf sends a blank line to the world each time
   * it runs (the 2026-10-14 step-5 probes, "Not connected." for every shape). tf itself warns only
   * after `/if (...)`, `/elseif (...)` or `/while (...)` (expand.c:1426) and after `/else` (:1587),
   * and, in a condition list, about a statement that isn't a command (:1433). After a `%|` the
   * empty statement is an error instead ("Piping input to a server command"), and a `%|` that ends
   * one is too ("Piping output of a server command"), so neither is reported here. A `%;` at the
   * very end sends nothing: the loop ends there.
   */
  emptyStatement(first) {
    const p = this.i;
    const sep = this.isStatEnd(p) && this.s[p + 1] !== "|";
    const close = !sep && this.isCmdsubEnd(p);
    if (!sep && !close || this.lastSep?.char === "|") return;
    const isCondition = (b) => b === "if" || b === "elseif" || b === "while";
    const inCondition = isCondition(this.block);
    let tfBlock = this.block;
    for (let k = this.cmdsubBlocks.length - 1; tfBlock === "" && k >= 0; k -= 1) tfBlock = this.cmdsubBlocks[k];
    const prior = this.lastSep;
    const sepChar = sep ? this.s[p + 1] : void 0;
    const text = this.emptyAfter ? `after ${this.emptyAfter.label}` : prior ? `right after ${prior.char === (sepChar ?? "") ? "another" : "a"} ${this.s.slice(prior.at, prior.at + 2)}` : inCondition ? `after /${this.block}` : this.cmdsub > 0 && first ? "at the start of the $(...)" : "before the first command";
    const where2 = { text, warns: isCondition(tfBlock) || (this.emptyAfter?.warns ?? false) };
    const warned = where2.warns ? "tf warns about and sends" : "tf sends";
    const what = sep ? this.s.slice(p, p + 2) : ")";
    const explanation = `A statement that is empty, like this one, still runs: tf sends it to the world as a blank line, ` + (where2.warns ? "with a warning when it compiles the text. " : "and doesn't warn. ") + `A ${code("%;")} at the very end sends nothing.`;
    const pipeAt = (q) => this.s[q] === "%" && this.s[q + 1] === "|";
    let back = prior ? prior.at : 0;
    while (back > 0 && isTfSpace(this.s[back - 1])) back -= 1;
    if (prior && pipeAt(back - 2)) return;
    if (sep) {
      let next = p + 2;
      while (isTfSpace(this.s[next])) next += 1;
      if (pipeAt(next)) return;
      this.issues.push({
        kind: "empty-statement",
        start: p,
        end: p + 2,
        message: `This ${what} ${where2.text} ends an empty statement, which ${warned} to the world as a blank line: remove it.`,
        label: "ends an empty statement",
        explanation,
        // A blank in its place keeps /else from running into the next command (/else/echo is one word).
        fix: {
          title: `Remove the ${what}`,
          edits: [{ start: p, end: p + 2, newText: p + 2 >= this.s.length || isTfSpace(this.s[p + 2]) || isTfSpace(this.s[p - 1]) || p === 0 ? "" : " " }]
        }
      });
      return;
    }
    const before2 = prior;
    this.issues.push({
      kind: "empty-statement",
      start: p,
      end: p + 1,
      message: before2 ? `This $(...) ends with an empty statement after its last ${this.s.slice(before2.at, before2.at + 2)}, which ${warned} to the world as a blank line: remove that ${this.s.slice(before2.at, before2.at + 2)}.` : `This $(...) runs an empty statement, which ${warned} to the world as a blank line: put a command in it, or remove it.`,
      label: "ends an empty statement",
      explanation,
      ...before2 ? { fix: { title: `Remove the ${this.s.slice(before2.at, before2.at + 2)}`, edits: [{ start: before2.at, end: before2.at + 2, newText: "" }] } } : {}
    });
  }
  breakStatement(start, end) {
    if (this.i >= this.s.length || this.isStatEnd(this.i) || this.isCmdsubEnd(this.i)) {
      this.breakOutOfCmdsub(start, end, 1);
      this.unit(start, "break");
      this.breakSeparator();
      return;
    }
    const digits = this.i;
    while (isDigit(this.s[this.i])) this.i += 1;
    if (this.i === digits || Number(this.s.slice(digits, this.i)) <= 0) {
      this.fail("block", start, end, "/break takes a positive number of loops.");
    }
    this.breakOutOfCmdsub(start, this.i, Number(this.s.slice(digits, this.i)));
    this.unit(start, "break");
    this.breakSeparator();
  }
  /** The separator after a /break, read as the statement loop reads one. */
  breakSeparator() {
    if (!this.isStatEnd(this.i)) return;
    const sep = { at: this.i, char: this.s[this.i + 1] };
    this.i += 2;
    this.skipSpace();
    this.lastSep = sep;
  }
  /**
   * A `/break` inside a `$(...)` may only end loops opened inside that `$(...)`. Its jump is
   * resolved by the `/done` of the loop it ends, and jumping out of a `$(...)` skips the code that
   * ends the command substitution. tf dev's `list()` (expand.c, the MAC-5 fix) rejects a /break
   * whose innermost `levels` loops include one opened outside the `$(...)` ("expected a /break
   * that stays inside this $(...)") and compiles nothing; upstream tf compiles it and corrupts its
   * value stack when it runs. A /break with more levels than there are loops, all of them inside
   * the `$(...)`, still compiles in tf dev, and running it stops the macro with "expression stack
   * underflow or dirty" and "invalid frame". Both proven in tf dev, 2026-10-14.
   *
   * Where the rejected /break is in a `$(...)` that is an expression operand (`$[ $(/break) ]`, an
   * `/if` or `/while` condition), at any depth, tf dev prints the same error but still runs the
   * macro, with that `$(...)` giving nothing; elsewhere (a command, `/test` text) the macro doesn't
   * run. Proven in tf dev, 2026-10-14.
   */
  breakOutOfCmdsub(start, end, levels) {
    if (this.cmdsub === 0) return;
    const loops = this.open.filter((o) => o.keyword === "while");
    const ended = loops.slice(-levels).reverse();
    const outside = ended.find((o) => o.cmdsub < this.cmdsub);
    const rule = `A ${code("/break")} inside ${code("$(...)")} can only end ${code("/while")} loops that are inside the same ${code("$(...)")}: tf can't jump out of a command substitution part way through.`;
    if (outside) {
      const cmdsubStart = this.cmdsubStarts[outside.cmdsub].at;
      const runs = this.cmdsubStarts.some((c) => c.inExpression);
      const detail = {
        message: runs ? "This /break would jump out of the $(...) around it, so tf reports an error and leaves it out: end the loop outside the $(...)." : "This /break would jump out of the $(...) around it, so tf rejects the macro: end the loop outside the $(...).",
        label: "jumps out of the $(...)",
        explanation: `${rule} This one would end a loop opened outside it, so tf reports "expected a /break that stays inside this $(...)" when it compiles the macro. ` + (runs ? `Here the ${code("$(...)")} is inside an expression, so tf still runs the macro, with that ${code("$(...)")} giving nothing and the loop never ended by it.` : "The macro then does nothing.") + ` Move the ${code("/break")} out of the ${code("$(...)")}, into the loop's own body. (TinyFugue releases before this check compile it, and running it leaves tf's internal state broken.)`,
        related: [
          { start: cmdsubStart, end: cmdsubStart + 2, message: "the $(...) it would jump out of" },
          { start: outside.start, end: outside.end, message: "the loop it would end" }
        ]
      };
      if (!runs) this.fail("block", start, end, detail);
      this.issues.push({ kind: "block", start, end: Math.max(end, start + 1), ...detail });
      return;
    }
    if (levels > loops.length) {
      const cmdsubStart = this.cmdsubStarts[this.cmdsubStarts.length - 1].at;
      const advice = loops.length === 0 ? `To end the macro, put the ${code("/break")} outside the ${code("$(...)")}; to skip the rest of the ${code("$(...)")}'s commands, wrap them in an ${code("/if")} instead.` : `Give the ${code("/break")} no more levels than there are loops inside the ${code("$(...)")}.`;
      this.issues.push({
        kind: "block",
        start,
        end: Math.max(end, start + 1),
        message: "This /break would jump out of the $(...) around it, and tf stops the macro with an internal error when it runs: only break out of loops inside the $(...).",
        label: "jumps out of the $(...)",
        explanation: `${rule} This one has ${loops.length === 0 ? "no loop" : "more levels than there are loops"} to end inside it. tf compiles it, but running it stops the macro with "expression stack underflow or dirty" and "invalid frame". ${advice}`,
        related: [{ start: cmdsubStart, end: cmdsubStart + 2, message: "the $(...) it would jump out of" }]
      });
    }
  }
  /**
   * `/test`, `/return`, `/result`: the text is substituted at the statement's level, then compiled
   * as an expression. On a plain top-level line nothing is substituted, so it is compiled as
   * written (q04: `/test $[1+2` gives "unmatched $["); on an `/if` line only a run of `%`s changes.
   * In a macro body its substitutions (read by `statement()`) make the text, known only when it runs.
   */
  expressionStatement(subs, keyword) {
    const start = this.i;
    this.statement(subs, keyword);
    this.expressions.push({ start, end: this.i, kind: "statement", level: levelOf(subs) });
    const text = this.s.slice(start, this.i);
    if (subs >= FULL ? /[%$\\]/.test(text) : subs >= NEWLINE && text.includes("%%")) return;
    const sub = new _Parser(text, this.mode);
    try {
      sub.expression(void 0, 0, `/${keyword}`);
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
    }
    for (const issue of sub.issues) this.issues.push(shiftIssue(issue, start));
    for (const span of sub.spans) {
      this.spans.push({
        ...span,
        start: span.start + start,
        end: span.end + start,
        ...span.inner ? { inner: { start: span.inner.start + start, end: span.inner.end + start } } : {}
      });
    }
  }
  /** Statement text, as `expand()` scans it, up to a separator, the end, or a `$(...)`'s `)`. */
  statement(subs, keyword = "") {
    const start = this.i;
    this.statementText(subs, keyword);
    if (!keyword) {
      this.statements.push({ start, end: this.i, level: levelOf(subs), conditional: this.open.length > 0 });
    }
  }
  statementText(subs, keyword) {
    const s = this.s;
    const stmtStart = this.i;
    let command2 = keyword;
    if (!command2 && s[this.i] === "/" && s[this.i + 1] !== "/") {
      const m = /^\/[@!]*([^\s%]*)/.exec(s.slice(this.i));
      command2 = (m?.[1] ?? "").toLowerCase();
    }
    while (this.i < s.length) {
      const ch = s[this.i];
      if (subs >= NEWLINE && ch === "%") {
        if (this.isStatEnd(this.i)) return;
        this.i += 1;
        if (s[this.i] === "%") {
          while (s[this.i] === "%") this.i += 1;
        } else if (subs >= FULL && (s[this.i] === "{" || "#?*-".includes(s[this.i] ?? " ") || isNameChar(s[this.i]))) {
          this.varsub(this.i - 1);
        }
        continue;
      }
      if (subs >= FULL) {
        if (ch === "\\") {
          this.i += 2;
          continue;
        }
        if (ch === "$") {
          this.i += 1;
          this.dollarsub(this.i - 1);
          continue;
        }
        if (this.isCmdsubEnd(this.i)) return;
      }
      if (ch === "/" && this.i > stmtStart && isTfSpace(s[this.i - 1])) {
        const kw = this.keywordAt(this.i + 1);
        if (kw && INNER_KEYWORDS.has(kw.word)) {
          this.mids.push({ start: this.i, end: kw.end, word: kw.word, command: command2, stmt: stmtStart, taken: this.wouldTake(kw.word, command2) });
        }
        const assignment = kw && (kw.word === "if" || kw.word === "while") && subs >= NEWLINE ? assignmentIn(s.slice(stmtStart, this.i)) : void 0;
        if (kw && assignment && stmtStart + assignment.valueStart < this.i) {
          const mid = { start: this.i, end: kw.end, word: kw.word, command: command2, stmt: stmtStart, taken: false };
          this.swallowed.push({ start: this.i, end: kw.end, word: kw.word, stmt: stmtStart, command: command2, edits: this.separateSwallowed([mid]) });
        }
      }
      this.i += 1;
    }
  }
  /**
   * Whether the innermost open block would have taken `word` as its keyword, had it started a
   * statement (MidKeyword.taken). Not in a /test, /return or /result, whose strings hold text.
   */
  wouldTake(word, command2) {
    const open = this.open[this.open.length - 1];
    if (!open || open.cmdsub !== this.cmdsub || ["test", "return", "result"].includes(command2)) return false;
    if (word === "else" || word === "elseif") return this.block === "then";
    if (word === "endif") return this.block === "then" || this.block === "else";
    return word === "done" && this.block === "do";
  }
  /**
   * The block that opened at `start` closed: each /let or /set statement in it holding a keyword
   * the block would have taken ran it as text, with no error (`/if (1) /set a=1 /else /set b=2%; /endif` sets a to
   * `1 /else /set b=2`). A warning, with the fix pairSwallowed() checks.
   */
  takenAsText(start) {
    const done = /* @__PURE__ */ new Set();
    for (const m of this.mids) {
      if (m.start <= start || !m.taken || done.has(m.stmt)) continue;
      if (!assignmentIn(this.s.slice(m.stmt, m.start))) continue;
      done.add(m.stmt);
      const group = this.mids.filter((x) => x.stmt === m.stmt && x.start > start && x.taken);
      const words2 = group.map((x) => `/${x.word}`);
      const list = words2.length > 1 ? `${words2.slice(0, -1).join(", ")} and ${words2[words2.length - 1]}` : `${words2[0]}`;
      const what = swallower(this.s, m.stmt, m.start, m.command);
      const issue = {
        kind: "keyword-warning",
        start: m.start,
        end: m.end,
        message: `/${m.word} here is not a keyword: it is part of ${what}, so tf runs it as text: put %; before it if it should start a statement.`,
        label: `part of ${what}`,
        explanation: `tf only reads a keyword at the start of a statement, and statements are separated by ${code("%;")}. ${takesTheRest(m.command, m.word, what)} The block still closes, so tf loads this without an error, but ${code(`/${m.word}`)} is never the block's.`,
        ...this.startsValue(group) ? {} : { fix: { title: `Put %; before ${list}`, edits: this.separateSwallowed(group) } }
      };
      this.issues.push(issue);
      this.warned.set(issue, { word: m.word, what, command: m.command });
    }
  }
  /** `%{...}` or `%name`, with `this.i` just after the `%` at `percent` (`varsub()`). */
  varsub(percent) {
    this.deeper(() => this.varsubAt(percent));
  }
  varsubAt(percent) {
    const s = this.s;
    const bracket = s[this.i] === "{";
    if (bracket) this.i += 1;
    const inner2 = this.i;
    if ((s[this.i] === "#" || s[this.i] === "?") && (!bracket || s[this.i + 1] === "}")) {
      this.i += 1;
    } else {
      let n = -1;
      let except = false;
      let ell = false;
      let pee = false;
      let star = false;
      if (isDigit(s[this.i])) {
        n = 0;
        while (isDigit(s[this.i])) n = n * 10 + Number(s[this.i++]);
      } else {
        if (s[this.i] === "-") {
          except = true;
          this.i += 1;
        }
        ell = s[this.i] === "L";
        pee = s[this.i] === "P";
        star = s[this.i] === "*";
        if (ell || pee || star) this.i += 1;
        if (!star && isDigit(s[this.i])) {
          n = 0;
          while (isDigit(s[this.i])) n = n * 10 + Number(s[this.i++]);
        }
      }
      if (n < 0 && !star || bracket && (ell || pee)) {
        if (isNameChar(s[this.i])) {
          ell = pee = false;
          n = -1;
          while (isNameChar(s[this.i])) this.i += 1;
        }
      }
      if (!star && !pee && (ell || n > 0)) except = false;
      if (except) {
        this.fail(
          "substitution",
          percent,
          this.i,
          star || pee || n === 0 ? {
            message: "A leading - only goes with a positive number or L (%-1, %-L2), not with *, P or 0.",
            label: "- not allowed here"
          } : {
            message: "%- starts a substitution, but no parameter follows it. Write %%- for a literal %-.",
            label: "not a substitution",
            explanation: `In a macro body, ${code("%-")} always starts a substitution of the parameters after one, like ${code("%-1")} (all but the first) or ${code("%-L")} (all but the last). ${code("%%")} writes a literal ${code("%")}.`,
            fix: { title: "Write %%- for a literal %-", edits: [{ start: percent, end: percent, newText: "%" }] }
          }
        );
      }
    }
    const hasDefault = s[this.i] === "-";
    if (hasDefault) {
      this.i += 1;
      while (this.i < s.length) {
        const ch = s[this.i];
        if (this.isStatEnd(this.i) || this.isCmdsubEnd(this.i)) break;
        if (bracket && ch === "}") break;
        if (!bracket && isTfSpace(ch)) break;
        if (ch === "%") {
          this.i += 1;
          if (s[this.i] === "%") while (s[this.i] === "%") this.i += 1;
          else if (s[this.i] === "{" || "#?*-".includes(s[this.i] ?? " ") || isNameChar(s[this.i])) this.varsub(this.i - 1);
        } else if (ch === "$") {
          this.i += 1;
          this.dollarsub(this.i - 1);
        } else if (ch === "\\") {
          this.i += 2;
        } else {
          this.i += 1;
        }
      }
    }
    if (!bracket) this.spans.push({ start: percent, end: this.i, kind: "substitution" });
    if (bracket) {
      if (s[this.i] === "}") {
        this.i += 1;
        this.spans.push({ start: percent, end: this.i, kind: "substitution", inner: { start: inner2, end: this.i - 1 } });
        return;
      }
      const ch = s[this.i];
      const opener = s[percent] === "%" ? "%{" : "{";
      const openerEnd = percent + opener.length;
      const ended = this.i >= s.length || this.isStatEnd(this.i) || ch === "\r" && this.i === s.length - 1;
      if (!ended && !hasDefault && (ch === "%" || ch === "$")) {
        const selector = s.slice(inner2, this.i);
        const other = ch === "%" ? "%{...}" : "$[...]";
        this.fail("substitution", this.i, this.i + 1, {
          message: `${opener}${selector} needs a } or a - after the name: another substitution can't follow it directly.`,
          label: "needs } or - here",
          explanation: `After the name in ${code(`${opener}${selector}`)}, tf only accepts ${code("}")}, which ends the substitution, or ${code("-")}, which starts a default value. To use another substitution as the default, write ${code(`${opener}${selector}-${other}}`)}; to put two values side by side, close the first one: ${code(`${opener}${selector}}${other}`)}.`,
          related: [{ start: percent, end: openerEnd, message: `this ${opener}` }]
        });
      }
      const cutShort = this.isStatEnd(this.i) && s.indexOf("}", this.i) >= 0;
      const close = { title: cutShort ? `Close it with } before the ${s.slice(this.i, this.i + 2)}` : "Close it with }", edits: [this.insertAtEnd(this.i, "}")] };
      this.fail(
        "substitution",
        percent,
        openerEnd,
        !ended ? {
          message: `This ${opener} needs its } before the ${charName(ch)}.`,
          label: "not closed",
          explanation: `${code(`${opener}...}`)} holds the name of a variable or parameter, and a name can't contain a ${charName(ch)}. To put text after the substitution, close it first: ${code(`${opener}name} text`)}.`,
          related: [{ start: this.i, end: this.i + 1, message: `the name stops at this ${charName(ch)}` }],
          fix: { title: `Close it with } before the ${charName(ch)}`, edits: [{ start: this.i, end: this.i, newText: "}" }] }
        } : cutShort ? {
          message: `This ${opener} is cut short by the ${s.slice(this.i, this.i + 2)} before its }: a separator ends the statement, even inside a substitution.`,
          label: "cut short",
          explanation: `${code(s.slice(this.i, this.i + 2))} ends the statement, even inside a ${code(`${opener}...}`)}, so tf never reaches the ${code("}")} after it, and rejects the ${code(opener)}. Closing it before the separator leaves that ${code("}")} after it, which tf sends to the world.`,
          fix: close
        } : { message: `This ${opener} is never closed: add }.`, label: "never closed", fix: close }
      );
    }
  }
  /**
   * `$$...`, `$[...]`, `$(...)` or `${name}`/`$name`, with `this.i` just after the `$` at `dollar`;
   * `inExpression` when it is an operand of an expression.
   */
  dollarsub(dollar, inExpression = false) {
    const s = this.s;
    if (s[this.i] === "$") {
      while (s[this.i] === "$") this.i += 1;
    } else if (s[this.i] === "[") {
      this.i += 1;
      const start = this.i;
      this.expression("]", dollar);
      this.expressions.push({ start, end: this.i - 1, kind: "bracket" });
      this.spans.push({ start: dollar, end: this.i, kind: "substitution", inner: { start, end: this.i - 1 } });
    } else if (s[this.i] === "(") {
      this.i += 1;
      const start = this.i;
      this.cmdsub += 1;
      this.cmdsubStarts.push({ at: dollar, inExpression });
      const outer = this.block;
      this.cmdsubBlocks.push(outer);
      this.block = "";
      this.list(FULL);
      this.block = outer;
      this.cmdsubBlocks.pop();
      this.cmdsub -= 1;
      this.cmdsubStarts.pop();
      this.dropMids(dollar);
      if (s[this.i] !== ")") {
        this.fail("substitution", dollar, dollar + 2, {
          message: "This $( is never closed: add ).",
          label: "never closed",
          fix: { title: "Close it with ) at the end", edits: [this.insertAtEnd(this.i, ")")] }
        });
      }
      this.cmdsubs.push({ start, end: this.i });
      this.i += 1;
      this.spans.push({ start: dollar, end: this.i, kind: "substitution", inner: { start, end: this.i - 1 } });
    } else {
      this.macsub(dollar);
    }
  }
  /** `${name}` or `$name` (`macsub()`). */
  macsub(dollar) {
    const s = this.s;
    const bracket = s[this.i] === "{";
    if (bracket) this.i += 1;
    while (this.i < s.length) {
      const ch = s[this.i];
      if (ch === "\\") {
        this.i += 2;
      } else if (this.isStatEnd(this.i) || this.isCmdsubEnd(this.i) || ch === "}") {
        break;
      } else if (!bracket && isTfSpace(ch)) {
        break;
      } else if (ch === "$") {
        if (s[this.i + 1] === "$") {
          while (s[this.i + 1] === "$") this.i += 1;
          this.i += 1;
        } else if (!bracket) {
          break;
        } else {
          this.i += 1;
        }
      } else if (ch === "%") {
        this.i += 1;
        if (s[this.i] === "%") while (s[this.i] === "%") this.i += 1;
        else if (s[this.i] === "{" || "#?*-".includes(s[this.i] ?? " ") || isNameChar(s[this.i])) this.varsub(this.i - 1);
      } else {
        this.i += 1;
      }
    }
    if (bracket) {
      if (s[this.i] !== "}") {
        this.fail("substitution", dollar, dollar + 2, {
          message: "This ${ is never closed: add }.",
          label: "never closed",
          fix: { title: "Close it with }", edits: [this.insertAtEnd(this.i, "}")] }
        });
      }
      this.i += 1;
      this.spans.push({ start: dollar, end: this.i, kind: "substitution", inner: { start: dollar + 2, end: this.i - 1 } });
    } else if (s[this.i] === "$") {
      this.i += 1;
    }
  }
  /** An `/if (...)` or `/while (...)` condition, with `this.i` at the `(`. */
  condition(keyword) {
    const open = this.i;
    this.i += 1;
    this.expression(")", open, keyword);
    this.expressions.push({ start: open + 1, end: this.i - 1, kind: "condition" });
    this.spans.push({ start: open, end: this.i, kind: "condition", inner: { start: open + 1, end: this.i - 1 } });
  }
  /**
   * An expression, up to its closing `close` (`]` for `$[`, `)` for a condition), or to the end of
   * the text when `close` is undefined. Only strings and parentheses are followed: enough to find
   * where it ends, not to check its grammar.
   */
  expression(close, open, keyword) {
    this.deeper(() => this.expressionAt(close, open, keyword));
  }
  /**
   * A `$[...]` from `dollar` to `this.i` that is an operand of the expression that started at
   * `from` (`primary_expr()` warns "legal, but redundant"). `$[` compiles its inside with `expr()`,
   * which is `comma_expr()`, the same code `(` compiles, so `(...)` always means the same; when it
   * is a whole condition, `($[x])` can be `(x)`.
   */
  dollarOperand(dollar, from, close, keyword, inParens) {
    const s = this.s;
    const end = this.i - 1;
    let after = this.i;
    while (isTfSpace(s[after])) after += 1;
    const whole = !inParens && s.slice(from, dollar).trim() === "" && (close ? s[after] === close : after >= s.length);
    const drop = whole && close === ")";
    const what = close === ")" ? "the condition" : close === "]" ? "the $[...] around it" : `${keyword ?? "/test"}'s text`;
    this.issues.push({
      kind: "operand",
      start: dollar,
      end: dollar + 2,
      message: drop ? `This $[...] is redundant, as ${what} is already an expression: drop the $[ and ].` : `This $[...] is redundant, as ${what} is already an expression: write (...) instead.`,
      label: "redundant",
      explanation: `${what[0]?.toUpperCase()}${what.slice(1)} is an expression, and inside an expression ${code("$[...]")} means the same as ${code("(...)")}. tf warns that it is legal, but redundant: once per session, or every time when ${code("%pedantic")} is on.`,
      related: [{ start: end, end: end + 1, message: "its ]" }],
      fix: drop ? { title: "Remove the $[ and ]", edits: [{ start: dollar, end: dollar + 2, newText: "" }, { start: end, end: end + 1, newText: "" }] } : { title: "Write (...) instead of $[...]", edits: [{ start: dollar, end: dollar + 2, newText: "(" }, { start: end, end: end + 1, newText: ")" }] }
    });
  }
  /**
   * A `%x` or `%{x}` from `percent` to `this.i` that is an operand of an expression: `varsub()`
   * reads it as it reads `{x}`, and warns that it "can be confusing". `{x}` is the same read with
   * no warning, so the fix drops the `%`, or puts the selector in braces when there were none (not
   * when its default holds a brace, which would end it early).
   */
  percentOperand(percent) {
    const text = this.s.slice(percent, this.i);
    const bracket = text[1] === "{";
    const braced = bracket ? text.slice(1) : `{${text.slice(1)}}`;
    const exact = bracket || !/[{}]/.test(text);
    this.issues.push({
      kind: "operand",
      start: percent,
      end: this.i,
      message: `This ${text} works in an expression, but tf warns that it can be confusing: write ${braced} instead.`,
      label: `write ${braced}`,
      explanation: `In an expression, ${code("{x}")} reads the variable or parameter ${code("x")}. ${code("%{x}")} reads it too, but tf warns that it can be confusing there, since outside an expression ${code("%{x}")} puts the value into the text before the command runs. tf prints the warning once per session, or every time when ${code("%pedantic")} is on.`,
      ...exact ? { fix: { title: `Write ${braced}`, edits: [bracket ? { start: percent, end: percent + 1, newText: "" } : { start: percent, end: this.i, newText: braced }] } } : {}
    });
  }
  expressionAt(close, open, keyword) {
    const s = this.s;
    const from = this.i;
    const parens = [];
    while (this.i < s.length) {
      const ch = s[this.i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const quote = this.i;
        this.i += 1;
        while (this.i < s.length && s[this.i] !== ch) this.i += s[this.i] === "\\" ? 2 : 1;
        if (this.i >= s.length) {
          this.fail("expression", quote, quote + 1, {
            message: `This string is never closed: add the closing ${ch}.`,
            label: "never closed",
            explanation: `Inside an expression (${code("$[...]")}, a condition or ${code("/test")}), ${code(ch)} starts a string that runs to the next ${code(ch)}. This one never finds its closing ${code(ch)}, so it takes everything after it, including any ${code("]")} or ${code(")")}.`
          });
        }
        this.i += 1;
        this.spans.push({ start: quote, end: this.i, kind: "string", inner: { start: quote + 1, end: this.i - 1 } });
        continue;
      }
      if (close && this.isStatEnd(this.i)) break;
      if (ch === "$") {
        const dollar = this.i;
        this.i += 1;
        this.dollarsub(dollar, true);
        if (s[dollar + 1] === "[") this.dollarOperand(dollar, from, close, keyword, parens.length > 0);
        continue;
      }
      if (ch === "%") {
        const percent = this.i;
        this.i += 1;
        if (s[this.i] === "%") {
          while (s[this.i] === "%") this.i += 1;
        } else if (s[this.i] === "{" || "#?*-".includes(s[this.i] ?? " ") || isNameChar(s[this.i])) {
          this.varsub(percent);
          this.percentOperand(percent);
        }
        continue;
      }
      if (ch === "{") {
        this.varsub(this.i);
        continue;
      }
      if (ch === "(") parens.push(this.i);
      else if (ch === ")") {
        if (parens.length === 0) {
          if (close === ")") {
            this.i += 1;
            return;
          }
          this.fail("expression", this.i, this.i + 1, {
            message: close === "]" ? "This ) has no matching ( inside the $[...]." : "This ) has no matching (.",
            label: "no matching (",
            fix: { title: "Remove the )", edits: [{ start: this.i, end: this.i + 1, newText: "" }] }
          });
        }
        const paren = parens.pop();
        this.spans.push({ start: paren, end: this.i + 1, kind: "paren", inner: { start: paren + 1, end: this.i } });
      } else if (ch === "]" && close === "]") {
        if (parens.length > 0) {
          const paren = parens[parens.length - 1];
          this.fail("expression", this.i, this.i + 1, {
            message: "A ( in this $[...] is never closed: add ) before the ].",
            label: "the $[...] ends here",
            related: [{ start: paren, end: paren + 1, message: "this ( is never closed" }],
            fix: { title: "Add ) before the ]", edits: [this.insertAtEnd(this.i, ")".repeat(parens.length))] }
          });
        }
        this.i += 1;
        return;
      }
      this.i += 1;
    }
    if (close === "]") {
      this.fail("expression", open, open + 2, {
        message: "This $[ is never closed: add ].",
        label: "never closed",
        explanation: `A ${code("$[")} runs to its matching ${code("]")}, which has to come before the next ${code("%;")}.`,
        fix: { title: "Close it with ] at the end of the statement", edits: [this.insertAtEnd(this.i, `${")".repeat(parens.length)}]`)] }
      });
    } else if (close === ")") {
      this.fail("expression", open, open + 1, {
        message: `The ${keyword ?? ""} condition's ( is never closed: add ).`,
        label: "never closed"
      });
    } else if (parens.length > 0) {
      const paren = parens[parens.length - 1];
      this.fail("expression", paren, paren + 1, {
        message: "This ( is never closed: add ).",
        label: "never closed",
        fix: { title: "Add ) at the end", edits: [this.insertAtEnd(s.length, ")".repeat(parens.length))] }
      });
    }
  }
};
function checkStructure(text, mode) {
  return parseSettled(text, mode).issues;
}
var STOPS = /* @__PURE__ */ new Set(["block", "keyword", "continuation"]);
function firstStop(issues) {
  return issues.find((i) => STOPS.has(i.kind));
}
function unedited(pos, edits) {
  let delta = 0;
  for (const e of [...edits].sort((a, b) => a.start - b.start)) {
    if (pos < e.start + delta + e.newText.length) break;
    delta += e.newText.length - (e.end - e.start);
  }
  return pos - delta;
}
var NOISE = /* @__PURE__ */ new Set(["empty-statement"]);
function noise(issues) {
  let n = 0;
  for (const i of issues) if (NOISE.has(i.kind)) n += 1;
  return n;
}
var MAX_TRIES = 64;
var Trial = class {
  constructor(s, mode, baseNoise) {
    this.s = s;
    this.mode = mode;
    this.baseNoise = baseNoise;
  }
  s;
  mode;
  baseNoise;
  tries = 0;
  /**
   * Where tf would first stop in `s` with `edits` applied, as an offset into `s` (Infinity if
   * nowhere); -1 if the edits bring in a warning tf gives that `s` doesn't have, or the budget is spent.
   */
  stopAfter(edits) {
    if (this.tries >= MAX_TRIES) return -1;
    this.tries += 1;
    let t = this.s;
    for (const e of [...edits].sort((a, b) => b.start - a.start)) t = t.slice(0, e.start) + e.newText + t.slice(e.end);
    const p = new Parser(t, this.mode);
    p.run();
    if (noise(p.issues) > this.baseNoise) return -1;
    const stop = firstStop(p.issues);
    return stop ? unedited(stop.start, edits) : Infinity;
  }
};
function strayNote(issue) {
  return { start: issue.start, end: issue.end, message: issue.message.replace(/^This /, "the ").replace(/(?:: it is .*)?\.$/, "") };
}
function parseSettled(s, mode) {
  const p = new Parser(s, mode);
  p.run();
  const issues = [...p.issues];
  const swallowed = [];
  const trial = new Trial(s, mode, noise(issues));
  const block = issues.find((i) => i.kind === "block");
  const resolves = (edits) => !!block && trial.stopAfter(edits) === Infinity;
  if (block && block === firstStop(issues)) {
    const before2 = (x) => x.start < block.start;
    const warning = issues.filter((i) => i.kind === "keyword-warning" && i.fix).reverse().find((i) => resolves(i.fix.edits));
    if (warning) {
      const taken = p.warned.get(warning);
      const stray = strayNote(block);
      const closer = block.fix?.title.replace(/^Add/, "add");
      const turned = {
        ...warning,
        kind: "keyword",
        message: closer ? `/${taken.word} here is not a keyword: it is part of ${taken.what}, so ${stray.message}: put %; before it, or if it is meant as text, ${closer}.` : `/${taken.word} here is not a keyword: it is part of ${taken.what}, so ${stray.message}: put %; before it.`,
        ...block.fix ? { alternative: block.fix } : {},
        explanation: `tf only reads a keyword at the start of a statement, and statements are separated by ${code("%;")}. ${takesTheRest(taken.command, taken.word, taken.what)} That leaves ${code(s.slice(block.start, block.end))} with nothing to belong to, which is the error tf reports.`,
        related: [stray]
      };
      issues.splice(issues.indexOf(warning), 1, turned);
      issues.splice(issues.indexOf(block), 1);
    } else {
      const alone = (x) => p.swallowed.filter((y) => y.stmt === x.stmt).length === 1;
      const w = [...p.swallowed].reverse().find((x) => x.edits.length > 0 && before2(x) && alone(x) && resolves(x.edits));
      if (w) {
        swallowed.push({ ...w, stray: strayNote(block) });
        issues.splice(issues.indexOf(block), 1);
      }
    }
  }
  const stop = firstStop(issues)?.start ?? Infinity;
  for (const issue of issues) {
    if ((issue.kind === "keyword-warning" || issue.kind === "glued") && issue.fix) {
      const after = trial.stopAfter(issue.fix.edits);
      if (after < 0 || after < stop) delete issue.fix;
    }
  }
  return { issues, swallowed };
}
var DEF_RE2 = /^\s*\/@?(?:def|edit)\b/i;
var SPLIT_ARGS_RE = /^\s*\/(?:@?(?:bind|hook|gag|hilite)|trigpc|trigc|trigp|trig)\b/i;
var ALIAS_RE = /^(\s*\/alias\s+\S+\s+)\S/i;
function macroBodyStart(text) {
  const alias = ALIAS_RE.exec(text);
  if (alias) return alias[1].length;
  let from;
  const def = DEF_RE2.exec(text);
  if (def) from = defOptionsEnd(text, def[0].length);
  else if (SPLIT_ARGS_RE.test(text)) from = 0;
  else return -1;
  const eq = text.indexOf("=", from);
  return eq < 0 ? -1 : eq + 1;
}
function parseStatements(text, mode) {
  const parser = new Parser(text, mode);
  parser.run();
  return parser.stopped ? [] : parser.statements;
}
function parseRegions(text, mode) {
  const parser = new Parser(text, mode);
  parser.run();
  return {
    statements: parser.statements,
    expressions: parser.expressions,
    cmdsubs: parser.cmdsubs,
    spans: parser.spans,
    blocks: parser.blocks,
    issues: parser.issues,
    stopped: parser.stopped
  };
}
function parseUnits(body) {
  const parser = new Parser(body, "body");
  parser.run();
  return { units: parser.units, lists: parser.lists, complete: !parser.stopped && !parser.issues.some((i) => i.kind === "too-deep") };
}
function entryStatements(entry) {
  const statements = parseStatements(entry.text, "top");
  const body = entry.isDefBody || entry.isOtherMacroBody ? macroBodyStart(entry.text) : -1;
  if (body >= 0) {
    for (const st of parseStatements(entry.text.slice(body), "body")) {
      statements.push({ ...st, start: st.start + body, end: st.end + body });
    }
  }
  return statements;
}
var cache = /* @__PURE__ */ new WeakMap();
function entryModel(entry) {
  let model = cache.get(entry);
  if (!model) {
    const top = parseSettled(entry.text, "top");
    model = { issues: top.issues, swallowed: [...top.swallowed] };
    const body = entry.isDefBody || entry.isOtherMacroBody ? macroBodyStart(entry.text) : -1;
    if (body >= 0) {
      const parser = parseSettled(entry.text.slice(body), "body");
      for (const issue of parser.issues) model.issues.push(shiftIssue(issue, body));
      for (const w of parser.swallowed) {
        const edits = w.edits.map((e) => ({ ...e, start: e.start + body, end: e.end + body }));
        const stray = w.stray && { ...w.stray, start: w.stray.start + body, end: w.stray.end + body };
        model.swallowed.push({ ...w, start: w.start + body, end: w.end + body, stmt: w.stmt + body, edits, ...stray ? { stray } : {} });
      }
    }
    cache.set(entry, model);
  }
  return model;
}
function entryStructure(entry) {
  return entryModel(entry).issues;
}
function entrySwallowed(entry) {
  return entryModel(entry).swallowed;
}

// packages/core/src/joinFix.ts
var JOIN_MAX_LINES = 20;
var MAX_LINES = JOIN_MAX_LINES;
var MAX_TRIES2 = 80;
var MAX_SLICE = 2e4;
var MAX_TOTAL_TRIES = 1500;
var CLOSER_RE = /(?<![^ \t;|\\])\/(?:endif|done)(?=[ \t\r\f\v%)]|$)/i;
var TOP_BLOCK_RE = /^\/(?:if|while)\b/i;
var KEYWORD_END_RE = /(?:^|%;[ \t]*)\/(?:do|then)$/i;
var CLOSES_RE = /(?:^|[ \t;|\\])\/(?:endif|done)(?:[ \t\r\f\v]|%[;|\\])*$/i;
var STRAY_KEYWORD_RE = /^\/(?:then|else|elseif|endif|do|done)(?![^ \t\r\f\v%])/i;
var SETTLE_CODES = /* @__PURE__ */ new Set(["block-structure", "empty-statement"]);
var settles = (d) => SETTLE_CODES.has(d.code);
function separates(entry) {
  if (entry.isDefBody || entry.isOtherMacroBody) return "body";
  return TOP_BLOCK_RE.test(entry.text) ? "top" : void 0;
}
var SeparatorScanner = class {
  constructor(mode) {
    this.mode = mode;
  }
  mode;
  escaped = false;
  percents = 0;
  content = false;
  /** The text so far ends with a separator. */
  atSeparator = false;
  /** Separators with nothing but blanks since the one before (or the start): empty statements. */
  empty = 0;
  /** Where each separator read so far ends, in characters fed. */
  separators = [];
  fed = 0;
  feed(text) {
    for (const ch of text) {
      this.fed += 1;
      if (this.escaped) {
        this.escaped = false;
        this.text();
      } else if (this.percents === 1 && (ch === ";" || ch === "|" || ch === "\\")) {
        if (!this.content) this.empty += 1;
        this.separators.push(this.fed);
        this.content = false;
        this.percents = 0;
        this.atSeparator = true;
      } else if (ch === "%") {
        if (this.percents > 0) this.content = true;
        this.percents += 1;
        this.atSeparator = false;
      } else if (ch === "\\" && this.mode === "body") {
        this.escaped = true;
        this.text();
      } else if (isTfSpace(ch) && this.percents === 0) {
        this.atSeparator = false;
      } else {
        this.text();
      }
    }
    return this;
  }
  text() {
    this.content = true;
    this.percents = 0;
    this.atSeparator = false;
  }
};
function runsBody(word) {
  return TAKES_COMMANDS.test(word);
}
function commandOf(line) {
  return (/^\/[@!]*([^\s%]*)/.exec(line.slice(leadingWhitespaceLength(line)))?.[1] ?? "").toLowerCase();
}
function partOf(line) {
  const part = line.slice(leadingWhitespaceLength(line));
  return continuesToNextLine(part) ? part.slice(0, -1) : part;
}
function joinedText(lines, from, to) {
  let text = "";
  for (let k = from; k <= to; k += 1) if (!isCommentLine(lines[k] ?? "")) text += partOf(lines[k] ?? "");
  return text;
}
function continued(line, next, mode, header, scan2) {
  if (line.endsWith("\r") || isBlankLine(line)) return void 0;
  let end = line.length;
  while (end > 0 && isTfSpace(line[end - 1])) end -= 1;
  const body = line.slice(0, end);
  if (continuesToNextLine(body)) {
    scan2.feed(partOf(body));
    return body;
  }
  const own = body.slice(leadingWhitespaceLength(body));
  scan2.feed(own);
  const command2 = next[leadingWhitespaceLength(next)] === "/";
  const keyword = KEYWORD_END_RE.test(own);
  const sep = mode !== void 0 && command2 && !header && !keyword && !scan2.atSeparator;
  const added = !sep ? " " : body.endsWith("%") || mode === "body" && body.endsWith("\\") ? " %; " : "%; ";
  scan2.feed(added);
  return `${body}${added}\\`;
}
function joined(lines, base, from, to, mode) {
  let previous = lines[from] ?? "";
  for (let k = from + 1; k <= to; k += 1) {
    const line = lines[k] ?? "";
    if (isCommentLine(line) || isBlankLine(line)) continue;
    const own = (m) => new SeparatorScanner(m).feed(partOf(line)).separators;
    if (mode === "top" && own("top").length > 0) return void 0;
    if (mode === "body" && own("body").join() !== own("top").join()) return void 0;
    if (mode === "body" && own("body").length > 0 && runsBody(commandOf(line))) return void 0;
    if (mode === "top" && /%%/.test(line)) return void 0;
    if (!continuesToNextLine(previous) && line[leadingWhitespaceLength(line)] !== "/") return void 0;
    previous = line;
  }
  const out = lines.slice(base, to + 1);
  const scan2 = new SeparatorScanner(mode);
  scan2.feed(joinedText(lines, base, from - 1));
  let header = mode === "body";
  for (let k = from; k < to; k += 1) {
    const line = out[k - base] ?? "";
    if (isCommentLine(line)) continue;
    let n = k + 1;
    while (n < to && isCommentLine(out[n - base] ?? "")) n += 1;
    if (header) {
      const sofar = joinedText(out, 0, k - base);
      const start = macroBodyStart(sofar);
      header = start >= 0 && sofar.slice(start).trim() === "";
    }
    const next = continued(line, out[n - base] ?? "", mode, header, scan2);
    if (next === void 0) return void 0;
    out[k - base] = next;
  }
  return out;
}
function applyLineEdits(lines, edits) {
  if (edits.some((e) => e.range.start.line !== e.range.end.line || e.newText.includes("\n"))) return void 0;
  const out = lines.slice();
  const ordered = [...edits].sort((a, b) => b.range.start.line - a.range.start.line || b.range.start.character - a.range.start.character);
  for (const e of ordered) {
    const line = out[e.range.start.line] ?? "";
    out[e.range.start.line] = line.slice(0, e.range.start.character) + e.newText + line.slice(e.range.end.character);
  }
  return out;
}
var key = (d) => `${d.code}\0${d.message}`;
function counts(diagnostics) {
  const m = /* @__PURE__ */ new Map();
  for (const d of diagnostics) m.set(d.code, (m.get(d.code) ?? 0) + 1);
  return m;
}
function settle(slice2, before2, diagnose) {
  const old = new Set(before2.map(key));
  let lines = slice2;
  let diagnostics = diagnose(lines.join("\n"));
  for (let round = 0; round < 6; round += 1) {
    const d = diagnostics.find((x) => settles(x) && x.fix && !x.fix.title.startsWith("Add ") && !old.has(key(x)));
    const next = d?.fix && applyLineEdits(lines, d.fix.edits);
    if (!next) break;
    lines = next;
    diagnostics = diagnose(lines.join("\n"));
  }
  return { lines, diagnostics };
}
function emptyStatements(lines, mode) {
  return mode === void 0 ? 0 : new SeparatorScanner(mode).feed(joinedText(lines, 0, lines.length - 1)).empty;
}
function lineEdits(before2, after, base) {
  const edits = [];
  before2.forEach((was, i) => {
    const now = after[i] ?? "";
    if (was === now) return;
    let p = 0;
    while (p < was.length && p < now.length && was[p] === now[p]) p += 1;
    let s = 0;
    while (s < was.length - p && s < now.length - p && was[was.length - 1 - s] === now[now.length - 1 - s]) s += 1;
    const range = { start: { line: base + i, character: p }, end: { line: base + i, character: was.length - s } };
    edits.push({ range, newText: now.slice(p, now.length - s) });
  });
  return edits;
}
function joinFix(lines, entry, first, minLast, gone, diagnose, closerOnly, stopAt = /* @__PURE__ */ new Set()) {
  const separate = separates(entry);
  const base = entry.startLine;
  let fallback;
  for (let last = minLast; last < lines.length && last <= first + MAX_LINES; last += 1) {
    const line = lines[last] ?? "";
    if (isBlankLine(line) || stopAt.has(last)) break;
    if (isCommentLine(line) || continuesToNextLine(line)) continue;
    if ((closerOnly || last > minLast) && !CLOSER_RE.test(line)) continue;
    const candidate = joined(lines, base, first, last, separate);
    if (!candidate) break;
    const original = lines.slice(base, last + 1);
    const before2 = diagnose(original.join("\n"));
    const settled = settle(candidate, before2, diagnose);
    if (!gone(settled.diagnostics)) continue;
    const had = counts(before2);
    if ([...counts(settled.diagnostics)].some(([code3, n]) => n > (had.get(code3) ?? 0))) continue;
    if (emptyStatements(settled.lines, separate) > emptyStatements(original, separate)) continue;
    const edits = lineEdits(original, settled.lines, base);
    const join6 = { edits, clean: !settled.diagnostics.some((d) => d.severity === "error"), from: base, to: last };
    if (join6.clean) return join6;
    fallback ??= join6;
  }
  return fallback;
}
function joinAndClose(lines, entry, last, closer, diagnose) {
  const separate = separates(entry);
  const base = entry.startLine;
  const candidate = joined(lines, base, entry.endLine, last, separate);
  if (!candidate) return void 0;
  const end = candidate.length - 1;
  const tail = (candidate[end] ?? "").replace(/[ \t\f\v]+$/, "");
  const scan2 = new SeparatorScanner(separate).feed(joinedText(candidate, 0, end));
  candidate[end] = `${tail}${scan2.atSeparator ? " " : tail.endsWith("%") ? " %; " : "%; "}/${closer}`;
  const original = lines.slice(base, last + 1);
  const settled = settle(candidate, diagnose(original.join("\n")), diagnose);
  if (settled.diagnostics.some((d) => d.severity === "error")) return void 0;
  if (emptyStatements(settled.lines, separate) > emptyStatements(original, separate)) return void 0;
  if (hasEmptyBranch(joinedText(settled.lines, 0, settled.lines.length - 1))) return void 0;
  return { edits: lineEdits(original, settled.lines, base), clean: true, from: base, to: last };
}
function conditionEnd(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i += 1;
      while (i < s.length && s[i] !== ch) i += s[i] === "\\" ? 2 : 1;
    } else if (ch === "(") depth += 1;
    else if (ch === ")" && --depth === 0) return i + 1;
  }
  return -1;
}
function simpleBlock(lines, d, entry, related) {
  if (related.length === 0 || entry.startLine !== entry.endLine || d.range.start.character !== 0) return false;
  const line = (lines[entry.startLine] ?? "").replace(/[ \t\r\f\v]+$/, "");
  const opener = /^\/(if|while)[ \t]*/i.exec(line);
  if (!opener || line[opener[0].length] !== "(") return false;
  if (conditionEnd(line, opener[0].length) !== line.length) return false;
  const isIf = opener[1].toLowerCase() === "if";
  const rows = [...related].sort((a, b) => a.range.start.line - b.range.start.line);
  let elses = 0;
  let body = 0;
  for (const r of rows) {
    const text = (lines[r.range.start.line] ?? "").trim();
    if (/^\/else$/i.test(text) && isIf && elses === 0 && body > 0) {
      elses += 1;
      body = 0;
    } else if (r.message.includes("line before it has no") && leadingWhitespaceLength(lines[r.range.start.line] ?? "") > 0) {
      body += 1;
    } else {
      return false;
    }
  }
  return body > 0;
}
function hasEmptyBranch(text) {
  return parseRegions(text, "top").blocks.some((b) => b.parts.some((p) => text.slice(p.start, p.end).replace(/%[;|\\]/g, "").trim() === ""));
}
function entryAt(entries, line) {
  let lo = 0;
  let hi = entries.length - 1;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    const e = entries[mid];
    if (line < e.startLine) hi = mid - 1;
    else if (line > e.endLine) lo = mid + 1;
    else return e;
  }
  return void 0;
}
function touches(fix, line) {
  return !!fix && fix.edits.some((e) => e.range.start.line <= line && line <= e.range.end.line);
}
function addJoinFixes(text, diagnostics, diagnoseSlice) {
  let total = 0;
  addJoins(text, diagnostics, (t) => {
    total += 1;
    if (total > MAX_TOTAL_TRIES) throw new OutOfTries();
    return diagnoseSlice(t);
  });
}
var OutOfTries = class extends Error {
};
function attempt(diagnoseSlice, fn) {
  let tries = 0;
  const diagnose = (t) => {
    tries += 1;
    if (tries > MAX_TRIES2 || t.length > MAX_SLICE) throw new OutOfTries();
    return diagnoseSlice(t);
  };
  try {
    return fn(diagnose);
  } catch (e) {
    if (e instanceof OutOfTries) return void 0;
    throw e;
  }
}
function indentedRuns(diagnostics) {
  const runs = [];
  const indented = diagnostics.filter((d) => d.code === "indented-line-after-command").sort((a, b) => a.range.start.line - b.range.start.line);
  for (const d of indented) {
    const run = runs[runs.length - 1];
    const tail = run?.[run.length - 1];
    if (run && tail && d.related?.[0]?.range.start.line === tail.range.start.line) run.push(d);
    else runs.push([d]);
  }
  return runs;
}
function addJoins(text, diagnostics, diagnoseSlice) {
  if (!diagnostics.some((d) => d.code === "missing-continuation" || d.code === "indented-line-after-command" || d.code === "block-structure")) return;
  const lines = splitRawLines(text);
  const entries = splitLogicalEntries(text);
  const definitions = new Set(
    entries.filter((e) => (e.isDefBody || e.isOtherMacroBody) && leadingWhitespaceLength(lines[e.startLine] ?? "") === 0).map((e) => e.startLine)
  );
  const joins = [];
  const clean = [];
  const add = (d, title, join6) => {
    d.fix = { title, edits: join6.edits };
    joins.push(d.fix);
    if (join6.clean) clean.push({ fix: d.fix, from: join6.from, to: join6.to });
  };
  for (const d of diagnostics) {
    if (d.code !== "missing-continuation" && d.code !== "block-structure") continue;
    if (d.fix && !d.fix.title.startsWith("Add %; /")) continue;
    const entry = entryAt(entries, d.range.start.line);
    const first = entry?.offsetMap[0];
    const starts = !!first && first.line === d.range.start.line && first.character === d.range.start.character;
    const own = TOP_BLOCK_RE.exec((lines[d.range.start.line] ?? "").slice(d.range.start.character));
    const opener = entry && !entry.isDefBody && !entry.isOtherMacroBody && TOP_BLOCK_RE.test(entry.text) ? own : null;
    if (!entry || !opener || !starts && d.code !== "missing-continuation") continue;
    const at2 = d.range.start.line - entry.startLine;
    const anyMessage = d.code === "missing-continuation";
    const join6 = attempt(
      diagnoseSlice,
      (diagnose) => (
        // missing-continuation's message names lines, which differ in the slice: the code and line are enough.
        joinFix(lines, entry, entry.endLine, entry.endLine + 1, (ds) => !ds.some((x) => x.code === d.code && (anyMessage || x.message === d.message) && x.range.start.line === at2), diagnose, true, definitions)
      )
    );
    if (join6 && (join6.clean || d.code === "missing-continuation")) {
      add(d, `Join the ${opener[0].toLowerCase()}'s lines with \\`, join6);
      continue;
    }
    const related = d.code === "missing-continuation" ? d.related ?? [] : [];
    if (!simpleBlock(lines, d, entry, related)) continue;
    const word = opener[0].toLowerCase();
    const closer = word === "/while" ? "done" : "endif";
    const last = Math.max(...related.map((r) => r.range.start.line));
    let after = last + 1;
    while (after < lines.length && (isCommentLine(lines[after] ?? "") || isBlankLine(lines[after] ?? ""))) after += 1;
    const following = lines[after] ?? "";
    if (leadingWhitespaceLength(following) > 0 || STRAY_KEYWORD_RE.test(following)) continue;
    const closed = attempt(diagnoseSlice, (diagnose) => joinAndClose(lines, entry, last, closer, diagnose));
    if (closed) add(d, `Join the ${word}'s lines with \\ and end it with /${closer}`, closed);
  }
  for (const run of indentedRuns(diagnostics)) {
    const head = run[0];
    const previous = head.related?.[0]?.range.start.line;
    const entry = previous === void 0 ? void 0 : entryAt(entries, previous);
    if (!entry || previous === void 0 || head.fix) continue;
    const enclosing2 = joins.find((f) => touches(f, previous));
    if (enclosing2) {
      for (const d of run) d.fix = enclosing2;
      continue;
    }
    if (/\\[ \t\f\v]+$/.test(lines[previous] ?? "")) continue;
    const own = lines[head.range.start.line] ?? "";
    const closed = separates(entry) === "top" && CLOSES_RE.test(entry.text);
    if (closed && own[leadingWhitespaceLength(own)] !== "/") continue;
    if ((!separates(entry) || closed) && own[leadingWhitespaceLength(own)] === "/") {
      for (const d of run) {
        const line = d.range.start.line;
        const indent = leadingWhitespaceLength(lines[line] ?? "");
        d.fix = { title: "Remove the indentation", edits: [{ range: { start: { line, character: 0 }, end: { line, character: indent } }, newText: "" }] };
      }
      continue;
    }
    const last = run[run.length - 1].range.start.line;
    const at2 = last - entry.startLine;
    const join6 = attempt(
      diagnoseSlice,
      (diagnose) => joinFix(lines, entry, previous, last, (ds) => !ds.some((x) => x.code === head.code && x.range.start.line >= previous - entry.startLine && x.range.start.line <= at2), diagnose, false)
    );
    if (!join6) continue;
    add(head, join6.edits.length > 1 ? "Join these lines with \\" : `End line ${previous + 1} with \\`, join6);
    for (const d of run) d.fix = head.fix;
  }
  for (const d of diagnostics) {
    if (d.code !== "block-structure" && d.code !== "indented-line-after-command") continue;
    if (d.fix && !d.fix.title.startsWith("Add %; /")) continue;
    const join6 = clean.find((j) => j.from <= d.range.start.line && d.range.start.line <= j.to);
    if (join6) d.fix = join6.fix;
  }
}

// packages/core/src/rules/missingContinuation.ts
var missingContinuation = {
  id: "missing-continuation",
  severity: "error",
  scope: "entry",
  check(entry) {
    return entryStructure(entry).filter((i) => i.kind === "continuation").map(({ kind: _kind, ...match }) => match);
  }
};
var STRAY_RE = /^This \/(then|else|elseif|endif|do|done) has no \/(?:if|while) to (?:close|belong to)\.$/;
var OPENER_RE = /^\/(if|while)\b/i;
var byPosition = (a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character;
function spanOf(entries, index2, lines) {
  const entry = entries[index2];
  let end = entry.endLine;
  for (let k = index2 + 1; k < entries.length; k += 1) {
    const e = entries[k];
    const first = lines[e.startLine] ?? "";
    if (isBlankLine(first) || e.endLine > entry.endLine + JOIN_MAX_LINES) break;
    if ((e.isDefBody || e.isOtherMacroBody) && leadingWhitespaceLength(first) === 0) break;
    end = e.endLine;
  }
  return end;
}
function entryIndexAt(entries, line) {
  let lo = 0;
  let hi = entries.length - 1;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    const e = entries[mid];
    if (line < e.startLine) hi = mid - 1;
    else if (line > e.endLine) lo = mid + 1;
    else return mid;
  }
  return -1;
}
function cutOff(line) {
  if (/%\\[ \t\f\v\r]*$/.test(line)) return "percent";
  if (!/\\[ \t\f\v\r]+$/.test(line)) return line.endsWith("\r") ? "none-crlf" : "none";
  return /\\\r$/.test(line) ? "crlf" : "whitespace";
}
function consolidateContinuations(text, entries, diagnostics) {
  if (!diagnostics.some((d) => d.code === "missing-continuation")) return diagnostics;
  const lines = splitRawLines(text);
  const candidates = diagnostics.filter((d) => d.code === "missing-continuation" || d.code === "block-structure" && STRAY_RE.test(d.message)).sort(byPosition);
  const openers = [];
  const open = [];
  const dropped = /* @__PURE__ */ new Set();
  for (const d of candidates) {
    const index2 = entryIndexAt(entries, d.range.start.line);
    const entry = entries[index2];
    if (!entry || entry.isDefBody || entry.isOtherMacroBody) continue;
    if (d.code === "missing-continuation") {
      const at2 = d.range.start;
      const word2 = OPENER_RE.exec((lines[at2.line] ?? "").slice(at2.character))?.[1]?.toLowerCase();
      if (word2 !== "if" && word2 !== "while") continue;
      const opener2 = { d, word: word2, endLine: entry.endLine, spanEnd: spanOf(entries, index2, lines), strays: [] };
      openers.push(opener2);
      open.push(opener2);
      continue;
    }
    const first = entry.offsetMap[0];
    if (!first || first.line !== d.range.start.line || first.character !== d.range.start.character) continue;
    const word = STRAY_RE.exec(d.message)[1];
    const block = word === "do" || word === "done" ? "while" : "if";
    for (let k2 = open.length - 1; k2 >= 0; k2 -= 1) if (open[k2].spanEnd < d.range.start.line) open.splice(k2, 1);
    let k = open.length - 1;
    while (k >= 0 && open[k].word !== block) k -= 1;
    const opener = open[k];
    if (!opener) continue;
    opener.strays.push({ d, word });
    dropped.add(d);
    if (word === "endif" || word === "done") open.splice(k, 1);
  }
  const indented = diagnostics.filter((d) => d.code === "indented-line-after-command").sort(byPosition);
  for (const opener of openers) {
    const related = [];
    const last = opener.strays[opener.strays.length - 1];
    const lastStray = last?.d.range.start.line;
    const after = (line) => {
      let next2 = (entries[entryIndexAt(entries, line)]?.endLine ?? line) + 1;
      while (next2 < lines.length && isCommentLine(lines[next2] ?? "")) next2 += 1;
      return next2;
    };
    const closed = last?.word === "endif" || last?.word === "done";
    let next = closed ? -1 : after(lastStray ?? opener.endLine);
    for (const d of indented) {
      const line = d.range.start.line;
      if (line <= opener.endLine || line > opener.spanEnd || dropped.has(d)) continue;
      if (!(lastStray !== void 0 && line <= lastStray) && line !== next) continue;
      if (line === next) next = after(line);
      dropped.add(d);
      if (opener.strays.some((s) => s.d.range.start.line === line)) continue;
      related.push({ range: d.range, message: "a command of its own: the line before it has no \\" });
    }
    for (const s of opener.strays) {
      const verb = s.word === "endif" || s.word === "done" ? "close" : "belong to";
      related.push({ range: s.d.range, message: `a command of its own, so this /${s.word} doesn't ${verb} the /${opener.word}` });
    }
    const how = cutOff(lines[opener.endLine] ?? "");
    const closer = opener.strays.find((s) => s.word === "endif" || s.word === "done");
    const backslash = how === "percent" || how === "whitespace" || how === "crlf";
    if ((backslash || closer) && opener.d.fix?.title.startsWith("Add %; /")) delete opener.d.fix;
    if (related.length === 0) continue;
    related.sort(byPosition);
    opener.d.related = [...opener.d.related ?? [], ...related];
    const cut = closer ?? opener.strays[0];
    const what = cut ? `the /${cut.word} on line ${cut.d.range.start.line + 1} is a separate command` : `line ${related[0].range.start.line + 1} starts a separate command`;
    const n = opener.endLine + 1;
    opener.d.message = how === "percent" ? `This /${opener.word} ends at the end of line ${n}, as a \\ after a % doesn't continue a line, so ${what}: end the line with a \\ that has no % before it.` : how === "crlf" ? `This /${opener.word} ends at the end of line ${n}, where the file's Windows (CRLF) line ending puts a carriage return after the \\, so ${what}: save the file with LF line endings.` : how === "whitespace" ? `This /${opener.word} ends at the end of line ${n}, where whitespace follows the \\, so ${what}: remove the whitespace.` : how === "none-crlf" ? `This /${opener.word} ends at the end of line ${n}, which has no \\, so ${what}: save the file with LF line endings, then end every line but the last with \\ (one before a carriage return doesn't continue a line).` : `This /${opener.word} ends at the end of line ${n}, which has no \\, so ${what}: end every line but the last with \\.`;
    opener.d.label = `its command ends on line ${n}`;
  }
  return diagnostics.filter((d) => !dropped.has(d));
}

// packages/core/src/loadCommands.ts
function literalText(text, pending) {
  let out = text;
  for (const level of pending) {
    if (level === "full" && /[%$\\]/.test(out)) return void 0;
    if (level === "newline") out = shortenPercents(out);
  }
  return out;
}
function shortenPercents(text) {
  return text.replace(/%(%+)/g, "$1");
}
function shortened(src, start, end) {
  let text = "";
  const map = [];
  let i = start;
  while (i < end) {
    let j = i + 1;
    if (src.text[i] === "%") while (j < end && src.text[j] === "%") j += 1;
    for (let k = j - i > 1 ? i + 1 : i; k < j; k += 1) {
      text += src.text[k];
      map.push(src.map[k === i + 1 && j - i > 1 ? i : k]);
    }
    i = j;
  }
  map.push(src.map[end]);
  return { text, map };
}
var EVAL_RE = /^\/@?eval(?=\s|$)/i;
var LOAD_RE = /^\/(@?)(load|require)(?=\s|$)/i;
var SET_RE = /^\/@?(?:set|setenv)\s+([A-Za-z_][A-Za-z0-9_]*)(?=[=\s])/i;
var EVAL_LEVELS = { off: "top", on: "newline", full: "body" };
var NUMBERED_LEVELS = ["top", "newline", "body"];
function words(text, from, to) {
  const out = [];
  let i = from;
  while (i < to) {
    while (i < to && isTfSpace(text[i])) i += 1;
    if (i >= to) break;
    const start = i;
    while (i < to && !isTfSpace(text[i])) i += 1;
    out.push({ start, end: i });
  }
  return out;
}
function optionArgument(arg) {
  const quote = arg[0];
  if (quote !== '"' && quote !== "'" && quote !== "`") return arg;
  let out = "";
  for (let i = 1; i < arg.length; i += 1) {
    const ch = arg[i];
    if (ch === quote) return i === arg.length - 1 ? out : void 0;
    if (ch === "\\" && (arg[i + 1] === quote || arg[i + 1] === "\\")) i += 1;
    out += arg[i];
  }
  return void 0;
}
function evalMode(arg) {
  const value = optionArgument(arg);
  if (value === void 0) return void 0;
  if (/^[0-9]+$/.test(value)) return NUMBERED_LEVELS[Number(value)];
  return EVAL_LEVELS[value.toLowerCase()];
}
var MAX_EVAL_DEPTH = 400;
function entryCommands(entry) {
  const out = [];
  let evalDepth = 0;
  const statement2 = (src, start, end, level, ctx) => {
    if (ctx.pending.length > 0 || level === "full") {
      command2(src, start, end, { ...ctx, pending: level === "keyword" ? ctx.pending : [...ctx.pending, level] });
    } else if (level === "newline") {
      const text = shortened(src, start, end);
      command2(text, 0, text.text.length, ctx);
    } else {
      command2(src, start, end, ctx);
    }
  };
  const command2 = (src, start, end, ctx) => {
    const text = src.text;
    const stmt = text.slice(start, end);
    const at2 = (s, e) => ({ start: src.map[s], end: src.map[e - 1] + 1 });
    const ev = EVAL_RE.exec(stmt);
    if (ev) {
      const args2 = words(text, start + ev[0].length, end);
      let mode = "body";
      let i = 0;
      for (; i < args2.length; i += 1) {
        const w = text.slice(args2[i].start, args2[i].end);
        if (w === "-" || w === "--") {
          i += 1;
          break;
        }
        if (!w.startsWith("-")) break;
        const picked = w.startsWith("-s") ? evalMode(w.slice(2)) : void 0;
        if (!picked) return;
        mode = picked;
      }
      const from = i < args2.length ? args2[i].start : end;
      if (evalDepth >= MAX_EVAL_DEPTH) return;
      evalDepth += 1;
      try {
        for (const st of parseStatements(text.slice(from, end), mode)) {
          statement2(src, from + st.start, from + st.end, st.level, {
            ...ctx,
            plain: false,
            viaEval: true,
            conditional: ctx.conditional || st.conditional
          });
        }
      } finally {
        evalDepth -= 1;
      }
      return;
    }
    const set = SET_RE.exec(stmt);
    if (set) {
      let valueStart = start + set[0].length;
      if (text[valueStart] === "=") {
        valueStart += 1;
      } else {
        while (valueStart < end && isTfSpace(text[valueStart])) valueStart += 1;
        if (valueStart >= end) return;
      }
      let valueEnd = end;
      if (src.map[end] !== void 0 && entry.text[src.map[end]] === "%") {
        while (valueEnd > valueStart && isTfSpace(text[valueEnd - 1])) valueEnd -= 1;
      }
      const where2 = valueEnd > valueStart ? at2(valueStart, valueEnd) : { start: src.map[valueStart - 1], end: src.map[valueStart - 1] };
      out.push({ kind: "set", name: set[1], value: text.slice(valueStart, valueEnd), ...where2, ...ctx });
      return;
    }
    const m = LOAD_RE.exec(stmt);
    if (!m) return;
    const kind = m[2].toLowerCase();
    if (kind === "require" && m[1]) return;
    const args = words(text, start + m[0].length, end);
    let first = 0;
    while (first < args.length) {
      const w = text.slice(args[first].start, args[first].end);
      if (!w.startsWith("-")) break;
      if (w !== "-" && w !== "--" && !/^-q+$/.test(w)) return;
      first += 1;
      if (w === "-" || w === "--") break;
    }
    if (first >= args.length) return;
    const fileStart = args[first].start;
    const fileEnd = args[args.length - 1].end;
    const file = kind === "require" ? args.slice(first).map((w) => text.slice(w.start, w.end)).join(" ") : text.slice(fileStart, fileEnd);
    out.push({ kind, file, ...at2(fileStart, fileEnd), ...ctx });
  };
  const source = { text: entry.text, map: Array.from({ length: entry.text.length + 1 }, (_, i) => i) };
  for (const st of entryStatements(entry)) {
    statement2(source, st.start, st.end, st.level, {
      pending: [],
      plain: st.level === "keyword",
      viaEval: false,
      topLevel: st.level !== "full",
      conditional: st.conditional
    });
  }
  return out;
}
function entryLoads(entry) {
  return entryCommands(entry).filter((c) => c.kind !== "set");
}

// packages/core/src/data/builtinCommands.generated.ts
var BUILTIN_COMMANDS = [
  "BEEP",
  "BIND",
  "CALLLUA",
  "CONNECT",
  "CORE",
  "DC",
  "DEF",
  "DOKEY",
  "EDIT",
  "EVAL",
  "EXIT",
  "EXPORT",
  "FEATURES",
  "FG",
  "GAG",
  "HELP",
  "HILITE",
  "HISTSIZE",
  "HOOK",
  "INPUT",
  "KILL",
  "LCD",
  "LET",
  "LIMIT",
  "LIST",
  "LISTSOCKETS",
  "LISTSTREAMS",
  "LISTVAR",
  "LISTWORLDS",
  "LOAD",
  "LOADLUA",
  "LOCALECHO",
  "LOG",
  "PS",
  "PURGE",
  "PURGELUA",
  "PYTHON",
  "PYTHON_CALL",
  "PYTHON_CALL_UNSAFE",
  "PYTHON_KILL",
  "PYTHON_LOAD",
  "QUIT",
  "QUOTE",
  "RECALL",
  "RECORDLINE",
  "RELIMIT",
  "REPEAT",
  "RESTRICT",
  "SAVE",
  "SAVEWORLD",
  "SET",
  "SETENV",
  "SH",
  "SHIFT",
  "STATUS_ADD",
  "STATUS_CLEAR",
  "STATUS_EDIT",
  "STATUS_RM",
  "SUSPEND",
  "TRIGGER",
  "TRIGPC",
  "UNBIND",
  "UNDEF",
  "UNDEFN",
  "UNLIMIT",
  "UNSET",
  "UNWORLD",
  "VERSION",
  "WATCHDOG",
  "WATCHNAME"
];

// packages/core/src/substitution.ts
var SYNTAX_KINDS = /* @__PURE__ */ new Set(["substitution", "expression", "operand", "empty-statement"]);
var MACRO_DEFINER = /^(?:def|edit|bind|hook|gag|hilite|trig|trigc|trigp|trigpc|alias)$/;
var MAX_DEPTH2 = 8;
function nextWord(s, i, end) {
  while (i < end && isTfSpace(s[i])) i += 1;
  if (i >= end) return void 0;
  const start = i;
  while (i < end && !isTfSpace(s[i])) i += 1;
  return { start, end: i };
}
function repeatArguments(s, from, to) {
  let now = false;
  let word = nextWord(s, from, to);
  while (word && s[word.start] === "-") {
    const opt = s.slice(word.start, word.end);
    word = nextWord(s, word.end, to);
    if (opt === "-" || opt === "--") break;
    for (let k = 1; k < opt.length; k += 1) {
      const flag = opt[k];
      if (flag >= "0" && flag <= "9" || flag === ":") {
        now = false;
        break;
      }
      if (flag === "S" || flag === "P") now = true;
      else if (flag === "w") break;
      else if (flag !== "n") return void 0;
    }
  }
  if (!word || !/^(?:[iI]|0*[1-9][0-9]*)$/.test(s.slice(word.start, word.end))) return void 0;
  const command2 = nextWord(s, word.end, to);
  return command2 ? { command: command2.start, now } : void 0;
}
function evalArguments(s, from, to) {
  let mode = "body";
  const options = [];
  let word = nextWord(s, from, to);
  while (word && s[word.start] === "-") {
    const opt = s.slice(word.start, word.end);
    const at2 = word;
    word = nextWord(s, word.end, to);
    if (opt === "-" || opt === "--") break;
    const picked = opt.startsWith("-s") ? evalMode(opt.slice(2)) : void 0;
    if (!picked) return void 0;
    mode = picked;
    options.push({ start: at2.start, end: at2.end, whole: true });
  }
  return { text: word ? word.start : to, mode, options };
}
function quoteCommand(s, from, to) {
  let mode = "body";
  const options = [];
  let i = from;
  let word = nextWord(s, i, to);
  while (word && s[word.start] === "-") {
    const opt = s.slice(word.start, word.end);
    const at2 = word;
    i = word.end;
    word = nextWord(s, word.end, to);
    if (opt === "-" || opt === "--") break;
    for (let k = 1; k < opt.length; k += 1) {
      const flag = opt[k];
      if (flag >= "0" && flag <= "9" || flag === ":" || flag === "w" || flag === "d") break;
      if (flag === "s") {
        const picked = evalMode(opt.slice(k + 1));
        if (!picked) return void 0;
        mode = picked;
        options.push(k === 1 ? { start: at2.start, end: at2.end, whole: true } : { start: at2.start + k, end: at2.end, whole: false });
        break;
      }
      if (flag !== "P" && flag !== "S") return void 0;
    }
  }
  if (word) i = word.start;
  while (i < to && s[i] !== "'" && s[i] !== "!" && s[i] !== "#" && s[i] !== "`") i += s[i] === "\\" ? 2 : 1;
  if (i >= to || s[i] !== "`") return void 0;
  i += 1;
  if (s[i] !== '"') return { start: i, end: to, mode, options };
  let end = i + 1;
  while (end < to && s[end] !== '"') end += s[end] === "\\" ? 2 : 1;
  return { start: i + 1, end: Math.min(end, to), mode, options };
}
function atCommand(s, from, to) {
  let word = nextWord(s, from, to);
  while (word && /^-(?:v*|-)$/.test(s.slice(word.start, word.end))) {
    const end = s.slice(word.start, word.end) === "--";
    word = nextWord(s, word.end, to);
    if (end) break;
  }
  if (word && /^(?:\d{2}(?:\d{2})?-)?\d{1,2}[-/]\d{1,2}$/.test(s.slice(word.start, word.end))) word = nextWord(s, word.end, to);
  const command2 = word && nextWord(s, word.end, to);
  return command2?.start;
}
function stringsIn(s, from, to, known) {
  const strings = [];
  const cmdsubs = [];
  for (let k = from; k < to; k += 1) {
    if (s[k] === "$" && s[k + 1] === "(") {
      let inner2 = known.find((c) => c.start === k + 2);
      if (!inner2) {
        const read = parseRegions(s.slice(k, to), "body").cmdsubs.find((c) => c.start === 2);
        inner2 = read ? { start: k + 2, end: k + read.end } : { start: k + 2, end: to };
      }
      cmdsubs.push(inner2);
      k = inner2.end;
      continue;
    }
    const quote = s[k];
    if (quote !== '"' && quote !== "'" && quote !== "`") continue;
    let end = k + 1;
    while (end < to && s[end] !== quote) end += s[end] === "\\" ? 2 : 1;
    strings.push({ start: k, end: Math.min(end + 1, to) });
    k = end;
  }
  return { strings, cmdsubs };
}
var cache2 = /* @__PURE__ */ new WeakMap();
function entrySubstitution(entry) {
  let model = cache2.get(entry);
  if (model) return model;
  const contexts = new Array(entry.text.length).fill("keyword");
  const inExpression = new Array(entry.text.length).fill(false);
  const statements = [];
  const issues = [];
  model = { contexts, inExpression, statements, issues };
  const seen = /* @__PURE__ */ new Set();
  const collect = (src, found) => {
    const base = src.map[0];
    const plain = src.map.every((v, k) => v === base + k);
    const at2 = (start, end) => {
      const own = src.map[start];
      const next = src.map[start + 1];
      const from = end > start && next !== void 0 ? Math.max(own, next - 1) : own;
      return { start: from, end: end > start ? Math.max(from + 1, src.map[end - 1] + 1) : from };
    };
    for (const issue of found) {
      if (!SYNTAX_KINDS.has(issue.kind)) continue;
      const { fix, related, ...rest } = issue;
      const out = { ...rest, ...at2(issue.start, issue.end) };
      if (related) out.related = related.map((n) => ({ ...n, ...at2(n.start, n.end) }));
      if (fix && plain) out.fix = { ...fix, edits: fix.edits.map((e) => ({ ...e, start: e.start + base, end: e.end + base })) };
      const key2 = `${out.start}:${out.end}:${out.message}`;
      if (seen.has(key2)) continue;
      seen.add(key2);
      issues.push(out);
    }
  };
  const mark = (src, from, to, context, expression2 = false) => {
    for (let k = from; k < to; k += 1) {
      const at2 = src.map[k];
      if (at2 !== void 0 && at2 < contexts.length) {
        contexts[at2] = context;
        inExpression[at2] = expression2;
      }
    }
  };
  const expressions = (src, list, known) => {
    for (const ex of [...list].sort((a, b) => a.start - b.start || b.end - a.end)) {
      mark(src, ex.start, ex.end, "expression", true);
      const { strings, cmdsubs } = stringsIn(src.text, ex.start, ex.end, known);
      for (const str of strings) mark(src, str.start, str.end, ex.kind === "statement" ? ex.level ?? "keyword" : "string", true);
      for (const c of cmdsubs) mark(src, c.start, c.end, "full");
    }
  };
  const sub = (src, from, to = src.text.length) => ({
    text: src.text.slice(from, to),
    map: src.map.slice(from, to + 1)
  });
  const built = (src, parts) => {
    let text = "";
    const map = [];
    parts.forEach((part, k) => {
      if (typeof part !== "string") {
        text += src.text.slice(part.start, part.end);
        for (let k2 = part.start; k2 < part.end; k2 += 1) map.push(src.map[k2]);
        return;
      }
      const next = parts.slice(k + 1).find((p) => typeof p !== "string");
      const prev = parts.slice(0, k).reverse().find((p) => typeof p !== "string");
      const at2 = next ? src.map[next.start] : prev ? src.map[prev.end - 1] : src.map[0];
      text += part;
      for (let i = 0; i < part.length; i += 1) map.push(at2);
    });
    map.push(map[map.length - 1] ?? src.map[0]);
    return { text, map };
  };
  const forEnd = (h, name, to) => {
    const wrapped = built(h, ["/while ( ", name, " <= ", to, " ) x%; /done"]);
    const nameStart = "/while ( ".length;
    const nameEnd = nameStart + (name.end - name.start);
    const endStart = nameEnd + " <= ".length;
    const endEnd = endStart + (to.end - to.start);
    const whole = (word) => !parseRegions(`/test ${h.text.slice(word.start, word.end)}`, "top").issues.some((i) => i.kind === "expression" || i.kind === "substitution");
    const blame = (start, end, what, advice) => {
      const written = wrapped.text.slice(start, end);
      return {
        kind: "expression",
        start,
        end,
        message: `This /for's ${what}, ${written}, isn't a complete ${what === "END" ? "expression" : "variable name"}: ${advice}.`,
        label: `not a complete ${what === "END" ? "expression" : "name"}`,
        explanation: `stdlib's ${code("/for")} compares the loop variable with END in a condition, ${code("/while ( VAR <= END )")}, so each has to be whole on its own. This one leaves something open that the condition around it would have to close.`
      };
    };
    const kept = [];
    let said = false;
    const varName = h.text.slice(name.start, name.end);
    if (!/[%$\\{]/.test(varName) && !/^[A-Za-z_\u0080-￿][A-Za-z0-9_\u0080-￿]*$/.test(varName)) {
      kept.push({
        ...blame(nameStart, nameEnd, "variable", "write a name, such as i"),
        explanation: `stdlib's ${code("/for")} sets the loop variable with ${code("/let VAR=START")}, and tf takes only a name there: letters, digits and ${code("_")}, not starting with a digit.`
      });
      said = true;
    }
    for (const issue of parseRegions(wrapped.text, "body").issues) {
      if (issue.kind === "empty-statement") continue;
      if (issue.start >= endStart && issue.start < endEnd) kept.push(issue);
      else if (issue.start >= nameStart && issue.start < nameEnd) continue;
      else if (!said) {
        said = true;
        if (!whole(to)) kept.push(blame(endStart, endEnd, "END", "write a number, or an expression that closes"));
        else if (!whole(name)) kept.push(blame(nameStart, nameEnd, "variable", "write a name, such as i"));
      }
    }
    collect(wrapped, kept);
  };
  const read = (src, mode, depth, viaEval, issues2 = true) => {
    const s = src.text;
    const regions = parseRegions(s, mode);
    if (issues2) collect(src, regions.issues);
    if (mode === "body") {
      mark(src, 0, s.length, "full");
      expressions(src, regions.expressions, regions.cmdsubs);
      return;
    }
    const split = mode === "newline" || regions.blocks.length > 0 || regions.statements.length > 1;
    mark(src, 0, s.length, split ? "newline" : "keyword");
    for (const st of regions.statements) {
      mark(src, st.start, st.end, st.level);
      const word = commandWord(s, st.start);
      const out = {
        start: src.map[st.start],
        end: st.end > st.start ? src.map[st.end - 1] + 1 : src.map[st.start],
        level: st.level,
        word
      };
      if (viaEval) out.viaEval = viaEval;
      statements.push(out);
      if (depth >= MAX_DEPTH2) continue;
      const argStart = st.start + (word ? COMMAND_RE.exec(s.slice(st.start))?.[0].length ?? 0 : 0);
      const handed = (from) => st.level === "newline" ? shortened(src, from, st.end) : sub(src, from, st.end);
      if (MACRO_DEFINER.test(word)) {
        const body = macroBodyStart(s.slice(st.start, st.end));
        if (body >= 0) {
          out.body = src.map[st.start + body];
          read(handed(st.start + body), "body", depth + 1, void 0);
        }
      } else if (word === "for") {
        const h = handed(argStart);
        read(h, "body", depth + 1, void 0, false);
        const words2 = [];
        for (let w = nextWord(h.text, 0, h.text.length); w && words2.length < 4; w = nextWord(h.text, w.end, h.text.length)) words2.push(w);
        const [name, from, to, command2] = words2;
        if (name && from) read(built(h, ["/let ", name, "=", from]), "body", depth + 1, void 0);
        if (name && to) forEnd(h, name, to);
        if (command2) read(sub(h, command2.start), "body", depth + 1, void 0);
      } else if (word === "repeat") {
        const h = handed(argStart);
        const r = repeatArguments(h.text, 0, h.text.length);
        if (r) read(sub(h, r.command), "body", depth + 1, void 0);
      } else if (word === "at") {
        const h = handed(argStart);
        const command2 = atCommand(h.text, 0, h.text.length);
        if (command2 !== void 0) read(sub(h, command2), "body", depth + 1, void 0);
      } else if (word === "quote" || word === "eval") {
        const h = handed(argStart);
        const r = word === "quote" ? quoteCommand(h.text, 0, h.text.length) : evalArguments(h.text, 0, h.text.length);
        if (!r) continue;
        const [from, to] = "text" in r ? [r.text, h.text.length] : [r.start, r.end];
        const options = r.options.map((o) => ({ start: h.map[o.start], end: h.map[o.end - 1] + 1, whole: o.whole }));
        read(sub(h, from, to), r.mode, depth + 1, r.mode === "body" ? void 0 : { command: word, mode: r.mode, options });
      }
    }
    for (const ex of regions.expressions) {
      if (ex.kind !== "statement") continue;
      let start = ex.start;
      while (start > 0 && isTfSpace(s[start - 1])) start -= 1;
      while (start > 0 && s[start] !== "/") start -= 1;
      const out = {
        start: src.map[start],
        end: ex.end > start ? src.map[ex.end - 1] + 1 : src.map[start],
        level: ex.level ?? "keyword",
        word: commandWord(s, start)
      };
      if (viaEval) out.viaEval = viaEval;
      statements.push(out);
    }
    expressions(src, regions.expressions, regions.cmdsubs);
  };
  read({ text: entry.text, map: Array.from({ length: entry.text.length + 1 }, (_, i) => i) }, "top", 0, void 0);
  cache2.set(entry, model);
  return model;
}

// packages/core/src/rules/notSubstitutedHere.ts
var PERCENT_NAME_RE = /%[A-Za-z_][A-Za-z0-9_]*/g;
var SEPARATOR_RE = /%;/g;
var BLOCK_KEYWORDS = /* @__PURE__ */ new Set(["then", "else", "elseif", "endif", "do", "done"]);
var VALUE_COMMANDS = /* @__PURE__ */ new Set(["set", "let", "setenv"]);
var MAX_BLOCK_CHECKS = 64;
function substitutionEnd(text, at2, limit) {
  const closer = (opener) => opener === "{" ? "}" : opener === "[" ? "]" : ")";
  const open = [closer(text[at2 + 1])];
  let i = at2 + 2;
  while (i < limit) {
    const ch = text[i];
    const next = text[i + 1];
    if ((ch === "%" || ch === "$") && next === ch) {
      while (text[i + 1] === ch) i += 1;
      i += 1;
    } else if ((ch === "%" || ch === "$") && next === "{" || ch === "$" && (next === "[" || next === "(")) {
      open.push(closer(next));
      i += 2;
    } else if (ch === open[open.length - 1]) {
      open.pop();
      i += 1;
      if (open.length === 0) return i;
    } else {
      i += 1;
    }
  }
  return limit;
}
function percentBraces(text, limitOf) {
  const found = [];
  let pos = 0;
  for (let at2 = text.indexOf("%{"); at2 >= 0; at2 = text.indexOf("%{", pos)) {
    pos = at2 + 2;
    if (text[at2 - 1] === "%") continue;
    const limit = Math.max(limitOf(at2), at2 + 2);
    const read = parseRegions(text.slice(at2, limit), "body");
    const stop = read.stopped ? read.issues[read.issues.length - 1]?.start ?? 0 : limit - at2;
    let covered = 0;
    for (const span of [...read.spans].sort((a, b) => a.start - b.start || b.end - a.end)) {
      if (span.start >= stop) break;
      if (span.kind !== "substitution" || !span.inner || span.start < covered) continue;
      if (text[at2 + span.start] !== "%" || text[at2 + span.start + 1] !== "{") continue;
      found.push({ index: at2 + span.start, text: text.slice(at2 + span.start, at2 + span.end) });
      covered = span.end;
    }
    if (!read.stopped) {
      const deep = read.issues.find((i) => i.kind === "too-deep");
      const opener2 = deep ? text.indexOf("%{", at2 + covered) : -1;
      if (opener2 < 0 || opener2 >= at2 + deep.start) {
        pos = Math.max(pos, limit);
        continue;
      }
      const end = substitutionEnd(text, opener2, limit);
      if (text[end - 1] === "}") found.push({ index: opener2, text: text.slice(opener2, end) });
      pos = Math.max(pos, end);
      continue;
    }
    const opener = text.lastIndexOf("%{", at2 + stop);
    pos = Math.max(pos, opener >= at2 + covered ? substitutionEnd(text, opener, limit) : at2 + stop + 1);
  }
  return found;
}
var SELECTOR_RE = /^(?:[A-Za-z_][A-Za-z0-9_]*|[0-9]+|[#?*]|-L?[0-9]*|L[0-9]*|P[0-9]+)$/;
var PLAIN_DEFAULT_RE = /^[^%${}\\]*$/;
var BUILTINS = new Set(BUILTIN_COMMANDS.map((c) => c.toLowerCase()));
function notABuiltin(parts) {
  const afterBangs = parts.prefix.replace(/^!*/, "");
  if (!afterBangs.startsWith("@")) return false;
  return !BUILTINS.has(`${afterBangs.slice(1)}${parts.word}`);
}
var NOT_PLAIN_COMMAND_RE = /^\/[@!]*(?:if|elseif|else|endif|while|do|done|then|break|test|return|result|exit)(?![^\s%])/i;
function plainSubstitutions(s) {
  if (NOT_PLAIN_COMMAND_RE.test(s.trimStart())) return false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === "$" || ch === "\\") return false;
    if (ch !== "%") continue;
    if (s[i + 1] === "{") {
      const close = s.indexOf("}", i + 2);
      if (close < 0) return false;
      const inner2 = s.slice(i + 2, close);
      const m2 = /^(-L?[0-9]*|[^-]*)(?:-(.*))?$/s.exec(inner2);
      if (!m2 || !SELECTOR_RE.test(m2[1]) || m2[2] !== void 0 && !PLAIN_DEFAULT_RE.test(m2[2])) return false;
      i = close;
      continue;
    }
    const m = /^%(-L?[0-9]+|-L|[0-9]+|[#?*]|[A-Za-z_][A-Za-z0-9_]*)(-[^\s]*)?/.exec(s.slice(i));
    if (!m || m[2] !== void 0 && !PLAIN_DEFAULT_RE.test(m[2].slice(1))) return false;
    i += m[0].length - 1;
  }
  return true;
}
function statementIndex(statements, length) {
  const owner2 = new Int32Array(length).fill(-1);
  const inIfLine = new Array(statements.length).fill(false);
  statements.forEach((st, k) => {
    const around = st.start < length ? owner2[st.start] : -1;
    const outer = around >= 0 ? statements[around] : void 0;
    inIfLine[k] = st.level === "newline" || outer !== void 0 && st.end <= outer.end && inIfLine[around];
    owner2.fill(k, Math.max(0, st.start), Math.min(length, st.end));
  });
  const position = new Map(statements.map((st, k) => [st, k]));
  return {
    at: (offset) => {
      const k = offset >= 0 && offset < length ? owner2[offset] : -1;
      return k >= 0 ? statements[k] : void 0;
    },
    inIfLine: (st) => inIfLine[position.get(st) ?? -1] ?? false
  };
}
function evalName(e) {
  return `/${e.command} -s${e.mode === "top" ? "off" : "on"}`;
}
function optionName(text, o) {
  return `${o.whole ? "" : "-"}${text.slice(o.start, o.end)}`;
}
var notSubstitutedHere = {
  id: "not-substituted-here",
  severity: "warning",
  scope: "entry",
  check(entry) {
    const text = entry.text;
    const { contexts, inExpression, statements } = entrySubstitution(entry);
    const index2 = statementIndex(statements, text.length);
    const unsubstituted = (at2) => {
      const c = contexts[at2];
      if (c !== "keyword" && c !== "newline") return false;
      const st = index2.at(at2);
      return !(st && st.body !== void 0 && at2 < st.body);
    };
    const dropOptions = (e) => e.options.map((o) => {
      let end = o.end;
      while (o.whole && end < text.length && isTfSpace(text[end])) end += 1;
      return { start: o.start, end, newText: "" };
    });
    const out = [];
    const judge = (st) => {
      if (!st) return { kind: "other" };
      const written = text.slice(st.start, st.end);
      const identity = { text: written, map: Array.from({ length: written.length + 1 }, (_, k) => k) };
      const { text: s, map } = index2.inIfLine(st) ? shortened(identity, 0, written.length) : identity;
      const issue = parseRegions(s, "body").issues.find((i) => i.kind === "substitution");
      if (issue) {
        const from = Math.min(issue.start, ...(issue.related ?? []).map((n) => n.start));
        let to = issue.end;
        while (to < s.length && !isTfSpace(s[to])) to += 1;
        return { kind: "rejected", bad: written.slice(map[from], to > from ? map[to - 1] + 1 : map[from]) };
      }
      return plainSubstitutions(s) && !written.includes("%%") ? { kind: "plain" } : { kind: "other" };
    };
    const judged = /* @__PURE__ */ new Map();
    const judgeOnce = (st) => {
      if (!judged.has(st)) judged.set(st, judge(st));
      return judged.get(st);
    };
    const blockError = (s, mode) => parseRegions(s, mode).issues.some((i) => i.kind === "block" || i.kind === "continuation");
    const blockChecks = /* @__PURE__ */ new Map();
    const blockChecksLeft = (st) => {
      const used = blockChecks.get(st) ?? 0;
      blockChecks.set(st, used + 1);
      return used < MAX_BLOCK_CHECKS;
    };
    const openWithSon = /* @__PURE__ */ new Map();
    const blockErrorOnce = (st) => {
      if (!openWithSon.has(st)) openWithSon.set(st, blockError(text.slice(st.start, st.end), "newline"));
      return openWithSon.get(st);
    };
    const rejected = (bad) => `It also holds ${code(bad)}, which tf can't read as a substitution. Substituting the command as written would make tf reject it, where today it runs with the text as it is, so fix that first.`;
    const compiled = `It also holds more than variables to substitute, such as a ${code("$[...]")}, a ${code("%;")} or a ${code("\\")}, and substituting it would compile those too, so look at what that would do first.`;
    const variable = (start, written) => {
      const st = index2.at(start);
      const at2 = st?.start ?? 0;
      const base = {
        start,
        end: start + written.length,
        label: "not substituted"
      };
      const judgement = judgeOnce(st);
      if (st?.viaEval) {
        const name = evalName(st.viaEval);
        const runs2 = `${code(name)} runs its text ${st.viaEval.mode === "top" ? "as a plain line of a file is run" : "as a top-level /if line is run"}, without substituting variables, so the command gets the text ${code(written)}.`;
        out.push({
          ...base,
          message: judgement.kind === "rejected" ? `${written} stays as it is in ${name} text, and without -s tf would reject this text as written: fix ${judgement.bad} first.` : judgement.kind === "other" ? `${written} stays as it is in ${name} text; without -s the rest of the text would be substituted too, so check it before leaving out the -s.` : `${written} stays as it is in ${name} text: leave out the -s option to substitute it.`,
          explanation: judgement.kind === "rejected" ? `${runs2} ${rejected(judgement.bad)}` : judgement.kind === "other" ? `${runs2} ${compiled}` : `${runs2} Without ${code("-s")}, ` + (st.viaEval.command === "eval" ? `${code("/eval")} substitutes its text once and then runs it.` : `${code("/quote")} runs the command as a macro body is run, substituting it.`),
          ...judgement.kind === "plain" ? { fix: { title: `Leave out ${optionName(text, st.viaEval.options.at(-1))}`, edits: dropOptions(st.viaEval) } } : {}
        });
        return;
      }
      const where2 = st?.level === "newline" ? "in a top-level /if or /while line" : "in a command at the top level of a file";
      const runs = `tf runs the commands in a file without substituting variables, so the command gets the text ${code(written)}, not the variable's value. Inside a top-level ${code("/if")} or ${code("/while")} line, ${code("%;")} separates commands but still nothing is substituted.`;
      out.push({
        ...base,
        message: judgement.kind === "rejected" ? `${written} stays as it is ${where2}, and /eval would reject this command as written: fix ${judgement.bad} first.` : judgement.kind === "other" ? `${written} stays as it is ${where2}; /eval in front would substitute the rest of the command too, so check it before using /eval.` : `${written} stays as it is ${where2}: put /eval in front of the command to substitute it.`,
        explanation: judgement.kind === "rejected" ? `${runs} ${rejected(judgement.bad)}` : judgement.kind === "other" ? `${runs} ${compiled}` : `${runs} In a ${code("/def")} body it would be substituted when the macro runs, and in a condition or ${code("/test")} it is read as a variable. ${code("/eval")} substitutes the rest of the command once and then runs it: ${code(`/eval ${text.slice(at2).split(/\s/, 1)[0]} ...`)}`,
        ...judgement.kind === "plain" ? { fix: { title: "Put /eval in front of the command", edits: [{ start: at2, end: at2, newText: "/eval " }] } } : {}
      });
    };
    for (const m of percentBraces(text, (at2) => index2.at(at2)?.end ?? text.length)) {
      const at2 = m.index;
      if (unsubstituted(at2)) {
        variable(at2, m.text);
      } else if (contexts[at2] === "string") {
        const name = /^%\{([^}-]*)/.exec(m.text)?.[1] ?? "";
        out.push({
          start: at2,
          end: at2 + m.text.length,
          message: `${m.text} stays as it is inside a string in an expression: take it out of the quotes and write {${name}}, as in strcat("...", {${name}}).`,
          label: "not substituted",
          explanation: `An expression doesn't substitute inside its strings, and nothing else does in a condition or ${code("$[...]")}, even in a macro body, so the string holds the text ${code(m.text)}. Outside the quotes, ${code(`{${name}}`)} reads the variable: ${code(`strcat("a", {${name}}, "b")`)}.`
        });
      }
    }
    for (const load of entryLoads(entry)) {
      if (load.pending.includes("full")) continue;
      for (const m of text.slice(load.start, load.end).matchAll(PERCENT_NAME_RE)) {
        const at2 = load.start + m.index;
        if (text[at2 - 1] !== "%" && unsubstituted(at2)) variable(at2, m[0]);
      }
    }
    for (const m of text.matchAll(SEPARATOR_RE)) {
      const at2 = m.index;
      if (text[at2 - 1] === "%" || contexts[at2] !== "keyword" || inExpression[at2]) continue;
      const st = index2.at(at2);
      if (!st || st.body !== void 0) continue;
      const gluedAt = gluedKeywordAt(text, st.start);
      if (gluedAt && (text[gluedAt.nameEnd] === "(" || text[gluedAt.nameEnd] === "/")) continue;
      let next = at2 + 2;
      while (next < st.end && isTfSpace(text[next])) next += 1;
      if (next >= st.end) continue;
      const name = st.word ? `/${st.word}` : "the text";
      const where2 = st.viaEval ? `in ${evalName(st.viaEval)} text` : "on a plain top-level line";
      const value = VALUE_COMMANDS.has(st.word);
      const advice = st.viaEval ? `give the /${st.viaEval.command} -son, or leave out the -s option` : value ? "if they are meant as commands, put each on a line of its own" : "put each command on a line of its own, or start the line with /eval";
      const match = {
        start: at2,
        end: at2 + 2,
        severity: "information",
        message: value ? `%; doesn't end a command ${where2}, so the ${name} value includes it and the rest of the line: ${advice}.` : `%; doesn't end a command ${where2}, so it and the rest of the line are part of ${name}: ${advice}.`,
        label: "not a separator",
        explanation: `tf reads ${st.viaEval ? `${code(evalName(st.viaEval))} text as a plain line of a file is read` : "a plain line of a file"} without substitution, so ${code("%;")} is just text there and ${name === "the text" ? "the line" : code(name)} gets all of ${code(text.slice(st.start, st.end))}. ${code("%;")} separates commands in a ${code("/def")} body, in ${code("/eval")} text, and on a line that starts with ${code("/if")} or ${code("/while")}.` + (value ? ` A value holding ${code("%;")} can be meant, for a later ${code("/eval")} to run.` : "")
      };
      const parts = text[next] === "/" ? commandParts(text, next) : void 0;
      const nextWord3 = parts?.word;
      const keywordName = nextWord3 === "if" || nextWord3 === "while" || BLOCK_KEYWORDS.has(nextWord3 ?? "");
      const glued = /^(?:if|elseif|while)\(/.test(nextWord3 ?? "");
      const notAKeyword = glued || keywordName && parts.prefix !== "" && parts.prefix !== "@";
      const keyword = keywordName && (parts.prefix === "" || parts.prefix === "@");
      const command2 = nextWord3 !== void 0 && !BLOCK_KEYWORDS.has(nextWord3) && !notAKeyword && (keyword || !notABuiltin(parts));
      const opensBlock = nextWord3 === "if" || nextWord3 === "while";
      const splits = st.viaEval ? !blockErrorOnce(st) : !opensBlock || blockChecksLeft(st) && !blockError(text.slice(next, st.end), "top");
      const sendsText = st.viaEval !== void 0 && nextWord3 === void 0;
      if ((command2 || sendsText) && !value && splits) {
        if (st.viaEval) {
          const last = st.viaEval.options.at(-1);
          match.fix = {
            title: `Give the /${st.viaEval.command} -son`,
            edits: [{ start: last.start, end: last.end, newText: last.whole ? "-son" : "son" }]
          };
        } else if (entry.offsetMap[at2]?.line === entry.offsetMap[next]?.line) {
          match.fix = { title: "Put the next command on a line of its own", edits: [{ start: at2, end: next, newText: "\n" }] };
        }
      }
      out.push(match);
    }
    return out;
  }
};

// packages/core/src/rules/keywordMidStatement.ts
var keywordMidStatement = {
  id: "keyword-mid-statement",
  severity: "error",
  scope: "entry",
  check(entry) {
    const matches = [];
    for (const issue of entryStructure(entry)) {
      if (issue.kind !== "keyword" && issue.kind !== "keyword-warning") continue;
      const { kind, ...match } = issue;
      matches.push(kind === "keyword-warning" ? { ...match, severity: "warning" } : match);
    }
    const text = entry.text;
    for (const w of entrySwallowed(entry)) {
      if (!w.stray) continue;
      const what = swallower(text, w.stmt, w.start, w.command);
      const keyword = text.slice(w.start, w.end);
      matches.push({
        start: w.start,
        end: w.end,
        message: what.endsWith(" value") ? `This ${keyword} is part of ${what}, not a command, so ${w.stray.message}: put %; before it.` : `${keyword} here is not a keyword: it is part of ${what}, so ${w.stray.message}: put %; before it.`,
        label: `part of ${what}`,
        explanation: `tf only reads a keyword at the start of a statement, and statements are separated by ${code("%;")}. ${takesTheRest(w.command, w.word, what)} So the block it would have opened isn't there, and ${code(text.slice(w.stray.start, w.stray.end))} after it has nothing to belong to, which is the error tf reports.`,
        related: [{ start: w.stray.start, end: w.stray.end, message: w.stray.message }],
        fix: { title: `Put %; before ${keyword}`, edits: w.edits }
      });
    }
    return matches;
  }
};

// packages/core/src/rules/conditionListText.ts
var conditionListText = {
  id: "condition-list-text",
  severity: "warning",
  scope: "entry",
  check(entry) {
    const matches = [];
    for (const issue of entryStructure(entry)) {
      if (issue.kind !== "condition-text") continue;
      const { kind: _kind, ...match } = issue;
      matches.push(match);
    }
    return matches;
  }
};

// packages/core/src/rules/keywordNeedsSpace.ts
var keywordNeedsSpace = {
  id: "keyword-needs-space",
  severity: "error",
  scope: "entry",
  check(entry, file) {
    const matches = [];
    for (const issue of entryStructure(entry)) {
      if (issue.kind !== "glued" && issue.kind !== "glued-punct") continue;
      const { kind, ...match } = issue;
      if (kind === "glued-punct") {
        const name = entry.text.slice(issue.start + 1, issue.end);
        if (!name.startsWith("@") && file.macros.has(name.toLowerCase())) continue;
        matches.push({ ...match, severity: "warning" });
      } else matches.push(match);
    }
    return matches;
  }
};

// packages/core/src/rules/substitutionInExpression.ts
var substitutionInExpression = {
  id: "substitution-in-expression",
  severity: "warning",
  scope: "entry",
  check(entry) {
    return entrySubstitution(entry).issues.filter((i) => i.kind === "operand").map(({ kind: _kind, ...match }) => match);
  }
};

// packages/core/src/rules/indentedLineAfterCommand.ts
function check(text) {
  const lines = splitRawLines(text);
  const matches = [];
  let newCmd = true;
  let lastCmdLine = 0;
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx] ?? "";
    if (isCommentLine(line)) continue;
    const i = leadingWhitespaceLength(line);
    const isBlank = i >= line.length;
    if (isBlank) {
      lastCmdLine = 0;
      newCmd = true;
      continue;
    }
    const startsIndented = i > 0;
    if (newCmd && startsIndented && lastCmdLine > 0) {
      const previous = lastCmdLine - 1;
      const prevLine = lines[previous] ?? "";
      let prevEnd = prevLine.length;
      while (prevEnd > 0 && isTfSpace(prevLine[prevEnd - 1])) prevEnd -= 1;
      matches.push({
        line: idx,
        startChar: 0,
        endChar: i,
        message: `Line ${lastCmdLine} has no \\ at the end, so this indented line starts a new command: end line ${lastCmdLine} with \\ to continue it, or remove the indentation.`,
        label: "starts a new command",
        explanation: `tf joins a line onto the one before it only when that one ends in ${code("\\")}. This line is indented as if it continued line ${lastCmdLine}, but tf runs it as a command of its own, and warns ${code("possibly missing trailing \\")}.`,
        related: [{ line: previous, startChar: Math.max(prevEnd - 1, 0), endChar: prevEnd, message: "no \\ at the end of this line" }]
      });
    }
    lastCmdLine = idx + 1;
    newCmd = !continuesToNextLine(line);
  }
  return matches;
}
var indentedLineAfterCommand = {
  id: "indented-line-after-command",
  severity: "warning",
  scope: "file",
  check
};

// packages/core/src/rules/backslashNotLast.ts
function check2(text) {
  const lines = splitRawLines(text);
  const matches = [];
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx] ?? "";
    if (isCommentLine(line) || isBlankLine(line)) continue;
    if (line.endsWith("\\")) continue;
    let end = line.length - 1;
    while (end > 0 && isTfSpace(line[end])) end -= 1;
    if (line[end] !== "\\") continue;
    const after = line.slice(end + 1);
    const detail = line[end - 1] === "%" ? {
      message: "This %\\ doesn't continue the line, with or without the whitespace after it: to continue, end the line with a \\ that has no % before it.",
      label: "%\\ never continues",
      explanation: `tf continues a line onto the next one only when its very last character is a ${code("\\")} that doesn't follow a ${code("%")}: a line ending in ${code("%\\")} is a complete command. tf also warns ${code("whitespace following final '\\'")} about the whitespace after it.`
    } : after === "\r" ? {
      message: "This \\ doesn't continue the line, because the file's Windows (CRLF) line endings put a carriage return after it: save the file with LF line endings.",
      label: "carriage return after the \\",
      explanation: `A line continues onto the next one only when ${code("\\")} is its very last character. tf keeps the carriage return of a CRLF line ending as part of the line, and counts it as whitespace, so no line in this file can continue. Save the file with LF line endings.`
    } : {
      message: "This \\ doesn't continue the line, because whitespace follows it: remove the whitespace.",
      label: "whitespace after the \\",
      explanation: `A line continues onto the next one only when ${code("\\")} is its very last character. With whitespace after it, tf runs this line as a command of its own, and warns ${code("whitespace following final '\\'")}.`
    };
    const fixable = !after.includes("\r") && line[end - 1] !== "%";
    matches.push({
      line: idx,
      startChar: end,
      endChar: line.length,
      ...detail,
      ...fixable ? { fix: { title: "Remove the whitespace after the \\", edits: [{ line: idx, startChar: end + 1, endChar: line.length, newText: "" }] } } : {}
    });
  }
  return matches;
}
var backslashNotLast = {
  id: "backslash-not-last",
  severity: "warning",
  scope: "file",
  check: check2
};

// packages/core/src/rules/substitutionSyntax.ts
var substitutionSyntax = {
  id: "substitution-syntax",
  severity: "error",
  scope: "entry",
  check(entry) {
    return entrySubstitution(entry).issues.filter((i) => i.kind === "substitution").map(({ kind: _kind, ...match }) => match);
  }
};

// packages/core/src/data/keywordCommands.generated.ts
var KEYWORD_COMMANDS = [
  "BREAK",
  "DO",
  "DONE",
  "ELSE",
  "ELSEIF",
  "ENDIF",
  "EXIT",
  "IF",
  "LET",
  "RESULT",
  "RETURN",
  "SET",
  "SETENV",
  "TEST",
  "THEN",
  "WHILE"
];

// packages/core/src/data/stdlibCommands.generated.ts
var STDLIB_COMMANDS = [
  ":",
  "_echo",
  "_paste",
  "act",
  "adddiku",
  "addlp",
  "addlpp",
  "addtelnet",
  "addtiny",
  "addworld",
  "background",
  "bamf",
  "bg",
  "borg",
  "cat",
  "cd",
  "cleardone",
  "clearfull",
  "echo",
  "escape",
  "expr",
  "false",
  "first",
  "for",
  "gpri",
  "grab",
  "hilite_page",
  "hilite_whisper",
  "hpri",
  "insert",
  "isize",
  "ismacro",
  "isvar",
  "kecho",
  "last",
  "listbind",
  "listdef",
  "listfullhilite",
  "listgag",
  "listhilite",
  "listhook",
  "listpartial",
  "listtrig",
  "loaded",
  "loadhist",
  "login",
  "lp",
  "lpquote",
  "man",
  "mecho",
  "more",
  "nogag",
  "nohilite",
  "nohilite_page",
  "nohilite_whisper",
  "nolog",
  "nologin",
  "noquiet",
  "not",
  "nowrap",
  "nth",
  "partial",
  "paste",
  "prompt",
  "proxy_command",
  "proxy_connect",
  "proxy_hook",
  "ptime",
  "purgebind",
  "purgedef",
  "purgedeft",
  "purgegag",
  "purgehilite",
  "purgehook",
  "purgetrig",
  "purgeworld",
  "pwd",
  "qecho",
  "quiet",
  "quitdone",
  "rand",
  "redef",
  "replace",
  "reply",
  "require",
  "rest",
  "retry",
  "retry_off",
  "runtime",
  "savehilite",
  "send",
  "send_help",
  "shpause",
  "signal",
  "sockmload",
  "split",
  "sub",
  "substitute",
  "sys",
  "telnet",
  "time",
  "toggle",
  "trig",
  "trigc",
  "trigp",
  "true",
  "undeft",
  "unhook",
  "untrig",
  "ver",
  "vercmp",
  "visual",
  "world",
  "wrap",
  "wrapspace",
  "~con_hook_telnet",
  "~def_file_command",
  "~default_login_hook",
  "~detect_worldtype_hook",
  "~do_prefix",
  "~gagloadfail",
  "~login_hook_lp",
  "~login_hook_lpp",
  "~login_hook_telnet",
  "~login_hook_tiny",
  "~send",
  "~telnet_passwd",
  "~world_hook_lp",
  "~world_hook_lpp",
  "~world_hook_prompt",
  "~world_hook_telnet",
  "~world_hook_tiny"
];

// packages/core/src/data/commands.ts
function dedupe(infos) {
  const seen = /* @__PURE__ */ new Map();
  for (const info of infos) {
    const key2 = info.name.toLowerCase();
    if (!seen.has(key2)) seen.set(key2, info);
  }
  return [...seen.values()];
}
var ALL_COMMANDS = dedupe([
  ...KEYWORD_COMMANDS.map((name) => ({ name, source: "keyword" })),
  ...BUILTIN_COMMANDS.map((name) => ({ name, source: "builtin" })),
  ...STDLIB_COMMANDS.map((name) => ({ name, source: "stdlib" }))
]);
var RESERVED_MACRO_NAMES = new Set([...KEYWORD_COMMANDS, "EVAL"].map((n) => n.toLowerCase()));

// packages/core/src/rules/invalidMacroName.ts
var DEF_PREFIX_RE = /^!*@?$/;
var invalidMacroName = {
  id: "invalid-macro-name",
  severity: "error",
  scope: "entry",
  check(entry) {
    const text = entry.text;
    let start = 0;
    while (text[start] === " " || text[start] === "	") start += 1;
    const { prefix, word } = commandParts(text, start);
    if (word !== "def" || !DEF_PREFIX_RE.test(prefix)) return [];
    const after = start + 1 + prefix.length + word.length;
    if (after < text.length && text[after] !== " " && text[after] !== "	") return [];
    if (defHasInvalidOption(text, after)) return [];
    const opts = defOptionsEnd(text, after);
    const eq = text.indexOf("=", opts);
    let from = opts;
    let to = eq === -1 ? text.length : eq;
    while (from < to && /\s/.test(text[from])) from += 1;
    while (to > from && /\s/.test(text[to - 1])) to -= 1;
    if (to === from) return [];
    const name = text.slice(from, to);
    const span = { start: from, end: to };
    if (RESERVED_MACRO_NAMES.has(name.toLowerCase())) {
      const lower = name.toLowerCase();
      const what = lower === "eval" ? "command" : "keyword";
      return [
        {
          ...span,
          message: `"${name}" is a reserved word, so tf refuses this /def and defines nothing: pick another name.`,
          label: "reserved word",
          explanation: `tf won't define a macro named after one of its keywords (the control flow, such as ${code("if")} and ${code("while")}, and ${code("let")}, ${code("set")}, ${code("setenv")}, ${code("test")}, ${code("return")}, ${code("result")} and ${code("exit")}) or ${code("eval")}. It skips the whole ${code("/def")} with the error ${code(`"${name}" is a reserved word.`)}, and ${code(`/${lower}`)} keeps meaning tf's own ${what}.`
        }
      ];
    }
    const badStart = "#@!/".includes(name[0]);
    const blank = /[ \t]/.exec(name);
    if (!badStart && !blank) return [];
    const explanation = `tf takes a macro's name as everything between the ${code("/def")} options and the ${code("=")}, and refuses one that starts with ${code("#")}, ${code("@")}, ${code("!")} or ${code("/")}, or holds a space, with the error ${code(`illegal macro name "${name.replace(/\t/g, " ")}".`)} It defines nothing.`;
    if (badStart) {
      return [
        {
          ...span,
          message: `"${name}" can't be a macro name, as it starts with ${name[0]}, so tf refuses this /def and defines nothing: pick another name.`,
          label: "illegal name",
          explanation
        }
      ];
    }
    const first = name.slice(0, blank.index);
    let rest = blank.index;
    while (rest < name.length && (name[rest] === " " || name[rest] === "	")) rest += 1;
    const missingEquals = name[rest] === "/" && !"#@!/".includes(first[0]) && !first.includes("%") && !RESERVED_MACRO_NAMES.has(first.toLowerCase());
    if (missingEquals) {
      const at2 = from + first.length;
      return [
        {
          ...span,
          message: `This /def has no = after its name, so tf takes all of "${name}" as the name, which can't hold a space, and defines nothing: put = after ${first}.`,
          label: "no =",
          explanation,
          fix: { title: `Put = after ${first}`, edits: [{ start: at2, end: at2, newText: " =" }] }
        }
      ];
    }
    return [
      {
        ...span,
        message: `"${name}" can't be a macro name, as it holds ${name.includes(" ") ? "a space" : "a tab, which tf reads as a space"}, so tf refuses this /def and defines nothing: pick a name of one word.`,
        label: "illegal name",
        explanation
      }
    ];
  }
};

// packages/core/src/rules/blockStructure.ts
var blockStructure = {
  id: "block-structure",
  severity: "error",
  scope: "entry",
  check(entry) {
    return entryStructure(entry).filter((i) => i.kind === "block").map(({ kind: _kind, ...match }) => match);
  }
};

// packages/core/src/rules/expressionSyntax.ts
var expressionSyntax = {
  id: "expression-syntax",
  severity: "error",
  scope: "entry",
  check(entry) {
    return entrySubstitution(entry).issues.filter((i) => i.kind === "expression").map(({ kind: _kind, ...match }) => match);
  }
};

// packages/core/src/rules/emptyStatement.ts
var emptyStatement = {
  id: "empty-statement",
  severity: "warning",
  scope: "entry",
  check(entry) {
    return entrySubstitution(entry).issues.filter((i) => i.kind === "empty-statement").map(({ kind: _kind, ...match }) => match);
  }
};

// packages/core/src/rules/nestingTooDeep.ts
var nestingTooDeep = {
  id: "nesting-too-deep",
  severity: "information",
  scope: "entry",
  check(entry) {
    return entryStructure(entry).filter((i) => i.kind === "too-deep").map(({ kind: _kind, ...match }) => match);
  }
};

// packages/core/src/rules/incompleteContinuation.ts
function check3(text) {
  const entry = splitLogicalEntries(text).at(-1);
  if (!entry?.incomplete) return [];
  const lastPart = entry.parts[entry.parts.length - 1];
  if (!lastPart) return [];
  const line = splitRawLines(text)[lastPart.line] ?? "";
  if (!line.endsWith("\\")) return [];
  const at2 = line.length - 1;
  return [
    {
      line: lastPart.line,
      startChar: at2,
      endChar: line.length,
      message: "The last command ends in \\, so tf drops it: remove the \\ or add the rest of the command.",
      label: "continues past the end of the file",
      explanation: `A ${code("\\")} at the end of a line joins the next line onto this command, but the file ends here, so there is no next line. tf warns ${code("last command is incomplete because of trailing \\")} and runs nothing of the command: a macro it would define isn't defined.`,
      fix: { title: "Remove the \\", edits: [{ line: lastPart.line, startChar: at2, endChar: line.length, newText: "" }] }
    }
  ];
}
var incompleteContinuation = {
  id: "incomplete-continuation",
  severity: "warning",
  scope: "file",
  check: check3
};

// packages/core/src/rules/bodyContinuesWithoutBackslash.ts
function check4(text) {
  const lines = splitRawLines(text);
  const matches = [];
  const entries = splitLogicalEntries(text);
  entries.forEach((entry, index2) => {
    if (!(entry.isDefBody || entry.isOtherMacroBody) || entry.incomplete) return;
    const last = lines[entry.endLine] ?? "";
    let end = last.length;
    while (end > 0 && isTfSpace(last[end - 1])) end -= 1;
    if (end < 2 || last.slice(end - 2, end) !== "%;" || last[end - 3] === "%" || last[end - 3] === "\\") return;
    const next = lines[entry.endLine + 1];
    if (next === void 0 || isCommentLine(next) || leadingWhitespaceLength(next) > 0 || !next.startsWith("/")) return;
    const following = entries[index2 + 1];
    if (following && following.startLine === entry.endLine + 1 && (following.isDefBody || following.isOtherMacroBody)) return;
    if (/^\/(?:then|else|elseif|endif|do|done)(?![^ \t\r\f\v%])/i.test(next)) return;
    const name = /^\/def\b/i.test(entry.text) ? entry.text.slice(defOptionsEnd(entry.text, 4)).split("=")[0]?.trim().toLowerCase() : void 0;
    if (name && /^\/[@!]*(\S*)/.exec(next)?.[1]?.toLowerCase() === name) return;
    matches.push({
      line: entry.endLine,
      startChar: end - 2,
      endChar: end,
      message: `The macro body ends here, so line ${entry.endLine + 2} is a command of its own, run when the file loads: end this line with \\ if it belongs to the body.`,
      label: "the body ends here",
      explanation: `The ${code("%;")} says another statement follows, but a line only continues onto the next one when it ends in ${code("\\")}. So the body ends here, and tf runs line ${entry.endLine + 2} once, as it loads the file. If it is meant to run then, drop the ${code("%;")}.`,
      related: [{ line: entry.endLine + 1, startChar: 0, endChar: next.length, message: "runs when the file loads" }],
      fix: { title: `End line ${entry.endLine + 1} with \\`, edits: [{ line: entry.endLine, startChar: end, endChar: last.length, newText: " \\" }] }
    });
  });
  return matches;
}
var bodyContinuesWithoutBackslash = {
  id: "body-continues-without-backslash",
  severity: "information",
  scope: "file",
  check: check4
};

// packages/core/src/rules/index.ts
var RULES = [
  missingContinuation,
  notSubstitutedHere,
  keywordMidStatement,
  substitutionInExpression,
  indentedLineAfterCommand,
  backslashNotLast,
  substitutionSyntax,
  invalidMacroName,
  blockStructure,
  conditionListText,
  keywordNeedsSpace,
  expressionSyntax,
  emptyStatement,
  nestingTooDeep,
  incompleteContinuation,
  bodyContinuesWithoutBackslash
];

// packages/core/src/rules/notACommand.ts
function findAbortEntry(entries) {
  for (let idx = 0; idx < entries.length; idx += 1) {
    const entry = entries[idx];
    if (!entry) continue;
    if (entry.incomplete) continue;
    const leadingLen = leadingWhitespaceLength(entry.text);
    const firstChar = entry.text[leadingLen];
    if (firstChar === void 0) continue;
    if (firstChar === "/") continue;
    const start = entry.offsetMap[leadingLen];
    if (!start) continue;
    let end = leadingLen;
    while (end < entry.offsetMap.length && entry.offsetMap[end]?.line === start.line) {
      end += 1;
    }
    const lastChar = entry.offsetMap[end - 1] ?? start;
    const firsts = /* @__PURE__ */ new Map();
    for (const at2 of entry.offsetMap) if (!firsts.has(at2.line)) firsts.set(at2.line, at2.character);
    const after = entry.text.slice(leadingLen + 1);
    const rest = after[leadingWhitespaceLength(after)];
    if (firstChar === "\uFEFF" && (rest === "/" || rest === ";" || rest === "#")) {
      return {
        entryIndex: idx,
        line: start.line,
        startChar: start.character,
        endChar: start.character + 1,
        message: "This line starts with a byte order mark (U+FEFF), which tf reads as text, so it stops loading the file here: delete the mark.",
        label: "byte order mark",
        explanation: `Some editors save UTF-8 files with an invisible byte order mark at the start. tf doesn't skip it, so the line doesn't start with ${code("/")}, ${code(";")} or ${code("#")}: tf reports ${code("Invalid command. Aborting.")} and reads nothing after it. Save the file as UTF-8 without a BOM.`,
        fix: { title: "Delete the byte order mark", edits: [{ line: start.line, startChar: start.character, endChar: start.character + 1, newText: "" }] }
      };
    }
    return {
      entryIndex: idx,
      line: start.line,
      startChar: start.character,
      endChar: lastChar.character + 1,
      message: "This line isn't a command, so tf stops loading the file here: comment it out, or start it with /.",
      label: "not a command",
      explanation: `tf joins the lines of a file that end in ${code("\\")} onto the line after, and runs each resulting command. Apart from blank lines and comments (starting with ${code(";")} or ${code("#")}), each command has to start with ${code("/")}; at any other command tf reports ${code("Invalid command. Aborting.")} and reads nothing after it. If the line belongs to the command above it, end that command's last line with ${code("\\")}; if it is a note, make it a comment.`,
      fix: {
        title: firsts.size > 1 ? "Comment out these lines" : "Comment out the line",
        edits: [...firsts].map(([line, character]) => ({ line, startChar: character, endChar: character, newText: "; " }))
      }
    };
  }
  return null;
}

// packages/core/src/diagnostics.ts
function positionOf(entry, offset) {
  const at2 = entry.offsetMap[offset];
  if (at2) return { line: at2.line, character: at2.character };
  const last = entry.offsetMap[offset - 1];
  return last ? { line: last.line, character: last.character + 1 } : void 0;
}
function rangeOf(entry, start, end) {
  const from = positionOf(entry, start);
  if (end <= start) return from && { start: from, end: from };
  const lastChar = entry.offsetMap[end - 1];
  return from && lastChar ? { start: from, end: { line: lastChar.line, character: lastChar.character + 1 } } : void 0;
}
function entryDiagnostic(entry, match, code3, severity) {
  if (match.end <= match.start) return void 0;
  const range = rangeOf(entry, match.start, match.end);
  if (!range) return void 0;
  const d = { range, message: match.message, code: code3, severity: match.severity ?? severity };
  if (match.label) d.label = match.label;
  if (match.explanation) d.explanation = match.explanation;
  const related = (match.related ?? []).flatMap((n) => {
    const r = rangeOf(entry, n.start, n.end);
    return r ? [{ range: r, message: n.message }] : [];
  });
  if (related.length > 0) d.related = related;
  const mapped = (fix2) => {
    const edits = fix2.edits.map((e) => {
      const r = rangeOf(entry, e.start, e.end);
      return r && { range: r, newText: e.newText };
    });
    return edits.length > 0 && edits.every((e) => e) ? { title: fix2.title, edits } : void 0;
  };
  const fix = match.fix && mapped(match.fix);
  if (fix) d.fix = fix;
  const alternative = match.alternative && mapped(match.alternative);
  if (alternative) d.alternative = alternative;
  return d;
}
function spanRange(s) {
  return { start: { line: s.line, character: s.startChar }, end: { line: s.line, character: s.endChar } };
}
function lineDiagnostic(match, code3, severity) {
  const d = { range: spanRange(match), message: match.message, code: code3, severity };
  if (match.label) d.label = match.label;
  if (match.explanation) d.explanation = match.explanation;
  if (match.related && match.related.length > 0) d.related = match.related.map((n) => ({ range: spanRange(n), message: n.message }));
  if (match.fix) d.fix = { title: match.fix.title, edits: match.fix.edits.map((e) => ({ range: spanRange(e), newText: e.newText })) };
  return d;
}
var reportRuleError = (rule, error) => {
  process.stderr.write(`tfscript: rule ${rule} failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}
`);
};
function getDiagnostics(text, { joinFixes = true } = {}) {
  const entries = splitLogicalEntries(text);
  let diagnostics = [];
  const abort = findAbortEntry(entries);
  const usableEntries = (abort ? entries.slice(0, abort.entryIndex) : entries).filter(
    (entry) => !entry.incomplete
  );
  const readableLineCount = abort ? (entries[abort.entryIndex]?.endLine ?? abort.line) + 1 : void 0;
  const textForFileRules = readableLineCount !== void 0 ? splitRawLines(text).slice(0, readableLineCount).join("\n") : text;
  const macros = /* @__PURE__ */ new Set();
  for (const entry of usableEntries) {
    const name = definedMacro(entry);
    if (name) macros.add(name.toLowerCase());
  }
  const facts = { macros };
  for (const rule of RULES) {
    let failed = false;
    const guarded = (run) => {
      try {
        run();
      } catch (error) {
        if (!failed) reportRuleError(rule.id, error);
        failed = true;
      }
    };
    if (rule.scope === "entry") {
      for (const entry of usableEntries) {
        guarded(() => {
          const found = [];
          for (const match of rule.check(entry, facts)) {
            const d = entryDiagnostic(entry, match, rule.id, rule.severity);
            if (d) found.push(d);
          }
          for (const d of found) diagnostics.push(d);
        });
      }
    } else {
      guarded(() => {
        const found = rule.check(textForFileRules).map((match) => lineDiagnostic(match, rule.id, rule.severity));
        for (const d of found) diagnostics.push(d);
      });
    }
  }
  if (abort) diagnostics.push(lineDiagnostic(abort, "not-a-command", "error"));
  diagnostics = consolidateContinuations(text, entries, diagnostics);
  unjoinGluedKeywords(text, entries, diagnostics);
  if (joinFixes) addJoinFixes(text, diagnostics, (t) => getDiagnostics(t, { joinFixes: false }));
  return diagnostics;
}
function unjoinGluedKeywords(text, entries, diagnostics) {
  let lines;
  for (const d of diagnostics) {
    if (d.code !== "keyword-needs-space" || d.range.end.line <= d.range.start.line) continue;
    lines ??= splitRawLines(text);
    const n = d.range.start.line;
    const raw = lines[n] ?? "";
    const keyword = raw.slice(d.range.start.character, raw.length - 1);
    if (!raw.endsWith("\\") || !/^\/@?[A-Za-z]+$/.test(keyword)) continue;
    const line = n + 1;
    let m = n + 1;
    while (m < lines.length && isCommentLine(lines[m] ?? "")) m += 1;
    const next = lines[m] ?? "";
    const glued = keyword + joinedWord(lines, m);
    const at2 = { line: n, character: raw.length - 1 };
    const word = keyword.replace(/^\/@?/, "").toLowerCase();
    const keep = { title: `Put %; before the \\ on line ${line}`, edits: [{ range: { start: at2, end: at2 }, newText: "%;" }] };
    if (word === "endif" || word === "done") {
      d.message = `Line ${line} ends in \\, so tf joins the next line on and reads ${glued} as one command: put %; before the \\, or remove the \\.`;
      const split = {
        title: `Remove the \\ at the end of line ${line}`,
        edits: [{ range: { start: at2, end: { line: n, character: raw.length } }, newText: "" }]
      };
      const entry = entries.find((e) => e.startLine <= n && n <= e.endLine);
      const defined = entry && definedMacro(entry)?.toLowerCase();
      const calls = next.endsWith("\\") ? void 0 : /^\/([^\s%@\\]+)/.exec(next)?.[1]?.toLowerCase();
      const ownCommand = /^\/@?def\b/i.test(next) || !!defined && calls === defined;
      const sameBody = !ownCommand && (/^[ \t\f\v]/.test(next) || next.endsWith("\\") || !!entry?.isDefBody || !!entry?.isOtherMacroBody);
      d.fix = sameBody ? keep : split;
      d.alternative = sameBody ? split : keep;
    } else if (word === "break") {
      d.message = `Line ${line} ends in \\, so tf joins the next line on and reads ${glued} as one command: put %; before the \\.`;
      d.fix = keep;
      delete d.alternative;
    } else if (!d.fix) {
      const rest = next.trimStart();
      const paren = rest.startsWith("(") ? parenthesized(rest) : "";
      const head = `Line ${line} ends in \\, so tf joins the next line on and reads ${glued} as one command`;
      if (paren && word === "else") d.message = `${head}: did you mean /elseif ${paren}? Then put a space before the \\.`;
      else if (paren && (word === "then" || word === "do")) d.message = `${head}: /${word} takes no (condition).`;
      else if (paren && /^[ \t]*%[;|\\]/.test(rest.slice(paren.length))) d.message = `${head}: put a space before the \\, and a command between the ${paren} and the %;.`;
      else if (paren) d.message = `${head}: put a space before the \\.`;
      else d.message = `${head}: unless a macro named ${glued.slice(1)} is defined elsewhere, put a space before the \\.`;
    } else {
      d.message = `Line ${line} ends in \\, so tf joins the next line on and reads ${glued} as one command: put a space before the \\.`;
      d.fix = { title: `Put a space before the \\ on line ${line}`, edits: [{ range: { start: at2, end: at2 }, newText: " " }] };
      delete d.alternative;
    }
  }
}
function parenthesized(text) {
  let depth = 0;
  for (let p = 0; p < text.length; p += 1) {
    const ch = text[p];
    if (ch === '"' || ch === "'" || ch === "`") {
      p += 1;
      while (p < text.length && text[p] !== ch) p += text[p] === "\\" ? 2 : 1;
    } else if (ch === "(") depth += 1;
    else if (ch === ")" && --depth === 0) return text.slice(0, p + 1);
  }
  return "";
}
function joinedWord(lines, m) {
  let word = "";
  for (let k = m; k < lines.length; ) {
    const rest = (lines[k] ?? "").trimStart();
    const part = /^[^\s%]*/.exec(rest)?.[0] ?? "";
    if (!part.endsWith("\\") || part.length !== rest.length) return word + part;
    word += part.slice(0, -1);
    k += 1;
    while (k < lines.length && isCommentLine(lines[k] ?? "")) k += 1;
  }
  return word;
}

// packages/server/src/completions.ts
var import_node = __toESM(require_node3());

// packages/core/src/data/functions.generated.ts
var FUNCTIONS = [
  {
    "name": "abs",
    "min": 1,
    "max": 1,
    "synopses": [
      "abs(n)"
    ]
  },
  {
    "name": "acos",
    "min": 1,
    "max": 1,
    "synopses": [
      "acos(r)"
    ]
  },
  {
    "name": "addworld",
    "min": 2,
    "max": 9,
    "synopses": [
      "addworld(name, type, host, port, char, pass, file, use_proxy)"
    ]
  },
  {
    "name": "ascii",
    "min": 1,
    "max": 1,
    "synopses": [
      "ascii(s)"
    ]
  },
  {
    "name": "ascii_bytes",
    "min": 1,
    "max": 1,
    "synopses": [
      "ascii_bytes(s)"
    ]
  },
  {
    "name": "asin",
    "min": 1,
    "max": 1,
    "synopses": [
      "asin(r)"
    ]
  },
  {
    "name": "atan",
    "min": 1,
    "max": 1,
    "synopses": [
      "atan(r)"
    ]
  },
  {
    "name": "atcp",
    "min": 1,
    "max": 2,
    "requires": "ENABLE_ATCP"
  },
  {
    "name": "calllua",
    "min": 1,
    "max": null,
    "requires": "LUA_ENABLED"
  },
  {
    "name": "char",
    "min": 1,
    "max": 1,
    "synopses": [
      "char(i)"
    ]
  },
  {
    "name": "char_bytes",
    "min": 1,
    "max": 1,
    "synopses": [
      "char_bytes(i)"
    ]
  },
  {
    "name": "columns",
    "min": 0,
    "max": 0,
    "synopses": [
      "columns()"
    ]
  },
  {
    "name": "cos",
    "min": 1,
    "max": 1,
    "synopses": [
      "cos(r)"
    ]
  },
  {
    "name": "cputime",
    "min": 0,
    "max": 0,
    "synopses": [
      "cputime()"
    ]
  },
  {
    "name": "decode_ansi",
    "min": 1,
    "max": 1,
    "synopses": [
      "decode_ansi(s)"
    ]
  },
  {
    "name": "decode_attr",
    "min": 1,
    "max": 3,
    "synopses": [
      "decode_attr(s1 [, s2 [, f]])"
    ]
  },
  {
    "name": "echo",
    "min": 1,
    "max": 4,
    "synopses": [
      "echo(s1 [,attrs [,inline [,dest]]])"
    ]
  },
  {
    "name": "encode_ansi",
    "min": 1,
    "max": 1,
    "synopses": [
      "encode_ansi(s)"
    ]
  },
  {
    "name": "encode_attr",
    "min": 1,
    "max": 1,
    "synopses": [
      "encode_attr(s)"
    ]
  },
  {
    "name": "eval",
    "min": 1,
    "max": 2,
    "synopses": [
      "eval(s1 [, s2])"
    ]
  },
  {
    "name": "exp",
    "min": 1,
    "max": 1,
    "synopses": [
      "exp(r)"
    ]
  },
  {
    "name": "fake_recv",
    "min": 1,
    "max": 3
  },
  {
    "name": "fg_world",
    "min": 0,
    "max": 0,
    "synopses": [
      "fg_world()"
    ]
  },
  {
    "name": "filename",
    "min": 1,
    "max": 1,
    "synopses": [
      "filename(s)"
    ]
  },
  {
    "name": "ftime",
    "min": 0,
    "max": 2,
    "synopses": [
      "ftime(s,n)",
      "ftime(s)",
      "ftime()"
    ]
  },
  {
    "name": "fwrite",
    "min": 2,
    "max": 2,
    "synopses": [
      "fwrite(s1,s2)"
    ]
  },
  {
    "name": "gethostname",
    "min": 0,
    "max": 0,
    "synopses": [
      "gethostname()"
    ]
  },
  {
    "name": "getopts",
    "min": 1,
    "max": 2,
    "synopses": [
      "getopts(s1, s2)"
    ]
  },
  {
    "name": "getpid",
    "min": 0,
    "max": 0,
    "synopses": [
      "getpid()"
    ]
  },
  {
    "name": "gmcp",
    "min": 1,
    "max": 2,
    "requires": "ENABLE_GMCP"
  },
  {
    "name": "idle",
    "min": 0,
    "max": 1,
    "synopses": [
      "idle()",
      "idle(s)"
    ]
  },
  {
    "name": "is_connected",
    "min": 0,
    "max": 1,
    "synopses": [
      "is_connected()",
      "is_connected(s)"
    ]
  },
  {
    "name": "is_open",
    "min": 0,
    "max": 1,
    "synopses": [
      "is_open()",
      "is_open(s)"
    ]
  },
  {
    "name": "isatty",
    "min": 0,
    "max": 0
  },
  {
    "name": "kbdel",
    "min": 1,
    "max": 1,
    "synopses": [
      "kbdel(i)"
    ]
  },
  {
    "name": "kbgoto",
    "min": 1,
    "max": 1,
    "synopses": [
      "kbgoto(i)"
    ]
  },
  {
    "name": "kbhead",
    "min": 0,
    "max": 0,
    "synopses": [
      "kbhead()"
    ]
  },
  {
    "name": "kblen",
    "min": 0,
    "max": 0,
    "synopses": [
      "kblen()"
    ]
  },
  {
    "name": "kbmatch",
    "min": 0,
    "max": 1,
    "synopses": [
      "kbmatch()",
      "kbmatch(i)"
    ]
  },
  {
    "name": "kbpoint",
    "min": 0,
    "max": 0,
    "synopses": [
      "kbpoint()"
    ]
  },
  {
    "name": "kbtail",
    "min": 0,
    "max": 0,
    "synopses": [
      "kbtail()"
    ]
  },
  {
    "name": "kbwordleft",
    "min": 0,
    "max": 1,
    "synopses": [
      "kbwordleft()",
      "kbwordleft(i)"
    ]
  },
  {
    "name": "kbwordright",
    "min": 0,
    "max": 1,
    "synopses": [
      "kbwordright()",
      "kbwordright(i)"
    ]
  },
  {
    "name": "keycode",
    "min": 1,
    "max": 1,
    "synopses": [
      "keycode(s)"
    ]
  },
  {
    "name": "lines",
    "min": 0,
    "max": 0,
    "synopses": [
      "lines()"
    ]
  },
  {
    "name": "ln",
    "min": 1,
    "max": 1,
    "synopses": [
      "ln(n)"
    ]
  },
  {
    "name": "log10",
    "min": 1,
    "max": 1,
    "synopses": [
      "log10(n)"
    ]
  },
  {
    "name": "mktime",
    "min": 1,
    "max": 7,
    "synopses": [
      "mktime(year [, month [, day [, hour [, minute [, second [, microsecond]]]]]])"
    ]
  },
  {
    "name": "mod",
    "min": 2,
    "max": 2,
    "synopses": [
      "mod(i1,i2)"
    ]
  },
  {
    "name": "morepaused",
    "min": 0,
    "max": 1,
    "synopses": [
      "morepaused([s1])"
    ]
  },
  {
    "name": "morescroll",
    "min": 1,
    "max": 1,
    "synopses": [
      "morescroll(i)"
    ]
  },
  {
    "name": "moresize",
    "min": 0,
    "max": 2,
    "synopses": [
      "moresize([s1 [, s2]])"
    ]
  },
  {
    "name": "msdp",
    "min": 1,
    "max": 2,
    "requires": "ENABLE_MSDP"
  },
  {
    "name": "nactive",
    "min": 0,
    "max": 1,
    "synopses": [
      "nactive()",
      "nactive(s)"
    ]
  },
  {
    "name": "nlog",
    "min": 0,
    "max": 0,
    "synopses": [
      "nlog()"
    ]
  },
  {
    "name": "nmail",
    "min": 0,
    "max": 0,
    "synopses": [
      "nmail()"
    ]
  },
  {
    "name": "nread",
    "min": 0,
    "max": 0,
    "synopses": [
      "nread()"
    ]
  },
  {
    "name": "option102",
    "min": 1,
    "max": 2,
    "requires": "ENABLE_OPTION102"
  },
  {
    "name": "pad",
    "min": 1,
    "max": null,
    "synopses": [
      "pad([s, i]...)"
    ]
  },
  {
    "name": "pow",
    "min": 2,
    "max": 2,
    "synopses": [
      "pow(n1, n2)"
    ]
  },
  {
    "name": "prompt",
    "min": 1,
    "max": 1,
    "synopses": [
      "prompt(s1)"
    ]
  },
  {
    "name": "python",
    "min": 1,
    "max": 1,
    "requires": "TFPYTHON"
  },
  {
    "name": "rand",
    "min": 0,
    "max": 2,
    "synopses": [
      "rand()",
      "rand(i)",
      "rand(i1,i2)"
    ]
  },
  {
    "name": "read",
    "min": 0,
    "max": 0,
    "synopses": [
      "read()"
    ]
  },
  {
    "name": "regmatch",
    "min": 2,
    "max": 2,
    "synopses": [
      "regmatch(s1, s2)"
    ]
  },
  {
    "name": "replace",
    "min": 3,
    "max": 3,
    "synopses": [
      "replace(s1, s2, s3)"
    ]
  },
  {
    "name": "send",
    "min": 1,
    "max": 3,
    "synopses": [
      "send(s1[, world[, flags]])"
    ]
  },
  {
    "name": "sidle",
    "min": 0,
    "max": 1,
    "synopses": [
      "sidle()",
      "sidle(s)"
    ]
  },
  {
    "name": "sin",
    "min": 1,
    "max": 1,
    "synopses": [
      "sin(r)"
    ]
  },
  {
    "name": "sqrt",
    "min": 1,
    "max": 1,
    "synopses": [
      "sqrt(n)"
    ]
  },
  {
    "name": "status_fields",
    "min": 0,
    "max": 1,
    "synopses": [
      "status_fields([i])"
    ]
  },
  {
    "name": "status_width",
    "min": 1,
    "max": 1
  },
  {
    "name": "strcat",
    "min": 1,
    "max": null,
    "synopses": [
      "strcat(s...)"
    ]
  },
  {
    "name": "strchr",
    "min": 2,
    "max": 3,
    "synopses": [
      "strchr(s1, s2)",
      "strchr(s1, s2, i)"
    ]
  },
  {
    "name": "strchr_bytes",
    "min": 2,
    "max": 3,
    "synopses": [
      "strchr_bytes(s1, s2)",
      "strchr_bytes(s1, s2, i)"
    ]
  },
  {
    "name": "strcmp",
    "min": 2,
    "max": 2,
    "synopses": [
      "strcmp(s1, s2)"
    ]
  },
  {
    "name": "strcmpattr",
    "min": 2,
    "max": 2,
    "synopses": [
      "strcmpattr(s1, s2)"
    ]
  },
  {
    "name": "strip_attr",
    "min": 1,
    "max": 1,
    "synopses": [
      "strip_attr(s)"
    ]
  },
  {
    "name": "strlen",
    "min": 1,
    "max": 1,
    "synopses": [
      "strlen(s)"
    ]
  },
  {
    "name": "strlen_bytes",
    "min": 1,
    "max": 1,
    "synopses": [
      "strlen_bytes(s)"
    ]
  },
  {
    "name": "strncmp",
    "min": 3,
    "max": 3,
    "synopses": [
      "strncmp(s1, s2, i)"
    ]
  },
  {
    "name": "strrchr",
    "min": 2,
    "max": 3,
    "synopses": [
      "strrchr(s1, s2)",
      "strrchr(s1, s2, i)"
    ]
  },
  {
    "name": "strrchr_bytes",
    "min": 2,
    "max": 3,
    "synopses": [
      "strrchr_bytes(s1, s2)",
      "strrchr_bytes(s1, s2, i)"
    ]
  },
  {
    "name": "strrep",
    "min": 2,
    "max": 2,
    "synopses": [
      "strrep(s, i)"
    ]
  },
  {
    "name": "strstr",
    "min": 2,
    "max": 3,
    "synopses": [
      "strstr(s1, s2)",
      "strstr(s1, s2, i)"
    ]
  },
  {
    "name": "strstr_bytes",
    "min": 2,
    "max": 3,
    "synopses": [
      "strstr_bytes(s1, s2)",
      "strstr_bytes(s1, s2, i)"
    ]
  },
  {
    "name": "substitute",
    "min": 1,
    "max": 3,
    "synopses": [
      "substitute(s [,attrs [,inline]])"
    ]
  },
  {
    "name": "substr",
    "min": 2,
    "max": 3,
    "synopses": [
      "substr(s, i1)",
      "substr(s, i1, i2)"
    ]
  },
  {
    "name": "substr_bytes",
    "min": 2,
    "max": 3,
    "synopses": [
      "substr_bytes(s, i1)",
      "substr_bytes(s, i1, i2)"
    ]
  },
  {
    "name": "systype",
    "min": 0,
    "max": 0,
    "synopses": [
      "systype()"
    ]
  },
  {
    "name": "tan",
    "min": 1,
    "max": 1,
    "synopses": [
      "tan(r)"
    ]
  },
  {
    "name": "test",
    "min": 1,
    "max": 1,
    "synopses": [
      "test(s)"
    ]
  },
  {
    "name": "tfclose",
    "min": 1,
    "max": 1,
    "synopses": [
      "tfclose(i)"
    ]
  },
  {
    "name": "tfflush",
    "min": 1,
    "max": 2,
    "synopses": [
      "tfflush(i)",
      "tfflush(i, f)"
    ]
  },
  {
    "name": "tfopen",
    "min": 0,
    "max": 2,
    "synopses": [
      "tfopen(s1, s2)",
      "tfopen()"
    ]
  },
  {
    "name": "tfread",
    "min": 1,
    "max": 2,
    "synopses": [
      "tfread(i, v)",
      "tfread(v)"
    ]
  },
  {
    "name": "tfreadable",
    "min": 1,
    "max": 1
  },
  {
    "name": "tfwrite",
    "min": 1,
    "max": 3,
    "synopses": [
      "tfwrite(i, s, flags)",
      "tfwrite(i, s)",
      "tfwrite(s)"
    ]
  },
  {
    "name": "time",
    "min": 0,
    "max": 0,
    "synopses": [
      "time()"
    ]
  },
  {
    "name": "tolower",
    "min": 1,
    "max": 2,
    "synopses": [
      "tolower(s)",
      "tolower(s, i)"
    ]
  },
  {
    "name": "toupper",
    "min": 1,
    "max": 2,
    "synopses": [
      "toupper(s)",
      "toupper(s, i)"
    ]
  },
  {
    "name": "trunc",
    "min": 1,
    "max": 1,
    "synopses": [
      "trunc(r)"
    ]
  },
  {
    "name": "whatis",
    "min": 1,
    "max": 1
  },
  {
    "name": "winlines",
    "min": 0,
    "max": 0,
    "synopses": [
      "winlines()"
    ]
  },
  {
    "name": "world_info",
    "min": 0,
    "max": 2,
    "synopses": [
      "world_info(s1, s2)",
      "world_info(s2)",
      "world_info()"
    ]
  }
];

// packages/core/src/data/selectors.ts
var SELECTORS = [
  { label: "*", detail: "all the macro's arguments" },
  { label: "#", detail: "how many arguments there are" },
  { label: "?", detail: "the return value of the last command run (builtin or macro)" },
  { label: "0", detail: "the name of the running macro" },
  { label: "1", detail: "the first argument (2, 3... the next ones)" },
  { label: "-1", detail: "every argument after the first (-2: after the second...)" },
  { label: "L", detail: "the last argument (L2: the one before it...)" },
  { label: "-L", detail: "every argument except the last (-L2: except the last two...)" },
  { label: "P0", detail: "the text the last successful regexp match in scope matched (P1, P2...: its groups)" },
  { label: "PL", detail: "the text before the last successful regexp match in scope" },
  { label: "PR", detail: "the text after the last successful regexp match in scope" },
  { label: "R", detail: "one argument chosen at random" }
];

// packages/core/src/data/variables.generated.ts
var SPECIAL_VARIABLES = [
  {
    "name": "alert_attr",
    "type": "string",
    "default": "Br"
  },
  {
    "name": "alert_time",
    "type": "time"
  },
  {
    "name": "ansi_log",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "atcp",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on",
    "requires": "ENABLE_ATCP"
  },
  {
    "name": "background",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "backslash",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "bamf",
    "type": "enum",
    "values": [
      "off",
      "on",
      "old"
    ],
    "default": "off"
  },
  {
    "name": "beep",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "bg_output",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "binary_eol",
    "type": "enum",
    "values": [
      "LF",
      "CR",
      "CRLF"
    ]
  },
  {
    "name": "borg",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "cecho",
    "type": "enum",
    "values": [
      "off",
      "on",
      "all"
    ],
    "default": "off"
  },
  {
    "name": "cecho_attr",
    "type": "string",
    "default": "Cgreen"
  },
  {
    "name": "cleardone",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "clearfull",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "connect",
    "type": "enum",
    "values": [
      "blocking",
      "nonblocking"
    ]
  },
  {
    "name": "default_charset",
    "type": "string",
    "default": "UTF-8"
  },
  {
    "name": "defcompile",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "emulation",
    "type": "enum",
    "values": [
      "raw",
      "print",
      "ansi_strip",
      "ansi_attr",
      "debug"
    ]
  },
  {
    "name": "error_attr",
    "type": "string"
  },
  {
    "name": "expand_tabs",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "expnonvis",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "gag",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "gethostbyname",
    "type": "enum",
    "values": [
      "blocking",
      "nonblocking"
    ]
  },
  {
    "name": "gmcp",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on",
    "requires": "ENABLE_GMCP"
  },
  {
    "name": "gpri",
    "type": "integer",
    "default": "0"
  },
  {
    "name": "hilite",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "hiliteattr",
    "type": "string",
    "default": "B"
  },
  {
    "name": "histsize",
    "type": "position"
  },
  {
    "name": "hook",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "hpri",
    "type": "integer",
    "default": "0"
  },
  {
    "name": "iecho",
    "type": "enum",
    "values": [
      "off",
      "on",
      "all"
    ],
    "default": "off"
  },
  {
    "name": "iecho_attr",
    "type": "string",
    "default": "Cred"
  },
  {
    "name": "info_attr",
    "type": "string"
  },
  {
    "name": "insert",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "int_range",
    "type": "enum",
    "values": [
      "clamp",
      "error"
    ],
    "default": "clamp"
  },
  {
    "name": "interactive",
    "type": "flag",
    "values": [
      "off",
      "on"
    ]
  },
  {
    "name": "isize",
    "type": "position"
  },
  {
    "name": "istrip",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "kbnum",
    "type": "string"
  },
  {
    "name": "kecho",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "kecho_attr",
    "type": "string"
  },
  {
    "name": "keepalive",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "keypad",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "kprefix",
    "type": "string"
  },
  {
    "name": "LANG",
    "type": "string"
  },
  {
    "name": "LC_ALL",
    "type": "string"
  },
  {
    "name": "LC_CTYPE",
    "type": "string"
  },
  {
    "name": "LC_TIME",
    "type": "string"
  },
  {
    "name": "local_assign",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "log_prefix",
    "type": "string",
    "default": "%t # "
  },
  {
    "name": "log_time_format",
    "type": "string",
    "default": "%H:%M:%S"
  },
  {
    "name": "login",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "lp",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "lpquote",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "MAIL",
    "type": "string"
  },
  {
    "name": "maildelay",
    "type": "time"
  },
  {
    "name": "matching",
    "type": "enum",
    "values": [
      "simple",
      "glob",
      "regexp",
      "substr"
    ],
    "default": "glob"
  },
  {
    "name": "max_hook",
    "type": "integer",
    "default": "1000"
  },
  {
    "name": "max_instr",
    "type": "integer",
    "default": "1000000"
  },
  {
    "name": "max_kbnum",
    "type": "integer",
    "default": "999"
  },
  {
    "name": "max_recur",
    "type": "integer",
    "default": "100"
  },
  {
    "name": "max_trig",
    "type": "integer",
    "default": "1000"
  },
  {
    "name": "mccp",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on",
    "requires": "HAVE_MCCP"
  },
  {
    "name": "mecho",
    "type": "enum",
    "values": [
      "off",
      "on",
      "all"
    ],
    "default": "off"
  },
  {
    "name": "mecho_attr",
    "type": "string"
  },
  {
    "name": "meta_esc",
    "type": "enum",
    "values": [
      "off",
      "on",
      "nonprint"
    ]
  },
  {
    "name": "more",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "mprefix",
    "type": "string",
    "default": "+"
  },
  {
    "name": "msdp",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on",
    "requires": "ENABLE_MSDP"
  },
  {
    "name": "oldslash",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "optimize",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "option102",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on",
    "requires": "ENABLE_OPTION102"
  },
  {
    "name": "pedantic",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "prompt_sec",
    "type": "string"
  },
  {
    "name": "prompt_usec",
    "type": "string"
  },
  {
    "name": "prompt_wait",
    "type": "time"
  },
  {
    "name": "proxy_host",
    "type": "string"
  },
  {
    "name": "proxy_port",
    "type": "string",
    "default": "23"
  },
  {
    "name": "ptime",
    "type": "time"
  },
  {
    "name": "qecho",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "qecho_attr",
    "type": "string"
  },
  {
    "name": "qprefix",
    "type": "string"
  },
  {
    "name": "quiet",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "quitdone",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "redef",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "refreshtime",
    "type": "integer",
    "default": "100000"
  },
  {
    "name": "scroll",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "secho",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "secho_attr",
    "type": "string"
  },
  {
    "name": "send_queue",
    "type": "integer",
    "default": "0"
  },
  {
    "name": "send_queue_full",
    "type": "enum",
    "values": [
      "block",
      "error",
      "disconnect"
    ]
  },
  {
    "name": "shpause",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "sidescroll",
    "type": "position"
  },
  {
    "name": "sigfigs",
    "type": "integer",
    "default": "15"
  },
  {
    "name": "snarf",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "sockmload",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "sprefix",
    "type": "string"
  },
  {
    "name": "ssl_ca_dir",
    "type": "string"
  },
  {
    "name": "ssl_ca_file",
    "type": "string"
  },
  {
    "name": "ssl_continue",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "ssl_depth",
    "type": "integer",
    "default": "10"
  },
  {
    "name": "ssl_insecure",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "ssl_verbose",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "status_attr",
    "type": "string"
  },
  {
    "name": "status_fields",
    "type": "string"
  },
  {
    "name": "status_height",
    "type": "position"
  },
  {
    "name": "status_int_clock",
    "type": "string"
  },
  {
    "name": "status_int_more",
    "type": "string"
  },
  {
    "name": "status_int_world",
    "type": "string"
  },
  {
    "name": "status_pad",
    "type": "string",
    "default": "_"
  },
  {
    "name": "sub",
    "type": "enum",
    "values": [
      "off",
      "on",
      "full"
    ]
  },
  {
    "name": "tabsize",
    "type": "position"
  },
  {
    "name": "telopt",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "TERM",
    "type": "string"
  },
  {
    "name": "textdiv",
    "type": "enum",
    "values": [
      "off",
      "on",
      "always",
      "clear"
    ]
  },
  {
    "name": "textdiv_str",
    "type": "string",
    "default": "====="
  },
  {
    "name": "tfhost",
    "type": "string"
  },
  {
    "name": "TFLIBDIR",
    "type": "string"
  },
  {
    "name": "TFMAILPATH",
    "type": "string"
  },
  {
    "name": "TFPATH",
    "type": "string"
  },
  {
    "name": "tfpy_debug",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off",
    "requires": "TFPYTHON"
  },
  {
    "name": "time_format",
    "type": "string",
    "default": "%H:%M"
  },
  {
    "name": "TZ",
    "type": "string"
  },
  {
    "name": "virtscreen",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "visual",
    "type": "flag",
    "values": [
      "off",
      "on"
    ]
  },
  {
    "name": "warn_5keys",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "warn_curly_re",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "warn_def_B",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "warn_status",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "warning_attr",
    "type": "string"
  },
  {
    "name": "watchdog",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "watchname",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "wordpunct",
    "type": "string",
    "default": "_"
  },
  {
    "name": "wrap",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "wraplog",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "wrappunct",
    "type": "integer",
    "default": "10"
  },
  {
    "name": "wrapsize",
    "type": "integer",
    "default": "0"
  },
  {
    "name": "wrapspace",
    "type": "integer",
    "default": "4"
  }
];

// packages/core/src/expressions.ts
function textBefore(text, pos) {
  const lines = splitRawLines(text);
  if (isCommentLine(lines[pos.line] ?? "")) return void 0;
  const entry = splitLogicalEntries(text).find((e) => e.startLine <= pos.line && pos.line <= e.endLine);
  if (!entry) return (lines[pos.line] ?? "").slice(0, pos.character);
  const offset = entry.offsetMap.filter((m) => m.line < pos.line || m.line === pos.line && m.character < pos.character).length;
  return entry.text.slice(0, offset);
}
function currentStatement(before2) {
  let cut = 0;
  for (const m of before2.matchAll(/(?<!%)(?:%%)*%[;|]/g)) cut = (m.index ?? 0) + m[0].length;
  return before2.slice(cut);
}
var EXPRESSION_COMMAND_RE = /(?:^|[\s;|(])\/@?(?:test|expr|result|return)\s+/gi;
var CONDITION_RE = /(?:^|[\s;|(])\/@?(?:if|elseif|while)\s*\(/gi;
function expressionStart(stmt) {
  const opens = [];
  for (let i = 0; i < stmt.length; i += 1) {
    if (stmt[i] === "$" && stmt[i + 1] === "[" && stmt[i - 1] !== "$") {
      opens.push(i + 2);
      i += 1;
    } else if (stmt[i] === "]" && opens.length > 0) {
      opens.pop();
    }
  }
  if (opens.length > 0) return opens[opens.length - 1];
  let start = -1;
  for (const m of stmt.matchAll(CONDITION_RE)) {
    const open = (m.index ?? 0) + m[0].length;
    if (depthAfter(stmt.slice(open)) >= 0) start = open;
  }
  if (start >= 0) return start;
  for (const m of stmt.matchAll(EXPRESSION_COMMAND_RE)) start = (m.index ?? 0) + m[0].length;
  return start;
}
function depthAfter(s) {
  let depth = 0;
  let quote = "";
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(") depth += 1;
    else if (ch === ")" && --depth < 0) return -1;
  }
  return depth;
}
function insideString(expr) {
  let quote = "";
  for (let i = 0; i < expr.length; i += 1) {
    const ch = expr[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
  }
  return quote !== "";
}
function functionCallAt(expr) {
  const stack = [];
  let quote = "";
  for (let i = 0; i < expr.length; i += 1) {
    const ch = expr[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(") {
      const name = /([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(expr.slice(0, i))?.[1] ?? "";
      stack.push({ name, argument: 0 });
    } else if (ch === ")") stack.pop();
    else if (ch === "," && stack.length > 0) stack[stack.length - 1].argument += 1;
  }
  for (let k = stack.length - 1; k >= 0; k -= 1) {
    const frame = stack[k];
    if (frame.name) return frame;
  }
  return void 0;
}
function cursorContext(before2) {
  const stmt = currentStatement(before2);
  const subst = /(?<!%)(?:%%)*%(\{)?([A-Za-z0-9_#*?-]*)$/.exec(stmt);
  if (subst) return { kind: "substitution", partial: subst[2], braced: Boolean(subst[1]) };
  const command2 = /(?:^|[\s;|(])\/@?!?([A-Za-z0-9_]*)$/.exec(stmt);
  if (command2) return { kind: "command", partial: command2[1] };
  const value = /(?:^|[\s;|(])\/@?set\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*=\s*|\s+)([A-Za-z0-9_]*)$/i.exec(stmt);
  if (value) return { kind: "variable-value", variable: value[1], partial: value[2] };
  const name = /(?:^|[\s;|(])\/@?(?:set|unset|setenv|let|listvar|export)\s+([A-Za-z_][A-Za-z0-9_]*)?$/i.exec(stmt);
  if (name) return { kind: "variable-name", partial: name[1] ?? "" };
  const start = expressionStart(stmt);
  if (start >= 0) {
    const expr = stmt.slice(start);
    if (insideString(expr)) return { kind: "none" };
    const word = /([A-Za-z_][A-Za-z0-9_]*)?$/.exec(expr);
    const partial = word?.[1] ?? "";
    const inNumber = /[0-9.]$/.test(expr.slice(0, expr.length - partial.length));
    const call = functionCallAt(expr);
    return { kind: "expression", partial, inNumber, ...call ? { call } : {} };
  }
  return { kind: "none" };
}

// packages/core/src/functionSynopses.ts
function functionSynopses(f) {
  if (f.synopses) return f.synopses;
  const args = Array.from({ length: f.min }, (_, i) => `arg${i + 1}`);
  if (f.max === null) args.push("...");
  else if (f.max > f.min) args.push(`[${f.max - f.min} more]`);
  return [`${f.name}(${args.join(", ")})`];
}

// packages/server/src/completions.ts
var SOURCE_DETAIL = {
  keyword: "tf control-flow keyword",
  builtin: "tf built-in command",
  stdlib: "stdlib.tf macro (always loaded)"
};
var COMMAND_ITEMS = ALL_COMMANDS.map((c) => ({
  label: c.name.toLowerCase(),
  kind: import_node.CompletionItemKind.Function,
  detail: SOURCE_DETAIL[c.source]
}));
function variableDetail(v) {
  const parts = [`tf ${v.type} variable`];
  if (v.default !== void 0) parts.push(`default ${v.default === "" ? '""' : v.default}`);
  if (v.values && v.type !== "flag") parts.push(v.values.join(" | "));
  if (v.requires) parts.push(`needs ${v.requires}`);
  return parts.join(", ");
}
var FUNCTION_ITEMS = FUNCTIONS.map((f) => ({
  label: f.name,
  kind: import_node.CompletionItemKind.Function,
  detail: functionSynopses(f).join("  |  "),
  ...f.requires ? { documentation: `Only in a tf built with ${f.requires}.` } : {},
  insertText: f.max === 0 ? `${f.name}()` : `${f.name}($0)`,
  insertTextFormat: import_node.InsertTextFormat.Snippet,
  // Open the signature popup inside the new parentheses.
  ...f.max === 0 ? {} : { command: { title: "", command: "editor.action.triggerParameterHints" } }
}));
var SPECIAL_VARIABLE_ITEMS = SPECIAL_VARIABLES.map((v) => ({
  label: v.name,
  kind: import_node.CompletionItemKind.Variable,
  detail: variableDetail(v)
}));
var SELECTOR_ITEMS = SELECTORS.map((s, i) => ({
  label: s.label,
  kind: import_node.CompletionItemKind.Constant,
  detail: s.detail,
  // Before the variables, in the table's order.
  sortText: `0${String(i).padStart(2, "0")}`
}));
var ASSIGN_RE = /(?:^|[\s;|(])\/@?(?:set|let|setenv)\s+([A-Za-z_][A-Za-z0-9_]*)/gi;
var EXPR_ASSIGN_RE = /\b([A-Za-z_][A-Za-z0-9_]*)\s*:=/g;
function scriptVariables(texts) {
  const special = new Set(SPECIAL_VARIABLES.map((v) => v.name));
  const found = /* @__PURE__ */ new Map();
  for (const text of texts) {
    for (const line of splitRawLines(text)) {
      if (isCommentLine(line)) continue;
      for (const m of [...line.matchAll(ASSIGN_RE), ...line.matchAll(EXPR_ASSIGN_RE)]) {
        const name = m[1];
        if (!special.has(name) && !found.has(name)) found.set(name, /:=/.test(m[0]) ? "assigned in an expression" : `set with ${m[0].trim().split(/\s+/)[0]}`);
      }
    }
  }
  return found;
}
function scriptVariableItems(text, ctx) {
  return [...scriptVariables([text, ...(ctx?.files ?? []).map((f) => f.text)])].map(([name, how]) => ({
    label: name,
    kind: import_node.CompletionItemKind.Variable,
    detail: `script variable (${how})`
  }));
}
function macroItems(text, ctx, asFunction) {
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  const add = (name, detail) => {
    const key2 = name.toLowerCase();
    if (seen.has(key2) || RESERVED_MACRO_NAMES.has(key2) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return;
    seen.add(key2);
    items.push({
      label: name,
      kind: asFunction ? import_node.CompletionItemKind.Method : import_node.CompletionItemKind.Function,
      detail,
      ...asFunction ? { insertText: `${name}($0)`, insertTextFormat: import_node.InsertTextFormat.Snippet } : {}
    });
  };
  for (const s of getDocumentSymbols(text)) if (s.kind === "def") add(s.name, "macro in this file");
  for (const m of ctx?.macros ?? []) if (m.loaded) add(m.symbol.name, `macro in ${m.label}`);
  return items;
}
function getCompletions(text, pos, ctx) {
  const before2 = textBefore(text, pos);
  if (before2 === void 0) return [];
  const context = cursorContext(before2);
  switch (context.kind) {
    case "command": {
      const tf = new Set(COMMAND_ITEMS.map((i) => i.label));
      return [...COMMAND_ITEMS, ...macroItems(text, ctx, false).filter((i) => !tf.has(i.label.toLowerCase()))];
    }
    case "substitution":
      return context.braced || context.partial === "" ? [...SELECTOR_ITEMS, ...SPECIAL_VARIABLE_ITEMS, ...scriptVariableItems(text, ctx)] : [...SPECIAL_VARIABLE_ITEMS, ...scriptVariableItems(text, ctx)];
    case "variable-name":
      return [...SPECIAL_VARIABLE_ITEMS, ...scriptVariableItems(text, ctx)];
    case "variable-value": {
      const v = SPECIAL_VARIABLES.find((s) => s.name === context.variable);
      return (v?.values ?? []).map((value, i) => ({
        label: value,
        kind: import_node.CompletionItemKind.EnumMember,
        detail: `${v?.name} = ${value} (or ${i})${value === v?.default ? ", the default" : ""}`
      }));
    }
    case "expression": {
      if (context.inNumber) return [];
      const fns = new Set(FUNCTIONS.map((f) => f.name));
      return [
        ...FUNCTION_ITEMS,
        ...SPECIAL_VARIABLE_ITEMS,
        ...scriptVariableItems(text, ctx),
        ...macroItems(text, ctx, true).filter((i) => !fns.has(i.label))
      ];
    }
    default:
      return [];
  }
}

// packages/server/src/lspSymbols.ts
var import_node2 = __toESM(require_node3());
var LSP_KIND = {
  def: import_node2.SymbolKind.Function,
  alias: import_node2.SymbolKind.Function,
  bind: import_node2.SymbolKind.Key,
  hook: import_node2.SymbolKind.Event,
  trig: import_node2.SymbolKind.Event
};
function toDocumentSymbol(symbol) {
  return {
    name: symbol.name,
    detail: symbol.detail,
    kind: LSP_KIND[symbol.kind],
    range: symbol.range,
    selectionRange: symbol.selectionRange
  };
}

// packages/core/src/folding.ts
function getFoldingRanges(text) {
  const lines = splitRawLines(text);
  const ranges = [];
  const inEntry = /* @__PURE__ */ new Set();
  for (const entry of splitLogicalEntries(text)) {
    if (entry.endLine === entry.startLine) continue;
    ranges.push({ startLine: entry.startLine, endLine: entry.endLine });
    for (let line = entry.startLine; line <= entry.endLine; line += 1) inEntry.add(line);
  }
  let runStart = -1;
  const closeRun = (lastLine) => {
    if (runStart !== -1 && lastLine > runStart) {
      ranges.push({ startLine: runStart, endLine: lastLine, kind: "comment" });
    }
    runStart = -1;
  };
  lines.forEach((line, idx) => {
    if (isCommentLine(line) && !inEntry.has(idx)) {
      if (runStart === -1) runStart = idx;
    } else {
      closeRun(idx - 1);
    }
  });
  closeRun(lines.length - 1);
  return ranges.sort((a, b) => a.startLine - b.startLine);
}

// packages/server/src/lspFolding.ts
var import_node3 = __toESM(require_node3());
function toFoldingRange(range) {
  return {
    startLine: range.startLine,
    endLine: range.endLine,
    ...range.kind === "comment" ? { kind: import_node3.FoldingRangeKind.Comment } : { kind: import_node3.FoldingRangeKind.Region }
  };
}

// packages/core/src/selectionRange.ts
function getSelectionRanges(text, positions) {
  const lines = splitRawLines(text);
  const entries = splitLogicalEntries(text);
  const models = /* @__PURE__ */ new Map();
  const file = { start: { line: 0, character: 0 }, end: lineEnd(lines, lines.length - 1) };
  return positions.map((pos) => {
    const entry = entries.find((e) => e.startLine <= pos.line && pos.line <= e.endLine);
    const ranges = [];
    const part = entry ? entry.parts.findIndex((p) => p.line === pos.line) : -1;
    if (entry && part >= 0) {
      let pieces = models.get(entry);
      if (!pieces) {
        pieces = entryPieces(entry);
        models.set(entry, pieces);
      }
      const at2 = charAt(entry.text, offsetAt(entry, part, pos.character));
      for (const p of chain([...pieces, ...wordPieces(entry.text, at2)], at2)) {
        ranges.push(rangeOf2(entry, p));
      }
    } else {
      const raw = lines[pos.line] ?? "";
      const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
      const at2 = charAt(line, Math.min(pos.character, line.length));
      for (const p of chain(wordPieces(line, at2), at2)) {
        ranges.push({ start: { line: pos.line, character: p.start }, end: { line: pos.line, character: p.end } });
      }
      ranges.push({ start: { line: pos.line, character: 0 }, end: { line: pos.line, character: line.length } });
    }
    if (entry) ranges.push({ start: { line: entry.startLine, character: 0 }, end: lineEnd(lines, entry.endLine) });
    ranges.push(file);
    return link(ranges, pos);
  });
}
function entryPieces(entry) {
  const s = entry.text;
  const pieces = [];
  const add = (start, end) => {
    const a = skipBlanks(s, start);
    const b = trimEnd(s, end);
    if (b > a) pieces.push({ start: a, end: b });
  };
  const read = (mode, from) => {
    const regions = parseRegions(s.slice(from), mode);
    for (const st of regions.statements) add(st.start + from, st.end + from);
    for (const ex of regions.expressions) {
      if (ex.kind !== "statement") continue;
      add(ex.start + from, ex.end + from);
      add(keywordBefore(s, ex.start + from), ex.end + from);
    }
    for (const span of regions.spans) {
      add(span.start + from, span.end + from);
      if (span.inner) add(span.inner.start + from, span.inner.end + from);
    }
    for (const block of regions.blocks) {
      add(block.start + from, block.end + from);
      for (const p of block.parts) add(p.start + from, withoutSeparator(s, p.end + from));
    }
  };
  read("top", 0);
  const body = entry.isDefBody || entry.isOtherMacroBody ? macroBodyStart(s) : -1;
  if (body >= 0) {
    read("body", body);
    add(body, s.length);
  }
  add(0, s.length);
  return pieces;
}
function charAt(s, off) {
  const after = off < s.length && !isTfSpace(s[off]);
  const before2 = off > 0 && !isTfSpace(s[off - 1]);
  if (after) return isWordChar(s[off]) || !before2 || !isWordChar(s[off - 1]) ? off : off - 1;
  return before2 ? off - 1 : off;
}
function wordPieces(s, at2) {
  const pieces = [];
  let a = at2;
  let b = at2;
  while (a > 0 && isWordChar(s[a - 1])) a -= 1;
  while (b < s.length && isWordChar(s[b])) b += 1;
  if (b > a) {
    pieces.push({ start: a, end: b });
    let slash = a;
    while (slash > 0 && (s[slash - 1] === "@" || s[slash - 1] === "!")) slash -= 1;
    if (s[slash - 1] === "/") pieces.push({ start: slash - 1, end: b });
  }
  return pieces;
}
function chain(pieces, at2) {
  const around = pieces.filter((p) => p.start <= at2 && at2 < p.end).sort((x, y) => x.end - x.start - (y.end - y.start) || x.start - y.start);
  const out = [];
  for (const p of around) {
    const last = out[out.length - 1];
    if (!last || p.start <= last.start && p.end >= last.end && (p.start < last.start || p.end > last.end)) out.push(p);
  }
  return out;
}
function offsetAt(entry, part, character) {
  let start = 0;
  for (let k = 0; k < part; k += 1) start += entry.parts[k].text.length;
  const text = entry.parts[part].text;
  const indent = text.length > 0 ? entry.offsetMap[start].character : 0;
  return start + Math.max(0, Math.min(text.length, character - indent));
}
function rangeOf2(entry, p) {
  const first = entry.offsetMap[p.start];
  const last = entry.offsetMap[p.end - 1];
  return { start: { ...first }, end: { line: last.line, character: last.character + 1 } };
}
function link(ranges, pos) {
  const kept = [];
  for (const r of ranges) {
    const last = kept[kept.length - 1];
    if (last && sameRange(last, r) || !holds(r, pos)) continue;
    kept.push(r);
  }
  if (kept.length === 0) kept.push({ start: pos, end: pos });
  let node;
  for (let k = kept.length - 1; k >= 0; k -= 1) node = node ? { range: kept[k], parent: node } : { range: kept[k] };
  return node;
}
function before(a, b) {
  return a.line < b.line || a.line === b.line && a.character <= b.character;
}
function holds(r, pos) {
  return before(r.start, pos) && before(pos, r.end);
}
function sameRange(a, b) {
  return a.start.line === b.start.line && a.start.character === b.start.character && a.end.line === b.end.line && a.end.character === b.end.character;
}
function lineEnd(lines, line) {
  const raw = lines[line] ?? "";
  return { line, character: raw.endsWith("\r") ? raw.length - 1 : raw.length };
}
function isWordChar(ch) {
  return ch !== void 0 && (/[A-Za-z0-9_~]/.test(ch) || ch.charCodeAt(0) >= 128);
}
function skipBlanks(s, p) {
  let q = p;
  while (q < s.length && isTfSpace(s[q])) q += 1;
  return q;
}
function trimEnd(s, p) {
  let q = p;
  while (q > 0 && isTfSpace(s[q - 1])) q -= 1;
  return q;
}
function withoutSeparator(s, p) {
  const q = trimEnd(s, p);
  const sep = s[q - 1] === ";" || s[q - 1] === "|" || s[q - 1] === "\\";
  return sep && s[q - 2] === "%" && s[q - 3] !== "%" ? trimEnd(s, q - 2) : q;
}
function keywordBefore(s, p) {
  let q = p;
  while (q > 0 && isTfSpace(s[q - 1])) q -= 1;
  while (q > 0 && !isTfSpace(s[q - 1]) && s[q - 1] !== "/") q -= 1;
  return s[q - 1] === "/" ? q - 1 : p;
}

// packages/core/src/data/commandDescriptions.ts
var COMMAND_DESCRIPTIONS = {
  // control-flow keywords (tinyfugue/src/expand.c)
  // Like every keyword, each of these is only read as one at the start of a statement.
  "break": "Leaves the innermost `/while` loop, or the *n* innermost with `/break n`. Outside a loop it ends the macro. Inside a `$(...)` it can only end loops inside that `$(...)`.",
  "do": "Ends a `/while` condition list and starts the loop's commands: `/while /test i < 3%; /do ...%; /done`. Only after a condition list: after a `(condition)` tf rejects it.",
  "done": "Ends a `/while` loop. It only counts at the start of a statement, so it needs a `%;` before it, and anything after it needs another `%;`.",
  "else": "Starts the commands an `/if` runs when none of its conditions was true: `/if (x) ...%; /else ...%; /endif`. It only counts at the start of a statement, after a `%;`.",
  "elseif": "Another condition in an `/if`, tried when the ones before it were false: `/elseif (y) ...`. It only counts at the start of a statement, after a `%;`.",
  "endif": "Ends an `/if`. It only counts at the start of a statement, so it needs a `%;` before it, and anything after it needs another `%;`.",
  "exit": "Stops loading the current file, or the *n* innermost nested `/load`s with `/exit n`, and abandons the rest of the command it is in. Outside a `/load` it does nothing. (A reserved word, but tf runs it as an ordinary built-in command.)",
  "if": "Runs commands when a condition is true: `/if (x) ...%; /elseif (y) ...%; /else ...%; /endif`. Like any block, the whole `/if` has to be one command, and in a file a command ends at the end of its line unless the line ends in `\\`.",
  "let": "Sets a variable local to the running macro: `/let name=value`. The value runs to the next `%;`.",
  "result": "Ends the macro with the value of an expression, like `/return`, and also prints the value when the macro was run as a command rather than called from an expression. Not allowed inside `$(...)`.",
  "return": "Ends the macro with the value of an expression: `/return x + 1`. Not allowed inside `$(...)`.",
  "set": "Sets a global variable: `/set name=value`. The value runs to the next `%;`.",
  "setenv": "Sets a global variable and exports it to the environment, so programs tf starts see it too: `/setenv name=value`. The value runs to the next `%;`.",
  "test": "Evaluates an expression and makes its value the result, without ending the macro: `/test i += 1`. The expression runs to the next `%;`.",
  "then": "Ends an `/if` or `/elseif` condition list and starts its commands: `/if /test x%; /then ...`. Only after a condition list: after a `(condition)` tf rejects it.",
  "while": "Repeats commands while a condition is true: `/while (i < 3) ...%; /done`, or with a condition list, `/while /test x%; /do ...%; /done`. Like any block, the whole `/while` has to be one command, and in a file a command ends at the end of its line unless the line ends in `\\`.",
  // built-in commands (tinyfugue/src/cmdlist.h)
  "beep": "",
  "bind": "",
  "calllua": "",
  "connect": "",
  "core": "",
  "dc": "",
  "def": "",
  "dokey": "",
  "edit": "",
  "eval": "",
  "export": "",
  "features": "",
  "fg": "",
  "gag": "",
  "help": "",
  "hilite": "",
  "histsize": "",
  "hook": "",
  "input": "",
  "kill": "",
  "lcd": "",
  "limit": "",
  "list": "",
  "listsockets": "",
  "liststreams": "",
  "listvar": "",
  "listworlds": "",
  "load": "",
  "loadlua": "",
  "localecho": "",
  "log": "",
  "ps": "",
  "purge": "",
  "purgelua": "",
  "python": "",
  "python_call": "",
  "python_call_unsafe": "",
  "python_kill": "",
  "python_load": "",
  "quit": "",
  "quote": "",
  "recall": "",
  "recordline": "",
  "relimit": "",
  "repeat": "",
  "restrict": "",
  "save": "",
  "saveworld": "",
  "sh": "",
  "shift": "",
  "status_add": "",
  "status_clear": "",
  "status_edit": "",
  "status_rm": "",
  "suspend": "",
  "trigger": "",
  "trigpc": "",
  "unbind": "",
  "undef": "",
  "undefn": "",
  "unlimit": "",
  "unset": "",
  "unworld": "",
  "version": "",
  "watchdog": "",
  "watchname": "",
  // stdlib.tf macros (always loaded)
  ":": "",
  "_echo": "",
  "_paste": "",
  "act": "",
  "adddiku": "",
  "addlp": "",
  "addlpp": "",
  "addtelnet": "",
  "addtiny": "",
  "addworld": "",
  "background": "",
  "bamf": "",
  "bg": "",
  "borg": "",
  "cat": "",
  "cd": "",
  "cleardone": "",
  "clearfull": "",
  "echo": "",
  "escape": "",
  "expr": "",
  "false": "",
  "first": "",
  "for": "",
  "gpri": "",
  "grab": "",
  "hilite_page": "",
  "hilite_whisper": "",
  "hpri": "",
  "insert": "",
  "isize": "",
  "ismacro": "",
  "isvar": "",
  "kecho": "",
  "last": "",
  "listbind": "",
  "listdef": "",
  "listfullhilite": "",
  "listgag": "",
  "listhilite": "",
  "listhook": "",
  "listpartial": "",
  "listtrig": "",
  "loaded": "",
  "loadhist": "",
  "login": "",
  "lp": "",
  "lpquote": "",
  "man": "",
  "mecho": "",
  "more": "",
  "nogag": "",
  "nohilite": "",
  "nohilite_page": "",
  "nohilite_whisper": "",
  "nolog": "",
  "nologin": "",
  "noquiet": "",
  "not": "",
  "nowrap": "",
  "nth": "",
  "partial": "",
  "paste": "",
  "prompt": "",
  "proxy_command": "",
  "proxy_connect": "",
  "proxy_hook": "",
  "ptime": "",
  "purgebind": "",
  "purgedef": "",
  "purgedeft": "",
  "purgegag": "",
  "purgehilite": "",
  "purgehook": "",
  "purgetrig": "",
  "purgeworld": "",
  "pwd": "",
  "qecho": "",
  "quiet": "",
  "quitdone": "",
  "rand": "",
  "redef": "",
  "replace": "",
  "reply": "",
  "require": "",
  "rest": "",
  "retry": "",
  "retry_off": "",
  "runtime": "",
  "savehilite": "",
  "send": "",
  "send_help": "",
  "shpause": "",
  "signal": "",
  "sockmload": "",
  "split": "",
  "sub": "",
  "substitute": "",
  "sys": "",
  "telnet": "",
  "time": "",
  "toggle": "",
  "trig": "",
  "trigc": "",
  "trigp": "",
  "true": "",
  "undeft": "",
  "unhook": "",
  "untrig": "",
  "ver": "",
  "vercmp": "",
  "visual": "",
  "world": "",
  "wrap": "",
  "wrapspace": "",
  "~con_hook_telnet": "",
  "~def_file_command": "",
  "~default_login_hook": "",
  "~detect_worldtype_hook": "",
  "~do_prefix": "",
  "~gagloadfail": "",
  "~login_hook_lp": "",
  "~login_hook_lpp": "",
  "~login_hook_telnet": "",
  "~login_hook_tiny": "",
  "~send": "",
  "~telnet_passwd": "",
  "~world_hook_lp": "",
  "~world_hook_lpp": "",
  "~world_hook_prompt": "",
  "~world_hook_telnet": "",
  "~world_hook_tiny": ""
};

// packages/core/src/data/commandUsages.generated.ts
var COMMAND_USAGES = {
  "_echo": [
    "/_echo text"
  ],
  "addworld": [
    "/addworld [-pxe] [-Ttype] [-ssrchost] name [char pass] host port [file]",
    "/addworld [-Ttype] [-ssrchost] name",
    "/addworld [-Ttype] DEFAULT [char pass [file]]"
  ],
  "alias": [
    "/alias [name [command]]"
  ],
  "at": [
    "/at [-v] [date] time commands"
  ],
  "bamf": [
    "/bamf [OFF|ON|OLD]"
  ],
  "beep": [
    "/beep [number|ON|OFF]"
  ],
  "bg": [
    "/bg"
  ],
  "bind": [
    "/bind sequence = command"
  ],
  "break": [
    "/break [n]"
  ],
  "cat": [
    "/cat [%]"
  ],
  "cd": [
    "/cd [dir]"
  ],
  "changes": [
    "/changes [version]"
  ],
  "complete": [
    "/complete [type]"
  ],
  "connect": [
    "/connect [-lqxbf] [world]",
    "/connect host port"
  ],
  "dc": [
    "/dc [world|-ALL]"
  ],
  "def": [
    "/def [options] [name] [= body]"
  ],
  "dokey": [
    "/dokey name"
  ],
  "dopath": [
    "/dopath path"
  ],
  "echo": [
    "/echo [-peA] [-aattrs] [-w[world]] text"
  ],
  "edit": [
    "/edit [options] [name] [= body]"
  ],
  "endpaste": [
    "/endpaste"
  ],
  "escape": [
    "/escape metacharacters string"
  ],
  "eval": [
    "/eval [-slevel] text"
  ],
  "exit": [
    "/exit [n]"
  ],
  "export": [
    "/export variable"
  ],
  "expr": [
    "/expr expression"
  ],
  "false": [
    "/false"
  ],
  "features": [
    "/features [name]"
  ],
  "fg": [
    "/fg [-nsq<>l] [-cN] [world]"
  ],
  "finger": [
    "/finger [user][@host]"
  ],
  "first": [
    "/first text"
  ],
  "for": [
    "/for variable start end commands"
  ],
  "gag": [
    "/gag [pattern [=response]]"
  ],
  "getfile_lp": [
    "/getfile_lp file [remote-file]"
  ],
  "getfile_muck": [
    "/getfile_muck file [remote-file]"
  ],
  "getfile_unix": [
    "/getfile_unix file [remote-file]"
  ],
  "grab": [
    "/grab text"
  ],
  "help": [
    "/help [topic]"
  ],
  "hilite": [
    "/hilite [pattern [= response]]"
  ],
  "histsize": [
    "/histsize [-lig] [-w[world]] [size]"
  ],
  "hook": [
    "/hook event[ pattern] [= body]",
    "/hook [OFF|ON]"
  ],
  "if": [
    "/if (expr) list [ /ELSEIF (expr) list ]... [ /ELSE list ] /ENDIF",
    "/if list /THEN list [ /ELSEIF list /THEN list ]... [ /ELSE list ] /ENDIF"
  ],
  "input": [
    "/input text"
  ],
  "ismacro": [
    "/ismacro macro-options"
  ],
  "isvar": [
    "/isvar name"
  ],
  "kill": [
    "/kill pid..."
  ],
  "last": [
    "/last text"
  ],
  "lcd": [
    "/lcd [dir]"
  ],
  "let": [
    "/let name=value",
    "/let name value"
  ],
  "limit": [
    "/limit [-v] [-a] [-mstyle] n] [-Bn] [-Cn] --> [pattern]"
  ],
  "list": [
    "/list [-s] [macro-options] [name] [= body]"
  ],
  "listsockets": [
    "/listsockets [-sn] [-mstyle] [-Sfield] [-Ttype] [name]"
  ],
  "liststreams": [
    "/liststreams"
  ],
  "listvar": [
    "/listvar [-mmatching] [-gxsv] [name [value]]"
  ],
  "listworlds": [
    "/listworlds [-cus] [-mstyle] [-Sfield] [-Ttype] [name]"
  ],
  "load": [
    "/load [-q] file"
  ],
  "loaded": [
    "/loaded token"
  ],
  "localecho": [
    "/localecho [ON|OFF]"
  ],
  "log": [
    "/log [-ligw[world]] [OFF|ON|file]"
  ],
  "map": [
    "/map"
  ],
  "mark": [
    "/mark dir"
  ],
  "more": [
    "/more [OFF|ON]"
  ],
  "nogag": [
    "/nogag [pattern]"
  ],
  "nohilite": [
    "/nohilite [pattern]"
  ],
  "not": [
    "/not [-slevel] text"
  ],
  "nth": [
    "/nth n text"
  ],
  "partial": [
    "/partial regexp"
  ],
  "paste": [
    "/paste [-pnx] [prefix]"
  ],
  "path": [
    "/path"
  ],
  "prompt": [
    "/prompt [-aattrs] [-p] text"
  ],
  "ps": [
    "/ps [-srq] [-wworld] [pid]"
  ],
  "purge": [
    "/purge [macro-options] [name] [= body]"
  ],
  "purgeworld": [
    "/purgeworld [-mstyle] [-Ttype] [name]"
  ],
  "putfile_lp": [
    "/putfile_lp file [remote-file]"
  ],
  "putfile_muck": [
    "/putfile_muck file [remote-file]"
  ],
  "putfile_unix": [
    "/putfile_unix file [remote-file]"
  ],
  "pwd": [
    "/pwd"
  ],
  "python": [
    "/python [command]",
    "/python import glob",
    '/python tf.out( "Logfiles: " + ", ".join(glob.glob("*.log")) )'
  ],
  "python_load": [
    "/python_load urlwatch",
    "/python_load mymodule"
  ],
  "quit": [
    "/quit [-y]"
  ],
  "quote": [
    `/quote [options] [pre] '"file"[suf]`,
    '/quote [options] [pre] #"recall_args"[suf]',
    '/quote [options] [pre] !"shell_cmd"[suf]',
    '/quote [options] [pre] `"TF_cmd"[suf]'
  ],
  "recall": [
    "/recall [-wworld] [-ligv] [-t[format]] [-aattrs] [-mstyle] [-An] [-Bn] [-Cn] [#]range [pattern]"
  ],
  "recordline": [
    "/recordline [-lig] [-w[world]] [-ttime] text"
  ],
  "relimit": [
    "/relimit"
  ],
  "repeat": [
    "/repeat [-w[world]] [-n] {[-time]|-S|-P} count command"
  ],
  "replace": [
    "/replace old new string"
  ],
  "require": [
    "/require [-q] file"
  ],
  "restrict": [
    "/restrict [SHELL|FILE|WORLD]"
  ],
  "result": [
    "/result [expression]"
  ],
  "return": [
    "/return [expression]"
  ],
  "runtime": [
    "/runtime command"
  ],
  "rwho": [
    "/rwho",
    "/rwho name=player",
    "/rwho mud=mud"
  ],
  "save": [
    "/save [-a] file [list-options]"
  ],
  "savepath": [
    "/savepath name"
  ],
  "saveworld": [
    "/saveworld [-a] [file]"
  ],
  "send": [
    "/send [-W] [-Ttype] [-w[world]] [-n] [-b | -q] [-Fpolicy] text"
  ],
  "set": [
    "/set name=value",
    "/set [name [value]]"
  ],
  "setenv": [
    "/setenv [name [value]]",
    "/setenv name=value"
  ],
  "sh": [
    "/sh [-q] [command]"
  ],
  "shift": [
    "/shift [n]"
  ],
  "signal": [
    "/signal [sig]"
  ],
  "spell_line": [
    "/spell_line"
  ],
  "split": [
    "/split args"
  ],
  "sub": [
    "/sub [OFF|ON|FULL]"
  ],
  "substitute": [
    "/substitute [-aattrs] [-p] text"
  ],
  "suspend": [
    "/suspend"
  ],
  "sys": [
    "/sys shell-command"
  ],
  "telnet": [
    "/telnet host [port]"
  ],
  "test": [
    "/test expression"
  ],
  "tick": [
    "/tick"
  ],
  "tickoff": [
    "/tickoff"
  ],
  "tickon": [
    "/tickon"
  ],
  "tickset": [
    "/tickset"
  ],
  "ticksize": [
    "/ticksize n"
  ],
  "time": [
    "/time [format]"
  ],
  "toggle": [
    "/toggle variable"
  ],
  "tr": [
    "/tr domain range string"
  ],
  "trig": [
    "/trig pattern = body"
  ],
  "trigc": [
    "/trigc chance pattern = body"
  ],
  "trigger": [
    "/trigger [-ln] [-g] [-w[world]] [-h[event]] text"
  ],
  "trigp": [
    "/trigp priority pattern = body"
  ],
  "trigpc": [
    "/trigpc priority chance pattern = body"
  ],
  "true": [
    "/true"
  ],
  "unalias": [
    "/unalias name"
  ],
  "unbind": [
    "/unbind sequence"
  ],
  "undef": [
    "/undef name..."
  ],
  "undefn": [
    "/undefn number ..."
  ],
  "undeft": [
    "/undeft trigger"
  ],
  "unhook": [
    "/unhook event [pattern]"
  ],
  "unlimit": [
    "/unlimit"
  ],
  "unmark": [
    "/unmark"
  ],
  "unpath": [
    "/unpath"
  ],
  "unset": [
    "/unset name"
  ],
  "untrig": [
    "/untrig [-aattrs] trigger"
  ],
  "unworld": [
    "/unworld name..."
  ],
  "ver": [
    "/ver"
  ],
  "version": [
    "/version"
  ],
  "watchdog": [
    "/watchdog [OFF|ON]",
    "/watchdog n1 [n2]"
  ],
  "watchname": [
    "/watchname [OFF|ON]",
    "/watchname n1 [n2]"
  ],
  "while": [
    "/while (expr) list /DONE",
    "/while list /DO list /DONE"
  ],
  "world": [
    "/world [-lqnxfb] [world]",
    "/world host port"
  ]
};

// packages/core/src/expressionHover.ts
function functionHelpEntry(name, help) {
  const entry = help?.get(`${name.toLowerCase()}()`);
  return entry && !entry.usage[0]?.startsWith("/") ? entry : void 0;
}
function escapeMarkdown(text) {
  return text.replace(/[\\`*_{}[\]<>#|]/g, "\\$&");
}
function code2(lines) {
  return "```tf\n" + lines.join("\n") + "\n```";
}
function variableHover(v, help) {
  const entry = help?.get(`%${v.name.toLowerCase()}`);
  const parts = [code2(entry?.usage.length ? entry.usage : [`${v.name}${v.default !== void 0 ? `=${v.default}` : ""}`])];
  if (entry?.summary) parts.push(escapeMarkdown(entry.summary));
  const facts = [`tf ${v.type} variable`];
  if (v.values) facts.push(`values: ${v.values.map((x) => `\`${x}\``).join(", ")}`);
  if (v.requires) facts.push(`only with ${v.requires}`);
  parts.push(`*${facts.join(" — ")}*`);
  return parts.join("\n\n");
}
var WORD_RE = /[A-Za-z0-9_#*?-]/;
function getExpressionHover(text, pos, help) {
  const line = splitRawLines(text)[pos.line] ?? "";
  if (isCommentLine(line)) return void 0;
  let start = pos.character;
  let end = pos.character;
  while (start > 0 && WORD_RE.test(line[start - 1])) start -= 1;
  while (end < line.length && WORD_RE.test(line[end])) end += 1;
  const word = line.slice(start, end);
  if (!word) return void 0;
  const range = { start: { line: pos.line, character: start }, end: { line: pos.line, character: end } };
  const percent = /(?<!%)(?:%%)*%\{?$/.test(line.slice(0, start));
  if (percent) {
    const selector = SELECTORS.find((s) => s.label === word) ?? (/^P\d+$/.test(word) ? SELECTORS.find((s) => s.label === "P0") : void 0) ?? (/^-?L\d+$/.test(word) ? SELECTORS.find((s) => s.label === (word.startsWith("-") ? "-L" : "L")) : void 0) ?? (/^-?\d+$/.test(word) ? SELECTORS.find((s) => s.label === (word.startsWith("-") ? "-1" : "1")) : void 0);
    if (selector) return { markdown: `${code2([`%{${word}}`])}

${selector.detail}`, range };
    const v2 = SPECIAL_VARIABLES.find((s) => s.name === word);
    return v2 ? { markdown: variableHover(v2, help), range } : void 0;
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(word)) return void 0;
  const before2 = textBefore(text, { line: pos.line, character: start });
  const kind = before2 === void 0 ? "none" : cursorContext(before2).kind;
  if (kind === "variable-name") {
    const v2 = SPECIAL_VARIABLES.find((s) => s.name === word);
    return v2 ? { markdown: variableHover(v2, help), range } : void 0;
  }
  if (kind !== "expression") return void 0;
  if (/^\s*\(/.test(line.slice(end))) {
    const f = FUNCTIONS.find((fn) => fn.name === word.toLowerCase());
    if (!f) return void 0;
    const entry = functionHelpEntry(f.name, help);
    const parts = [code2(entry?.usage.length ? entry.usage : functionSynopses(f))];
    if (entry?.summary) parts.push(escapeMarkdown(entry.summary));
    const counts2 = f.max === null ? `${f.min} or more arguments` : f.min === f.max ? `${f.min} argument${f.min === 1 ? "" : "s"}` : `${f.min} to ${f.max} arguments`;
    parts.push(`*tf function, ${counts2}${f.requires ? `, only with ${f.requires}` : ""}*`);
    return { markdown: parts.join("\n\n"), range };
  }
  const v = SPECIAL_VARIABLES.find((s) => s.name === word);
  return v ? { markdown: variableHover(v, help), range } : void 0;
}

// packages/core/src/variableNavigation.ts
var import_node_path = require("node:path");

// packages/core/src/variables.ts
var SPECIAL_VARIABLE_NAMES = new Set(SPECIAL_VARIABLES.map((v) => v.name));
var COMMAND_NAMES = new Set(ALL_COMMANDS.map((c) => c.name.toLowerCase()));
var FUNCTION_NAMES = new Set(FUNCTIONS.map((f) => f.name));
var isDigit2 = (c) => c !== void 0 && c >= "0" && c <= "9";
function isNameFirst(c) {
  return c !== void 0 && (/[A-Za-z_]/.test(c) || c.charCodeAt(0) >= 128);
}
function isNameChar2(c) {
  return isNameFirst(c) || isDigit2(c);
}
function isVariableName(name) {
  return name.length > 0 && isNameFirst(name[0]) && [...name].every(isNameChar2);
}
function readSelector(s, i) {
  const bracket = s[i] === "{";
  if (bracket) i += 1;
  if ((s[i] === "#" || s[i] === "?") && (!bracket || s[i + 1] === "}")) {
    return { nameStart: i, nameEnd: i + 1 };
  }
  let n = -1;
  let except = false;
  let ell = false;
  let pee = false;
  let star = false;
  let start;
  const digits = () => {
    n = 0;
    while (isDigit2(s[i])) i += 1;
  };
  if (isDigit2(s[i])) {
    start = i;
    digits();
  } else {
    if (s[i] === "-") {
      except = true;
      i += 1;
    }
    start = i;
    if (s[i] === "L") ell = true;
    else if (s[i] === "P") pee = true;
    else if (s[i] === "*") star = true;
    if (ell || pee || star) i += 1;
    if (!star && isDigit2(s[i])) digits();
  }
  let selector = "";
  if ((n < 0 && !star || bracket && (ell || pee)) && isNameChar2(s[i])) {
    ell = pee = false;
    n = -1;
    do
      i += 1;
    while (isNameChar2(s[i]));
    selector = s.slice(start, i);
  }
  if (star || pee || ell || n >= 0 || selector === "R" || selector === "PL" || selector === "PR") {
    return { nameStart: start, nameEnd: i };
  }
  if (except || selector === "") return void 0;
  return { name: selector, nameStart: start, nameEnd: i };
}
function isStatEnd(s, i) {
  const next = s[i + 1];
  return s[i] === "%" && (next === ";" || next === "|" || next === "\\");
}
function skipString(s, i, end) {
  const quote = s[i];
  for (let k = i + 1; k < end; k += 1) {
    if (s[k] === "\\") k += 1;
    else if (s[k] === quote) return k + 1;
  }
  return end;
}
function matching(s, i, end, open, close) {
  let depth = 0;
  for (let k = i; k < end; k += 1) {
    const c = s[k];
    if (c === '"' || c === "'" || c === "`") k = skipString(s, k, end) - 1;
    else if (c === open) depth += 1;
    else if (c === close && --depth === 0) return k + 1;
  }
  return end;
}
function closeOf(s, i, to) {
  const stack = [s[i] === "(" ? ")" : "}"];
  let k = i + 1;
  while (k < to) {
    const c = s[k];
    if (c === "\\") {
      k += 2;
    } else if ((c === "%" || c === "$") && s[k + 1] === "{") {
      stack.push("}");
      k += 2;
    } else if (c === "$" && s[k + 1] === "(") {
      stack.push(")");
      k += 2;
    } else if (c === "$" && s[k + 1] === "[") {
      k = matching(s, k + 1, to, "[", "]");
    } else if (c === stack[stack.length - 1]) {
      stack.pop();
      k += 1;
      if (stack.length === 0) return k;
    } else {
      k += 1;
    }
  }
  return -1;
}
function substitutionEnd2(s, i, to) {
  if (s[i] === "{") {
    const end = closeOf(s, i, to);
    return end < 0 ? i + 1 : end;
  }
  let k = Math.max(readSelector(s, i)?.nameEnd ?? i, i);
  if (s[k] === "-") while (k < to && !isTfSpace(s[k]) && !isStatEnd(s, k)) k += 1;
  return k;
}
var at = (w, start, end) => ({ start: w.src.map[start], end: w.src.map[end - 1] + 1 });
function push(w, name, access, form, start, end, from) {
  const chain2 = w.chainAt?.(start) ?? w.chain;
  w.found.push({ name, access, form, ...at(w, start, end), ...from === void 0 ? {} : { from: w.src.map[from] }, chain: chain2 });
}
function newScope(w, kind) {
  w.scopes.next += 1;
  return `${w.scopes.prefix}:${kind}${w.scopes.next}`;
}
function inner(w, src, chain2) {
  return { src, found: w.found, depth: w.depth + 1, chain: chain2, scopes: w.scopes };
}
function percents(w, from, to, skip) {
  const s = w.src.text;
  for (let i = from; i < to; i += 1) {
    if (skip[i]) continue;
    if (s[i] === "\\") {
      i += 1;
      continue;
    }
    if (s[i] !== "%") continue;
    let j = i;
    while (s[j] === "%") j += 1;
    const c = s[j];
    if (j - i > 1 || !(c === "{" || c === "#" || c === "?" || c === "*" || c === "-" || isNameChar2(c))) {
      i = j - 1;
      continue;
    }
    const sel = readSelector(s, j);
    const built = c === "{" && sel !== void 0 && s[sel.nameEnd] !== "}" && s[sel.nameEnd] !== "-";
    if (sel?.name !== void 0 && !built) {
      push(w, sel.name, "read", c === "{" ? "percent-braced" : "percent", sel.nameStart, sel.nameEnd);
    }
    i = (sel?.nameEnd ?? j) - 1;
  }
}
function getopts(w, i, to) {
  const s = w.src.text;
  while (isTfSpace(s[i])) i += 1;
  const quote = s[i];
  if (quote !== '"' && quote !== "'" && quote !== "`") return;
  const close = matching(s, i - 1, to, "(", ")");
  for (let k = i + 1; k < to && s[k] !== quote; k += 1) {
    const c = s[k];
    if (c === "\\") return;
    if (/[A-Za-z]/.test(c)) push(w, `opt_${c}`, "getopts", "option-letter", k, k + 1, close);
  }
}
function functionCall(w, name, start, end) {
  if (FUNCTION_NAMES.has(name)) return;
  w.scopes.functionCalls.push({
    name: name.toLowerCase(),
    written: name,
    chain: w.chainAt?.(start) ?? w.chain,
    at: w.src.map[start],
    nameStart: w.src.map[start],
    nameEnd: w.src.map[end - 1] + 1,
    dynamic: false
  });
}
function expression(w, from, to) {
  const s = w.src.text;
  let i = from;
  while (i < to) {
    const c = s[i];
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(s, i, to);
    } else if (c === "%") {
      let j = i;
      while (s[j] === "%") j += 1;
      if (j === i + 1) {
        const sel = readSelector(s, j);
        const built = s[j] === "{" && sel !== void 0 && s[sel.nameEnd] !== "}" && s[sel.nameEnd] !== "-";
        if (sel?.name !== void 0 && !built) {
          push(w, sel.name, "read", s[j] === "{" ? "percent-braced" : "percent", sel.nameStart, sel.nameEnd);
        }
      }
      i = Math.max(substitutionEnd2(s, j, to), j);
    } else if (c === "{") {
      const sel = readSelector(s, i);
      const built = sel !== void 0 && s[sel.nameEnd] !== "}" && s[sel.nameEnd] !== "-";
      let k = sel === void 0 ? i : sel.nameEnd + 1;
      while (isTfSpace(s[k])) k += 1;
      if (sel?.name !== void 0 && s[sel.nameEnd] === "}" && s[k] === "(") {
        functionCall(w, sel.name, sel.nameStart, sel.nameEnd);
      } else if (sel?.name !== void 0 && !built) push(w, sel.name, "read", "expr-braced", sel.nameStart, sel.nameEnd);
      i = Math.max(substitutionEnd2(s, i, to), i + 1);
    } else if (c === "/" && isNameFirst(s[i + 1]) && (i === from || isTfSpace(s[i - 1]))) {
      let k = i + 1;
      while (isNameChar2(s[k])) k += 1;
      i = COMMAND_NAMES.has(s.slice(i + 1, k).toLowerCase()) ? k : i + 1;
    } else if (c === "$") {
      if (s[i + 1] === "(" || s[i + 1] === "{") {
        const end = closeOf(s, i + 1, to);
        i = end < 0 ? i + 2 : end;
      } else if (s[i + 1] === "[") i += 2;
      else {
        i += 1;
        while (isNameChar2(s[i])) i += 1;
      }
    } else if (isDigit2(c) || c === "." && isDigit2(s[i + 1])) {
      while (i < to && (isNameChar2(s[i]) || s[i] === ".")) i += 1;
    } else if (isNameFirst(c)) {
      const start = i;
      while (isNameChar2(s[i])) i += 1;
      const before2 = s[start - 1];
      const after = s[i];
      if (before2 === "}" || before2 === "]" || before2 === PLACEHOLDER || after === PLACEHOLDER) continue;
      if (after === "%" && !isStatEnd(s, i) || after === "$" || after === "{") {
        continue;
      }
      let k = i;
      while (isTfSpace(s[k])) k += 1;
      if (s[k] === "(") {
        const fn = s.slice(start, i);
        if (fn === "getopts") getopts(w, k + 1, to);
        else functionCall(w, fn, start, i);
        continue;
      }
      let b = start - 1;
      while (isTfSpace(s[b])) b -= 1;
      const prefix = s[b] === "+" && s[b - 1] === "+" || s[b] === "-" && s[b - 1] === "-";
      const assigns = ":+-*/".includes(s[k] ?? "x") && s[k + 1] === "=" || prefix;
      push(w, s.slice(start, i), assigns ? "assign" : "read", "expr-bare", start, i);
    } else {
      i += 1;
    }
  }
}
var COMMAND_RE2 = /^\/@?([A-Za-z_]+)/;
var MACRO_DEFINER2 = /^(?:def|edit|bind|hook|gag|hilite|trig|trigc|trigp|trigpc|alias)$/;
function command(w, word, st, argStart) {
  const s = w.src.text;
  let i = argStart;
  while (i < st.end && isTfSpace(s[i])) i += 1;
  const start = i;
  if (word === "unset" || word === "export") {
    let end = st.end;
    while (end > start && isTfSpace(s[end - 1])) end -= 1;
    const name = s.slice(start, end);
    if (isVariableName(name)) push(w, name, word, "command", start, end);
    return;
  }
  if (!isNameFirst(s[i])) return;
  while (i < st.end && isNameChar2(s[i])) i += 1;
  if (i < st.end && s[i] !== "=" && !isTfSpace(s[i])) return;
  const hasValue = s[i] === "=" || s.slice(i, st.end).trim() !== "";
  const access = !hasValue ? "read" : word;
  push(w, s.slice(start, i), access, "command", start, i, access === "let" ? st.end : void 0);
}
var PLACEHOLDER = "";
function handOff(src, from, to, level) {
  if (level === "keyword") return slice(src, from, to);
  if (level === "newline") return shortened(src, from, to);
  const s = src.text;
  let text = "";
  const map = [];
  const add = (ch, at2) => {
    text += ch;
    map.push(src.map[at2]);
  };
  let i = from;
  while (i < to) {
    const c = s[i];
    if (c === "\\" && i + 1 < to) {
      add(s[i + 1], i + 1);
      i += 2;
    } else if (c === "%" || c === "$") {
      let j = i;
      while (j < to && s[j] === c) j += 1;
      if (j - i > 1) {
        for (let k = i + 1; k < j; k += 1) add(c, k === i + 1 ? i : k);
        i = j;
        continue;
      }
      const n = s[j];
      let end = j;
      if (n === "{" || c === "$" && n === "(") {
        const close = closeOf(s, j, to);
        if (close < 0) {
          add(PLACEHOLDER, i);
          i = j;
          continue;
        }
        end = close;
      } else if (c === "%") {
        if (n === "#" || n === "?" || n === "*" || n === "-" || isNameChar2(n)) end = substitutionEnd2(s, j, to);
      } else if (n === "[") end = matching(s, j, to, "[", "]");
      else {
        while (end < to && isNameChar2(s[end])) end += 1;
        if (s[end] === "$") end += 1;
      }
      if (end === j && c === "%") {
        add(c, i);
        i += 1;
      } else {
        add(PLACEHOLDER, i);
        i = Math.max(end, j);
      }
    } else {
      add(c, i);
      i += 1;
    }
  }
  map.push(src.map[to]);
  return { text, map };
}
function handedOn(w, st, argStart) {
  return handOff(w.src, argStart, st.end, st.level);
}
function evalText(w, st, argStart) {
  const src = handedOn(w, st, argStart);
  const e = evalArguments(src.text, 0, src.text.length);
  if (!e) return;
  walk(inner(w, slice(src, e.text, src.text.length), [newScope(w, "eval"), ...callerChain(w, st)]), e.mode);
}
function callerChain(w, st) {
  return w.chainAt?.(st.start) ?? w.chain;
}
function nextWord2(s, i, end) {
  while (i < end && isTfSpace(s[i])) i += 1;
  if (i >= end) return void 0;
  const start = i;
  while (i < end && !isTfSpace(s[i])) i += 1;
  return { start, end: i };
}
function forCommand(w, st, argStart) {
  const src = handedOn(w, st, argStart);
  const s = src.text;
  const v = nextWord2(s, 0, s.length);
  const first = v && nextWord2(s, v.end, s.length);
  const last = first && nextWord2(s, first.end, s.length);
  const command2 = last && nextWord2(s, last.end, s.length);
  if (!v || !first || !last || !command2 || !isVariableName(s.slice(v.start, v.end))) return;
  const chain2 = [newScope(w, "for"), ...callerChain(w, st)];
  walk(inner(w, slice(src, first.start, first.end), chain2.slice(1)), "body");
  const where2 = { start: src.map[v.start], end: src.map[v.end - 1] + 1 };
  w.found.push({ name: s.slice(v.start, v.end), access: "let", form: "loop-variable", ...where2, from: -Infinity, chain: chain2 });
  const end = inner(w, slice(src, last.start, last.end), chain2);
  expression(end, 0, end.src.text.length);
  walk(inner(w, slice(src, command2.start, s.length), chain2), "body");
}
function repeatCommand(w, st, argStart) {
  const src = handedOn(w, st, argStart);
  const r = repeatArguments(src.text, 0, src.text.length);
  if (!r) return;
  const chain2 = [newScope(w, "repeat"), ...r.now ? callerChain(w, st) : []];
  walk(inner(w, slice(src, r.command, src.text.length), chain2), "body");
}
function defExpression(w, from, to) {
  const s = w.src.text;
  for (let i = from; i < to - 1; i += 1) {
    if (!(s[i] === "-" && s[i + 1] === "E" && (i === from || isTfSpace(s[i - 1])))) continue;
    let k = i + 2;
    const quote = s[k];
    if (quote === '"' || quote === "'" || quote === "`") {
      const end = skipString(s, k, to);
      expression(w, k + 1, end - 1);
      i = end;
    } else {
      while (k < to && !isTfSpace(s[k])) k += 1;
      expression(w, i + 2, k);
      i = k;
    }
  }
}
function slice(src, start, end) {
  return { text: src.text.slice(start, end), map: src.map.slice(start, end + 1) };
}
var CALL_RE = /^\/(?!@)(!?)([^\s%;|$\u0001]+)/;
function statement(w, st, skip) {
  const s = w.src.text;
  if (st.level === "full") percents(w, st.start, st.end, skip);
  const call = CALL_RE.exec(s.slice(st.start, Math.min(st.end, st.start + 200)));
  if (call) {
    const written = call[2];
    const nameStart = st.start + 1 + call[1].length;
    const nameEnd = nameStart + written.length;
    const next = nameEnd < st.end ? s[nameEnd] : void 0;
    w.scopes.calls.push({
      name: written.toLowerCase(),
      written,
      chain: callerChain(w, st),
      at: w.src.map[st.start],
      nameStart: w.src.map[nameStart],
      nameEnd: w.src.map[nameEnd - 1] + 1,
      dynamic: next === "%" || next === "$" || next === PLACEHOLDER
    });
  }
  const m = COMMAND_RE2.exec(s.slice(st.start, Math.min(st.end, st.start + 40)));
  if (!m) return;
  const word = m[1].toLowerCase();
  const argStart = st.start + m[0].length;
  if (argStart < st.end && !isTfSpace(s[argStart])) return;
  if (word === "set" || word === "setenv" || word === "let" || word === "unset" || word === "export") {
    command(w, word, st, argStart);
    return;
  }
  if (word === "def") {
    const body = macroBodyStart(s.slice(st.start, st.end));
    defExpression(w, argStart, body < 0 ? st.end : st.start + body - 1);
  }
  if (word === "expr") expression(w, argStart, st.end);
  if (w.depth >= 8) return;
  if (word === "eval") {
    evalText(w, st, argStart);
  } else if (word === "for") {
    forCommand(w, st, argStart);
  } else if (word === "repeat") {
    repeatCommand(w, st, argStart);
  } else if (MACRO_DEFINER2.test(word) && st.level === "full") {
    const text = s.slice(st.start, st.end);
    const body = macroBodyStart(text);
    if (body < 0) return;
    const name = word === "def" ? text.slice(defOptionsEnd(text, text.search(/def/i) + 3), body - 1).trim() : "";
    w.scopes.nested.push({
      name: name.toLowerCase(),
      src: handOff(w.src, st.start + body, st.end, st.level),
      definer: callerChain(w, st),
      at: w.src.map[st.start],
      depth: w.depth
    });
  }
}
function nestedBodies(found, scopes) {
  while (scopes.nested.length > 0) {
    const d = scopes.nested.shift();
    const runsHere = (chain2) => chain2.length >= d.definer.length && d.definer.every((c, i) => chain2[chain2.length - d.definer.length + i] === c);
    const called = d.name !== "" && scopes.calls.some((c) => c.name === d.name && c.at > d.at && runsHere(c.chain));
    const own = `${scopes.prefix}:def${scopes.next += 1}`;
    walk({ src: d.src, found, depth: d.depth + 1, chain: [own, ...called ? d.definer : []], scopes }, "body");
  }
}
function stringsIn2(s, expressions) {
  const mask = new Uint8Array(s.length + 1);
  for (const ex of expressions) {
    if (ex.kind === "statement") continue;
    let k = ex.start;
    while (k < ex.end) {
      const c = s[k];
      if (c === '"' || c === "'" || c === "`") {
        const end = skipString(s, k, ex.end);
        mask.fill(1, k, end);
        k = end;
      } else if (c === "$" && s[k + 1] === "(") {
        const end = closeOf(s, k + 1, ex.end);
        k = end < 0 ? k + 2 : end;
      } else {
        k += 1;
      }
    }
  }
  return mask;
}
function scopesOf(w, cmdsubs) {
  if (cmdsubs.length === 0) return () => w.chain;
  const subs = [...cmdsubs].sort((a, b) => a.start - b.start || b.end - a.end);
  const owner2 = new Int32Array(w.src.text.length + 1).fill(-1);
  const parent = [];
  const stack = [];
  let k = 0;
  for (let p = 0; p <= w.src.text.length; p += 1) {
    while (stack.length > 0 && subs[stack[stack.length - 1]].end <= p) stack.pop();
    while (k < subs.length && subs[k].start <= p) {
      parent[k] = stack[stack.length - 1] ?? -1;
      stack.push(k);
      k += 1;
      while (stack.length > 0 && subs[stack[stack.length - 1]].end <= p) stack.pop();
    }
    owner2[p] = stack[stack.length - 1] ?? -1;
  }
  const names = subs.map(() => newScope(w, "cmdsub"));
  const chains = /* @__PURE__ */ new Map();
  const chainOf = (i) => {
    if (i < 0) return w.chain;
    let c = chains.get(i);
    if (!c) {
      c = [names[i], ...chainOf(parent[i])];
      chains.set(i, c);
    }
    return c;
  };
  return (offset) => chainOf(owner2[offset] ?? -1);
}
function walk(w, mode) {
  const { statements, expressions, cmdsubs } = parseRegions(w.src.text, mode);
  w.chainAt = scopesOf(w, cmdsubs);
  const skip = stringsIn2(w.src.text, expressions);
  for (const st of statements) statement(w, st, skip);
  for (const ex of expressions) region(w, ex, skip);
}
function region(w, ex, skip) {
  if (ex.kind === "statement" && ex.level === "full") percents(w, ex.start, ex.end, skip);
  expression(w, ex.start, ex.end);
}
function entryCalls(entry, calls) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const c of calls) {
    if (seen.has(c.nameStart)) continue;
    seen.add(c.nameStart);
    const first = entry.offsetMap[c.nameStart];
    const last = entry.offsetMap[c.nameEnd - 1];
    if (!first || !last || first.line !== last.line) continue;
    out.push({
      name: c.written,
      range: { start: { line: first.line, character: first.character }, end: { line: last.line, character: last.character + 1 } },
      dynamic: c.dynamic
    });
  }
  return out.sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character);
}
function entryVariables(entry, index2) {
  const s = entry.text;
  const found = [];
  const src = { text: s, map: Array.from({ length: s.length + 1 }, (_, i) => i) };
  const local = `local:${index2}`;
  const scopes = { prefix: local, next: 0, calls: [], functionCalls: [], nested: [] };
  walk({ src, found, depth: 0, chain: [`${local}:top`], scopes }, "top");
  const body = entry.isDefBody || entry.isOtherMacroBody ? macroBodyStart(s) : -1;
  if (body >= 0) walk({ src: slice(src, body, s.length), found, depth: 0, chain: [local], scopes }, "body");
  nestedBodies(found, scopes);
  const seen = /* @__PURE__ */ new Set();
  const unique = found.filter((f) => !seen.has(f.start) && (seen.add(f.start), true)).sort((a, b) => a.start - b.start);
  const born = /* @__PURE__ */ new Map();
  const binds = (f) => f.access === "let" || f.access === "getopts";
  for (const f of unique) {
    if (!binds(f) || f.from === void 0) continue;
    const key2 = `${f.chain[0]}\0${f.name}`;
    born.set(key2, Math.min(born.get(key2) ?? Infinity, f.from));
  }
  const out = [];
  for (const f of unique) {
    let scope = "global";
    if (binds(f)) scope = f.chain[0];
    else if (f.access === "read" || f.access === "assign") {
      scope = f.chain.find((c) => (born.get(`${c}\0${f.name}`) ?? Infinity) <= f.start) ?? "global";
    }
    const first = entry.offsetMap[f.start];
    const last = entry.offsetMap[f.end - 1];
    if (!first || !last || first.line !== last.line) continue;
    out.push({
      name: f.name,
      access: f.access,
      form: f.form,
      scope,
      entry: index2,
      offset: f.start,
      range: { start: { line: first.line, character: first.character }, end: { line: last.line, character: last.character + 1 } }
    });
  }
  return { variables: out, calls: entryCalls(entry, scopes.calls), functionCalls: entryCalls(entry, scopes.functionCalls) };
}
var cache3 = /* @__PURE__ */ new Map();
var CACHE_SIZE = 2e3;
var CACHE_CHARS = 16e6;
var cachedChars = 0;
var scanStats = { scans: 0 };
function scan(text) {
  let result = cache3.get(text);
  if (result) {
    cache3.delete(text);
    cache3.set(text, result);
  } else {
    scanStats.scans += 1;
    const entries = splitLogicalEntries(text).flatMap((entry, i) => entry.incomplete ? [] : [entryVariables(entry, i)]);
    result = {
      variables: entries.flatMap((e) => e.variables),
      calls: entries.flatMap((e) => e.calls),
      functionCalls: entries.flatMap((e) => e.functionCalls)
    };
    while (cache3.size > 0 && (cache3.size >= CACHE_SIZE || cachedChars + text.length > CACHE_CHARS)) {
      const oldest = cache3.keys().next().value;
      cache3.delete(oldest);
      cachedChars -= oldest.length;
    }
    cache3.set(text, result);
    cachedChars += text.length;
  }
  return result;
}
function findVariables(text) {
  return scan(text).variables;
}
function findMacroCalls(text) {
  return scan(text).calls;
}
function findFunctionCalls(text) {
  return scan(text).functionCalls;
}

// packages/core/src/variableNavigation.ts
function contains(range, pos) {
  const afterStart = pos.line > range.start.line || pos.line === range.start.line && pos.character >= range.start.character;
  const beforeEnd = pos.line < range.end.line || pos.line === range.end.line && pos.character <= range.end.character;
  return afterStart && beforeEnd;
}
function variableAt(text, pos) {
  const all = findVariables(text).filter((v) => contains(v.range, pos));
  return all.find((v) => v.range.end.line !== pos.line || v.range.end.character !== pos.character) ?? all[0];
}
var DEFINES = /* @__PURE__ */ new Set(["set", "setenv", "let", "getopts"]);
function occurrencesOf(target, text, self, files) {
  const pick = (uri, fileText) => findVariables(fileText).filter((v) => v.name === target.name && v.scope === target.scope).map((v) => ({ ...v, uri }));
  const here = pick(self, text);
  return target.scope === "global" ? [...here, ...files.flatMap((f) => pick(f.uri, f.text))] : here;
}
var toLocation = (v) => ({ uri: v.uri, range: v.range });
function variableDefinition(text, pos, ctx) {
  const target = variableAt(text, pos);
  if (!target) return void 0;
  const all = occurrencesOf(target, text, ctx?.uri ?? "", [...ctx?.files ?? [], ...ctx?.libraryFiles ?? []]);
  const sets = all.filter((v) => DEFINES.has(v.access));
  return (sets.length > 0 ? sets : all.filter((v) => v.access === "assign")).map(toLocation);
}
function variableReferences(text, pos, includeDeclaration, ctx) {
  const target = variableAt(text, pos);
  if (!target) return void 0;
  return occurrencesOf(target, text, ctx?.uri ?? "", ctx?.files ?? []).filter((v) => includeDeclaration || !DEFINES.has(v.access)).map(toLocation);
}
function variableHighlights(text, pos) {
  const target = variableAt(text, pos);
  if (!target) return void 0;
  return occurrencesOf(target, text, "", []).map((v) => ({ range: v.range, kind: v.access === "read" ? "read" : "write" }));
}
function renameCheck(text, pos, ctx) {
  const target = variableAt(text, pos);
  if (!target) return void 0;
  if (target.scope === "global" && SPECIAL_VARIABLE_NAMES.has(target.name)) {
    return { ok: false, reason: `${target.name} is one of tf's special variables, so it can't be renamed.` };
  }
  if (findVariables(text).some((v) => v.access === "getopts" && v.name === target.name && v.scope === target.scope)) {
    return { ok: false, reason: `${target.name} is set by getopts(), which names it after its option letter, so it can't be renamed.` };
  }
  if (target.scope === "global") {
    for (const f of ctx?.libraryFiles ?? []) {
      if (findVariables(f.text).some((v) => v.name === target.name && v.scope === "global")) {
        return { ok: false, reason: `${target.name} is used by tf's library, which a rename here can't change, so it can't be renamed.` };
      }
    }
  }
  const passed = passedOn(target, text, ctx);
  if (passed) return { ok: false, reason: passed };
  return { ok: true, target };
}
var WRITES = /* @__PURE__ */ new Set(["set", "setenv", "assign"]);
function passedOn(target, text, ctx) {
  const name = target.name;
  const self = ctx?.uri ?? "";
  const files = [
    { uri: self, text, library: false },
    ...(ctx?.files ?? []).map((f) => ({ ...f, library: false })),
    ...(ctx?.libraryFiles ?? []).map((f) => ({ ...f, library: true }))
  ];
  const all = files.flatMap(
    (f) => findVariables(f.text).filter((v) => v.name === name).map((v) => ({ ...v, uri: f.uri, library: f.library }))
  );
  if (all.some((v) => v.scope === "global" && WRITES.has(v.access))) return void 0;
  const where2 = (v) => {
    const at2 = `line ${v.range.start.line + 1}, column ${v.range.start.character + 1}`;
    return v.uri === self ? at2 : `${fileLabel(v.uri, self, v.library)} ${at2}`;
  };
  const advice = "Rename both by hand if they are the same variable.";
  if (target.scope !== "global") {
    const reads = all.filter((v) => v.scope === "global" && v.access === "read");
    const elsewhere = reads.find((v) => v.uri !== self || v.entry !== target.entry);
    if (elsewhere) {
      return `${name} is also read on ${where2(elsewhere)}, outside this one's scope, and nothing sets a global ${name}, so tf's dynamic scoping probably hands it this one. ${advice}`;
    }
    const here = reads[0];
    if (here) {
      return `This macro also reads ${name} on ${where2(here)}, where this one doesn't reach, and nothing sets a global ${name}, so that read gets whatever a macro calling this one has. ${advice}`;
    }
    return void 0;
  }
  const bound = all.find((v) => v.access === "let" || v.access === "getopts");
  if (!bound) return void 0;
  const kind = bound.access === "getopts" ? "getopts() option" : bound.form === "loop-variable" ? `/for ${name} loop variable` : `/let ${name}`;
  return `Nothing sets a global ${name}, so its reads probably get the ${kind} on ${where2(bound)} through tf's dynamic scoping. ${advice}`;
}
function fileLabel(uri, self, library) {
  const filePath = (u) => {
    try {
      return decodeURIComponent(new URL(u).pathname);
    } catch {
      return u;
    }
  };
  const other = filePath(uri);
  if (library || !self) return import_node_path.posix.basename(other);
  return import_node_path.posix.relative(import_node_path.posix.dirname(filePath(self)), other);
}
function collision(target, newName2, text, ctx) {
  const old = target.name;
  const everywhere = [{ uri: ctx?.uri ?? "", text }, ...ctx?.files ?? [], ...ctx?.libraryFiles ?? []];
  const globalNamed = everywhere.some((f) => findVariables(f.text).some((v) => v.name === newName2 && v.scope === "global"));
  if (target.scope === "global") {
    if (globalNamed) {
      return `${newName2} is already a variable on this file's load path, so renaming ${old} to it would merge the two. Pick a name that isn't used yet.`;
    }
    for (const f of everywhere) {
      const all = findVariables(f.text);
      const uses = new Set(all.filter((v) => v.name === old && v.scope === "global").map((v) => v.entry));
      if (all.some((v) => v.name === newName2 && v.scope !== "global" && uses.has(v.entry))) {
        return `A macro that uses ${old} has its own /let ${newName2}, which would take over ${old} there after the rename. Pick another name.`;
      }
    }
    return void 0;
  }
  if (findVariables(text).some((v) => v.name === newName2 && v.entry === target.entry)) {
    return `This macro body already uses ${newName2}, so renaming ${old} to it would merge the two. Pick another name.`;
  }
  if (globalNamed) {
    return `${newName2} is already a global variable on this file's load path, and a /let ${newName2} would hide it from this macro and any macro it calls. Pick another name.`;
  }
  return void 0;
}
function prepareVariableRename(text, pos, ctx) {
  const check5 = renameCheck(text, pos, ctx);
  if (!check5) return void 0;
  return check5.ok ? { range: check5.target.range, placeholder: check5.target.name } : { error: check5.reason };
}
function badName(name) {
  if (!isVariableName(name)) {
    return `"${name}" can't be a variable name: use letters, digits and _, not starting with a digit.`;
  }
  if (readSelector(name, 0)?.name !== name || readSelector(`{${name}}`, 0)?.name !== name) {
    return `"${name}" can't be a variable name here: tf reads %${name} as a positional or special substitution, not a variable.`;
  }
  if (SPECIAL_VARIABLE_NAMES.has(name)) {
    return `"${name}" is one of tf's special variables: pick another name.`;
  }
  return void 0;
}
function variableRenameEdits(text, pos, newName2, ctx) {
  const check5 = renameCheck(text, pos, ctx);
  if (!check5) return void 0;
  if (!check5.ok) return { error: check5.reason };
  const bad = badName(newName2);
  if (bad) return { error: bad };
  if (newName2 !== check5.target.name) {
    const taken = collision(check5.target, newName2, text, ctx);
    if (taken) return { error: taken };
  }
  return occurrencesOf(check5.target, text, ctx?.uri ?? "", ctx?.files ?? []).map((v) => ({ uri: v.uri, range: v.range, newText: newName2 }));
}

// packages/core/src/navigation.ts
var NAME = "[^\\s%;=()\\[\\]{}\"'`$\\\\]+";
var CALL_RE2 = new RegExp(`(^|[\\s;|(])\\/(@?)(!?)(${NAME})`, "g");
var BRACED_SUBST_RE = /(?<!\$)\$\{([^}\s]+)\}/g;
var BARE_SUBST_RE = /(?<!\$)\$([A-Za-z_][A-Za-z0-9_]*)/g;
function findUsages(text) {
  const usages = [];
  splitRawLines(text).forEach((line, lineNo) => {
    if (isCommentLine(line)) return;
    const push2 = (name, kind, start, bare = false) => {
      usages.push({
        name,
        kind,
        range: { start: { line: lineNo, character: start }, end: { line: lineNo, character: start + name.length } },
        ...bare ? { bare } : {}
      });
    };
    for (const m of line.matchAll(CALL_RE2)) {
      const at2 = m[2];
      const bang = m[3];
      const name = m[4];
      const start = (m.index ?? 0) + m[1].length + 1 + at2.length + bang.length;
      push2(name, at2 ? "builtin-call" : "call", start);
    }
    for (const m of line.matchAll(BRACED_SUBST_RE)) push2(m[1], "substitution", (m.index ?? 0) + 2);
    for (const m of line.matchAll(BARE_SUBST_RE)) push2(m[1], "substitution", (m.index ?? 0) + 1, true);
  });
  return usages;
}
function macroUsages(text) {
  const calls = findFunctionCalls(text).map((c) => ({ name: c.name, kind: "function-call", range: c.range }));
  return [...findUsages(text), ...calls];
}
function contains2(range, pos) {
  const afterStart = pos.line > range.start.line || pos.line === range.start.line && pos.character >= range.start.character;
  const beforeEnd = pos.line < range.end.line || pos.line === range.end.line && pos.character <= range.end.character;
  return afterStart && beforeEnd;
}
var same = (a, b) => a.toLowerCase() === b.toLowerCase();
function definitionsOf(name, text, symbols, ctx) {
  if (RESERVED_MACRO_NAMES.has(name.toLowerCase())) return [];
  const lines = splitRawLines(text);
  const local = symbols.filter((s) => s.kind === "def" && same(s.name, name)).map((symbol) => ({ uri: ctx?.uri ?? "", symbol, lines, library: false, loaded: true }));
  const external = (ctx?.macros ?? []).filter((m) => same(m.symbol.name, name)).map((m) => ({ uri: m.uri, label: m.label, symbol: m.symbol, lines: m.lines, library: m.library, loaded: m.loaded }));
  return [...local, ...external];
}
function targetAt(text, pos, symbols) {
  const usage = macroUsages(text).find((u) => contains2(u.range, pos));
  if (usage) return { name: usage.name, usage, range: usage.range };
  const def = symbols.find((s) => s.kind === "def" && contains2(s.selectionRange, pos));
  return def && { name: def.name, range: def.selectionRange };
}
var COMMANDS = new Map(ALL_COMMANDS.map((c) => [c.name.toLowerCase(), c.source]));
var SOURCE_LABEL = {
  keyword: "tf control-flow keyword",
  builtin: "tf built-in command",
  stdlib: "stdlib.tf macro (always loaded)"
};
function commandHover(name, help) {
  const key2 = name.toLowerCase();
  const source = COMMANDS.get(key2);
  const entry = help?.get(`/${key2}`);
  if (!source && !entry) return void 0;
  const usages = entry && entry.usage.length > 0 ? entry.usage : COMMAND_USAGES[key2];
  const synopsis = usages ? "```tf\n" + usages.join("\n") + "\n```\n\n" : "";
  const description = COMMAND_DESCRIPTIONS[key2] || entry?.summary && escapeMarkdown2(entry.summary);
  const parts = [synopsis.trimEnd(), description ?? "", source ? `*${SOURCE_LABEL[source]}*` : ""].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : void 0;
}
function escapeMarkdown2(text) {
  return text.replace(/[\\`*_{}[\]<>#|]/g, "\\$&");
}
var DOC_COMMENT_RE = /^\s*;;;(.*)$/;
function docCommentAbove(lines, defLine) {
  const doc = [];
  for (let i = defLine - 1; i >= 0; i -= 1) {
    const m = DOC_COMMENT_RE.exec(lines[i] ?? "");
    if (!m) break;
    doc.unshift(m[1].replace(/^ /, "").replace(/\s+$/, ""));
  }
  return doc.length > 0 ? doc.join("\n") : void 0;
}
function where(def) {
  const line = def.symbol.range.start.line + 1;
  if (!def.label) return `this file, line ${line}`;
  return `\`${def.label}\`${def.library ? " (tf library)" : ""} line ${line}`;
}
function describeDefs(defs) {
  const code3 = "```tf\n" + defs.map((d) => `${d.symbol.detail} ${d.symbol.name}`).join("\n") + "\n```\n\n";
  const docs = defs.map((d) => docCommentAbove(d.lines, d.symbol.range.start.line)).filter((d) => d !== void 0).map((d) => d.split("\n").map(escapeMarkdown2).join("  \n"));
  return code3 + (docs.length > 0 ? `${docs.join("\n\n")}

` : "") + `defined in ${defs.map(where).join("; ")}`;
}
function getHover(text, pos, ctx) {
  const symbols = getDocumentSymbols(text);
  const target = targetAt(text, pos, symbols);
  if (!target) return getExpressionHover(text, pos, ctx?.help);
  const key2 = target.name.toLowerCase();
  const source = COMMANDS.get(key2);
  if (target.usage?.kind === "builtin-call") {
    if (source !== "builtin" && source !== "keyword") return void 0;
    const doc = commandHover(target.name, ctx?.help);
    return doc ? { markdown: `${doc}

\`/@\` calls the built-in even if a macro has the same name.`, range: target.range } : void 0;
  }
  const all = definitionsOf(target.name, text, symbols, ctx);
  const userDefs = all.filter((d) => d.loaded && !d.library);
  const libraryDefs = all.filter((d) => d.loaded && d.library);
  const unloaded = all.filter((d) => !d.loaded);
  if (userDefs.length > 0) {
    let note = "";
    if (source === "builtin") {
      note = `

Shadows the built-in \`/${key2}\`; \`/@${key2}\` calls the built-in.`;
    } else if (source === "stdlib" || libraryDefs.length > 0) {
      const from = libraryDefs[0]?.label ?? "stdlib.tf";
      note = `

Redefines \`/${key2}\` from \`${from}\`.`;
    }
    return { markdown: describeDefs(userDefs) + note, range: target.range };
  }
  const command2 = commandHover(target.name, ctx?.help);
  const withCommand = (rest) => command2 ? `${command2}

${rest}` : rest;
  if (libraryDefs.length > 0) {
    return { markdown: withCommand(describeDefs(libraryDefs)), range: target.range };
  }
  if (unloaded.length > 0 && !source) {
    const first = unloaded[0];
    return {
      markdown: withCommand(describeDefs(unloaded)) + `

Not loaded on this file's load path — \`/require ${first.label ?? ""}\` first.`,
      range: target.range
    };
  }
  return command2 && target.usage?.kind === "call" ? { markdown: command2, range: target.range } : void 0;
}
function getDefinition(text, pos, ctx) {
  const variable = variableDefinition(text, pos, ctx);
  if (variable) return variable;
  const symbols = getDocumentSymbols(text);
  const target = targetAt(text, pos, symbols);
  if (!target || target.usage?.kind === "builtin-call") return [];
  const all = definitionsOf(target.name, text, symbols, ctx);
  const loaded = all.filter((d) => d.loaded);
  return (loaded.length > 0 ? loaded : all).map((d) => ({ uri: d.uri, range: d.symbol.selectionRange }));
}
function getReferences(text, pos, includeDeclaration, ctx) {
  const variable = variableReferences(text, pos, includeDeclaration, ctx);
  if (variable) return sortLocations(variable);
  const symbols = getDocumentSymbols(text);
  const target = targetAt(text, pos, symbols);
  if (!target || target.usage?.kind === "builtin-call") return [];
  const uses = (uri, fileText) => macroUsages(fileText).filter((u) => u.kind !== "builtin-call" && same(u.name, target.name)).map((u) => ({ uri, range: u.range }));
  const decls = includeDeclaration ? definitionsOf(target.name, text, symbols, ctx).filter((d) => d.loaded).map((d) => ({ uri: d.uri, range: d.symbol.selectionRange })) : [];
  return sortLocations([...decls, ...uses(ctx?.uri ?? "", text), ...(ctx?.files ?? []).flatMap((f) => uses(f.uri, f.text))]);
}
function sortLocations(all) {
  return all.sort(
    (a, b) => a.uri.localeCompare(b.uri) || a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character
  );
}
function renameTarget(text, pos, ctx) {
  const symbols = getDocumentSymbols(text);
  const target = targetAt(text, pos, symbols);
  if (!target) return { ok: false, reason: "Put the cursor on a macro or variable name to rename it." };
  if (target.usage?.kind === "builtin-call") {
    return { ok: false, reason: `/@${target.name} always calls the built-in, which can't be renamed.` };
  }
  const defs = definitionsOf(target.name, text, symbols, ctx).filter((d) => d.loaded);
  const library = defs.find((d) => d.library);
  if (library) {
    return { ok: false, reason: `/${target.name} is defined in tf's library (${library.label ?? "stdlib.tf"}), which isn't yours to rename.` };
  }
  if (defs.length === 0) {
    const builtin = COMMANDS.has(target.name.toLowerCase());
    return {
      ok: false,
      reason: builtin ? `/${target.name} is a tf command, not a macro defined in your scripts.` : `No /def of ${target.name} on this file's load path, so there is nothing to rename it consistently with.`
    };
  }
  return { ok: true, target, defs, symbols };
}
var NEW_NAME_RE = new RegExp(`^${NAME}$`);
var FUNCTION_NAMES2 = new Set(FUNCTIONS.map((f) => f.name));
var IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
function prepareRename(text, pos, ctx) {
  const variable = prepareVariableRename(text, pos, ctx);
  if (variable) return variable;
  const r = renameTarget(text, pos, ctx);
  return r.ok ? { range: r.target.range, placeholder: r.target.name } : { error: r.reason };
}
function getRenameEdits(text, pos, newName2, ctx) {
  const variable = variableRenameEdits(text, pos, newName2, ctx);
  if (variable) return variable;
  const r = renameTarget(text, pos, ctx);
  if (!r.ok) return { error: r.reason };
  if (!NEW_NAME_RE.test(newName2)) {
    return { error: `"${newName2}" can't be a macro name here: no spaces, and none of % ; = ( ) [ ] { } " ' \` $ \\.` };
  }
  const { target, defs } = r;
  const self = ctx?.uri ?? "";
  if (!same(newName2, target.name)) {
    const taken = definitionsOf(newName2, text, r.symbols, ctx).find((d) => d.loaded);
    if (taken) {
      const where2 = taken.uri === self ? `line ${taken.symbol.selectionRange.start.line + 1}` : taken.label ?? taken.uri;
      return { error: `There's already a macro /${taken.symbol.name} (${where2}), and tf ignores case in macro names, so one /def would replace the other: pick another name.` };
    }
  }
  const edits = defs.map((d) => ({ uri: d.uri, range: d.symbol.selectionRange, newText: newName2 }));
  const uses = [{ uri: self, text }, ...ctx?.files ?? []].flatMap(
    (f) => macroUsages(f.text).filter((u) => u.kind !== "builtin-call" && same(u.name, target.name)).map((u) => ({ uri: f.uri, u }))
  );
  const fn = uses.find(({ u }) => u.kind === "function-call");
  if (fn && !isVariableName(newName2)) {
    return { error: `${target.name} is called as ${fn.u.name}(...) on line ${fn.u.range.start.line + 1}, and tf only reads letters, digits and _ as a function name there: pick a name like that.` };
  }
  if (fn && FUNCTION_NAMES2.has(newName2)) {
    return { error: `${target.name} is called as ${fn.u.name}(...) on line ${fn.u.range.start.line + 1}, and ${newName2}(...) would call tf's builtin ${newName2}() instead: pick another name.` };
  }
  for (const { uri, u } of uses) {
    if (u.bare && !IDENTIFIER_RE.test(newName2)) {
      const start = { line: u.range.start.line, character: u.range.start.character - 1 };
      edits.push({ uri, range: { start, end: u.range.end }, newText: `\${${newName2}}` });
    } else {
      edits.push({ uri, range: u.range, newText: newName2 });
    }
  }
  return edits;
}
function getDocumentHighlights(text, pos) {
  const variable = variableHighlights(text, pos);
  if (variable) return variable;
  const symbols = getDocumentSymbols(text);
  const target = targetAt(text, pos, symbols);
  if (!target || target.usage?.kind === "builtin-call") return [];
  const defs = definitionsOf(target.name, text, symbols, void 0).map((d) => ({ range: d.symbol.selectionRange, kind: "write" }));
  const uses = macroUsages(text).filter((u) => u.kind !== "builtin-call" && same(u.name, target.name)).map((u) => ({ range: u.range, kind: "read" }));
  return [...defs, ...uses];
}

// packages/core/src/formatting.ts
function topLevelSeparators(s) {
  const out = [];
  let quote = "";
  let depth = 0;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "%") {
      let n = 1;
      while (s[i + n] === "%") n += 1;
      if (n === 1 && s[i + n] === ";" && depth === 0) out.push(i);
      i += n - 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if ("([{".includes(ch)) depth += 1;
    else if (")]}".includes(ch)) depth = Math.max(0, depth - 1);
  }
  return out;
}
function closeParen(s, open) {
  let depth = 0;
  let quote = "";
  for (let i = open; i < s.length; i += 1) {
    const ch = s[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth += 1;
    else if (ch === ")" && --depth === 0) return i + 1;
  }
  return -1;
}
var COMMAND_START_RE = /(?:^\s*|=\s*|\)\s*|\/@?(?:if|then|else|elseif|while|do)\s+)$/i;
var OPENERS = /* @__PURE__ */ new Set(["if", "while"]);
var CLOSERS = /* @__PURE__ */ new Set(["endif", "done"]);
var MIDDLES = /* @__PURE__ */ new Set(["else", "elseif"]);
function keywordsIn(line) {
  const found = [];
  const cuts = [-2, ...topLevelSeparators(line), line.length];
  for (let k = 0; k + 1 < cuts.length; k += 1) {
    const seg = line.slice(cuts[k] + 2, cuts[k + 1]);
    for (const m of seg.matchAll(CALL_RE2)) {
      const slash = (m.index ?? 0) + m[1].length;
      if (!COMMAND_START_RE.test(seg.slice(0, slash))) continue;
      const name = m[4].toLowerCase();
      if (OPENERS.has(name) || CLOSERS.has(name) || MIDDLES.has(name)) found.push(name);
    }
  }
  return found;
}
function normalise(joined2, body) {
  if (body < 0) return joined2;
  const seps = topLevelSeparators(joined2).filter((s) => s >= body);
  let out = "";
  let from = 0;
  for (const s of seps) {
    out += joined2.slice(from, s).replace(/[ \t\f\v]+$/, "") + "%;";
    from = s + 2;
    while (/[ \t\f\v]/.test(joined2[from] ?? "")) from += 1;
  }
  return out + joined2.slice(from);
}
function plannedLines(entry) {
  const joined2 = entry.text;
  const body = macroBodyStart(joined2);
  if (body < 0) return void 0;
  const text = normalise(joined2, body);
  const seps = topLevelSeparators(text).filter((s) => s >= body);
  const breaks = /* @__PURE__ */ new Set();
  const starts = [body, ...seps.map((s) => s + 2)];
  const stmtEnd = (k) => seps[k] ?? text.length;
  const joinedSeps = /* @__PURE__ */ new Set();
  let blocks = 0;
  let inCondition = false;
  starts.forEach((st, k) => {
    let at2 = st;
    while (/\s/.test(text[at2] ?? "")) at2 += 1;
    if (k > 0 && st < text.length) (inCondition ? joinedSeps : breaks).add(st);
    for (; ; ) {
      const m = /^\/@?(if|elseif|while|else|then|do)\b/i.exec(text.slice(at2));
      if (!m) break;
      const kw = m[1].toLowerCase();
      if (kw === "then" || kw === "do") inCondition = false;
      else blocks += 1;
      let after = at2 + m[0].length;
      if (kw === "if" || kw === "elseif" || kw === "while") {
        let p = after;
        while (/\s/.test(text[p] ?? "")) p += 1;
        if (text[p] !== "(") {
          const rest = text.slice(p, stmtEnd(k));
          const head = /(?:^|\s)(\/@?(?:then|do))\b/i.exec(rest);
          if (!head) {
            inCondition = true;
            break;
          }
          at2 = p + (head.index ?? 0) + head[0].length - head[1].length;
          continue;
        }
        after = closeParen(text, p);
        if (after < 0) break;
      }
      let next = after;
      while (/[ \t]/.test(text[next] ?? "")) next += 1;
      if (next === after || next >= text.length || text.startsWith("%;", next)) break;
      breaks.add(next);
      at2 = next;
    }
  });
  if (!seps.some((s) => s + 2 < text.length) && blocks === 0) return void 0;
  let first = body;
  while (/[ \t]/.test(text[first] ?? "")) first += 1;
  if (first < text.length) breaks.add(first);
  let offset = 0;
  const own = [];
  for (const part of entry.parts.slice(0, -1)) {
    offset += part.text.length;
    own.push(offset);
  }
  for (const o of own) {
    const mapped = mapOffset(joined2, text, o);
    if (mapped > 0) breaks.add(mapped);
  }
  const spaced = (a, b) => {
    let out = "";
    for (let i = a; i < b; i += 1) out += (joinedSeps.has(i) ? " " : "") + text[i];
    return out;
  };
  const cuts = [...breaks].filter((b) => b > 0 && b <= text.length).sort((a, b) => a - b);
  const lines = [];
  let from = 0;
  for (const c of cuts) {
    lines.push(spaced(from, c));
    from = c;
  }
  lines.push(spaced(from, text.length));
  return lines.filter((l, i) => i === 0 || i === lines.length - 1 || l !== "");
}
function mapOffset(a, b, o) {
  let i = 0;
  let j = 0;
  while (i < o && j <= b.length) {
    if (a[i] === b[j]) j += 1;
    i += 1;
  }
  return j;
}
function endsStatement(prev) {
  const s = prev.replace(/\\$/, "").replace(/\s+$/, "");
  if (/(?:^|[^%])(?:%%)*%;$/.test(s)) return true;
  if (/\/@?(?:else|then|do)$/i.test(s)) return true;
  return s.endsWith(")") && keywordsIn(s).some((k) => k === "if" || k === "elseif" || k === "while");
}
function indentLines(lines, firstIndent, macroBody, unit) {
  const base = macroBody ? 1 : 0;
  let depth = 0;
  let prev = lines[0] ?? "";
  return lines.map((line, i) => {
    if (i > 0 && (isCommentLine(line) || isBlankLine(line))) return line;
    const content = i === 0 ? line : line.slice(leadingWhitespaceLength(line));
    const keywords = keywordsIn(content);
    const lead = /^\/@?(\w+)/.exec(content)?.[1]?.toLowerCase() ?? "";
    let level = depth;
    if (CLOSERS.has(lead) || MIDDLES.has(lead)) level = Math.max(0, depth - 1);
    for (const k of keywords) {
      if (OPENERS.has(k)) depth += 1;
      else if (CLOSERS.has(k)) depth = Math.max(0, depth - 1);
    }
    const startsBody = i === 1 && macroBody;
    const hanging = i > 0 && !startsBody && !endsStatement(prev) ? 1 : 0;
    prev = content;
    if (i === 0) return firstIndent + content;
    return unit.repeat(base + level + hanging) + content;
  });
}
function rejoin(lines) {
  return splitLogicalEntries(lines.join("\n"))[0]?.text ?? "";
}
function hasInnerTab(lines) {
  return lines.some((l) => !isCommentLine(l) && /\S[^\t]*\t/.test(l));
}
function splitEntry(entry, original, indent, opts = {}) {
  if (!(entry.isDefBody || entry.isOtherMacroBody) || !opts.headTabs && hasInnerTab(original)) return void 0;
  if (!entry.parts.every((p, i) => p.line === entry.startLine + i)) return void 0;
  const planned = plannedLines(entry);
  if (!planned) return void 0;
  const firstIndent = (original[0] ?? "").slice(0, leadingWhitespaceLength(original[0] ?? ""));
  const withSlashes = planned.map((l, i) => i < planned.length - 1 ? `${l}\\` : l);
  const rebuilt = indentLines(withSlashes, firstIndent, true, indent);
  const body = macroBodyStart(entry.text);
  if (rebuilt.some((l, i) => i > 0 && isCommentLine(l))) return void 0;
  return normalise(rejoin(rebuilt), body) === normalise(entry.text, body) ? rebuilt : void 0;
}
function formatEntry(entry, original, options) {
  const macroBody = entry.isDefBody || entry.isOtherMacroBody;
  const firstIndent = (original[0] ?? "").slice(0, leadingWhitespaceLength(original[0] ?? ""));
  if (hasInnerTab(original)) return original;
  if (!macroBody && !keywordsIn(original[0] ?? "").some((k) => OPENERS.has(k))) return original;
  if (options.splitStatements && macroBody) {
    const rebuilt = splitEntry(entry, original, options.indent);
    if (rebuilt) return rebuilt;
  }
  return indentLines(original, firstIndent, macroBody, options.indent);
}
function formatText(text, options, range) {
  if (text.includes("\r")) return [];
  const lines = splitRawLines(text);
  const edits = [];
  for (const entry of splitLogicalEntries(text)) {
    if (entry.incomplete) continue;
    if (range && (entry.endLine < range.start.line || entry.startLine > range.end.line)) continue;
    const original = lines.slice(entry.startLine, entry.endLine + 1);
    const formatted = formatEntry(entry, original, options);
    if (formatted.join("\n") === original.join("\n")) continue;
    const last = original[original.length - 1] ?? "";
    edits.push({
      range: { start: { line: entry.startLine, character: 0 }, end: { line: entry.endLine, character: last.length } },
      newText: formatted.join("\n")
    });
  }
  return edits;
}

// packages/core/src/bodyLayout.ts
var DEFAULT_INDENT = "    ";
function detectIndent(text) {
  let best;
  const lines = splitRawLines(text);
  for (const entry of splitLogicalEntries(text)) {
    if (entry.parts.length < 2) continue;
    for (const part of entry.parts.slice(1)) {
      const line = lines[part.line] ?? "";
      const lead = line.slice(0, leadingWhitespaceLength(line)).replace(/\r/g, "");
      if (lead === "" || isCommentLine(line)) continue;
      if (lead.startsWith("	")) return "	";
      if (best === void 0 || lead.length < best.length) best = lead;
    }
  }
  return best ?? DEFAULT_INDENT;
}
function joinedLine(entry, firstLine) {
  const body = macroBodyStart(entry.text);
  if (body < 0) return void 0;
  const text = normalise(entry.text, body);
  const seps = topLevelSeparators(text).filter((s) => s >= body && s + 2 < text.length);
  let out = "";
  let from = 0;
  for (const s of seps) {
    out += `${text.slice(from, s + 2)} `;
    from = s + 2;
  }
  out += text.slice(from);
  return firstLine.slice(0, leadingWhitespaceLength(firstLine)) + out;
}
function sameProgram(a, b) {
  const bodyA = macroBodyStart(a);
  const bodyB = macroBodyStart(b);
  if (bodyA < 0 || bodyB < 0) return false;
  if (a.slice(0, bodyA) !== b.slice(0, bodyB)) return false;
  if (normalise(a, bodyA) !== normalise(b, bodyB)) return false;
  const statements = (t, body) => parseStatements(t.slice(body), "body").map((st) => `${st.level}:${st.conditional}:${t.slice(body + st.start, body + st.end).trim()}`);
  if (statements(a, bodyA).join("\n") !== statements(b, bodyB).join("\n")) return false;
  const issues = (t, body) => checkStructure(t.slice(body), "body").map((i) => `${i.kind}:${i.message}`).join("\n");
  return issues(a, bodyA) === issues(b, bodyB);
}
function tabMoves(entry, original, body) {
  const first = original[0] ?? "";
  const firstPart = entry.parts[0]?.text ?? "";
  const headEnd = body <= firstPart.length ? leadingWhitespaceLength(first) + body : first.length;
  if (first.slice(headEnd).includes("	")) return true;
  return hasInnerTab(original.slice(1));
}
function overlapsLines(entry, range) {
  return entry.startLine <= range.end.line && entry.endLine >= range.start.line;
}
function wholeLines(entry, original, newText) {
  const last = original[original.length - 1] ?? "";
  return { range: { start: { line: entry.startLine, character: 0 }, end: { line: entry.endLine, character: last.length } }, newText };
}
var UNNAMED = { def: "this macro's", alias: "this alias's", trig: "this trigger's", hook: "this hook's", bind: "this key binding's" };
function owner(symbol) {
  if (!symbol) return "the";
  return symbol.kind === "def" || symbol.kind === "alias" ? `/${symbol.name}'s` : UNNAMED[symbol.kind];
}
function getRefactorActions(text, range, indent = detectIndent(text)) {
  const lines = splitRawLines(text);
  const actions = [];
  const symbols = new Map(getDocumentSymbols(text).map((s) => [s.range.start.line, s]));
  for (const entry of splitLogicalEntries(text)) {
    if (!overlapsLines(entry, range)) continue;
    if (entry.incomplete || !(entry.isDefBody || entry.isOtherMacroBody)) continue;
    const original = lines.slice(entry.startLine, entry.endLine + 1);
    if (original.some((l) => l.includes("\r")) || tabMoves(entry, original, macroBodyStart(entry.text))) continue;
    if (entry.parts.length === 1) {
      const split = splitEntry(entry, original, indent, { headTabs: true });
      if (!split || split.length < 2) continue;
      const joinedBack = splitLogicalEntries(split.join("\n"))[0];
      const back = joinedBack && joinedLine(joinedBack, split[0] ?? "");
      if (!sameProgram(entry.text, rejoin(split)) || back === void 0 || !sameProgram(entry.text, rejoin([back]))) continue;
      actions.push({ title: `Split ${owner(symbols.get(entry.startLine))} body onto separate lines`, edits: [wholeLines(entry, original, split.join("\n"))] });
      continue;
    }
    if (!entry.parts.every((p, i) => p.line === entry.startLine + i)) continue;
    const line = joinedLine(entry, original[0] ?? "");
    if (line === void 0 || !sameProgram(entry.text, rejoin([line]))) continue;
    const reread = splitLogicalEntries(line);
    if (reread.length !== 1 || reread[0]?.parts.length !== 1) continue;
    actions.push({ title: `Join ${owner(symbols.get(entry.startLine))} body onto one line`, edits: [wholeLines(entry, original, line)] });
  }
  return actions;
}

// packages/core/src/extractMacro.ts
var TITLE = "Extract to a new macro";
var ARGUMENT_RE = /(?:%+|\\%)\{?(?:-?[0-9]|\*|#|-?L[0-9]*(?![A-Za-z_])|R(?![A-Za-z_]))|\{(?:#|\*|-?[0-9]+|-?L[0-9]*)\}/;
function readsArguments(text) {
  return ARGUMENT_RE.test(text) || /(^|[^\w])\/[@!]*eval\b[^%$]*?(?:%|\$[[({])/i.test(text) || /(^|[^\w])eval\s*\(/.test(text);
}
function breaksZero(text) {
  return /(^|[^\w])\/[@!]*break\s+0+(?![0-9])/i.test(text);
}
function inLoop(units, at2, text) {
  return units.some((w) => w.block && w.word === "while" && w.start < at2.start && trimEnd2(text, w.start, w.end) >= trimEnd2(text, at2.start, at2.end));
}
var COMMAND_NAMES2 = new Set(ALL_COMMANDS.map((c) => c.name.toLowerCase()));
var RUNS_OTHER_CODE = /* @__PURE__ */ new Set(["trigger", "not", "quote"]);
var ENDS_MACRO = /* @__PURE__ */ new Set(["return", "result", "exit"]);
var ALIAS_RE2 = /^\s*\/alias\b/i;
function compare(a, b) {
  return a.line - b.line || a.character - b.character;
}
function trimEnd2(s, start, end) {
  let e = end;
  while (e > start && isTfSpace(s[e - 1]) && s[e - 2] !== "\\") e -= 1;
  return e;
}
function selected(entry, range) {
  let from = entry.text.length;
  let to = 0;
  entry.offsetMap.forEach((p, k) => {
    if (compare(p, range.start) >= 0 && compare(p, range.end) < 0) {
      from = Math.min(from, k);
      to = Math.max(to, k + 1);
    }
  });
  return { from, to };
}
function readsMacroName(s) {
  return /%+\{?0+(?![0-9])|\{0+\}/.test(s);
}
function mentions(text, name) {
  let at2 = text.indexOf(name);
  while (at2 >= 0) {
    if (!isNameChar2(text[at2 - 1]) && !isNameChar2(text[at2 + name.length])) return true;
    at2 = text.indexOf(name, at2 + 1);
  }
  return false;
}
function readerOutside(calls) {
  for (const c of calls) {
    const name = c.name.toLowerCase();
    if (!COMMAND_NAMES2.has(name) || RUNS_OTHER_CODE.has(name)) return `/${c.name}`;
  }
  return void 0;
}
function letName(text) {
  const m = /^\/[@!]*let\s+([^\s=]*)/i.exec(text);
  const name = m?.[1] ?? "";
  return /[%$\\{]/.test(name) ? "" : name;
}
function isDefEntry(entry) {
  return (entry.isDefBody || entry.isOtherMacroBody) && !ALIAS_RE2.test(entry.text);
}
function ownerName(symbol) {
  if (symbol?.kind === "def") return `/${symbol.name}`;
  if (symbol?.kind === "trig") return "this trigger";
  if (symbol?.kind === "hook") return "this hook";
  if (symbol?.kind === "bind") return "this key binding";
  return "this macro";
}
function newName(symbol, taken) {
  const written = symbol?.kind === "def" ? symbol.name.replace(/^(["'`])(.*)\1$/, "$2") : "";
  const base = /^[A-Za-z0-9_~.:-]+$/.test(written) ? `${written}_extracted` : "extracted";
  for (let n = 1; ; n += 1) {
    const name = n === 1 ? base : `${base}${n}`;
    if (!taken(name.toLowerCase())) return name;
  }
}
function applyEdits(text, edits) {
  const lines = splitRawLines(text);
  const starts = [];
  let at2 = 0;
  for (const l of lines) {
    starts.push(at2);
    at2 += l.length + 1;
  }
  const off = (p) => (starts[p.line] ?? text.length) + p.character;
  let out = text;
  for (const e of [...edits].sort((a, b) => off(b.range.start) - off(a.range.start))) {
    out = out.slice(0, off(e.range.start)) + e.newText + out.slice(off(e.range.end));
  }
  return out;
}
function plan(text, lines, entry, entryIndex, range, symbol, options) {
  const body = macroBodyStart(entry.text);
  if (body < 0) return void 0;
  const { from, to } = selected(entry, range);
  if (from >= to || from < body) return void 0;
  const bodyText = entry.text.slice(body);
  const parsed = parseUnits(bodyText);
  if (!parsed.complete) return void 0;
  const s = from - body;
  const e = to - body;
  const end = (u) => trimEnd2(bodyText, u.start, u.end);
  const covered = parsed.units.filter((u) => u.start >= s && end(u) <= e && (end(u) > u.start || u.start > s && u.start < e));
  const chosen = covered.filter((u) => !covered.some((o) => o !== u && o.start <= u.start && end(o) >= end(u) && (o.start < u.start || end(o) > end(u))));
  if (chosen.length === 0) return void 0;
  const list = chosen[0]?.list;
  if (chosen.some((u) => u.list !== list)) return void 0;
  chosen.sort((a, b) => a.start - b.start);
  const inList = parsed.units.filter((u) => u.list === list).sort((a, b) => a.start - b.start);
  const firstAt = inList.indexOf(chosen[0]);
  if (chosen.some((u, k) => inList[firstAt + k] !== u)) return void 0;
  for (let k = s; k < e; ) {
    const inside = chosen.find((u) => k >= u.start && k < end(u));
    if (inside) k = end(inside);
    else if (isTfSpace(bodyText[k])) k += 1;
    else if (bodyText[k] === "%" && ";|\\".includes(bodyText[k + 1] ?? " ") && bodyText[k - 1] !== "%") k += 2;
    else return void 0;
  }
  const kind = parsed.lists[list]?.kind;
  if (kind === "cmdsub") return { disabled: "Statements inside a $(...) can't be extracted: select the whole statement the $(...) is in." };
  if (kind === "condition") return { disabled: "A condition list can't be extracted on its own: select the whole /if or /while." };
  const owner2 = ownerName(symbol);
  const xStart = chosen[0].start;
  const xEnd = end(chosen[chosen.length - 1]);
  const moved = bodyText.slice(xStart, xEnd);
  const within = parsed.units.filter((u) => u.start >= xStart && end(u) <= xEnd);
  const outsideText = `${bodyText.slice(0, xStart)} ${bodyText.slice(xEnd)}`;
  const startPos = entry.offsetMap[body + xStart];
  const lastPos = entry.offsetMap[body + xEnd - 1];
  const bodyPos = entry.offsetMap[body];
  if (!startPos || !lastPos || !bodyPos) return void 0;
  if (moved.includes("	")) {
    return { disabled: "The selection has a tab in it, which tf turns into spaces by column, and its column would change in the new macro: replace it with spaces first." };
  }
  let before2 = xStart;
  while (before2 > 0 && isTfSpace(bodyText[before2 - 1])) before2 -= 1;
  let after = xEnd;
  while (isTfSpace(bodyText[after])) after += 1;
  const tie = (at2) => bodyText[at2] === "%" && (bodyText[at2 + 1] === "|" || bodyText[at2 + 1] === "\\") && bodyText[at2 - 1] !== "%";
  if (before2 >= 2 && tie(before2 - 2) || tie(after)) {
    return { disabled: "A %| or %\\ ties the selection to the statement next to it: select that statement too, or neither." };
  }
  for (const u of within) {
    if (ENDS_MACRO.has(u.word)) return { disabled: `/${u.word} in the selection would end the new macro, not ${owner2}: leave it out of the selection.` };
    if (u.word === "shift") return { disabled: `/shift in the selection would shift the new macro's arguments, not ${owner2}'s: leave it out of the selection.` };
    if (u.word === "break") {
      const n = Number(/^\/[@!]*break\s*(\d*)/i.exec(bodyText.slice(u.start, u.end))?.[1] || "1");
      const loops = within.filter((w) => w.block && w.word === "while" && w.start < u.start && end(w) >= end(u)).length;
      if (loops < n) return { disabled: `This /break would end the new macro, not the loop it is in: select the whole /while.` };
    }
  }
  if (/(^|[^\w])getopts\s*\(/.test(moved)) {
    return { disabled: `getopts() reads the running macro's arguments and sets its locals, so in a new macro it would read and set the wrong ones: leave it out of the selection.` };
  }
  if (readsMacroName(moved)) {
    return { disabled: `%0 is the running macro's name, which in the new macro would be its own: leave it out of the selection.` };
  }
  if (breaksZero(moved)) return { disabled: "tf refuses to compile /break 0: fix the /break first." };
  if (symbol?.kind === "def" && readsArguments(moved) && options.calledAsFunction?.(symbol.name.toLowerCase())) {
    return { disabled: `${owner2} is called as a function, ${symbol.name}(...), whose arguments %* would split differently in a new macro: it can't be extracted.` };
  }
  if (/(^|[^\w])regmatch\s*\(/.test(moved) && /%\{?P|\{P/.test(outsideText)) {
    return { disabled: `regmatch() in the selection would set %P1 and the rest only inside the new macro, but ${owner2} reads them outside it: keep the regmatch() outside the selection.` };
  }
  for (const u of within.filter((w) => w.word === "let")) {
    if (letName(bodyText.slice(u.start, u.end)) === "") {
      return { disabled: "A /let in the selection sets a variable whose name is built when it runs, and it would be the new macro's local: keep it outside the selection." };
    }
  }
  const inMoved = (offset) => offset >= body + xStart && offset < body + xEnd;
  const made = /* @__PURE__ */ new Map();
  const movedOccurrences = findVariables(text).filter((o) => o.entry === entryIndex && inMoved(o.offset));
  for (const o of movedOccurrences) {
    if (o.access === "let") made.set(o.name, "let");
    else if (o.access === "assign" && o.scope === "global" && !made.has(o.name)) made.set(o.name, "assign");
  }
  if (made.size > 0 && inLoop(parsed.units, chosen[0], bodyText)) {
    for (const v of made.keys()) {
      const uses = movedOccurrences.filter((o) => o.name === v).sort((a, b) => a.offset - b.offset);
      const first = uses[0];
      const letUnit = first && first.access === "let" ? within.find((u) => u.word === "let" && u.list === list && first.offset - body >= u.start && first.offset - body < u.end) : void 0;
      const readsInOwnLet = letUnit !== void 0 && uses.some((o) => o.access === "read" && o.offset - body >= letUnit.start && o.offset - body < letUnit.end);
      if (!letUnit || readsInOwnLet) {
        return { disabled: `The selection is inside a /while and makes a local ${v} that it reads: the loop's next turn sees the last turn's ${v}, but a new macro's ${v} would start afresh each call. Keep it in ${owner2}.` };
      }
    }
  }
  if (made.size > 0) {
    const inBody = (r) => compare(r.start, bodyPos) >= 0 && r.start.line <= entry.endLine;
    const inSelection = (r) => compare(r.start, startPos) >= 0 && compare(r.start, lastPos) <= 0;
    const calls = [...findMacroCalls(text), ...findFunctionCalls(text)].filter((c) => inBody(c.range) && !inSelection(c.range));
    const reader = readerOutside(calls);
    for (const [name2, how] of made) {
      const what = how === "let" ? `${name2} is /let in the selection, so it would be the new macro's local, gone when it returns` : `${name2} is assigned in the selection with no /let of it in ${owner2}, so unless a global ${name2} exists, the assignment would make a local of the new macro, gone when it returns`;
      const keep = how === "let" ? "keep the /let outside the selection" : `/let or /set ${name2} before the selection, or keep the assignment outside it`;
      if (mentions(outsideText, name2)) return { disabled: `${what}, but ${owner2} uses it outside the selection: ${keep}.` };
      if (reader) return { disabled: `${what}, but ${owner2} also runs ${reader}, which may read it through tf's dynamic scoping: ${keep}.` };
    }
  }
  const own = new Set([...getDocumentSymbols(text)].filter((sym) => sym.kind === "def").map((sym) => sym.name.toLowerCase()));
  const taken = (n) => COMMAND_NAMES2.has(n) || own.has(n) || (options.isTaken?.(n) ?? false);
  const name = newName(symbol, taken);
  const head = entry.text.slice(0, body);
  const defAt = head.search(/\/def\b/i);
  const invisible = defAt >= 0 && defIsInvisible(head, defAt + 4);
  const line = `/def ${invisible ? "-i " : ""}${name} = ${moved}`;
  const lineEntry = splitLogicalEntries(line)[0];
  if (!lineEntry || lineEntry.parts.length !== 1 || lineEntry.text !== line) return void 0;
  const split = splitEntry(lineEntry, [line], options.indent ?? "    ", { headTabs: true });
  const defLines = split && split.length > 1 ? split : [line];
  const call = `/${name} %*`;
  if (!entry.parts.some((p) => p.line === lastPos.line) || entry.parts.filter((p) => p.line >= startPos.line && p.line <= lastPos.line).length !== lastPos.line - startPos.line + 1) {
    return { disabled: "The selection has comment lines between its lines, which would be lost: move them out of the selection first." };
  }
  let insertLine2 = entry.startLine;
  while (insertLine2 > 0 && isCommentLine(lines[insertLine2 - 1] ?? "")) insertLine2 -= 1;
  const gap = insertLine2 > 0 && !isBlankLine(lines[insertLine2 - 1] ?? "") ? "\n" : "";
  const edits = [
    { range: { start: { line: insertLine2, character: 0 }, end: { line: insertLine2, character: 0 } }, newText: `${gap}${defLines.join("\n")}

` },
    { range: { start: startPos, end: { line: lastPos.line, character: lastPos.character + 1 } }, newText: call }
  ];
  const after2 = splitLogicalEntries(applyEdits(text, edits));
  const added = (gap ? 1 : 0) + defLines.length + 1;
  const newDef = after2.find((x) => x.startLine === insertLine2 + (gap ? 1 : 0));
  const newOwner = after2.find((x) => x.startLine === entry.startLine + added);
  const expected = entry.text.slice(0, body + xStart) + call + entry.text.slice(body + xEnd);
  if (!newDef || !newOwner || newOwner.text !== expected) return void 0;
  const newBody = macroBodyStart(newDef.text);
  if (newBody < 0 || newDef.text.slice(0, newBody) !== line.slice(0, macroBodyStart(line))) return void 0;
  const normal = (t) => t.replace(/[ \t]*%;[ \t]*/g, "%;").trim();
  if (normal(newDef.text.slice(newBody)) !== normal(moved)) return void 0;
  if (!parseUnits(newOwner.text.slice(body)).complete || !parseUnits(newDef.text.slice(newBody)).complete) return void 0;
  return { name, edits };
}
function getExtractActions(text, range, options = {}) {
  if (compare(range.start, range.end) >= 0 || text.includes("\r")) return [];
  const lines = splitRawLines(text);
  const entries = splitLogicalEntries(text);
  const entryIndex = entries.findIndex((x) => x.startLine <= range.start.line && x.endLine >= range.end.line - (range.end.character === 0 ? 1 : 0));
  const entry = entries[entryIndex];
  if (!entry || entry.incomplete || !isDefEntry(entry)) return [];
  const symbol = getDocumentSymbols(text).find((sym) => sym.range.start.line === entry.startLine);
  const result = plan(text, lines, entry, entryIndex, range, symbol, options);
  if (!result) return [];
  if ("disabled" in result) return [{ title: TITLE, edits: [], disabled: result.disabled }];
  return [{ title: `${TITLE}, /${result.name}`, edits: result.edits }];
}

// packages/core/src/data/functionEffects.ts
var FUNCTION_EFFECTS = {
  abs: "pure",
  acos: "pure",
  addworld: "effects",
  ascii: "pure",
  ascii_bytes: "pure",
  asin: "pure",
  atan: "pure",
  atcp: "effects",
  calllua: "effects",
  char: "pure",
  char_bytes: "pure",
  columns: "reads",
  cos: "pure",
  cputime: "reads",
  decode_ansi: "pure",
  decode_attr: "pure",
  echo: "effects",
  encode_ansi: "pure",
  encode_attr: "pure",
  eval: "effects",
  exp: "pure",
  fake_recv: "effects",
  fg_world: "reads",
  filename: "reads",
  ftime: "reads",
  fwrite: "effects",
  gethostname: "reads",
  getopts: "effects",
  getpid: "reads",
  gmcp: "effects",
  idle: "reads",
  is_connected: "reads",
  is_open: "reads",
  isatty: "reads",
  kbdel: "effects",
  kbgoto: "effects",
  kbhead: "reads",
  kblen: "reads",
  kbmatch: "reads",
  kbpoint: "reads",
  kbtail: "reads",
  kbwordleft: "reads",
  kbwordright: "reads",
  keycode: "pure",
  lines: "reads",
  ln: "pure",
  log10: "pure",
  mktime: "reads",
  mod: "pure",
  morepaused: "reads",
  morescroll: "effects",
  moresize: "reads",
  msdp: "effects",
  nactive: "reads",
  nlog: "reads",
  nmail: "reads",
  nread: "reads",
  option102: "effects",
  pad: "pure",
  pow: "pure",
  prompt: "effects",
  python: "effects",
  rand: "effects",
  read: "effects",
  regmatch: "effects",
  replace: "pure",
  send: "effects",
  sidle: "reads",
  sin: "pure",
  sqrt: "pure",
  status_fields: "reads",
  status_width: "reads",
  strcat: "pure",
  strchr: "pure",
  strchr_bytes: "pure",
  strcmp: "pure",
  strcmpattr: "pure",
  strip_attr: "pure",
  strlen: "pure",
  strlen_bytes: "pure",
  strncmp: "pure",
  strrchr: "pure",
  strrchr_bytes: "pure",
  strrep: "pure",
  strstr: "pure",
  strstr_bytes: "pure",
  substitute: "effects",
  substr: "pure",
  substr_bytes: "pure",
  systype: "reads",
  tan: "pure",
  test: "effects",
  tfclose: "effects",
  tfflush: "effects",
  tfopen: "effects",
  tfread: "effects",
  tfreadable: "reads",
  tfwrite: "effects",
  time: "reads",
  tolower: "pure",
  toupper: "pure",
  trunc: "pure",
  whatis: "pure",
  winlines: "reads",
  world_info: "reads"
};

// packages/core/src/expressionTree.ts
var ExprSyntaxError = class extends Error {
  constructor(at2) {
    super("expression syntax error");
    this.at = at2;
  }
  at;
};
var isDigit3 = (c) => c !== void 0 && c >= "0" && c <= "9";
var isNameFirst2 = (c) => c !== void 0 && (/[A-Za-z_]/.test(c) || c.charCodeAt(0) >= 128);
var isNameChar3 = (c) => isNameFirst2(c) || isDigit3(c);
var NUMBER_RE = /(?:[0-9]+(?::[0-9]*)*(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/y;
var Reader = class {
  constructor(s, from, to, substitutionEnd3) {
    this.s = s;
    this.to = to;
    this.substitutionEnd = substitutionEnd3;
    this.i = from;
  }
  s;
  to;
  substitutionEnd;
  i;
  ch(k = 0) {
    return this.i + k < this.to ? this.s[this.i + k] : "";
  }
  space() {
    while (this.i < this.to && isTfSpace(this.s[this.i])) this.i += 1;
  }
  fail() {
    throw new ExprSyntaxError(this.i);
  }
  whole() {
    this.space();
    const node = this.comma();
    this.space();
    if (this.i !== this.to) this.fail();
    return node;
  }
  comma() {
    let node = this.assignment();
    while (this.ch() === ",") {
      this.i += 1;
      const right = this.assignment();
      node = { kind: "binary", op: ",", start: node.start, end: right.end, left: node, right };
    }
    return node;
  }
  assignment() {
    const left = this.conditional();
    if (":+-*/".includes(this.ch() || " ") && this.ch(1) === "=") {
      const op = `${this.ch()}=`;
      this.i += 2;
      const right = this.assignment();
      return { kind: "assign", op, start: left.start, end: right.end, left, right };
    }
    return left;
  }
  conditional() {
    const test = this.or();
    if (this.ch() !== "?") return test;
    this.i += 1;
    this.space();
    if (this.ch() === ":") {
      this.i += 1;
      const otherwise2 = this.conditional();
      return { kind: "conditional", start: test.start, end: otherwise2.end, test, otherwise: otherwise2 };
    }
    const then = this.comma();
    if (this.ch() !== ":") this.fail();
    this.i += 1;
    const otherwise = this.conditional();
    return { kind: "conditional", start: test.start, end: otherwise.end, test, then, otherwise };
  }
  or() {
    let node = this.and();
    while (this.ch() === "|") {
      this.i += 1;
      const right = this.and();
      node = { kind: "binary", op: "|", start: node.start, end: right.end, left: node, right };
    }
    return node;
  }
  and() {
    let node = this.relational();
    while (this.ch() === "&") {
      this.i += 1;
      const right = this.relational();
      node = { kind: "binary", op: "&", start: node.start, end: right.end, left: node, right };
    }
    return node;
  }
  relational() {
    let node = this.additive();
    for (; ; ) {
      const c = this.ch();
      const n = this.ch(1);
      let op;
      if (c === "=") op = "~/=".includes(n || " ") ? `=${n}` : "=";
      else if (c === "!" && "~/=".includes(n || " ")) op = `!${n}`;
      else if (c === ">" || c === "<") op = n === "=" ? `${c}=` : c;
      else break;
      this.i += op.length;
      const right = this.additive();
      node = { kind: "binary", op, start: node.start, end: right.end, left: node, right };
    }
    return node;
  }
  additive() {
    let node = this.multiplicative();
    while ((this.ch() === "+" || this.ch() === "-") && this.ch(1) !== "=") {
      const op = this.ch();
      this.i += 1;
      const right = this.multiplicative();
      node = { kind: "binary", op, start: node.start, end: right.end, left: node, right };
    }
    return node;
  }
  multiplicative() {
    let node = this.unary();
    while ((this.ch() === "*" || this.ch() === "/") && this.ch(1) !== "=") {
      const op = this.ch();
      this.i += 1;
      const right = this.unary();
      node = { kind: "binary", op, start: node.start, end: right.end, left: node, right };
    }
    return node;
  }
  unary() {
    this.space();
    const start = this.i;
    const c = this.ch();
    if (c === "!" || c === "+" || c === "-") {
      const op = c !== "!" && this.ch(1) === c ? `${c}${c}` : c;
      this.i += op.length;
      const operand = this.unary();
      return { kind: "prefix", op, start, end: operand.end, operand };
    }
    const primary = this.primary();
    if (this.ch() !== "(") return primary;
    if (primary.kind !== "name") this.fail();
    this.i += 1;
    this.space();
    const args = [];
    if (this.ch() !== ")") {
      for (; ; ) {
        args.push(this.assignment());
        if (this.ch() === ")") break;
        if (this.ch() !== ",") this.fail();
        this.i += 1;
      }
    }
    this.i += 1;
    const end = this.i;
    this.space();
    return { kind: "call", start, end, name: this.s.slice(primary.start, primary.end), args };
  }
  primary() {
    this.space();
    const start = this.i;
    const c = this.ch();
    let node;
    if (isDigit3(c) || c === "." && isDigit3(this.ch(1))) {
      NUMBER_RE.lastIndex = this.i;
      const m = NUMBER_RE.exec(this.s);
      this.i = Math.min(this.to, this.i + (m?.[0].length ?? 1));
      node = { kind: "number", start, end: this.i };
    } else if (c === '"' || c === "'" || c === "`") {
      this.i += 1;
      while (this.i < this.to && this.s[this.i] !== c) this.i += this.s[this.i] === "\\" && (this.s[this.i + 1] === c || this.s[this.i + 1] === "\\") ? 2 : 1;
      if (this.i >= this.to) this.fail();
      this.i += 1;
      node = { kind: "string", start, end: this.i };
    } else if (isNameFirst2(c)) {
      while (isNameChar3(this.ch())) this.i += 1;
      node = { kind: "name", start, end: this.i };
    } else if (c === "$" && this.ch(1) === "[") {
      this.i += 2;
      const inner2 = this.comma();
      if (this.ch() !== "]") this.fail();
      this.i += 1;
      node = { kind: "bracket", start, end: this.i, inner: inner2 };
    } else if (c === "(") {
      this.i += 1;
      const inner2 = this.comma();
      if (this.ch() !== ")") this.fail();
      this.i += 1;
      node = { kind: "paren", start, end: this.i, inner: inner2 };
    } else if (c === "{" || c === "%" || c === "$") {
      const end = this.substitutionEnd(start);
      if (end === void 0 || end > this.to) this.fail();
      this.i = end;
      const what = c !== "$" ? "variable" : this.s[start + 1] === "(" ? "command" : "macro";
      node = { kind: "substitution", what, start, end };
    } else {
      this.fail();
    }
    this.space();
    return node;
  }
};
function parseExpression(s, from, to, substitutionEnd3 = () => void 0) {
  return new Reader(s, from, to, substitutionEnd3).whole();
}
function children(node) {
  switch (node.kind) {
    case "paren":
    case "bracket":
      return [node.inner];
    case "call":
      return node.args;
    case "prefix":
      return [node.operand];
    case "binary":
    case "assign":
      return [node.left, node.right];
    case "conditional":
      return node.then ? [node.test, node.then, node.otherwise] : [node.test, node.otherwise];
    default:
      return [];
  }
}
function alwaysEvaluated(parent, child) {
  if (parent.kind === "binary" && (parent.op === "&" || parent.op === "|")) return child === parent.left;
  if (parent.kind === "conditional") return child === parent.test;
  return true;
}
function pathTo(root, start, end) {
  if (root.start === start && root.end === end) {
    return [root];
  }
  if (root.start > start || root.end < end) return void 0;
  for (const child of children(root)) {
    const path8 = pathTo(child, start, end);
    if (path8) return [root, ...path8];
  }
  return void 0;
}
function nodes(root) {
  const out = [];
  const walk2 = (n) => {
    out.push(n);
    for (const c of children(n)) walk2(c);
  };
  walk2(root);
  return out;
}

// packages/core/src/extractVariable.ts
var TITLE2 = "Extract to a local variable";
var ARITY = new Map(FUNCTIONS.map((f) => [f.name, f]));
var READS_RESULT = /%+\{?\?|\{\?\}/;
var SUBSTITUTED = /[%$\\]/;
function describe(s, n) {
  const t = s.slice(n.start, n.end);
  return t.length > 24 ? `${t.slice(0, 21)}...` : t;
}
function notOneNode(s, root, from, to) {
  const leaves = nodes(root).filter((n) => n.kind === "number" || n.kind === "string" || n.kind === "name" || n.kind === "substitution");
  const cut = leaves.find((n) => from > n.start && from < n.end || to > n.start && to < n.end);
  if (cut) return `The selection cuts ${describe(s, cut)} in two: select the whole of it.`;
  let depth = 0;
  for (let k = from; k < to && depth >= 0; k += 1) {
    if (s[k] === "(" || s[k] === "$" && s[k + 1] === "[") depth += 1;
    else if (s[k] === ")" || s[k] === "]") depth -= 1;
  }
  if (depth !== 0) return "The selection has a parenthesis without its partner: select both, or neither.";
  return "The selection isn't one whole operand, as tf groups the operators around it: select a whole operand, or add parentheses.";
}
function sideEffect(s, n) {
  if (n.kind === "assign") return `${describe(s, n)} assigns a variable`;
  if (n.kind === "prefix" && (n.op === "++" || n.op === "--")) return `${describe(s, n)} changes a variable`;
  if (n.kind === "substitution" && n.what === "command") return `${describe(s, n)} runs commands`;
  if (n.kind === "call") {
    const effect = FUNCTION_EFFECTS[n.name];
    if (effect === void 0) return `${n.name}() isn't one of tf's functions, so it may be a macro with side effects`;
    if (effect === "effects") return `${n.name}() has side effects`;
  }
  return void 0;
}
function innermost(units, end, from, to, block) {
  let best;
  for (const u of units) {
    if (u.block !== block || u.start > from || end(u) < to) continue;
    if (!best || u.start >= best.start) best = u;
  }
  return best;
}
function plan2(text, entry, range, options) {
  const body = macroBodyStart(entry.text);
  if (body < 0) return void 0;
  const sel = selected(entry, range);
  if (sel.from >= sel.to || sel.from < body) return void 0;
  const s = entry.text.slice(body);
  let from = sel.from - body;
  let to = sel.to - body;
  while (from < to && isTfSpace(s[from])) from += 1;
  to = trimEnd2(s, from, to);
  if (from >= to) return void 0;
  const parsed = parseUnits(s);
  const regions = parseRegions(s, "body");
  if (!parsed.complete || regions.stopped) return void 0;
  const subEnds = /* @__PURE__ */ new Map();
  for (const sp of regions.spans) if (sp.kind === "substitution") subEnds.set(sp.start, sp.end);
  const rEnd = (r) => trimEnd2(s, r.start, r.end);
  const holds2 = (r, a, b) => r.start <= a && b <= rEnd(r);
  const cond = regions.spans.find((sp) => sp.kind === "condition" && sp.start === from && sp.end === to);
  if (cond?.inner) {
    from = cond.inner.start;
    while (from < cond.inner.end && isTfSpace(s[from])) from += 1;
    to = trimEnd2(s, from, cond.inner.end);
    if (from >= to) return void 0;
  }
  const containing = regions.expressions.filter((r) => holds2(r, from, to)).sort((a, b) => a.start - b.start || rEnd(b) - rEnd(a));
  const wholeBracket = s.startsWith("$[", from) && subEnds.get(from) === to;
  let root;
  let reference;
  const outer = containing[0];
  if (!outer || outer.kind === "statement" && wholeBracket && !containing.some((r) => r.kind === "bracket")) {
    if (!wholeBracket) {
      const partly = regions.expressions.some((r) => r.start < to && from < rEnd(r) && !(from <= r.start && rEnd(r) <= to));
      return partly ? { disabled: "The selection runs past the end of the expression it starts in: select part of one expression." } : void 0;
    }
    root = regions.expressions.find((r) => r.kind === "bracket" && r.start === from + 2);
    reference = "text";
  } else if (outer.kind === "statement") {
    root = containing.find((r) => r.kind === "bracket") ?? outer;
    reference = "expression";
    if (root === outer && SUBSTITUTED.test(s.slice(outer.start, rEnd(outer)))) {
      return { disabled: "This text is substituted before tf evaluates it, so a %, $ or \\ in it could change how the selection groups: it can't be extracted." };
    }
  } else {
    root = outer;
    reference = "expression";
  }
  if (!root) return void 0;
  for (const r of regions.expressions) {
    if (r.kind === "statement") continue;
    try {
      parseExpression(s, r.start, rEnd(r), (at2) => subEnds.get(at2));
    } catch (e) {
      if (e instanceof ExprSyntaxError) return { disabled: "This macro has an expression tf can't compile, so it never runs: fix that first." };
      throw e;
    }
  }
  let tree;
  try {
    tree = parseExpression(s, root.start, rEnd(root), (at2) => subEnds.get(at2));
  } catch (e) {
    if (e instanceof ExprSyntaxError) return { disabled: "This expression couldn't be read, so its parts can't be told apart: fix it first." };
    throw e;
  }
  const valueFrom = reference === "text" ? root.start : from;
  const valueTo = reference === "text" ? rEnd(root) : to;
  const path8 = reference === "text" ? [tree] : pathTo(tree, from, to);
  if (!path8) return { disabled: notOneNode(s, tree, from, to) };
  const chosen = path8[path8.length - 1];
  const inner2 = chosen.kind === "bracket" ? chosen.inner : chosen;
  const value = s.slice(chosen.kind === "bracket" ? inner2.start : valueFrom, chosen.kind === "bracket" ? inner2.end : valueTo);
  if (value.includes("	")) return { disabled: "The selection has a tab in it, which tf turns into spaces by column, and its column would change: replace it with spaces first." };
  if (SUBSTITUTED.test(value)) {
    return { disabled: "The selection has a %, $ or \\, which the /test it would move to substitutes once more before evaluating it: it can't be extracted as it is." };
  }
  for (const n of nodes(inner2)) {
    const effect = sideEffect(s, n);
    if (effect) return { disabled: `In the selection, ${effect}, and it would be evaluated earlier than it is now: leave that out of the selection.` };
    if (n.kind === "call") {
      const f = ARITY.get(n.name);
      if (f && (n.args.length < f.min || f.max !== null && n.args.length > f.max)) {
        return { disabled: `${n.name}() has the wrong number of arguments, which tf reports when the macro is compiled; in the /test it would only be reported when that runs: fix the call first.` };
      }
    }
    if (n.kind === "conditional" && n.then) {
      return { disabled: "The selection has a ? : in it, which crashes tf when its condition is true and its value is used, as it would be in the /test: it can't be extracted." };
    }
  }
  for (let k = 1; k < path8.length; k += 1) {
    const parent = path8[k - 1];
    if (!alwaysEvaluated(parent, path8[k])) {
      const where2 = parent.kind === "conditional" ? "in a branch of ?:" : `on the right of ${parent.kind === "binary" ? parent.op : ""}`;
      return { disabled: `The selection is ${where2}, which tf only evaluates some of the time, but the /let before the statement would evaluate it every time: select the whole condition instead.` };
    }
  }
  for (let k = path8.length - 1; k > 0; k -= 1) {
    const parent = path8[k - 1];
    const child = path8[k];
    if (parent.kind === "assign" && parent.left === child || parent.kind === "prefix" && (parent.op === "++" || parent.op === "--")) {
      return { disabled: "The selection is the variable this assigns to, which can't be replaced by another: select the value instead." };
    }
    if (parent.kind === "call") {
      if (parent.name === "tfread" && parent.args[parent.args.length - 1] === child) {
        return { disabled: "The selection is the variable tfread() reads into, which can't be replaced by another: it can't be extracted." };
      }
      if (parent.name === "whatis") return { disabled: "whatis() would see a variable in place of the selection's value, and say id: before its type: it can't be extracted." };
      break;
    }
    const passes = parent.kind === "paren" || parent.kind === "bracket" || parent.kind === "conditional" && (child !== parent.test || parent.then === void 0) || parent.kind === "binary" && (parent.op === "|" || parent.op === "&" || parent.op === "," && parent.right === child);
    if (!passes) break;
  }
  const substitutedBracket = root.kind === "bracket" && !regions.expressions.some((r) => r !== root && r.kind !== "statement" && r.start <= root.start && rEnd(root) <= rEnd(r));
  if (substitutedBracket && nodes(tree).some((n) => n.kind === "binary" && n.op === ",")) {
    return { disabled: "tf mis-compiles the , in this $[...], losing the text before it, so rewriting it can't be checked: it can't be extracted." };
  }
  const within = regions.spans.find((sp) => sp.kind === "substitution" && sp.start < from && to <= sp.end && (s[sp.start] === "%" || s[sp.start] === "{" || s.startsWith("${", sp.start) || s.startsWith("$(", sp.start)));
  if (within) {
    return s.startsWith("$(", within.start) ? { disabled: "The selection is inside a $(...), whose commands run on their own: it can't be extracted from there." } : { disabled: "The selection is in the default of a substitution, which tf only evaluates when the variable is empty: it can't be extracted from there." };
  }
  const end = (u) => trimEnd2(s, u.start, u.end);
  let holder;
  let evaluated;
  if (root.kind === "condition" && !containing.some((r) => r.kind === "statement")) {
    const opener = /\/[@!]*(if|elseif|while)\s*\($/i.exec(s.slice(0, root.start))?.[1]?.toLowerCase();
    if (opener === "while") return { disabled: "A /while's condition is evaluated on every turn of the loop, but a /let before the /while would run once: it can't be extracted." };
    if (opener === "elseif") return { disabled: "An /elseif's condition is only evaluated when the conditions before it are false, but a /let before the /if would always run: it can't be extracted." };
    holder = parsed.units.find((u) => u.block && u.word === "if" && /^\/[@!]*if\s*\($/i.test(s.slice(u.start, root.start)));
    evaluated = { start: root.start, end: rEnd(root) };
  } else {
    holder = innermost(parsed.units, end, from, to, false);
    evaluated = holder ? { start: holder.start, end: end(holder) } : { start: 0, end: 0 };
  }
  if (!holder) return void 0;
  const kind = parsed.lists[holder.list]?.kind;
  if (kind === "condition") return { disabled: "The selection is in an /if or /while condition list, where a /let would become part of the condition: it can't be extracted." };
  if (kind === "cmdsub") return { disabled: "The selection is inside a $(...), whose commands run on their own: it can't be extracted from there." };
  if (regions.spans.some((sp) => sp.kind === "substitution" && s.startsWith("$(", sp.start) && sp.start >= evaluated.start && sp.end <= from)) {
    return { disabled: "The statement runs a $(...) before the selection, which would now be evaluated first: it can't be extracted." };
  }
  const evaluatedRegions = regions.expressions.filter((r) => r.start >= evaluated.start && rEnd(r) <= evaluated.end && r.start < from);
  for (const r of evaluatedRegions) {
    if (regions.expressions.some((o) => o !== r && o.start <= r.start && rEnd(r) <= rEnd(o) && o.start >= evaluated.start && rEnd(o) <= evaluated.end && (o.start < r.start || rEnd(o) > rEnd(r)))) continue;
    let t;
    try {
      t = parseExpression(s, r.start, rEnd(r), (at2) => subEnds.get(at2));
    } catch {
      return { disabled: "The statement before the selection couldn't be read to check that it changes nothing: it can't be extracted." };
    }
    for (const n of nodes(t)) {
      if (n.end > from) continue;
      const effect = sideEffect(s, n);
      if (effect) return { disabled: `Before the selection, ${effect}, and the selection would now be evaluated first: it can't be extracted.` };
    }
  }
  const entryCalls2 = (a, b) => {
    const startPos = entry.offsetMap[body + a];
    const lastPos = entry.offsetMap[body + b - 1];
    if (!startPos || !lastPos) return void 0;
    const inside = (r) => compare(r.start, startPos) >= 0 && compare(r.start, lastPos) <= 0;
    return readerOutside([...findMacroCalls(text), ...findFunctionCalls(text)].filter((c) => inside(c.range)));
  };
  const observes = (u, who) => {
    const t = s.slice(u.start, end(u));
    if (READS_RESULT.test(t)) return `${who} reads %?, the last command's result, which the new /let and /test would change: it can't be extracted.`;
    const runs = entryCalls2(u.start, end(u));
    if (runs) return `${who} runs ${runs}, which can read %?, the last command's result, and the new /let and /test would change it: it can't be extracted.`;
    return void 0;
  };
  if (!holder.block) {
    const why = observes(holder, "This statement");
    if (why) return { disabled: why };
  } else {
    if (READS_RESULT.test(s.slice(root.start, rEnd(root)))) return { disabled: "This condition reads %?, the last command's result, which the new /let and /test would change: it can't be extracted." };
    const block = regions.blocks.find((b) => b.start === holder.start);
    if (!block) return void 0;
    let passes = !/\/[@!]*else\s*$/i.test(s.slice(block.start, block.parts[block.parts.length - 1]?.start ?? block.start).trimEnd());
    for (const part of block.parts) {
      const first = parsed.units.filter((u) => u.start >= part.start && u.start < part.end).sort((a, b) => a.start - b.start)[0];
      if (!first) {
        passes = true;
        continue;
      }
      if (first.block) return { disabled: "A branch of this /if starts with another block, which would see %?, the last command's result, that the new /let and /test change: it can't be extracted." };
      const why = observes(first, "The first statement of a branch");
      if (why) return { disabled: why };
    }
    if (passes) {
      const next = parsed.units.filter((u) => u.list === holder.list && u.start > end(holder)).sort((a, b) => a.start - b.start)[0];
      if (!next || next.block || next.word === "break" || next.word === "exit") {
        return { disabled: "When none of this /if's branches runs, it leaves %?, the last command's result, as it was, and the new /let and /test would change what it was: add an /else, or a statement after the /if." };
      }
      const why = observes(next, "The statement after this /if");
      if (why) return { disabled: why };
    }
  }
  let before2 = holder.start;
  while (before2 > 0 && isTfSpace(s[before2 - 1])) before2 -= 1;
  if (before2 >= 2 && s[before2 - 2] === "%" && (s[before2 - 1] === "|" || s[before2 - 1] === "\\") && s[before2 - 3] !== "%") {
    return { disabled: "A %| or %\\ ties this statement to the one before it, and the new statements would come between them: it can't be extracted." };
  }
  const lower = text.toLowerCase();
  let name = "";
  for (let n = 1; ; n += 1) {
    name = n === 1 ? "value" : `value${n}`;
    if (!mentions(lower, name) && !SPECIAL_VARIABLE_NAMES.has(name) && !(options.mentionedOutside?.(name) ?? false)) break;
  }
  const lines = splitRawLines(text);
  const holderPos = entry.offsetMap[body + holder.start];
  const selStart = entry.offsetMap[body + from];
  const selLast = entry.offsetMap[body + to - 1];
  if (!holderPos || !selStart || !selLast) return void 0;
  if (entry.parts.filter((p) => p.line >= selStart.line && p.line <= selLast.line).length !== selLast.line - selStart.line + 1) {
    return { disabled: "The selection has comment lines between its lines, which would be lost: move them out of the selection first." };
  }
  const lead = (lines[holderPos.line] ?? "").slice(0, holderPos.character);
  const ownLine = holderPos.line > entry.startLine && /^[ \t]*$/.test(lead) && entry.parts.some((p) => p.line === holderPos.line);
  const spacing = /%;( *)\\\s*$/.exec(lines.slice(entry.startLine, entry.endLine + 1).find((l) => /%;( *)\\\s*$/.test(l)) ?? "")?.[1] ?? "";
  const statements = [`/let ${name}=`, `/test ${name}:=(${value})`];
  const inserted = ownLine ? statements.map((st) => `${st}%;${spacing}\\
${lead}`).join("") : statements.map((st) => `${st}%; `).join("");
  const ref = reference === "text" ? s[from - 1] === "%" ? `$[{${name}}]` : `%{${name}}` : `{${name}}`;
  const selRange = { start: selStart, end: { line: selLast.line, character: selLast.character + 1 } };
  const edits = compare(holderPos, selStart) === 0 ? [{ range: selRange, newText: inserted + ref }] : [{ range: { start: holderPos, end: holderPos }, newText: inserted }, { range: selRange, newText: ref }];
  const out = splitLogicalEntries(applyEdits(text, edits)).find((x) => x.startLine === entry.startLine);
  const expected = `${s.slice(0, holder.start)}${statements.map((st) => `${st}%;`).join("")}${s.slice(holder.start, from)}${ref}${s.slice(to)}`;
  const normal = (t) => t.replace(/[ \t]*%;[ \t]*/g, "%;");
  if (!out || out.incomplete || out.text.slice(0, body) !== entry.text.slice(0, body) || normal(out.text.slice(body)) !== normal(expected)) return void 0;
  if (!parseUnits(out.text.slice(body)).complete) return void 0;
  return { name, edits, at: { line: holderPos.line, character: holderPos.character + "/let ".length } };
}
function getExtractVariableActions(text, range, options = {}) {
  if (compare(range.start, range.end) >= 0 || text.includes("\r")) return [];
  const entries = splitLogicalEntries(text);
  const entry = entries.find((x) => x.startLine <= range.start.line && x.endLine >= range.end.line - (range.end.character === 0 ? 1 : 0));
  if (!entry || entry.incomplete || !isDefEntry(entry)) return [];
  const result = plan2(text, entry, range, options);
  if (!result) return [];
  if ("disabled" in result) return [{ title: TITLE2, edits: [], disabled: result.disabled }];
  return [{ title: TITLE2, edits: result.edits, rename: { at: result.at, name: result.name } }];
}

// packages/core/src/workspace/loadPathDiagnostics.ts
var path3 = __toESM(require("node:path"));

// packages/core/src/workspace/loadGraph.ts
var path2 = __toESM(require("node:path"));

// packages/core/src/workspace/settings.ts
var path = __toESM(require("node:path"));
function toLocalPath(p, mappings) {
  if (mappings.length === 0 || /^[\\/]{2}/.test(p)) return p;
  const forward = path.posix.normalize(p.replace(/\\/g, "/"));
  for (const m of mappings) {
    if (forward === m.tf || forward.startsWith(m.tf === "/" ? "/" : `${m.tf}/`)) {
      return path.join(m.local, forward.slice(m.tf === "/" ? 1 : m.tf.length));
    }
  }
  return p;
}
function toTfPath(p, mappings) {
  for (const m of mappings) {
    const rel = path.relative(m.local, p);
    if (rel === "" || !rel.startsWith("..") && !path.isAbsolute(rel)) {
      const tail = rel.replace(/\\/g, "/");
      return tail === "" ? m.tf : `${m.tf === "/" ? "" : m.tf}/${tail}`;
    }
  }
  return void 0;
}
function mappingsOf(raw, folder, home) {
  return (raw.pathMappings ?? []).filter((m) => typeof m?.tf === "string" && typeof m?.local === "string" && m.tf.startsWith("/") && m.local.trim() !== "").map((m) => ({ tf: path.posix.normalize(m.tf.replace(/\\/g, "/")).replace(/\/+$/, "") || "/", local: absolute(m.local, folder, home, []) })).sort((a, b) => b.tf.length - a.tf.length);
}
function absolute(p, folder, home, mappings) {
  const expanded = p === "~" || p.startsWith("~/") || p.startsWith("~\\") ? home + p.slice(1) : p;
  return path.resolve(folder, toLocalPath(expanded, mappings));
}
function resolveSettings(raw, folder, environment) {
  const userHome = environment.homedir;
  const pathMappings = mappingsOf(raw, folder, userHome);
  const home = raw.homeDirectory ? absolute(raw.homeDirectory, folder, userHome, pathMappings) : userHome;
  const abs = (p) => absolute(p, folder, home, pathMappings);
  let entryFiles = (raw.entryFiles ?? []).filter((f) => f.trim() !== "").map(abs);
  if (entryFiles.length === 0) {
    const candidates = [
      path.join(folder, ".tfrc"),
      path.join(folder, "tfrc"),
      path.join(folder, "tfrc.tf"),
      path.join(home, ".tfrc"),
      path.join(home, "tfrc")
    ];
    const found = candidates.find((c) => environment.exists(c));
    entryFiles = found ? [found] : [];
  }
  const library = raw.libraryPath?.trim() || environment.env.TFLIBDIR;
  const tfPath = raw.tfPath && raw.tfPath.length > 0 ? raw.tfPath.map(abs) : (environment.env.TFPATH ?? "").split(/\s+/).filter(Boolean);
  const named = Object.entries(raw.contexts ?? {}).map(([name, files]) => ({ name, entryFiles: (Array.isArray(files) ? files : [files]).filter((f) => typeof f === "string").filter((f) => f.trim() !== "").map(abs) })).filter((c) => c.entryFiles.length > 0);
  const contexts = named.length > 0 ? named : [{ name: "default", entryFiles }];
  const active = contexts.find((c) => c.name === raw.activeContext) ?? contexts[0];
  return {
    entryFiles: contexts[0].entryFiles,
    contexts,
    activeContext: active.name,
    libraryDir: library ? abs(library) : void 0,
    tfPath,
    workingDir: raw.workingDirectory ? abs(raw.workingDirectory) : folder,
    home,
    pathMappings,
    variables: Object.fromEntries(
      Object.entries(raw.variables ?? {}).filter(([name, value]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && typeof value === "string")
    )
  };
}

// packages/core/src/workspace/loadGraph.ts
var LOADED_RE = /^\s*\/loaded\s+(\S+)/i;
function isForeignPath(p) {
  return process.platform === "win32" && /^[\\/](?![\\/])/.test(p);
}
function fileKey(file) {
  const resolved = path2.resolve(file);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
function expandVariables(text, vars) {
  let missing;
  const value = text.replace(
    /%(%+)|%\{([^}-]+)(?:-([^}]*))?\}|%([A-Za-z_][A-Za-z0-9_]*)/g,
    (_whole, percents2, braced, fallback, bare) => {
      if (percents2 !== void 0) return percents2;
      const name = braced ?? bare;
      const v = vars.get(name);
      if (v !== void 0 && v !== "") return v;
      if (fallback !== void 0) return fallback;
      missing ??= name;
      return "";
    }
  );
  return missing ? { ok: false, reason: `%{${missing}} is not set to literal text on this load path`, variable: missing } : { ok: true, value };
}
function resolveLoadPath(file, env) {
  const mappings = env.pathMappings ?? [];
  const under = (dir, rel, local) => local ? path2.join(dir, rel) : path2.normalize(toLocalPath(`${dir}/${rel}`, mappings));
  if (file.startsWith("~")) {
    const underHome = file === "~" || file.startsWith("~/");
    const named = underHome ? env.home + file.slice(1) : file;
    const mapped = underHome && env.local?.home ? named : toLocalPath(named, mappings);
    const target2 = mapped === named ? path2.resolve(env.workingDir, named) : path2.normalize(mapped);
    return { found: env.readFile(target2) !== void 0 ? target2 : void 0, searched: [target2] };
  }
  const target = file;
  const candidates = [];
  if (path2.isAbsolute(target)) {
    candidates.push(path2.normalize(toLocalPath(target, mappings)));
  } else {
    candidates.push(path2.join(env.workingDir, target));
    if (env.tfPath.length > 0) {
      for (const dir of env.tfPath) if (path2.isAbsolute(dir)) candidates.push(under(dir, target, env.local?.tfPath));
    } else if (env.libraryDir && path2.isAbsolute(env.libraryDir)) {
      candidates.push(under(env.libraryDir, target, env.local?.libraryDir));
    }
  }
  return { found: candidates.find((c) => env.readFile(c) !== void 0), searched: candidates };
}
function buildLoadGraph(options) {
  const vars = /* @__PURE__ */ new Map([
    ["TFLIBDIR", options.libraryDir ?? ""],
    ["TFPATH", (options.tfPath ?? []).join(" ")],
    ["HOME", options.home ?? ""]
  ]);
  const unknown = /* @__PURE__ */ new Set();
  const guarded = /* @__PURE__ */ new Set();
  const local = new Set(vars.keys());
  const seeded = /* @__PURE__ */ new Set();
  function searchEnv() {
    const libraryDir = vars.get("TFLIBDIR") || void 0;
    return {
      home: vars.get("HOME") ?? "",
      tfPath: (vars.get("TFPATH") ?? "").split(/\s+/).filter(Boolean),
      ...libraryDir === void 0 ? {} : { libraryDir },
      local: { home: local.has("HOME"), tfPath: local.has("TFPATH"), libraryDir: local.has("TFLIBDIR") }
    };
  }
  const files = /* @__PURE__ */ new Map();
  const tokens = /* @__PURE__ */ new Set();
  const unresolved = [];
  const resolved = [];
  let seq = 0;
  let inStdlib = false;
  function resolve4(file) {
    const env = searchEnv();
    const tfPath = env.tfPath;
    const result = resolveLoadPath(file, {
      ...env,
      workingDir: options.workingDir,
      ...options.pathMappings ? { pathMappings: options.pathMappings } : {},
      readFile: options.readFile
    });
    if (result.found !== void 0 && result.found === result.searched[0] && !/^~(?:\/|$)/.test(file)) return result;
    const needs = /^~(?:\/|$)/.test(file) ? ["HOME"] : file.startsWith("~") || path2.isAbsolute(file) ? [] : ["TFPATH", ...tfPath.length > 0 ? [] : ["TFLIBDIR"]];
    const unknownVar = needs.find((v) => unknown.has(v));
    return unknownVar ? { searched: result.searched, unknownVar } : result;
  }
  function valueAfter(text, pending) {
    let value = text;
    for (const level of pending) {
      if (level === "newline") value = shortenPercents(value);
      if (level !== "full") continue;
      const expanded = expandVariables(value, vars);
      if (!expanded.ok) return expanded;
      value = expanded.value;
    }
    return { ok: true, value };
  }
  function unknownValue(variable, reason) {
    return guarded.has(variable) ? { kind: "guarded-variable", reason: `%{${variable}} is set inside an /if or /while on the load path` } : { kind: "unknown-variable", reason };
  }
  function handleLoad(entry, load, from) {
    const line = entry.startLine;
    const raw = entry.text.slice(load.start, load.end);
    let file = load.file;
    const fail = (k, reason, searched2 = [], variable) => {
      unresolved.push({ from, line, start: load.start, end: load.end, kind: k, raw, file, reason, searched: searched2, ...variable ? { variable } : {} });
    };
    const namesVariable = /%\{|%[A-Za-z_]/.test(raw.replace(/%%+/g, ""));
    if (load.plain && namesVariable) {
      return fail("not-substituted", "a top-level path is not substituted; prefix the line with /eval");
    }
    const value = valueAfter(file, load.pending);
    if (!value.ok) {
      const why = unknownValue(value.variable, value.reason);
      return fail(why.kind, why.reason, [], value.variable);
    }
    file = value.value;
    file = load.kind === "require" ? file.trim().split(/[ \t\r\f\v]+/).join(" ") : file.trim();
    if (!file) return;
    const { found, searched, unknownVar } = resolve4(file);
    if (unknownVar) {
      const why = unknownValue(unknownVar, `%{${unknownVar}} is not set to literal text on this load path`);
      return fail(why.kind, why.reason, searched, unknownVar);
    }
    if (!found) {
      if (/^~(?:\/|$)/.test(file) && !vars.get("HOME")) return fail("unknown-variable", "HOME isn't known on this load path", [], "HOME");
      if (namesVariable && !load.pending.includes("full")) return fail("not-substituted", "this path is not substituted here; prefix the command with /eval", searched);
      const user = /^~([^/]+)/.exec(file)?.[1];
      if (user) return fail("user-home", `~${user} is user ${user}'s home directory, unless there is no such user`, searched);
      return fail("not-found", "file not found", searched);
    }
    resolved.push({ from, line, offset: load.start, raw, file: path2.resolve(found), kind: load.kind });
    walk2(found, { kind: load.kind, from, line });
  }
  function walk2(file, site) {
    const key2 = fileKey(file);
    const existing = files.get(key2);
    if (existing) {
      existing.sites.push(site);
      return;
    }
    const text = options.readFile(file);
    if (text === void 0) return;
    const loaded = { path: path2.resolve(file), text, sites: [site], defs: [], stdlib: inStdlib, searchEnv: searchEnv() };
    files.set(key2, loaded);
    const entries = splitLogicalEntries(text);
    const abort = findAbortEntry(entries);
    const usable = (abort ? entries.slice(0, abort.entryIndex) : entries).filter((e) => !e.incomplete);
    const defsByLine = /* @__PURE__ */ new Map();
    for (const s of getDocumentSymbols(text)) if (s.kind === "def") defsByLine.set(s.range.start.line, s);
    for (const entry of usable) {
      if (entry.isDefBody || entry.isOtherMacroBody) {
        const symbol = defsByLine.get(entry.startLine);
        if (symbol) loaded.defs.push({ file: loaded.path, symbol, seq: seq++ });
        continue;
      }
      const token = LOADED_RE.exec(entry.text)?.[1];
      if (token !== void 0) {
        if (tokens.has(token) && site.kind === "require") break;
        tokens.add(token);
        continue;
      }
      if (entry.isForLoop) continue;
      for (const command2 of entryCommands(entry)) {
        if (!command2.topLevel) continue;
        if (command2.kind !== "set") {
          handleLoad(entry, command2, loaded.path);
          continue;
        }
        if (command2.name === "TFPATH" || command2.name === "TFLIBDIR" || command2.name === "HOME") local.delete(command2.name);
        if (command2.conditional && seeded.has(command2.name)) continue;
        const value = valueAfter(command2.value, command2.pending);
        if (value.ok && !command2.conditional) {
          vars.set(command2.name, value.value);
          unknown.delete(command2.name);
          guarded.delete(command2.name);
          seeded.delete(command2.name);
        } else if (!value.ok || vars.get(command2.name) !== value.value) {
          vars.delete(command2.name);
          unknown.add(command2.name);
          if (command2.conditional) guarded.add(command2.name);
          else guarded.delete(command2.name);
        }
      }
    }
  }
  if (options.libraryDir) {
    const stdlib = path2.join(options.libraryDir, "stdlib.tf");
    if (options.readFile(stdlib) !== void 0) {
      inStdlib = true;
      walk2(stdlib, { kind: "stdlib" });
      inStdlib = false;
    }
  }
  for (const [name, value] of Object.entries(options.variables ?? {})) {
    vars.set(name, value);
    unknown.delete(name);
    guarded.delete(name);
    local.delete(name);
    seeded.add(name);
  }
  for (const entry of options.entryFiles) walk2(entry, { kind: "entry" });
  return { files: [...files.values()], unresolved, resolved };
}

// packages/core/src/workspace/loadPathDiagnostics.ts
var COMMAND_NAMES3 = new Set(ALL_COMMANDS.map((c) => c.name.toLowerCase()));
var ANY_DEF_RE = /(?:^|[\s;|(])\/@?def\b((?:\s+-(?:[^\s"'`]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)*)*)\s+([^\s=]+)/gi;
function macroNames(text) {
  const names = /* @__PURE__ */ new Map();
  const prefixes = [];
  for (const m of text.matchAll(ANY_DEF_RE)) {
    const written = m[2];
    const name = written.toLowerCase();
    const dynamic = name.search(/[%$]/);
    if (dynamic === -1) {
      if (!names.has(name)) names.set(name, written);
    } else if (dynamic > 0) prefixes.push(name.slice(0, dynamic));
  }
  return { names, prefixes };
}
function countDefsOf(text, name) {
  let n = 0;
  for (const m of text.matchAll(ANY_DEF_RE)) {
    const written = m[2].toLowerCase();
    const dynamic = written.search(/[%$]/);
    if (dynamic === -1 ? written === name : dynamic > 0 && name.startsWith(written.slice(0, dynamic))) n += 1;
  }
  return n;
}
function defines(defs, name) {
  return defs.names.has(name) || defs.prefixes.some((p) => name.startsWith(p));
}
function unfollowedOnPath(graph, label = (f) => path3.basename(f)) {
  return graph.unresolved.filter((u) => u.kind === "unknown-variable" || u.kind === "guarded-variable" || u.kind === "user-home" || u.searched.some(isForeignPath)).map((u) => ({ raw: u.raw, label: label(u.from), line: u.line }));
}
function onPathNames(graph, file, ownText, namesOf) {
  const names = new Map([...COMMAND_NAMES3].map((n) => [n, n]));
  const prefixes = [];
  for (const [f, text] of [[file, ownText], ...graph.files.map((g) => [g.path, g.text])]) {
    const d = namesOf(f, text);
    for (const [n, written] of d.names) if (!names.has(n)) names.set(n, written);
    prefixes.push(...d.prefixes);
  }
  for (const f of graph.files) {
    for (const d of f.defs) if (!names.has(d.symbol.name.toLowerCase())) names.set(d.symbol.name.toLowerCase(), d.symbol.name);
  }
  return { names, prefixes };
}
function ignored(patterns, name) {
  return patterns.some((p) => {
    const re = new RegExp(`^${p.toLowerCase().split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
    return re.test(name);
  });
}
function editDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    const row = rows[i];
    const up = rows[i - 1];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(up[j] + 1, row[j - 1] + 1, up[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        row[j] = Math.min(row[j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}
function nearestName(name, candidates) {
  if (name.length < 4) return void 0;
  const limit = name.length >= 6 ? 2 : 1;
  let best;
  let bestDistance = Infinity;
  let tied = false;
  for (const c of candidates) {
    if (Math.abs(c.length - name.length) > limit) continue;
    const d = editDistance(name, c);
    if (d < bestDistance) {
      best = c;
      bestDistance = d;
      tied = false;
    } else if (d === bestDistance) {
      tied = true;
    }
  }
  return best !== void 0 && bestDistance <= limit && bestDistance > 0 && !tied ? best : void 0;
}
function insertLine(text, lines, line) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const count = text.endsWith("\n") ? lines.length - 1 : lines.length;
  const loaded = lines.findIndex((l) => /^\s*\/loaded\s/i.test(l));
  let at2;
  if (loaded >= 0) {
    at2 = loaded + 1;
  } else {
    at2 = 0;
    while (at2 < count && (isCommentLine(lines[at2]) || lines[at2].trim() === "")) at2 += 1;
    let doc = at2;
    while (doc > 0 && /^\s*;;;/.test(lines[doc - 1])) doc -= 1;
    if (doc > 0 && at2 < count) at2 = doc;
  }
  if (at2 < count) return { range: { start: { line: at2, character: 0 }, end: { line: at2, character: 0 } }, newText: `${line}${eol}` };
  const last = Math.max(0, count - 1);
  const end = { line: last, character: (lines[last] ?? "").replace(/\r$/, "").length };
  return { range: { start: end, end }, newText: count === 0 ? `${line}${eol}` : `${eol}${line}` };
}
function guardedByIsmacro(lines, line, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const guard = new RegExp(`ismacro\\W{1,3}${escaped}\\b`, "i");
  for (let i = line; i >= Math.max(0, line - 5); i -= 1) if (guard.test(lines[i] ?? "")) return true;
  return false;
}
function rangeOf3(lines, entries, u) {
  const entry = entries.find((e) => e.startLine === u.line);
  const from = entry?.offsetMap[u.start];
  const last = entry?.offsetMap[u.end - 1];
  if (from && last) return { start: { ...from }, end: { line: last.line, character: last.character + 1 } };
  const text = lines[u.line] ?? "";
  const start = text.length - text.trimStart().length;
  return { start: { line: u.line, character: start }, end: { line: u.line, character: text.trimEnd().length } };
}
function unresolvedDetail(u) {
  if (u.kind === "unknown-variable" && u.variable !== "HOME") {
    const named = u.variable ? ` To have it checked, give %{${u.variable}} a value in tfscript.variables.` : "";
    return {
      message: `This load can't be followed here: ${u.reason}.${named}`,
      label: "can't follow",
      explanation: `tf works the path out when it runs. This check only follows paths built from literal ${code("/set")} values and ${code("tfscript.variables")}, so it can't tell whether tf will find the file.`
    };
  }
  if (u.kind === "unknown-variable" && u.variable === "HOME") {
    return {
      message: `This load can't be followed here: ${u.reason}, and ~ means tf's HOME: set tfscript.homeDirectory.`,
      label: "can't follow",
      explanation: `A path starting with ${code("~")} is under tf's ${code("HOME")}, which this check takes from ${code("tfscript.homeDirectory")}.`
    };
  }
  if (u.kind === "guarded-variable") {
    return {
      message: `This load can't be followed here: %{${u.variable}} is set inside an /if or /while on the load path, and this check can't tell whether that /set runs. To have it checked, give %{${u.variable}} a value in tfscript.variables.`,
      label: "can't follow",
      explanation: `${code("tfscript.variables")} gives variables the value they have when tf starts, as if ${code("/set")} then, for example ${code(`{ "${u.variable}": "/path/as/tf/sees/it" }`)}. Such a value stands through a ${code("/set")} inside an ${code("/if")} or ${code("/while")}, the way the default-value idiom leaves a variable that is already set.`
    };
  }
  if (u.kind === "user-home") {
    const user = /^~([^/]+)/.exec(u.file)?.[1] ?? "";
    return {
      message: `This load can't be followed here, since ~${user} depends on whether user ${user} exists: write the full path to have it checked.`,
      label: "can't follow",
      explanation: `tf takes ${code(`~${user}`)} from user ${code(user)}'s home directory, or, if there is no such user, as a folder named ${code(`~${user}`)} in its current directory. ${userHomeExplanation(u)}`
    };
  }
  const shown = u.file === u.raw ? `"${u.raw}"` : `"${u.raw}" (${u.file})`;
  if (/^~(?:\/|$)/.test(u.file)) {
    return {
      message: `tf won't find ${shown} in its HOME directory (${u.searched[0] ?? ""}): fix the path.`,
      label: "not found",
      explanation: `A path starting with ${code("~/")} is under tf's ${code("HOME")} (${code("tfscript.homeDirectory")} here), and tf looks nowhere else for it.`
    };
  }
  if (u.file.startsWith("~") || path3.isAbsolute(u.file)) {
    const unmapped = u.file.startsWith("/") && path3.normalize(u.file) === path3.normalize(u.searched[0] ?? "");
    return {
      message: unmapped ? `tf won't find ${shown}: fix the path, or if tf runs where that path exists, map it with tfscript.pathMappings.` : `tf won't find ${shown}: fix the path.`,
      label: "not found",
      explanation: `The path is absolute, so tf looks only at ${u.searched.map((s) => code(s)).join(", ")}.` + (unmapped ? ` If tf runs in a container or on another machine, ${code("tfscript.pathMappings")} says where its paths are here, for example ${code('[{ "tf": "/wotmud", "local": "C:/Users/me/wotmud" }]')}.` : "")
    };
  }
  return {
    message: `tf won't find ${shown}: fix the path, or set tfscript.workingDirectory to the folder tf runs in.`,
    label: "not found",
    explanation: `tf would try, in order: ${u.searched.map((s) => code(s)).join(", ")}. A relative path is looked up from tf's current directory (${code("tfscript.workingDirectory")}), then ${code("TFPATH")}, not from this file's folder.`
  };
}
function userHomeExplanation(u) {
  const user = /^~([^/]+)/.exec(u.file)?.[1] ?? "";
  const rest = u.file.slice(user.length + 1);
  return `If \`${user}\` is misspelt, or there is no such user, tf doesn't warn: it reads \`./~${user}${rest}\` from its current directory instead.`;
}
var UNDEFINED_EXPLANATION = `tf looks the name up when the command runs, and with no macro or command of that name it prints ${code("NAME: no such command or macro")}, sets ${code("%?")} to 1 and goes on with the next command. This check looked in this file, the files on its load path, the other tf files in the workspace and tf's library. A macro made while tf runs (${code("/eval /def")}, or a file loaded some other way) isn't seen: add its name to ${code("tfscript.diagnostics.ignoreMacros")}.`;
function undefinedMacros(file, text, lines, graph, onPath, { elsewhere = [], unfollowed = [], requirePath = () => void 0, namesOf = (_f, t) => macroNames(t), readOnly }, ignore) {
  const visible = onPathNames(graph, file, text, namesOf);
  const out = [];
  for (const call of findMacroCalls(text)) {
    if (call.dynamic) continue;
    const name = call.name.toLowerCase();
    if (!/^[A-Za-z0-9_~:]/.test(name) || /[/*]/.test(name)) continue;
    if (/^(?:if|elseif|while|then|else|endif|do|done|break)\(/.test(name)) continue;
    if (defines(visible, name) || ignored(ignore, name)) continue;
    if (guardedByIsmacro(lines, call.range.start.line, name)) continue;
    const there = elsewhere.find((e) => defines(e.defs, name));
    if (there) {
      if (!onPath) continue;
      const where2 = there.library ? `tf's library file ${there.label}` : there.label;
      const required = requirePath(there.file);
      const d2 = {
        range: call.range,
        message: required === void 0 ? `/${call.name} is defined in ${where2}, which isn't on this file's load path: load it first.` : `/${call.name} is defined in ${where2}, which isn't on this file's load path: add /require ${required}.`,
        label: "not loaded",
        explanation: `None of the files tf loads on this file's load path define ${code(`/${call.name}`)}, so unless ${there.label} is loaded some other way first, tf prints ${code(`${call.name}: no such command or macro`)} here.`,
        code: "undefined-macro",
        severity: "information"
      };
      if (required !== void 0) d2.fix = { title: `Add /require ${required}`, edits: [insertLine(text, lines, `/require ${required}`)] };
      out.push(d2);
      continue;
    }
    const close = nearestName(name, visible.names.keys());
    const nearest = close === void 0 ? void 0 : visible.names.get(close) ?? close;
    const blind = unfollowed[0];
    const d = blind ? {
      // A load this check can't follow may well define it: say so, quietly.
      range: call.range,
      message: `/${call.name} isn't defined in any file this check can read, but the load of ${blind.raw} (${blind.label} line ${blind.line + 1}) can't be followed: ` + (nearest ? `did you mean /${nearest}?` : "make that load resolve, or check the name."),
      label: "not found",
      explanation: `${UNDEFINED_EXPLANATION} Loads it couldn't follow, which may define it: ${unfollowed.slice(0, 5).map((u) => `${code(u.raw)} (${u.label} line ${u.line + 1})`).join(", ")}${unfollowed.length > 5 ? `, and ${unfollowed.length - 5} more` : ""}.`,
      code: "undefined-macro",
      severity: "information"
    } : readOnly !== void 0 ? {
      // The folder wasn't read to the end: a file past the limit may define it.
      range: call.range,
      message: `/${call.name} isn't defined on this file's load path, in tf's library, or in the first ${readOnly} tf files of this folder, the most this check reads: ${nearest ? `did you mean /${nearest}?` : "check the name."}`,
      label: "not found",
      explanation: `${UNDEFINED_EXPLANATION} The workspace folder has more tf files than that, which may define it.`,
      code: "undefined-macro",
      severity: "information"
    } : {
      range: call.range,
      message: nearest ? `There's no macro or command /${call.name}: did you mean /${nearest}?` : `There's no macro or command /${call.name} anywhere tf can see: check the name.`,
      label: "not defined",
      explanation: UNDEFINED_EXPLANATION,
      code: "undefined-macro",
      severity: "warning"
    };
    if (nearest) d.fix = { title: `Change to /${nearest}`, edits: [{ range: call.range, newText: nearest }] };
    out.push(d);
  }
  return out;
}
function loadPathDiagnostics(file, text, graph, options, context = {}) {
  const self = fileKey(file);
  const onPath = graph.files.some((f) => fileKey(f.path) === self);
  const lines = splitRawLines(text);
  const out = [];
  if (options.undefinedMacros) {
    const unfollowed = context.unfollowed ?? (onPath ? unfollowedOnPath(graph) : []);
    for (const d of undefinedMacros(file, text, lines, graph, onPath, { ...context, unfollowed }, options.ignoreMacros ?? [])) out.push(d);
  }
  if (!onPath) return out;
  const entries = splitLogicalEntries(text);
  if (options.unresolvedLoads) {
    for (const u of graph.unresolved) {
      if (fileKey(u.from) !== self || u.kind === "not-substituted") continue;
      out.push({
        range: rangeOf3(lines, entries, u),
        ...unresolvedDetail(u),
        code: "unresolved-load",
        severity: u.kind === "not-found" ? "warning" : "information"
      });
    }
  }
  return out;
}

// packages/core/src/inlineMacro.ts
var CALL_RE3 = /^\/([@!]?)([^\s%$\\]+)(?:\s+(.*))?$/s;
var CHANGES_DEFS_RE = /\/@?(?:undef|undefn|undeft|purge|purgedef|edit)\b/i;
var PLAIN_DEF_HEAD_RE = /^\s*\/@?def(?:\s+-i)*\s+\S+\s*=\s*$/i;
function compare2(a, b) {
  return a.line - b.line || a.character - b.character;
}
function runnableBody(entry) {
  const at2 = macroBodyStart(entry.text);
  if (at2 < 0) return void 0;
  let body = entry.text.slice(at2);
  let e = trimEnd2(body, 0, body.length);
  if (e >= 2 && body.slice(e - 2, e) === "%;" && body[e - 3] !== "%" && body[e - 3] !== "\\") e = trimEnd2(body, 0, e - 2);
  body = body.slice(0, e);
  let s = 0;
  while (isTfSpace(body[s])) s += 1;
  return body.slice(s);
}
function findCallee(text, entries, name) {
  const symbols = getDocumentSymbols(text).filter((s) => s.kind === "def" && s.name.toLowerCase() === name);
  if (symbols.length === 0) return void 0;
  if (symbols.length > 1 || countDefsOf(text, name) > 1) return { disabled: `/${name} is defined more than once in this file, so which body a call runs depends on the order: it can't be inlined.` };
  const symbol = symbols[0];
  const entryIndex = entries.findIndex((e) => e.startLine === symbol.range.start.line);
  const entry = entries[entryIndex];
  if (!entry || !entry.isDefBody || entry.incomplete) return void 0;
  const body = runnableBody(entry);
  if (body === void 0) return void 0;
  return { name, entry, entryIndex, symbol, body };
}
function siteAt(entries, pos) {
  const entryIndex = entries.findIndex((e) => e.startLine <= pos.line && e.endLine >= pos.line);
  const entry = entries[entryIndex];
  if (!entry || entry.incomplete || !isDefEntry(entry)) return void 0;
  let offset = -1;
  entry.offsetMap.forEach((p, k) => {
    if (offset < 0 && compare2(p, pos) >= 0) offset = k;
  });
  if (offset < 0) offset = entry.text.length;
  return siteFor(entry, entryIndex, offset);
}
function siteFor(entry, entryIndex, offset) {
  const bodyAt = macroBodyStart(entry.text);
  if (bodyAt < 0 || offset < bodyAt) return void 0;
  const bodyText = entry.text.slice(bodyAt);
  const parsed = parseUnits(bodyText);
  if (!parsed.complete) return void 0;
  const o = offset - bodyAt;
  const holding = parsed.units.filter((u) => !u.block && u.word !== "" && o >= u.start && o <= trimEnd2(bodyText, u.start, u.end));
  holding.sort((a, b) => b.start - a.start);
  const unit = holding[0];
  if (!unit) return void 0;
  return { entry, entryIndex, bodyAt, unit, bodyText, units: parsed.units, lists: parsed.lists };
}
function calledName(site) {
  const m = CALL_RE3.exec(site.bodyText.slice(site.unit.start, trimEnd2(site.bodyText, site.unit.start, site.unit.end)));
  return m ? m[2].toLowerCase() : void 0;
}
function statementTexts(body) {
  return parseStatements(body, "body").map((s) => body.slice(s.start, s.end).trim());
}
function plan3(text, entries, site, callee, options, checkDiagnostics = true) {
  const { entry, unit, bodyText, bodyAt } = site;
  const name = callee.name;
  const callEnd = trimEnd2(bodyText, unit.start, unit.end);
  const m = CALL_RE3.exec(bodyText.slice(unit.start, callEnd));
  if (!m || m[2].toLowerCase() !== name) return void 0;
  if (m[1] === "@") return void 0;
  if (m[1] === "!") return { disabled: `/!${name} negates the result of /${name}, which the inlined statements can't do: call it without the !.` };
  const args = (m[3] ?? "").trim();
  if (args !== "" && args !== "%*" && args !== "%{*}") {
    return { disabled: `This call passes /${name} arguments of its own, which its body would read where the caller's are inlined: only a call with no arguments or with %* can be inlined.` };
  }
  const kind = site.lists[unit.list]?.kind;
  if (kind === "cmdsub") return { disabled: `This call is inside a $(...), whose output it gives: it can't be inlined.` };
  if (kind === "condition") return { disabled: `This call is in a condition list, where only its result counts: it can't be inlined.` };
  if (callee.entryIndex === site.entryIndex) return { disabled: `/${name} calls itself here: a recursive call can't be inlined.` };
  let before2 = unit.start;
  while (before2 > 0 && isTfSpace(bodyText[before2 - 1])) before2 -= 1;
  let after = callEnd;
  while (isTfSpace(bodyText[after])) after += 1;
  const tie = (at2) => bodyText[at2] === "%" && (bodyText[at2 + 1] === "|" || bodyText[at2 + 1] === "\\") && bodyText[at2 - 1] !== "%";
  if (before2 >= 2 && tie(before2 - 2) || tie(after)) return { disabled: `A %| or %\\ ties this call to the statement next to it, which would take only the last inlined statement: it can't be inlined.` };
  if (options.definedOutside?.(name)) return { disabled: `/${name} may also be defined in another file on the load path, which would decide which body this call runs: it can't be inlined.` };
  if (CHANGES_DEFS_RE.test(text) && text.split("\n").some((l) => CHANGES_DEFS_RE.test(l) && mentions(l.toLowerCase(), name))) {
    return { disabled: `This file undefines or edits /${name}, so which body a call runs depends on when: it can't be inlined.` };
  }
  if (callee.entry.startLine > entry.startLine) {
    const runsBetween = entries.some(
      (e) => e.startLine > entry.endLine && e.endLine < callee.entry.startLine && !e.isDefBody && !e.isOtherMacroBody && findMacroCalls(e.text).length > 0
    );
    if (runsBetween) return { disabled: `/${name} is defined after this macro, and a command between them may run this macro before /${name} exists: move the /def of /${name} up first.` };
  }
  const owner2 = ownerName(getDocumentSymbols(text).find((s) => s.range.start.line === entry.startLine));
  const body = callee.body;
  if (body === "") return { disabled: `/${name}'s body is empty, so inlining it would leave an empty statement, which sends a blank line: remove the call instead.` };
  if (body.includes("	")) return { disabled: `/${name}'s body has a tab in it, which tf turns into spaces by column, and its column would change: replace it with spaces first.` };
  const parsed = parseUnits(body);
  if (!parsed.complete) return void 0;
  if (parsed.units.some((u) => u.word === name)) return { disabled: `/${name} calls itself: a recursive macro can't be inlined.` };
  for (const u of parsed.units) {
    if (ENDS_MACRO.has(u.word)) return { disabled: `/${name}'s /${u.word} would end ${owner2} once inlined, not just /${name}: it can't be inlined.` };
    if (u.word === "shift") return { disabled: `/${name}'s /shift would shift ${owner2}'s arguments once inlined: it can't be inlined.` };
    if (u.word === "break") {
      const n = Number(/^\/[@!]*break\s*(\d*)/i.exec(body.slice(u.start, u.end))?.[1] || "1");
      const loops = parsed.units.filter((w) => w.block && w.word === "while" && w.start < u.start && trimEnd2(body, w.start, w.end) >= trimEnd2(body, u.start, u.end)).length;
      if (loops < n) return { disabled: `This /break in /${name} ends /${name}; inlined, it would end the loop the call is in instead: it can't be inlined.` };
    }
  }
  if (/(^|[^\w])getopts\s*\(/.test(body)) return { disabled: `/${name} calls getopts(), which would read ${owner2}'s arguments and set its locals once inlined: it can't be inlined.` };
  if (readsMacroName(body)) return { disabled: `/${name} reads %0, its own name, which would be ${owner2}'s once inlined: it can't be inlined.` };
  if (breaksZero(body)) return { disabled: `tf refuses to compile /${name}'s /break 0: fix it first.` };
  if (args === "" && readsArguments(body)) return { disabled: `/${name} reads its arguments, which this call doesn't pass: inlined, it would read ${owner2}'s. Call it with %* first if that's what it should get.` };
  const callerSymbol = getDocumentSymbols(text).find((s) => s.range.start.line === entry.startLine);
  if (args !== "" && callerSymbol?.kind === "def" && readsArguments(body) && options.calledAsFunction?.(callerSymbol.name.toLowerCase())) {
    return { disabled: `${owner2} is called as a function, ${callerSymbol.name}(...), whose arguments %* hands /${name} split differently: inlined, the body would read ${owner2}'s as they were passed.` };
  }
  const outsideText = `${bodyText.slice(0, unit.start)} ${bodyText.slice(callEnd)}`;
  const callStart = entry.offsetMap[bodyAt + unit.start];
  const callLast = entry.offsetMap[bodyAt + callEnd - 1];
  const bodyPos = entry.offsetMap[bodyAt];
  if (!callStart || !callLast || !bodyPos) return void 0;
  const inCall = (r) => compare2(r.start, callStart) >= 0 && compare2(r.start, callLast) <= 0;
  const inCallerBody = (r) => compare2(r.start, bodyPos) >= 0 && r.start.line <= entry.endLine;
  const lazyReader = () => readerOutside([...findMacroCalls(text), ...findFunctionCalls(text)].filter((c) => inCallerBody(c.range) && !inCall(c.range)));
  if (/(^|[^\w])regmatch\s*\(/.test(body)) {
    if (/%\{?P|\{P/.test(outsideText)) return { disabled: `/${name}'s regmatch() sets %P1 and the rest only inside /${name}, but ${owner2} reads them: inlined, it would change what they read.` };
    const reader = lazyReader();
    if (reader) return { disabled: `/${name}'s regmatch() sets %P1 and the rest only inside /${name}; inlined, ${reader}, which ${owner2} also runs, might read them.` };
  }
  const calleeBodyAt = macroBodyStart(callee.entry.text);
  const made = /* @__PURE__ */ new Map();
  for (const u of parsed.units.filter((w) => w.word === "let")) {
    if (letName(body.slice(u.start, u.end)) === "") return { disabled: `/${name} has a /let whose name is built when it runs, which would be ${owner2}'s local once inlined: it can't be inlined.` };
  }
  for (const o of findVariables(text)) {
    if (o.entry !== callee.entryIndex || o.offset < calleeBodyAt) continue;
    if (o.access === "let") made.set(o.name, "let");
    else if (o.access === "assign" && o.scope === "global" && !made.has(o.name)) made.set(o.name, "assign");
  }
  if (made.size > 0) {
    const caller = site.units.filter((u) => u.word === "let" && u.list === 0 && u.start < unit.start).map((u) => letName(bodyText.slice(u.start, u.end)));
    for (const [v, how] of made) if (how === "assign" && caller.includes(v)) made.delete(v);
  }
  if (made.size > 0 && inLoop(site.units, unit, bodyText)) {
    const v = [...made.keys()][0];
    return { disabled: `This call is inside a /while, and /${name} makes a local ${v}: inlined, the loop's next turn would see the last turn's ${v}, where each call starts without one.` };
  }
  if (made.size > 0) {
    const reader = lazyReader();
    for (const [v, how] of made) {
      const what = how === "let" ? `/${name} /lets ${v}, which would be ${owner2}'s local once inlined` : `/${name} assigns ${v} with no /let of it, which makes a local when no ${v} exists, and once inlined that would be ${owner2}'s`;
      if (mentions(outsideText, v)) return { disabled: `${what}, but ${owner2} uses ${v} itself: it can't be inlined.` };
      if (reader) return { disabled: `${what}, and ${owner2} also runs ${reader}, which may read it through tf's dynamic scoping: it can't be inlined.` };
    }
  }
  const lines = splitRawLines(text);
  if (callStart.line !== callLast.line) return void 0;
  const callLine = lines[callStart.line] ?? "";
  const lead = callLine.slice(0, callStart.character);
  let newText = body;
  if (entry.endLine > entry.startLine && /^\s*$/.test(lead)) {
    const line = `/def __inline = ${body}`;
    const lineEntry = splitLogicalEntries(line)[0];
    const indent = options.indent ?? "    ";
    const laid = lineEntry && lineEntry.text === line ? splitEntry(lineEntry, [line], indent, { headTabs: true }) : void 0;
    if (laid && laid.length > 2) {
      const ending = /%;( *)\\\s*$/;
      const tail = /^%;( *)\\\s*$/.exec(callLine.slice(callLast.character + 1)) ?? lines.slice(entry.startLine, entry.endLine + 1).map((l) => ending.exec(l)).find((x) => x);
      const end = tail ? `%;${tail[1]}\\` : "%;\\";
      newText = laid.slice(1).map((l, k) => k === 0 ? l.slice(indent.length) : lead + l.slice(indent.length)).map((l) => l.endsWith("%;\\") ? l.slice(0, -3) + end : l).join("\n");
    }
  }
  const edits = [{ range: { start: callStart, end: { line: callLast.line, character: callLast.character + 1 } }, newText }];
  return verified(text, entry, bodyAt, unit, callEnd, body, edits, checkDiagnostics) ? { edits } : void 0;
}
function verified(text, entry, bodyAt, unit, callEnd, body, edits, checkDiagnostics) {
  const out = applyEdits(text, edits);
  const after = splitLogicalEntries(out).find((e) => e.startLine === entry.startLine);
  if (!after || after.incomplete) return false;
  const newBodyAt = macroBodyStart(after.text);
  if (newBodyAt < 0 || after.text.slice(0, newBodyAt) !== entry.text.slice(0, bodyAt)) return false;
  const newBody = after.text.slice(newBodyAt);
  if (!parseUnits(newBody).complete) return false;
  const old = entry.text.slice(bodyAt);
  const expected = statementTexts(old.slice(0, unit.start) + body + old.slice(callEnd));
  const got = statementTexts(newBody);
  if (expected.length !== got.length || expected.some((s, k) => s !== got[k])) return false;
  return !checkDiagnostics || !moreDiagnostics(text, out);
}
var lastCount;
function diagnosticCounts(text) {
  if (lastCount?.text === text) return lastCount.counts;
  const counts2 = /* @__PURE__ */ new Map();
  for (const d of getDiagnostics(text)) counts2.set(d.code, (counts2.get(d.code) ?? 0) + 1);
  lastCount = { text, counts: counts2 };
  return counts2;
}
function moreDiagnostics(before2, after) {
  const b = diagnosticCounts(before2);
  const a = /* @__PURE__ */ new Map();
  for (const d of getDiagnostics(after)) a.set(d.code, (a.get(d.code) ?? 0) + 1);
  for (const [code3, n] of a) if (n > (b.get(code3) ?? 0)) return true;
  return false;
}
function removalOf(lines, callee) {
  let first = callee.entry.startLine;
  while (first > 0 && /^\s*;;;/.test(lines[first - 1] ?? "")) first -= 1;
  let last = callee.entry.endLine + 1;
  const blankBefore = first === 0 || isBlankLine(lines[first - 1] ?? "");
  if (blankBefore && last < lines.length && isBlankLine(lines[last] ?? "")) last += 1;
  return { range: { start: { line: first, character: 0 }, end: { line: last, character: 0 } }, newText: "" };
}
function whereCalled(entries, pos) {
  const line = `on line ${pos.line + 1}`;
  const entry = entries.find((e) => e.startLine <= pos.line && e.endLine >= pos.line);
  if (!entry) return line;
  const bodyAt = macroBodyStart(entry.text);
  if (!isDefEntry(entry) || bodyAt < 0) return `at the top level of the file, ${line}`;
  let offset = -1;
  entry.offsetMap.forEach((p, k) => {
    if (offset < 0 && compare2(p, pos) >= 0) offset = k;
  });
  const bodyText = entry.text.slice(bodyAt);
  const parsed = parseUnits(bodyText);
  const o = offset - bodyAt;
  const holder = parsed.units.filter((u) => !u.block && u.start <= o && o < u.end).sort((a, b) => b.start - a.start)[0];
  if (holder && parsed.lists[holder.list]?.kind === "cmdsub") return `inside a $(...) ${line}`;
  if (holder?.word === "def") return `from a /def inside another macro's body, ${line}`;
  if (holder && ["eval", "for", "repeat", "quote", "not"].includes(holder.word)) return `from /${holder.word} text ${line}`;
  return line;
}
function inlineAll(text, entries, callee, options) {
  const name = callee.name;
  if (!PLAIN_DEF_HEAD_RE.test(callee.entry.text.slice(0, macroBodyStart(callee.entry.text)))) {
    return { disabled: `/${name} has options other than -i (a trigger, hook or key binding, say), which removing it would lose: only its calls can be inlined, one at a time.` };
  }
  if (options.mentionedOutside?.(name)) return { disabled: `Another file mentions /${name}, so its /def can't be removed: inline its calls one at a time.` };
  if (findFunctionCalls(text).some((c) => c.name.toLowerCase() === name)) return { disabled: `/${name} is also called as a function, ${name}(...), which can't be inlined: inline its other calls one at a time.` };
  const sites = [];
  for (const [i, e] of entries.entries()) {
    if (e.incomplete || !isDefEntry(e) || i === callee.entryIndex) continue;
    const at2 = macroBodyStart(e.text);
    if (at2 < 0) continue;
    const parsed = parseUnits(e.text.slice(at2));
    for (const u of parsed.units) {
      if (u.block || u.word !== name) continue;
      const site = siteFor(e, i, at2 + u.start);
      if (site && site.unit.start === u.start) sites.push(site);
    }
  }
  const calls = findMacroCalls(text).filter((c) => c.name.toLowerCase() === name);
  if (sites.length === 0) return { disabled: `/${name} has no calls in this file to inline.` };
  if (calls.length !== sites.length) {
    const at2 = (s, o) => s.entry.offsetMap[s.bodyAt + o] ?? { line: -1, character: 0 };
    const atSite = (r) => sites.some((s) => compare2(at2(s, s.unit.start), r.start) <= 0 && compare2(r.start, at2(s, s.unit.end - 1)) <= 0);
    const other = calls.find((c) => !atSite(c.range));
    return { disabled: `/${name} is also run ${other ? whereCalled(entries, other.range.start) : "from text that can't take its body"}, which can't take its body: inline its other calls one at a time.` };
  }
  const mentionCount = text.split("\n").filter((l) => !/^\s*[;#]/.test(l)).reduce((n, l) => n + (l.toLowerCase().match(new RegExp(`(?<![\\w])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "g"))?.length ?? 0), 0);
  if (mentionCount !== sites.length + 1) return { disabled: `This file names /${name} other than in its /def and its calls (in /ismacro or a string, say), so it can't be removed: inline its calls one at a time.` };
  const edits = [];
  for (const site of sites) {
    const p = plan3(text, entries, site, callee, options, false);
    if (!p) return { disabled: `A call to /${name} on line ${(site.entry.offsetMap[site.bodyAt + site.unit.start]?.line ?? 0) + 1} can't be inlined.` };
    if ("disabled" in p) return { disabled: `The call on line ${(site.entry.offsetMap[site.bodyAt + site.unit.start]?.line ?? 0) + 1}: ${p.disabled}` };
    for (const e of p.edits) edits.push(e);
  }
  edits.push(removalOf(splitRawLines(text), callee));
  const out = applyEdits(text, edits);
  if (moreDiagnostics(text, out) || countDefsOf(out, name) !== 0) return { disabled: `Inlining every call to /${name} would change what else the file reports: inline its calls one at a time.` };
  return { edits };
}
function getInlineActions(text, range, options = {}) {
  if (text.includes("\r")) return [];
  const entries = splitLogicalEntries(text);
  const out = [];
  const site = siteAt(entries, range.start);
  const nameAtCall = site ? calledName(site) : void 0;
  let name = nameAtCall;
  if (site && name && site.bodyText.slice(site.unit.start).startsWith("/@")) name = void 0;
  if (!name) {
    const def = getDocumentSymbols(text).find((s) => s.kind === "def" && compare2(s.selectionRange.start, range.start) <= 0 && compare2(range.start, s.selectionRange.end) <= 0);
    if (!def) return [];
    name = def.name.toLowerCase();
  }
  const callee = findCallee(text, entries, name);
  if (!callee) return [];
  const title = `Inline /${"symbol" in callee ? callee.symbol.name : name}`;
  const allTitle = `Inline all calls to /${"symbol" in callee ? callee.symbol.name : name} and remove it`;
  if ("disabled" in callee) return [{ title: nameAtCall ? title : allTitle, edits: [], disabled: callee.disabled }];
  if (options.library) {
    const why = `This file is tf's library, whose macros are there to be redefined by your own files, and a call has to find the redefinition: it is left as a call.`;
    return [...site && nameAtCall === name ? [{ title, edits: [], disabled: why }] : [], { title: allTitle, edits: [], disabled: why }];
  }
  if (site && nameAtCall === name) {
    const p = plan3(text, entries, site, callee, options);
    if (p) out.push("disabled" in p ? { title, edits: [], disabled: p.disabled } : { title, edits: p.edits });
  }
  const all = inlineAll(text, entries, callee, options);
  out.push("disabled" in all ? { title: allTitle, edits: [], disabled: all.disabled } : { title: allTitle, edits: all.edits });
  return out;
}

// packages/core/src/codeActions.ts
function comparePositions(a, b) {
  return a.line - b.line || a.character - b.character;
}
function overlaps(a, b) {
  return comparePositions(a.start, b.end) <= 0 && comparePositions(b.start, a.end) <= 0;
}
function getCodeActions(text, range, diagnostics = getDiagnostics(text)) {
  const seen = /* @__PURE__ */ new Set();
  const actions = [];
  for (const diagnostic of diagnostics) {
    const at2 = overlaps(diagnostic.range, range) || diagnostic.code === "missing-continuation" && !!diagnostic.related?.some((r) => overlaps(r.range, range));
    if (!at2) continue;
    for (const fix of [diagnostic.fix, diagnostic.alternative]) {
      if (!fix) continue;
      const key2 = JSON.stringify(fix.edits);
      if (seen.has(key2)) continue;
      seen.add(key2);
      const preferred = fix === diagnostic.fix && !!diagnostic.alternative && diagnostic.code === "keyword-needs-space";
      actions.push({ title: fix.title, edits: fix.edits, diagnostic, ...preferred ? { preferred } : {} });
    }
  }
  return actions;
}
var QUICK_FIX = "quickfix";
var REFACTOR_REWRITE = "refactor.rewrite";
var REFACTOR_EXTRACT = "refactor.extract";
var REFACTOR_INLINE = "refactor.inline";
var TRIGGER_AUTOMATIC = 2;
function toLspCodeAction(action, uri, toDiagnostic, renameCommand2) {
  const rename = action.disabled === void 0 && renameCommand2 && action.rename ? { command: { title: "Rename", command: renameCommand2, arguments: [uri, action.rename.at, action.rename.name] } } : {};
  return {
    title: action.title,
    kind: action.kind,
    ...action.preferred ? { isPreferred: true } : {},
    ...action.diagnostic ? { diagnostics: [toDiagnostic(action.diagnostic)] } : {},
    ...action.disabled === void 0 ? { edit: { changes: { [uri]: action.edits } } } : { disabled: { reason: action.disabled } },
    ...rename
  };
}
function wants(only, kind) {
  if (!only) return true;
  return only.some((k) => k === "" || kind === k || kind.startsWith(`${k}.`));
}
function routeCodeActions(text, request) {
  const out = [];
  if (wants(request.only, QUICK_FIX)) {
    for (const a of getCodeActions(text, request.range, request.diagnostics)) {
      out.push({ title: a.title, kind: QUICK_FIX, edits: a.edits, diagnostic: a.diagnostic, ...a.preferred ? { preferred: true } : {} });
    }
  }
  const asked = request.triggerKind !== TRIGGER_AUTOMATIC || comparePositions(request.range.start, request.range.end) !== 0;
  if (asked && wants(request.only, REFACTOR_REWRITE)) {
    for (const a of getRefactorActions(text, request.range)) out.push({ title: a.title, kind: REFACTOR_REWRITE, edits: a.edits });
  }
  if (wants(request.only, REFACTOR_EXTRACT)) {
    const options = {
      ...request.isTaken ? { isTaken: request.isTaken } : {},
      ...request.calledAsFunction ? { calledAsFunction: request.calledAsFunction } : {}
    };
    const variable = request.mentionedOutside ? { mentionedOutside: request.mentionedOutside } : {};
    for (const a of [...getExtractActions(text, request.range, options), ...getExtractVariableActions(text, request.range, variable)]) {
      if (a.disabled === void 0) out.push({ title: a.title, kind: REFACTOR_EXTRACT, edits: a.edits, ...a.rename ? { rename: a.rename } : {} });
      else if (request.disabledSupport) out.push({ title: a.title, kind: REFACTOR_EXTRACT, edits: [], disabled: a.disabled });
    }
  }
  if (asked && wants(request.only, REFACTOR_INLINE)) {
    const options = {
      ...request.definedOutside ? { definedOutside: request.definedOutside } : {},
      ...request.mentionedOutside ? { mentionedOutside: request.mentionedOutside } : {},
      ...request.library ? { library: true } : {},
      ...request.calledAsFunction ? { calledAsFunction: request.calledAsFunction } : {}
    };
    for (const a of getInlineActions(text, request.range, options)) {
      if (a.disabled === void 0) out.push({ title: a.title, kind: REFACTOR_INLINE, edits: a.edits });
      else if (request.disabledSupport) out.push({ title: a.title, kind: REFACTOR_INLINE, edits: [], disabled: a.disabled });
    }
  }
  return out;
}

// packages/core/src/callHierarchy.ts
var analyses = /* @__PURE__ */ new Map();
function analyse(uri, text) {
  const cached = analyses.get(uri);
  if (cached && cached.text === text) return cached;
  const sites = [...findMacroCalls(text), ...findFunctionCalls(text)].filter((c) => !c.dynamic).map((c) => ({ name: c.name, range: c.range })).sort((a, b) => compare3(a.range.start, b.range.start));
  const result = { text, symbols: getDocumentSymbols(text), sites };
  if (analyses.size >= 2e3) analyses.delete(analyses.keys().next().value);
  analyses.set(uri, result);
  return result;
}
var compare3 = (a, b) => a.line - b.line || a.character - b.character;
var contains3 = (range, pos) => compare3(range.start, pos) <= 0 && compare3(pos, range.end) <= 0;
var same2 = (a, b) => a.toLowerCase() === b.toLowerCase();
function fileName(uri) {
  const last = decodeURIComponent(uri).split(/[/\\]/).pop();
  return last && last.length > 0 ? last : uri;
}
var TOP = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
function fileItem(uri) {
  return { name: fileName(uri), kind: "file", uri, range: TOP, selectionRange: TOP, detail: "top level" };
}
function symbolItem(uri, symbol, label) {
  return {
    name: symbol.name,
    kind: symbol.kind === "def" ? "macro" : "trigger",
    uri,
    range: symbol.range,
    selectionRange: symbol.selectionRange,
    detail: label ? `${symbol.detail} — ${label}` : symbol.detail
  };
}
function defItem(d) {
  return symbolItem(d.uri, d.symbol, d.label);
}
function targets(name, a, ctx) {
  const all = definitionsOf(name, a.text, a.symbols, ctx);
  const loaded = all.filter((d) => d.loaded);
  return loaded.length > 0 ? loaded : all;
}
function enclosing(a, pos) {
  return a.symbols.find((s) => contains3(s.range, pos));
}
function prepareCallHierarchy(text, pos, ctx) {
  const uri = ctx?.uri ?? "";
  const a = analyse(uri, text);
  const def = a.symbols.find((s) => s.kind === "def" && contains3(s.selectionRange, pos));
  if (def) return [symbolItem(uri, def)];
  const call = a.sites.find((c) => contains3(c.range, pos));
  return call ? targets(call.name, a, ctx).map(defItem) : [];
}
function incomingCalls(item, files, callers = {}) {
  if (item.kind !== "macro") return [];
  const keyOf = callers.keyOf ?? ((uri) => uri);
  const isItem = (d, uri) => keyOf(d.uri || uri) === keyOf(item.uri) && compare3(d.symbol.selectionRange.start, item.selectionRange.start) === 0;
  const out = [];
  for (const file of files) {
    const a = analyse(file.uri, file.text);
    const groups = /* @__PURE__ */ new Map();
    let ctx;
    for (const site of a.sites) {
      if (!same2(site.name, item.name)) continue;
      ctx ??= callers.contextOf?.(file.uri) ?? { uri: file.uri, files: [], macros: [] };
      const runs = targets(site.name, a, ctx);
      if (runs.length > 0 && !runs.some((d) => isItem(d, file.uri))) continue;
      const from = enclosing(a, site.range.start);
      groups.set(from, [...groups.get(from) ?? [], site.range]);
    }
    for (const [from, fromRanges] of groups) {
      out.push({ from: from ? symbolItem(file.uri, from) : fileItem(file.uri), fromRanges });
    }
  }
  return out.sort((x, y) => x.from.uri.localeCompare(y.from.uri) || compare3(x.from.range.start, y.from.range.start));
}
function outgoingCalls(item, text, ctx) {
  const a = analyse(item.uri, text);
  const self = item.kind === "file" ? void 0 : a.symbols.find((s) => compare3(s.selectionRange.start, item.selectionRange.start) === 0);
  if (item.kind !== "file" && !self) return [];
  const groups = /* @__PURE__ */ new Map();
  for (const site of a.sites) {
    if (enclosing(a, site.range.start) !== self) continue;
    for (const def of targets(site.name, a, ctx)) {
      const key2 = `${def.uri}\0${def.symbol.selectionRange.start.line}\0${def.symbol.selectionRange.start.character}`;
      const group = groups.get(key2);
      if (group) group.fromRanges.push(site.range);
      else groups.set(key2, { to: defItem(def), fromRanges: [site.range] });
    }
  }
  return [...groups.values()];
}

// packages/core/src/rules/table.ts
var RULE_SECTIONS = [
  {
    id: "R1",
    title: "Lines",
    statement: [
      "tf reads a file one physical line at a time and drops each line's leading blanks. A line whose first non-blank character is `;` or `#` is a comment and is skipped, also in the middle of a continuation. An empty or whitespace-only line runs no command of its own, but it does end a command that a `\\` was continuing: the line after it starts a new command.",
      "A line that ends in `\\` (and not in `%\\`) is joined to the next one. Otherwise the joined text is one complete command. This applies to every line of a file, inside a `/def` or not.",
      "So a block (`/if` ... `/endif`, `/while` ... `/done`) must be complete within one command. A multi-line `/if` with its lines left bare is rejected, because `/if` needs its `/endif` in the same command, and an indented second line draws `possibly missing trailing \\`.",
      "Whitespace after a final `\\`, including the `\\r` of a CRLF file, draws `whitespace following final '\\'`, and the line is not continued.",
      'A command that doesn\'t start with `/` makes tf print "Invalid command. Aborting." and stop loading the file; it is never sent to a connected world. A byte order mark is not a blank, so a file that starts with one stops at its first line. tf treats such a line as an implicit `/addworld` only in the `~/.tinytalk` file it reads at start-up, never in a `/load`. Text in a `/def` body is different: it is sent when the macro runs.',
      'A file whose last command ends in `\\` draws `last command is incomplete because of trailing \\`, and that command is dropped. tf says it after every "Invalid command. Aborting." too, as the aborted command is still held.',
      "A macro body whose last line ends in `%;` but not `\\` ends there: an unindented command on the next line runs once, when the file loads, and tf says nothing.",
      "tf turns tabs into blanks as it reads a file, out to the next 8-column stop (`%tabsize`) of the physical line, indentation included, before it joins continuations or strips leading blanks, whatever `%expand_tabs` says. So a tab inside a command is stored as blanks, and how many depends on where the line starts: the same `/let s=a<tab>b` gives four blanks in one place and six in another. A tab meant to stay a tab never does. (Upstream's `lib/tf/quoter.tf` had a `[ <tab>]*` in `/qmac` that matched no tab for this reason; our fork writes `[ \\\\t]*`.)"
    ],
    sourceOnly: [
      "That such a line is an `/addworld` in `~/.tinytalk` (`command.c:606-616`) is read from the source; the cases only show that a `/load`ed file stops."
    ],
    source: [
      { at: "command.c:575-577", what: "load_file() strips leading blanks and skips a comment line" },
      { at: "command.c:579-581", what: "`possibly missing trailing \\`" },
      { at: "command.c:585-589", what: "a final `\\`, not after `%`, joins the next line" },
      { at: "command.c:591-595", what: "`whitespace following final '\\'`" },
      { at: "command.c:597-601", what: "an empty line ends the command being continued" },
      { at: "command.c:602-605", what: "a command starting `/` runs at SUB_KEYWORD" },
      { at: "command.c:617-618", what: '"Invalid command. Aborting."' },
      { at: "command.c:617-627", what: "`last command is incomplete because of trailing \\`, also after an abort" },
      { at: "tfio.c:1248-1250", what: "tfgetS() expands a tab to the next `tabsize` stop" }
    ],
    cases: [
      "if-multiline-top-level",
      "if-oneline-top-level",
      "if-multiline-top-level-backslash",
      "if-multiline-in-def",
      "indented-line-after-command",
      "comment-lines",
      "trailing-space-after-backslash",
      "bare-line-after-command",
      "blank-lines-between-defs",
      "tab-expanded-on-load",
      "missing-continuation-bare-endif",
      "missing-continuation-indented-endif",
      "missing-continuation-while",
      "body-continues-without-backslash",
      "incomplete-continuation",
      "continuation-ended-by-blank-line",
      "continuation-ended-by-whitespace-line",
      "bom-is-not-a-blank",
      "not-a-command-also-incomplete",
      "percent-backslash-not-joined",
      "crlf",
      "tab-expanded-with-expand-tabs-off"
    ],
    codes: [
      {
        code: "missing-continuation",
        severity: "error",
        summary: "A top-level `/if` or `/while` ends where its line ends, because the line has no `\\` to continue it. End every line of the block but the last with `\\`, or write it on one line.",
        detail: "a top-level `/if` or `/while` still open where its line ends, with no `\\` to continue it. Reported once, at the opener: the stray `/then`, `/else`, `/endif`, `/do` or `/done` and the indented lines that were meant to be part of it are its related locations, not diagnostics of their own"
      },
      {
        code: "indented-line-after-command",
        severity: "warning",
        summary: "An indented line starts a new command, because the line before it has no `\\` at the end. Add the `\\` if the line was meant to continue that command.",
        detail: "an indented line starting a new command right after one that didn't end in `\\` — tf's own \"possibly missing trailing \\\\\" warning"
      },
      {
        code: "backslash-not-last",
        severity: "warning",
        summary: "This `\\` doesn't continue the line: whitespace or a CRLF line ending follows it, or a `%` comes before it. End the line with a `\\` that has no `%` before it and nothing after it, in a file saved with LF line endings.",
        detail: "a final `\\` followed by whitespace (including a CRLF file's trailing `\\r`) — not a continuation, tf warns and runs the line as-is"
      },
      {
        code: "not-a-command",
        severity: "error",
        summary: "A line that isn't blank, a comment or a `/command` stops tf loading the rest of the file. Comment it out, or remove the byte order mark that stops it being a command.",
        detail: "a line that is not blank, a comment, or a `/command` — tf aborts the rest of the file's load; everything after it is suppressed from the other rules, since tf never reads it either"
      },
      {
        code: "incomplete-continuation",
        severity: "warning",
        summary: "The file's last command ends in `\\`, so tf drops it. Remove the `\\`.",
        detail: "(warning) the file's last command ends in `\\`: tf says \"last command is incomplete because of trailing \\\\\" and drops it, so a macro it would define isn't defined. A final newline doesn't complete it (tf reads no line after it); a real blank line does. The fix removes the `\\`"
      },
      {
        code: "body-continues-without-backslash",
        severity: "information",
        summary: "A macro body ends in `%;` without a `\\`, so the command on the next line runs once, at load, and is not part of the body. End the line with `\\` if it was meant to be.",
        detail: "(information) a macro body whose last line ends in `%;` but not `\\`, with an unindented command on the next line: that line is a command of its own, run when the file loads. Not when the body ends at a blank line, nor when the next line runs the macro just defined"
      }
    ],
    fix: [
      "End every line of a multi-line command but the last with `\\`, and separate its statements with `%;`, at the top level and in a `/def` alike.",
      'Or write the block on one line: `/if (x =~ "") /set x=1%; /endif`.',
      "Save `.tf` files with LF line endings, and with no blanks after a final `\\`.",
      "Comment out a line that isn't a command with `;`, on every physical line of it."
    ]
  },
  {
    id: "R2",
    title: "Substitution level",
    statement: [
      "What tf substitutes depends on where the text is.",
      "A plain top-level command of a file substitutes nothing: only the command word at its start is read. `%{x}`, `%x`, `%;`, `$[...]`, `$(...)` and `\\` are stored as typed. `/load %{dir}/x.tf` looks for a file whose name is literally `%{dir}/x.tf`. `/let v=cd %; /echo x` sets `v` to the whole rest of the line and never runs `/echo`. An unclosed `$[`, `%{`, `${` or string there is only text.",
      "A top-level line that starts with `/if` or `/while` reads `%;` and `%\\` as separators for the rest of the line, after its `/endif` or `/done` too, and shortens a run of `%`s by one. Nothing else is substituted there either: a `%{x}` stays as typed.",
      "A macro body, `/eval` text, the command of a `/repeat`, `/at` or `/quote` (after its backquote) and a `/for` body substitute everything. `/eval -s0` substitutes nothing.",
      "An expression is evaluated the same at every level: an `/if` or `/while` condition and a top-level `/test` read `%{x}` and `$[...]` as operands. So `/if (%{x} == 5)` works at the top level.",
      "A `%{x}` inside a string in a condition or a `$[...]` is never substituted, even in a macro body. The text of a `/test`, `/return` or `/result` in a body is substituted at its statement's level first, so a `%{x}` in a string there is substituted; in a top-level `/test` it is not."
    ],
    source: [
      { at: "command.c:605", what: `a file's command runs at SUB_KEYWORD ("Never use SUB_FULL here")` },
      { at: "expand.c:1443-1444", what: "`/while` raises SUB_KEYWORD to SUB_NEWLINE" },
      { at: "expand.c:1542-1543", what: "`/if` raises SUB_KEYWORD to SUB_NEWLINE" },
      { at: "expand.c:1862", what: "`%` is read at SUB_NEWLINE and above" },
      { at: "expand.c:1806", what: "percentsub() substitutes a variable only at SUB_FULL" },
      { at: "expand.c:1856", what: "`\\` is read only at SUB_FULL" },
      { at: "expand.c:1871", what: "`$` is read only at SUB_FULL" },
      { at: "macro.c:1561", what: "a macro body is compiled at SUB_MACRO when it first runs" },
      { at: "expand.c:224", what: "`/eval` defaults to SUB_MACRO" },
      { at: "process.c:205", what: "a `/repeat` command is compiled at SUB_MACRO" },
      { at: "expr.c:2231", what: "primary_expr() reads `%`, `{`, `$[`, `$(` and `${` operands at any level" },
      { at: "expand.c:1653-1659", what: "a `/test`'s text is expanded at its statement's level before it is compiled" }
    ],
    cases: [
      "load-no-expansion",
      "load-with-eval",
      "separator-top-level",
      "unclosed-substitution-top-level-text",
      "top-level-literal-substitutions",
      "top-level-if-line-level",
      "repeat-substitutes",
      "at-command-substitutes",
      "quote-command-substitutes",
      "for-body-substitutes",
      "expression-operand-top-level",
      "string-substitution-body-test",
      "string-no-substitution-in-expressions",
      "while-reads-variable",
      "return-result-substituted",
      "separator-percent-backslash-top-level-if"
    ],
    codes: [
      {
        code: "not-substituted-here",
        severity: "warning (information for a `%;`)",
        summary: "tf reads this text without substituting it, so the `%{var}`, `%var` or `%;` stays as it is typed. The message says how to get it substituted where that is meant, or that it may be meant as text.",
        detail: "text tf reads without substituting, where it was surely meant to be: a `%{var}` in a plain top-level line or a top-level `/if` or `/while` line (the fix puts `/eval` in front), or in `/eval` or `/quote` `-soff`/`-son` text (the fix leaves out the `-s`), and a `%var` in a `/load` or `/require` path there. Not in a macro body, an `/eval`, the command of a `/repeat`, `/at` or `/quote` (after its backquote), a `/for`, or an expression operand (`/if (%{x} == 5)`), which tf substitutes; never a `%name` elsewhere, as `/set std_clock_format=%H:%M` is meant as text. Also a `%{var}` inside a string in a condition or `$[...]`, which nothing substitutes, even in a macro body (a `$(...)` in one runs as a macro body). (information) A `%;` with more after it on a plain top-level line or in `-soff` text, which doesn't separate there: `/echo a%; /echo b` is one `/echo`; in a `/set`, `/let` or `/setenv` value it may be meant. One table, `src/substitution.ts`, says which text is read at which level"
      }
    ],
    fix: [
      "Put `/eval` in front of a top-level command that needs a substitution: `/eval /load %{dir}/x.tf`.",
      "Put several commands in a `/def`, or start the line with `/eval`, to separate them with `%;`.",
      "In a condition, write the variable's name, `{x}`, not `%{x}`."
    ]
  },
  {
    id: "R3",
    title: "Statements and keywords",
    statement: [
      "A statement runs to the next `%;`, `%|` or `%\\`, or to the `)` that closes its `$(...)`.",
      "tf reads a keyword (`/if`, `/then`, `/elseif`, `/else`, `/endif`, `/while`, `/do`, `/done`, `/break`, `/let`, `/set`, `/setenv`, `/test`, `/return`, `/result`, `/exit`) only at the start of a statement. The first command of a statement takes everything up to the separator: `/let`, `/set` and `/setenv` as their value, `/test`, `/return` and `/result` as their expression, and any other command as its arguments. `/let name value`, with no `=`, takes it too.",
      'So `/if (1) /echo yes /else /echo no /endif` is one `/echo` whose text happens to contain `/else` and `/endif`, and the `/if` is never closed ("expected /endif, found end of body" when the macro runs). With a `%;` before the `/endif` the same line is valid, and quietly wrong: the `/else` branch does not exist. In `/if (c) /let v=1 /endif` the `/endif` becomes part of the value.',
      "The same goes for a condition list: `/test` reads its expression up to the next `%;`, so it is `/if /test x%; /then ...`, never `/if /test x /then ...`. A statement in a condition list that isn't a command is sent to the world each time the condition is tested, and tf warns \"statement starting with 'x' in /IF condition sends text to server\".",
      'tf reads a keyword up to a blank, a `%` or a `)`, so `/if(1)` runs a command named `if(1)` and finds none ("if(1): no such command or macro").',
      'tf also rejects a keyword with no block to belong to ("unexpected /ENDIF in outer block"), text after `/endif` or `/done` with no `%;` ("expected end of statement after /endif"), and a `/break` without a positive number of loops ("expected positive integer"). It reports only the first error in a body, as it stops compiling there.',
      "A name that only starts like a keyword is not one: `done:x`, `if!x` and `then?` are macro names, and such macros can be defined and run."
    ],
    source: [
      { at: "expand.c:1371", what: "list() reads a statement list" },
      { at: "expand.c:1408", what: "keyword_parse() runs only where a statement starts" },
      { at: "expand.c:1779", what: "a keyword is read up to a blank, `%` or `)`" },
      { at: "expand.c:1432-1435", what: '"statement starting with ... in /IF condition sends text to server"' },
      { at: "expand.c:1482", what: "`/BREAK` needs a positive integer" },
      { at: "expand.c:1742-1746", what: `"expected end of statement after /endif", "Possibly missing '%;'"` }
    ],
    cases: [
      "let-swallows-endif",
      "let-with-separator",
      "block-structure-keyword-mid-statement",
      "block-structure-keyword-as-text",
      "block-structure-stray-keyword",
      "block-structure-text-after-endif",
      "block-structure-condition-list",
      "block-structure-condition-list-ok",
      "block-structure-top-level",
      "keyword-mid-statement-set-value",
      "keyword-mid-statement-setenv",
      "keyword-mid-statement-let-no-equals",
      "condition-list-text",
      "keyword-needs-space",
      "keyword-glued-macro-names",
      "break-needs-positive-number",
      "only-first-error-in-body"
    ],
    codes: [
      {
        code: "keyword-mid-statement",
        severity: "error (warning where tf runs it as text without a word)",
        summary: "A keyword in the middle of a statement is text, because tf reads a keyword only at a statement's start and the statement's first command takes the rest of it. Where it was meant as a keyword, a `%;` before it makes it one.",
        detail: "a keyword in the middle of a statement, which tf reads as text: only a statement's start can hold one, and its first command takes the rest of it, so `/if (1) /echo a /endif` never closes. An `/if` or `/while` in a `/let`, `/set` or `/setenv` value is reported only where tf stops at what it leaves (the `/endif` with no `/if`, its related location) and a `%;` before it clears that; in other text, or otherwise, it is just text (`/set msg=use /if to branch`, `/echo see /if (x) for help`). (warning) A keyword such a value takes in a block that still closes, which tf runs as text without a word: `/if (1) /set a=1 /else /set b=2%; /endif`; an error where its fix clears what tf stops at. The fix puts `%;` before each keyword of the statement, only where that runs as meant: not for text in a condition list, nor where text after the keyword would become a statement, nor where it would leave a later keyword stray or add an empty statement"
      },
      {
        code: "condition-list-text",
        severity: "warning",
        summary: "A statement in a condition list that isn't a command is sent to the world each time the condition is tested. Write the condition as `(expression)`, or as a command such as `/test`.",
        detail: "(warning) a statement in an `/if`, `/elseif` or `/while` condition list that isn't a command (`/if x == 1%; /then`): tf sends it to the world each time the condition is tested, and warns \"statement starting with 'x' in /IF condition sends text to server\""
      },
      {
        code: "keyword-needs-space",
        severity: "error (warning before other punctuation)",
        summary: "A keyword glued to the next character is read as part of a command name, not as a keyword. Separate it as the message says: with a blank after most keywords, or with `%;` after `/endif`, `/done` or `/break`.",
        detail: "a block keyword glued to a `(` or `/` after it (`/if(1)`, `/else/echo`): tf reads a keyword up to a blank, `%` or `)`, so it runs a command named `if(1)` and finds none. The fix adds the blank (`%;` after `/endif`, `/done` or `/break`; none for `/else(`, `/then(` or `/do(`); the stray keyword it leaves in a body is its related location. (warning) Glued to other punctuation (`/endif;`), unless this file defines a macro of that name (`/def done:x`)"
      },
      {
        code: "block-structure",
        severity: "error",
        summary: "The blocks don't fit together: a keyword is missing, has no block to belong to, or has text after it with no `%;`, or a `/break` has no loop of its own to end. The message names the keyword to add, move or separate.",
        detail: "an `/if` or `/while` with no `/endif`, `/done`, `/then` or `/do`; a keyword with no block to belong to; text after `/endif` or `/done` with no `%;`; a `/break` inside `$(...)` that would end a loop outside it, or has no loop inside it to end. A keyword stuck mid-statement (`/echo a /endif`) that is the cause is `keyword-mid-statement`'s"
      },
      {
        code: "nesting-too-deep",
        severity: "information",
        summary: "Not a problem in tf: this command nests deeper than this checker follows, so the rest of it is not checked.",
        detail: "(information) not a problem in tf: a command nesting more than 400 levels deep (each nested `/if`, `/while`, `$(...)`, `$[...]` or `%{name-...}` default is a level), past which the structural check stops; what it read before that still counts"
      }
    ],
    fix: [
      "Put `%;` before every keyword that starts a statement: `/let v=1%; /endif`, never `/let v=1 /endif`.",
      "Put a blank after a keyword: `/if (1)`, not `/if(1)`.",
      "Write a condition list's statements as commands: `/if /test x%; /then ...`.",
      "Put `%;` between `/endif` or `/done` and whatever follows it."
    ]
  },
  {
    id: "R4",
    title: "Separators and escapes",
    statement: [
      "Where tf separates statements (a body, or a top-level `/if` or `/while` line), only a single `%` before `;`, `|` or `\\` does it: `%;` and `%\\` separate, and `%|` pipes.",
      "Blanks beside `%;` in a body do not count: `/let v=ab %; ...` sets `ab`, not `ab `, and `/a %; /b` and `/a%;/b` run the same.",
      "A run of two or more `%`s is text, and tf drops one `%` of it, so `%%;` and `%%%;` don't end a statement. `\\%;` is text too.",
      'Quotes do not protect a `%;` outside an expression: `/set q="a%; /set r=b"` is two commands.',
      "At the top level of a file `%;` is not a separator at all (R2)."
    ],
    sourceOnly: ["That `%|` pipes one statement's output into the next is read from the source; no case runs it."],
    source: [
      { at: "expand.c:1862-1866", what: "a `%` before `;`, `|` or `\\` ends the statement, and blanks before it are dropped" },
      { at: "expand.c:1802", what: "percentsub() copies the rest of a run of `%`s as text" },
      { at: "expand.c:1856", what: "`\\` escapes the next character at SUB_FULL" },
      { at: "util.c:103-105", what: "`\\`, `;` and `|` end a statement after a `%`" }
    ],
    cases: ["separator-blanks-in-body", "separator-literal-forms", "separator-percent-backslash", "separator-percent-runs"],
    codes: [],
    fix: [
      "Separate statements with one `%;`.",
      "Write `%%;` for a literal `%;` in a body."
    ]
  },
  {
    id: "R5",
    title: "Empty statements",
    statement: [
      "An empty statement sends a blank line to the world each time it runs: a `%;` straight after another separator, after `/then`, `/do`, `/else` or a `(condition)`, or at the start of a body. A `%;` at the very end sends nothing.",
      'tf warns about some of these when it compiles the body: after a `(condition)` or `/else` it says "sends blank line to server".'
    ],
    source: [
      { at: "expand.c:1938-1950", what: "statement() compiles text that isn't a command as a send" },
      { at: "expand.c:1425-1429", what: "the warning after `/if (...)` or `/while (...)`" },
      { at: "expand.c:1586-1590", what: "the warning after `/else`" }
    ],
    cases: [
      "separator-sends-blank-line",
      "empty-statement-double-separator",
      "empty-statement-after-then",
      "empty-statement-after-do",
      "empty-statement-after-else",
      "empty-statement-body-start",
      "empty-statement-trailing"
    ],
    codes: [
      {
        code: "empty-statement",
        severity: "warning",
        summary: "An empty statement sends a blank line to the world each time it runs. Remove the separator or the empty `$()` that makes it, or put a command in it.",
        detail: "(warning) a statement with nothing in it, which tf sends to the world as a blank line each time it runs: a `%;` or `%\\` right after another separator, after `/then`, `/do`, `/else` or a `(condition)`, before the first command, or before the `)` of a `$(...)` (and an empty `$()`). In every text tf compiles: a macro body, a top-level `/if` or `/while` line, `/eval`, `/repeat` and `/for` text. The message says whether tf warns about it too (only after a `(condition)`, after `/else`, and in a condition list). Not a `%;` at the very end, which sends nothing, nor one after a `/break`, `/return` or `/result`, which never runs"
      }
    ],
    fix: ["Delete the `%;` that ends the empty statement: `/if (x) /echo a%; /endif`, not `/if (x)%; /echo a%; /endif`."]
  },
  {
    id: "R6",
    title: "Substitution syntax",
    statement: [
      "Where tf substitutes (R2), a substitution must be complete. `%{name` needs its `}` before any blank or `%;`; after the name comes `}` or `-default`. Another substitution can only nest through the default: `%{foo-%{bar}}`, not `%{foo%{bar}}`.",
      "`%-` always starts a substitution (`%-1`, `%-L`), so `50%-off` in a body is \"illegal character '-' in substitution\": write `50%%-off`.",
      'A `${` or `$(` must close too ("unmatched ${", "unmatched (").',
      "A plain top-level command substitutes nothing, so there all of these are only text."
    ],
    source: [
      { at: "expand.c:2135", what: "varsub() reads `%{selector-default}`" },
      { at: "expand.c:2233-2234", what: `"illegal character '-' in substitution"` },
      { at: "expand.c:2293-2294", what: '"unmatched { or bad substitution", "unmatched { or illegal character"' },
      { at: "expand.c:2105", what: '"unmatched ${"' }
    ],
    cases: [
      "unclosed-substitution-percent-brace",
      "unclosed-substitution-percent-dash",
      "unclosed-substitution-dollar-brace-paren",
      "substitution-syntax-glued-in-body",
      "substitution-syntax-top-level-glued"
    ],
    codes: [
      {
        code: "substitution-syntax",
        severity: "error",
        summary: "tf can't read this substitution. Close it with its `}` or `)`, nest another substitution only through the default, or write `%%-` for a literal `%-`, as the message says.",
        detail: "a substitution tf can't read: a `%{` that never closes, or with another substitution glued onto its selector (`%{foo%{bar}}`; nesting only works through the default, `%{foo-%{bar}}`), a `%-` naming no parameter (`50%-off`), and a `${` or `$(` that never closes. Only where tf substitutes: a macro body, `/eval`, `/repeat`, `/at`, `/quote` or `/for` text, an expression; a plain top-level line prints it as it is"
      }
    ],
    fix: [
      "Close every `%{`, `${` and `$(`.",
      "Nest through the default: `%{foo-%{bar}}`.",
      "Write `%%-` for a literal `%-`: `50%%-off`."
    ]
  },
  {
    id: "R7",
    title: "Expressions",
    statement: [
      'In an expression (a condition, `/test`, `/return`, `/result` or `$[...]`), a string is delimited by `"`, `\'` or a backquote and must be closed ("unmatched \\" in string literal"), parentheses must balance, and a `$[` must close ("unmatched $["). Strings only count inside an expression.',
      "In a macro body these are errors when it runs, and in a top-level condition or `/test` as the file loads.",
      'A condition is already an expression, so a `$[...]` inside one is redundant: tf warns "$[...] substitution in expression is legal, but redundant", in a top-level `/test` and nested in another `$[...]` too. A `%{x}` there draws "legal, but can be confusing. Try using {x}". tf prints each once per session unless `%pedantic` is on. A body\'s `/test` text is substituted before it is compiled, so `/test $[3]` in a body draws nothing.'
    ],
    source: [
      { at: "expr.c:2231", what: "primary_expr() reads an operand" },
      { at: "expr.c:2246", what: "an unclosed string literal" },
      { at: "expr.c:2269", what: '"$[...] substitution in expression is legal, but redundant"' },
      { at: "expand.c:2300-2303", what: '"%{x} substitution in expression is legal, but can be confusing"' },
      { at: "expand.c:2021", what: '"unmatched $["' },
      { at: "expand.c:2054", what: '"unmatched ("' }
    ],
    cases: [
      "dollar-bracket-in-if",
      "if-expression-plain",
      "unclosed-substitution-dollar-bracket",
      "unclosed-substitution-string",
      "unclosed-substitution-condition",
      "expression-syntax-top-level-test",
      "substitution-in-expression-warns",
      "substitution-in-expression-body-test",
      "substitution-in-expression-once-per-session"
    ],
    codes: [
      {
        code: "expression-syntax",
        severity: "error",
        summary: "tf can't read this expression. Close the string, `(` or `$[` that is left open, or remove the `)` with no `(`.",
        detail: "an expression tf can't read: a `$[` that never closes, a string or `(` left open, a `)` with no `(`, an `/if` or `/while` condition with no `)`. In a condition and a top-level `/test` too, which tf compiles as written"
      },
      {
        code: "substitution-in-expression",
        severity: "warning",
        summary: "A substitution used as an operand of an expression is redundant, and tf warns about it. Write `(...)` for `$[...]` and `{x}` for `%{x}`.",
        detail: "(warning) a `$[...]`, `%x` or `%{x}` that is itself an operand of an expression: an `/if`, `/elseif` or `/while` condition, a `$[...]`, or a top-level `/test`, `/return` or `/result`. tf warns that `$[...]` is redundant and `%{x}` confusing (once per session, unless `%pedantic` is on); the fix writes `(...)` or `{x}`, which mean the same. Not in a string, a substitution's default, `${...}` or `$(...)`, nor in a macro body's `/test` text, which is substituted before it is compiled"
      }
    ],
    fix: [
      'Write the plain expression in a condition: `/if (strstr({P0}, "x") >= 0)`, not `/if ($[strstr({P0}, "x")] >= 0)`.',
      "Write `{x}`, not `%{x}`, for a variable in an expression."
    ]
  },
  {
    id: "R8",
    title: "Macro names",
    statement: [
      'A macro cannot be named after a keyword or `eval`. `/def if`, `/def SET`, `/def let`, `/def test`, `/def eval` and the rest of the keyword table are refused with `"SET" is a reserved word.`, in any case, and nothing is defined, so `/set` keeps meaning the keyword.',
      'A name that starts with `#`, `@`, `!` or `/`, or holds a space, is refused as an "illegal macro name". A `/def` with its `=` left out (`/def greet /echo hi`) has a space in its name.',
      'Other builtins can be redefined: `/def quote` and `/def lcd` only draw "conflicts with the builtin command", and the macro then runs.'
    ],
    source: [
      { at: "macro.c:865-866", what: '"illegal macro name"' },
      { at: "macro.c:870-874", what: 'a keyword, or a builtin flagged reserved, is "a reserved word"' },
      { at: "expand.c:72-75", what: "the keyword table" },
      { at: "cmdlist.h:35", what: "EVAL is the one builtin flagged reserved" }
    ],
    cases: ["reserved-macro-name", "invalid-macro-name", "builtin-redefined"],
    codes: [
      {
        code: "invalid-macro-name",
        severity: "error",
        summary: "tf refuses this macro name and defines nothing. Choose another name, or put in the `=` that ends the name.",
        detail: 'a top-level `/def` (or `/@def`) whose name tf refuses, so it defines nothing: a keyword (`if`, `then`, `let`, `set`, `test`, ...) or `eval`, in any case ("is a reserved word"), or a name starting with `#`, `@`, `!` or `/` or holding a space or tab ("illegal macro name"). The name is everything from the end of the options to the first `=`, so a `/def` with its `=` left out (`/def greet /echo hi`) has a space in it; then the fix puts the `=` in. Other builtins can be redefined, so they aren\'t flagged'
      }
    ],
    fix: ["Name macros with something other than a keyword, and write the `=`: `/def greet = /echo hi`."]
  },
  {
    id: "R9",
    title: "Load paths",
    statement: [
      "A relative `/load` path is tried against tf's current directory, not the loading file's directory, then against each `TFPATH` directory in order, or `TFLIBDIR` when `TFPATH` is empty. So a non-empty `TFPATH` must include the library directory for `/require alias.tf` to work.",
      'A call of a macro no loaded file defines prints "NAME: no such command or macro", and tf goes on with the next command.'
    ],
    source: [
      { at: "command.c:512-541", what: "do_file_load() tries the path, then `TFPATH`, or `TFLIBDIR`" },
      { at: "expand.c:270", what: '"no such command or macro"' }
    ],
    cases: ["load-path-tfpath", "load-path-tfpath-target", "load-path-tfpath-replaces-libdir", "load-path-libdir", "load-not-loader-dir", "undefined-macro-goes-on"],
    codes: [
      {
        code: "unresolved-load",
        severity: "warning (information where it can't follow the path)",
        summary: "tf won't find the file this `/load` or `/require` names, or this check can't follow the path. The message says what to fix: the path, or the `tfscript` setting that tells this check where tf runs.",
        detail: "a `/load` or `/require`, in a file on the load path, whose file tf wouldn't find; (information) one built from something this check can't follow: a variable it doesn't know, a `~` with no home directory set, or `~user`. Turned off by `tfscript.diagnostics.unresolvedLoads`"
      },
      {
        code: "undefined-macro",
        severity: "information (warning where no file this check can see defines it)",
        summary: `No file on this file's load path defines this macro, so unless something else defines it first, tf prints "no such command or macro" when the call runs. The message says what to do: load the file that defines it, check the name, or make a load this check can't follow resolve.`,
        detail: "(information, or a warning where no file this check can see defines it) a call of a macro that no file on this file's load path defines; where another file defines it, the fix adds the `/require`. Turned off by `tfscript.diagnostics.undefinedMacros`"
      }
    ],
    fix: [
      "Put library directories on `TFPATH`, and write paths relative to tf's current directory, not the script's.",
      "Build a path from a variable with `/eval`: `/eval /load %{dir}/x.tf`."
    ]
  }
];
var RULES_DOC_URL = "https://github.com/huntwj/tfscript-language-server/blob/main/docs/rules.md";
function findCode(code3) {
  for (const section of RULE_SECTIONS) {
    const entry = section.codes.find((c) => c.code === code3);
    if (entry) return { section, entry };
  }
  return void 0;
}
function codeHref(code3) {
  return `${RULES_DOC_URL}#${code3}`;
}

// packages/core/src/explain.ts
var TAB = 8;
var CONTEXT = 8;
function expand(text) {
  const columns = [];
  let shown = "";
  for (let k = 0; k < text.length; k += 1) {
    const ch = text[k];
    columns.push(shown.length);
    shown += ch === "	" ? " ".repeat(TAB - shown.length % TAB) : ch;
  }
  columns.push(shown.length);
  return { shown, column: (c) => columns[Math.min(c, columns.length - 1)] };
}
function lineText(lines, line) {
  return (lines[line] ?? "").replace(/\r$/, "");
}
function markOf(lines, range, label, primary) {
  const { column } = expand(lineText(lines, range.start.line));
  const from = column(range.start.character);
  const to = range.end.line === range.start.line ? column(range.end.character) : column(lineText(lines, range.start.line).length);
  return { line: range.start.line, from, to: Math.max(to, from + 1), label, primary };
}
function put(row, at2, text) {
  while (row.length < at2) row.push(" ");
  for (let k = 0; k < text.length; k += 1) row[at2 + k] = text[k];
}
function annotate(marks) {
  const sorted = [...marks].sort((a, b) => a.from - b.from);
  const underline = [];
  for (const m of [...sorted].sort((a, b) => Number(a.primary) - Number(b.primary))) {
    put(underline, m.from, (m.primary ? "^" : "-").repeat(m.to - m.from));
  }
  const labelled = sorted.filter((m) => m.label);
  const last = sorted[sorted.length - 1];
  const reach = Math.max(...sorted.map((m) => m.to));
  if (last && last.label && labelled[labelled.length - 1] === last && last.to === reach) {
    put(underline, last.to + 1, last.label);
    labelled.pop();
  }
  const rows = [underline.join("")];
  for (let j = labelled.length - 1; j >= 0; j -= 1) {
    const connector = [];
    for (let k = 0; k <= j; k += 1) put(connector, labelled[k].from, "|");
    const label = [];
    for (let k = 0; k < j; k += 1) put(label, labelled[k].from, "|");
    put(label, labelled[j].from, labelled[j].label);
    rows.push(connector.join(""), label.join(""));
  }
  return rows.map((r) => r.trimEnd());
}
function excerpt(lines, shown, marks) {
  const width = String(Math.max(...shown) + 1).length;
  const gutter = (n) => `${n.padStart(width)} | `;
  const out = [];
  let previous;
  for (const line of shown) {
    if (previous !== void 0 && line > previous + 1) out.push(`${" ".repeat(width)} ...`);
    out.push(`${gutter(String(line + 1))}${expand(lineText(lines, line)).shown}`.trimEnd());
    const here = marks.filter((m) => m.line === line);
    if (here.length > 0) for (const row of annotate(here)) out.push(`${gutter("")}${row}`.trimEnd());
    previous = line;
  }
  return out.join("\n");
}
function compare4(a, b) {
  return a.line - b.line || a.character - b.character;
}
function applyEdits2(lines, edits) {
  const result = [...lines];
  for (const e of [...edits].sort((a, b) => compare4(b.range.start, a.range.start))) {
    const { start, end } = e.range;
    const head = (result[start.line] ?? "").slice(0, start.character);
    const tail = (result[end.line] ?? "").slice(end.character);
    result.splice(start.line, end.line - start.line + 1, head + e.newText + tail);
  }
  return result;
}
function fence(body, language = "") {
  let ticks = "```";
  while (body.includes(ticks)) ticks += "`";
  return `${ticks}${language}
${body}
${ticks}`;
}
function explainDiagnostic(text, d) {
  if (!d.explanation && !d.label && !d.related && !d.fix) return void 0;
  const lines = splitRawLines(text);
  const marks = [
    markOf(lines, d.range, d.label ?? "", true),
    ...(d.related ?? []).map((r) => markOf(lines, r.range, r.message, false))
  ];
  const marked = [...new Set(marks.map((m) => m.line))].sort((a, b) => a - b);
  const first = marked[0];
  const last = marked[marked.length - 1];
  const shown = last - first <= CONTEXT ? Array.from({ length: last - first + 1 }, (_, k) => first + k) : marked;
  const parts = [fence(excerpt(lines, shown, marks), "text")];
  if (d.explanation) parts.push(d.explanation);
  if (d.fix && d.fix.edits.every((e) => !e.newText.includes("\n"))) {
    const fixed = applyEdits2(lines, d.fix.edits);
    const changed = [...new Set(d.fix.edits.flatMap((e) => [e.range.start.line, e.range.end.line]))].sort((a, b) => a - b);
    const body = changed.map((l) => expand(lineText(fixed, l)).shown).join("\n");
    parts.push(`**Quick fix:** ${d.fix.title}`, fence(body, "tf"));
  }
  return parts.join("\n\n");
}
function explainCode(code3) {
  const found = findCode(code3);
  if (!found) return void 0;
  const { section, entry } = found;
  return `**${code3}** (${section.id}, ${section.title.toLowerCase()}): ${entry.summary} [About this rule](${codeHref(code3)})`;
}
function diagnosticHover(text, d) {
  const parts = [explainDiagnostic(text, d), explainCode(d.code)].filter((p) => p !== void 0);
  return parts.length > 0 ? parts.join("\n\n") : void 0;
}
function rangeContains(range, pos) {
  return compare4(range.start, pos) <= 0 && compare4(pos, range.end) <= 0;
}

// packages/core/src/semanticTokens.ts
var TOKEN_TYPES = ["function", "macro", "keyword", "variable", "parameter"];
var TOKEN_MODIFIERS = ["declaration", "defaultLibrary"];
var CONTROL_FLOW = /* @__PURE__ */ new Set(["if", "then", "else", "elseif", "endif", "while", "do", "done", "break", "return", "result", "exit"]);
var SELECTOR = "[A-Za-z_][A-Za-z0-9_]*|[#?*]|[0-9]+|-(?:L[0-9]*|[0-9]+)";
var PERCENT_RE = new RegExp(`(?<!%)%(\\{)?(${SELECTOR})`, "g");
var POSITIONAL_RE = /^(?:[0-9]+|[#?*]|-[0-9]+|-?L[0-9]*|P[0-9]+|R)$/;
var ASSIGN_RE2 = /^\s+([A-Za-z_][A-Za-z0-9_]*)/;
function getSemanticTokens(text, ctx) {
  const symbols = getDocumentSymbols(text);
  const user = /* @__PURE__ */ new Set();
  const library = /* @__PURE__ */ new Set();
  for (const s of symbols) if (s.kind === "def") user.add(s.name.toLowerCase());
  for (const r of RESERVED_MACRO_NAMES) user.delete(r);
  for (const m of ctx?.macros ?? []) {
    if (!m.loaded) continue;
    (m.library ? library : user).add(m.symbol.name.toLowerCase());
  }
  const tokens = [];
  const add = (line, character, length, type, ...modifiers) => {
    if (length > 0) tokens.push({ line, character, length, type, modifiers });
  };
  const lines = splitRawLines(text);
  for (const u of findUsages(text)) {
    const key2 = u.name.toLowerCase();
    const source = COMMANDS.get(key2);
    const { line, character } = u.range.start;
    const length = u.name.length;
    if (u.kind === "substitution") {
      if (user.has(key2)) add(line, character, length, "macro");
      else if (library.has(key2) || source === "stdlib") add(line, character, length, "macro", "defaultLibrary");
      continue;
    }
    if (source === "keyword" && CONTROL_FLOW.has(key2)) {
      add(line, character, length, "keyword");
    } else if (u.kind === "builtin-call") {
      if (source === "builtin" || source === "keyword") add(line, character, length, "function", "defaultLibrary");
    } else if (user.has(key2)) {
      add(line, character, length, "function");
    } else if (source || library.has(key2)) {
      add(line, character, length, "function", "defaultLibrary");
    }
    if (key2 === "set" || key2 === "let" || key2 === "setenv" || key2 === "unset") {
      const rest = (lines[line] ?? "").slice(character + length);
      const m = ASSIGN_RE2.exec(rest);
      if (m) {
        const at2 = character + length + (m[0].length - m[1].length);
        if (key2 === "unset") add(line, at2, m[1].length, "variable");
        else add(line, at2, m[1].length, "variable", "declaration");
      }
    }
  }
  for (const s of symbols) {
    if (s.kind !== "def") continue;
    const r = s.selectionRange;
    if (r.start.line === r.end.line) add(r.start.line, r.start.character, r.end.character - r.start.character, "function", "declaration");
  }
  lines.forEach((l, line) => {
    if (isCommentLine(l)) return;
    for (const m of l.matchAll(PERCENT_RE)) {
      const sel = m[2];
      if (m[1] && l[(m.index ?? 0) + m[0].length] !== "}" && l[(m.index ?? 0) + m[0].length] !== "-") continue;
      const at2 = (m.index ?? 0) + 1 + (m[1] ? 1 : 0);
      add(line, at2, sel.length, POSITIONAL_RE.test(sel) ? "parameter" : "variable");
    }
  });
  tokens.sort((a, b) => a.line - b.line || a.character - b.character);
  const out = [];
  for (const t of tokens) {
    const prev = out[out.length - 1];
    if (prev && prev.line === t.line && t.character < prev.character + prev.length) continue;
    out.push(t);
  }
  return out;
}
function encodeSemanticTokens(tokens) {
  const data = [];
  let line = 0;
  let character = 0;
  for (const t of tokens) {
    const dl = t.line - line;
    data.push(dl, dl === 0 ? t.character - character : t.character, t.length, TOKEN_TYPES.indexOf(t.type), t.modifiers.reduce((bits, m) => bits | 1 << TOKEN_MODIFIERS.indexOf(m), 0));
    line = t.line;
    character = t.character;
  }
  return data;
}

// packages/core/src/signatureHelp.ts
var BRACKET_OPEN = "[(";
var BRACKET_CLOSE = "])";
function parseSynopsis(label) {
  const nameEnd = label.search(/\s|$/);
  const raw = [];
  let depth = 0;
  let start = -1;
  for (let i = nameEnd; i <= label.length; i += 1) {
    const ch = label[i];
    const space = ch === void 0 || /\s/.test(ch);
    if (space && depth === 0) {
      if (start >= 0) raw.push({ text: label.slice(start, i), start, end: i });
      start = -1;
      continue;
    }
    if (start < 0) start = i;
    if (BRACKET_OPEN.includes(ch)) depth += 1;
    else if (BRACKET_CLOSE.includes(ch)) depth = Math.max(0, depth - 1);
  }
  const merged = [];
  for (let i = 0; i < raw.length; i += 1) {
    const t = raw[i];
    const next = raw[i + 1];
    if (t.text === "=" && next) {
      merged.push({ text: label.slice(t.start, next.end), start: t.start, end: next.end });
      i += 1;
    } else {
      merged.push(t);
    }
  }
  return merged.map((t) => {
    const inner2 = t.text.startsWith("[") && t.text.endsWith("]") ? t.text.slice(1, -1) : t.text;
    const kind = inner2.startsWith("=") ? "eq" : inner2.startsWith("-") || /^(?:macro-)?options$/.test(inner2) ? "option" : "positional";
    return { ...t, kind, inner: inner2 };
  });
}
function splitWords(args) {
  const words2 = [];
  let word = "";
  let quote = "";
  let parens = 0;
  for (let i = 0; i < args.length; i += 1) {
    const ch = args[i];
    if (quote) {
      word += ch;
      if (ch === "\\") word += args[++i] ?? "";
      else if (ch === quote) quote = "";
      continue;
    }
    if (/\s/.test(ch) && parens === 0) {
      if (word) words2.push(word);
      word = "";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(" && (word === "" || parens > 0)) parens += 1;
    else if (ch === ")" && parens > 0) parens -= 1;
    word += ch;
  }
  const result = words2.map((text) => ({ text, current: false }));
  if (word) result.push({ text: word, current: true });
  else result.push({ text: "", current: true });
  return result;
}
function optionParamFor(word, params) {
  const letter = word[1] ?? "";
  const options = params.map((p, i) => ({ p, i })).filter(({ p }) => p.kind === "option");
  const match = options.find(({ p }) => p.inner[1] === letter) ?? options.find(({ p }) => p.inner.startsWith("-") && p.inner.slice(1).includes(letter)) ?? options.find(({ p }) => !p.inner.startsWith("-")) ?? options[0];
  return match ? match.i : -1;
}
function activeParam(words2, params) {
  const positional = params.map((p, i) => ({ p, i })).filter(({ p }) => p.kind === "positional");
  const eq = params.findIndex((p) => p.kind === "eq");
  let optionsDone = false;
  let pos = 0;
  let inBody = false;
  let index2 = -1;
  for (const w of words2) {
    const at2 = (n) => positional[Math.min(n, positional.length - 1)]?.i ?? -1;
    if (inBody) {
      index2 = eq;
      continue;
    }
    if (!optionsDone && w.text === "--") {
      optionsDone = true;
      index2 = -1;
      continue;
    }
    if (!optionsDone && w.text.length > 1 && w.text.startsWith("-")) {
      index2 = optionParamFor(w.text, params);
      continue;
    }
    if (w.text === "" && w.current) {
      index2 = pos >= positional.length && eq >= 0 ? eq : at2(pos);
      if (pos >= positional.length && eq < 0) pos += 1;
      continue;
    }
    optionsDone = true;
    if (eq >= 0 && w.text.startsWith("=")) {
      inBody = true;
      index2 = eq;
      continue;
    }
    if (eq >= 0 && w.text.includes("=")) {
      inBody = true;
      index2 = w.current ? eq : at2(pos);
      pos += 1;
      continue;
    }
    index2 = at2(pos);
    pos += 1;
  }
  const overflow = Math.max(0, pos - positional.length);
  return { index: index2, overflow };
}
var COMMAND_START_RE2 = /(?:^\s*|=\s*|\)\s*|\/@?(?:if|then|else|elseif|while|do)\s+)$/i;
function commandAt(text, pos) {
  const lines = splitRawLines(text);
  if (isCommentLine(lines[pos.line] ?? "")) return void 0;
  const entry = splitLogicalEntries(text).find((e) => e.startLine <= pos.line && pos.line <= e.endLine);
  if (!entry) return void 0;
  const offset = entry.offsetMap.filter((m) => m.line < pos.line || m.line === pos.line && m.character < pos.character).length;
  const before2 = entry.text.slice(0, offset);
  const segStart = Math.max(before2.lastIndexOf("%;"), before2.lastIndexOf("%|"));
  const seg = segStart >= 0 ? before2.slice(segStart + 2) : before2;
  let found;
  for (const m of seg.matchAll(CALL_RE2)) {
    const slash = (m.index ?? 0) + m[1].length;
    if (!COMMAND_START_RE2.test(seg.slice(0, slash))) continue;
    const nameEnd = slash + 1 + m[2].length + m[3].length + m[4].length;
    if (nameEnd >= seg.length) return found;
    found = { name: m[4], builtin: m[2] === "@", args: seg.slice(nameEnd) };
  }
  return found;
}
function macroSignatures(name, defs) {
  const head = new RegExp(`^/${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "i");
  const sigs = [];
  for (const d of defs) {
    const doc = docCommentAbove(d.lines, d.symbol.range.start.line);
    const [first, ...rest] = (doc ?? "").split("\n");
    if (!first || !head.test(first)) continue;
    const label = first.split(/\t| {2,}/)[0]?.trim() ?? first;
    const more = [first.slice(label.length).trim(), ...rest.map((l) => l.trim())].filter(Boolean).join("\n");
    sigs.push(toSignature(label, more || void 0));
  }
  return sigs;
}
function toSignature(label, documentation) {
  return {
    label,
    parameters: parseSynopsis(label).map((p) => [p.start, p.end]),
    ...documentation ? { documentation } : {}
  };
}
function commandSignatures(name, ctx) {
  const key2 = name.toLowerCase();
  const entry = ctx?.help?.get(`/${key2}`);
  const usages = entry && entry.usage.length > 0 ? entry.usage : COMMAND_USAGES[key2];
  if (!usages) return [];
  const description = COMMAND_DESCRIPTIONS[key2] || entry?.summary || void 0;
  return usages.map((u) => toSignature(u, description));
}
function functionSignature(synopsis, description) {
  const open = synopsis.indexOf("(");
  const parameters = [];
  for (const m of synopsis.slice(open + 1).matchAll(/[A-Za-z_][A-Za-z0-9_]*(?:\.\.\.)?/g)) {
    const start = open + 1 + (m.index ?? 0);
    parameters.push([start, start + m[0].length]);
  }
  return { label: synopsis, parameters, ...description ? { documentation: description } : {} };
}
function functionHelp(name, argument, ctx) {
  const f = FUNCTIONS.find((fn) => fn.name === name.toLowerCase());
  if (!f) return void 0;
  const summary = functionHelpEntry(f.name, ctx?.help)?.summary;
  const signatures = functionSynopses(f).map((s) => functionSignature(s, summary));
  let active = signatures.findIndex((s) => s.parameters.length > argument);
  if (active < 0) active = signatures.length - 1;
  const params = signatures[active].parameters.length;
  const last = signatures[active].label.includes("...") ? params - 1 : params;
  return { signatures, activeSignature: active, activeParameter: Math.min(argument, Math.max(last, 0)) };
}
function getSignatureHelp(text, pos, ctx) {
  const before2 = textBefore(text, pos);
  if (before2 === void 0) return void 0;
  const where2 = cursorContext(before2);
  if (where2.kind === "expression" && where2.call) {
    const fn = functionHelp(where2.call.name, where2.call.argument, ctx);
    if (fn) return fn;
  }
  const call = commandAt(text, pos);
  if (!call) return void 0;
  let signatures;
  if (call.builtin) {
    const source = COMMANDS.get(call.name.toLowerCase());
    signatures = source === "builtin" || source === "keyword" ? commandSignatures(call.name, ctx) : [];
  } else {
    const defs = definitionsOf(call.name, text, getDocumentSymbols(text), ctx);
    const user = defs.filter((d) => d.loaded && !d.library);
    if (user.length > 0) {
      signatures = macroSignatures(call.name, user);
    } else {
      signatures = commandSignatures(call.name, ctx);
      if (signatures.length === 0) signatures = macroSignatures(call.name, defs);
    }
  }
  if (signatures.length === 0) return void 0;
  const words2 = splitWords(call.args);
  const fits = signatures.map((s) => activeParam(words2, parseSynopsis(s.label)));
  let best = 0;
  fits.forEach((f, i) => {
    if (f.overflow < fits[best].overflow) best = i;
  });
  return { signatures, activeSignature: best, activeParameter: fits[best].index };
}

// packages/core/src/workspace/workspaceIndex.ts
var path4 = __toESM(require("node:path"));

// packages/core/src/documentLinks.ts
function findLoadPaths(text) {
  const out = [];
  for (const entry of splitLogicalEntries(text)) {
    if (entry.incomplete) continue;
    for (const load of entryLoads(entry)) {
      const written = entry.text.slice(load.start, load.end);
      const namesVariable = /%\{|%[A-Za-z_]/.test(written.replace(/%%+/g, ""));
      if (/\\/.test(written) || !load.pending.includes("full") && namesVariable) continue;
      const file = literalText(load.file, load.pending);
      if (file === void 0) continue;
      const from = entry.offsetMap[load.start];
      const last = entry.offsetMap[load.end - 1];
      if (!from || !last || from.line !== last.line || last.character - from.character !== written.length - 1) continue;
      out.push({
        kind: load.kind,
        file,
        range: { start: { line: from.line, character: from.character }, end: { line: last.line, character: last.character + 1 } },
        line: entry.startLine,
        offset: load.start,
        topLevel: load.topLevel
      });
    }
  }
  return out;
}

// packages/core/src/workspace/tfHelp.ts
var ANSI_RE = /\x1b\[[0-9;]*m/g;
var RULE_RE = /^\s*_{10,}\s*$/;
function lowerCommandWord(line) {
  return line.replace(/^\/(\S+)/, (_, word) => `/${word.toLowerCase()}`);
}
function parseSection(body) {
  const rule = body.findIndex((l) => RULE_RE.test(l));
  const usageStart = body.findIndex((l) => /usage:\s*$/i.test(l));
  const head = rule === -1 || usageStart === -1 ? [] : body.slice(usageStart + 1, rule);
  const usage = head.map((l) => l.trim()).filter((l) => l.startsWith("/")).map(lowerCommandWord);
  const rest = rule === -1 ? body : body.slice(rule + 1);
  const start = rest.findIndex((l) => l.trim() !== "");
  const paragraph = [];
  for (let i = start; start !== -1 && i < rest.length; i += 1) {
    const line = rest[i];
    if (line.trim() === "") break;
    paragraph.push(line.trim());
  }
  return { usage, summary: paragraph.join(" ").replace(/\s+/g, " ").trim() };
}
function parseAnchors(lines, entries) {
  let i = 0;
  while (i < lines.length) {
    if (!/^#\S/.test(lines[i])) {
      i += 1;
      continue;
    }
    const names = [];
    while (i < lines.length && /^#\S/.test(lines[i])) {
      names.push(lines[i].slice(1).trim().toLowerCase());
      i += 1;
    }
    while (i < lines.length && lines[i].trim() === "") i += 1;
    const signatures = [];
    while (i < lines.length && /^ {1,4}\S/.test(lines[i])) {
      signatures.push(lines[i].trim());
      i += 1;
    }
    const description = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^[#&]/.test(lines[i])) {
      description.push(lines[i].trim());
      i += 1;
    }
    if (signatures.length === 0 || description.length === 0) continue;
    const entry = { usage: signatures, summary: description.join(" ").replace(/\s+/g, " ").trim() };
    for (const name of names) if (!entries.has(name)) entries.set(name, entry);
  }
}
function parseTfHelp(text) {
  const entries = /* @__PURE__ */ new Map();
  const lines = text.replace(ANSI_RE, "").split("\n");
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].startsWith("&")) {
      i += 1;
      continue;
    }
    const topics = [];
    while (i < lines.length && lines[i].startsWith("&")) {
      topics.push(lines[i].slice(1).trim().toLowerCase());
      i += 1;
    }
    const body = [];
    while (i < lines.length && !lines[i].startsWith("&")) {
      body.push(lines[i]);
      i += 1;
    }
    const entry = parseSection(body);
    for (const topic of topics) if (!entries.has(topic)) entries.set(topic, entry);
  }
  parseAnchors(lines, entries);
  return entries;
}

// packages/core/src/workspace/workspaceIndex.ts
var MAX_WALKED_FILES = 5e3;
var UNWATCHED_WALK_MS = 1e4;
var UNWATCHED_CHECK_MS = 1e3;
var NOT_WALKED = { files: [], truncated: false };
function isInside(file, dir) {
  const rel = path4.relative(fileKey(dir), fileKey(file));
  return rel !== "" && !rel.startsWith("..") && !path4.isAbsolute(rel);
}
var WorkspaceIndex = class {
  constructor(fs, environment) {
    this.fs = fs;
    this.environment = environment;
  }
  fs;
  environment;
  folders = [];
  raw = /* @__PURE__ */ new Map();
  overlay = /* @__PURE__ */ new Map();
  resolved = /* @__PURE__ */ new Map();
  /** Keyed by folder and context name. */
  graphs = /* @__PURE__ */ new Map();
  libraries = /* @__PURE__ */ new Map();
  helps = /* @__PURE__ */ new Map();
  setFolders(folders2) {
    this.folders = folders2.map((f) => path4.resolve(f));
    this.invalidate();
  }
  setSettings(folder, raw) {
    this.raw.set(fileKey(folder), raw);
    this.invalidate();
    this.resolvable.clear();
    this.libraries.clear();
    this.helps.clear();
  }
  /**
   * An open document's text (undefined once it is closed). Its disk text is read again after
   * it closes, and whether loads resolve is worked out again: the file may be one they find.
   */
  setOverlay(file, text) {
    if (text === void 0) this.overlay.delete(fileKey(file));
    else this.overlay.set(fileKey(file), text);
    this.disk.delete(fileKey(file));
    this.resolvable.clear();
    this.invalidate();
  }
  /**
   * The folders a file watcher reports changes in (workspace folders, and whatever else the
   * client agreed to watch). Text read from disk under them is kept until filesChanged(); text
   * read anywhere else is checked against the file's modification time first.
   */
  setWatchedRoots(roots) {
    this.watchedRoots = roots.map((r) => path4.resolve(r));
  }
  watchedRoots = [];
  isWatched(file) {
    return this.watchedRoots.some((r) => fileKey(r) === fileKey(file) || isInside(file, r));
  }
  invalidate() {
    this.graphs.clear();
    this.resolved.clear();
  }
  /** Files read from disk, until a watched file changes (filesChanged()) or, unwatched, until their modification time does. */
  disk = /* @__PURE__ */ new Map();
  read = (file) => {
    const key2 = fileKey(file);
    const open = this.overlay.get(key2);
    if (open !== void 0) return open;
    const cached = this.disk.get(key2);
    if (cached) return cached.text;
    const mtime2 = this.fs.mtime?.(file);
    const text = this.fs.readFile(file);
    this.disk.set(key2, { file, text, mtime: mtime2 });
    return text;
  };
  /**
   * Forgets the disk text of every file no watcher covers whose modification time has changed
   * (or that appeared or went away), and the graphs built from it. Run before a graph is used.
   */
  refreshUnwatched() {
    if (!this.fs.mtime) return;
    const since = Date.now() - this.lastRefresh;
    if (since < UNWATCHED_CHECK_MS) {
      if (!this.recheckPending && [...this.disk.values()].some((e) => !this.isWatched(e.file))) {
        this.recheckPending = true;
        this.recheck?.(UNWATCHED_CHECK_MS - since);
      }
      return;
    }
    this.lastRefresh = Date.now();
    this.recheckPending = false;
    let changed = false;
    for (const [key2, entry] of this.disk) {
      if (this.isWatched(entry.file) || this.fs.mtime(entry.file) === entry.mtime) continue;
      this.disk.delete(key2);
      changed = true;
    }
    if (changed) {
      this.resolvable.clear();
      this.invalidate();
    }
  }
  recheckPending = false;
  recheck;
  /**
   * How to ask for the open documents to be checked again in `delayMs`: called when a check of
   * unwatched files' modification times was skipped for being too soon after the last.
   */
  setRecheck(recheck) {
    this.recheck = recheck;
  }
  /**
   * Every macro-defining entry (`/def`, `/alias`, `/bind`, `/hook`, `/trig*`) in every tf
   * script under the workspace folders — reached by a load path or not — whose name contains
   * the query's characters in order, ignoring case (the editor ranks them further).
   */
  lastRefresh = -Infinity;
  workspaceSymbols(query) {
    this.refreshUnwatched();
    const q = query.toLowerCase();
    const matches = (name) => {
      let i = 0;
      for (const ch of name.toLowerCase()) if (ch === q[i]) i += 1;
      return i === q.length;
    };
    const seen = /* @__PURE__ */ new Set();
    const results = [];
    for (const folder of this.folders) {
      for (const file of this.fs.walkTfFiles(folder)) {
        if (seen.has(fileKey(file))) continue;
        seen.add(fileKey(file));
        const text = this.read(file);
        if (text === void 0) continue;
        for (const symbol of getDocumentSymbols(text)) {
          if (matches(symbol.name)) results.push({ file: path4.resolve(file), folder, symbol });
        }
      }
    }
    return results;
  }
  folderFor(file) {
    const inside = this.folders.filter((f) => isInside(file, f));
    return inside.sort((a, b) => b.length - a.length)[0] ?? path4.dirname(path4.resolve(file));
  }
  settingsFor(folder) {
    const key2 = fileKey(folder);
    let settings = this.resolved.get(key2);
    if (!settings) {
      settings = resolveSettings(this.raw.get(key2) ?? {}, folder, this.environment);
      this.resolved.set(key2, settings);
    }
    return settings;
  }
  /** The load graph of one context in `folder` (the active one if unnamed). */
  graphFor(folder, contextName) {
    const settings = this.settingsFor(folder);
    const context = settings.contexts.find((c) => c.name === (contextName ?? settings.activeContext)) ?? settings.contexts[0];
    const key2 = `${fileKey(folder)}\0${context?.name ?? ""}`;
    const cached = this.graphs.get(key2);
    if (cached) return cached;
    const graph = buildLoadGraph({
      entryFiles: context?.entryFiles ?? [],
      libraryDir: settings.libraryDir,
      tfPath: settings.tfPath,
      workingDir: settings.workingDir,
      home: settings.home,
      pathMappings: settings.pathMappings,
      variables: settings.variables,
      readFile: this.read
    });
    const built = { settings, graph };
    this.graphs.set(key2, built);
    return built;
  }
  /**
   * tf's library files: listed once (until a watched file changes), read like any other file, so
   * an open library file's unsaved text counts and a changed one is read again.
   */
  library(dir) {
    return this.libraryListing(dir).files.flatMap((file) => {
      const text = this.read(file);
      return text === void 0 ? [] : [{ path: file, text, defs: this.librarySymbols(file, text) }];
    });
  }
  /** The library's files, kept until a watched file changes, or for a few seconds when no watcher covers it. */
  libraryListing(dir) {
    const key2 = fileKey(dir);
    let listed = this.libraries.get(key2);
    if (!listed || !this.isWatched(dir) && Date.now() - listed.at >= UNWATCHED_WALK_MS) {
      listed = { files: this.fs.listTfFiles(dir).map((f) => path4.resolve(f)), at: Date.now() };
      this.libraries.set(key2, listed);
    }
    return listed;
  }
  librarySymbolCache = /* @__PURE__ */ new Map();
  librarySymbols(file, text) {
    const cached = this.librarySymbolCache.get(fileKey(file));
    if (cached && cached.text === text) return cached.defs;
    const defs = getDocumentSymbols(text).filter((s) => s.kind === "def");
    this.librarySymbolCache.set(fileKey(file), { text, defs });
    return defs;
  }
  /**
   * The context `file` is seen in: the active one if its load path reaches the file, else the
   * first context that does (tf can only have read the file that way), else the active one.
   */
  contextFor(file) {
    this.refreshUnwatched();
    const folder = this.folderFor(file);
    const settings = this.settingsFor(folder);
    const self = fileKey(file);
    const reaches = (name2) => this.graphFor(folder, name2).graph.files.some((f) => fileKey(f.path) === self);
    const name = [settings.activeContext, ...settings.contexts.map((c) => c.name)].find(reaches) ?? settings.activeContext;
    return { folder, name, settings, graph: this.graphFor(folder, name).graph };
  }
  /**
   * Every context of `file`'s folder: whether it loads the file, through which chain of loads
   * (entry file first, the file itself last), and which context the file is seen in.
   */
  contextInfo(file) {
    const { folder, name, settings } = this.contextFor(file);
    const contexts = settings.contexts.map((c) => {
      const byKey = new Map(this.graphFor(folder, c.name).graph.files.map((f) => [fileKey(f.path), f]));
      const chain2 = [];
      const seen = /* @__PURE__ */ new Set();
      let at2 = byKey.get(fileKey(file));
      while (at2 && !seen.has(fileKey(at2.path))) {
        seen.add(fileKey(at2.path));
        chain2.unshift(this.label(at2.path, folder, settings.libraryDir));
        const from = at2.sites[0]?.from;
        at2 = from === void 0 ? void 0 : byKey.get(fileKey(from));
      }
      const entryFiles = c.entryFiles.map((e) => this.label(e, folder, settings.libraryDir));
      return { name: c.name, entryFiles, loadsFile: chain2.length > 0, chain: chain2 };
    });
    return { folder, active: settings.activeContext, used: name, contexts };
  }
  /** How to name a file to the user: a library file by its name, a workspace file relative to the folder. */
  label(f, folder, lib) {
    if (lib && isInside(f, lib)) return path4.basename(f);
    const rel = path4.relative(folder, f);
    return rel.startsWith("..") || path4.isAbsolute(rel) ? f : rel.replace(/\\/g, "/");
  }
  /** unresolved-load and (if enabled) undefined-macro diagnostics for `file`, from its context's graph. */
  loadPathDiagnostics(file, text) {
    const { folder, graph, settings } = this.contextFor(file);
    const options = this.raw.get(fileKey(folder))?.diagnostics;
    const library = [settings, ...this.folders.map((f) => this.settingsFor(f))].some((s) => s.libraryDir !== void 0 && isInside(file, s.libraryDir));
    const undefinedMacros2 = (options?.undefinedMacros ?? true) && !library;
    return loadPathDiagnostics(
      file,
      text,
      graph,
      { unresolvedLoads: options?.unresolvedLoads ?? true, undefinedMacros: undefinedMacros2, ignoreMacros: options?.ignoreMacros ?? [] },
      undefinedMacros2 ? this.macroContext(file, folder, graph, settings) : {}
    );
  }
  /**
   * Whether a macro name (lower case) is already defined where `file` runs: in it, on its load
   * path, anywhere else in its workspace folder, or in tf's library. For naming a new macro, so it
   * doesn't redefine one: as generous as the undefined-macro check, a name built when a /def runs
   * (`/def ~body_%1`) takes every name it could make.
   */
  macroNameTaken(file, text) {
    const { folder, graph, settings } = this.contextFor(file);
    const sets = [this.macroNamesOf(file, text), ...graph.files.map((f) => this.macroNamesOf(f.path, f.text))];
    for (const e of this.macroContext(file, folder, graph, settings).elsewhere ?? []) sets.push(e.defs);
    return (name) => sets.some((d) => d.names.has(name) || d.prefixes.some((p) => name.startsWith(p)));
  }
  /**
   * Whether a macro name (lower case) may be defined in a file other than `file`: on its load path
   * (tf's library among them), or anywhere in its workspace folder, by name or by a name built
   * when the /def runs. For inlining, which needs the one /def a call runs.
   */
  macroDefinedOutside(file) {
    const { folder, graph, settings } = this.contextFor(file);
    const self = fileKey(file);
    const sets = graph.files.filter((f) => fileKey(f.path) !== self).map((f) => this.macroNamesOf(f.path, f.text));
    for (const e of this.macroContext(file, folder, graph, settings).elsewhere ?? []) if (fileKey(e.file) !== self) sets.push(e.defs);
    for (const f of this.callerFiles(file, (p) => p)) if (fileKey(f.uri) !== self) sets.push(this.macroNamesOf(f.uri, f.text));
    return (name) => sets.some((d) => d.names.has(name) || d.prefixes.some((p) => name.startsWith(p)));
  }
  /**
   * Whether a macro name (lower case) is called as a function, `name(...)`, in `file` (its `text`)
   * or any file a call to its macros may come from (callerFiles()).
   */
  macroCalledAsFunction(file, text) {
    const self = fileKey(file);
    const names = new Set(findFunctionCalls(text).map((c) => c.name.toLowerCase()));
    for (const f of this.callerFiles(file, (p) => p)) {
      if (fileKey(f.uri) === self) continue;
      for (const c of findFunctionCalls(f.text)) names.add(c.name.toLowerCase());
    }
    return (name) => names.has(name);
  }
  /** Whether `file` is in tf's library (the folder's libraryPath, or TFLIBDIR). */
  isLibraryFile(file) {
    const libs = [this.contextFor(file).settings.libraryDir, ...this.folders.map((f) => this.settingsFor(f).libraryDir)];
    return libs.some((lib) => lib !== void 0 && lib !== "" && isInside(file, lib));
  }
  /**
   * Whether a file other than `file`, of those a call to its macros may come from (callerFiles()),
   * names `name` (lower case) as a whole word: before a /def is removed.
   */
  macroMentionedOutside(file) {
    const self = fileKey(file);
    const texts = this.callerFiles(file, (f) => f).filter((f) => fileKey(f.uri) !== self).map((f) => f.text.toLowerCase());
    return (name) => {
      const re = new RegExp(`(?<![\\w~])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w~])`);
      return texts.some((t) => re.test(t));
    };
  }
  /**
   * Every tf script under a workspace folder (`walkTfFiles`), until a watched file changes:
   * walking the folder on every keystroke cost seconds in a big tree. Capped, so a folder like a
   * home directory can't take forever. A folder that isn't a workspace folder (a loose file's own
   * directory) is never walked.
   */
  walks = /* @__PURE__ */ new Map();
  /** Per file, by its text: the macros it defines and the loads it makes. */
  analyses = /* @__PURE__ */ new Map();
  /** Whether a load path resolves, per search environment (cleared when files or settings change). */
  resolvable = /* @__PURE__ */ new Map();
  /** Per graph, and the folder listing it was built from (which a refresh replaces). */
  macroContexts = /* @__PURE__ */ new WeakMap();
  /**
   * A watched file or folder was created, changed or deleted (or renamed): forget what was read
   * from disk, the folder listings and the library's, since a folder's files may have gone with it.
   */
  filesChanged() {
    this.disk.clear();
    this.walks.clear();
    this.libraries.clear();
    this.resolvable.clear();
    this.invalidate();
  }
  isWorkspaceFolder(folder) {
    return this.folders.some((f) => fileKey(f) === fileKey(folder));
  }
  /**
   * The tf files of a workspace folder, at most MAX_WALKED_FILES (the walk stops there), kept until
   * a watched file changes, or for a few seconds when no watcher covers the folder.
   */
  walk(folder) {
    if (!this.isWorkspaceFolder(folder)) return NOT_WALKED;
    const key2 = fileKey(folder);
    const cached = this.walks.get(key2);
    if (cached && (this.isWatched(folder) || Date.now() - cached.at < UNWATCHED_WALK_MS)) return cached;
    const found = this.fs.walkTfFiles(folder, MAX_WALKED_FILES + 1);
    const walked = { files: found.slice(0, MAX_WALKED_FILES), truncated: found.length > MAX_WALKED_FILES, at: Date.now() };
    this.walks.set(key2, walked);
    return walked;
  }
  analysis(file, text) {
    const key2 = fileKey(file);
    const cached = this.analyses.get(key2);
    if (cached && cached.text === text) return cached;
    const loads = [];
    for (const entry of splitLogicalEntries(text)) {
      if (entry.incomplete) continue;
      for (const load of entryLoads(entry)) {
        const literal = literalText(load.file, load.pending)?.trim();
        loads.push({ raw: entry.text.slice(load.start, load.end), ...literal === void 0 ? {} : { literal }, line: entry.startLine });
      }
    }
    const result = { text, defs: macroNames(text), loads };
    this.analyses.set(key2, result);
    return result;
  }
  macroNamesOf = (file, text) => this.analysis(file, text).defs;
  resolves(literal, env) {
    const key2 = `${JSON.stringify([env.workingDir, env.home, env.tfPath, env.libraryDir, env.local, env.pathMappings])}\0${literal}`;
    let found = this.resolvable.get(key2);
    if (found === void 0) {
      found = resolveLoadPath(literal, env).found !== void 0;
      this.resolvable.set(key2, found);
    }
    return found;
  }
  /**
   * What the undefined-macro check needs to know about the rest of the workspace, for `file`:
   * the files its load path doesn't reach and the macros they define, the loads that can't be
   * followed, and how to /require a file from it. The folder's files, their contents and what
   * each defines and loads are cached until a watched file changes (an edit only changes the one
   * file's text); what depends on the load graph is worked out once per graph.
   */
  macroContext(file, folder, graph, settings) {
    const lib = settings.libraryDir;
    const walked = this.walk(folder);
    const listed = lib ? this.libraryListing(lib) : void 0;
    let shared = this.macroContexts.get(graph);
    if (!shared || shared.walked !== walked || shared.listed !== listed) {
      const { files, truncated } = walked;
      const reached = new Set(graph.files.map((f) => fileKey(f.path)));
      const elsewhere = [];
      const add = (f, text, library) => {
        if (reached.has(fileKey(f))) return;
        reached.add(fileKey(f));
        elsewhere.push({ file: path4.resolve(f), label: this.label(f, folder, lib), library, defs: this.macroNamesOf(f, text) });
      };
      for (const f of files) {
        const text = this.read(f);
        if (text !== void 0) add(f, text, Boolean(lib && isInside(f, lib)));
      }
      if (lib) for (const f of this.library(lib)) add(f.path, f.text, true);
      const unfollowed = unfollowedOnPath(graph, (f) => this.label(f, folder, lib));
      shared = { walked, listed, elsewhere, unfollowed, files, truncated };
      this.macroContexts.set(graph, shared);
    }
    const self = fileKey(file);
    const onPath = graph.files.find((f) => fileKey(f.path) === self);
    const env = onPath ? this.envAt(onPath.searchEnv, settings) : this.envFor(settings);
    return {
      // A file is never "elsewhere" to itself.
      elsewhere: shared.elsewhere.filter((e) => fileKey(e.file) !== self),
      unfollowed: onPath ? shared.unfollowed : this.offPathUnfollowed(file, shared.files, folder, settings),
      requirePath: (target) => this.requirePath(target, env, settings),
      namesOf: this.macroNamesOf,
      ...shared.truncated ? { readOnly: MAX_WALKED_FILES } : {}
    };
  }
  /**
   * For a file no load path reaches: the loads that can't be followed in it and in the files that
   * may load it, directly or not. A file may load it when one of its loads ends with this file's
   * name and the folders before it (`/require tf-wotmud/score.tf` for `.../tf-wotmud/score.tf`):
   * how tf finds it isn't known, so only the name can be compared. A loose file (in no workspace
   * folder) only has its own loads.
   */
  offPathUnfollowed(file, files, folder, settings) {
    const env = this.envFor(settings);
    const loadsOf = (f) => {
      const text = this.read(f);
      const loads = text === void 0 ? [] : this.analysis(f, text).loads;
      return {
        written: loads.flatMap((l) => l.literal === void 0 ? [] : [l.literal]),
        unfollowed: loads.filter((l) => l.literal === void 0 || !this.resolves(l.literal, env)).map((l) => ({ raw: l.raw, label: this.label(f, folder, settings.libraryDir), line: l.line }))
      };
    };
    const segments = (p) => p.replace(/\\/g, "/").split("/").filter((s) => s !== "" && s !== ".");
    const names = (target, written) => {
      const t = segments(target);
      const w = segments(written).filter((s) => s !== ".." && s !== "~" && !s.startsWith("~"));
      if (w.length === 0) return false;
      const n = Math.min(t.length, w.length);
      for (let i = 1; i <= n; i += 1) if (t[t.length - i] !== w[w.length - i]) return false;
      return true;
    };
    const fold = (s) => process.platform === "win32" ? s.toLowerCase() : s;
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    const queue = [file];
    while (queue.length > 0) {
      const f = queue.shift();
      const key2 = fileKey(f);
      if (seen.has(key2)) continue;
      seen.add(key2);
      out.push(...loadsOf(f).unfollowed);
      for (const other of files) {
        if (!seen.has(fileKey(other)) && loadsOf(other).written.some((w) => names(key2, fold(w)))) queue.push(other);
      }
    }
    return out;
  }
  /**
   * What to write after `/require`, in a file read with `env`'s TFPATH and TFLIBDIR, for tf to
   * load `target`: its path from tf's current directory, or from a TFPATH directory (TFLIBDIR
   * when TFPATH is empty), checked by resolving it the way tf would; else tf's own absolute path
   * for it, through a path mapping. Undefined when none of them reaches it.
   */
  requirePath(target, env, settings) {
    const local = (dir, isLocal) => isLocal ? dir : toLocalPath(dir, settings.pathMappings);
    const dirs = [
      env.workingDir,
      ...env.tfPath.length > 0 ? env.tfPath.map((d) => local(d, env.local?.tfPath)) : env.libraryDir ? [local(env.libraryDir, env.local?.libraryDir)] : []
    ];
    const candidates = dirs.flatMap((dir) => {
      const rel = path4.relative(dir, target);
      return rel === "" || rel.startsWith("..") || path4.isAbsolute(rel) ? [] : [rel.replace(/\\/g, "/")];
    });
    const tfPath = toTfPath(target, settings.pathMappings);
    if (tfPath !== void 0) candidates.push(tfPath);
    return candidates.find((written) => {
      if (/\s\s/.test(written)) return false;
      const found = resolveLoadPath(written, env).found;
      return found !== void 0 && fileKey(found) === fileKey(target);
    });
  }
  /** How tf finds a file, with the settings tf starts with: their folders are already here. */
  envFor(settings) {
    return {
      home: settings.home,
      tfPath: settings.tfPath,
      libraryDir: settings.libraryDir,
      workingDir: settings.workingDir,
      pathMappings: settings.pathMappings,
      local: { home: true, tfPath: true, libraryDir: true },
      readFile: this.read
    };
  }
  /** How tf finds a file at some point on the load path, with the search variables it had then. */
  envAt(at2, settings) {
    return {
      home: at2.home,
      tfPath: at2.tfPath,
      ...at2.libraryDir === void 0 ? {} : { libraryDir: at2.libraryDir },
      workingDir: settings.workingDir,
      pathMappings: settings.pathMappings,
      local: at2.local,
      readFile: this.read
    };
  }
  /**
   * The file each `/load` and `/require` in `text` opens. A load that runs while the file loads
   * (a top-level command, or one a top-level `/eval` runs), in a file the load path reaches,
   * resolves as the load graph found it, with the TFPATH and HOME that were set at that point (a
   * tfrc may change them), and has no link when tf wouldn't find it. A load in a macro body runs
   * whenever the macro does, and nothing is known about a file nothing loads, so those resolve
   * with the settings' TFPATH, TFLIBDIR, HOME and working directory.
   */
  documentLinks(file, text) {
    const { settings, graph } = this.contextFor(file);
    const self = fileKey(file);
    const onPath = graph.files.some((f) => fileKey(f.path) === self);
    const env = this.envFor(settings);
    const links = findLoadPaths(text).flatMap((load) => {
      let target;
      if (onPath && load.topLevel) {
        target = graph.resolved.find((r) => fileKey(r.from) === self && r.line === load.line && r.offset === load.offset)?.file;
      } else {
        const found = resolveLoadPath(load.file, env).found;
        target = found === void 0 ? void 0 : path4.resolve(found);
      }
      return target === void 0 ? [] : [{ range: load.range, target, kind: load.kind }];
    });
    if (!onPath) return links;
    const linked = new Set(links.map((l) => `${l.range.start.line}:${l.range.start.character}`));
    const entries = splitLogicalEntries(text);
    for (const r of graph.resolved) {
      if (fileKey(r.from) !== self) continue;
      const entry = entries.find((e) => e.startLine === r.line);
      const from = entry?.offsetMap[r.offset];
      const last = entry?.offsetMap[r.offset + r.raw.length - 1];
      if (!from || !last || from.line !== last.line || linked.has(`${from.line}:${from.character}`)) continue;
      links.push({
        range: { start: { line: from.line, character: from.character }, end: { line: last.line, character: last.character + 1 } },
        target: r.file,
        kind: r.kind
      });
    }
    return links.sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character);
  }
  /**
   * What the rest of the workspace knows about `file`, in the context it is seen in. If that
   * context's load path reaches it, every other file on that path; otherwise just what
   * stdlib.tf loads, which tf always reads first. Plus, as "not loaded" hints, the tf library
   * files the path never reaches.
   */
  navContext(file, uriOf) {
    const { folder, settings, graph } = this.contextFor(file);
    return this.buildNavContext(file, uriOf, folder, settings, graph);
  }
  /**
   * navContext(), kept per load graph (which an edit or a changed file replaces), for call
   * hierarchy, which needs one for every file that calls the macro. Its locations use the URIs
   * `uriOf` gave when it was built, so it isn't for answers that open a file.
   */
  callerContext(file, uriOf) {
    const { folder, settings, graph } = this.contextFor(file);
    let byFile = this.navContexts.get(graph);
    if (!byFile) {
      byFile = /* @__PURE__ */ new Map();
      this.navContexts.set(graph, byFile);
    }
    const cached = byFile.get(fileKey(file));
    if (cached && cached.uriOf === uriOf) return cached.ctx;
    const ctx = this.buildNavContext(file, uriOf, folder, settings, graph);
    byFile.set(fileKey(file), { uriOf, ctx });
    return ctx;
  }
  navContexts = /* @__PURE__ */ new WeakMap();
  buildNavContext(file, uriOf, folder, settings, graph) {
    const self = fileKey(file);
    const onPath = graph.files.some((f) => fileKey(f.path) === self);
    const loaded = graph.files.filter((f) => fileKey(f.path) !== self && (onPath || f.stdlib));
    const lib = settings.libraryDir;
    const label = (f) => this.label(f, folder, lib);
    const isLibrary = (f) => Boolean(lib && isInside(f, lib));
    const macros = loaded.flatMap((f) => {
      const lines = splitRawLines(f.text);
      return f.defs.map((d) => ({
        uri: uriOf(f.path),
        label: label(f.path),
        symbol: d.symbol,
        lines,
        library: isLibrary(f.path),
        loaded: true
      }));
    });
    if (lib) {
      const reached = new Set(graph.files.filter((f) => onPath || f.stdlib).map((f) => fileKey(f.path)));
      for (const f of this.library(lib)) {
        if (reached.has(fileKey(f.path)) || fileKey(f.path) === self) continue;
        const lines = splitRawLines(f.text);
        for (const symbol of f.defs) {
          macros.push({ uri: uriOf(f.path), label: label(f.path), symbol, lines, library: true, loaded: false });
        }
      }
    }
    return {
      uri: uriOf(file),
      files: onPath ? loaded.filter((f) => !isLibrary(f.path)).map((f) => ({ uri: uriOf(f.path), text: f.text })) : [],
      macros,
      libraryFiles: loaded.filter((f) => isLibrary(f.path)).map((f) => ({ uri: uriOf(f.path), text: f.text })),
      help: lib ? this.help(lib) : void 0
    };
  }
  /**
   * Every file a call to a macro defined in `file` may come from: `file` itself, the files on
   * its load path (tf's library among them), and every tf script in its workspace folder,
   * reached by a load path or not. A file outside every workspace folder (tf's library, say) is
   * called from the scripts of all of them, so then every folder is searched, with what each
   * folder's load path reaches.
   */
  callerFiles(file, uriOf) {
    const { folder, graph } = this.contextFor(file);
    const out = /* @__PURE__ */ new Map();
    const add = (p, text) => {
      const key2 = fileKey(p);
      if (out.has(key2)) return;
      const t = text ?? this.read(p);
      if (t !== void 0) out.set(key2, { uri: uriOf(path4.resolve(p)), text: t });
    };
    add(file);
    for (const f of graph.files) add(f.path, f.text);
    for (const f of this.isWorkspaceFolder(folder) ? [folder] : this.folders) {
      for (const loaded of this.graphFor(f).graph.files) add(loaded.path, loaded.text);
      for (const walked of this.walk(f).files) add(walked);
    }
    return [...out.values()];
  }
  /** Whether `file`'s folder shows "N references" above each /def. Default on. */
  referenceLenses(file) {
    return this.raw.get(fileKey(this.folderFor(file)))?.codeLens?.references ?? true;
  }
  help(dir) {
    const key2 = fileKey(dir);
    if (!this.helps.has(key2)) {
      const text = this.fs.readFile(path4.join(dir, "tf-help"));
      this.helps.set(key2, text === void 0 ? void 0 : parseTfHelp(text));
    }
    return this.helps.get(key2);
  }
};

// packages/core/src/workspace/nodeFileSystem.ts
var import_node_fs = require("node:fs");
var import_node_os = require("node:os");
var path5 = __toESM(require("node:path"));
var SKIP_DIRS = /* @__PURE__ */ new Set([".git", ".jj", "node_modules"]);
function isSkippedDir(name) {
  return SKIP_DIRS.has(process.platform === "win32" ? name.toLowerCase() : name);
}
function readFile(file) {
  try {
    return (0, import_node_fs.readFileSync)(file, "utf8");
  } catch {
    return void 0;
  }
}
function listTfFiles(dir) {
  try {
    return (0, import_node_fs.readdirSync)(dir).filter((f) => f.endsWith(".tf")).map((f) => path5.join(dir, f));
  } catch {
    return [];
  }
}
function walkTfFiles(dir, limit = Infinity) {
  const out = [];
  const visit = (d) => {
    let entries;
    try {
      entries = (0, import_node_fs.readdirSync)(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= limit) return;
      const full = path5.join(d, e.name);
      if (e.isDirectory()) {
        if (!isSkippedDir(e.name)) visit(full);
      } else if (e.name.endsWith(".tf") || e.name === "tfrc" || e.name === ".tfrc") {
        out.push(full);
      }
    }
  };
  visit(dir);
  return out;
}
function mtime(file) {
  try {
    return (0, import_node_fs.statSync)(file).mtimeMs;
  } catch {
    return void 0;
  }
}
var nodeFileSystem = { readFile, listTfFiles, walkTfFiles, mtime };
function nodeEnvironment() {
  return { env: process.env, homedir: (0, import_node_os.homedir)(), exists: import_node_fs.existsSync };
}

// packages/core/src/workspace/documentDiagnostics.ts
function documentDiagnostics(text, file, index2) {
  return [...getDiagnostics(text), ...file ? index2.loadPathDiagnostics(file, text) : []];
}

// packages/server/src/watching.ts
var path6 = __toESM(require("node:path"));
var import_node_url = require("node:url");
var CREATE = 1;
var CHANGE = 2;
var DELETE = 4;
var TF_FILES = "**/{*.tf,tfrc,.tfrc}";
var REGISTER_TIMEOUT_MS = 5e3;
function isWithin(file, dir) {
  const rel = path6.relative(fileKey(dir), fileKey(file));
  return rel === "" || !rel.startsWith("..") && !path6.isAbsolute(rel);
}
function watchPlan(folders2, settings, relativePatterns, osHome) {
  const homes = new Map([[fileKey(osHome), osHome], ...settings.map((s) => [fileKey(s.home), s.home])]);
  const bounded = (dir) => path6.parse(dir).root !== dir && ![...homes.values()].some((h) => isWithin(h, dir));
  const watchers = [
    { globPattern: TF_FILES, kind: CREATE | CHANGE | DELETE },
    { globPattern: "**/*", kind: CREATE | DELETE }
  ];
  const roots = folders2.filter(bounded);
  if (!relativePatterns) return { watchers, roots };
  const extra = /* @__PURE__ */ new Map();
  for (const s of settings) {
    for (const dir of [s.libraryDir, ...s.pathMappings.map((m) => m.local)]) {
      if (!dir || !bounded(dir) || roots.some((r) => isWithin(dir, r))) continue;
      extra.set(fileKey(dir), dir);
    }
  }
  for (const dir of extra.values()) {
    const baseUri = (0, import_node_url.pathToFileURL)(dir).href;
    watchers.push({ globPattern: { baseUri, pattern: TF_FILES }, kind: CREATE | CHANGE | DELETE });
    watchers.push({ globPattern: { baseUri, pattern: "**/*" }, kind: CREATE | DELETE });
    roots.push(dir);
  }
  for (const home of homes.values()) {
    if (roots.some((r) => isWithin(home, r))) continue;
    watchers.push({ globPattern: { baseUri: (0, import_node_url.pathToFileURL)(home).href, pattern: "{tfrc,.tfrc}" }, kind: CREATE | CHANGE | DELETE });
    roots.push(path6.join(home, "tfrc"), path6.join(home, ".tfrc"));
  }
  return { watchers, roots };
}
function relevantChange(file) {
  return !file.split(/[\\/]/).some(isSkippedDir);
}
var Watching = class {
  constructor(register, setRoots, log, changed = () => void 0, timeoutMs = REGISTER_TIMEOUT_MS) {
    this.register = register;
    this.setRoots = setRoots;
    this.log = log;
    this.changed = changed;
    this.timeoutMs = timeoutMs;
  }
  register;
  setRoots;
  log;
  changed;
  timeoutMs;
  current;
  queue = Promise.resolve();
  update(makePlan) {
    this.queue = this.queue.then(() => this.apply(makePlan));
    return this.queue;
  }
  drop() {
    this.current?.dispose();
    this.current = void 0;
  }
  async apply(makePlan) {
    let plan4;
    try {
      plan4 = makePlan();
    } catch (error) {
      this.log(`tfscript: the file watchers couldn't be worked out, so files are checked by modification time: ${String(error)}`);
    }
    if (!plan4) {
      this.drop();
      this.setRoots([]);
      return;
    }
    const pending = this.register(plan4.watchers);
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`no answer in ${this.timeoutMs} ms`)), this.timeoutMs);
    });
    try {
      const registration = await Promise.race([pending, timeout]);
      this.drop();
      this.current = registration;
      this.setRoots(plan4.roots);
      this.changed();
    } catch (error) {
      pending.then((late) => late.dispose(), () => void 0);
      this.log(`tfscript: the client refused the file watchers, so files are checked by modification time: ${String(error)}`);
      this.drop();
      this.setRoots([]);
    } finally {
      clearTimeout(timer);
    }
  }
};

// packages/server/src/rejections.ts
function logUnhandledRejections(target, write) {
  target.on("unhandledRejection", (reason) => {
    write(`tfscript: unhandled rejection: ${reason instanceof Error ? reason.stack ?? reason.message : String(reason)}
`);
  });
}

// packages/server/src/server.ts
var connection = (0, import_node4.createConnection)(import_node4.ProposedFeatures.all, process.stdin, process.stdout);
logUnhandledRejections(process, (text) => process.stderr.write(text));
var documents = new import_node4.TextDocuments(TextDocument);
var index = new WorkspaceIndex(nodeFileSystem, nodeEnvironment());
var folders = [];
var hasConfiguration = false;
var canRefreshTokens = false;
var canRefreshLenses = false;
var showReferencesCommand;
var renameCommand;
function toPath(uri) {
  if (!uri.startsWith("file:")) return void 0;
  try {
    return (0, import_node_url2.fileURLToPath)(uri);
  } catch {
    return void 0;
  }
}
var sameFile = (a, b) => fileKey(a) === fileKey(b);
function toUri(file) {
  const open = documents.all().find((d) => {
    const p = toPath(d.uri);
    return p !== void 0 && sameFile(p, file);
  });
  return open?.uri ?? (0, import_node_url2.pathToFileURL)(file).href;
}
function contextFor(document) {
  const file = toPath(document.uri);
  return file === void 0 ? void 0 : index.navContext(file, toUri);
}
var settingsQueue = Promise.resolve();
function loadSettings() {
  settingsQueue = settingsQueue.then(loadSettingsNow, loadSettingsNow);
  return settingsQueue;
}
async function loadSettingsNow() {
  try {
    if (hasConfiguration) {
      for (const folder of folders) {
        const raw = await connection.workspace.getConfiguration({
          scopeUri: (0, import_node_url2.pathToFileURL)(folder).href,
          section: "tfscript"
        });
        index.setSettings(folder, raw ?? {});
      }
    }
    await watching.update(
      () => canWatch ? watchPlan(folders, folders.map((f) => index.settingsFor(f)), canWatchOutside, (0, import_node_os2.homedir)()) : void 0
    );
  } catch (error) {
    connection.console.error(`tfscript: reading the settings failed: ${String(error)}`);
  } finally {
    revalidateOpenDocuments();
  }
}
var canWatch = false;
var canWatchOutside = false;
var canShowDisabled = false;
var watching = new Watching(
  (watchers) => connection.client.register(import_node4.DidChangeWatchedFilesNotification.type, { watchers }),
  (roots) => index.setWatchedRoots(roots),
  (message) => connection.console.error(message),
  // Changes made before the new watchers were in place weren't reported to anyone.
  () => index.filesChanged()
);
index.setRecheck((delayMs) => setTimeout(revalidateOpenDocuments, delayMs + 10));
connection.onInitialize((params) => {
  folders = (params.workspaceFolders ?? []).map((f) => toPath(f.uri)).filter((f) => f !== void 0);
  if (folders.length === 0 && params.rootUri) {
    const root = toPath(params.rootUri);
    if (root) folders = [root];
  }
  index.setFolders(folders);
  hasConfiguration = Boolean(params.capabilities.workspace?.configuration);
  canRefreshTokens = Boolean(params.capabilities.workspace?.semanticTokens?.refreshSupport);
  canRefreshLenses = Boolean(params.capabilities.workspace?.codeLens?.refreshSupport);
  const command2 = params.initializationOptions?.showReferencesCommand;
  showReferencesCommand = typeof command2 === "string" && command2.length > 0 ? command2 : void 0;
  const rename = params.initializationOptions?.renameCommand;
  renameCommand = typeof rename === "string" && rename.length > 0 ? rename : void 0;
  canWatch = Boolean(params.capabilities.workspace?.didChangeWatchedFiles?.dynamicRegistration);
  canWatchOutside = canWatch && Boolean(params.capabilities.workspace?.didChangeWatchedFiles?.relativePatternSupport);
  canShowDisabled = Boolean(params.capabilities.textDocument?.codeAction?.disabledSupport);
  return {
    capabilities: {
      workspace: { workspaceFolders: { supported: true, changeNotifications: true } },
      textDocumentSync: import_node4.TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ["/", "{"] },
      documentSymbolProvider: true,
      documentLinkProvider: { resolveProvider: false },
      foldingRangeProvider: true,
      selectionRangeProvider: true,
      codeActionProvider: { codeActionKinds: [import_node4.CodeActionKind.QuickFix, import_node4.CodeActionKind.RefactorRewrite, import_node4.CodeActionKind.RefactorExtract, import_node4.CodeActionKind.RefactorInline] },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      documentHighlightProvider: true,
      callHierarchyProvider: true,
      codeLensProvider: { resolveProvider: true },
      workspaceSymbolProvider: true,
      renameProvider: { prepareProvider: true },
      semanticTokensProvider: { legend: { tokenTypes: [...TOKEN_TYPES], tokenModifiers: [...TOKEN_MODIFIERS] }, full: true },
      documentFormattingProvider: true,
      documentRangeFormattingProvider: true,
      signatureHelpProvider: { triggerCharacters: [" ", "(", ","], retriggerCharacters: ["=", "-", ")"] }
    }
  };
});
connection.onInitialized(() => {
  if (hasConfiguration) {
    connection.client.register(import_node4.DidChangeConfigurationNotification.type, void 0).catch((error) => connection.console.error(`tfscript: the client refused configuration change notifications: ${String(error)}`));
  }
  void loadSettings();
  connection.workspace.onDidChangeWorkspaceFolders((event) => {
    const removed = event.removed.map((f) => toPath(f.uri));
    folders = folders.filter((f) => !removed.some((r) => r !== void 0 && sameFile(r, f)));
    for (const f of event.added) {
      const p = toPath(f.uri);
      if (p) folders.push(p);
    }
    index.setFolders(folders);
    void loadSettings();
  });
});
connection.onDidChangeConfiguration(() => void loadSettings());
connection.onDidChangeWatchedFiles((params) => {
  if (!params.changes.some((c) => relevantChange(toPath(c.uri) ?? c.uri))) return;
  index.filesChanged();
  scheduleRevalidation();
});
var revalidateTimer;
function scheduleRevalidation() {
  if (revalidateTimer) clearTimeout(revalidateTimer);
  revalidateTimer = setTimeout(revalidateOpenDocuments, 300);
}
function revalidateOpenDocuments() {
  revalidateTimer = void 0;
  for (const document of documents.all()) validate(document);
  if (canRefreshTokens) connection.languages.semanticTokens.refresh();
  if (canRefreshLenses) void connection.sendRequest(import_node4.CodeLensRefreshRequest.type).catch(() => void 0);
}
documents.onDidChangeContent((change) => {
  const file = toPath(change.document.uri);
  if (file) index.setOverlay(file, change.document.getText());
  validate(change.document);
  scheduleRevalidation();
});
documents.onDidClose((event) => {
  published.delete(event.document.uri);
  const file = toPath(event.document.uri);
  if (file) index.setOverlay(file, void 0);
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
  scheduleRevalidation();
});
function toLspDiagnostic(d, uri) {
  return {
    range: d.range,
    message: d.message,
    code: d.code,
    // The code shows as a link to its entry in docs/rules.md.
    ...findCode(d.code) ? { codeDescription: { href: codeHref(d.code) } } : {},
    source: "tfscript",
    ...d.related ? { relatedInformation: d.related.map((r) => ({ location: { uri, range: r.range }, message: r.message })) } : {},
    severity: d.severity === "error" ? import_node4.DiagnosticSeverity.Error : d.severity === "warning" ? import_node4.DiagnosticSeverity.Warning : import_node4.DiagnosticSeverity.Information
  };
}
function validate(document) {
  const text = document.getText();
  const file = toPath(document.uri);
  const all = documentDiagnostics(text, file, index);
  published.set(document.uri, { version: document.version, diagnostics: all });
  connection.sendDiagnostics({ uri: document.uri, diagnostics: all.map((d) => toLspDiagnostic(d, document.uri)) });
}
var published = /* @__PURE__ */ new Map();
function diagnosticsFor(document) {
  const last = published.get(document.uri);
  return last && last.version === document.version ? last.diagnostics : getDiagnostics(document.getText());
}
connection.onCompletion((params) => {
  const document = documents.get(params.textDocument.uri);
  return document ? getCompletions(document.getText(), params.position, contextFor(document)) : [];
});
connection.onDocumentSymbol((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getDocumentSymbols(document.getText()).map(toDocumentSymbol);
});
connection.onFoldingRanges((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getFoldingRanges(document.getText()).map(toFoldingRange);
});
connection.onSelectionRanges((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getSelectionRanges(document.getText(), params.positions);
});
connection.onCodeAction((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const request = { range: params.range, diagnostics: diagnosticsFor(document), disabledSupport: canShowDisabled };
  if (params.context.only) request.only = params.context.only;
  if (params.context.triggerKind !== void 0) request.triggerKind = params.context.triggerKind;
  const file = toPath(document.uri);
  let taken;
  if (file) request.isTaken = (name) => (taken ??= index.macroNameTaken(file, document.getText()))(name);
  let outside;
  let mentioned;
  if (file) request.definedOutside = (name) => (outside ??= index.macroDefinedOutside(file))(name);
  if (file) request.mentionedOutside = (name) => (mentioned ??= index.macroMentionedOutside(file))(name);
  if (file && index.isLibraryFile(file)) request.library = true;
  let functions;
  if (file) request.calledAsFunction = (name) => (functions ??= index.macroCalledAsFunction(file, document.getText()))(name);
  return routeCodeActions(document.getText(), request).map((action) => toLspCodeAction(action, document.uri, (d) => toLspDiagnostic(d, document.uri), renameCommand));
});
connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  const text = document.getText();
  const explained = diagnosticsFor(document).filter((d) => rangeContains(d.range, params.position)).flatMap((d) => diagnosticHover(text, d) ?? []);
  const hover = getHover(text, params.position, contextFor(document));
  const parts = [...explained, ...hover ? [hover.markdown] : []];
  if (parts.length === 0) return null;
  return {
    contents: { kind: import_node4.MarkupKind.Markdown, value: parts.join("\n\n---\n\n") },
    ...hover && explained.length === 0 ? { range: hover.range } : {}
  };
});
connection.onSignatureHelp((params) => {
  const document = documents.get(params.textDocument.uri);
  const help = document && getSignatureHelp(document.getText(), params.position, contextFor(document));
  if (!help) return null;
  return {
    signatures: help.signatures.map((s) => ({
      label: s.label,
      parameters: s.parameters.map((label) => ({ label })),
      ...s.documentation ? { documentation: s.documentation } : {}
    })),
    activeSignature: help.activeSignature,
    // -1 (no parameter, e.g. after `--`) is sent out of range so nothing is highlighted.
    activeParameter: help.activeParameter >= 0 ? help.activeParameter : help.signatures[help.activeSignature]?.parameters.length ?? 0
  };
});
connection.languages.semanticTokens.on((params) => {
  const document = documents.get(params.textDocument.uri);
  return { data: document ? encodeSemanticTokens(getSemanticTokens(document.getText(), contextFor(document))) : [] };
});
async function formatting(params) {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  let splitStatements = true;
  if (hasConfiguration) {
    const raw = await connection.workspace.getConfiguration({ scopeUri: document.uri, section: "tfscript" });
    splitStatements = raw?.format?.splitStatements ?? true;
  }
  const indent = params.options.insertSpaces ? " ".repeat(params.options.tabSize) : "	";
  const range = "range" in params ? params.range : void 0;
  return formatText(document.getText(), { indent, splitStatements }, range);
}
connection.onDocumentFormatting(formatting);
connection.onDocumentRangeFormatting(formatting);
connection.onDefinition((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const ctx = contextFor(document);
  return getDefinition(document.getText(), params.position, ctx).map((l) => ({ uri: l.uri || document.uri, range: l.range }));
});
connection.onReferences((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const ctx = contextFor(document);
  return getReferences(document.getText(), params.position, params.context.includeDeclaration, ctx).map((l) => ({
    uri: l.uri || document.uri,
    range: l.range
  }));
});
function textOf(uri) {
  const open = documents.get(uri);
  if (open) return open.getText();
  const file = toPath(uri);
  return file === void 0 ? void 0 : readFile(file);
}
function navContextOf(uri) {
  const file = toPath(uri);
  return file === void 0 ? void 0 : index.navContext(file, toUri);
}
var CALL_KIND = { macro: import_node4.SymbolKind.Function, trigger: import_node4.SymbolKind.Event, file: import_node4.SymbolKind.File };
function toCallItem(item) {
  const { kind, ...rest } = item;
  return { ...rest, kind: CALL_KIND[kind], data: { kind } };
}
function fromCallItem(item) {
  const kind = item.data?.kind ?? "macro";
  return { name: item.name, kind, uri: item.uri, range: item.range, selectionRange: item.selectionRange, detail: item.detail ?? "" };
}
connection.languages.callHierarchy.onPrepare((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  const items = prepareCallHierarchy(document.getText(), params.position, contextFor(document));
  return items.length > 0 ? items.map((i) => toCallItem({ ...i, uri: i.uri || document.uri })) : null;
});
connection.languages.callHierarchy.onIncomingCalls((params) => {
  const file = toPath(params.item.uri);
  if (file === void 0) return [];
  const callers = {
    contextOf: (uri) => {
      const caller = toPath(uri);
      return caller === void 0 ? void 0 : index.callerContext(caller, toUri);
    },
    keyOf: (uri) => fileKey(toPath(uri) ?? uri)
  };
  return incomingCalls(fromCallItem(params.item), index.callerFiles(file, toUri), callers).map((c) => ({
    from: toCallItem(c.from),
    fromRanges: c.fromRanges
  }));
});
connection.languages.callHierarchy.onOutgoingCalls((params) => {
  const text = textOf(params.item.uri);
  if (text === void 0) return [];
  return outgoingCalls(fromCallItem(params.item), text, navContextOf(params.item.uri)).map((c) => ({
    to: toCallItem({ ...c.to, uri: c.to.uri || params.item.uri }),
    fromRanges: c.fromRanges
  }));
});
connection.onCodeLens((params) => {
  const document = documents.get(params.textDocument.uri);
  const file = document && toPath(document.uri);
  if (!showReferencesCommand || !document || file === void 0 || !index.referenceLenses(file)) return [];
  return getDocumentSymbols(document.getText()).filter((s) => s.kind === "def").map((s) => ({ range: s.selectionRange, data: { uri: document.uri, position: s.selectionRange.start } }));
});
connection.onCodeLensResolve((lens) => {
  const data = lens.data;
  const document = documents.get(data.uri);
  if (!document) return { ...lens, command: { title: "references", command: "" } };
  const locations = getReferences(document.getText(), data.position, false, contextFor(document)).map((l) => ({
    uri: l.uri || document.uri,
    range: l.range
  }));
  const n = locations.length;
  return {
    ...lens,
    command: {
      title: n === 1 ? "1 reference" : `${n} references`,
      command: showReferencesCommand ?? "",
      arguments: [data.uri, data.position, locations]
    }
  };
});
connection.onDocumentHighlight((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getDocumentHighlights(document.getText(), params.position).map((h) => ({
    range: h.range,
    kind: h.kind === "write" ? import_node4.DocumentHighlightKind.Write : import_node4.DocumentHighlightKind.Read
  }));
});
connection.onDocumentLinks((params) => {
  const document = documents.get(params.textDocument.uri);
  const file = document && toPath(document.uri);
  if (!document || file === void 0) return [];
  return index.documentLinks(file, document.getText()).map((link2) => ({
    range: link2.range,
    target: toUri(link2.target),
    tooltip: `Open ${link2.target}`
  }));
});
connection.onRequest("tfscript/contextInfo", (params) => {
  const file = toPath(params.uri);
  return file === void 0 ? null : index.contextInfo(file);
});
connection.onWorkspaceSymbol(
  (params) => index.workspaceSymbols(params.query).map(({ file, folder, symbol }) => ({
    name: symbol.name,
    kind: toDocumentSymbol(symbol).kind,
    location: { uri: toUri(file), range: symbol.selectionRange },
    containerName: path7.relative(folder, file).replace(/\\/g, "/")
  }))
);
connection.onPrepareRename((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  const result = prepareRename(document.getText(), params.position, contextFor(document));
  if ("error" in result) throw new import_node4.ResponseError(import_node4.ErrorCodes.InvalidRequest, result.error);
  return result;
});
connection.onRenameRequest((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  const result = getRenameEdits(document.getText(), params.position, params.newName, contextFor(document));
  if ("error" in result) throw new import_node4.ResponseError(import_node4.ErrorCodes.InvalidRequest, result.error);
  const changes = {};
  for (const edit of result) {
    const uri = edit.uri || document.uri;
    (changes[uri] ??= []).push({ range: edit.range, newText: edit.newText });
  }
  return { changes };
});
documents.listen(connection);
connection.listen();
