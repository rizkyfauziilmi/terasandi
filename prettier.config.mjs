/** @type {import("prettier").Config & import("prettier-plugin-tailwindcss").PluginOptions} */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],
  // Required by the plugin on Tailwind v4 to resolve theme and custom utilities.
  tailwindStylesheet: "./src/app/globals.css",
};

export default config;
