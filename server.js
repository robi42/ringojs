exports.app = function (req) {
    return {
        status: 200,
        headers: {"Content-Type": "text/plain"},
        body: [
            "Hello, shiny Ringo world!", "\n\n",
            "Here's my env:", "\n",
            JSON.stringify(require('ringo/engine').properties)
        ]
    };
};

if (require.main == module)
    require("ringo/httpserver").main(module.id);
