/** UI strings are not domain data. Stable message keys preserve future locales. */
export const DEFAULT_LOCALE="pt-BR";
export const UI_MESSAGES=Object.freeze({
 "pt-BR":Object.freeze({
  "app.name":"Vila Viva",
  "navigation.player":"Jogador",
  "navigation.admin":"Admin",
  "mode.player":"JOGADOR · MUNDO",
  "mode.admin":"ADMINISTRADOR · MODO DEUS",
  "world.default":"Mundo",
  "world.mapStatus":"Mapa alimentado pelo motor · tick",
  "world.refresh":"Atualizar",
  "world.mapAria":"Mapa; clique em uma célula para selecionar",
  "inspector.player":"Seleção e ação",
  "inspector.admin":"Inspeção e intervenção",
  "inspector.coordinate":"Célula:",
  "inspector.empty":"Escolha uma célula ou entidade no mapa.",
  "inspector.selectEntity":"Selecione uma entidade.",
  "inspector.healthEnergy":"Saúde {health} · Energia {energy}",
  "inspector.resourceQuantity":"{quantity} / {maximum} unidades",
  "actions.title":"Ações disponíveis para a seleção",
  "actions.available":"Disponível",
  "actions.unavailable":"Indisponível",
  "form.npcName":"Nome do novo NPC",
  "form.npcDefault":"Novo habitante",
  "form.npcFallback":"Habitante",
  "form.resourceType":"Tipo de fonte",
  "form.quantity":"Quantidade",
  "resource.wood":"Madeira",
  "resource.food":"Alimento",
  "resource.stone":"Pedra",
  "feedback.selectTile":"Selecione uma célula para iniciar.",
  "feedback.applying":"Aplicando comando...",
  "feedback.commandApplied":"Comando aplicado no tick {tick}",
  "feedback.failure":"Falha: {message}",
  "error.BLOCKED":"Não está adjacente ou falta energia",
  "error.OUT_OF_BOUNDS":"Selecione uma célula válida",
  "error.UNAUTHORIZED":"Ação não permitida",
  "error.INVALID_PAYLOAD":"Parâmetros inválidos",
  "error.DUPLICATE_COMMAND":"Comando já utilizado",
  "error.NOT_FOUND":"Entidade não encontrada",
  "notice.unsafe":"Prévia local sem autenticação/persistência. Não publicar na internet.",
  "footer.prototype":"G1 · Motor e contratos novos · Sem código legado",
  "footer.local":"LOCAL / DESENVOLVIMENTO",
  "feedback.networkError":"Erro na comunicação com o servidor"
 })
});
export function createTranslator(locale=DEFAULT_LOCALE){
 const resolved=Object.hasOwn(UI_MESSAGES,locale)?locale:DEFAULT_LOCALE;
 return (key,params={})=>{
  const entry=UI_MESSAGES[resolved][key]??UI_MESSAGES[DEFAULT_LOCALE][key];
  if(typeof entry!=="string")throw Error("Missing UI message: "+key);
  return entry.replace(/\{([a-zA-Z][\w]*)\}/g,(match,name)=>{
   if(!Object.hasOwn(params,name))throw Error("Missing interpolation: "+key+"."+name);
   return String(params[name]);
  });
 };
}
export const t=createTranslator();
export function localizeDOM(root=document,translate=t){
 for(const element of root.querySelectorAll("[data-i18n]"))element.textContent=translate(element.dataset.i18n);
 for(const element of root.querySelectorAll("[data-i18n-aria]"))element.setAttribute("aria-label",translate(element.dataset.i18nAria));
 for(const element of root.querySelectorAll("[data-i18n-placeholder]"))element.setAttribute("placeholder",translate(element.dataset.i18nPlaceholder));
 for(const element of root.querySelectorAll("[data-i18n-value]"))element.value=translate(element.dataset.i18nValue);
}
