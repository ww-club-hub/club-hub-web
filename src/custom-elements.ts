import type { EmitFn } from 'vue';
import "google.picker";
import "google.accounts";

// for DrivePicker
export type DefineCustomElement<
  ElementType extends HTMLElement,
  Events extends EventMap = {},
  SelectedAttributes extends keyof ElementType = keyof ElementType
> = new () => ElementType & {
  // Use $props to define the properties exposed to template type checking. Vue
  // specifically reads prop definitions from the `$props` type. Note that we
  // combine the element's props with the global HTML props and Vue's special
  // props.
  /** @deprecated Do not use the $props property on a Custom Element ref,
    this is for template prop types only. */
  $props: HTMLAttributes &
    Partial<Pick<ElementType, SelectedAttributes>> &
    PublicProps

  // Use $emit to specifically define event types. Vue specifically reads event
  // types from the `$emit` type. Note that `$emit` expects a particular format
  // that we map `Events` to.
  /** @deprecated Do not use the $emit property on a Custom Element ref,
    this is for template prop types only. */
  $emit: VueEmit<Events>
}

type EventMap = Record<string, Event>;

// This maps an EventMap to the format that Vue's $emit type expects.
type VueEmit<T extends EventMap> = EmitFn<{
  [K in keyof T]: (event: T[K]) => void
}>
import type { Component } from 'vue'
import type { HTMLAttributes } from 'vue'
import type { PublicProps } from 'vue'
import type { DrivePickerElement } from '@googleworkspace/drive-picker-element'

type DrivePickerElementEventMap = {
	/** @deprecated - Use "picker:oauth:response" */
	"picker:authenticated": CustomEvent<{ token: string }>;
	"picker:oauth:error": CustomEvent<
		| google.accounts.oauth2.ClientConfigError
		| google.accounts.oauth2.TokenResponse
	>;
	"picker:oauth:response": CustomEvent<google.accounts.oauth2.TokenResponse>;
	"picker:canceled": CustomEvent<google.picker.ResponseObject>;
	"picker:picked": CustomEvent<google.picker.ResponseObject>;
	"picker:error": CustomEvent<unknown>;
}

type DrivePickerElementAttributes = "visible";

declare module 'vue' {
  interface GlobalComponents {
    'drive-picker': DefineCustomElement<
      DrivePickerElement,
      DrivePickerElementEventMap,
      DrivePickerElementAttributes
    >
  }
}
