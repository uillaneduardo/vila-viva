/** Versioned semantic visual manifest. IDs and locales are independent of assets.
 * A null sprite means use the icon fallback. No image files are implied or invented.
 */
export const UI_VISUAL_MANIFEST=Object.freeze({
 schemaVersion:1,
 defaultTheme:"forest-dark",
 visuals:Object.freeze({
  "action.inspect":{icon:"inspect",sprite:null},
  "action.add-npc":{icon:"npc",sprite:null},
  "action.add-wood":{icon:"wood",sprite:null},
  "action.add-stone":{icon:"stone",sprite:null},
  "action.add-food":{icon:"food",sprite:null},
  "action.add-scenery":{icon:"scenery",sprite:null},
  "action.build":{icon:"house",sprite:null},
  "action.events":{icon:"events",sprite:null},
  "action.metrics":{icon:"stats",sprite:null},
  "control.pause":{icon:"pause",sprite:null},
  "control.resume":{icon:"play",sprite:null},
  "control.close":{icon:"close",sprite:null},
  "control.collapse":{icon:"collapse",sprite:null},
  "control.expand":{icon:"expand",sprite:null},
  "control.follow":{icon:"follow",sprite:null},
  "control.speed":{icon:"speed",sprite:null},
  "section.overview":{icon:"overview",sprite:null},
  "section.attributes":{icon:"health",sprite:null},
  "section.effects":{icon:"effects",sprite:null},
  "section.inventory":{icon:"box",sprite:null},
  "resource.wood":{icon:"wood",sprite:null},
  "resource.food":{icon:"food",sprite:null},
  "resource.stone":{icon:"stone",sprite:null},
  "effect.generic":{icon:"effects",sprite:null},
  "ui.unavailable":{icon:"unavailable",sprite:null}
 }),
 /** Existing callers can be migrated one at a time without breaking their behavior. */
 aliases:Object.freeze({
  inspect:"action.inspect",npc:"action.add-npc",wood:"resource.wood",stone:"resource.stone",food:"resource.food",
  house:"action.build",events:"action.events",stats:"action.metrics",
  pause:"control.pause",play:"control.resume",close:"control.close",
  collapse:"control.collapse",expand:"control.expand",follow:"control.follow",
  speed:"control.speed",overview:"section.overview",health:"section.attributes",
  effects:"section.effects",box:"section.inventory",unavailable:"ui.unavailable"
 })
});
