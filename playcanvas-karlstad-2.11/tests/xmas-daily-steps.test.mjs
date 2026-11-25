// xmas.17: dagens julklappsjakt som eget läge – ledtrådstrappan, värmemätaren och uppdragsraden.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dailyFor,dailyStep,nextStepIn,warmthLevel,WARMTH_LABELS,stepText,distanceText,DAILY_STEPS,hintLevel} from '../xmas/xmas-daily.mjs';
import {DAILY} from '../xmas/xmas-daily-config.mjs';
import {missionView} from '../xmas/xmas-guide.mjs';

test('ledtrådstrappan: gåtan, området, väderstreck, pil till området, pil ända fram; LEDTRÅD NU hoppar fram', ()=>{
  assert.equal(dailyStep(0),1);assert.equal(dailyStep(DAILY.areaHintAfter),2);assert.equal(dailyStep(DAILY.compassAfter),3);assert.equal(dailyStep(DAILY.arrowAfter),4);assert.equal(dailyStep(DAILY.spotArrowAfter),5);assert.equal(dailyStep(1e6),5);
  assert.equal(dailyStep(0,1),2);assert.equal(dailyStep(0,9),5);assert.equal(dailyStep(DAILY.arrowAfter,1),5);
  assert.ok(DAILY.areaHintAfter<DAILY.compassAfter&&DAILY.compassAfter<DAILY.arrowAfter&&DAILY.arrowAfter<DAILY.spotArrowAfter);
  assert.equal(nextStepIn(10,1),DAILY.areaHintAfter-10);assert.equal(nextStepIn(0,5),null);
  assert.equal(hintLevel(DAILY.arrowAfter),3,'den gamla funktionen finns kvar');
  assert.equal(DAILY_STEPS.length,5);for(const s of DAILY_STEPS)assert.ok(s.row.length<=20,'uppdragsraden får plats: '+s.row);
});

test('värmemätaren och texterna för stegen', ()=>{
  assert.equal(warmthLevel(DAILY.hot),4);assert.equal(warmthLevel(DAILY.warm),3);assert.equal(warmthLevel(DAILY.cool),2);assert.equal(warmthLevel(DAILY.cold),1);assert.equal(warmthLevel(DAILY.cold+1),0);
  assert.deepEqual([...WARMTH_LABELS],['ISKALLT','KALLT','LJUMMET','VARMT','GLÖDHETT']);
  assert.equal(distanceText(60),'under 100 m');assert.match(distanceText(312),/^ungefär 300 m$/);
  const d=dailyFor('2026-12-02'),p={x:d.spot.x,z:d.spot.z+400};
  assert.ok(stepText(1,d,p).includes(d.area.riddle));assert.ok(stepText(2,d,p).includes(d.area.name));
  assert.equal(stepText(3,d,p),'Den ligger norrut härifrån, ungefär 400 m.');
  assert.match(stepText(4,d,p),/Pilen visar vägen till/);assert.match(stepText(5,d,p),/ända fram/);
});

test('uppdragsraden i dagens jakt säger bara dagens uppdrag (inga spår eller nya högar)', ()=>{
  const mv=missionView({dailyMode:true,drops:true,phase:'free',packages:[{id:'d:x',hidden:true}],rains:[],nextRainAt:Infinity,goal:0});
  assert.deepEqual(mv.rows.map(r=>r.text),['DAGENS JULKLAPP']);
  const boot=fs.readFileSync(new URL('../xmas/xmas-boot.js',import.meta.url),'utf8');
  assert.match(boot,/hunt\.run\.dailyMode=true;hunt\.run\.nextRainAt=Infinity/,'inga tappade julklappar under dagens jakt');
  assert.match(boot,/if\(!hunt\.run\.dailyMode&&!hunt\.run\.plats\)hiddenHint/,'inga påminnelser om de vanliga gömda julklapparna');
  assert.match(boot,/id:'xmas-daily-spot'/);assert.match(boot,/mv\.rows=\[\{id:'daily'/);
});
