(function(){
  window.KarlstadHeroBuildings={
    version:14,
    targets:[
      {
        key:'sandgrund',
        label:'Sandgrund Lars Lerin',
        match:['sandgrund','lars lerin'],
        lat:59.384639,
        lon:13.502961,
        radius:70,
        style:'culture'
      },
      {
        key:'varmlands-museum',
        label:'Värmlands Museum',
        match:['värmlands museum','varmlands museum'],
        lat:59.38492,
        lon:13.50124,
        radius:80,
        style:'museum'
      }
    ],
    squareCluster:{
      key:'stora-torget-core',
      label:'Stora torget',
      lat:59.380767,
      lon:13.50295,
      radius:145,
      max:4,
      minArea:280,
      style:'square'
    },
    styles:{
      culture:{facade:'#8b7960',accent:'#323b3d',glass:'#27424e',roof:'#313e43'},
      museum:{facade:'#a9a18e',accent:'#4a4540',glass:'#2b4651',roof:'#3d4545'},
      square:{facade:'#b49b78',accent:'#383b3a',glass:'#284752',roof:'#39464a'}
    },
    assetOverrides:{
      sandgrund:null,
      'varmlands-museum':null
    }
  };
})();