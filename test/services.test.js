'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ExchangeService } = require('../backend/exchange');
const { verifyGoogleAccessToken } = require('../backend/google-auth');
const { CloudStateStore } = require('../backend/cloud-state');
const { createStateHandler } = require('../api/state');

function mockResponse() {
  return { headers:{},statusCode:0,body:null,setHeader(name,value){this.headers[name]=value;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;} };
}

test('ExchangeService normalizza il cambio e usa il fallback', async t => {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'bali-exchange-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  let offline=false;
  const service=new ExchangeService({cacheFile:path.join(directory,'rate.json'),ttlMs:1,fetchImpl:async()=>{
    if(offline)throw new Error('offline');
    return new Response(JSON.stringify({date:'2026-08-02',base:'EUR',quote:'IDR',rate:20742}),{status:200});
  }});
  const live=await service.getRate({force:true});assert.equal(live.rate,20742);assert.equal(live.source,'Frankfurter');
  offline=true;const cached=await service.getRate({force:true});assert.equal(cached.stale,true);assert.equal(cached.rate,20742);
});

test('verifyGoogleAccessToken accetta solo profili verificati', async () => {
  const user=await verifyGoogleAccessToken('x'.repeat(30),async()=>new Response(JSON.stringify({sub:'123',email:'a@example.com',email_verified:true,name:'A'}),{status:200}));
  assert.deepEqual(user,{sub:'123',email:'a@example.com',name:'A'});
  await assert.rejects(()=>verifyGoogleAccessToken('x'.repeat(30),async()=>new Response('{}',{status:401})),/scaduta/);
});

test('CloudStateStore separa lo stato per identità Google', async () => {
  const rows=new Map();
  const pool={async query(sql,params=[]){
    if(sql.includes('CREATE TABLE'))return {rows:[]};
    if(sql.startsWith('SELECT'))return {rows:rows.has(params[0])?[rows.get(params[0])]:[]};
    const row={state:JSON.parse(params[2]),updated_at:new Date('2026-08-02T00:00:00Z')};rows.set(params[0],row);return {rows:[row]};
  }};
  const store=new CloudStateStore(pool),user={sub:'google-1',email:'a@example.com'};
  assert.deepEqual((await store.read(user)).state,{});
  await store.write(user,{bali_bookings_v1:[{id:'B1'}]});
  assert.equal((await store.read(user)).state.bali_bookings_v1[0].id,'B1');
  assert.deepEqual((await store.read({sub:'google-2',email:'b@example.com'})).state,{});
});

test('Vercel state API autentica e filtra le chiavi', async () => {
  let saved=null;
  const handler=createStateHandler({store:{read:async()=>({state:{}}),write:async(user,state)=>{saved={user,state};return {state,updatedAt:'now'};}},verifyToken:async token=>{assert.equal(token,'valid-token');return {sub:'1',email:'a@example.com'};}});
  const response=mockResponse();
  await handler({method:'PUT',headers:{authorization:'Bearer valid-token'},body:{state:{bali_bookings_v1:[{id:'B1'}],forbidden:'x'}}},response);
  assert.equal(response.statusCode,200);assert.equal(saved.state.forbidden,undefined);assert.equal(saved.state.bali_bookings_v1[0].id,'B1');
});
