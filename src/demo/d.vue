<template lang="pug">
div
  input(v-model="a")
  h3 pug-h3
    span {{ a }}
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
$abc: #008877;
h3 {
  color: $abc;
}
</style>
