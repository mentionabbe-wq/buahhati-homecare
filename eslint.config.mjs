import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/** Flat config untuk ESLint 9 + Next.js 16. */
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'public/**'] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Pola "ambil data saat dependensi berubah + tampilkan skeleton" memang
      // menyetel state di dalam effect. Tetap dilaporkan sebagai peringatan
      // agar terlihat, tetapi tidak menggagalkan lint.
      'react-hooks/set-state-in-effect': 'warn',
      // Font dimuat lewat <link> agar build tidak bergantung pada akses jaringan.
      '@next/next/no-page-custom-font': 'off',
    },
  },
];

export default config;
