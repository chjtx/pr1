<template lang="pug">
div
  input(v-model="a")
  h3 pug-h323
    span {{ a }} 湎顶替333w
</template>

<script>
import Vue from 'vue/dist/vue.esm.browser.js'
export default Vue.extend({
  data () {
    return {
      a: ''
    }
  }
})
</script>


<style lang="sass" scoped>
$abc: #ff00ff;
h3 {
  color: $abc;
}
h3::after {
  content: 'h3::after';
}
</style>
