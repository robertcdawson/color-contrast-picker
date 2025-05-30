const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    main: './src/main.js',
    contentScript: './src/contentScript.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      title: 'Color Contrast Picker',
      favicon: './img/favicon.svg',
      chunks: ['main'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'app.css', to: 'app.css' },
        { 
          from: 'manifest.json', 
          to: 'manifest.json',
          transform(content) {
            const manifest = JSON.parse(content.toString());
            // Update paths for dist directory
            manifest.action.default_popup = 'index.html';
            manifest.content_scripts[0].js = ['contentScript.js'];
            manifest.web_accessible_resources[0].resources = ['*'];
            return JSON.stringify(manifest, null, 2);
          }
        },
        { from: 'background.js', to: 'background.js' },
        { from: 'img/icon16.png', to: 'img/icon16.png' },
        { from: 'img/icon48.png', to: 'img/icon48.png' },
        { from: 'img/icon128.png', to: 'img/icon128.png' }
      ]
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  devtool: 'source-map'
};