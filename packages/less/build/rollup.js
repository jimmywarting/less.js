const path = require('path')
const rollup = require('rollup')
const typescript = require('rollup-plugin-typescript2')
const commonjs = require('@rollup/plugin-commonjs')
const json = require('@rollup/plugin-json')
const resolve = require('@rollup/plugin-node-resolve').nodeResolve
const terser = require('rollup-plugin-terser').terser

const rootPath = path.join(__dirname, '..')

const args = require('minimist')(process.argv.slice(2))
const outDir = args.dist ? './dist' : './tmp'

async function buildBrowser () {
  const bundle = await rollup.rollup({
    input: './src/less-browser/bootstrap.js',
    output: [
      {
        file: 'less.js',
        format: 'umd'
      },
      {
        file: 'less.min.js',
        format: 'umd'
      }
    ],
    plugins: [
      resolve(),
      commonjs(),
      json(),
      typescript({
        verbosity: 2,
        tsconfigDefaults: {
          compilerOptions: {
            allowJs: true,
            sourceMap: true,
            target: 'ES5'
          }
        },
        include: ['*.ts', '**/*.ts', '*.js', '**/*.js'],
        exclude: ['node_modules'] // only transpile our source code
      }),
      terser({
        compress: true,
        include: [/^.+\.min\.js$/],
        output: {
          comments: () => false
        }
      })
    ]
  })

  if (!args.out || args.out.indexOf('less.js') > -1) {
    const file = args.out || `${outDir}/less.js`
    console.log(`Writing ${file}...`)
    await bundle.write({
      file: path.join(rootPath, file),
      format: 'umd',
      name: 'less'
    })
  }

  if (!args.out || args.out.indexOf('less.min.js') > -1) {
    const file = args.out || `${outDir}/less.min.js`
    console.log(`Writing ${file}...`)
    await bundle.write({
      file: path.join(rootPath, file),
      format: 'umd',
      name: 'less',
      sourcemap: true
    })
  }
}

async function build () {
  await buildBrowser()
}

build()
