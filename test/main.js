var should = require('should');
var less = require('../');
var gutil = require('gulp-util');
var fs = require('fs');
var pj = require('path').join;
var os = require('os');
var path = require('path');

function createVinyl(lessFileName, contents) {
  var base = pj(__dirname, 'fixtures');
  var filePath = pj(base, lessFileName);

  return new gutil.File({
    cwd: __dirname,
    base: base,
    path: filePath,
    contents: contents || fs.readFileSync(filePath)
  });
}

describe('gulp-less-sourcemap', function () {
  describe('less()', function () {
    it('should pass file when it isNull()', function (done) {
      var stream = less();
      var emptyFile = {
        isNull: function () { return true; }
      };
      stream.on('data', function (data) {
        data.should.equal(emptyFile);
        done();
      });
      stream.write(emptyFile);
    });

    it('should emit error when file isStream()', function (done) {
      var stream = less();
      var streamFile = {
        isNull: function () { return false; },
        isStream: function () { return true; }
      };
      stream.on('error', function (err) {
        err.message.should.equal('Streaming not supported');
        done();
      });
      stream.write(streamFile);
    });

    it('should compile single less file', function (done) {
      var lessFile = createVinyl('buttons.less');
      var stream = less();
      stream.on('data', function (cssFile) {
        if (path.basename(cssFile.path).match(/\.map$/)) {
          return
        }

        should.exist(cssFile);
        should.exist(cssFile.path);
        should.exist(cssFile.relative);
        should.exist(cssFile.contents);

        // replace End-of-line marker for cross OS testing
        String(cssFile.contents).replace(/(\r\n|\n)/g, os.EOL).should.equal(
          fs.readFileSync(pj(__dirname, 'expect/buttons.css'), 'utf8').replace(/(\r\n|\n)/g, os.EOL)
        );
        done();
      });
      stream.write(lessFile);
    });

    it('should emit error when less contains errors', function (done) {
      var stream = less();
      var errorFile = createVinyl('somefile.less',
        new Buffer('html { color: @undefined-variable; }'));
      stream.on('error', function (err) {
        err.message.should.equal('variable @undefined-variable is undefined in file '+errorFile.path+' line no. 1');
        done();
      });
      stream.write(errorFile);
    });

    it('should continue to process next files when less error occurs', function (done) {
      var stream = less();

      var errorFile = createVinyl('somefile.less',
        new Buffer('html { color: @undefined-variable; }'));
      var normalFile = createVinyl('buttons.less');

      var errorHandled = false;
      var dataHandled = false;

      stream.on('error', function (err) {
        err.message.should.equal('variable @undefined-variable is undefined in file '+errorFile.path+' line no. 1');
        errorHandled = true;
        if (dataHandled) {
          done();
        }
      });
      stream.on('data', function (cssFile) {
        dataHandled = true;
        if (errorHandled) {
          done();
        }
      });
      stream.write(errorFile);
      stream.write(normalFile);
    });

    it('should compile multiple less files', function (done) {
      var files = [
        createVinyl('buttons.less'),
        createVinyl('forms.less'),
        createVinyl('normalize.less')
      ];

      var stream = less();
      var count = files.length;
      stream.on('data', function (cssFile) {
        should.exist(cssFile);
        should.exist(cssFile.path);
        should.exist(cssFile.relative);
        should.exist(cssFile.contents);

        if (!--count) { done(); }
      });

      files.forEach(function (file) {
        stream.write(file);
      });
    });
  });
});
