(function () {
    'use strict';

    const REACTIVE_INTERNAL = Symbol('REACTIVE_INTERNAL');
    /**
     * Creates a reactive state object.
     * @template T The type of the state value.
     * @param {T} value - The initial value of the state.
     * @param {Object} [options] - Optional settings for the state.
     * @param {boolean} [options.skipMemo=false] - Whether to skip memoization checks when setting a new value.
     * @returns {ReactiveState<T>} A reactive state object.
     *
     * @example <caption>Basic Usage</caption>
     * const name = $state('Davyd');
     *
     * $effect(() => {
     *   console.log(name()); // Logs: "Davyd"
     * }, [name]);
     *
     * name.set('Alex'); // Updates the state and triggers the effect
     *
     * @example <caption>Using with Objects</caption>
     * const user = $state({ name: 'Davyd', age: 20 });
     *
     * $effect(() => {
     *   console.log(user().name); // Logs: "Davyd"
     * }, [user]);
     *
     * user.set({ name: 'Alex', age: 21 }); // Updates the state and triggers the effect
     */ const $state = (value, options = {
        skipMemo: false
    })=>{
        const callable = ()=>callable.value;
        callable.value = value;
        callable.consumers = [];
        callable.type = REACTIVE_INTERNAL;
        callable.set = (newValue)=>{
            if (!options.skipMemo && callable.value === newValue) {
                return;
            }
            callable.value = newValue;
            callable.consumers.forEach((fn)=>fn());
        };
        return callable;
    };

    /**
     * Creates a computed reactive state that automatically updates when its dependencies change.
     * @template T The type of the computed value.
     * @param {ComputedFunction<T>} fn - The function used to compute the value.
     * @param {ReactiveComputed<unknown>[]} dependencies - The reactive states this computed value depends on.
     * @returns {ReactiveComputed<T>} A callable reactive state representing the computed value.
     *
     * @example <caption>Basic Usage</caption>
     * const firstName = $state('Davyd');
     * const lastName = $state('Kasumov');
     *
     * const fullName = $computed(
     *   () => `${firstName()} ${lastName()}`,
     *   [firstName, lastName]
     * );
     *
     * console.log(fullName()); // Logs: "Davyd Kasumov"
     *
     * firstName.set('Alex'); // Updates firstName and triggers fullName re-computation.
     *
     * console.log(fullName()); // Logs: "Alex Kasumov"
     */ const $computed = (fn, dependencies)=>{
        const callable = ()=>callable.value;
        callable.value = fn();
        callable.type = REACTIVE_INTERNAL;
        const recalculate = ()=>callable.value = fn();
        dependencies.forEach((ref)=>ref.type === REACTIVE_INTERNAL && ref.consumers.push(recalculate));
        return callable;
    };

    /**
     * Creates a reactive effect that runs a function whenever one of its dependencies changes.
     * @param {EffectFunction} fn - The effect function to execute.
     * @param {ReactiveState<unknown>[]} dependencies - The reactive states this effect depends on.
     *
     * @example <caption>Basic Usage</caption>
     * const count = $state(0);
     *
     * $effect(() => {
     *   console.log(`Count is: ${count()}`); // Initial call | Logs: "Count is: 0"
     * }, [count]);
     *
     * count.set(1); // Logs: "Count is: 1"
     * count.set(2); // Logs: "Count is: 2"
     */ const $effect = (fn, dependencies)=>{
        fn();
        dependencies.forEach((ref)=>ref.type === REACTIVE_INTERNAL && ref.consumers.push(fn));
    };

    var $computed_1 = $computed;
    var $effect_1 = $effect;
    var $state_1 = $state;

    /**
     * ###### INTERNAL
     * Creates a change detector for reactive nodes.
     *
     * @returns {ChangeDetector} The change detector object.
     *
     * @example
     * const name = $state('Davyd')
     * const cd = $changeDetector();
     *
     * const node = {
     *   type: 'mustache',
     *   var: document.querySelector('.text'),
     *   stateRef: name,
     *   state: name(),
     * };
     *
     * changeDetector.add(node);
     *
     * // Somewhere in the app:
     * state.set('new value');
     *
     * changeDetector.check(); // Automatically updates nodes with the new value.
     */ const $changeDetector = ()=>{
        return {
            nodes: [],
            add (node) {
                this.nodes.push(node);
            },
            async update (node, value) {
                if (node.type === 'mustache') {
                    node.var.textContent = node.stateRef();
                    node.state = value;
                }
            },
            check () {
                for (const node of this.nodes){
                    const value = node.stateRef();
                    if (node.state !== value) {
                        void this.update(node, value);
                    }
                }
            }
        };
    };

    var $changeDetector_1 = $changeDetector;

    function CreateComponent$1({ target, _props = {} }) {
    const $that = CreateComponent$1;
    $that.$changeDetector = $changeDetector_1();
            const $props = () => _props;
            
            
                
        const {username, fullname, setter} = $props();
    $effect_1(() => {
    $that.$changeDetector.check();
    }, [username,fullname,setter]);
        
                $that?.$onInit?.();
        target.appendChild(document.createTextNode("\n\n"));
    const _div = document.createElement('div');
    const _header = document.createElement('header');
    _header.appendChild(document.createTextNode("Header! "));
    const _mustache = document.createTextNode(username());
    $that.$changeDetector.add({ type: 'mustache', var: _mustache, state: username(), stateRef: username });
    _header.appendChild(_mustache);
    _header.appendChild(document.createTextNode(" "));
    const _mustache1 = document.createTextNode(fullname);
    $that.$changeDetector.add({ type: 'mustache', var: _mustache1, state: fullname, stateRef: () => fullname });
    _header.appendChild(_mustache1);
    _div.appendChild(_header);
    _div.appendChild(document.createTextNode("\n\n    "));
    const _button = document.createElement('button');
    _button.addEventListener("click", () => {
       setter('Alex1');
    });
    _button.appendChild(document.createTextNode("change name"));
    _div.appendChild(_button);
    target.appendChild(_div);
    target.appendChild(document.createTextNode("\n"));
            $that?.$afterContentInit?.();
            return {}
    }

    function CreateComponent({ target, _props = {} }) {
    const $that = CreateComponent;
    $that.$changeDetector = $changeDetector_1();
            const $afterContentInit = function(fn) {
    $that.$afterContentInit = fn;
    };
            
    const head = document.head || document.getElementsByTagName('head')[0];
    const _styleTag = document.createElement('style');
    _styleTag.textContent = "\n    h1 {\n        color: red;\n    }\n";
    head.appendChild(_styleTag);
         
        
        

        const username = $state_1('Davyd');
    const lastname = $state_1('Kasumov');
    const fullname = $computed_1(() => {
    return username() + " " + lastname()
    }, [username, lastname]);
    const output = (newName) => {
    username.set('Davyd');
    };
    $afterContentInit(() => {
    console.log('content init!!');
    });
    $effect_1(() => {
    $that.$changeDetector.check();
    }, [username,lastname]);
        
                $that?.$onInit?.();
        target.appendChild(document.createTextNode("\n\n"));
    const _div = document.createElement('div');
    const _div1 = document.createElement('div');
    _div1.appendChild(document.createTextNode("hello!"));
    _div.appendChild(_div1);
    _div.appendChild(document.createTextNode("\n\n    "));
    const _h1 = document.createElement('h1');
    _h1.appendChild(document.createTextNode("Hello!"));
    _div.appendChild(_h1);
    _div.appendChild(document.createTextNode("\n    "));
    const _div2 = document.createElement('div');
    _div2.appendChild(document.createTextNode("My name: "));
    const _mustache = document.createTextNode(username());
    $that.$changeDetector.add({ type: 'mustache', var: _mustache, state: username(), stateRef: username });
    _div2.appendChild(_mustache);
    _div.appendChild(_div2);
    _div.appendChild(document.createTextNode("\n    "));
    const _div3 = document.createElement('div');
    _div3.appendChild(document.createTextNode("My name: "));
    const _mustache1 = document.createTextNode(lastname());
    $that.$changeDetector.add({ type: 'mustache', var: _mustache1, state: lastname(), stateRef: lastname });
    _div3.appendChild(_mustache1);
    _div.appendChild(_div3);
    _div.appendChild(document.createTextNode("\n    "));
    const _div4 = document.createElement('div');
    _div4.appendChild(document.createTextNode("My name: "));
    const _mustache2 = document.createTextNode(fullname());
    $that.$changeDetector.add({ type: 'mustache', var: _mustache2, state: fullname(), stateRef: fullname });
    _div4.appendChild(_mustache2);
    _div.appendChild(_div4);
    _div.appendChild(document.createTextNode("\n\n    "));
    const _button = document.createElement('button');
    _button.addEventListener("click", () => {
       username.set('Misha');
    });
    const _mustache3 = document.createTextNode(username() === 'Davyd' ? 'Hello Davyd' : 'Hello Alex!');
    $that.$changeDetector.add({ type: 'mustache', var: _mustache3, state: username() === 'Davyd' ? 'Hello Davyd' : 'Hello Alex!', stateRef: () => username() === 'Davyd' ? 'Hello Davyd' : 'Hello Alex!' });
    _button.appendChild(_mustache3);
    _div.appendChild(_button);
    _div.appendChild(document.createTextNode("\n\n    "));
    const $$Header = CreateComponent$1({target: _div, _props: { username: username, fullname: 'Kasumov', setter: output } });
    console.log($$Header);
    target.appendChild(_div);
    target.appendChild(document.createTextNode("\n\n"));
    target.appendChild(document.createTextNode("\n"));
            $that?.$afterContentInit?.();
            return {}
    }

        
            
            
    window.addEventListener("load", () => {
    const _$app = document.querySelector('div#app');
    new CreateComponent({target: _$app});
    });

})();
