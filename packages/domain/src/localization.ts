/** Stable IDs belong to the engine; human-readable text belongs to content. */
export type Locale = "pt-BR";
export type LocalizedText = Readonly<Record<Locale,string>>;
export const DEFAULT_LOCALE:Locale="pt-BR";
export function validateLocalizedText(text:LocalizedText):void {
 if(!text||typeof text["pt-BR"]!=="string"||!text["pt-BR"].trim())throw new Error("Missing pt-BR display text");
}
export function displayText(text:LocalizedText,locale:string=DEFAULT_LOCALE):string {
 validateLocalizedText(text);
 const candidate=(text as Record<string,string>)[locale];
 return typeof candidate==="string"&&candidate.trim()?candidate:text[DEFAULT_LOCALE];
}
