/** Bounded in-memory diagnostics; no persisted data, no change to simulation. */
export class TimingMetrics{
 private windows=new Map<string,number[]>();
 private cursors=new Map<string,number>();
 constructor(privateCapacity=256){this.capacity=privateCapacity;}
 private capacity:number;
 record(name:string,ms:number){if(!Number.isFinite(ms)||ms<0)return;let a=this.windows.get(name);if(!a){a=[];this.windows.set(name,a);}if(a.length<this.capacity)a.push(ms);else{const i=this.cursors.get(name)??0;a[i]=ms;this.cursors.set(name,(i+1)%this.capacity);}}
 measure<T>(name:string,run:()=>T):T{const start=performance.now();try{return run();}finally{this.record(name,performance.now()-start);}}
 summary(){return Object.fromEntries([...this.windows].map(([name,a])=>{const sorted=[...a].sort((x,y)=>x-y);const q=(p:number)=>sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]??null;return [name,{count:a.length,p50:q(.5),p95:q(.95),p99:q(.99),max:q(1)}];}));}
}
