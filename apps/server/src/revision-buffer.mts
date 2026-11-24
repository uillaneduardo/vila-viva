/** Bounded volatile history; never a durable journal. */
export class RevisionBuffer {
 private entries:Array<{revision:number;payload:string;bytes:number}>=[];
 private size=0;
 private capacity:number;
 private maxBytes:number;
 constructor(capacity:number,maxBytes:number){this.capacity=capacity;this.maxBytes=maxBytes;}
 push(revision:number,payload:string){
  const bytes=Buffer.byteLength(payload);
  if(bytes>this.maxBytes){this.clear();return;}
  this.entries.push({revision,payload,bytes});this.size+=bytes;
  while(this.entries.length>this.capacity||this.size>this.maxBytes)this.size-=this.entries.shift()!.bytes;
 }
 clear(){this.entries=[];this.size=0;}
 get count(){return this.entries.length;}
 get bytes(){return this.size;}
}
