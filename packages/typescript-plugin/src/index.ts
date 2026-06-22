import { createLanguageServicePlugin } from "@volar/typescript/lib/quickstart/createLanguageServicePlugin";
import { createTurboLanguagePlugin } from "@turbo/language-tools";

const plugin = createLanguageServicePlugin((ts) => ({
  languagePlugins: [createTurboLanguagePlugin<string>(ts)],
}));

export = plugin;
