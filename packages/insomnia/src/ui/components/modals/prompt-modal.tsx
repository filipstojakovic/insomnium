import classnames from 'classnames';
import React, { forwardRef, ReactNode, useImperativeHandle, useRef, useState } from 'react';

import { Modal, ModalHandle, ModalProps } from '../base/modal';
import { ModalBody } from '../base/modal-body';
import { ModalFooter } from '../base/modal-footer';
import { ModalHeader } from '../base/modal-header';
import { PromptButton } from '../base/prompt-button';
import { OneLineEditor, OneLineEditorHandle } from '../codemirror/one-line-editor';

interface State {
  title: string;
  hints?: string[];
  defaultValue?: string | null;
  submitName?: string | null;
  selectText?: boolean | null;
  upperCase?: boolean | null;
  validate?: ((arg0: string) => string) | null;
  hint?: string | null;
  label?: string | null;
  placeholder?: string | null;
  inputType?: string | null;
  onComplete?: (arg0: string, arg1?: string, arg2?: string) => Promise<void> | void;
  onHide?: () => void;
  onDeleteHint?: ((arg0?: string) => void) | null;
  loading: boolean;
  showHttpMethodPills?: boolean;
  selectedHttpMethod?: string;
  showUrlField?: boolean;
  urlLabel?: string;
  urlPlaceholder?: string;
  urlDefaultValue?: string;
  urlValue?: string;
}

export interface PromptModalOptions {
  title: string;
  defaultValue?: string;
  submitName?: string;
  selectText?: boolean;
  upperCase?: boolean;
  hint?: string;
  inputType?: string;
  placeholder?: string;
  validate?: (arg0: string) => string;
  label?: string;
  hints?: string[];
  onComplete?: (arg0: string, arg1?: string, arg2?: string) => Promise<void> | void;
  onHide?: () => void;
  onDeleteHint?: (arg0?: string) => void;
  showHttpMethodPills?: boolean;
  showUrlField?: boolean;
  urlLabel?: string;
  urlPlaceholder?: string;
  urlDefaultValue?: string;
  urlValue?: string;
  selectedHttpMethod?: string;
}

export interface PromptModalHandle {
  show: (options: PromptModalOptions) => void;
  hide: () => void;
}

