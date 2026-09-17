export interface PhotoRequest { path:string; size:'thumbnail'|'detail' }
interface Entry<T> { request:PhotoRequest; status:'loading'|'ready'|'failed'; value?:T }
/** Two decodes at a time. Only current view requests can complete into the cache. */
export class ReferenceImageCache<T> {
  private views=new Map<string,PhotoRequest[]>();
  private entries=new Map<string,Entry<T>>();
  private wanted=new Map<string,PhotoRequest>();
  private running=0;
  private load:(path:string)=>Promise<T>;
  private dispose:(value:T)=>void;
  private changed:()=>void;
  constructor(load:(path:string)=>Promise<T>,dispose:(value:T)=>void,changed:()=>void) {this.load=load;this.dispose=dispose;this.changed=changed;}
  setVisible(view:string,requests:PhotoRequest[]) {
    this.views.delete(view);this.views.set(view,requests);
    const desired=[...this.views.values()].reverse().flat();
    this.wanted.clear();
    for(const size of ['detail','thumbnail'] as const) {
      let count=0;
      for(const r of desired)if(r.size===size&&!this.wanted.has(r.path)&&count<(size==='detail'?1:12)){this.wanted.set(r.path,r);count++;}
    }
    for(const [path,e] of this.entries)if(!this.wanted.has(path)) {
      if(e.value)this.dispose(e.value);this.entries.delete(path);
    }
    this.pump();
  }
  get(path:string){return this.entries.get(path)?.value;}
  status(path:string){return this.entries.get(path)?.status;}
  get stats(){return {retained:this.entries.size,ready:[...this.entries.values()].filter(e=>e.status==='ready').length,running:this.running,wanted:this.wanted.size};}
  private pump() {
    for(const [path,request] of this.wanted) {
      if(this.running>=2)return;
      if(this.entries.has(path))continue;
      const entry:Entry<T>={request,status:'loading'};this.entries.set(path,entry);this.running++;
      void this.load(path).then(value=>{
        if(this.entries.get(path)===entry&&this.wanted.has(path)){entry.value=value;entry.status='ready';}
        else this.dispose(value);
      },()=>{if(this.entries.get(path)===entry)entry.status='failed';}).finally(()=>{this.running--;this.changed();this.pump();});
    }
  }
}
