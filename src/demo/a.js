import b from './b.js'
import html from './a.html'
import pug from './e.pug'

const a = 1 + b

document.getElementById('app').innerHTML = html + pug

export default a