export const PromptModal = forwardRef<PromptModalHandle, ModalProps>((_, ref) => {
  const modalRef = useRef<ModalHandle>(null);
  const inputRef = useRef<OneLineEditorHandle>(null);

  const [state, setState] = useState<State>({
    title: 'Not Set',
    hints: [],
    defaultValue: '',
    submitName: '',
    selectText: false,
    upperCase: false,
    validate: null,
    hint: '',
    label: '',
    placeholder: '',
    inputType: '',
    onComplete: undefined,
    onDeleteHint: undefined,
    onHide: undefined,
    loading: false,
    showHttpMethodPills: false,
    selectedHttpMethod: 'GET',
    showUrlField: false,
    urlLabel: '',
    urlPlaceholder: '',
    urlDefaultValue: '',
    urlValue: '',
  });

  const [inputValue, setInputValue] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    state.onComplete?.(
      state.upperCase ? inputValue?.toUpperCase() : inputValue,
      state.showHttpMethodPills ? state.selectedHttpMethod : undefined,
      state.urlValue
    );
    modalRef.current?.hide();
  };

  useImperativeHandle(ref, () => ({
    hide: () => {
      modalRef.current?.hide();
    },
    show: options => {
      setInputValue(options.defaultValue || '');
      setState({
        ...options,
        loading: false,
        selectedHttpMethod: options.selectedHttpMethod || 'GET',
        urlValue: options.urlDefaultValue || '',
      });
      modalRef.current?.show();
    },
  }), []);

  const {
    submitName,
    title,
    hint,
    inputType,
    placeholder,
    label,
    upperCase,
    hints,
    showHttpMethodPills,
    selectedHttpMethod,
    showUrlField,
    urlLabel,
    urlPlaceholder,
    urlDefaultValue,
  } = state;

  const onUrlChange = (value: string) => {
    setState(s => ({ ...s, urlValue: value }));

    if (!value) {
      return;
    }

    let extractedPath = '';

    // Handle environment variables like {{base}}/v1/users
    if (value.startsWith('{{')) {
      const closingBracesIndex = value.indexOf('}}');
      if (closingBracesIndex !== -1) {
        extractedPath = value.substring(closingBracesIndex + 2);
      }
    } else {
      try {
        // Try to parse as a full URL, using string concatenation to avoid template literal issues in some environments
        const parsedUrl = new URL(value.includes('://') ? value : 'http://' + value);
        extractedPath = parsedUrl.pathname;

        if (!value.includes('://')) {
          // Handle cases like "xyx.com/b/c/d" where we want "b/c/d" if it's not a full URL
          const parts = value.split('/');
          if (parts.length > 1) {
            extractedPath = parts.slice(1).join('/');
          }
        }
      } catch (e) {
        // Fallback for non-URL strings
        const parts = value.split('/');
        if (parts.length > 1) {
          extractedPath = parts.slice(1).join('/');
        }
      }
    }

    if (extractedPath) {
      // Remove leading slash if it exists
      const sanitizedPath = extractedPath.startsWith('/') ? extractedPath.substring(1) : extractedPath;
      if (sanitizedPath) {
        setInputValue(sanitizedPath);
      }
    }
  };

  const input = (
    <OneLineEditor
      ref={inputRef}
      onChange={value => {
        setInputValue(value);
        if (state.validate) {
          state.validate(value);
        }
      }}
      defaultValue={inputValue}
      isInfered
      id="prompt-input"
      type={inputType === 'decimal' ? 'number' : inputType || 'text'}
      placeholder={placeholder || ''}
    />
  );

  let sanitizedHints: ReactNode[] = [];

  if (Array.isArray(hints)) {
    sanitizedHints = hints.slice(0, 15).map(hint =>
      (<div key={hint} className="btn btn--outlined btn--super-duper-compact margin-right-sm margin-top-sm inline-block">
        <button
          className="tall"
          onClick={() => {
            if (hint) {
              state.onComplete?.(state.upperCase ? hint?.toUpperCase() : hint);
            }
            modalRef.current?.hide();
          }}
        >
          {hint}
        </button>
        <PromptButton
          confirmMessage=""
          className="tall space-left icon"
          onClick={() => {
            state.onDeleteHint?.(hint);
            const entryHints = state.hints?.filter(h => h !== hint);
            setState(state => ({
              ...state,
              hints: entryHints,
            }));
          }}
        >
          <i className="fa fa-close faint" />
        </PromptButton>
      </div>));
  }

  let field = input;

  if (label) {
    const labelClasses = classnames({
      'inline-block': inputType === 'checkbox',
    });
    field = (
      <label htmlFor="prompt-input" className={labelClasses}>
        {label} {input}
      </label>
    );
  }

  const divClassnames = classnames('form-control form-control--wide', {
    'form-control--outlined': inputType !== 'checkbox',
  });

  const urlField = showUrlField && (
    <div className={divClassnames}>
      <label>
        {urlLabel || 'URL'}
        <OneLineEditor
          id="prompt-modal-url"
          type="text"
          defaultValue={urlDefaultValue || ''}
          placeholder={urlPlaceholder || ''}
          onChange={onUrlChange}
        />
      </label>
    </div>
  );

  return (
    <Modal
      ref={modalRef}
      onHide={state.onHide}
    >
      <ModalHeader>{title}</ModalHeader>
      <ModalBody className="wide">
        <form onSubmit={handleSubmit} className="wide pad">
          {urlField}
          <div className={divClassnames}>{field}</div>
          {sanitizedHints}
          {showHttpMethodPills && (
            <div className="margin-top-sm flex flex-wrap gap-2">
              {['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].map(method => (
                <button
                  key={method}
                  type="button"
                  className={classnames(`btn btn--super-duper-compact http-method-${method}`, {
                    'btn--outlined': selectedHttpMethod !== method,
                    [`bg-http-method-${method}`]: selectedHttpMethod === method,
                  })}
                  onClick={() => setState(s => ({ ...s, selectedHttpMethod: method }))}
                >
                  {method}
                </button>
              ))}
            </div>
          )}
        </form>
      </ModalBody>
      <ModalFooter>
        <div className="margin-left faint italic txt-sm">{hint ? `* ${hint}` : ''}</div>
        <button className="btn" onClick={handleSubmit}>
          {submitName || 'Submit'}
        </button>
      </ModalFooter>
    </Modal>
  );
});

PromptModal.displayName = 'PromptModal';
