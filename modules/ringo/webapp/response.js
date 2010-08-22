var {ByteArray} = require('binary');
var {Stream} = require('io');
var {Buffer} = require('ringo/buffer');
var {Headers, getMimeParameter} = require('./util');
var {mimeType} = require('./mime');
var {render} = require('ringo/skin');
var dates = require('ringo/utils/dates'),
    webenv = require('ringo/webapp/env');

export('Response');

function Response() {

    // missing new security belt
    if (!(this instanceof Response)) {
        var response = new Response();
        response.write.apply(response, arguments);
        return response;
    }

    var config = webenv.getConfig(),
        status = 200,
        charset = config && config.charset || 'utf-8',
        contentType = config && config.contentType || 'text/html',
        headers = new Headers(),
        buffer = new Buffer();

    this.write = function() {
        var length = arguments.length;
        for (var i = 0; i < length; i++) {
            buffer.write(String(arguments[i]));
            if (i < length - 1) {
                buffer.write(' ');
            }
        }
        return this;
    };

    this.write.apply(this, arguments);

    this.writeln = function() {
        this.write.apply(this, arguments);
        buffer.write('\r\n');
        return this;
    };

    /**
     * Render a skin to the response's buffer.
     * @param skin path to skin resource
     * @param context context object
     */
    this.render = function(skin, context) {
        buffer.write(render(skin, context));
    };

    /**
     * Print a debug message to the rendered page.
     */
    this.debug = function() {
        var buffer = this.debugBuffer || new Buffer();
        buffer.write('<div class="ringo-debug-line" style="background: yellow;');
        buffer.write('color: black; border-top: 1px solid black;">');
        var length = arguments.length;
        for (var i = 0; i < length; i++) {
            buffer.write(arguments[i]);
            if (i < length - 1) {
                buffer.write(" ");
            }
        }
        buffer.writeln('</div>');
        this.debugBuffer = buffer;
        return null;
    };

    /**
     * Write the debug buffer to the response's main buffer.
     */
    this.flushDebug = function() {
        if (this.debugBuffer != null) {
            this.write(this.debugBuffer);
            this.debugBuffer.reset();
        }
        return null;
    };

    this.redirect = function(location) {
        status = 303;
        headers.set('Location', String(location));
    };

    Object.defineProperties(this, {
        charset: {
            get: function() charset,
            set: function(c) (charset = c)
        },
        contentType: {
            get: function() contentType,
            set: function(c) (contentType = c)
        },
        status: {
            get: function() status,
            set: function(s) (status = s)
        }
    });

    this.getHeader = function(key) {
        headers.get(String(key));
    };

    /**
     * Set a header to be sent to the client. If a header with this name was previously
     * set it will be replaced.
     * @param {String} key the header name
     * @param {String} value the header value
     * @returns {Response} this response for chainability
     */
    this.setHeader = function(key, value) {
        key = String(key);
        if (key.toLowerCase() === 'content-type') {
            contentType = String(value);
            charset = getMimeParameter(contentType, 'charset') || charset;
        }
        headers.set(key, String(value));
        return this;
    };

    /**
     * Add a header to be sent to the client. If a header with this name was previously
     * set it will not be replaced.
     * @param {String} key the header name
     * @param {String} value the header value
     * @returns {Response} this response for chainability
     */
    this.addHeader = function(key, value) {
        headers.add(String(key), String(value));
        return this;
    };

    /**
     * Sets a cookie to be sent to the client.
     * All arguments except for key and value are optional.
     * The days argument specifies the number of days until the cookie expires.
     * To delete a cookie immediately, set the days argument to 0. If days is
     * undefined or negative, the cookie is set for the current browser session.
     *
     * @example <pre>res.setCookie("username", "michi");
     * res.setCookie("password", "strenggeheim", 10,
     *               {path: "/mypath", domain: ".mydomain.org"});</pre>
     *
     * @param {String} key the cookie name
     * @param {String} value the cookie value
     * @param {Number} days optional the number of days to keep the cookie.
     *     If this is undefined or -1, the cookie is set for the current session.
     *     If this is 0, the cookie will be deleted immediately. 
     * @param {Object} options optional options argument which may contain the following properties:
     *     <ul><li>path - the path on which to set the cookie (defaults to /)</li>
     *     <li>domain -  the domain on which to set the cookie (defaults to current domain)</li>
     *     <li>secure - to only use this cookie for secure connections</li>
     *     <li>httpOnly - to make the cookie inaccessible to client side scripts</li></ul>
     * @since 0.5
     * @return {Response} this response object for chainability;
     */
    this.setCookie = function(key, value, days, options) {
        if (value) {
            // remove newline chars to prevent response splitting attack as value may be user-provided
            value = value.replace(/[\r\n]/g, '');
        }
        var buffer = new Buffer(key, '=', value);
        if (typeof days === 'number' && days > -1) {
            var expires = days === 0 ?
                new Date(0) : new Date(Date.now() + days * 1000 * 60 * 60 * 24);
            var cookieDateFormat = 'EEE, dd-MMM-yyyy HH:mm:ss zzz';
            buffer.write('; expires=');
            buffer.write(dates.format(expires, cookieDateFormat, 'en', 'GMT'));
        }
        options = options || {};
        var path = options.path || '/';
        buffer.write('; path=', encodeURI(path));
        if (options.domain) {
            buffer.write('; domain=', options.domain.toLowerCase());
        }
        if (options.secure) {
            buffer.write('; secure');
        }
        if (options.httpOnly) {
            buffer.write('; HttpOnly');
        }
        this.addHeader('Set-Cookie', buffer.toString());
        return this;
    };

    /**
     * Close and convert this response into a JSGI response object.
     * @returns a JSGI 0.2 response object
     */
    this.close = function() {
        this.flushDebug();
        if (contentType && !headers.contains('content-type')) {
            if (charset) {
                contentType += '; charset=' + charset;
            }
            headers.set('Content-Type', contentType);
        }
        return {
            status: status,
            headers: headers,
            body: buffer
        };
    };

}

