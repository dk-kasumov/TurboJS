type TurboProps = Record<string, any>;

type TurboChild = Node | string | number | boolean | null | undefined;
type TurboChildren = TurboChild | TurboChildren[];

type TurboEventHandler<E extends Event> = (event: E) => void;

interface TurboDOMAttributes {
  onClick?: TurboEventHandler<MouseEvent>;
  onDblClick?: TurboEventHandler<MouseEvent>;
  onMouseDown?: TurboEventHandler<MouseEvent>;
  onMouseUp?: TurboEventHandler<MouseEvent>;
  onMouseEnter?: TurboEventHandler<MouseEvent>;
  onMouseLeave?: TurboEventHandler<MouseEvent>;
  onMouseMove?: TurboEventHandler<MouseEvent>;
  onMouseOver?: TurboEventHandler<MouseEvent>;
  onMouseOut?: TurboEventHandler<MouseEvent>;
  onContextMenu?: TurboEventHandler<MouseEvent>;
  onKeyDown?: TurboEventHandler<KeyboardEvent>;
  onKeyUp?: TurboEventHandler<KeyboardEvent>;
  onKeyPress?: TurboEventHandler<KeyboardEvent>;
  onInput?: TurboEventHandler<InputEvent>;
  onChange?: TurboEventHandler<Event>;
  onSubmit?: TurboEventHandler<SubmitEvent>;
  onReset?: TurboEventHandler<Event>;
  onFocus?: TurboEventHandler<FocusEvent>;
  onBlur?: TurboEventHandler<FocusEvent>;
  onScroll?: TurboEventHandler<Event>;
  onWheel?: TurboEventHandler<WheelEvent>;
}

interface TurboAriaAttributes {
  role?: string;
  [aria: `aria-${string}`]: string | number | boolean | undefined;
}

interface TurboHTMLAttributes extends TurboDOMAttributes, TurboAriaAttributes {
  id?: string;
  class?: string;
  style?: string;
  title?: string;
  hidden?: boolean;
  tabindex?: number;
  lang?: string;
  dir?: string;
  draggable?: boolean;
  slot?: string;
  children?: TurboChildren;
  [data: `data-${string}`]: string | number | boolean | undefined;
}

interface TurboAnchorAttributes extends TurboHTMLAttributes {
  href?: string;
  target?: string;
  rel?: string;
  download?: string | boolean;
}

interface TurboButtonAttributes extends TurboHTMLAttributes {
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  name?: string;
  value?: string | number;
  form?: string;
}

interface TurboInputAttributes extends TurboHTMLAttributes {
  type?: string;
  value?: string | number;
  checked?: boolean;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  readonly?: boolean;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}

interface TurboLabelAttributes extends TurboHTMLAttributes {
  for?: string;
}

interface TurboFormAttributes extends TurboHTMLAttributes {
  action?: string;
  method?: string;
  name?: string;
  novalidate?: boolean;
}

interface TurboImgAttributes extends TurboHTMLAttributes {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  loading?: "eager" | "lazy";
}

interface TurboOptionAttributes extends TurboHTMLAttributes {
  value?: string | number;
  selected?: boolean;
  disabled?: boolean;
}

interface TurboSelectAttributes extends TurboHTMLAttributes {
  value?: string | number;
  name?: string;
  disabled?: boolean;
  multiple?: boolean;
}

interface TurboTextareaAttributes extends TurboHTMLAttributes {
  value?: string | number;
  placeholder?: string;
  name?: string;
  rows?: number;
  cols?: number;
  disabled?: boolean;
  readonly?: boolean;
}

declare namespace JSX {
  type Element = Node;

  interface ElementChildrenAttribute {
    children: {};
  }

  interface IntrinsicAttributes {}

  interface IntrinsicElements {
    a: TurboAnchorAttributes;
    button: TurboButtonAttributes;
    input: TurboInputAttributes;
    label: TurboLabelAttributes;
    form: TurboFormAttributes;
    img: TurboImgAttributes;
    option: TurboOptionAttributes;
    select: TurboSelectAttributes;
    textarea: TurboTextareaAttributes;

    [tag: string]: TurboHTMLAttributes;
  }
}
