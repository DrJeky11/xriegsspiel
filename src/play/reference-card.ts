import './reference-card.css';
import { miniatureThumbnail } from './miniatures.ts';
import type { MiniatureKind } from './miniatures.ts';
import type { Force } from '../pieces.ts';
import { referenceFor, referenceNotice, referencePhoto, referencePhotoStatus } from './references.ts';
import type { UnitReference } from './reference-types.ts';
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function referenceImageMarkup(equipmentId:string,model:MiniatureKind,force:Force,size:'thumbnail'|'detail') {
  return `<span class="reference-image reference-${size}" data-reference-image="${esc(equipmentId)}" data-model="${model}" data-force="${force}" data-size="${size}"></span>`;
}
export function referenceCredits(ref:UnitReference) {
  const m=ref.media;
  return `<details class="reference-credits"><summary>Photo credits & role sources</summary><p>${esc(m.attribution)} · <a href="${esc(m.licenseUrl)}" target="_blank" rel="noreferrer">${esc(m.license)}</a></p><p><a href="${esc(m.sourcePage)}" target="_blank" rel="noreferrer">Original photograph & caption ↗</a> · ${esc(m.photoDate)}</p><p>${esc(m.framing)} ${esc(m.caveat)}</p>${ref.sources.map(s=>`<p><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.label)} ↗</a> · ${esc(s.locator)} · ${esc(s.dated)} · accessed ${esc(s.accessed)}</p>`).join('')}<p>${esc(referenceNotice())}</p></details>`;
}
export function referenceCardMarkup(equipmentId:string,model:MiniatureKind,force:Force) {
  const ref=referenceFor(equipmentId);
  return `<section class="unit-reference" aria-label="Equipment recognition"><div class="reference-visuals">${referenceImageMarkup(equipmentId,model,force,'detail')}<figure class="reference-miniature"><img src="${miniatureThumbnail(model,force).toDataURL()}" width="256" height="192" alt="Stylized ${model} board piece"><figcaption>Board piece<br><span>Stylized class model</span></figcaption></figure></div>${ref?`<p class="reference-caption">${esc(ref.media.relationship)} · ${esc(ref.media.subject)} · ${esc(ref.media.photoDate)}</p><p class="reference-role"><strong>${esc(ref.roleLabel)}</strong><br>${esc(ref.role)}</p><p class="reference-recognition">${ref.recognition.map(esc).join(' · ')}</p>${referenceCredits(ref)}`:'<p class="reference-caption">Reference photo unavailable. This miniature represents a class, not an exact vehicle or variant.</p>'}</section>`;
}
/** Refresh image slots only: no focus, selection, command or layout changes on decode. */
export function refreshReferenceImages(root:ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-reference-image]').forEach(slot=>{
    const ref=referenceFor(slot.dataset.referenceImage!),size=slot.dataset.size as 'thumbnail'|'detail',photo=referencePhoto(ref,size);
    const status=referencePhotoStatus(ref,size),key=photo?ref!.media[size].path:status??'unavailable';
    if(slot.dataset.rendered===key)return;slot.dataset.rendered=key;
    const img=document.createElement('img');img.width=size==='detail'?960:384;img.height=size==='detail'?640:256;
    img.alt=photo?ref!.media.alt:`Stylized ${slot.dataset.model} miniature; reference photo unavailable`;
    img.src=photo?ref!.media[size].path:miniatureThumbnail(slot.dataset.model as MiniatureKind,slot.dataset.force as Force).toDataURL();
    slot.replaceChildren(img);
    if(!photo){const label=document.createElement('span');label.className='reference-fallback';label.textContent=ref&&(status==='loading'||status===undefined)?'Loading reference photo…':'Reference photo unavailable';slot.append(label);}
  });
}
