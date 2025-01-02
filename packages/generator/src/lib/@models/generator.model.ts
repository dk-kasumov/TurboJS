export interface GeneratorComponentBinding {
  name: string;
  value: string;
}

export interface GeneratorStack {
  initCode: string[];
  components: string[];
  componentBindings: GeneratorComponentBinding[];
  importStatements: string[];
  componentScripts: string;
  target: string;
  isEntryPoint: boolean;
  stack: string[];
  render: string[];
  counter: (label: string) => string;
}
