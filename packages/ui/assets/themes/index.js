/** Theme tokens mirror the approved compact sandbox HUD (not map colors). */
export const UI_THEMES=Object.freeze({
 "forest-dark":Object.freeze({
  "--text":"#e8eee4",
  "--muted":"#9eb09f",
  "--line":"rgba(208,226,204,.12)",
  "--glass":"rgba(19,27,23,.95)",
  "--accent":"#b4d3a9",
  "--green":"#8fb78b"
 })
});
export const DEFAULT_UI_THEME="forest-dark";
export function getUiTheme(id=DEFAULT_UI_THEME){
 const theme=UI_THEMES[id];
 if(!theme)throw Error("Unknown UI theme: "+id);
 return theme;
}
export function applyUiTheme(element,id=DEFAULT_UI_THEME){
 const theme=getUiTheme(id);
 if(!element?.style?.setProperty)throw Error("Theme target must support CSS custom properties");
 for(const [name,value] of Object.entries(theme))element.style.setProperty(name,value);
 element.dataset.uiTheme=id;
 return id;
}
