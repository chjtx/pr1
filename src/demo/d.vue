<template lang="pug">
div
  input(v-model="a")
  h3 pug-h3
    span {{ a }} 湎顶替
</template>

<script>
export default {
  data () {
    return {
      a: ''
    }
  }
}
</script>


<style lang="sass" scoped>
$abc: #ff00ff;
h3 {
  color: $abc;
}
</style>
