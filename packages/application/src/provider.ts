import { Events } from '@dubbo.ts/utils';

export type TProviderBaseEvents = {
  stop: [],
  start: [],
}

export interface TProvider<T extends TProviderBaseEvents = TProviderBaseEvents> extends Events<T> {}