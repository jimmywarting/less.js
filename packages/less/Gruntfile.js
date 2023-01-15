'use strict'

const resolve = require('resolve')
const path = require('path')

const testFolder = path.relative(process.cwd(), path.dirname(resolve.sync('@less/test-data')))
const lessFolder = path.join(testFolder, 'less')

module.exports = function (grunt) {
  grunt.option('stack', true)

  // Report the elapsed execution time of tasks.
  require('time-grunt')(grunt)

  const git = require('git-rev')

  // Sauce Labs browser
  const browsers = [
    // Desktop browsers
    {
      browserName: 'chrome',
      version: 'latest',
      platform: 'Windows 7'
    },
    {
      browserName: 'firefox',
      version: 'latest',
      platform: 'Linux'
    },
    {
      browserName: 'safari',
      version: 'latest',
      platform: 'OS X 10.11'
    },
    {
      browserName: 'edge',
      version: 'latest',
      platform: 'Windows 10'
    }
  ]

  const sauceJobs = {}

  const browserTests = [
    'filemanager-plugin',
    'visitor-plugin',
    'global-vars',
    'modify-vars',
    'production',
    'rootpath-relative',
    'rootpath-rewrite-urls',
    'rootpath',
    'relative-urls',
    'rewrite-urls',
    'browser',
    'no-js-errors',
    'legacy'
  ]

  const path = require('path')

  // Handle async / await in Rollup build for tests
  const tsNodeRuntime = path.resolve(path.join('node_modules', '.bin', 'ts-node'))
  const crossEnv = path.resolve(path.join('node_modules', '.bin', 'cross-env'))

  // Project configuration.
  grunt.initConfig({
    shell: {
      options: {
        stdout: true,
        failOnError: true,
        execOptions: {
          maxBuffer: Infinity
        }
      },
      build: {
        command: [
          /** Browser runtime */
          'node build/rollup.js --dist',
          /** Copy to repo root */
          'npm run copy:root',
          /** Node.js runtime */
          'npm run build'
        ].join(' && ')
      },
      testbuild: {
        command: [
          'npm run build',
          'node build/rollup.js --browser --out=./tmp/browser/less.min.js'
        ].join(' && ')
      },
      testcjs: {
        command: 'npm run build'
      },
      testbrowser: {
        command: 'node build/rollup.js --browser --out=./tmp/browser/less.min.js'
      },
      test: {
        command: [
          // https://github.com/TypeStrong/ts-node/issues/693#issuecomment-848907036
          crossEnv + ' TS_NODE_SCOPE=true',
          tsNodeRuntime + ' test/test-es6.ts',
          'node test/index.js'
        ].join(' && ')
      },
      generatebrowser: {
        command: 'node test/browser/generator/generate.js'
      },
      runbrowser: {
        command: 'node test/browser/generator/runner.js'
      },
      benchmark: {
        command: 'node benchmark/index.js'
      },
      opts: {
        // test running with all current options (using `opts` since `options` means something already)
        command: [
                    // @TODO: make this more thorough
                    // CURRENT OPTIONS
                    `node bin/lessc --ie-compat ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,
                    // --math
                    `node bin/lessc --math=always ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,
                    `node bin/lessc --math=parens-division ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,
                    `node bin/lessc --math=parens ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,
                    `node bin/lessc --math=strict ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,
                    `node bin/lessc --math=strict-legacy ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,

                    // DEPRECATED OPTIONS
                    // --strict-math
                    `node bin/lessc --strict-math=on ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`
        ].join(' && ')
      },
      plugin: {
        command: [
                    `node bin/lessc --clean-css="--s1 --advanced" ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,
                    'cd lib',
                    `node ../bin/lessc --clean-css="--s1 --advanced" ../${lessFolder}/_main/lazy-eval.less ../tmp/lazy-eval.css`,
                    `node ../bin/lessc --source-map=lazy-eval.css.map --autoprefix ../${lessFolder}/_main/lazy-eval.less ../tmp/lazy-eval.css`,
                    'cd ..',
                    // Test multiple plugins
                    `node bin/lessc --plugin=clean-css="--s1 --advanced" --plugin=autoprefix="ie 11,Edge >= 13,Chrome >= 47,Firefox >= 45,iOS >= 9.2,Safari >= 9" ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`
        ].join(' && ')
      },
      'sourcemap-test': {
        // quoted value doesn't seem to get picked up by time-grunt, or isn't output, at least; maybe just "sourcemap" is fine?
        command: [
                    `node bin/lessc --source-map=test/sourcemaps/maps/import-map.map ${lessFolder}/_main/import.less test/sourcemaps/import.css`,
                    `node bin/lessc --source-map ${lessFolder}/sourcemaps/basic.less test/sourcemaps/basic.css`
        ].join(' && ')
      }
    },

    connect: {
      server: {
        options: {
          port: 8081
        }
      }
    },

    'saucelabs-mocha': sauceJobs,

    // Clean the version of less built for the tests
    clean: {
      test: ['test/browser/less.js', 'tmp', 'test/less-bom'],
      'sourcemap-test': [
        'test/sourcemaps/*.css',
        'test/sourcemaps/*.map'
      ],
      sauce_log: ['sc_*.log']
    }
  })

  // Load these plugins to provide the necessary tasks
  grunt.loadNpmTasks('grunt-saucelabs')

  require('jit-grunt')(grunt)

  // by default, run tests
  grunt.registerTask('default', ['test'])

  // Release
  grunt.registerTask('dist', [
    'shell:build'
  ])

  // Create the browser version of less.js
  grunt.registerTask('browsertest-lessjs', [
    'shell:testbrowser'
  ])

  // Run all browser tests
  grunt.registerTask('browsertest', [
    'browsertest-lessjs',
    'connect',
    'shell:runbrowser'
  ])

  // setup a web server to run the browser tests in a browser rather than phantom
  grunt.registerTask('browsertest-server', [
    'browsertest-lessjs',
    'shell:generatebrowser',
    'connect::keepalive'
  ])

  const previous_force_state = grunt.option('force')

  grunt.registerTask('force', function (set) {
    if (set === 'on') {
      grunt.option('force', true)
    } else if (set === 'off') {
      grunt.option('force', false)
    } else if (set === 'restore') {
      grunt.option('force', previous_force_state)
    }
  })

  grunt.registerTask('sauce', [
    'browsertest-lessjs',
    'shell:generatebrowser',
    'connect',
    'sauce-after-setup'
  ])

  grunt.registerTask('sauce-after-setup', [
    'saucelabs-mocha:all',
    'clean:sauce_log'
  ])

  const testTasks = [
    'clean',
    'shell:testbuild',
    'shell:test',
    'shell:opts',
    'shell:plugin',
    'connect',
    'shell:runbrowser'
  ]

  if (
    isNaN(Number(process.env.TRAVIS_PULL_REQUEST, 10)) &&
        (process.env.TRAVIS_BRANCH === 'master')
  ) {
    testTasks.push('force:on')
    testTasks.push('sauce-after-setup')
    testTasks.push('force:off')
  }

  // Run all tests
  grunt.registerTask('test', testTasks)

  // Run shell option tests (includes deprecated options)
  grunt.registerTask('shell-options', ['shell:opts'])

  // Run shell plugin test
  grunt.registerTask('shell-plugin', ['shell:plugin'])

  // Quickly build and run Node tests
  grunt.registerTask('quicktest', [
    'shell:testcjs',
    'shell:test'
  ])

  // generate a good test environment for testing sourcemaps
  grunt.registerTask('sourcemap-test', [
    'clean:sourcemap-test',
    'shell:build:lessc',
    'shell:sourcemap-test',
    'connect::keepalive'
  ])

  // Run benchmark
  grunt.registerTask('benchmark', [
    'shell:testcjs',
    'shell:benchmark'
  ])
}
