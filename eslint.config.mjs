// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import UnusedImportsPlugin from "eslint-plugin-unused-imports";
import PrettierConfig from "eslint-config-prettier";

export default tseslint.config(
	{
		ignores: ["node_modules/", "main.js", "eslint.config.mjs", "version-bump.mjs"],
	},
	eslint.configs.recommended,
	tseslint.configs.eslintRecommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			"unused-imports": UnusedImportsPlugin,
		},
		rules: {
			"@typescript-eslint/restrict-template-expressions": "warn",
			"@typescript-eslint/no-unsafe-assignment": "warn",
			"@typescript-eslint/no-unsafe-argument": "warn",
			"@typescript-eslint/no-unsafe-member-access": "warn",
			"@typescript-eslint/no-redundant-type-constituents": "warn",
			"@typescript-eslint/unbound-method": "warn",
			"@typescript-eslint/no-this-alias": "warn",
			"@typescript-eslint/no-empty-function": "warn",
			"@typescript-eslint/consistent-type-imports": "error",

			// replaced by 'unused-imports/no-unused-vars'
			"@typescript-eslint/no-unused-vars": "off",
			"unused-imports/no-unused-imports": "error",
			"unused-imports/no-unused-vars": [
				"warn",
				{
					vars: "all",
					varsIgnorePattern: "^_",
					args: "after-used",
					argsIgnorePattern: "^_",
				},
			],
		},
	},
	PrettierConfig,
);
