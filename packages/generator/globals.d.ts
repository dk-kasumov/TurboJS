declare module 'deindent' {
  function deindent(value: string): string;
  function deindent(strings: TemplateStringsArray, ...values: any[]): string;
  export = deindent;
}
