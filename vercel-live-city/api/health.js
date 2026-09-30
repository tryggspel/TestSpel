export default function handler(req,res){
  if(req.method==='OPTIONS')return res.status(204).end();
  return res.status(200).json({
    ok:true,
    service:'Karlstad Live City Proxy',
    version:'2.1.0',
    trafiklabConfigured:!!process.env.TRAFIKLAB_API_KEY,
    trafikverketConfigured:!!process.env.TRAFIKVERKET_API_KEY
  });
}
