import * as c from './c.js'

console.log(c)

export var b = 'c'
export default process.env.NODE_ENV === 'development' ? 'xxx' : 'zzz'
export function o (a) {
  console.log(a)
}
