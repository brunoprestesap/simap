import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettierConfig from "eslint-config-prettier/flat";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "lib/generated/prisma/**",
    ],
  },
  ...nextCoreWebVitals,
  prettierConfig,
];

export default config;
