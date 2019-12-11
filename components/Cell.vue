<template>
    <div class="cell">
        <canvas class="top-left">

        </canvas>
        <canvas class="top-right">

        </canvas>
        <canvas class="bottom-left">

        </canvas>
        <canvas class="bottom-right">

        </canvas>
    </div>
</template>

<script>
    export default {
        name: "Cell",
        propsData: {

        },
    }
</script>

<style lang="less" scoped>
    .cell {
        display: grid;

        .top-left {
            grid-column: 1;
            grid-row: 1;
        }
        .top-right {
            grid-column: 2;
            grid-row: 1;
        }
        .bottom-right {
            grid-column: 2;
            grid-row: 2;
        }
        .bottom-left {
            grid-column: 1;
            grid-row: 2;
        }
    }
</style>
