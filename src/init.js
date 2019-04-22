
const fs = require('fs-extra')
const path = require('path')
const readline = require('readline')
require('colors')

const cwd = process.cwd()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

let status = 0
const obj = [{
  question: `?`.green + 'Project name:',
  answer: ''
}, {
  question: `?`.green + 'Project description:',
  answer: ''
}]

function readAnswer (i) {
  rl.setPrompt(obj[i].question)
  rl.prompt()
}

rl.on('line', (line) => {
  obj[status].answer = line.trim()
  ++status
  if (obj[status]) {
    readAnswer(status)
  } else {
    console.log(obj)
    process.exit(0)
  }
})

readAnswer(0)
// rl.question(`Project name:`, (answer) => {
//   projectName = answer
//   rl.prompt()
// })

// console.log(projectName)

// process.exit(0)
if (false) {

// pr1.config.js
fs.copySync(path.resolve(__dirname, '../template/pr1.config.template.js'), path.resolve(cwd, 'pr1.config.js'))

// package.json
fs.copySync(path.resolve(__dirname, '../template/package.template.json'), path.resolve(cwd, 'package.json'))

// .eslintrc.js
fs.copySync(path.resolve(__dirname, '../template/.eslintrc.template.js'), path.resolve(cwd, '.eslintrc.js'))

// .gitignore.js
fs.copySync(path.resolve(__dirname, '../template/.template.gitignore'), path.resolve(cwd, '.gitignore'))

// index.html and main.js
const src = path.resolve(cwd, './src/')
fs.ensureDirSync(src)
fs.copySync(path.resolve(__dirname, '../template/index.template.html'), path.resolve(src, 'index.html'))
fs.copySync(path.resolve(__dirname, '../template/main.template.js'), path.resolve(src, 'main.js'))

console.log(`
PR1 initialization complete!


`.green)

}
