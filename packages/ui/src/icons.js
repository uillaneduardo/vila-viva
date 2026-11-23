/** Compatibility adapter; feature modules should request semantic IDs. */
import {getUiIcon} from '../assets/registry.js';
export function icon(id,size=20,state="normal"){
 return getUiIcon(id,{size,state});
}
