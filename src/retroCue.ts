export function playInsertCoinReady(audioActive=true):void{
  if(!audioActive||typeof window==='undefined')return;
  try{
    const w=window as unknown as{AudioContext?:typeof AudioContext;webkitAudioContext?:typeof AudioContext};
    const AudioCtx=w.AudioContext||w.webkitAudioContext;
    if(!AudioCtx)return;
    const ctx=new AudioCtx();
    if(ctx.state==='suspended'){ctx.resume().catch(()=>{});}
    const now=ctx.currentTime;
    [{f:659.25,t:0,d:0.065},{f:987.77,t:0.065,d:0.11}].forEach((n)=>{
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.type='square';
      osc.frequency.setValueAtTime(n.f,now+n.t);
      gain.gain.setValueAtTime(0.0001,now+n.t);
      gain.gain.linearRampToValueAtTime(0.045,now+n.t+0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001,now+n.t+n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now+n.t);
      osc.stop(now+n.t+n.d+0.01);
    });
    setTimeout(()=>{ctx.close().catch(()=>{});},320);
  }catch{}
}
export function formatInsertCoinReady(detail:string):string{
  return'INSERT COIN · READY — '+detail+' (salvaguardato su app, invio Sorare via estensione)';
}
