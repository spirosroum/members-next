import base from '../../tailwind.config.js';

export default {
  ...base,
  content: [
    './index.html',
    './src/**/*.{vue,ts}',
    '../../packages/shared-ui/**/*.{vue,ts}'
  ]
};
