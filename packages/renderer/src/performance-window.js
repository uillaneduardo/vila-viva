/** Fixed-size samples; quantiles computed only when reporting. No DOM or network dependency. */
export class PerformanceWindow{
 constructor(capacity=256){if(!Number.isInteger(capacity)||capacity<1)throw Error('INVALID_CAPACITY');this.capacity=capacity;this.samples=[];this.cursor=0;}
 add(value){if(!Number.isFinite(value)||value<0)return;if(this.samples.length<this.capacity)this.samples.push(value);else{this.samples[this.cursor]=value;this.cursor=(this.cursor+1)%this.capacity;}}
 summary(){const sorted=[...this.samples].sort((a,b)=>a-b),n=sorted.length;const q=p=>n?sorted[Math.max(0,Math.ceil(n*p)-1)]:null;return {count:n,p50:q(.5),p95:q(.95),p99:q(.99),max:q(1)};}
 clear(){this.samples=[];this.cursor=0;}
}
