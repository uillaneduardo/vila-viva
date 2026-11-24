/** Internal SVG geometry, owned exclusively by the UI asset catalog. 
 * Each entry is trusted static markup, never interpolated from world or user data.
 * Add new glyphs here; feature components only request semantic IDs.
 */
export const ICON_GEOMETRY=Object.freeze({
 inspect:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
 npc:'<circle cx="9" cy="8" r="3.5"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M18 8v7M14.5 11.5h7"/>',
 wood:'<path d="M12 21v-3m0-14-4 5h2l-3 4h3l-2 3h8l-2-3h3l-3-4h2z"/>',
 stone:'<path d="m5 14 3-7 7-2 4 5-2 8H8zm3-7 4 5 6-1"/>',
 food:'<path d="M12 20c-3.6 0-7-5.1-7-10.4C5 7.1 6.4 5 8.5 5c1.6 0 2.5 1.2 3.5 1.2S13.9 5 15.5 5C17.6 5 19 7.1 19 9.6 19 14.9 15.6 20 12 20Z"/><path d="M12 8c-.7-2.3.2-4.1 2.6-5"/>',
 farm:'<path d="M4 20h16M5 16c1-3 4-3 5-6M14 16c0-4 2-6 5-7M8 14c-3-1-4-3-4-6 4 0 6 2 6 5M14 10c-2-3-1-5 2-7 2 3 1 5-2 7"/>',
 scenery:'<path d="M4 19h16M6 19V9l6-5 6 5v10M9 19v-6h6v6M4 9l8-6 8 6"/>',
 house:'<path d="m4 11 8-6 8 6M6 10.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8.5M10 20v-5h4v5"/>',
 events:'<path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>',
 stats:'<path d="M5 18V9M12 18V5M19 18v-7M3 21h18"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',play:'<path d="m8 5 11 7-11 7z"/>',
 close:'<path d="m7 7 10 10M17 7 7 17"/>',collapse:'<path d="m15 18-6-6 6-6"/>',expand:'<path d="m9 6 6 6-6 6"/>',
 follow:'<circle cx="12" cy="12" r="8"/><path d="M12 5v14M5 12h14"/>',
 overview:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8"/>',
 health:'<path d="M3 12h4l2-4 4 9 2-5h6"/>',
 effects:'<path d="m12 3 1.5 5L19 10l-5.5 2-1.5 6-1.5-6L5 10l5.5-2z"/>',
 box:'<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 11h16M10 6v5"/>',
 "crown":'<path d="m3 8 4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 19h14"/>',
 "ore":'<path d="m3 17 4-11 9-3 5 8-3 9H7z"/><path d="m7 6 6 8 8-3M13 14l-2 6"/>',
 "ore-copper":'<path d="m3 16 5-11 9-1 4 9-5 7H7z"/><path d="m8 5 5 9 8-1M13 14l-1 6"/><circle cx="11" cy="9" r="1"/>',
 "sprout":'<path d="M12 21V11M12 15C6 15 4 12 4 7c4 0 8 1 8 8ZM12 12c0-5 3-8 8-8 0 5-2 8-8 8Z"/>',
 "carrot":'<path d="m13 8 5 5-9 9-5-5z"/><path d="M13 8c-1-4-4-5-6-5M13 8c1-4 3-5 7-5M13 8c1-3-1-5-1-6"/>',
 "potato":'<path d="M7 6c4-3 10-1 12 3 3 6-1 11-7 12-6 1-10-4-9-9 0-2 2-5 4-6Z"/><path d="M8 10h.1M13 8h.1M15 15h.1M9 17h.1"/>',
 "wall":'<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 12h18M10 5v7M16 12v7"/>',
 "statue":'<path d="M8 20h8M6 22h12M9 16h6v4M8 4c1-2 7-2 8 1 1 2 0 5-2 6v5h-4v-5C7 9 7 6 8 4Z"/>',
 "grave":'<path d="M7 20V9a5 5 0 0 1 10 0v11M5 20h14M12 6v9M9 10h6"/>',
 "anvil":'<path d="M3 8h18l-3 5h-5v5h4v3H7v-3h4v-5H6z"/><path d="m5 8-2-3h7"/>',
 "blueprint":'<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5M8 12h8M8 16h5"/>',
 "complete":'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m7 12 3 3 7-7"/>',
 unavailable:'<circle cx="12" cy="12" r="8"/><path d="m7 7 10 10"/>',
 speed:'<path d="M4 15a8 8 0 1 1 16 0M12 15l4-6"/>'
});
