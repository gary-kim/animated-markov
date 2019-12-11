<template>
    <table>
        <tr v-for="row in matrix" :key="row">
            <th v-for="el in row">
                {{ el.value }}
            </th>
        </tr>
    </table>
</template>

<script>
    export default {
        name: "MatrixDisplay",
        props: {
            matrix: {
                type: Array,
                required: true,
            }
        }
    }
</script>

<style lang="less" scoped>

</style>
