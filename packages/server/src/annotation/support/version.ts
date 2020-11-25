import { ClassMetaCreator } from "../implemention";
import { NAMESPACE } from "./namespace";

export function Version(value: string): ClassDecorator {
  return ClassMetaCreator.define(NAMESPACE.VERSION, value);
}