/**
 * A response object rendered from a skin.
 * @param {Resource|String} skin the skin resource or path
 * @param {Object} context the skin context object
 */
Response.skin = function (skin, context) {
    if (!(skin instanceof org.ringojs.repository.Resource)) {
        skin = getResource(skin);
    }
    return new Response(render(skin, context));
};

/**
 * Create a response object containing the JSON representation of an object.
 * @param {Object} object the object whose JSON representation to return
 */
Response.json = function (object) {
    var response = new Response(JSON.stringify(object));
    response.contentType = 'application/json';
    return response;
};

/**
 * Create a response containing the given XML document
 * @param {XML|String} xml an XML document
 */
Response.xml = function (xml) {
    var response = new Response(typeof xml === 'xml' ?
            xml.toXMLString() : xml);
    response.contentType = 'application/xml';
    return response;
};

/**
 * A response representing a static resource.
 * @param {String|Resource} resource the resource to serve
 * @param {String} contentType optional MIME type. If not defined,
 *         the MIME type is detected from the file name extension.
 */
Response.static = function (resource, contentType) {
    if (typeof resource === 'string') {
        resource = getResource(resource);
    }
    if (!(resource instanceof org.ringojs.repository.Resource)) {
        throw new Error('Wrong argument for static response: ' + typeof(resource));
    }
    if (!resource.exists()) {
        return Response.notFound(String(resource));
    }
    var input;
    return {
        status: 200,
        headers: {
            'Content-Type': contentType || mimeType(resource.name)
        },
        body: {
            digest: function() {
                return resource.lastModified().toString(36)
                        + resource.length.toString(36);
            },
            forEach: function(fn) {
                var read, bufsize = 8192,
                    buffer = new ByteArray(bufsize);
                input = new Stream(resource.getInputStream());
                while ((read = input.readInto(buffer)) > -1) {
                    buffer.length = read;
                    fn(buffer);
                    buffer.length = bufsize;
                }
            },
            close: function() {
                if (input) {
                    input.close();
                }
            }
        }
    };
};

/**
 * Create a response that redirects the client to a different URL.
 * @param {String} location the new location
 */
Response.redirect = function (location) {
    return {
        status: 303,
        headers: {Location: location},
        body: ["See other: " + location]
    };
};

/**
 * Create a 404 not-found response.
 * @param {String} location the location that couldn't be found
 */
Response.notFound = function (location) {
    var msg = 'Not Found';
    return {
        status: 404,
        headers: {
            'Content-Type': 'text/html'
        },
        body: [
            '<html><title>', msg, '</title>',
            '<body><h2>', msg, '</h2>',
            '<p>The requested URL ', String(location),
            ' was not found on the server.</p>',
            '</body></html>'
        ]
    };
};

/**
 * Create a 500 error response.
 * @param {String} msg the message of response body
 */
Response.error = function (msg) {
    return {
        status: 500,
        headers: {'Content-Type': 'text/plain'},
        body: [typeof msg === 'undefined' ? 'Something went wrong.' :
                String(msg)]
    };
};
