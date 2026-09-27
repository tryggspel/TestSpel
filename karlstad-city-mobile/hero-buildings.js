(function(){
  window.KarlstadHeroBuildings={
    version:27,
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
      },
      {
        key:'mitt-i-city',
        label:'Mitt i City',
        match:['mitt i city','mitticity'],
        lat:59.37988,
        lon:13.50055,
        radius:85,
        style:'mall'
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
      mall:{facade:'#4f5457',accent:'#9a6c43',glass:'#35515d',roof:'#3a3d3f'},
      square:{facade:'#b49b78',accent:'#383b3a',glass:'#284752',roof:'#39464a'}
    },
    assetOverrides:{
      sandgrund:'procedural:sandgrund-v16',
      'varmlands-museum':null,
      'mitt-i-city':'procedural:mitt-i-city-v27'
    }
  };
})();