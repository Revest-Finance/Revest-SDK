const { NODE_ENV } = process.env;

module.exports = {
  presets: [
    [
      '@babel/preset-env',

      {
        modules: NODE_ENV === 'test' ? 'auto' : false,
        "useBuiltIns": "usage",
        "corejs": 3, // or 2,
        "targets": {
          "browsers": ["last 2 Chrome versions"]
        },
      },
    ],
  ],
  plugins: [
    '@babel/plugin-proposal-object-rest-spread',
    "transform-async-to-generator",
    '@babel/plugin-proposal-class-properties',
  ]
};
