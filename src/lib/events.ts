/** Shows and recordings share one model but live under separate routes. */
export function eventBasePath(type: string): "/shows" | "/recordings" {
  return type === "RECORDING" ? "/recordings" : "/shows";
}

export function eventHref(type: string, id: string): string {
  return `${eventBasePath(type)}/${id}`;
}
