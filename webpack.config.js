const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        "index": path.join(__dirname, 'index.js')
    },
    output: {
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.less$/,
                use: ['vue-style-loader', 'css-loader', 'less-loader']
            },
            {
                test: /\.css$/,
                use: ['vue-style-loader', 'css-loader']
            },
            {
                test: /\.vue$/,
                loader: 'vue-loader'
            },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/
            }
        ]
    },
    plugins: [
        new VueLoaderPlugin(),
        new CopyPlugin([
            {
                from: "./index.html",
                to: "index.html"
            }
        ])
    ],
    resolve: {
        extensions: ['.js', '.vue'],
    },
    mode: "production",
}
