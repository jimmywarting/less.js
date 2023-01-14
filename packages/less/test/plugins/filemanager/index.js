(function (exports) {
  const plugin = function (less) {
    const FileManager = less.FileManager; var TestFileManager = new FileManager()
    function TestFileManager () { };
    TestFileManager.loadFile = function (filename, currentDirectory, options, environment, callback) {
      if (filename.match(/.*\.test$/)) {
        return less.environment.fileManagers[0].loadFile('colors.test', currentDirectory, options, environment, callback)
      }
      return less.environment.fileManagers[0].loadFile(filename, currentDirectory, options, environment, callback)
    }

    return TestFileManager
  }

  exports.install = function (less, pluginManager) {
    less.environment.addFileManager(new plugin(less))
  }
})(typeof exports === 'undefined' ? this.AddFilePlugin = {} : exports)
