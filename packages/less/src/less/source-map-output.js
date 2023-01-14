export default function (environment) {
  class SourceMapOutput {
    #css = []
    #rootNode
    #contentsMap
    #contentsIgnoredCharsMap
    #sourceMapFilename
    #sourceMapRootpath
    #outputSourceFiles
    #outputFilename
    #sourceMapGeneratorConstructor
    #lineNumber = 0
    #column = 0
    #sourceMapBasepath

    constructor (options) {
      this.#rootNode = options.rootNode
      this.#contentsMap = options.contentsMap
      this.#contentsIgnoredCharsMap = options.contentsIgnoredCharsMap

      if (options.sourceMapFilename) {
        this.#sourceMapFilename = options.sourceMapFilename.replace(/\\/g, '/')
      }

      this.#outputFilename = options.outputFilename
      this.sourceMapURL = options.sourceMapURL
      if (options.sourceMapBasepath) {
        this.#sourceMapBasepath = options.sourceMapBasepath.replace(/\\/g, '/')
      }
      if (options.sourceMapRootpath) {
        this.#sourceMapRootpath = options.sourceMapRootpath.replace(/\\/g, '/')
        if (this.#sourceMapRootpath.charAt(this.#sourceMapRootpath.length - 1) !== '/') {
          this.#sourceMapRootpath += '/'
        }
      } else {
        this.#sourceMapRootpath = ''
      }
      this.#outputSourceFiles = options.outputSourceFiles
      this.#sourceMapGeneratorConstructor = environment.getSourceMapGenerator()

      this.#lineNumber = 0
      this.#column = 0
    }

    removeBasepath (path) {
      if (this.#sourceMapBasepath && path.indexOf(this.#sourceMapBasepath) === 0) {
        path = path.substring(this.#sourceMapBasepath.length)
        if (path.charAt(0) === '\\' || path.charAt(0) === '/') {
          path = path.substring(1)
        }
      }

      return path
    }

    normalizeFilename (filename) {
      filename = filename.replace(/\\/g, '/')
      filename = this.removeBasepath(filename)
      return (this.#sourceMapRootpath || '') + filename
    }

    add (chunk, fileInfo, index, mapLines) {
      // ignore adding empty strings
      if (!chunk) {
        return
      }

      let lines, sourceLines, columns, sourceColumns, i

      if (fileInfo && fileInfo.filename) {
        let inputSource = this.#contentsMap[fileInfo.filename]

        // remove vars/banner added to the top of the file
        if (this.#contentsIgnoredCharsMap[fileInfo.filename]) {
          // adjust the index
          index -= this.#contentsIgnoredCharsMap[fileInfo.filename]
          if (index < 0) { index = 0 }
          // adjust the source
          inputSource = inputSource.slice(this.#contentsIgnoredCharsMap[fileInfo.filename])
        }

        /**
                 * ignore empty content, or failsafe
                 * if contents map is incorrect
                 */
        if (inputSource === undefined) {
          this.#css.push(chunk)
          return
        }

        inputSource = inputSource.substring(0, index)
        sourceLines = inputSource.split('\n')
        sourceColumns = sourceLines[sourceLines.length - 1]
      }

      lines = chunk.split('\n')
      columns = lines[lines.length - 1]

      if (fileInfo && fileInfo.filename) {
        if (!mapLines) {
          this._sourceMapGenerator.addMapping({
            generated: { line: this.#lineNumber + 1, column: this.#column },
            original: { line: sourceLines.length, column: sourceColumns.length },
            source: this.normalizeFilename(fileInfo.filename)
          })
        } else {
          for (i = 0; i < lines.length; i++) {
            this._sourceMapGenerator.addMapping({
              generated: { line: this.#lineNumber + i + 1, column: i === 0 ? this.#column : 0 },
              original: { line: sourceLines.length + i, column: i === 0 ? sourceColumns.length : 0 },
              source: this.normalizeFilename(fileInfo.filename)
            })
          }
        }
      }

      if (lines.length === 1) {
        this.#column += columns.length
      } else {
        this.#lineNumber += lines.length - 1
        this.#column = columns.length
      }

      this.#css.push(chunk)
    }

    isEmpty () {
      return this.#css.length === 0
    }

    toCSS (context) {
      this._sourceMapGenerator = new this.#sourceMapGeneratorConstructor({ file: this.#outputFilename, sourceRoot: null })

      if (this.#outputSourceFiles) {
        for (const filename in this.#contentsMap) {
          if (this.#contentsMap.hasOwnProperty(filename)) {
            let source = this.#contentsMap[filename]
            if (this.#contentsIgnoredCharsMap[filename]) {
              source = source.slice(this.#contentsIgnoredCharsMap[filename])
            }
            this._sourceMapGenerator.setSourceContent(this.normalizeFilename(filename), source)
          }
        }
      }

      this.#rootNode.genCSS(context, this)

      if (this.#css.length > 0) {
        let sourceMapURL
        const sourceMapContent = JSON.stringify(this._sourceMapGenerator.toJSON())

        if (this.sourceMapURL) {
          sourceMapURL = this.sourceMapURL
        } else if (this.#sourceMapFilename) {
          sourceMapURL = this.#sourceMapFilename
        }
        this.sourceMapURL = sourceMapURL

        this.sourceMap = sourceMapContent
      }

      return this.#css.join('')
    }
  }

  return SourceMapOutput
};
