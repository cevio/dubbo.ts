import { MethodMetaCreator } from "../implemention";
import { NAMESPACE } from "./namespace";

export function Proxy(): MethodDecorator {
  return MethodMetaCreator.define(NAMESPACE.PROXY, true);
}