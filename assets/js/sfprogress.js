/* Signal Flow progress rules, shared by /member/ (member.js) and /game/ (gamehub.js).
   The block between "sf-rules:start" and "sf-rules:end" is the game's own rule set, copied word for word from game/signal-flow/index.html
   (tools/check_pages.py keeps the two identical; tools/test_member_resume.mjs runs both against the same cases).
   It only READS: results saved on the account (window.SF_ME.levels, from game-scores "me") and this browser's own stats ("signal-flow-best-p<P>-l<N>"). Nothing is written or sent. */
(function () {
  /* sf-rules:start */
var SF_PN={1:12,2:14,3:14,4:12};
function sfPassed(p,n){
  if(window.SF_ME&&(SF_ME.levels||[]).some(function(l){return l.phase===p&&l.level===n;}))return true;
  try{return !!localStorage.getItem('signal-flow-best-p'+p+'-l'+n);}catch(e){return false;}
}
function sfFirstOpen(p){for(var n=SF_PN[p];n>=1;n--)if(sfPassed(p,n))return Math.min(n+1,SF_PN[p]);return 1;}
function sfPhaseDone(p){for(var n=1;n<=SF_PN[p];n++)if(!sfPassed(p,n))return false;return true;}
function sfPhaseOpen(p){if(p===1||sfPhaseDone(p-1))return true;for(var n=1;n<=SF_PN[p];n++)if(sfPassed(p,n))return true;return false;}
  /* sf-rules:end */

  // Phase 4 is not open yet → only Phase 1–3 count. Resume = the highest open Phase that is not finished, at the game's first open level of that Phase.
  // passed = how many levels of Phase 1–3 are passed · per[p] = passed in Phase p · total = how many levels Phase 1–3 have · next = [phase, level] or null (nothing passed, or all finished)
  function resume() {
    var per = {}, passed = 0, total = 0, next = null, p, n;
    for (p = 1; p <= 3; p++) { per[p] = 0; for (n = 1; n <= SF_PN[p]; n++) { total++; if (sfPassed(p, n)) per[p]++; } passed += per[p]; }
    if (passed) for (p = 3; p >= 1; p--) if (sfPhaseOpen(p) && !sfPhaseDone(p)) { next = [p, sfFirstOpen(p)]; break; }
    return { passed: passed, total: total, next: next, per: per };
  }
  window.sfProgress = { PN: SF_PN, resume: resume, firstOpen: sfFirstOpen, phaseOpen: sfPhaseOpen, phaseDone: sfPhaseDone, passed: sfPassed };
})();
