import { miniatureThumbnail } from './miniatures.ts';
import type { MiniatureKind } from './miniatures.ts';
import type { Force } from '../pieces.ts';
export interface PanelButton { label: string; run: () => void; enabled?: boolean; selected?:boolean; grab?:{definitionId?:string;pieceId?:string} }
export interface TablePanel {
  hovered?:string;
  helpLine?:string;
  title: string; lines: string[]; buttons: PanelButton[];
  catalog?: {toolbar:PanelButton[];tabs:PanelButton[];groups:PanelButton[];cards:(PanelButton & {model:MiniatureKind;force:Force;available:boolean})[]};
  keyboard?: { value: string; key: (key: string) => void; done: () => void };
}
export interface PanelTarget extends PanelButton { x: number; y: number; width: number; height: number }
/** Shared drawing and hit geometry for both terrain renderers. */
export function panelTargets(panel: TablePanel): PanelTarget[] {
  if(panel.catalog){
    const {toolbar,tabs,groups,cards}=panel.catalog;
    const row=(buttons:PanelButton[],y:number,height:number,columns:number)=>buttons.map((b,i)=>({...b,x:38+(i%columns)*948/columns,y:y+Math.floor(i/columns)*(height+10),width:948/columns-10,height}));
    return [...row(toolbar,118,62,2),...row(tabs,196,60,3),...row(groups,272,50,4),...cards.map((b,i)=>({...b,x:38+(i%3)*316,y:402+Math.floor(i/3)*310,width:300,height:290})),...row(panel.buttons,1040,72,3)];
  }
  if (!panel.keyboard) return panel.buttons.slice(0, 7).map((button, i) => ({ ...button, x: 38, y: 480 + i * 94, width: 948, height: 84 }));
  const keyboard = panel.keyboard, targets: PanelTarget[] = [];
  ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM', '0123456789-'].forEach((row, r) => {
    [...row].forEach((key, i) => targets.push({ label: key, run: () => keyboard.key(key), x: 38 + i * 948 / row.length, y: 480 + r * 100, width: 948 / row.length - 8, height: 84 }));
  });
  ['Space', 'Backspace', 'Clear'].forEach((key, i) => targets.push({ label: key, run: () => keyboard.key(key), x: 38 + i * 316, y: 880, width: 308, height: 84 }));
  targets.push({ label: 'Done / show results', run: keyboard.done, x: 38, y: 980, width: 948, height: 84 });
  return targets;
}
export function panelTargetAt(panel:TablePanel,u:number,v:number){const x=u*1024,y=(1-v)*1280;return panelTargets(panel).find(t=>x>=t.x&&x<=t.x+t.width&&y>=t.y&&y<=t.y+t.height);}
export function activatePanel(panel: TablePanel, u: number, v: number) {
  const target = panelTargetAt(panel,u,v);
  if (target && target.enabled !== false) { target.run(); return true; }
  return false;
}
export function editSearch(value: string, key: string) {
  return key === 'Clear' ? '' : key === 'Backspace' ? value.slice(0, -1) : (value + (key === 'Space' ? ' ' : key)).slice(0, 80);
}
export function drawPanel(canvas: HTMLCanvasElement, panel: TablePanel) {
  if (canvas.width !== 1024 || canvas.height !== 1280) { canvas.width = 1024; canvas.height = 1280; }
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#142e37'; c.fillRect(0, 0, 1024, 1280);
  c.fillStyle = '#eed5a4'; c.font = 'bold 42px sans-serif'; c.fillText(panel.title, 38, 64, 948);
  if(panel.catalog){
    c.fillStyle='#bdcecf';c.font='24px sans-serif';c.fillText(panel.lines[0]??'',38,98,948);
    const targets=panelTargets(panel);
    for(const t of targets){
      c.fillStyle=t.selected||t.label===panel.hovered?'#466865':t.enabled===false?'#20363d':'#2b454d';c.beginPath();c.roundRect(t.x,t.y,t.width,t.height,12);c.fill();
      if(t.selected||t.label===panel.hovered){c.strokeStyle='#e5cf98';c.lineWidth=3;c.stroke();}
      const card=panel.catalog.cards.find(b=>b.run===t.run);
      if(card){
        c.globalAlpha=card.available?1:.4;c.drawImage(miniatureThumbnail(card.model,card.force),t.x+22,t.y+3,256,192);c.globalAlpha=1;
        c.fillStyle=card.available?'#faf0d8':'#a8b6b8';c.font='bold 24px sans-serif';
        const lines=wrapPanelText(c,card.label,t.width-24,3);lines.forEach((line,i)=>c.fillText(line,t.x+12,t.y+205+i*27,t.width-24));
        if(!card.available){c.fillStyle='#ddc2a7';c.font='20px sans-serif';c.fillText('Unavailable · tap for reason',t.x+14,t.y+28,t.width-28);}
      }else{c.fillStyle=t.enabled===false?'#819497':'#f4eddd';c.font='25px sans-serif';c.textAlign='center';c.fillText(t.label,t.x+t.width/2,t.y+t.height/2+9,t.width-20);c.textAlign='left';}
    }
    if(!panel.catalog.cards.length){c.fillStyle='#d5dfd5';c.font='32px sans-serif';c.fillText('No units match these filters.',80,530);c.font='26px sans-serif';c.fillText('Choose another group or clear the search.',80,580);}
    c.fillStyle='#d5dfd5';c.font='25px sans-serif';c.fillText('Hold SIDE GRIP: pick up · Lower to green · Release: place',38,1230,948);
    c.fillStyle='#c5d3d0';c.font='23px sans-serif';c.fillText(panel.lines[1]??'Tap a unit for its full name and details.',38,1200,948);return;
  }
  c.fillStyle = '#f0ecdf'; c.font = '30px sans-serif';
  panel.lines.slice(0, 8).forEach((line, i) => c.fillText(line, 38, 125 + i * 43, 948));
  for (const target of panelTargets(panel)) {
    c.fillStyle = target.enabled === false ? '#203a43' : target.label===panel.hovered?'#526f68':'#304d53'; c.fillRect(target.x, target.y, target.width, target.height);
    c.fillStyle = target.enabled === false ? '#809797' : '#f1ead6'; c.font = '32px sans-serif';
    c.fillText(target.label, target.x + 16, target.y + 54, target.width - 32);
  }
  c.fillStyle = '#c1d3cc'; c.font = '24px sans-serif';
  c.fillText(panel.helpLine ?? 'TRIGGER: select · SIDE GRIP: hold a unit or move the menu', 38, 1180, 948);
  c.fillText('Controllers required · Left stick: move · Right: height / rotate', 38, 1230, 948);
}

export function wrapPanelText(c:CanvasRenderingContext2D,text:string,width:number,maxLines:number){
  const words=text.split(/\s+/),lines:string[]=[];let line='';
  for(const word of words){if(line&&c.measureText(line+' '+word).width>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);
  if(lines.length>maxLines){lines.length=maxLines;lines[maxLines-1]=lines[maxLines-1].slice(0,-1)+'…';}return lines;
}
