#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const nodeVersion = process.versions.node.split('.')
let lessThan8 = false
if (Number(nodeVersion[0]) < 8) {
  lessThan8 = true
} else if (Number(nodeVersion[0]) === 8 && Number(nodeVersion[1]) < 5) {
  lessThan8 = true
}
if (lessThan8) {
  console.log(`Required Node Version 8.5.0+`.red)
  process.exit(0)
}

const argv = process.argv
let showHelp = true

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === 'start' || argv[i] === 'build') {
    showHelp = false
    require('../src/pr1.js')
    break
  } else if (argv[i] === 'init') {
    showHelp = false
    fs.copyFileSync(path.resolve(__dirname, '../src/pr1.config.template.js'), path.resolve(process.cwd(), 'pr1.config.js'))
    console.log(`Initialization complete! `.green)
    break
  }
}

if (showHelp) {
  require('colors')

  console.log(`
  ============== pr1 (Piao Ren) --version ${require('../package.json').version} ===============
  pr1, which front-end engineering build tools for Vue project,
                  and packaged using Rollup.
  =============================================================
  `.green)

  console.log(`pr1 init`.cyan)
  console.log(`
  Example:
  pr1 init
  `.grey)

  console.log(`pr1 start [port] [config]`.cyan)
  console.log(`
  Example:
  pr1 start
  pr1 start 8686
  pr1 start --config="./config.js"
  `.grey)

  console.log(`pr1 build [entry] [config] [output]`.cyan)
  console.log(`
  Example:
  pr1 build index.html
  pr1 build index.html --config="./config.js"
  pr1 build index.html detail.html tools.js
  pr1 build index.html detail.html tools.js --config="./config.js"
  `.grey)
}
