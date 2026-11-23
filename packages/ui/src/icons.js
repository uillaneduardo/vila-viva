const paths={
 inspect:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
 npc:'<circle cx="9" cy="8" r="3.5"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M18 8v7M14.5 11.5h7"/>',
 wood:'<path d="M12 21v-3m0-14-4 5h2l-3 4h3l-2 3h8l-2-3h3l-3-4h2z"/>',
 stone:'<path d="m5 14 3-7 7-2 4 5-2 8H8zm3-7 4 5 6-1"/>',
 food:'<path d="M12 20c-3.6 0-7-5.1-7-10.4C5 7.1 6.4 5 8.5 5c1.6 0 2.5 1.2 3.5 1.2S13.9 5 15.5 5C17.6 5 19 7.1 19 9.6 19 14.9 15.6 20 12 20Z"/><path d="M12 8c-.7-2.3.2-4.1 2.6-5"/>',
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
 unavailable:'<circle cx="12" cy="12" r="8"/><path d="m7 7 10 10"/>',
 speed:'<path d="M4 15a8 8 0 1 1 16 0M12 15l4-6"/>'
};
export function icon(name,size=20){
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.unavailable)+'</svg>';
}
