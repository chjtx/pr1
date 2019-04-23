
const fs = require('fs-extra')
const path = require('path')
const readline = require('readline')
require('colors')

const cwd = process.cwd()

console.log(`
Answer some question to initialize.
You can press `.cyan + ` ctrl + C `.bgMagenta + ` to exit.
`.cyan)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

let index = 0
const params = [{
  question: `? `.green + `Project name:`.cyan,
  answer: '',
  regular: /^[a-zA-Z][a-zA-Z0-9-_]+$/,
  warning: `Only a-z,A-Z,0-9,-,_`.red + `:`.cyan
}, {
  question: `? `.green + `Project description:`.cyan,
  answer: ''
}]

function readAnswer (i, warning = '') {
  rl.setPrompt(params[i].question + warning)
  rl.prompt()
}

rl.on('line', (line) => {
  const data = line.trim()
  if (!params[index].regular || params[index].regular.test(data)) {
    params[index].answer = data

    ++index
    if (params[index]) {
      readAnswer(index)
    } else {
      init()
    }
  } else {
    readAnswer(index, params[index].warning)
  }
})

readAnswer(0)

// process.exit(0)
function init () {
  const dirName = params[0].answer
  const description = params[1].answer
  const dirPath = path.resolve(cwd, dirName)
  fs.ensureDirSync(dirPath)

  // pr1.config.js
  fs.copySync(path.resolve(__dirname, '../template/pr1.config.template.js'), path.resolve(dirPath, 'pr1.config.js'))

  // package.json
  let pkg = fs.readFileSync(path.resolve(__dirname, '../template/package.template.json')).toString()
  const name = dirName.replace(/([a-z])([A-Z])/g, (a, b, c) => `${b}-${c.toLowerCase()}`).toLowerCase()
  pkg = pkg.replace('{{name}}', name).replace('{{description}}', description)
  fs.writeFileSync(path.resolve(dirPath, 'package.json'), pkg)

  // .eslintrc.js
  fs.copySync(path.resolve(__dirname, '../template/.eslintrc.template.js'), path.resolve(dirPath, '.eslintrc.js'))

  // .gitignore.js
  fs.copySync(path.resolve(__dirname, '../template/.template.gitignore'), path.resolve(dirPath, '.gitignore'))

  // index.html and main.js
  const src = path.resolve(dirPath, './src/')
  fs.ensureDirSync(src)
  fs.copySync(path.resolve(__dirname, '../template/index.template.html'), path.resolve(src, 'index.html'))
  fs.copySync(path.resolve(__dirname, '../template/main.template.js'), path.resolve(src, 'main.js'))

  console.log(`
PR1 initialization complete!\n`.green +
`
To get started

  cd ${dirName}
  npm install
  pr1 start
` +
`

If you found some bug, can commit issue https://github.com/chjtx/pr1/issues
`.cyan)

  process.exit(0)
}
