import { ClassMetaCreator } from "../implemention";
import { NAMESPACE } from "./namespace";

export function Group(value: string): ClassDecorator {
  return ClassMetaCreator.define(NAMESPACE.GROUP, value);
}