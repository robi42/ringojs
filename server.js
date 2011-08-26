var env = require('ringo/engine').properties;

exports.app = function (req) {
    return {
        status: 200,
        headers: {"Content-Type": "text/plain"},
        body: [
            "Hello, shiny Ringo world!", "\n\n",
            "Here's my home:", "\n",
            env['ringo.home'], "\n\n",
            "I'm running on:", "\n",
            env['java.runtime.name']
        ]
    };
};

if (require.main == module)
    require("ringo/httpserver").main(module.id);
