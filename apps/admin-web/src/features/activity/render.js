import {escapeHTML} from "../../shared/escape-html.js";
export function renderActivityMarkup(events){return events.slice(0,3).map(e=>`<div class="activity"><div class="activity-icon">${escapeHTML(e.icon)}</div><div><strong>${escapeHTML(e.title)}</strong><p>${escapeHTML(e.description)}</p><time>${escapeHTML(e.time)}</time></div></div>`).join("");}
