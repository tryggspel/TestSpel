// Julgrenen: visar exakt vilket bygge som körs. Vercel sätter systemvariablerna per deployment, så svaret hör alltid ihop med de filer
// som levererades i samma deployment (kod, resurser och den här funktionen byts ut tillsammans). Bara icke-hemliga fält skickas.
const pick=v=>typeof v==='string'&&v?v:null;
export function buildInfo(env=process.env){
  return {
    commit:pick(env.VERCEL_GIT_COMMIT_SHA),
    branch:pick(env.VERCEL_GIT_COMMIT_REF),
    repo:pick(env.VERCEL_GIT_REPO_SLUG),
    environment:pick(env.VERCEL_ENV),
    deployment:pick(env.VERCEL_DEPLOYMENT_ID),
    region:pick(env.VERCEL_REGION)
  };
}
export default function handler(req,res){
  res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  return res.status(200).json(buildInfo());
}
