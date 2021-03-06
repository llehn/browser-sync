"use strict";

var browserSync = require("../../../");

var sinon  = require("sinon");
var assert = require("chai").assert;
var File = require("vinyl");

describe("API: .stream()", function () {

    var emitterStub, clock, bs;

    before(function (done) {
        browserSync.reset();
        bs = browserSync({logLevel: "silent"}, function () {
            emitterStub = sinon.spy(bs.emitter, "emit");
            done();
        });
        clock = sinon.useFakeTimers();
    });

    afterEach(function () {
        emitterStub.reset();
        clock.now = 0;
    });

    after(function () {
        bs.cleanup();
        clock.restore();
        emitterStub.restore();
    });

    it("should handle a single file changed", function () {
        var stream = browserSync.stream();
        stream.write(new File({path: "styles.css"}));
        stream.end();
        sinon.assert.calledWithExactly(emitterStub, "file:changed", {
            path:      "styles.css",
            basename:  "styles.css",
            log:       false,
            namespace: "core",
            event:     "change",
            ext:       "css"
        });
    });
    it("should accept multiple files in stream", function () {
        var stream = browserSync.stream();
        stream.write(new File({path: "styles.css"}));
        stream.write(new File({path: "styles2.css"}));
        stream.end();
        sinon.assert.calledWithExactly(emitterStub, "file:changed", {
            path:      "styles.css",
            basename:  "styles.css",
            log:       false,
            namespace: "core",
            event:     "change",
            ext:       "css"
        });
        sinon.assert.calledWithExactly(emitterStub, "file:changed", {
            path:      "styles2.css",
            basename:  "styles2.css",
            log:       false,
            namespace: "core",
            event:     "change",
            ext:       "css"
        });
        sinon.assert.calledWithExactly(emitterStub, "stream:changed", {
            changed: ["styles.css", "styles2.css"]
        });
    });
    it("should reload browser if once:true given as arg", function () {
        var stream = browserSync.stream({once: true});
        stream.write(new File({path: "styles.css"}));
        stream.write(new File({path: "styles2.css"}));
        stream.write(new File({path: "styles3.css"}));
        stream.end();
        sinon.assert.calledWithExactly(emitterStub, "_browser:reload");
        sinon.assert.calledWithExactly(emitterStub, "browser:reload");
    });
    it("does not log file info if (once: true)", function () {
        var stream = browserSync.stream({once: true});
        stream.write(new File({path: "styles.js"}));
        stream.write(new File({path: "styles2.js"}));
        stream.write(new File({path: "styles3.js"}));
        stream.end();
        sinon.assert.calledWithExactly(emitterStub, "_browser:reload");
        sinon.assert.calledWithExactly(emitterStub, "browser:reload");
    });
    it("only emits file-changed event if filter matched", function () {
        var stream = browserSync.stream({match: "**/*.js"});
        stream.write(new File({path: "/users/shane/styles.js"}));
        stream.write(new File({path: "core.css"}));
        stream.end();
        sinon.assert.calledThrice(emitterStub);
        sinon.assert.calledWithExactly(emitterStub, "file:changed", {
            event: "change",
            log: false,
            namespace: "core",
            path: "/users/shane/styles.js"
        });
        sinon.assert.calledWithExactly(emitterStub, "browser:reload");
        sinon.assert.calledWithExactly(emitterStub, "stream:changed", {
            changed: ["styles.js"]
        });
    });
    it("only emits file-changed event if filter returns no results", function () {
        var stream = browserSync.stream({match: "**/*.md"});
        stream.write(new File({path: "/users/shane/styles.js"}));
        stream.write(new File({path: "core.css"}));
        stream.write(new File({path: "index.html"}));
        stream.end();
        clock.tick();
        sinon.assert.notCalled(emitterStub);
    });
    it("accepts file paths beginning with dots", function () {
        var stream = browserSync.stream({match: "**/*.css"});
        stream.write(new File({path: "/users/shakyshane/.tmp/css/core.css"}));
        stream.write(new File({path: "/users/shakyshane/.tmp/css/core.css.map"}));
        stream.end();
        clock.tick();
        sinon.assert.calledWithExactly(emitterStub, "file:changed", {
            path:      "/users/shakyshane/.tmp/css/core.css",
            basename:  "core.css",
            log:       false,
            namespace: "core",
            event:     "change",
            ext:       "css",
        });
        sinon.assert.calledWithExactly(emitterStub, "file:reload", {
            ext: "css",
            path: "/users/shakyshane/.tmp/css/core.css",
            basename: "core.css",
            type: "inject",
            log: false,
            event: "change"
        });
        sinon.assert.calledWithExactly(emitterStub, "stream:changed", {
            changed: ["core.css"]
        });
    });
    it("emits the stream:changed event with an array of changed files", function () {

        var stream    = browserSync.stream();

        stream.write(new File({path: "/users/shane/styles.js"}));
        stream.write(new File({path: "core.css"}));
        stream.write(new File({path: "index.html"}));

        stream.end();
        clock.tick();

        assert.isFalse(emitterStub.getCall(0).args[1].log);

        assert.equal(emitterStub.getCall(1).args[0], "browser:reload");

        assert.isFalse(emitterStub.getCall(2).args[1].log);
        assert.equal(emitterStub.getCall(2).args[0], "file:changed");
        assert.equal(emitterStub.getCall(3).args[0], "file:reload");
        assert.equal(emitterStub.getCall(3).args[1].path, "core.css");

        assert.equal(emitterStub.getCall(4).args[0], "file:changed");
        assert.equal(emitterStub.getCall(5).args, "browser:reload");
    });
});
