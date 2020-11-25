import { ClassMetaCreator } from "../implemention";
import { NAMESPACE } from "./namespace";
import { injectable } from 'inversify';

export function Service(value?: string): ClassDecorator {
  if (value) return ClassMetaCreator.join(
    ClassMetaCreator.define(NAMESPACE.INTERFACE, value),
    injectable()
  );
  return injectable();
}