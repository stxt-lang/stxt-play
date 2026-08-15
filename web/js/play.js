"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
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

  // node_modules/@stxt-lang/core/out/exceptions/ParseException.js
  var require_ParseException = __commonJS({
    "node_modules/@stxt-lang/core/out/exceptions/ParseException.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ParseException = void 0;
      var ParseException = class _ParseException extends Error {
        /**
         * Creates a syntax error located at a line of the document.
         *
         * @param line line number where the error was detected.
         * @param code error code in UPPERCASE.
         * @param message descriptive message.
         */
        constructor(line, code, message) {
          super(message);
          this.name = "ParseException";
          this.line = line;
          this.code = code;
          Object.setPrototypeOf(this, _ParseException.prototype);
        }
        /** @returns a readable representation of the error, with its line and its code. */
        toString() {
          return `${this.name} [line=${this.line}, code=${this.code}]: ${this.message}`;
        }
      };
      exports.ParseException = ParseException;
    }
  });

  // node_modules/@stxt-lang/core/out/exceptions/RuntimeException.js
  var require_RuntimeException = __commonJS({
    "node_modules/@stxt-lang/core/out/exceptions/RuntimeException.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.RuntimeException = void 0;
      var RuntimeException = class _RuntimeException extends Error {
        /**
         * Creates an error with an error code and a message.
         *
         * @param code error code in UPPERCASE.
         * @param message descriptive message.
         */
        constructor(code, message) {
          super(message);
          this.name = "RuntimeException";
          this.code = code;
          Object.setPrototypeOf(this, _RuntimeException.prototype);
        }
        /** @returns the error code in UPPERCASE. */
        getCode() {
          return this.code;
        }
        /** @returns a readable representation of the error, with its code. */
        toString() {
          const message = this.message;
          return `${this.name}[${this.code}]${message ? `: ${message}` : ""}`;
        }
      };
      exports.RuntimeException = RuntimeException;
    }
  });

  // node_modules/@stxt-lang/core/out/core/NamespaceValidator.js
  var require_NamespaceValidator = __commonJS({
    "node_modules/@stxt-lang/core/out/core/NamespaceValidator.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.NamespaceValidator = void 0;
      var ParseException_1 = require_ParseException();
      var NamespaceValidator = class _NamespaceValidator {
        /**
         * Validates the format of a namespace.
         *
         * @param namespace already normalized namespace to validate; ignored when null or empty.
         * @param lineNumber line number, for the error message.
         * @throws ParseException with code `INVALID_NAMESPACE` if it does not match the format.
         */
        static validateNamespaceFormat(namespace, lineNumber) {
          if (!namespace) {
            return;
          }
          if (!_NamespaceValidator.NAMESPACE_FORMAT.test(namespace)) {
            throw new ParseException_1.ParseException(lineNumber, "INVALID_NAMESPACE", `Namespace not valid: ${namespace}`);
          }
        }
      };
      exports.NamespaceValidator = NamespaceValidator;
      NamespaceValidator.NAMESPACE_FORMAT = /^@?[a-z0-9]+(\.[a-z0-9]+)+$/;
    }
  });

  // node_modules/@stxt-lang/core/out/core/StringUtils.js
  var require_StringUtils = __commonJS({
    "node_modules/@stxt-lang/core/out/core/StringUtils.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.StringUtils = void 0;
      var StringUtils = class {
        constructor() {
        }
        // Used for name>> nodes
        /**
         * Removes the trailing whitespace of a string.
         *
         * @param s string to strip the trailing spaces from.
         * @returns the string without trailing whitespace; null/undefined is treated as the empty string.
         */
        static rightTrim(s) {
          const value = s ?? "";
          let i = value.length - 1;
          while (i >= 0 && /\s/.test(value.charAt(i))) {
            i--;
          }
          return value.substring(0, i + 1);
        }
        // Used for BASE64 and HEXADECIMAL nodes
        /**
         * Removes every whitespace character of a string.
         *
         * @param input string to remove the spaces from.
         * @returns the string without any whitespace at all.
         */
        static cleanSpaces(input) {
          return input.replace(/\s+/g, "");
        }
        // Used to normalize namespaces
        /**
         * Lower-cases a string.
         *
         * @param input string to lower-case.
         * @returns the lower-cased string; null/undefined is treated as the empty string.
         */
        static lowerCase(input) {
          return (input ?? "").toLowerCase();
        }
        // Used for the name of the nodes
        /**
         * Trims a string and collapses its inner whitespace.
         *
         * @param s string to compact.
         * @returns the string with the outer spaces trimmed and the inner ones collapsed into a single one; null/undefined is treated as the empty string.
         */
        static compactSpaces(s) {
          return (s ?? "").trim().replace(/\s+/g, " ");
        }
        /**
         * Tells whether a value is a valid STXT node name.
         *
         * The test happens after NFC normalization: the source may use either the
         * precomposed or decomposed Unicode spelling of a letter with a diacritic.
         *
         * @param input name to validate.
         * @returns true if the name contains only permitted characters and has a non-empty canonical name.
         */
        static isValidNodeName(input) {
          const nfc = this.compactSpaces(input).normalize("NFC");
          return this.NODE_NAME.test(nfc) && this.normalize(nfc).length > 0;
        }
        // Used for the normalized name of the nodes (STXT-SPEC 4.3): NFC + lower case,
        // keeping diacritics and non-Latin alphabets (IDN model)
        /**
         * Builds the canonical name of a node, as defined by STXT-SPEC 4.3.
         *
         * @param input string to normalize.
         * @returns the canonical name of a node: NFC + lower case, with separators collapsed into '-'; null/undefined is treated as the empty string.
         */
        static normalize(input) {
          let s = (input ?? "").trim();
          if (s.length === 0) {
            return "";
          }
          s = s.normalize("NFC");
          s = s.toLowerCase();
          s = s.replace(/[-_\s]+/g, "-");
          s = s.replace(/^-+|-+$/g, "");
          return s;
        }
      };
      exports.StringUtils = StringUtils;
      StringUtils.NODE_NAME = /^[\p{L}\p{Nd}\-_ ]+$/u;
    }
  });

  // node_modules/@stxt-lang/core/out/core/Node.js
  var require_Node = __commonJS({
    "node_modules/@stxt-lang/core/out/core/Node.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Node = void 0;
      var ParseException_1 = require_ParseException();
      var RuntimeException_1 = require_RuntimeException();
      var NamespaceValidator_1 = require_NamespaceValidator();
      var StringUtils_1 = require_StringUtils();
      var Node2 = class {
        /**
         * Creates a node with its full position in the document. This is the constructor the
         * {@link Parser} uses while parsing.
         *
         * @param line line number of the document where the node opens.
         * @param level indentation level of the node (0 for root nodes).
         * @param name name of the node.
         * @param namespace namespace of the node, or null/undefined if it has none.
         * @param textNode true if it is a text block node (BLOCK); false if it is INLINE.
         * @param value inline value of the node (INLINE node), ignored when it is BLOCK.
         * @throws ParseException if the name or the namespace are not valid.
         */
        constructor(line, level, name, namespace, textNode, value) {
          this.textLines = [];
          this.children = [];
          this.level = level;
          this.line = line;
          this.name = StringUtils_1.StringUtils.compactSpaces(name);
          this.normalizedName = StringUtils_1.StringUtils.normalize(name);
          this.namespace = StringUtils_1.StringUtils.lowerCase(namespace);
          this.value = (value ?? "").trim();
          this.textNode = textNode;
          NamespaceValidator_1.NamespaceValidator.validateNamespaceFormat(this.namespace, line);
          if (this.value.length > 0 && this.isTextNode()) {
            throw new RuntimeException_1.RuntimeException("INLINE_VALUE_NOT_VALID", "Not empty value with textNode");
          }
          if (!StringUtils_1.StringUtils.isValidNodeName(this.name)) {
            throw new ParseException_1.ParseException(line, "INVALID_NODE_NAME", `Node name not valid: ${name}`);
          }
        }
        /**
         * Appends a text line to a BLOCK node.
         *
         * @param line text line to append to a BLOCK node ({@link Node.isTextNode}).
         */
        addTextLine(line) {
          this.textLines.push(line);
        }
        /** @returns the original name of the node as it appears in the document (with spaces compacted). */
        getName() {
          return this.name;
        }
        /** @returns the canonical name of the node, used to compare/look up by structural identity. */
        getNormalizedName() {
          return this.normalizedName;
        }
        /** @returns the canonical name prefixed by its namespace (`namespace:name`), or just the name when there is no namespace. */
        getQualifiedName() {
          return this.namespace.length === 0 ? this.normalizedName : `${this.namespace}:${this.normalizedName}`;
        }
        /** @returns the effective namespace of the node (its own or inherited from the parent), lower-cased, or the empty string if it has none. */
        getNamespace() {
          return this.namespace;
        }
        /** @returns the children of the node in order of appearance, as a read-only view. */
        getChildren() {
          return this.children;
        }
        /**
         * Appends an already closed child to this node.
         *
         * @param node already closed child to append at the end of this node's list of children.
         */
        addChild(node) {
          this.children.push(node);
        }
        /** @returns the inline value of the node (INLINE node), or the empty string if it is a BLOCK node. */
        getValue() {
          return this.value;
        }
        /** @returns the text lines of a BLOCK node ({@link Node.isTextNode}), in order of appearance. */
        getTextLines() {
          return this.textLines;
        }
        /** @returns the line number of the document where this node was opened. */
        getLine() {
          return this.line;
        }
        /** @returns the indentation level of the node (0 for root nodes). */
        getLevel() {
          return this.level;
        }
        /** @returns true if the node is a text block (BLOCK, `>>`); false if it is INLINE. */
        isTextNode() {
          return this.textNode;
        }
        /** @returns the textual content of the node: the text lines joined with '\n' if it is BLOCK, or the inline value otherwise. */
        getText() {
          return this.isTextNode() ? this.textLines.join("\n") : this.value;
        }
        /**
         * Looks up the only direct child with that name.
         *
         * @param cname name of the child to look for.
         * @param namespace namespace to search in; this node's own namespace when omitted.
         * @returns the only direct child with that name, or null if there is none.
         * @throws RuntimeException with code `AMBIGUOUS_CHILD` if there is more than one; use {@link Node.getChildrenByName} then.
         */
        getChild(cname, namespace) {
          const result = this.getChildrenByName(cname, namespace);
          if (result.length > 1) {
            throw new RuntimeException_1.RuntimeException("AMBIGUOUS_CHILD", "More than 1 child. Use getChildren");
          }
          if (result.length === 0) {
            return null;
          }
          return result[0];
        }
        // Fast access methods to children
        /**
         * Looks up every direct child with that name.
         *
         * @param cname name of the child to look for.
         * @param namespace namespace to search in; this node's own namespace when omitted.
         * @returns every direct child with that name in the given namespace, in order of appearance.
         */
        getChildrenByName(cname, namespace) {
          const key = StringUtils_1.StringUtils.normalize(cname);
          const targetNamespace = namespace !== void 0 ? namespace : this.namespace;
          const result = [];
          for (const child of this.children) {
            if (child.getNormalizedName() === key && child.getNamespace() === targetNamespace) {
              result.push(child);
            }
          }
          return result;
        }
        /** @returns a readable representation of the node, for debugging and error messages. */
        toString() {
          let s = "Node{";
          s += `line=${this.line}`;
          s += `, level=${this.level}`;
          s += `, name='${this.name}'`;
          if (this.namespace.length > 0) {
            s += `, ns='${this.namespace}'`;
          }
          s += `, text=${this.textNode}`;
          if (!this.textNode && this.value.length > 0) {
            s += `, value='${this.value}'`;
          }
          if (this.textNode) {
            s += `, lines=${this.textLines.length}`;
          }
          s += `, children=${this.children.length}`;
          s += "}";
          return s;
        }
      };
      exports.Node = Node2;
    }
  });

  // node_modules/@stxt-lang/core/out/core/Constants.js
  var require_Constants = __commonJS({
    "node_modules/@stxt-lang/core/out/core/Constants.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Constants = void 0;
      var Constants = class {
      };
      exports.Constants = Constants;
      Constants.COMMENT_CHAR = "#";
      Constants.TAB_SPACES = 4;
      Constants.TAB = "	";
      Constants.SPACE = " ";
      Constants.SEP_NODE = ":";
      Constants.SEP_TEXT_NODE = ">>";
      Constants.EMPTY_NAMESPACE = "";
    }
  });

  // node_modules/@stxt-lang/core/out/core/Line.js
  var require_Line = __commonJS({
    "node_modules/@stxt-lang/core/out/core/Line.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Line = void 0;
      var Line = class {
        /**
         * Creates a line already split into indentation and content.
         *
         * @param level indentation level of the line.
         * @param content content of the line without its indentation.
         * @param isComment true if the line is a comment.
         * @param isBlock true if the line belongs to an open text block.
         * @param indentLength number of characters the indentation took up.
         */
        constructor(level, content, isComment, isBlock, indentLength) {
          this.level = level;
          this.content = content;
          this.isComment = isComment;
          this.isBlock = isBlock;
          this.indentLength = indentLength;
        }
        /** @returns true if the line has no content beyond whitespace. */
        isEmpty() {
          return this.content.trim() === "";
        }
      };
      exports.Line = Line;
    }
  });

  // node_modules/@stxt-lang/core/out/core/LineParser.js
  var require_LineParser = __commonJS({
    "node_modules/@stxt-lang/core/out/core/LineParser.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.parseLine = parseLine;
      var Constants_1 = require_Constants();
      var StringUtils_1 = require_StringUtils();
      var ParseException_1 = require_ParseException();
      var Line_1 = require_Line();
      function parseLine(line, lastNodeBlock, lastLevel, numLine, validate = true) {
        let level = 0;
        let spaces = 0;
        let pointer = 0;
        let sawSpace = false;
        let sawTab = false;
        while (pointer < line.length) {
          const c = line.charAt(pointer);
          if (c === Constants_1.Constants.SPACE) {
            sawSpace = true;
            spaces++;
            if (spaces === Constants_1.Constants.TAB_SPACES) {
              level++;
              spaces = 0;
            }
          } else if (c === Constants_1.Constants.TAB) {
            sawTab = true;
            level++;
            spaces = 0;
          } else if (c === Constants_1.Constants.COMMENT_CHAR) {
            return new Line_1.Line(level, line.substring(pointer + 1), true, false, pointer);
          } else {
            break;
          }
          if (lastNodeBlock && level > lastLevel) {
            const text = StringUtils_1.StringUtils.rightTrim(line.substring(pointer + 1));
            if (validate && sawSpace && sawTab && text.length > 0) {
              throw new ParseException_1.ParseException(numLine, "MIXED_INDENTATION", `Mixed tabs and spaces in indentation`);
            }
            return new Line_1.Line(level, text, false, true, pointer);
          }
          pointer++;
        }
        if (pointer === line.length) {
          if (lastNodeBlock) {
            return new Line_1.Line(level, "", false, true, pointer);
          }
          return new Line_1.Line(level, "", false, false, pointer);
        }
        if (validate && sawSpace && sawTab) {
          throw new ParseException_1.ParseException(numLine, "MIXED_INDENTATION", `Mixed tabs and spaces in indentation`);
        }
        if (validate && spaces > 0) {
          throw new ParseException_1.ParseException(numLine, "INVALID_NUMBER_SPACES", `There are ${spaces} spaces before node`);
        }
        if (validate && level > lastLevel + 1) {
          throw new ParseException_1.ParseException(numLine, "INDENTATION_LEVEL_NOT_VALID", `Level of indent incorrect: ${level}`);
        }
        return new Line_1.Line(level, line.substring(pointer).trim(), false, false, pointer);
      }
    }
  });

  // node_modules/@stxt-lang/core/out/core/NameNamespace.js
  var require_NameNamespace = __commonJS({
    "node_modules/@stxt-lang/core/out/core/NameNamespace.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.NameNamespace = void 0;
      var NameNamespace = class {
        /**
         * Creates a resolved name and namespace pair.
         *
         * @param name name of the node without the namespace part.
         * @param namespace resolved namespace (its own or inherited).
         */
        constructor(name, namespace) {
          this.name = name;
          this.namespace = namespace;
        }
        /** @returns the name of the node, without the namespace part. */
        getName() {
          return this.name;
        }
        /** @returns the resolved namespace (its own or inherited from the parent), or the empty string if it has none. */
        getNamespace() {
          return this.namespace;
        }
      };
      exports.NameNamespace = NameNamespace;
    }
  });

  // node_modules/@stxt-lang/core/out/core/NameNamespaceParser.js
  var require_NameNamespaceParser = __commonJS({
    "node_modules/@stxt-lang/core/out/core/NameNamespaceParser.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.NameNamespaceParser = void 0;
      var ParseException_1 = require_ParseException();
      var NameNamespace_1 = require_NameNamespace();
      var NameNamespaceParser = class {
        constructor() {
        }
        /**
         * Splits a raw node name into its name and its namespace.
         *
         * @param rawName raw name, with the namespace in parentheses if it carries one.
         * @param inheritedNs namespace inherited from the parent, used when `rawName` brings none of its own.
         * @param lineNumber line number, for the error messages.
         * @param fullLine original full line, for the error messages.
         * @returns the name and the namespace, already split apart and resolved.
         * @throws ParseException if the name or the namespace are not well formed.
         */
        static parse(rawName, inheritedNs, lineNumber, fullLine) {
          if (rawName === null || rawName === void 0) {
            throw new ParseException_1.ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${fullLine}`);
          }
          rawName = rawName.trim();
          const startIndex = rawName.indexOf("(");
          const endIndex = rawName.indexOf(")");
          let name;
          let namespace = inheritedNs ?? "";
          if (startIndex !== -1 && endIndex !== -1) {
            if (startIndex > endIndex || endIndex !== rawName.length - 1) {
              throw new ParseException_1.ParseException(lineNumber, "INVALID_NAMESPACE", `Line not valid: ${fullLine}`);
            }
            name = rawName.substring(0, startIndex).trim();
            namespace = rawName.substring(startIndex + 1, endIndex);
            if (namespace.length === 0) {
              throw new ParseException_1.ParseException(lineNumber, "INVALID_NAMESPACE", `Line not valid: ${fullLine}`);
            }
          } else if (startIndex === -1 && endIndex === -1) {
            name = rawName;
          } else {
            throw new ParseException_1.ParseException(lineNumber, "INVALID_NAMESPACE", `Line not valid: ${fullLine}`);
          }
          return new NameNamespace_1.NameNamespace(name, namespace.toLowerCase());
        }
      };
      exports.NameNamespaceParser = NameNamespaceParser;
    }
  });

  // node_modules/@stxt-lang/core/out/core/NodeCreator.js
  var require_NodeCreator = __commonJS({
    "node_modules/@stxt-lang/core/out/core/NodeCreator.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.createNode = createNode;
      var NameNamespaceParser_1 = require_NameNamespaceParser();
      var Node_1 = require_Node();
      var ParseException_1 = require_ParseException();
      var Constants_1 = require_Constants();
      function createNode(lineIndent, lineNumber, level, parent) {
        const line = lineIndent.content;
        let name;
        let value;
        let textNode = false;
        const nodeIndex = line.indexOf(Constants_1.Constants.SEP_NODE);
        const textIndex = line.indexOf(Constants_1.Constants.SEP_TEXT_NODE);
        if (nodeIndex === -1 && textIndex === -1) {
          throw new ParseException_1.ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${line}`);
        } else if (nodeIndex === -1 && textIndex !== -1) {
          textNode = true;
        } else if (nodeIndex !== -1 && textIndex === -1) {
          textNode = false;
        } else if (nodeIndex < textIndex) {
          textNode = false;
        } else {
          throw new ParseException_1.ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${line}`);
        }
        if (textNode) {
          name = line.substring(0, textIndex);
          value = line.substring(textIndex + Constants_1.Constants.SEP_TEXT_NODE.length);
        } else {
          name = line.substring(0, nodeIndex);
          value = line.substring(nodeIndex + Constants_1.Constants.SEP_NODE.length);
        }
        if (textNode && value.trim().length > 0) {
          throw new ParseException_1.ParseException(lineNumber, "INLINE_VALUE_NOT_VALID", `Line not valid: ${line}`);
        }
        const nameNamespace = NameNamespaceParser_1.NameNamespaceParser.parse(name, parent ? parent.getNamespace() : null, lineNumber, line);
        name = nameNamespace.getName();
        const namespace = nameNamespace.getNamespace();
        if (name.length === 0) {
          throw new ParseException_1.ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${line}`);
        }
        return new Node_1.Node(lineNumber, level, name, namespace, textNode, value);
      }
    }
  });

  // node_modules/@stxt-lang/core/out/core/ParseResult.js
  var require_ParseResult = __commonJS({
    "node_modules/@stxt-lang/core/out/core/ParseResult.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ParseResult = void 0;
      var ParseResult = class {
        /**
         * Creates a result, empty by default.
         *
         * @param nodes root nodes to start from.
         * @param errors errors to start from.
         */
        constructor(nodes = [], errors = []) {
          this.nodes = nodes;
          this.errors = errors;
        }
        /** @returns the root nodes collected so far. */
        getNodes() {
          return this.nodes;
        }
        /** @returns the syntax or validation errors collected so far, in order of appearance. */
        getErrors() {
          return this.errors;
        }
        /** @returns true if at least one error has been collected. */
        hasErrors() {
          return this.errors.length > 0;
        }
        /**
         * Adds an error found while parsing.
         *
         * @param error error found while parsing, without aborting the traversal.
         */
        addError(error) {
          this.errors.push(error);
        }
        /**
         * Adds a root node to the result.
         *
         * @param node already closed root node to add to the result.
         */
        addNode(node) {
          this.nodes.push(node);
        }
      };
      exports.ParseResult = ParseResult;
    }
  });

  // node_modules/@stxt-lang/core/out/core/Parser.js
  var require_Parser = __commonJS({
    "node_modules/@stxt-lang/core/out/core/Parser.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Parser = void 0;
      var LineParser_1 = require_LineParser();
      var NodeCreator_1 = require_NodeCreator();
      var ParseResult_1 = require_ParseResult();
      var ParseException_1 = require_ParseException();
      var Parser2 = class {
        constructor() {
          this.observers = [];
          this.validators = [];
        }
        /**
         * Registers an observer, notified when each node is opened and closed.
         *
         * @param observer the {@link Observer} to register, notified while parsing.
         */
        registerObserver(observer) {
          this.observers.push(observer);
        }
        /**
         * Registers a validator, invoked when each node is closed.
         *
         * @param validator the {@link Validator} to register, invoked when each node is closed during parsing.
         */
        registerValidator(validator) {
          this.validators.push(validator);
        }
        /**
         * Traditional fail-fast mode: throws the first error found (either syntax or validation).
         * Internally it reuses the same traversal as {@link Parser.parseResult}, and throws the first
         * error it collected.
         *
         * @param content the whole STXT document to parse.
         * @returns the root nodes of the document.
         * @throws ParseException the first error found, be it syntax or validation.
         */
        parse(content) {
          const result = this.parseResult(content);
          if (result.hasErrors()) {
            const error = result.getErrors()[0];
            throw error;
          }
          return result.getNodes();
        }
        /**
         * Multi-error mode: parses the whole content collecting every error found (both syntax and
         * validation) without bailing out on the first one. See {@link ParseResult}.
         *
         * @param content the whole STXT document to parse.
         * @returns the collected result, with the root nodes obtained and every error found.
         */
        parseResult(content) {
          content = this.removeUTF8BOM(content);
          const result = new ParseResult_1.ParseResult();
          const stack = [];
          const documents = [];
          let lineNumber = 0;
          const lines = content.split(/\r?\n/);
          if (lines.length > 0 && lines[lines.length - 1] === "") {
            lines.pop();
          }
          for (const line of lines) {
            lineNumber++;
            this.processLine(line, lineNumber, stack, documents, result);
          }
          this.closeToLevel(stack, documents, 0, result);
          for (const doc of documents) {
            result.addNode(doc);
          }
          return result;
        }
        processLine(lineString, lineNumber, stack, documents, result) {
          try {
            const lastNode = stack.length === 0 ? null : stack[stack.length - 1];
            const lastLevel = lastNode ? lastNode.getLevel() : 0;
            const lastNodeText = lastNode ? lastNode.isTextNode() : false;
            const line = (0, LineParser_1.parseLine)(lineString, lastNodeText, lastLevel, lineNumber);
            if (line.isComment) {
              this.observers.forEach((observer) => {
                observer.onComment(lineNumber, lineString);
              });
              return;
            }
            const currentLevel = line.level;
            if (line.isBlock) {
              lastNode.addTextLine(line.content);
              this.observers.forEach((observer) => {
                observer.onTextLine(lastNode, lineNumber, lineString, line);
              });
              return;
            }
            if (line.isEmpty()) {
              return;
            }
            this.closeToLevel(stack, documents, currentLevel, result);
            const parent = stack.length === 0 ? null : stack[stack.length - 1];
            const node = (0, NodeCreator_1.createNode)(line, lineNumber, currentLevel, parent);
            this.observers.forEach((observer) => {
              observer.onCreate(node, lineString);
            });
            stack.push(node);
          } catch (e) {
            this.handleError(e, lineNumber, result);
          }
        }
        handleError(e, line, result, errorCode = "UNEXPECTED_ERROR", unknownErrorCode = "UNKNOWN_ERROR") {
          if (e instanceof ParseException_1.ParseException) {
            result.addError(e);
          } else if (e instanceof Error) {
            result.addError(new ParseException_1.ParseException(line, errorCode, e.message));
          } else {
            result.addError(new ParseException_1.ParseException(line, unknownErrorCode, String(e)));
          }
        }
        closeToLevel(stack, documents, targetLevel, result) {
          while (stack.length > targetLevel) {
            const completed = stack.pop();
            this.validators.forEach((validator) => {
              try {
                const errors = validator.validate(completed);
                errors.forEach((error) => {
                  result.addError(error);
                });
              } catch (e) {
                this.handleError(e, completed.getLine(), result, "VALIDATION_ERROR", "UNKNOWN_VALIDATION_ERROR");
              }
            });
            if (stack.length === 0) {
              documents.push(completed);
            } else {
              stack[stack.length - 1].addChild(completed);
            }
            this.observers.forEach((observer) => {
              observer.onFinish(completed);
            });
          }
        }
        removeUTF8BOM(content) {
          return content.charCodeAt(0) === 65279 ? content.slice(1) : content;
        }
      };
      exports.Parser = Parser2;
    }
  });

  // node_modules/@stxt-lang/core/out/exceptions/ValidationException.js
  var require_ValidationException = __commonJS({
    "node_modules/@stxt-lang/core/out/exceptions/ValidationException.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ValidationException = void 0;
      var ParseException_1 = require_ParseException();
      var ValidationException = class _ValidationException extends ParseException_1.ParseException {
        /**
         * Creates a validation error located at a line of the document.
         *
         * @param line line number where the error was detected.
         * @param code error code in UPPERCASE.
         * @param message descriptive message.
         */
        constructor(line, code, message) {
          super(line, code, message);
          this.name = "ValidationException";
          Object.setPrototypeOf(this, _ValidationException.prototype);
        }
      };
      exports.ValidationException = ValidationException;
    }
  });

  // node_modules/@stxt-lang/core/out/schema/Schema.js
  var require_Schema = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/Schema.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Schema = void 0;
      var NamespaceValidator_1 = require_NamespaceValidator();
      var StringUtils_1 = require_StringUtils();
      var ValidationException_1 = require_ValidationException();
      var Schema = class {
        /**
         * Creates an empty schema for a namespace.
         *
         * @param namespace namespace this schema applies to.
         * @param line line number, for the error message.
         * @param description optional description of the schema.
         * @throws ParseException if the namespace is not well formed.
         */
        constructor(namespace, line, description) {
          this.nodes = /* @__PURE__ */ new Map();
          this.namespace = StringUtils_1.StringUtils.lowerCase(namespace);
          this.description = description;
          NamespaceValidator_1.NamespaceValidator.validateNamespaceFormat(this.namespace, line);
        }
        /** @returns the node definitions, indexed by their canonical name. */
        getNodes() {
          return this.nodes;
        }
        /**
         * Looks up the definition of a node by name.
         *
         * @param name name of the node to look for.
         * @returns the definition of the node with that name, or undefined if it is not defined in this schema.
         */
        getNodeDefinition(name) {
          return this.nodes.get(StringUtils_1.StringUtils.normalize(name));
        }
        /**
         * Adds the definition of a node to this schema.
         *
         * @param nodeDefinition node definition to add.
         * @throws ValidationException with code `NODE_DEF_ALREADY_DEFINED` if there already was a node definition with the same name.
         */
        addNodeDefinition(nodeDefinition) {
          const qname = nodeDefinition.getNormalizedName();
          if (this.nodes.has(qname)) {
            throw new ValidationException_1.ValidationException(0, "NODE_DEF_ALREADY_DEFINED", `Exists a previous node definition with: ${qname}`);
          }
          this.nodes.set(qname, nodeDefinition);
        }
        /** @returns the namespace this schema applies to. */
        getNamespace() {
          return this.namespace;
        }
        /** @returns a plain object with the schema, so that JSON.stringify serializes it. */
        toJSON() {
          return {
            namespace: this.namespace,
            nodes: Array.from(this.nodes.values()).map((n) => n.toJSON())
          };
        }
        /** @returns the schema as pretty-printed JSON, for debugging. */
        toString() {
          return JSON.stringify(this, null, 2);
        }
      };
      exports.Schema = Schema;
      Schema.SCHEMA_NAMESPACE = "@stxt.schema";
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/INLINE.js
  var require_INLINE = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/INLINE.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.INLINE = void 0;
      var ValidationException_1 = require_ValidationException();
      exports.INLINE = {
        getName() {
          return "INLINE";
        },
        validate(nodeDef, node) {
          if (node.isTextNode()) {
            throw new ValidationException_1.ValidationException(node.getLine(), "NOT_ALLOWED_TEXT", `Not allowed text in node ${node.getQualifiedName()}`);
          }
        }
      };
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/BLOCK.js
  var require_BLOCK = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/BLOCK.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.BLOCK = void 0;
      var ValidationException_1 = require_ValidationException();
      exports.BLOCK = {
        getName() {
          return "BLOCK";
        },
        validate(nodeDef, node) {
          if (!node.isTextNode()) {
            throw new ValidationException_1.ValidationException(node.getLine(), "BLOCK_FORM_REQUIRED", `Node ${node.getQualifiedName()} requires block form '>>'`);
          }
        }
      };
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/TEXT.js
  var require_TEXT = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/TEXT.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.TEXT = void 0;
      var ValidationException_1 = require_ValidationException();
      exports.TEXT = {
        getName() {
          return "TEXT";
        },
        validate(nodeDef, node) {
          if (node.getChildren().length > 0) {
            throw new ValidationException_1.ValidationException(node.getLine(), "NOT_ALLOWED_CHILDREN_TEXT", `Not allowed children nodes in node ${node.getQualifiedName()}`);
          }
        }
      };
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/regexType.js
  var require_regexType = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/regexType.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.regexType = regexType;
      var ValidationException_1 = require_ValidationException();
      function regexType(name, pattern, error) {
        return {
          getName: () => name,
          validate(nodeDef, node) {
            if (node.isTextNode()) {
              throw new ValidationException_1.ValidationException(node.getLine(), "NOT_ALLOWED_TEXT", `Not allowed text in node ${node.getQualifiedName()}`);
            }
            const value = node.getText();
            if (!pattern.test(value)) {
              throw new ValidationException_1.ValidationException(node.getLine(), "INVALID_VALUE", `${node.getName()}: ${error} (${value})`);
            }
          }
        };
      }
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/BOOLEAN.js
  var require_BOOLEAN = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/BOOLEAN.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.BOOLEAN = void 0;
      var regexType_1 = require_regexType();
      exports.BOOLEAN = (0, regexType_1.regexType)("BOOLEAN", /^(true|false)$/, "Invalid boolean");
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/URL.js
  var require_URL = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/URL.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.URL = void 0;
      var ValidationException_1 = require_ValidationException();
      exports.URL = {
        getName() {
          return "URL";
        },
        validate(ndef, n) {
          if (n.isTextNode()) {
            throw new ValidationException_1.ValidationException(n.getLine(), "NOT_ALLOWED_TEXT", `Not allowed text in node ${n.getQualifiedName()}`);
          }
          const url = n.getValue();
          try {
            const parsed = new globalThis.URL(url);
            const ok = !!parsed.protocol && !!parsed.hostname;
            if (!ok) {
              throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_URL_STRUCTURE", `Invalid URL: ${url}`);
            }
          } catch {
            throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `Invalid URL: ${url}`);
          }
        }
      };
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/INTEGER.js
  var require_INTEGER = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/INTEGER.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.INTEGER = void 0;
      var regexType_1 = require_regexType();
      exports.INTEGER = (0, regexType_1.regexType)("INTEGER", /^[-+]?\d+$/, "Invalid integer");
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/NATURAL.js
  var require_NATURAL = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/NATURAL.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.NATURAL = void 0;
      var regexType_1 = require_regexType();
      exports.NATURAL = (0, regexType_1.regexType)("NATURAL", /^\d+$/, "Invalid natural");
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/NUMBER.js
  var require_NUMBER = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/NUMBER.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.NUMBER = void 0;
      var regexType_1 = require_regexType();
      exports.NUMBER = (0, regexType_1.regexType)("NUMBER", /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/, "Invalid number");
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/DATE.js
  var require_DATE = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/DATE.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.DATE = void 0;
      var regexType_1 = require_regexType();
      exports.DATE = (0, regexType_1.regexType)("DATE", /^\d{4}-\d{2}-\d{2}$/, "Invalid date");
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/TIME.js
  var require_TIME = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/TIME.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.TIME = void 0;
      var regexType_1 = require_regexType();
      exports.TIME = (0, regexType_1.regexType)("TIME", /^\d{2}:\d{2}:\d{2}$/, "Invalid time");
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/TIMESTAMP.js
  var require_TIMESTAMP = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/TIMESTAMP.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.TIMESTAMP = void 0;
      var regexType_1 = require_regexType();
      exports.TIMESTAMP = (0, regexType_1.regexType)("TIMESTAMP", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[+-]\d{2}:\d{2})?$/, "Invalid timestamp");
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/UUID.js
  var require_UUID = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/UUID.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.UUID = void 0;
      var regexType_1 = require_regexType();
      exports.UUID = (0, regexType_1.regexType)("UUID", /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "Invalid UUID");
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/binaryValue.js
  var require_binaryValue = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/binaryValue.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.binaryValue = binaryValue;
      function binaryValue(node) {
        if (!node.isTextNode()) {
          return node.getValue();
        }
        return node.getTextLines().map((line) => line.trim()).join("");
      }
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/BINARY.js
  var require_BINARY = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/BINARY.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.BINARY = void 0;
      var ValidationException_1 = require_ValidationException();
      var binaryValue_1 = require_binaryValue();
      exports.BINARY = {
        getName() {
          return "BINARY";
        },
        // STXT-SCHEMA-SPEC 9.5: [01]+ string
        validate(ndef, n) {
          const value = (0, binaryValue_1.binaryValue)(n);
          if (!/^[01]+$/.test(value)) {
            throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `${n.getName()}: Invalid binary (${value})`);
          }
        }
      };
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/EMAIL.js
  var require_EMAIL = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/EMAIL.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.EMAIL = void 0;
      var regexType_1 = require_regexType();
      exports.EMAIL = (0, regexType_1.regexType)("EMAIL", /^(?=.{1,256}$)(?=.{1,64}@.{1,255}$)(?=.{1,64}@.{1,63}\..{1,63}$)[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, "Invalid email");
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/HEXADECIMAL.js
  var require_HEXADECIMAL = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/HEXADECIMAL.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.HEXADECIMAL = void 0;
      var ValidationException_1 = require_ValidationException();
      var binaryValue_1 = require_binaryValue();
      exports.HEXADECIMAL = {
        getName() {
          return "HEXADECIMAL";
        },
        // STXT-SCHEMA-SPEC 9.5: [0-9A-Fa-f]+ string, with no '#' prefix and no even-length requirement
        validate(ndef, n) {
          const value = (0, binaryValue_1.binaryValue)(n);
          if (!/^[0-9A-Fa-f]+$/.test(value)) {
            throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `${n.getName()}: Invalid hexadecimal (${value})`);
          }
        }
      };
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/BASE64.js
  var require_BASE64 = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/BASE64.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.BASE64 = void 0;
      var ValidationException_1 = require_ValidationException();
      var binaryValue_1 = require_binaryValue();
      exports.BASE64 = {
        getName() {
          return "BASE64";
        },
        validate(ndef, n) {
          const raw = (0, binaryValue_1.binaryValue)(n);
          try {
            const buf = Buffer.from(raw, "base64");
            const reencoded = buf.toString("base64");
            const normalizedInput = raw.replace(/=+$/, "");
            const normalizedReencoded = reencoded.replace(/=+$/, "");
            if (normalizedInput !== normalizedReencoded) {
              throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `Node '${n.getName()}' Invalid Base64`);
            }
          } catch {
            throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `Node '${n.getName()}' Invalid Base64`);
          }
        }
      };
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/GROUP.js
  var require_GROUP = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/GROUP.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.GROUP = void 0;
      var ValidationException_1 = require_ValidationException();
      exports.GROUP = {
        getName() {
          return "GROUP";
        },
        validate(nodeDef, node) {
          if (node.getValue().length > 0 || node.isTextNode()) {
            throw new ValidationException_1.ValidationException(node.getLine(), "INVALID_VALUE", `Node '${node.getName()}' has to be empty`);
          }
        }
      };
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/ENUM.js
  var require_ENUM = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/ENUM.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ENUM = void 0;
      var ValidationException_1 = require_ValidationException();
      exports.ENUM = {
        getName() {
          return "ENUM";
        },
        validate(nodeDef, node) {
          if (node.isTextNode()) {
            throw new ValidationException_1.ValidationException(node.getLine(), "NOT_ALLOWED_TEXT", `Not allowed text in node ${node.getQualifiedName()}`);
          }
          const value = node.getValue();
          const allowed = nodeDef.getValues();
          if (!nodeDef.isAllowedValue(value)) {
            throw new ValidationException_1.ValidationException(node.getLine(), "INVALID_VALUE", `The value '${value}' not allowed. Only: ${Array.from(allowed).join(", ")}`);
          }
        }
      };
    }
  });

  // node_modules/@stxt-lang/core/out/schema/type/MARKDOWN.js
  var require_MARKDOWN = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/type/MARKDOWN.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.MARKDOWN = void 0;
      var ValidationException_1 = require_ValidationException();
      exports.MARKDOWN = {
        getName() {
          return "MARKDOWN";
        },
        validate(nodeDef, node) {
          if (node.getChildren().length > 0) {
            throw new ValidationException_1.ValidationException(node.getLine(), "NOT_ALLOWED_CHILDREN_TEXT", `Not allowed children nodes in node ${node.getQualifiedName()}`);
          }
        }
      };
    }
  });

  // node_modules/@stxt-lang/core/out/schema/TypeRegistry.js
  var require_TypeRegistry = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/TypeRegistry.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.TypeRegistry = void 0;
      var RuntimeException_1 = require_RuntimeException();
      var INLINE_1 = require_INLINE();
      var BLOCK_1 = require_BLOCK();
      var TEXT_1 = require_TEXT();
      var BOOLEAN_1 = require_BOOLEAN();
      var URL_1 = require_URL();
      var INTEGER_1 = require_INTEGER();
      var NATURAL_1 = require_NATURAL();
      var NUMBER_1 = require_NUMBER();
      var DATE_1 = require_DATE();
      var TIME_1 = require_TIME();
      var TIMESTAMP_1 = require_TIMESTAMP();
      var UUID_1 = require_UUID();
      var BINARY_1 = require_BINARY();
      var EMAIL_1 = require_EMAIL();
      var HEXADECIMAL_1 = require_HEXADECIMAL();
      var BASE64_1 = require_BASE64();
      var GROUP_1 = require_GROUP();
      var ENUM_1 = require_ENUM();
      var MARKDOWN_1 = require_MARKDOWN();
      var TypeRegistry = class {
        // STXT-SCHEMA-SPEC 9 / STXT-TEMPLATE-SPEC 15: only INLINE and GROUP admit children
        /**
         * Tells whether nodes of a type may have children.
         *
         * @param nodeType name of the type.
         * @returns true if nodes of this type may have children (only INLINE and GROUP).
         */
        static admitsChildren(nodeType) {
          return nodeType === "INLINE" || nodeType === "GROUP";
        }
        /**
         * Looks up a registered type by name.
         *
         * @param nodeType name of the type to look for.
         * @returns the {@link Type} registered under that name, or undefined if it does not exist.
         */
        static get(nodeType) {
          void this._init;
          return this.REGISTRY.get(nodeType);
        }
        static register(instance) {
          const name = instance.getName();
          if (this.REGISTRY.has(name)) {
            throw new RuntimeException_1.RuntimeException("DUPLICATED_TYPE", `Type already defined: ${name}`);
          }
          this.REGISTRY.set(name, instance);
        }
      };
      exports.TypeRegistry = TypeRegistry;
      TypeRegistry.REGISTRY = /* @__PURE__ */ new Map();
      TypeRegistry._init = (() => {
        TypeRegistry.register(INLINE_1.INLINE);
        TypeRegistry.register(BLOCK_1.BLOCK);
        TypeRegistry.register(TEXT_1.TEXT);
        TypeRegistry.register(BOOLEAN_1.BOOLEAN);
        TypeRegistry.register(URL_1.URL);
        TypeRegistry.register(INTEGER_1.INTEGER);
        TypeRegistry.register(NATURAL_1.NATURAL);
        TypeRegistry.register(NUMBER_1.NUMBER);
        TypeRegistry.register(DATE_1.DATE);
        TypeRegistry.register(TIME_1.TIME);
        TypeRegistry.register(TIMESTAMP_1.TIMESTAMP);
        TypeRegistry.register(UUID_1.UUID);
        TypeRegistry.register(EMAIL_1.EMAIL);
        TypeRegistry.register(HEXADECIMAL_1.HEXADECIMAL);
        TypeRegistry.register(BINARY_1.BINARY);
        TypeRegistry.register(BASE64_1.BASE64);
        TypeRegistry.register(GROUP_1.GROUP);
        TypeRegistry.register(ENUM_1.ENUM);
        TypeRegistry.register(MARKDOWN_1.MARKDOWN);
        return true;
      })();
    }
  });

  // node_modules/@stxt-lang/core/out/schema/SchemaValidator.js
  var require_SchemaValidator = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/SchemaValidator.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.SchemaValidator = void 0;
      var ValidationException_1 = require_ValidationException();
      var TypeRegistry_1 = require_TypeRegistry();
      var SchemaValidator = class _SchemaValidator {
        /**
         * Creates a validator that resolves schemas through the given provider.
         *
         * @param schemaProvider where to resolve the schema of each namespace from.
         * @param recursive whether the children of each node are validated recursively too.
         */
        constructor(schemaProvider, recursive = false) {
          this.schemaProvider = schemaProvider;
          this.recursiveValidation = recursive;
        }
        /**
         * Validates a node against the schema of its namespace.
         *
         * @param node already closed node to validate.
         * @returns the validation errors found, or an empty array if the node is valid.
         */
        validate(node) {
          const errors = [];
          const namespace = node.getNamespace();
          const schema = this.schemaProvider.getSchema(namespace);
          if (!schema) {
            errors.push(new ValidationException_1.ValidationException(node.getLine(), "SCHEMA_NOT_FOUND", `Not found schema: ${namespace}`));
            return errors;
          }
          errors.push(...this.validateAgainstSchema(node, schema));
          if (this.recursiveValidation) {
            for (const childNode of node.getChildren()) {
              errors.push(...this.validate(childNode));
            }
          }
          return errors;
        }
        /**
         * Validates a node against an already resolved schema: existence, value type and cardinalities of its children.
         *
         * @param node node to validate.
         * @param schema schema to validate against.
         * @returns the validation errors found, empty if the node is valid.
         */
        validateAgainstSchema(node, schema) {
          const errors = [];
          const schemaNode = schema.getNodeDefinition(node.getNormalizedName());
          if (!schemaNode) {
            const error = `NOT EXIST NODE ${node.getNormalizedName()} for namespace ${schema.getNamespace()}`;
            errors.push(new ValidationException_1.ValidationException(node.getLine(), "NODE_NOT_EXIST_IN_SCHEMA", error));
            return errors;
          }
          errors.push(..._SchemaValidator.validateValue(schemaNode, node));
          errors.push(..._SchemaValidator.validateChildrenDeclared(schemaNode, node));
          errors.push(..._SchemaValidator.validateCount(schemaNode, node));
          return errors;
        }
        // Closed content model (STXT-SCHEMA-SPEC, section 6): only the direct children declared
        // in the definition of the parent are allowed; with no Children, nothing is
        static validateChildrenDeclared(nodeDef, node) {
          const errors = [];
          for (const child of node.getChildren()) {
            if (!nodeDef.getChildren().has(child.getQualifiedName())) {
              errors.push(new ValidationException_1.ValidationException(child.getLine(), "CHILD_NOT_DECLARED", `Child '${child.getQualifiedName()}' not declared in node '${node.getQualifiedName()}'`));
            }
          }
          return errors;
        }
        static validateValue(nodeDef, node) {
          const errors = [];
          const nodeType = nodeDef.getType();
          const validator = TypeRegistry_1.TypeRegistry.get(nodeType);
          if (!validator) {
            errors.push(new ValidationException_1.ValidationException(node.getLine(), "TYPE_NOT_SUPPORTED", `Node type not supported: ${nodeType}`));
            return errors;
          }
          try {
            validator.validate(nodeDef, node);
          } catch (e) {
            if (e instanceof ValidationException_1.ValidationException) {
              errors.push(e);
            } else if (e instanceof Error) {
              errors.push(new ValidationException_1.ValidationException(node.getLine(), "VALIDATION_ERROR", e.message));
            } else {
              errors.push(new ValidationException_1.ValidationException(node.getLine(), "UNKNOWN_VALIDATION_ERROR", String(e)));
            }
          }
          return errors;
        }
        static validateCount(nodeDef, node) {
          const errors = [];
          const count = /* @__PURE__ */ new Map();
          const childrenByType = /* @__PURE__ */ new Map();
          for (const child of node.getChildren()) {
            const childName = child.getQualifiedName();
            count.set(childName, (count.get(childName) ?? 0) + 1);
            if (!childrenByType.has(childName)) {
              childrenByType.set(childName, []);
            }
            childrenByType.get(childName).push(child);
          }
          for (const childDef of nodeDef.getChildren().values()) {
            const qname = childDef.getQualifiedName();
            errors.push(..._SchemaValidator.validateCountChild(childDef, count.get(qname) ?? 0, node, childrenByType.get(qname) ?? []));
          }
          return errors;
        }
        static validateCountChild(childDef, childCount, node, children) {
          const errors = [];
          const min = childDef.getMin();
          const max = childDef.getMax();
          if (min !== null && childCount < min) {
            errors.push(new ValidationException_1.ValidationException(node.getLine(), "INVALID_NUMBER", `${childCount} nodes of '${childDef.getQualifiedName()}' and min is ${min}`));
          }
          if (max !== null && childCount > max) {
            errors.push(new ValidationException_1.ValidationException(node.getLine(), "INVALID_NUMBER", `${childCount} nodes of '${childDef.getQualifiedName()}' and max is ${max}`));
            for (const child of children) {
              errors.push(new ValidationException_1.ValidationException(child.getLine(), "INVALID_NUMBER", `Too many '${childDef.getQualifiedName()}' nodes: found ${childCount}, max is ${max}`));
            }
          }
          return errors;
        }
      };
      exports.SchemaValidator = SchemaValidator;
    }
  });

  // node_modules/@stxt-lang/core/out/schema/NodeDefinition.js
  var require_NodeDefinition = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/NodeDefinition.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.NodeDefinition = void 0;
      var ValidationException_1 = require_ValidationException();
      var StringUtils_1 = require_StringUtils();
      var NodeDefinition = class {
        /**
         * Creates the definition of a node.
         *
         * @param name name of the node.
         * @param type name of the type (see {@link TypeRegistry}).
         * @param line line number, for the error message.
         * @param description optional description of the node.
         * @throws ValidationException with code `INVALID_NODE_NAME` if the name is not valid.
         */
        constructor(name, type, line, description) {
          this.children = /* @__PURE__ */ new Map();
          this.values = /* @__PURE__ */ new Set();
          this.name = StringUtils_1.StringUtils.compactSpaces(name);
          this.normalizedName = StringUtils_1.StringUtils.normalize(name);
          this.type = type;
          this.description = description;
          if (!StringUtils_1.StringUtils.isValidNodeName(this.name)) {
            throw new ValidationException_1.ValidationException(line, "INVALID_NODE_NAME", `Node name not valid: ${name}`);
          }
        }
        /** @returns the name of the node, as it appears in the schema. */
        getName() {
          return this.name;
        }
        /** @returns the canonical name of the node. */
        getNormalizedName() {
          return this.normalizedName;
        }
        /** @returns the name of the value type of this node (see {@link TypeRegistry}). */
        getType() {
          return this.type;
        }
        /** @returns the definitions of the expected children, indexed by their qualified canonical name. */
        getChildren() {
          return this.children;
        }
        /** @returns the optional description of the node, or undefined if it has none. */
        getDescription() {
          return this.description;
        }
        /**
         * Sets the optional description of the node.
         *
         * @param description new optional description of the node.
         */
        setDescription(description) {
          this.description = description;
        }
        /**
         * Adds the definition of an expected child.
         *
         * @param childDefinition definition of the child to add.
         * @throws ValidationException with code `CHILD_DEF_ALREADY_DEFINED` if a definition for that child already existed.
         */
        addChildDefinition(childDefinition) {
          const qname = childDefinition.getQualifiedName();
          if (this.children.has(qname)) {
            throw new ValidationException_1.ValidationException(0, "CHILD_DEF_ALREADY_DEFINED", `Exists a previous node definition with: ${qname}`);
          }
          this.children.set(qname, childDefinition);
        }
        // STXT-SCHEMA-SPEC 13.9 / STXT-TEMPLATE-SPEC 14.14: there can be no duplicated values
        // after the trim normalization. Same code as ChildLineParser: it is the same condition
        // coming through the other entry point.
        /**
         * Adds a value to the list of values allowed for this node.
         *
         * @param value value to add to the list of allowed values.
         * @param line line number, for the error message.
         * @throws ValidationException with code `VALUE_DUPLICATED` if the value (once trimmed) had already been added.
         */
        addValue(value, line) {
          const trimmed = value?.trim() ?? "";
          if (this.values.has(trimmed)) {
            throw new ValidationException_1.ValidationException(line ?? 0, "VALUE_DUPLICATED", `The values ${trimmed} is duplicated`);
          }
          this.values.add(trimmed);
        }
        /**
         * Tells whether a value is allowed for this node.
         *
         * @param value value to check.
         * @returns true if no restricted values are defined, or if the value is among the allowed ones.
         */
        isAllowedValue(value) {
          if (this.values.size === 0) {
            return true;
          }
          return this.values.has(value);
        }
        /** @returns the values allowed for this node (ENUM), or empty if there is no restriction. */
        getValues() {
          return this.values;
        }
        /** @returns a plain object with the definition, so that JSON.stringify serializes it. */
        toJSON() {
          return {
            name: this.getName(),
            normalizedName: this.getNormalizedName(),
            type: this.getType(),
            description: this.description,
            children: Array.from(this.getChildren().values()).map((c) => c.toJSON()),
            values: Array.from(this.getValues())
          };
        }
      };
      exports.NodeDefinition = NodeDefinition;
    }
  });

  // node_modules/@stxt-lang/core/out/schema/ChildDefinition.js
  var require_ChildDefinition = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/ChildDefinition.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ChildDefinition = void 0;
      var NamespaceValidator_1 = require_NamespaceValidator();
      var ValidationException_1 = require_ValidationException();
      var StringUtils_1 = require_StringUtils();
      var ChildDefinition = class {
        /**
         * Creates the definition of an expected child.
         *
         * @param name name of the expected child.
         * @param namespace namespace of the expected child (may be null/undefined).
         * @param min minimum cardinality, or null if there is no minimum.
         * @param max maximum cardinality, or null if there is no maximum.
         * @param numLine line number, for the error messages.
         * @throws ValidationException with code `INVALID_NODE_NAME` if the name is not valid.
         */
        constructor(name, namespace, min, max, numLine) {
          this.name = StringUtils_1.StringUtils.compactSpaces(name);
          this.normalizedName = StringUtils_1.StringUtils.normalize(name);
          this.namespace = StringUtils_1.StringUtils.lowerCase(namespace);
          this.min = min;
          this.max = max;
          NamespaceValidator_1.NamespaceValidator.validateNamespaceFormat(this.namespace, numLine);
          if (!StringUtils_1.StringUtils.isValidNodeName(this.name)) {
            throw new ValidationException_1.ValidationException(numLine, "INVALID_NODE_NAME", `Node name not valid: ${name}`);
          }
        }
        /** @returns the name of the expected child, as it appears in the schema. */
        getName() {
          return this.name;
        }
        /** @returns the canonical name of the expected child. */
        getNormalizedName() {
          return this.normalizedName;
        }
        /** @returns the namespace of the expected child, or the empty string if it has none. */
        getNamespace() {
          return this.namespace;
        }
        /** @returns the minimum cardinality, or null if there is no minimum. */
        getMin() {
          return this.min;
        }
        /** @returns the maximum cardinality, or null if there is no maximum. */
        getMax() {
          return this.max;
        }
        /** @returns the canonical name prefixed by its namespace, used as the key in {@link NodeDefinition.getChildren}. */
        getQualifiedName() {
          return this.namespace.length === 0 ? this.normalizedName : `${this.namespace}:${this.normalizedName}`;
        }
        /** @returns a plain object with the definition, so that JSON.stringify serializes it. */
        toJSON() {
          return {
            name: this.getName(),
            normalizedName: this.getNormalizedName(),
            namespace: this.getNamespace(),
            min: this.getMin(),
            max: this.getMax()
          };
        }
      };
      exports.ChildDefinition = ChildDefinition;
    }
  });

  // node_modules/@stxt-lang/core/out/schema/SchemaParser.js
  var require_SchemaParser = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/SchemaParser.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.transformNodeToSchema = transformNodeToSchema;
      var Schema_1 = require_Schema();
      var NodeDefinition_1 = require_NodeDefinition();
      var ChildDefinition_1 = require_ChildDefinition();
      var ValidationException_1 = require_ValidationException();
      var RuntimeException_1 = require_RuntimeException();
      var NameNamespaceParser_1 = require_NameNamespaceParser();
      var TypeRegistry_1 = require_TypeRegistry();
      function transformNodeToSchema(node) {
        const nodeName = node.getNormalizedName();
        const namespaceSchema = node.getNamespace();
        if (nodeName !== "schema" || namespaceSchema !== Schema_1.Schema.SCHEMA_NAMESPACE) {
          throw new ValidationException_1.ValidationException(node.getLine(), "NOT_STXT_SCHEMA", `Expected schema(${Schema_1.Schema.SCHEMA_NAMESPACE}) but got ${nodeName}(${namespaceSchema})`);
        }
        const descrip = node.getChild("description")?.getText();
        const schema = new Schema_1.Schema(node.getValue(), node.getLine(), descrip);
        const allNames = /* @__PURE__ */ new Set();
        for (const n of node.getChildrenByName("node")) {
          const schNode = createFrom(n, schema.getNamespace());
          schema.addNodeDefinition(schNode);
          allNames.add(schNode.getNormalizedName());
        }
        for (const schNode of schema.getNodes().values()) {
          for (const schChild of schNode.getChildren().values()) {
            if (schChild.getNamespace() === schema.getNamespace()) {
              const childNorm = schChild.getNormalizedName?.();
              if (!childNorm) {
                throw new RuntimeException_1.RuntimeException("CHILD_DEFINITION_API_MISMATCH", "ChildDefinition.getNormalizedName() is missing in TypeScript version. Add it to ChildDefinition.");
              }
              if (!allNames.has(childNorm)) {
                throw new ValidationException_1.ValidationException(0, "CHILD_NOT_DEFINED", `Child ${childNorm} not defined in ${schema.getNamespace()}`);
              }
            }
          }
        }
        return schema;
      }
      function createFrom(n, namespace) {
        const name = n.getValue();
        let type = "INLINE";
        const typeNode = n.getChild("type");
        if (typeNode) {
          type = typeNode.getValue();
        }
        const description = n.getChild("description")?.getText();
        const result = new NodeDefinition_1.NodeDefinition(name, type, n.getLine(), description);
        const children = n.getChild("children");
        if (children) {
          if (!TypeRegistry_1.TypeRegistry.admitsChildren(type)) {
            throw new ValidationException_1.ValidationException(children.getLine(), "CHILDREN_NOT_ALLOWED_FOR_TYPE", `Type ${type} does not allow children (node ${name})`);
          }
          for (const child of children.getChildrenByName("child")) {
            putChildToSchemaNode(result, child, namespace);
          }
        }
        let valuesNodes = n.getChildrenByName("values");
        if (valuesNodes && valuesNodes.length > 0) {
          if (type !== "ENUM") {
            throw new ValidationException_1.ValidationException(n.getLine(), "VALUES_ONLY_SUPPORTED_BY_ENUM", `Values only supported for type ENUM, not for type ${type}`);
          }
          if (valuesNodes.length > 1) {
            throw new RuntimeException_1.RuntimeException("INVALID_SIZE_VALUES", `Unexpected number of values: ${valuesNodes.length}`);
          }
          const valuesNode = valuesNodes[0];
          const values = valuesNode.getChildrenByName("value");
          for (const v of values) {
            result.addValue(v.getValue(), v.getLine());
          }
          valuesNodes = values;
        }
        if (type === "ENUM" && (!valuesNodes || valuesNodes.length === 0)) {
          throw new ValidationException_1.ValidationException(n.getLine(), "VALUES_EMPTY_FOR_ENUM", "ENUM Type must include values");
        }
        return result;
      }
      function putChildToSchemaNode(schemaNode, child, defNamespace) {
        const ns = NameNamespaceParser_1.NameNamespaceParser.parse(child.getValue(), defNamespace, child.getLine(), child.getValue());
        const name = ns.getName();
        const namespace = ns.getNamespace();
        const min = getInteger(child, "min");
        const max = getInteger(child, "max");
        if (min !== null && max !== null && min > max) {
          throw new ValidationException_1.ValidationException(child.getLine(), "MIN_GREATER_THAN_MAX", `Min ${min} greater than Max ${max}`);
        }
        const schemaChild = new ChildDefinition_1.ChildDefinition(name, namespace, min, max, child.getLine());
        schemaNode.addChildDefinition(schemaChild);
      }
      function getInteger(node, name) {
        const n = node.getChild(name);
        if (!n) {
          return null;
        }
        const raw = n.getValue();
        const parsed = Number.parseInt(raw, 10);
        if (Number.isNaN(parsed)) {
          throw new ValidationException_1.ValidationException(node.getLine(), "INVALID_INTEGER", `Integer not valid: ${raw}`);
        }
        return parsed;
      }
    }
  });

  // node_modules/@stxt-lang/core/out/schema/SchemaProviderMeta.js
  var require_SchemaProviderMeta = __commonJS({
    "node_modules/@stxt-lang/core/out/schema/SchemaProviderMeta.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.SchemaProviderMeta = void 0;
      var Schema_1 = require_Schema();
      var Parser_1 = require_Parser();
      var ValidationException_1 = require_ValidationException();
      var RuntimeException_1 = require_RuntimeException();
      var SchemaParser_1 = require_SchemaParser();
      var SchemaProviderMeta = class _SchemaProviderMeta {
        /**
         * Parses the meta-schema and keeps it ready to be served.
         *
         * @throws ValidationException with code `META_SCHEMA_INVALID` if the meta-schema does not produce exactly one document.
         */
        constructor() {
          const parser = new Parser_1.Parser();
          const nodes = parser.parse(_SchemaProviderMeta.META_TEXT);
          if (nodes.length !== 1) {
            throw new ValidationException_1.ValidationException(0, "META_SCHEMA_INVALID", `Meta schema must produce exactly 1 document, got ${nodes.length}`);
          }
          this.meta = (0, SchemaParser_1.transformNodeToSchema)(nodes[0]);
        }
        /**
         * Serves the meta-schema of the schema language.
         *
         * @param namespace namespace whose schema is wanted; only `@stxt.schema` is served.
         * @returns the meta-schema of the schema language.
         * @throws RuntimeException with code `RESOURCE_NOT_FOUND` if any other namespace is asked for.
         */
        getSchema(namespace) {
          if (namespace !== Schema_1.Schema.SCHEMA_NAMESPACE) {
            throw new RuntimeException_1.RuntimeException("RESOURCE_NOT_FOUND", `Not found '${namespace}' in namespace: ${Schema_1.Schema.SCHEMA_NAMESPACE}`);
          }
          if (!this.meta) {
            throw new ValidationException_1.ValidationException(0, "META_SCHEMA_NOT_AVAILABLE", "Meta schema not available");
          }
          return this.meta;
        }
      };
      exports.SchemaProviderMeta = SchemaProviderMeta;
      SchemaProviderMeta.META_TEXT = `Schema (@stxt.schema): @stxt.schema
    Node: Schema
        Children:
            Child: Description
                Max: 1
            Child: Node
                Min: 1
    Node: Node
        Children:
            Child: Type
                Max: 1
            Child: Children
                Max: 1
            Child: Description
                Max: 1
            Child: Values
                Max: 1
    Node: Children
        Type: GROUP
        Children:
            Child: Child
                Min: 1
    Node: Description
        Type: TEXT
    Node: Child
        Children:
            Child: Min
                Max: 1
            Child: Max
                Max: 1
    Node: Min
        Type: NATURAL
    Node: Max
        Type: NATURAL
    Node: Type
        Type: ENUM
        Values:
            Value: INLINE
            Value: BLOCK
            Value: TEXT
            Value: BOOLEAN
            Value: URL
            Value: INTEGER
            Value: NATURAL
            Value: NUMBER
            Value: DATE
            Value: TIME
            Value: TIMESTAMP
            Value: UUID
            Value: EMAIL
            Value: HEXADECIMAL
            Value: BINARY
            Value: BASE64
            Value: GROUP
            Value: ENUM
            Value: MARKDOWN
    Node: Values
        Type: GROUP
        Children:
            Child: Value
                Min: 1
    Node: Value
`;
    }
  });

  // node_modules/@stxt-lang/core/out/template/ChildLine.js
  var require_ChildLine = __commonJS({
    "node_modules/@stxt-lang/core/out/template/ChildLine.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ChildLine = void 0;
      var ChildLine = class {
        /**
         * Creates the already parsed content of a definition line.
         *
         * @param type declared type, or null if the line declares none.
         * @param min minimum cardinality, or null if there is no minimum.
         * @param max maximum cardinality, or null if there is no maximum.
         * @param values values declared between brackets, or null if the line has no brackets at all.
         */
        constructor(type, min, max, values) {
          this.type = type;
          this.min = min;
          this.max = max;
          this.values = values;
        }
        /** @returns the declared type, or null if the line declares none. */
        getType() {
          return this.type;
        }
        /** @returns the minimum cardinality, or null if there is no minimum. */
        getMin() {
          return this.min;
        }
        /** @returns the maximum cardinality, or null if there is no maximum. */
        getMax() {
          return this.max;
        }
        /** @returns the values declared between brackets, or null if the line has no brackets at all. */
        getValues() {
          return this.values;
        }
        /** @returns a readable representation of the line, for debugging. */
        toString() {
          return `ChildLine [type=${this.type}, min=${this.min}, max=${this.max}, values=${this.values ? `[${this.values.join(", ")}]` : "null"}]`;
        }
      };
      exports.ChildLine = ChildLine;
    }
  });

  // node_modules/@stxt-lang/core/out/template/ChildLineParser.js
  var require_ChildLineParser = __commonJS({
    "node_modules/@stxt-lang/core/out/template/ChildLineParser.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ChildLineParser = void 0;
      var ValidationException_1 = require_ValidationException();
      var ChildLine_1 = require_ChildLine();
      var ChildLineParser = class _ChildLineParser {
        constructor() {
        }
        /**
         * Parses a definition line into its type, its cardinality and its allowed values.
         *
         * @param rawLine inline value of the node, `(min,max) TYPE [values]`.
         * @param lineNumber line number, for the error messages.
         * @returns the line already split into type, cardinality and values.
         * @throws ValidationException with code `INVALID_CHILD_LINE`, `INVALID_CHILD_COUNT`,
         *         `MIN_GREATER_THAN_MAX` or `VALUE_DUPLICATED` if the line is not valid.
         */
        static parse(rawLine, lineNumber) {
          if (rawLine.trim().length === 0) {
            return new ChildLine_1.ChildLine(null, null, null, null);
          }
          const m = _ChildLineParser.CHILD_LINE_PATTERN.exec(rawLine);
          if (!m) {
            throw new ValidationException_1.ValidationException(lineNumber, "INVALID_CHILD_LINE", `Line not valid: ${rawLine}`);
          }
          let type = m[2]?.trim() ?? "";
          if (type.length === 0) {
            type = null;
          }
          const count = (m[1] ?? "").trim();
          let min = null;
          let max = null;
          if (count.length === 0 || count === "*") {
            min = null;
            max = null;
          } else if (count === "?") {
            min = null;
            max = 1;
          } else if (count === "+") {
            min = 1;
            max = null;
          } else if (count.endsWith("+")) {
            min = _ChildLineParser.parseCount(count.substring(0, count.length - 1), count, rawLine, lineNumber);
            max = null;
          } else if (count.endsWith("-")) {
            min = null;
            max = _ChildLineParser.parseCount(count.substring(0, count.length - 1), count, rawLine, lineNumber);
          } else if (count.includes(",")) {
            const parts = count.split(",");
            if (parts.length !== 2) {
              throw new ValidationException_1.ValidationException(lineNumber, "INVALID_CHILD_COUNT", `Invalid count ${count} in line: ${rawLine}`);
            }
            const aNum = _ChildLineParser.parseCount(parts[0].trim(), count, rawLine, lineNumber);
            const bNum = _ChildLineParser.parseCount(parts[1].trim(), count, rawLine, lineNumber);
            if (aNum > bNum) {
              throw new ValidationException_1.ValidationException(lineNumber, "MIN_GREATER_THAN_MAX", `Min ${aNum} greater than Max ${bNum} in line: ${rawLine}`);
            }
            min = aNum;
            max = bNum;
          } else {
            min = _ChildLineParser.parseCount(count, count, rawLine, lineNumber);
            max = min;
          }
          let values = null;
          const valuesStr = m[3];
          if (valuesStr !== null && valuesStr !== void 0) {
            const parts = valuesStr.split(",");
            const list = [];
            for (let part of parts) {
              part = part.trim();
              if (part.length === 0) {
                continue;
              }
              if (list.includes(part)) {
                throw new ValidationException_1.ValidationException(lineNumber, "VALUE_DUPLICATED", `The values ${part} is duplicated`);
              }
              list.push(part);
            }
            values = list;
          }
          return new ChildLine_1.ChildLine(type ?? null, min, max, values);
        }
        // num, min and max must be non-negative integers, with no trailing text (STXT-TEMPLATE-SPEC 7.1)
        static parseCount(num, count, rawLine, lineNumber) {
          if (!/^\d+$/.test(num)) {
            throw new ValidationException_1.ValidationException(lineNumber, "INVALID_CHILD_COUNT", `Invalid count ${count} in line: ${rawLine}`);
          }
          return parseInt(num, 10);
        }
      };
      exports.ChildLineParser = ChildLineParser;
      ChildLineParser.CHILD_LINE_PATTERN = /^\s*(?:\(\s*([^()\s][^)]*?)\s*\)\s*)?([^()[\]]*)?(?:\[\s*([^]*?)\s*\]\s*)?\s*$/;
    }
  });

  // node_modules/@stxt-lang/core/out/template/TemplateParser.js
  var require_TemplateParser = __commonJS({
    "node_modules/@stxt-lang/core/out/template/TemplateParser.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.transformTemplateNodeToSchema = transformTemplateNodeToSchema;
      var Parser_1 = require_Parser();
      var ValidationException_1 = require_ValidationException();
      var ChildDefinition_1 = require_ChildDefinition();
      var NodeDefinition_1 = require_NodeDefinition();
      var Schema_1 = require_Schema();
      var StringUtils_1 = require_StringUtils();
      var ChildLineParser_1 = require_ChildLineParser();
      var ParseException_1 = require_ParseException();
      var TypeRegistry_1 = require_TypeRegistry();
      function transformTemplateNodeToSchema(node) {
        const result = new Schema_1.Schema(node.getValue(), node.getLine(), void 0);
        const structure = node.getChild("structure");
        if (!structure) {
          throw new ValidationException_1.ValidationException(node.getLine(), "TEMPLATE_STRUCTURE_REQUIRED", "Template must define 'Structure >>'");
        }
        const text = structure.getText();
        const offset = structure.getLine();
        const parser = new Parser_1.Parser();
        try {
          const nodes = parser.parse(text);
          for (const n of nodes) {
            addToSchema(result, n);
          }
        } catch (e) {
          if (e instanceof ValidationException_1.ValidationException) {
            throw new ValidationException_1.ValidationException(e.line + offset, e.code, e.message);
          }
          if (e instanceof ParseException_1.ParseException) {
            throw new ParseException_1.ParseException(e.line + offset, e.code, e.message);
          }
          throw e;
        }
        const description = node.getChild("description");
        if (description) {
          const text2 = description.getText();
          try {
            const nodes = parser.parse(text2);
            addDescriptions(result, nodes);
          } catch (e) {
            if (e instanceof ValidationException_1.ValidationException) {
              throw new ValidationException_1.ValidationException(e.line + description.getLine(), e.code, e.message);
            }
            if (e instanceof ParseException_1.ParseException) {
              throw new ParseException_1.ParseException(e.line + description.getLine(), e.code, e.message);
            }
            throw e;
          }
        }
        return result;
      }
      function addToSchema(schema, node) {
        if (node.isTextNode()) {
          throw new ValidationException_1.ValidationException(node.getLine(), "INVALID_CHILD_LINE", "Template Structure lines must use ':'");
        }
        let namespace = node.getNamespace();
        const name = node.getName();
        let cl = ChildLineParser_1.ChildLineParser.parse(node.getValue(), node.getLine());
        if (!namespace || namespace === "") {
          namespace = schema.getNamespace();
        }
        if (namespace !== schema.getNamespace()) {
          const type = cl.getType();
          if (type && type.trim().length > 0) {
            throw new ValidationException_1.ValidationException(node.getLine(), "TYPE_DEFINITION_NOT_ALLOWED", "Not allowed type definition in external namespaces");
          }
          const values = cl.getValues();
          if (values) {
            throw new ValidationException_1.ValidationException(node.getLine(), "VALUES_NOT_ALLOWED_IN_EXTERNAL_NAMESPACE", `Not allowed values in external namespaces (node ${node.getName()})`);
          }
          if (node.getChildren().length > 0) {
            throw new ValidationException_1.ValidationException(node.getLine(), "CHILDREN_NOT_ALLOWED_IN_EXTERNAL_NAMESPACE", `Not allowed children in external namespaces (node ${node.getName()})`);
          }
          return;
        }
        let schemaNode = schema.getNodeDefinition(name);
        if (!schemaNode) {
          const type = cl.getType() ?? "INLINE";
          if (type.startsWith("@")) {
            throw new ValidationException_1.ValidationException(node.getLine(), "REFERENCE_NOT_FOUND", `Reference '${type}' does not point to a previous definition or an open ancestor`);
          }
          schemaNode = new NodeDefinition_1.NodeDefinition(node.getName(), type, node.getLine(), void 0);
          schema.addNodeDefinition(schemaNode);
          if (!TypeRegistry_1.TypeRegistry.get(type)) {
            throw new ValidationException_1.ValidationException(node.getLine(), "TYPE_NOT_VALID", `Type not valid: ${type}`);
          }
          const values = cl.getValues();
          if (values) {
            if (type !== "ENUM") {
              throw new ValidationException_1.ValidationException(node.getLine(), "VALUES_ONLY_SUPPORTED_BY_ENUM", `Values only supported for type ENUM, not for type ${type}`);
            }
            for (const v of values) {
              schemaNode.addValue(v, node.getLine());
            }
          }
          if (type === "ENUM" && (!values || values.length === 0)) {
            throw new ValidationException_1.ValidationException(node.getLine(), "VALUES_EMPTY_FOR_ENUM", "ENUM Type must include values");
          }
        } else {
          const type = cl.getType();
          if (!type || !type.startsWith("@")) {
            throw new ValidationException_1.ValidationException(node.getLine(), "NODE_DEFINED_MULTIPLE_TIMES", `Multiple node reference must start with @: ${node.getName()}`);
          }
          const reference = type.substring(1).trim();
          const explicitType = referenceType(reference, node.getNormalizedName());
          if (explicitType) {
            throw new ValidationException_1.ValidationException(node.getLine(), "REFERENCE_WITH_TYPE_NOT_ALLOWED", `Reference '@${node.getName()}' can not declare a type: ${explicitType}`);
          }
          if (StringUtils_1.StringUtils.normalize(reference) !== node.getNormalizedName()) {
            throw new ValidationException_1.ValidationException(node.getLine(), "NODE_REFERENCE_NOT_VALID", `Reference must be '@${node.getName()}', not '${reference}'`);
          }
          const values = cl.getValues();
          if (values) {
            throw new ValidationException_1.ValidationException(node.getLine(), "VALUES_NOT_ALLOWED_IN_REFERENCE", `Reference '@${node.getName()}' can not redefine ENUM values`);
          }
          if (node.getChildren().length > 0) {
            throw new ValidationException_1.ValidationException(node.getLine(), "CHILDREN_NOT_ALLOWED_IN_REFERENCE", `Reference '@${node.getName()}' can not redefine children`);
          }
          return;
        }
        const childrenNode = node.getChildren();
        if (childrenNode.length > 0 && !TypeRegistry_1.TypeRegistry.admitsChildren(schemaNode.getType())) {
          throw new ValidationException_1.ValidationException(node.getLine(), "CHILDREN_NOT_ALLOWED_FOR_TYPE", `Type ${schemaNode.getType()} does not allow children (node ${node.getName()})`);
        }
        for (const child of childrenNode) {
          cl = ChildLineParser_1.ChildLineParser.parse(child.getValue(), child.getLine());
          const childName = child.getName();
          let childNamespace = child.getNamespace();
          if (!childNamespace || childNamespace === "") {
            childNamespace = schema.getNamespace();
          }
          const schChild = new ChildDefinition_1.ChildDefinition(childName, childNamespace, cl.getMin(), cl.getMax(), child.getLine());
          schemaNode.addChildDefinition(schChild);
          addToSchema(schema, child);
        }
      }
      function referenceType(reference, normalizedName) {
        const cut = reference.lastIndexOf(" ");
        if (cut < 0) {
          return null;
        }
        const candidate = reference.substring(cut + 1).trim();
        const rest = reference.substring(0, cut);
        if (TypeRegistry_1.TypeRegistry.get(candidate) && StringUtils_1.StringUtils.normalize(rest) === normalizedName) {
          return candidate;
        }
        return null;
      }
      function addDescriptions(schema, nodes) {
        nodes.forEach((node) => {
          let namespace = node.getNamespace();
          if (!namespace || namespace === "") {
            namespace = schema.getNamespace();
          }
          if (namespace !== schema.getNamespace()) {
            throw new ValidationException_1.ValidationException(node.getLine(), "EXTERNAL_DESCRIPTION_NOT_ALLOWED", "Not allowed description in external namespaces");
          }
          if (node.getChildren().length > 0) {
            throw new ValidationException_1.ValidationException(node.getLine(), "CHILDREN_DESCRIPTION_NOT_ALLOWED", "Not allowed children in description");
          }
          const nodeDef = schema.getNodeDefinition(node.getName());
          if (!nodeDef) {
            throw new ValidationException_1.ValidationException(node.getLine(), "NODE_NOT_FOUND", `Not found node with name: ${node.getName()}`);
          }
          if (nodeDef.getDescription() !== void 0) {
            throw new ValidationException_1.ValidationException(node.getLine(), "DESCRIPTION_ALREADY_DEFINED", `Exists a previous description for node: ${node.getName()}`);
          }
          nodeDef.setDescription(node.getText());
        });
      }
    }
  });

  // node_modules/@stxt-lang/core/out/template/MetaTemplateSchemaProvider.js
  var require_MetaTemplateSchemaProvider = __commonJS({
    "node_modules/@stxt-lang/core/out/template/MetaTemplateSchemaProvider.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.MetaTemplateSchemaProvider = void 0;
      var Parser_1 = require_Parser();
      var ValidationException_1 = require_ValidationException();
      var RuntimeException_1 = require_RuntimeException();
      var TemplateParser_1 = require_TemplateParser();
      var MetaTemplateSchemaProvider = class _MetaTemplateSchemaProvider {
        /**
         * Parses the meta-template and keeps the schema it produces ready to be served.
         *
         * @throws ValidationException with code `META_SCHEMA_INVALID` if the meta-template does not produce exactly one document.
         */
        constructor() {
          const parser = new Parser_1.Parser();
          const nodes = parser.parse(_MetaTemplateSchemaProvider.META_TEXT);
          if (nodes.length !== 1) {
            throw new ValidationException_1.ValidationException(0, "META_SCHEMA_INVALID", `Meta schema must produce exactly 1 document, got ${nodes.length}`);
          }
          this.meta = (0, TemplateParser_1.transformTemplateNodeToSchema)(nodes[0]);
        }
        /**
         * Serves the meta-schema of the template language.
         *
         * @param namespace namespace whose schema is wanted; only `@stxt.template` is served.
         * @returns the meta-schema of the template language.
         * @throws RuntimeException with code `RESOURCE_NOT_FOUND` if any other namespace is asked for.
         */
        getSchema(namespace) {
          if (namespace !== "@stxt.template") {
            throw new RuntimeException_1.RuntimeException("RESOURCE_NOT_FOUND", `Not found '${namespace}' in namespace: @stxt.template`);
          }
          if (!this.meta) {
            throw new ValidationException_1.ValidationException(0, "META_SCHEMA_NOT_AVAILABLE", "Meta schema not available");
          }
          return this.meta;
        }
      };
      exports.MetaTemplateSchemaProvider = MetaTemplateSchemaProvider;
      MetaTemplateSchemaProvider.META_TEXT = `Template (@stxt.template): @stxt.template
	Structure >>
		Template (@stxt.template):
			Description: (?) TEXT
			Structure: (1) BLOCK
`;
    }
  });

  // node_modules/@stxt-lang/core/out/runtime/UnifiedSchemaProvider.js
  var require_UnifiedSchemaProvider = __commonJS({
    "node_modules/@stxt-lang/core/out/runtime/UnifiedSchemaProvider.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.UnifiedSchemaProvider = void 0;
      var Parser_1 = require_Parser();
      var StringUtils_1 = require_StringUtils();
      var SchemaProviderMeta_1 = require_SchemaProviderMeta();
      var SchemaParser_1 = require_SchemaParser();
      var SchemaValidator_1 = require_SchemaValidator();
      var MetaTemplateSchemaProvider_1 = require_MetaTemplateSchemaProvider();
      var TemplateParser_1 = require_TemplateParser();
      var UnifiedSchemaProvider = class _UnifiedSchemaProvider {
        /** Creates an empty provider, with the two meta-schemas already loaded. */
        constructor() {
          this.schemas = /* @__PURE__ */ new Map();
          this.schemaMeta = new SchemaProviderMeta_1.SchemaProviderMeta();
          this.templateMeta = new MetaTemplateSchemaProvider_1.MetaTemplateSchemaProvider();
        }
        /**
         * Resolves the schema that applies to a namespace, serving the meta-schemas of the two
         * reserved namespaces itself.
         *
         * @param namespace namespace whose schema is wanted.
         * @returns the schema of the namespace, or null/undefined if none has been registered for it.
         */
        getSchema(namespace) {
          const key = StringUtils_1.StringUtils.lowerCase(namespace);
          if (namespace === "@stxt.template") {
            return this.templateMeta.getSchema(key);
          } else if (namespace === "@stxt.schema") {
            return this.schemaMeta.getSchema(key);
          }
          let result = this.schemas.get(key);
          return result;
        }
        /**
         * Parses a document and registers every schema or template it defines, each one under its own
         * namespace. Documents of any other namespace are ignored.
         *
         * @param text text of the document to load.
         * @throws ParseException if the document cannot be parsed, or the first ValidationException if
         *         a schema or a template does not validate against its meta-schema.
         */
        addFile(text) {
          const parser = new Parser_1.Parser();
          const nodes = parser.parse(text);
          for (const node of nodes) {
            const namespace = node.getNamespace();
            if (namespace === "@stxt.template") {
              this.addTemplateNode(node);
            } else if (namespace === "@stxt.schema") {
              this.addSchemaNode(node);
            }
          }
        }
        addTemplateNode(node) {
          const schemaValidator = new SchemaValidator_1.SchemaValidator(this.templateMeta, true);
          _UnifiedSchemaProvider.throwIfInvalid(schemaValidator.validate(node));
          const schema = (0, TemplateParser_1.transformTemplateNodeToSchema)(node);
          const key = StringUtils_1.StringUtils.lowerCase(schema.getNamespace());
          this.schemas.set(key, schema);
        }
        addSchemaNode(node) {
          const schemaValidator = new SchemaValidator_1.SchemaValidator(this.schemaMeta, true);
          _UnifiedSchemaProvider.throwIfInvalid(schemaValidator.validate(node));
          const schema = (0, SchemaParser_1.transformNodeToSchema)(node);
          const key = StringUtils_1.StringUtils.lowerCase(schema.getNamespace());
          this.schemas.set(key, schema);
        }
        // A schema/template that does not validate against its meta-schema must not be loaded
        static throwIfInvalid(errors) {
          if (errors.length > 0) {
            throw errors[0];
          }
        }
        /** Removes every schema and template registered in this provider. */
        clear() {
          this.schemas.clear();
        }
        /** @returns every schema registered in this provider, in registration order. */
        getAllSchemas() {
          return Array.from(this.schemas.values());
        }
      };
      exports.UnifiedSchemaProvider = UnifiedSchemaProvider;
    }
  });

  // node_modules/@stxt-lang/core/out/runtime/ConditionalValidator.js
  var require_ConditionalValidator = __commonJS({
    "node_modules/@stxt-lang/core/out/runtime/ConditionalValidator.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ConditionalValidator = void 0;
      var ConditionalValidator = class {
        /**
         * Creates a validator that delegates to a schema validator.
         *
         * @param schemaValidator validator the namespaced nodes are handed over to.
         */
        constructor(schemaValidator) {
          this.schemaValidator = schemaValidator;
        }
        /**
         * Validates a node when it has a namespace, and lets it through otherwise.
         *
         * @param node already closed node to validate.
         * @returns the validation errors found, or an empty array if the node is valid or has no namespace.
         */
        validate(node) {
          if (node.getNamespace() !== "") {
            return this.schemaValidator.validate(node);
          }
          return [];
        }
      };
      exports.ConditionalValidator = ConditionalValidator;
    }
  });

  // node_modules/@stxt-lang/core/out/runtime/NodeWriter.js
  var require_NodeWriter = __commonJS({
    "node_modules/@stxt-lang/core/out/runtime/NodeWriter.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.NodeWriter = exports.IndentStyle = void 0;
      var IndentStyle;
      (function(IndentStyle2) {
        IndentStyle2["TABS"] = "TABS";
        IndentStyle2["SPACES_4"] = "SPACES_4";
      })(IndentStyle || (exports.IndentStyle = IndentStyle = {}));
      var NodeWriter = class _NodeWriter {
        constructor() {
        }
        /**
         * Serializes a node to STXT text.
         *
         * @param node node to serialize (along with its children).
         * @param style indentation style to use; tabs by default.
         * @returns the node serialized to STXT text.
         */
        static toSTXT(node, style = IndentStyle.TABS) {
          const out = [];
          _NodeWriter.writeNode(out, node, 0, style, "");
          return out.join("");
        }
        /**
         * Serializes a list of root nodes to STXT text, separated by a blank line.
         *
         * @param docs root nodes to serialize.
         * @param style indentation style to use; tabs by default.
         * @returns the documents serialized to STXT text.
         */
        static toSTXTDocs(docs, style = IndentStyle.TABS) {
          const out = [];
          for (let i = 0; i < docs.length; i++) {
            if (i > 0) {
              out.push("\n");
            }
            _NodeWriter.writeNode(out, docs[i], 0, style, "");
          }
          return out.join("");
        }
        static writeNode(out, n, depth, style, parentNs) {
          _NodeWriter.indent(out, depth, style);
          const ns = n.getNamespace();
          out.push(n.getName());
          if (ns.length > 0 && ns !== parentNs) {
            out.push(" (", ns, ")");
          }
          if (n.isTextNode()) {
            out.push(" >>\n");
            for (const line of n.getTextLines()) {
              _NodeWriter.indent(out, depth + 1, style);
              out.push(line, "\n");
            }
          } else {
            out.push(":");
            const value = n.getValue();
            if (value.length > 0) {
              out.push(" ", value);
            }
            out.push("\n");
          }
          for (const child of n.getChildren()) {
            _NodeWriter.writeNode(out, child, depth + 1, style, ns);
          }
        }
        static indent(out, depth, style) {
          if (depth > 0) {
            out.push(style === IndentStyle.SPACES_4 ? "    ".repeat(depth) : "	".repeat(depth));
          }
        }
      };
      exports.NodeWriter = NodeWriter;
    }
  });

  // node_modules/@stxt-lang/core/out/runtime/TreeJson.js
  var require_TreeJson = __commonJS({
    "node_modules/@stxt-lang/core/out/runtime/TreeJson.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.toCanonicalTree = toCanonicalTree;
      exports.toCanonicalJson = toCanonicalJson;
      function toCanonicalTree(nodes) {
        return nodes.map((node) => toCanonicalNode(node));
      }
      function toCanonicalJson(nodes) {
        return JSON.stringify(toCanonicalTree(nodes), null, 2);
      }
      function toCanonicalNode(node) {
        if (node.isTextNode()) {
          return {
            name: node.getName(),
            canonicalName: node.getNormalizedName(),
            namespace: node.getNamespace(),
            form: "block",
            lines: [...node.getTextLines()]
          };
        }
        return {
          name: node.getName(),
          canonicalName: node.getNormalizedName(),
          namespace: node.getNamespace(),
          form: "inline",
          value: node.getValue(),
          children: node.getChildren().map((child) => toCanonicalNode(child))
        };
      }
    }
  });

  // node_modules/@stxt-lang/core/out/discovery/DiscoveryError.js
  var require_DiscoveryError = __commonJS({
    "node_modules/@stxt-lang/core/out/discovery/DiscoveryError.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.DiscoveryError = void 0;
      var DiscoveryError = class {
        /**
         * Creates a resolution error.
         *
         * @param code one of the `DISCOVERY_*` constants of this class.
         * @param file full path of the offending file.
         * @param message human-readable description of the error.
         * @param namespace target namespace involved, when the error is about a namespace.
         */
        constructor(code, file, message, namespace) {
          this.code = code;
          this.file = file;
          this.message = message;
          this.namespace = namespace;
        }
      };
      exports.DiscoveryError = DiscoveryError;
      DiscoveryError.DUPLICATE_NAMESPACE = "DISCOVERY_DUPLICATE_NAMESPACE";
      DiscoveryError.NOT_PARSEABLE = "DISCOVERY_NOT_PARSEABLE";
      DiscoveryError.NOT_A_DEFINITION = "DISCOVERY_NOT_A_DEFINITION";
      DiscoveryError.INVALID_DEFINITION = "DISCOVERY_INVALID_DEFINITION";
    }
  });

  // node_modules/@stxt-lang/core/out/discovery/DiscoveryResult.js
  var require_DiscoveryResult = __commonJS({
    "node_modules/@stxt-lang/core/out/discovery/DiscoveryResult.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.DiscoveryResult = void 0;
      var StringUtils_1 = require_StringUtils();
      var DiscoveryResult = class {
        /**
         * Creates a result. Built by {@link DiscoveryResolver}; not meant to be constructed
         * directly.
         *
         * @param levels loaded levels of the chain, highest precedence first.
         * @param schemaMeta provider of the @stxt.schema meta-schema.
         * @param templateMeta provider of the @stxt.template meta-schema.
         */
        constructor(levels, schemaMeta, templateMeta) {
          this.levels = levels;
          this.schemaMeta = schemaMeta;
          this.templateMeta = templateMeta;
        }
        /**
         * Resolves the schema that applies to a namespace: the meta-schemas for the two
         * reserved namespaces, and otherwise the active definition of the nearest level.
         *
         * @param namespace namespace whose schema is wanted.
         * @returns the schema of the namespace, or null if the chain has no definition for it.
         */
        getSchema(namespace) {
          if (namespace === "@stxt.template") {
            return this.templateMeta.getSchema(namespace);
          } else if (namespace === "@stxt.schema") {
            return this.schemaMeta.getSchema(namespace);
          }
          return this.getDefinition(namespace)?.schema ?? null;
        }
        /**
         * The active definition of a namespace: the one from the nearest level that defines it
         * (STXT-DISCOVERY-SPEC section 5), with its provenance.
         *
         * @param namespace namespace whose definition is wanted.
         * @returns the active definition, or undefined if the chain has none for the namespace.
         */
        getDefinition(namespace) {
          const key = StringUtils_1.StringUtils.lowerCase(namespace);
          for (const level of this.levels) {
            if (level.conflictedNamespaces.has(key)) {
              return void 0;
            }
            const definition = level.definitions.get(key);
            if (definition) {
              return definition;
            }
          }
          return void 0;
        }
        /**
         * Every active definition of the chain, with per-namespace precedence already applied:
         * one entry per namespace, from its nearest defining level.
         *
         * @returns the active definitions, ordered by level (nearest level's definitions first).
         */
        getActiveDefinitions() {
          const seen = /* @__PURE__ */ new Set();
          const result = [];
          for (const level of this.levels) {
            for (const key of level.conflictedNamespaces) {
              seen.add(key);
            }
            for (const [key, definition] of level.definitions) {
              if (!seen.has(key)) {
                seen.add(key);
                result.push(definition);
              }
            }
          }
          return result;
        }
        /**
         * Every active schema of the chain (the schemas of {@link getActiveDefinitions}).
         *
         * @returns the active schemas, ordered by level (nearest level's schemas first).
         */
        getAllSchemas() {
          return this.getActiveDefinitions().map((definition) => definition.schema);
        }
        /**
         * The resolution chain: the loaded level directories, highest precedence first.
         *
         * @returns the directories of the chain, in precedence order.
         */
        getChain() {
          return this.levels.map((level) => level.dir);
        }
        /**
         * Every resolution error found while loading the chain (STXT-DISCOVERY-SPEC section 8).
         *
         * @returns the errors, ordered by level and then by file.
         */
        getErrors() {
          const result = [];
          for (const level of this.levels) {
            result.push(...level.errors);
          }
          return result;
        }
      };
      exports.DiscoveryResult = DiscoveryResult;
    }
  });

  // node_modules/@stxt-lang/core/out/discovery/DiscoveryResolver.js
  var require_DiscoveryResolver = __commonJS({
    "node_modules/@stxt-lang/core/out/discovery/DiscoveryResolver.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.DiscoveryResolver = void 0;
      var Parser_1 = require_Parser();
      var StringUtils_1 = require_StringUtils();
      var ParseException_1 = require_ParseException();
      var SchemaProviderMeta_1 = require_SchemaProviderMeta();
      var SchemaValidator_1 = require_SchemaValidator();
      var SchemaParser_1 = require_SchemaParser();
      var MetaTemplateSchemaProvider_1 = require_MetaTemplateSchemaProvider();
      var TemplateParser_1 = require_TemplateParser();
      var DiscoveryError_1 = require_DiscoveryError();
      var DiscoveryResult_1 = require_DiscoveryResult();
      var STXT_DIR = ".stxt";
      var STXT_EXTENSION = ".stxt";
      var DEFAULT_MAX_ASCENT = 32;
      var DiscoveryResolver = class {
        /**
         * Creates a resolver.
         *
         * @param fs file-system access.
         * @param env environment access (`STXT_PATH`, user and system directories).
         * @param options optional settings.
         */
        constructor(fs, env, options) {
          this.fs = fs;
          this.env = env;
          this.schemaMeta = new SchemaProviderMeta_1.SchemaProviderMeta();
          this.templateMeta = new MetaTemplateSchemaProvider_1.MetaTemplateSchemaProvider();
          this.levelCache = /* @__PURE__ */ new Map();
          this.maxAscent = options?.maxAscent ?? DEFAULT_MAX_ASCENT;
        }
        /**
         * Builds the resolution chain of a document (STXT-DISCOVERY-SPEC sections 4 and 6)
         * without loading any definition.
         *
         * @param documentDir directory containing the document, or null for a document with no
         *        file-system location (standard input, an unsaved buffer), whose chain starts
         *        at the user level.
         * @returns the existing resolution directories, highest precedence first.
         */
        async resolveChain(documentDir) {
          const stxtPath = this.env.getStxtPath();
          if (stxtPath !== null) {
            return this.existingUnique(stxtPath);
          }
          const chain = [];
          if (documentDir !== null) {
            let dir = documentDir;
            for (let level = 0; level < this.maxAscent && dir !== null; level++) {
              const candidate = this.fs.join(dir, STXT_DIR);
              if (await this.fs.isDirectory(candidate)) {
                chain.push(candidate);
              }
              dir = this.fs.parentOf(dir);
            }
          }
          const userDir = this.env.getUserLevelDir();
          const systemDir = this.env.getSystemLevelDir();
          for (const dir of [userDir, systemDir]) {
            if (dir !== null && !chain.includes(dir) && await this.fs.isDirectory(dir)) {
              chain.push(dir);
            }
          }
          return chain;
        }
        /**
         * Resolves the definitions applicable to a document: builds its chain, loads every
         * level (from the cache when already loaded) and returns the result with the
         * per-namespace precedence applied.
         *
         * @param documentDir directory containing the document, or null for a document with no
         *        file-system location.
         * @returns the resolution result, usable directly as a `SchemaProvider`.
         */
        async resolve(documentDir) {
          const chain = await this.resolveChain(documentDir);
          const levels = [];
          for (const dir of chain) {
            levels.push(await this.loadLevel(dir));
          }
          return new DiscoveryResult_1.DiscoveryResult(levels, this.schemaMeta, this.templateMeta);
        }
        /**
         * Empties the level cache, so that the next resolve re-reads every directory. Call it
         * when the definition files may have changed (e.g. from a file watcher).
         */
        clearCache() {
          this.levelCache.clear();
        }
        // Filters a list of directories down to the existing ones, removing duplicates.
        async existingUnique(dirs) {
          const result = [];
          for (const dir of dirs) {
            if (!result.includes(dir) && await this.fs.isDirectory(dir)) {
              result.push(dir);
            }
          }
          return result;
        }
        // Loads a resolution directory (or returns it from the cache): every file under it,
        // recursively, with the level-local duplicate detection of spec section 5.
        async loadLevel(dir) {
          const cached = this.levelCache.get(dir);
          if (cached) {
            return cached;
          }
          const level = { dir, definitions: /* @__PURE__ */ new Map(), conflictedNamespaces: /* @__PURE__ */ new Set(), errors: [] };
          for (const file of await this.collectFiles(dir)) {
            await this.loadFile(file, level);
          }
          this.levelCache.set(dir, level);
          return level;
        }
        // Collects every file under a directory, recursively, sorted by path so that results
        // and error messages do not depend on the listing order of the file system.
        async collectFiles(dir) {
          const files = [];
          const entries = [...await this.fs.listDirectory(dir)].sort((a, b) => a.path < b.path ? -1 : 1);
          for (const entry of entries) {
            if (entry.isDirectory) {
              files.push(...await this.collectFiles(entry.path));
            } else {
              files.push(entry.path);
            }
          }
          return files;
        }
        // Loads one file of a level: parses it and registers every root as a definition,
        // reporting the errors of spec section 8.
        async loadFile(file, level) {
          if (!file.endsWith(STXT_EXTENSION)) {
            level.errors.push(new DiscoveryError_1.DiscoveryError(DiscoveryError_1.DiscoveryError.NOT_A_DEFINITION, file, `Not an STXT definition file: ${file}`));
            return;
          }
          let nodes;
          try {
            nodes = new Parser_1.Parser().parse(await this.fs.readFile(file));
          } catch (e) {
            level.errors.push(new DiscoveryError_1.DiscoveryError(DiscoveryError_1.DiscoveryError.NOT_PARSEABLE, file, `Cannot parse ${file}: ${e instanceof Error ? e.message : String(e)}`));
            return;
          }
          if (nodes.length === 0) {
            level.errors.push(new DiscoveryError_1.DiscoveryError(DiscoveryError_1.DiscoveryError.NOT_A_DEFINITION, file, `Empty document, not a definition: ${file}`));
            return;
          }
          for (const node of nodes) {
            this.loadRootNode(node, file, level);
          }
        }
        // Validates one root node against its meta-schema, compiles it to a schema and
        // registers it in the level, detecting same-level duplicates.
        loadRootNode(node, file, level) {
          const namespace = node.getNamespace();
          let schema;
          try {
            if (namespace === "@stxt.template") {
              schema = this.compile(node, this.templateMeta, TemplateParser_1.transformTemplateNodeToSchema);
            } else if (namespace === "@stxt.schema") {
              schema = this.compile(node, this.schemaMeta, SchemaParser_1.transformNodeToSchema);
            } else {
              level.errors.push(new DiscoveryError_1.DiscoveryError(DiscoveryError_1.DiscoveryError.NOT_A_DEFINITION, file, `Root node belongs to '${namespace ?? ""}', not to @stxt.schema or @stxt.template: ${file}`));
              return;
            }
          } catch (e) {
            const message = e instanceof ParseException_1.ParseException ? `[${e.code}] ${e.message}` : String(e);
            level.errors.push(new DiscoveryError_1.DiscoveryError(DiscoveryError_1.DiscoveryError.INVALID_DEFINITION, file, `Invalid definition in ${file}: ${message}`));
            return;
          }
          const key = StringUtils_1.StringUtils.lowerCase(schema.getNamespace());
          const existing = level.definitions.get(key);
          if (level.conflictedNamespaces.has(key) || existing) {
            if (existing) {
              level.definitions.delete(key);
              level.conflictedNamespaces.add(key);
            }
            const firstFile = existing ? existing.file : "another file of this level";
            level.errors.push(new DiscoveryError_1.DiscoveryError(DiscoveryError_1.DiscoveryError.DUPLICATE_NAMESPACE, file, `Duplicate definition for namespace '${schema.getNamespace()}' at level ${level.dir}: already defined in ${firstFile}`, schema.getNamespace()));
            return;
          }
          const definition = {
            namespace: schema.getNamespace(),
            schema,
            file,
            levelDir: level.dir
          };
          level.definitions.set(key, definition);
        }
        // Validates a root node against a meta-schema and transforms it into a Schema,
        // throwing the first validation error (same policy as UnifiedSchemaProvider).
        compile(node, meta, transform) {
          const errors = new SchemaValidator_1.SchemaValidator(meta, true).validate(node);
          if (errors.length > 0) {
            throw errors[0];
          }
          return transform(node);
        }
      };
      exports.DiscoveryResolver = DiscoveryResolver;
    }
  });

  // node_modules/@stxt-lang/core/out/all.js
  var require_all = __commonJS({
    "node_modules/@stxt-lang/core/out/all.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.DiscoveryError = exports.DiscoveryResult = exports.DiscoveryResolver = exports.transformTemplateNodeToSchema = exports.toCanonicalJson = exports.toCanonicalTree = exports.IndentStyle = exports.NodeWriter = exports.ConditionalValidator = exports.UnifiedSchemaProvider = exports.transformNodeToSchema = exports.ChildDefinition = exports.NodeDefinition = exports.SchemaValidator = exports.Schema = exports.ValidationException = exports.ParseException = exports.StringUtils = exports.parseLine = exports.Constants = exports.Line = exports.ParseResult = exports.Parser = exports.Node = void 0;
      var Node_1 = require_Node();
      Object.defineProperty(exports, "Node", { enumerable: true, get: function() {
        return Node_1.Node;
      } });
      var Parser_1 = require_Parser();
      Object.defineProperty(exports, "Parser", { enumerable: true, get: function() {
        return Parser_1.Parser;
      } });
      var ParseResult_1 = require_ParseResult();
      Object.defineProperty(exports, "ParseResult", { enumerable: true, get: function() {
        return ParseResult_1.ParseResult;
      } });
      var Line_1 = require_Line();
      Object.defineProperty(exports, "Line", { enumerable: true, get: function() {
        return Line_1.Line;
      } });
      var Constants_1 = require_Constants();
      Object.defineProperty(exports, "Constants", { enumerable: true, get: function() {
        return Constants_1.Constants;
      } });
      var LineParser_1 = require_LineParser();
      Object.defineProperty(exports, "parseLine", { enumerable: true, get: function() {
        return LineParser_1.parseLine;
      } });
      var StringUtils_1 = require_StringUtils();
      Object.defineProperty(exports, "StringUtils", { enumerable: true, get: function() {
        return StringUtils_1.StringUtils;
      } });
      var ParseException_1 = require_ParseException();
      Object.defineProperty(exports, "ParseException", { enumerable: true, get: function() {
        return ParseException_1.ParseException;
      } });
      var ValidationException_1 = require_ValidationException();
      Object.defineProperty(exports, "ValidationException", { enumerable: true, get: function() {
        return ValidationException_1.ValidationException;
      } });
      var Schema_1 = require_Schema();
      Object.defineProperty(exports, "Schema", { enumerable: true, get: function() {
        return Schema_1.Schema;
      } });
      var SchemaValidator_1 = require_SchemaValidator();
      Object.defineProperty(exports, "SchemaValidator", { enumerable: true, get: function() {
        return SchemaValidator_1.SchemaValidator;
      } });
      var NodeDefinition_1 = require_NodeDefinition();
      Object.defineProperty(exports, "NodeDefinition", { enumerable: true, get: function() {
        return NodeDefinition_1.NodeDefinition;
      } });
      var ChildDefinition_1 = require_ChildDefinition();
      Object.defineProperty(exports, "ChildDefinition", { enumerable: true, get: function() {
        return ChildDefinition_1.ChildDefinition;
      } });
      var SchemaParser_1 = require_SchemaParser();
      Object.defineProperty(exports, "transformNodeToSchema", { enumerable: true, get: function() {
        return SchemaParser_1.transformNodeToSchema;
      } });
      var UnifiedSchemaProvider_1 = require_UnifiedSchemaProvider();
      Object.defineProperty(exports, "UnifiedSchemaProvider", { enumerable: true, get: function() {
        return UnifiedSchemaProvider_1.UnifiedSchemaProvider;
      } });
      var ConditionalValidator_1 = require_ConditionalValidator();
      Object.defineProperty(exports, "ConditionalValidator", { enumerable: true, get: function() {
        return ConditionalValidator_1.ConditionalValidator;
      } });
      var NodeWriter_1 = require_NodeWriter();
      Object.defineProperty(exports, "NodeWriter", { enumerable: true, get: function() {
        return NodeWriter_1.NodeWriter;
      } });
      Object.defineProperty(exports, "IndentStyle", { enumerable: true, get: function() {
        return NodeWriter_1.IndentStyle;
      } });
      var TreeJson_1 = require_TreeJson();
      Object.defineProperty(exports, "toCanonicalTree", { enumerable: true, get: function() {
        return TreeJson_1.toCanonicalTree;
      } });
      Object.defineProperty(exports, "toCanonicalJson", { enumerable: true, get: function() {
        return TreeJson_1.toCanonicalJson;
      } });
      var TemplateParser_1 = require_TemplateParser();
      Object.defineProperty(exports, "transformTemplateNodeToSchema", { enumerable: true, get: function() {
        return TemplateParser_1.transformTemplateNodeToSchema;
      } });
      var DiscoveryResolver_1 = require_DiscoveryResolver();
      Object.defineProperty(exports, "DiscoveryResolver", { enumerable: true, get: function() {
        return DiscoveryResolver_1.DiscoveryResolver;
      } });
      var DiscoveryResult_1 = require_DiscoveryResult();
      Object.defineProperty(exports, "DiscoveryResult", { enumerable: true, get: function() {
        return DiscoveryResult_1.DiscoveryResult;
      } });
      var DiscoveryError_1 = require_DiscoveryError();
      Object.defineProperty(exports, "DiscoveryError", { enumerable: true, get: function() {
        return DiscoveryError_1.DiscoveryError;
      } });
    }
  });

  // src/index.ts
  var import_core = __toESM(require_all());
  var SAMPLE = [
    "# The playground is not built yet, but the parser already runs in the browser.",
    "Greeting (dev.stxt.play): hola!",
    "	From: stxt-play",
    "	Note >>",
    "		Everything under a '>>' node is literal text."
  ].join("\n");
  function outline(node, depth) {
    const indent = "	".repeat(depth);
    if (node.isTextNode()) {
      const lines = node.getTextLines().map((line) => `${indent}	${line}`);
      return [`${indent}${node.getName()} >>`, ...lines];
    }
    const children = node.getChildren().flatMap((child) => outline(child, depth + 1));
    return [`${indent}${node.getName()}: ${node.getValue()}`, ...children];
  }
  function main() {
    const output = document.getElementById("smoke-test-output");
    if (!output) {
      return;
    }
    try {
      const nodes = new import_core.Parser().parse(SAMPLE);
      output.textContent = nodes.flatMap((node) => outline(node, 0)).join("\n");
    } catch (error) {
      output.textContent = String(error);
    }
  }
  document.addEventListener("DOMContentLoaded", main);
})();
//# sourceMappingURL=play.js.map
