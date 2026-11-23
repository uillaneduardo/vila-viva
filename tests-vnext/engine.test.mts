import assert from "node:assert/strict";
import test from "node:test";
import {createWorld} from "../packages/core/src/index.ts";
import {SimulationEngine} from "../packages/engine/src/index.ts";

const engine = new SimulationEngine([
  {id:"growth",order:10,update(ctx) {
    ctx.setCounter("growth",(ctx.world.counters.growth ?? 0)+1);
    ctx.emit({type:"world.growth",payload:{amount:1}});
  }},
  {id:"observer",order:20,update(ctx) {
    ctx.setCounter("observed",ctx.world.counters.growth ?? 0);
  }}
]);

test("seed and same systems produce identical world",()=>{
  const run=()=>{
    let world=createWorld("test-world",42);
    for(let i=0;i<10;i++) world=engine.step(world).world;
    return world;
  };
  assert.deepEqual(run(),run());
  assert.equal(run().counters.growth,10);
  assert.equal(run().counters.observed,10);
});

test("rejects duplicate system identifiers",()=>{
  assert.throws(()=>new SimulationEngine([
    {id:"same",order:1,update(){}},{id:"same",order:2,update(){}}
  ]));
});
