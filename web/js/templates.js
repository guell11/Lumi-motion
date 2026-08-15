(function () {
  const Editor = (window.Editor = window.Editor || {});

  const CATEGORIES = {
    lower: { label: "Lower thirds", icon: "LT" },
    opener: { label: "Openers", icon: "OP" },
    caption: { label: "Captions", icon: "CC" },
    logo: { label: "Logo reveals", icon: "LG" },
    callout: { label: "Callouts", icon: "CO" },
    interaction: { label: "Mouse & UI", icon: "UI" },
    identity: { label: "Brand systems", icon: "ID" },
    layout: { label: "Social layouts", icon: "FMT" },
    stats: { label: "Stats", icon: "%" },
    social: { label: "Vertical / Social", icon: "9:16" },
    end: { label: "End cards", icon: "END" },
  };

  const FORMAT_PROFILES = {
    "16:9": { width: 1920, height: 1080, label: "Horizontal", use: "YouTube · apresentação · broadcast" },
    "9:16": { width: 1080, height: 1920, label: "Vertical", use: "TikTok · Reels · Stories · Shorts" },
    "1:1": { width: 1080, height: 1080, label: "Quadrado", use: "Instagram Feed · social square" },
  };

  const SEARCH_ALIASES = {
    interaction: "mouse cursor ponteiro clique click hover toque tap swipe arrastar drag seleção interface demonstração tutorial",
    identity: "identidade marca brand branding pacote completo sistema visual campanha",
    layout: "layout formato proporção vertical quadrado player safe zone área segura instagram tiktok reels stories shorts",
    social: "social instagram tiktok reels stories shorts vertical feed creator conteúdo",
    logo: "logo marca monograma reveal revelação identidade",
    callout: "detalhe anotação destaque pin tooltip comentário interface",
    opener: "abertura intro título cinematic modular",
    lower: "lower third tarja nome cargo placar notícia podcast",
    caption: "legenda subtitle karaoke creator",
    stats: "dados métrica percentual gráfico crescimento",
    end: "encerramento end card CTA inscrição próximo vídeo créditos",
  };

  function cursorGlideClick(t) {
    const target = t.shape("Cursor demo · alvo", { x: 1320, y: 500, width: 330, height: 112, fill: "#242126", stroke: t.a, strokeWidth: 3, radius: 24, shadow: 22 });
    const label = t.text("Cursor demo · botão", "COMEÇAR AGORA", { x: 1320, y: 500, width: 290, fontSize: 29, fill: "#ffffff", letterSpacing: 2 });
    const cursor = t.cursor("Cursor demo · ponteiro", 420, 760, 78);
    t.motion(cursor, [[0, 420, 760], [0.85, 780, 610], [1.75, 1260, 535], [2.25, 1320, 500]]);
    t.keyframes(cursor, "scale", [[0, 1], [2.25, 1], [2.34, 0.8], [2.5, 1, "back"]]);
    [target, label].forEach((layer) => t.keyframes(layer, "scale", [[0, 1], [2.28, 1], [2.42, 0.94], [2.65, 1, "back"]]));
    t.clickPulse("Cursor demo · clique", 1320, 500, 2.27, t.a);
  }

  function desktopDragSelect(t) {
    const cards = [[560,390],[890,390],[1220,390],[560,680],[890,680],[1220,680]].map(([x,y], index) => {
      const card = t.shape(`Seleção · item ${index + 1}`, { x, y, width: 230, height: 180, fill: index % 2 ? "#252128" : "#201f23", stroke: "#454047", strokeWidth: 2, radius: 24 });
      t.keyframes(card, "scale", [[0, .92], [.45 + index * .05, 1, "back"]]);
      return card;
    });
    const box = t.shape("Seleção · marquee", { x: 900, y: 535, width: 940, height: 600, fill: "#a78bfa", opacity: 0.13, stroke: t.a, strokeWidth: 4, radius: 8 });
    t.keyframes(box, "scaleX", [[0, 0], [1.35, 0], [2.35, 1, "easeInOut"]]);
    t.keyframes(box, "scaleY", [[0, 0], [1.35, 0], [2.35, 1, "easeInOut"]]);
    t.keyframes(box, "opacity", [[0, 0], [1.35, .13], [2.7, .13], [3.1, 0]]);
    const cursor = t.cursor("Seleção · ponteiro", 390, 250, 70);
    t.motion(cursor, [[0, 390, 250], [1.3, 420, 235], [2.35, 1380, 835], [3.1, 1420, 850]]);
    t.stagger(cards, "strokeWidth", 2, 5, .04, .24, "easeOut");
  }

  function hoverTooltipTour(t) {
    const menu = t.shape("Hover · barra", { x: 960, y: 540, width: 980, height: 132, fill: "#201e21", stroke: "#3e393f", strokeWidth: 2, radius: 32, shadow: 26 });
    const icons = ["⌂", "✦", "◫", "⚙"].map((glyph, index) => t.text(`Hover · ícone ${index + 1}`, glyph, { x: 660 + index * 200, y: 540, width: 90, fontSize: 43, fill: index === 2 ? t.a : "#ded8cf" }));
    const tooltip = t.shape("Hover · tooltip", { x: 1060, y: 390, width: 330, height: 104, fill: "#f2ede4", radius: 18, shadow: 22, opacity: 0 });
    const tipText = t.text("Hover · texto", "BIBLIOTECA", { x: 1060, y: 390, width: 280, fontSize: 25, fill: "#211f22", letterSpacing: 3, opacity: 0 });
    const cursor = t.cursor("Hover · ponteiro", 480, 790, 68);
    t.motion(cursor, [[0,480,790],[1.5,850,575],[2.4,1060,560],[3.6,1260,560]]);
    [tooltip, tipText].forEach((layer) => t.keyframes(layer, "opacity", [[0,0],[2.25,0],[2.5,1],[3.45,1],[3.7,0]]));
    t.keyframes(icons[2], "scale", [[0,1],[2.35,1.2,"back"],[3.4,1]]);
    t.fade(menu, .35);
  }

  function mobileTapSwipe(t) {
    t.shape("Swipe · fundo", { x:960,y:540,width:700,height:1080,fill:"#171419",z:-20 });
    const phone = t.shape("Swipe · tela", { x:960,y:540,width:560,height:930,fill:"#242027",stroke:"#514955",strokeWidth:3,radius:56,shadow:30 });
    const cardA = t.shape("Swipe · cartão A", { x:960,y:470,width:450,height:520,fill:t.a,radius:42 });
    const cardB = t.shape("Swipe · cartão B", { x:960,y:1000,width:450,height:520,fill:t.b,radius:42 });
    const label = t.text("Swipe · instrução", "DESLIZE PARA CIMA", { x:960,y:865,width:480,fontSize:24,fill:"#f6f0e7",letterSpacing:4 });
    const finger = t.shape("Swipe · toque", { shape:"circle",x:1100,y:790,width:62,height:62,fill:"#f7eee4",stroke:"#242027",strokeWidth:4,shadow:18 });
    t.motion(finger, [[0,1100,790],[1.1,1100,790],[2.4,1100,330]]);
    t.keyframes(finger,"scale",[[0,1],[1.05,1],[1.18,.72],[2.4,.72],[2.6,1]]);
    t.keyframes(cardA,"y",[[0,470],[1.15,470],[2.5,-140,"easeInOut"]]);
    t.keyframes(cardB,"y",[[0,1000],[1.15,1000],[2.5,470,"easeInOut"]]);
    t.clickPulse("Swipe · toque inicial",1100,790,1.05,t.b);
    t.fade(phone,.3,false); t.fade(label,.45);
  }

  function searchCommandDemo(t) {
    const panel = t.shape("Busca · painel", { x:960,y:500,width:1120,height:420,fill:"#1d1b1e",stroke:"#454047",strokeWidth:2,radius:34,shadow:32 });
    const field = t.shape("Busca · campo", { x:960,y:420,width:920,height:104,fill:"#29262b",stroke:t.a,strokeWidth:3,radius:22 });
    const query = t.text("Busca · consulta", "motion graphics", { x:870,y:420,width:650,fontSize:36,fill:"#f8f4ec",align:"left",fontWeight:550 });
    query.textAnimation = { enabled:true,inEnabled:true,outEnabled:false,inMode:"typewriter",duration:1.6,inDuration:1.6,speed:1 };
    const result = t.shape("Busca · resultado", { x:960,y:595,width:920,height:92,fill:"#302b34",radius:18,opacity:0 });
    const resultText = t.text("Busca · resultado texto", "Motion Graphics · 34 resultados", { x:890,y:595,width:720,fontSize:27,fill:t.b,align:"left",opacity:0 });
    const cursor = t.cursor("Busca · cursor",1380,760,66);
    t.motion(cursor,[[0,1380,760],[1.05,1310,430],[4.1,1310,430]]);
    t.clickPulse("Busca · clique",1310,430,1.02,t.a);
    [result,resultText].forEach(layer=>t.keyframes(layer,"opacity",[[0,0],[3,0],[3.35,1]]));
    t.fade(panel,.35,false); t.fade(field,.4,false);
  }

  function doubleClickFocus(t) {
    const photo = t.shape("Duplo clique · mídia", { x:960,y:540,width:1050,height:650,fill:"#242126",stroke:"#474149",strokeWidth:3,radius:42,shadow:30 });
    const subject = t.shape("Duplo clique · assunto", { shape:"circle",x:960,y:530,width:280,height:280,fill:t.b,opacity:.72 });
    const cursor = t.cursor("Duplo clique · cursor",430,790,72);
    t.motion(cursor,[[0,430,790],[1.2,930,555],[3.2,930,555]]);
    t.clickPulse("Duplo clique · pulso 1",930,555,1.22,t.a);
    t.clickPulse("Duplo clique · pulso 2",930,555,1.52,t.a);
    [photo,subject].forEach(layer=>t.keyframes(layer,"scale",[[0,1],[1.55,1],[2.3,1.32,"easeInOut"],[3.2,1.32]]));
  }

  function uiFeatureTour(t) {
    const app = t.shape("Tour · aplicativo", { x:960,y:540,width:1320,height:760,fill:"#1b1a1c",stroke:"#454046",strokeWidth:3,radius:38,shadow:34 });
    const side = t.shape("Tour · lateral", { x:465,y:540,width:250,height:760,fill:"#242126",radius:38 });
    const feature = t.shape("Tour · recurso", { x:1060,y:500,width:700,height:390,fill:"#2b272e",stroke:t.a,strokeWidth:3,radius:28 });
    const pin = t.shape("Tour · ponto", { shape:"circle",x:1320,y:390,width:38,height:38,fill:t.a,stroke:"#fff",strokeWidth:4 });
    const line = t.shape("Tour · conexão", { shape:"line",x:1420,y:335,width:250,height:0,fill:t.a,stroke:t.a,strokeWidth:4,rotation:-22 });
    const note = t.shape("Tour · nota", { x:1590,y:255,width:430,height:150,fill:"#f1ece4",radius:24,shadow:24 });
    const title = t.text("Tour · título", "EDITE EM TEMPO REAL", { x:1590,y:235,width:370,fontSize:27,fill:"#211e23",letterSpacing:2 });
    const desc = t.text("Tour · descrição", "Tudo fica sincronizado.", { x:1590,y:285,width:370,fontSize:22,fill:"#625b64",fontWeight:500 });
    t.keyframes(line,"scaleX",[[0,0],[1.1,0],[1.75,1,"easeInOut"]]);
    [pin,note,title,desc].forEach((layer,index)=>t.keyframes(layer,"opacity",[[0,0],[1.4+index*.08,0],[1.8+index*.08,1]]));
    [app,side,feature].forEach(layer=>t.fade(layer,.4,false));
  }

  function commentNotification(t) {
    const bubble = t.shape("Comentário · cartão", { x:1430,y:300,width:700,height:190,fill:"#242126",stroke:"#484149",strokeWidth:2,radius:34,shadow:34 });
    const avatar = t.shape("Comentário · avatar", { shape:"circle",x:1160,y:300,width:112,height:112,fill:t.a });
    const initials = t.text("Comentário · iniciais","AM",{x:1160,y:300,width:90,fontSize:35,fill:"#241c17"});
    const name = t.text("Comentário · nome","ANA MENDES",{x:1410,y:270,width:420,fontSize:28,fill:"#fff",align:"left"});
    const body = t.text("Comentário · texto","Esse detalhe ficou incrível!",{x:1410,y:325,width:420,fontSize:25,fill:"#d5ced5",align:"left",fontWeight:500});
    const badge = t.shape("Comentário · badge",{shape:"circle",x:1740,y:205,width:58,height:58,fill:t.b,shadow:16});
    const one = t.text("Comentário · número","1",{x:1740,y:205,width:40,fontSize:23,fill:"#fff"});
    [bubble,avatar,initials,name,body,badge,one].forEach((layer,index)=>t.keyframes(layer,"x",[[0,layer.props.x+260],[.65+index*.025,layer.props.x,"back"]]));
  }

  function radarHotspot(t) {
    const target = t.shape("Radar · alvo",{x:1180,y:470,width:540,height:330,fill:"#262328",stroke:"#4c4650",strokeWidth:2,radius:34});
    const dot = t.shape("Radar · núcleo",{shape:"circle",x:1320,y:410,width:34,height:34,fill:t.a,stroke:"#fff",strokeWidth:4});
    for(let index=0; index<3; index+=1){
      const ring=t.shape(`Radar · onda ${index+1}`,{shape:"circle",x:1320,y:410,width:80,height:80,fill:"transparent",stroke:t.a,strokeWidth:5,opacity:0});
      t.keyframes(ring,"scale",[[index*.28,0.25],[.55+index*.28,1.7,"easeOut"]]);
      t.keyframes(ring,"opacity",[[index*.28,0],[.12+index*.28,.8],[.55+index*.28,0]]);
    }
    const label=t.text("Radar · legenda","NOVO RECURSO",{x:1050,y:710,width:500,fontSize:34,fill:"#fff",letterSpacing:4});
    t.keyframes(label,"y",[[.7,760],[1.25,710,"back"]]); t.fade(target,.35,false); t.fade(dot,.25);
  }

  function cleanWipeLogo(t) {
    t.shape("Wipe logo · fundo",{x:960,y:540,width:1920,height:1080,fill:"#171513",z:-20});
    const wipe=t.shape("Wipe logo · máscara visual",{x:300,y:540,width:500,height:1080,fill:t.b,z:-8});
    const mark=t.shape("Wipe logo · símbolo",{x:960,y:500,width:260,height:260,fill:t.a,radius:58,rotation:45});
    const initials=t.text("Wipe logo · iniciais","LM",{x:960,y:500,width:240,fontSize:92,fill:"#211e20",letterSpacing:4});
    const brand=t.text("Wipe logo · marca","LUMI MOTION",{x:960,y:700,width:900,fontSize:45,fill:"#f6f0e8",letterSpacing:12});
    t.keyframes(wipe,"x",[[0,-380],[1.15,960,"easeInOut"],[1.75,2300,"easeInOut"]]);
    [mark,initials,brand].forEach((layer,index)=>t.keyframes(layer,"opacity",[[0,0],[.7+index*.1,0],[1.1+index*.1,1]]));
    t.keyframes(mark,"rotation",[[.65,-45],[1.4,45,"back"]]);
  }

  function stackedIdentityLogo(t) {
    t.shape("Stack logo · fundo",{x:960,y:540,width:1920,height:1080,fill:"#181410",z:-20});
    const blocks=[0,1,2].map(index=>t.shape(`Stack logo · bloco ${index+1}`,{x:760+index*200,y:490+index*45,width:280,height:280,fill:index===1?t.a:t.b,radius:48,rotation:-12+index*12,opacity:.82}));
    const logo=t.text("Stack logo · palavra","NORTH",{x:960,y:500,width:1000,fontSize:145,fill:"#fff",letterSpacing:10,stroke:"#181410",strokeWidth:9});
    const sub=t.text("Stack logo · assinatura","STUDIO / SINCE 2026",{x:960,y:680,width:780,fontSize:26,fill:t.a,letterSpacing:8});
    blocks.forEach((layer,index)=>{t.keyframes(layer,"y",[[0,-220-index*90],[.8+index*.12,layer.props.y,"back"]]);t.keyframes(layer,"rotation",[[0,-50+index*30],[1.1+index*.1,layer.props.rotation,"easeOut"]]);});
    t.preset(logo,"Impacto curto"); t.preset(sub,"Aparecer por letra");
  }

  function glitchCutLogo(t) {
    t.shape("Glitch · fundo",{x:960,y:540,width:1920,height:1080,fill:"#111012",z:-20});
    const slices=[-90,-45,0,45,90].map((dy,index)=>t.text(`Glitch · fatia ${index+1}`,"SIGNAL",{x:960,y:520+dy,width:980,fontSize:136,fill:index%2?t.a:"#fff",letterSpacing:14,opacity:index===2?1:.55}));
    slices.forEach((layer,index)=>t.keyframes(layer,"x",[[0,index%2?-240:220],[.12,layer.props.x],[.25,layer.props.x+(index%2?75:-70)],[.42,layer.props.x],[.72,layer.props.x+(index%2?-45:55)],[.9,layer.props.x]]));
    const line=t.shape("Glitch · corte",{x:960,y:680,width:920,height:8,fill:t.b});
    t.keyframes(line,"scaleX",[[.2,0],[.75,1,"easeInOut"]]);
  }

  function completeBrandLaunch(t) {
    t.shape("Brand launch · fundo",{x:960,y:540,width:1920,height:1080,fill:"#171411",z:-30});
    const chapter=t.text("Brand launch · capítulo","01 / IDENTIDADE",{x:250,y:180,width:520,fontSize:25,fill:t.a,align:"left",letterSpacing:6});
    const title=t.text("Brand launch · manifesto 1","IDEIAS VIRAM",{x:960,y:400,width:1500,fontSize:126,fill:"#fff",letterSpacing:2});
    const title2=t.text("Brand launch · manifesto 2","MOVIMENTO",{x:960,y:545,width:1500,fontSize:145,fill:t.b,letterSpacing:3});
    const mark=t.shape("Brand launch · marca",{x:960,y:780,width:180,height:180,fill:t.a,radius:44,rotation:45});
    const logo=t.text("Brand launch · monograma","LM",{x:960,y:780,width:170,fontSize:64,fill:"#221d19"});
    const rule=t.shape("Brand launch · régua",{x:960,y:930,width:1440,height:4,fill:"#4a443e"});
    t.preset(chapter,"Teclado"); t.preset(title,"Palavra por palavra"); t.preset(title2,"Letras embaralhadas");
    [mark,logo].forEach(layer=>t.keyframes(layer,"scale",[[2.1,0],[2.8,1.15,"back"],[3.15,1]]));
    t.keyframes(rule,"scaleX",[[0,0],[1.4,1,"easeInOut"]]);
    t.keyframes(title,"y",[[0,460],[1.1,400,"easeOut"],[6.8,400],[7.5,280,"easeInOut"]]);
    t.keyframes(title2,"y",[[0,610],[1.35,545,"easeOut"],[6.8,545],[7.5,420,"easeInOut"]]);
  }

  function creatorIdentitySystem(t) {
    t.shape("Creator ID · canvas",{x:960,y:540,width:700,height:1080,fill:"#1d1318",z:-20});
    const portrait=t.shape("Creator ID · retrato",{x:960,y:390,width:480,height:480,fill:"#38212c",stroke:t.a,strokeWidth:5,radius:240,shadow:34});
    const initials=t.text("Creator ID · retrato texto","VOCÊ",{x:960,y:390,width:390,fontSize:90,fill:"#c98da7",letterSpacing:5});
    const handle=t.text("Creator ID · handle","@CRIADOR",{x:960,y:720,width:600,fontSize:68,fill:"#fff",letterSpacing:3});
    const promise=t.text("Creator ID · promessa","CRIAR · ENSINAR · INSPIRAR",{x:960,y:810,width:610,fontSize:22,fill:t.b,letterSpacing:5});
    const follow=t.shape("Creator ID · CTA",{x:960,y:930,width:390,height:86,fill:t.a,radius:43});
    const followText=t.text("Creator ID · CTA texto","SEGUIR PERFIL",{x:960,y:930,width:340,fontSize:26,fill:"#261419",letterSpacing:3});
    [portrait,initials].forEach(layer=>t.keyframes(layer,"scale",[[0,.2],[.9,1,"back"]]));
    t.preset(handle,"Impacto curto");t.preset(promise,"Aparecer por letra");
    [follow,followText].forEach(layer=>t.keyframes(layer,"scale",[[1.8,0],[2.35,1.08,"back"],[2.6,1]]));
  }

  function techProductSystem(t) {
    t.shape("Tech ID · fundo",{x:960,y:540,width:1920,height:1080,fill:"#101512",z:-30});
    const grid=[-1,0,1].flatMap(row=>[-1,0,1].map(col=>t.shape(`Tech ID · nó ${row+2}-${col+2}`,{shape:"circle",x:960+col*340,y:540+row*230,width:24,height:24,fill:t.a,opacity:.65})));
    const card=t.shape("Tech ID · produto",{x:960,y:540,width:760,height:430,fill:"#1b2420",stroke:t.a,strokeWidth:3,radius:48,shadow:38});
    const title=t.text("Tech ID · nome","NEXUS",{x:960,y:500,width:680,fontSize:128,fill:"#fff",letterSpacing:14});
    const sub=t.text("Tech ID · assinatura","PRODUTO DIGITAL / V2.0",{x:960,y:625,width:650,fontSize:24,fill:t.b,letterSpacing:7});
    grid.forEach((layer,index)=>t.keyframes(layer,"scale",[[index*.04,0],[.5+index*.04,1,"back"]]));
    t.keyframes(card,"scale",[[.3,.7],[1.05,1,"back"]]); t.preset(title,"Letras embaralhadas");t.preset(sub,"Aparecer por letra");
  }

  function eventIdentityPackage(t) {
    t.shape("Evento ID · fundo",{x:960,y:540,width:1920,height:1080,fill:"#1b0f12",z:-30});
    const date=t.text("Evento ID · data","24—26 OUT",{x:260,y:180,width:600,fontSize:28,fill:t.a,align:"left",letterSpacing:7});
    const title=t.text("Evento ID · título 1","FUTURE",{x:960,y:410,width:1500,fontSize:170,fill:"#fff",letterSpacing:8});
    const title2=t.text("Evento ID · título 2","MOTION",{x:960,y:590,width:1500,fontSize:170,fill:t.b,letterSpacing:8});
    const city=t.text("Evento ID · cidade","SÃO PAULO · BRASIL",{x:960,y:830,width:900,fontSize:30,fill:"#e6d8d5",letterSpacing:10});
    const bars=[0,1,2,3].map(index=>t.shape(`Evento ID · barra ${index+1}`,{x:420+index*360,y:960,width:230,height:18,fill:index%2?t.a:t.b,radius:9}));
    t.preset(date,"Teclado");t.preset(title,"Titulo cinema");t.preset(title2,"Titulo cinema");t.preset(city,"Aparecer por letra");
    t.stagger(bars,"scaleX",0,1,.13,.65,"easeInOut");
  }

  function modularGridOpener(t) {
    t.shape("Grid opener · fundo",{x:960,y:540,width:1920,height:1080,fill:"#151416",z:-30});
    const cells=[];
    for(let row=0;row<3;row+=1) for(let col=0;col<5;col+=1){
      cells.push(t.shape(`Grid opener · célula ${row*5+col+1}`,{x:320+col*320,y:260+row*280,width:270,height:220,fill:(row+col)%3===0?t.a:(row+col)%3===1?t.b:"#27242a",radius:26,opacity:.82}));
    }
    const title=t.text("Grid opener · título","MODULAR",{x:960,y:500,width:1300,fontSize:155,fill:"#fff",letterSpacing:9,stroke:"#151416",strokeWidth:10});
    const sub=t.text("Grid opener · subtítulo","BUILD / MOVE / REPEAT",{x:960,y:660,width:900,fontSize:27,fill:"#fff",letterSpacing:9});
    cells.forEach((layer,index)=>t.keyframes(layer,"scale",[[index*.035,.1],[.55+index*.035,1,"back"]]));
    t.preset(title,"Impacto curto"); t.preset(sub,"Aparecer por letra");
  }

  function filmTitleSequence(t) {
    t.shape("Cinema · fundo",{x:960,y:540,width:1920,height:1080,fill:"#12110f",z:-30});
    const lineA=t.shape("Cinema · linha superior",{x:960,y:320,width:1240,height:2,fill:t.b});
    const lineB=t.shape("Cinema · linha inferior",{x:960,y:740,width:1240,height:2,fill:t.b});
    const pre=t.text("Cinema · apresentação","UM FILME DE",{x:960,y:410,width:800,fontSize:24,fill:t.a,letterSpacing:10});
    const title=t.text("Cinema · título","ENTRE TEMPOS",{x:960,y:535,width:1450,fontSize:132,fill:"#eee7dc",letterSpacing:6});
    const sub=t.text("Cinema · subtítulo","HISTÓRIAS QUE PERMANECEM",{x:960,y:655,width:1000,fontSize:25,fill:"#a9a198",letterSpacing:8});
    [lineA,lineB].forEach(layer=>t.keyframes(layer,"scaleX",[[0,0],[1.35,1,"easeInOut"]]));
    t.preset(pre,"Aparecer por letra");t.preset(title,"Titulo cinema");t.fade(sub,.9);
    t.keyframes(title,"letterSpacing",[[0,24],[2.3,6,"easeInOut"]]);
  }

  function shapeRhythmOpener(t) {
    t.shape("Rhythm · fundo",{x:960,y:540,width:1920,height:1080,fill:"#171316",z:-30});
    const shapes=[];
    for(let index=0;index<8;index+=1){
      const angle=index*Math.PI/4; const x=960+Math.cos(angle)*360; const y=540+Math.sin(angle)*310;
      const shape=t.shape(`Rhythm · forma ${index+1}`,{shape:index%2?"circle":"rect",x,y,width:120+index*12,height:120+index*12,fill:index%2?t.a:t.b,radius:28,rotation:index*22,opacity:.75});
      t.motion(shape,[[0,960,540],[.7+index*.06,x,y],[3.3,x,y],[4.2,960,540]]);
      t.keyframes(shape,"rotation",[[0,index*22-120],[1.4,index*22,"back"],[4.2,index*22+160,"easeInOut"]]); shapes.push(shape);
    }
    const title=t.text("Rhythm · título","RHYTHM",{x:960,y:540,width:1050,fontSize:140,fill:"#fff",letterSpacing:14,stroke:"#171316",strokeWidth:9});
    t.preset(title,"Impacto curto");
  }

  function broadcastLower(t) {
    const live=t.shape("Broadcast · ao vivo",{x:170,y:840,width:220,height:104,fill:t.a,radius:12});
    const liveText=t.text("Broadcast · ao vivo texto","AO VIVO",{x:170,y:840,width:190,fontSize:30,fill:"#251719",letterSpacing:3});
    const bar=t.shape("Broadcast · faixa",{x:780,y:840,width:1000,height:104,fill:"#ede5d8",radius:12});
    const headline=t.text("Broadcast · manchete","NOTÍCIA PRINCIPAL EM DESTAQUE",{x:760,y:840,width:900,fontSize:32,fill:"#242022",align:"left"});
    const ticker=t.shape("Broadcast · ticker",{x:960,y:932,width:1700,height:46,fill:"#242022",radius:6});
    const tickerText=t.text("Broadcast · ticker texto","ÚLTIMAS NOTÍCIAS  ·  INFORMAÇÃO EM TEMPO REAL  ·",{x:960,y:932,width:1550,fontSize:20,fill:t.b,letterSpacing:3});
    [live,liveText,bar,headline].forEach((layer,index)=>t.keyframes(layer,"x",[[0,layer.props.x-600-index*40],[.75+index*.05,layer.props.x,"easeOut"]]));
    t.keyframes(ticker,"scaleX",[[.3,0],[1.1,1,"easeInOut"]]);t.keyframes(tickerText,"x",[[0,1250],[7,-200,"linear"]]);
  }

  function sportsScoreboard(t) {
    const card=t.shape("Placar · painel",{x:960,y:160,width:1080,height:180,fill:"#1c1a1e",stroke:"#4b4550",strokeWidth:2,radius:28,shadow:26});
    const teamA=t.text("Placar · time A","LUM",{x:590,y:145,width:280,fontSize:48,fill:"#fff",letterSpacing:5});
    const score=t.text("Placar · resultado","2  —  1",{x:960,y:145,width:340,fontSize:70,fill:t.a,letterSpacing:6});
    const teamB=t.text("Placar · time B","MTN",{x:1330,y:145,width:280,fontSize:48,fill:"#fff",letterSpacing:5});
    const clock=t.text("Placar · relógio","78:42",{x:960,y:220,width:300,fontSize:22,fill:t.b,letterSpacing:5});
    [card,teamA,score,teamB,clock].forEach((layer,index)=>t.keyframes(layer,"y",[[0,layer.props.y-240],[.6+index*.05,layer.props.y,"back"]]));
    t.keyframes(score,"scale",[[2.1,1],[2.45,1.25,"back"],[2.8,1]]);
  }

  function podcastSpeakerLower(t) {
    const card=t.shape("Podcast lower · cartão",{x:450,y:830,width:760,height:178,fill:"#201e1b",stroke:t.a,strokeWidth:2,radius:32,shadow:28});
    const avatar=t.shape("Podcast lower · avatar",{shape:"circle",x:145,y:830,width:130,height:130,fill:t.b,stroke:"#f4eee3",strokeWidth:4});
    const initials=t.text("Podcast lower · iniciais","MF",{x:145,y:830,width:100,fontSize:42,fill:"#1d211d"});
    const name=t.text("Podcast lower · nome","MARINA FREITAS",{x:450,y:800,width:580,fontSize:42,fill:"#fff",align:"left"});
    const role=t.text("Podcast lower · cargo","HOST · PODCAST ORIGINAL",{x:450,y:860,width:580,fontSize:22,fill:t.a,align:"left",letterSpacing:4});
    [card,avatar,initials,name,role].forEach((layer,index)=>t.keyframes(layer,"x",[[0,layer.props.x-380-index*25],[.7+index*.04,layer.props.x,"back"]]));
  }

  function tiktokCreatorStory(t) {
    t.shape("TikTok story · canvas 9:16",{x:960,y:540,width:608,height:1080,fill:"#171416",z:-30});
    const media=t.shape("TikTok story · mídia",{x:960,y:420,width:540,height:650,fill:"#30252b",radius:42,shadow:26});
    const hook=t.text("TikTok story · hook 1","VOCÊ PRECISA",{x:960,y:205,width:540,fontSize:62,fill:"#fff",stroke:"#181416",strokeWidth:7});
    const hook2=t.text("TikTok story · hook 2","VER ISSO",{x:960,y:275,width:540,fontSize:70,fill:t.a,stroke:"#181416",strokeWidth:7});
    const caption=t.shape("TikTok story · legenda fundo",{x:900,y:810,width:470,height:112,fill:"#201c20",radius:22,opacity:.92});
    const captionText=t.text("TikTok story · legenda","3 passos que mudam tudo",{x:900,y:810,width:420,fontSize:28,fill:"#fff",align:"left"});
    const cta=t.text("TikTok story · CTA","SIGA PARA MAIS  →",{x:900,y:945,width:460,fontSize:24,fill:t.b,letterSpacing:4});
    [hook,hook2].forEach(layer=>t.preset(layer,"Impacto curto"));t.preset(media,"Entrada suave");
    [caption,captionText].forEach(layer=>t.keyframes(layer,"x",[[1.1,650],[1.7,layer.props.x,"back"]]));t.preset(cta,"Aparecer por letra");
  }

  function reelsProductLaunch(t) {
    t.shape("Reels produto · canvas 9:16",{x:960,y:540,width:608,height:1080,fill:"#181415",z:-30});
    const badge=t.shape("Reels produto · badge",{x:960,y:160,width:260,height:62,fill:t.a,radius:31});
    const badgeText=t.text("Reels produto · badge texto","NOVO",{x:960,y:160,width:220,fontSize:23,fill:"#2b1d13",letterSpacing:5});
    const product=t.shape("Reels produto · produto",{x:960,y:505,width:430,height:430,fill:"#2a222a",stroke:t.b,strokeWidth:4,radius:92,rotation:-6,shadow:35});
    const label=t.text("Reels produto · placeholder","PRODUTO",{x:960,y:505,width:360,fontSize:62,fill:t.b,letterSpacing:6});
    const title=t.text("Reels produto · título","FEITO PARA IR ALÉM",{x:960,y:805,width:540,fontSize:47,fill:"#fff"});
    const cta=t.shape("Reels produto · CTA",{x:960,y:925,width:400,height:82,fill:t.b,radius:41});
    const ctaText=t.text("Reels produto · CTA texto","CONHEÇA AGORA",{x:960,y:925,width:350,fontSize:24,fill:"#231b2a",letterSpacing:3});
    [badge,badgeText].forEach(layer=>t.preset(layer,"Pop rapido"));[product,label].forEach(layer=>t.keyframes(layer,"scale",[[.25,.2],[1.15,1.06,"back"],[1.45,1]]));
    t.preset(title,"Palavra por palavra");[cta,ctaText].forEach(layer=>t.keyframes(layer,"y",[[1.7,1080],[2.35,925,"back"]]));
  }

  function storiesCountdown(t) {
    t.shape("Stories countdown · canvas",{x:960,y:540,width:608,height:1080,fill:"#211315",z:-30});
    const top=t.text("Stories countdown · eyebrow","COMEÇA EM",{x:960,y:220,width:500,fontSize:27,fill:t.a,letterSpacing:8});
    const number=t.text("Stories countdown · número","03",{x:960,y:515,width:520,fontSize:310,fill:"#fff",stroke:t.b,strokeWidth:6});
    const days=t.text("Stories countdown · unidade","DIAS",{x:960,y:700,width:480,fontSize:54,fill:t.b,letterSpacing:12});
    const reminder=t.shape("Stories countdown · lembrete",{x:960,y:900,width:420,height:88,fill:t.a,radius:44});
    const reminderText=t.text("Stories countdown · lembrete texto","ATIVAR LEMBRETE",{x:960,y:900,width:370,fontSize:23,fill:"#2a1b12",letterSpacing:3});
    t.preset(top,"Aparecer por letra");t.keyframes(number,"scale",[[0,1.7],[.8,1,"back"],[2.2,1],[2.55,.1,"easeIn"],[2.75,1.25,"back"],[3.05,1]]);
    t.preset(days,"Impacto curto");[reminder,reminderText].forEach(layer=>t.keyframes(layer,"y",[[1.4,1080],[2.1,900,"back"]]));
  }

  function instagramCarousel(t) {
    t.shape("Carousel · canvas 1:1",{x:960,y:540,width:1080,height:1080,fill:"#1b1518",z:-30});
    const number=t.text("Carousel · página","01 / 05",{x:560,y:155,width:420,fontSize:24,fill:t.a,align:"left",letterSpacing:6});
    const title=t.text("Carousel · título 1","DESIGN QUE",{x:960,y:390,width:950,fontSize:112,fill:"#fff"});
    const title2=t.text("Carousel · título 2","CONVERTE",{x:960,y:515,width:950,fontSize:126,fill:t.b});
    const body=t.text("Carousel · corpo","Uma ideia por slide. Hierarquia clara. Movimento com propósito.",{x:960,y:690,width:820,fontSize:34,fill:"#d6ccd1",fontWeight:500});
    const arrow=t.shape("Carousel · próximo",{shape:"circle",x:1320,y:900,width:112,height:112,fill:t.a});
    const arrowText=t.text("Carousel · próximo texto","→",{x:1320,y:900,width:90,fontSize:53,fill:"#2b1c17"});
    t.preset(number,"Teclado");t.preset(title,"Palavra por palavra");t.preset(title2,"Impacto curto");t.fade(body,.75);
    [arrow,arrowText].forEach(layer=>t.keyframes(layer,"scale",[[1.5,0],[2.15,1.12,"back"],[2.4,1]]));
  }

  function instagramFeedPromo(t) {
    t.shape("Feed promo · canvas 1:1",{x:960,y:540,width:1080,height:1080,fill:"#181513",z:-30});
    const photo=t.shape("Feed promo · mídia",{x:740,y:490,width:570,height:690,fill:"#332a27",stroke:"#504642",strokeWidth:3,radius:44,rotation:-5,shadow:30});
    const accent=t.shape("Feed promo · acento",{x:1190,y:470,width:360,height:500,fill:t.b,radius:38,rotation:7,opacity:.82});
    const title=t.text("Feed promo · título","NOVA\nCOLEÇÃO",{x:1210,y:440,width:410,fontSize:76,fill:"#fff",letterSpacing:2});
    const date=t.text("Feed promo · data","DISPONÍVEL 24.10",{x:1190,y:680,width:380,fontSize:22,fill:t.a,letterSpacing:5});
    const brand=t.text("Feed promo · marca","SUA MARCA",{x:960,y:930,width:800,fontSize:26,fill:"#eee7df",letterSpacing:10});
    [photo,accent].forEach((layer,index)=>{t.keyframes(layer,"scale",[[index*.15,.3],[.95+index*.15,1,"back"]]);t.keyframes(layer,"rotation",[[0,layer.props.rotation-18],[1.1,layer.props.rotation,"easeOut"]]);});
    t.preset(title,"Impacto curto");t.preset(date,"Aparecer por letra");t.fade(brand,.7);
  }

  function youtubeShortsHook(t) {
    t.shape("Shorts hook · canvas",{x:960,y:540,width:608,height:1080,fill:"#171515",z:-30});
    const strip=t.shape("Shorts hook · faixa",{x:960,y:295,width:608,height:140,fill:t.a,rotation:-3});
    const hook=t.text("Shorts hook · texto 1","NÃO FAÇA",{x:960,y:275,width:550,fontSize:77,fill:"#fff",stroke:"#251516",strokeWidth:8,rotation:-3});
    const hook2=t.text("Shorts hook · texto 2","ISSO ANTES",{x:960,y:420,width:550,fontSize:68,fill:"#fff",stroke:"#171515",strokeWidth:7});
    const hook3=t.text("Shorts hook · texto 3","DE ASSISTIR",{x:960,y:505,width:550,fontSize:68,fill:t.b,stroke:"#171515",strokeWidth:7});
    const media=t.shape("Shorts hook · mídia",{x:960,y:770,width:520,height:380,fill:"#292527",radius:38});
    t.keyframes(strip,"scaleX",[[0,0],[.45,1,"easeInOut"]]);[hook,hook2,hook3].forEach((layer,index)=>t.keyframes(layer,"scale",[[.15+index*.16,.2],[.65+index*.16,1,"back"]]));t.preset(media,"Entrada suave");
  }

  function verticalPlayerLayout(t) {
    const outer=t.shape("Player vertical · entorno",{x:960,y:540,width:1920,height:1080,fill:"#141314",z:-30});
    const player=t.shape("Player vertical · vídeo 9:16",{x:960,y:540,width:608,height:1080,fill:"#242124",stroke:t.a,strokeWidth:4,radius:30,shadow:38});
    const media=t.text("Player vertical · placeholder","SUA MÍDIA\n9:16",{x:960,y:500,width:500,fontSize:62,fill:"#817983",letterSpacing:5});
    const progress=t.shape("Player vertical · progresso base",{x:960,y:995,width:500,height:8,fill:"#4b454d",radius:4});
    const played=t.shape("Player vertical · progresso",{x:835,y:995,width:250,height:8,fill:t.a,radius:4});
    const caption=t.shape("Player vertical · legenda fundo",{x:960,y:850,width:500,height:104,fill:"#171517",radius:20,opacity:.85});
    const captionText=t.text("Player vertical · legenda","Legenda pronta para editar",{x:960,y:850,width:450,fontSize:27,fill:"#fff"});
    t.keyframes(played,"scaleX",[[0,0],[7.5,1,"linear"]]);t.fade(player,.25,false);t.fade(media,.45);[caption,captionText].forEach(layer=>t.fade(layer,.3));
  }

  function reelsSafeLayout(t) {
    t.shape("Reels safe · fundo",{x:960,y:540,width:608,height:1080,fill:"#20191b",z:-30});
    t.safeFrame("Reels safe",540,900,"REELS · 9:16",t.a);
    const top=t.shape("Reels safe · reserva topo",{x:960,y:80,width:608,height:160,fill:t.a,opacity:.12});
    const bottom=t.shape("Reels safe · reserva inferior",{x:960,y:980,width:608,height:200,fill:t.b,opacity:.12});
    const right=t.shape("Reels safe · ações laterais",{x:1215,y:600,width:98,height:520,fill:t.b,opacity:.1});
    const title=t.text("Reels safe · instrução","CONTEÚDO PRINCIPAL\nDENTRO DA ÁREA",{x:920,y:510,width:430,fontSize:44,fill:"#f5ede8",letterSpacing:2});
    [top,bottom,right].forEach((layer,index)=>t.keyframes(layer,"opacity",[[0,0],[.45+index*.12,layer.props.opacity]]));t.preset(title,"Impacto curto");
  }

  function tiktokSafeLayout(t) {
    t.shape("TikTok safe · fundo",{x:960,y:540,width:608,height:1080,fill:"#151b19",z:-30});
    t.safeFrame("TikTok safe",520,900,"TIKTOK · 9:16",t.a);
    const copy=t.text("TikTok safe · título","GANCHO\nAQUI",{x:900,y:310,width:410,fontSize:82,fill:"#fff",align:"left"});
    const captions=t.shape("TikTok safe · legendas",{x:900,y:760,width:430,height:150,fill:"#242a27",stroke:t.b,strokeWidth:2,radius:24});
    const captionsText=t.text("TikTok safe · legenda","Área segura para legendas",{x:900,y:760,width:380,fontSize:25,fill:t.b});
    const controls=t.shape("TikTok safe · reserva lateral",{x:1220,y:670,width:88,height:520,fill:t.a,opacity:.12});
    t.preset(copy,"Impacto curto");[captions,captionsText].forEach(layer=>t.keyframes(layer,"y",[[.6,900],[1.2,760,"back"]]));t.fade(controls,.3,false);
  }

  function instagramFeedLayout(t) {
    t.shape("Feed layout · entorno",{x:960,y:540,width:1920,height:1080,fill:"#141314",z:-30});
    const square=t.shape("Feed layout · canvas 1:1",{x:960,y:540,width:1080,height:1080,fill:"#211b1e",stroke:t.a,strokeWidth:4,shadow:36});
    const safe=t.shape("Feed layout · margem segura",{x:960,y:540,width:920,height:920,fill:"transparent",stroke:t.b,strokeWidth:3,radius:30,opacity:.75});
    const label=t.text("Feed layout · formato","INSTAGRAM FEED · 1:1",{x:960,y:120,width:760,fontSize:25,fill:t.a,letterSpacing:7});
    const title=t.text("Feed layout · placeholder","CONTEÚDO\nQUADRADO",{x:960,y:540,width:800,fontSize:94,fill:"#fff",letterSpacing:4});
    t.keyframes(square,"scale",[[0,.75],[.8,1,"back"]]);t.keyframes(safe,"scale",[[.35,.7],[1.15,1,"back"]]);t.preset(label,"Aparecer por letra");t.preset(title,"Impacto curto");
  }

  function shortsSafeLayout(t) {
    t.shape("Shorts safe · fundo",{x:960,y:540,width:608,height:1080,fill:"#1c1717",z:-30});
    t.safeFrame("Shorts safe",530,910,"SHORTS · VERTICAL / QUADRADO",t.a);
    const media=t.shape("Shorts safe · mídia",{x:960,y:525,width:500,height:780,fill:"#282323",stroke:"#4a4141",strokeWidth:2,radius:34});
    const hook=t.text("Shorts safe · gancho","HOOK EM 2 SEGUNDOS",{x:960,y:225,width:480,fontSize:43,fill:"#fff",stroke:"#1c1717",strokeWidth:6});
    const sub=t.text("Shorts safe · suporte","Mantenha texto e rosto no centro",{x:960,y:825,width:450,fontSize:25,fill:t.b});
    t.preset(media,"Entrada suave");t.preset(hook,"Impacto curto");t.fade(sub,.7);
  }

  function phoneShowcaseLayout(t) {
    t.shape("Phone showcase · fundo",{x:960,y:540,width:1920,height:1080,fill:"#161416",z:-30});
    const phone=t.shape("Phone showcase · aparelho",{x:960,y:535,width:520,height:970,fill:"#242126",stroke:"#eee6dd",strokeWidth:8,radius:78,shadow:42});
    const screen=t.shape("Phone showcase · tela editável",{x:960,y:535,width:472,height:900,fill:"#352a38",stroke:"#4a424c",strokeWidth:2,radius:58});
    const notch=t.shape("Phone showcase · ilha",{x:960,y:125,width:190,height:42,fill:"#111",radius:21});
    const copy=t.text("Phone showcase · placeholder","ARRASTE SUA\nMÍDIA AQUI",{x:960,y:500,width:400,fontSize:52,fill:t.a,letterSpacing:3});
    const swipe=t.shape("Phone showcase · indicador",{x:960,y:960,width:160,height:7,fill:"#eee6dd",radius:4});
    [phone,screen,notch,copy,swipe].forEach((layer,index)=>t.keyframes(layer,"scale",[[index*.035,.6],[.8+index*.035,1,"back"]]));
    t.keyframes(phone,"rotation",[[0,-10],[1.2,0,"easeOut"],[6.6,0],[7.4,5,"easeInOut"]]);
  }

  const CATALOG = [
    item("lower-signal", "Signal Bar", "lower", 5, ["16:9", "9:16"], "#29d7ff", "#536dfe", "signalBar"),
    item("lower-minimal", "Minimal Line", "lower", 5, ["16:9", "9:16"], "#f7f8ff", "#7c8cff", "minimalLine"),
    item("lower-editorial", "Editorial Index", "lower", 6, ["16:9"], "#ffcc66", "#ff6b6b", "editorialLower"),
    item("lower-creator", "Creator Tag", "lower", 5, ["16:9", "9:16"], "#ff4fa3", "#7b5cff", "creatorTag"),

    item("opener-kinetic", "Kinetic Split", "opener", 4, ["16:9", "9:16"], "#48e6c1", "#0aa7ff", "kineticSplit"),
    item("opener-editorial", "Editorial Frame", "opener", 5, ["16:9"], "#f5efe2", "#dfaa5b", "editorialFrame"),
    item("opener-neon", "Neon Pulse", "opener", 4, ["16:9", "9:16"], "#00e5ff", "#bf4cff", "neonPulse"),
    item("opener-product", "Product Launch", "opener", 5, ["16:9", "1:1"], "#b7ff4a", "#35cfff", "productLaunch"),

    item("caption-karaoke", "Karaoke Focus", "caption", 4, ["16:9", "9:16"], "#ffe45c", "#ff7a45", "karaokeFocus"),
    item("caption-documentary", "Documentary Sub", "caption", 5, ["16:9"], "#ffffff", "#7697ff", "documentaryCaption"),
    item("caption-pop", "Pop Reaction", "caption", 3, ["16:9", "9:16", "1:1"], "#ff5bd8", "#865dff", "popCaption"),
    item("caption-clean", "Clean Creator", "caption", 5, ["16:9", "9:16"], "#d9ff65", "#50ddb4", "cleanCaption"),

    item("logo-orbit", "Orbit Reveal", "logo", 4, ["16:9", "1:1"], "#71e1ff", "#7559ff", "orbitLogo"),
    item("logo-aperture", "Aperture Reveal", "logo", 4, ["16:9", "1:1"], "#ffbc52", "#ff5c7c", "apertureLogo"),
    item("logo-glass", "Glass Monogram", "logo", 5, ["16:9", "9:16", "1:1"], "#b9f5ff", "#6c7cff", "glassLogo"),

    item("callout-pin", "Precision Pin", "callout", 5, ["16:9", "9:16"], "#4de0ff", "#3b72ff", "precisionPin"),
    item("callout-feature", "Feature Bracket", "callout", 5, ["16:9"], "#c3ff66", "#48d3a5", "featureBracket"),
    item("callout-quote", "Quote Bubble", "callout", 6, ["16:9", "1:1"], "#ffcb68", "#ff718e", "quoteBubble"),

    item("stats-percent", "Hero Percentage", "stats", 5, ["16:9", "9:16"], "#71f7c5", "#00a6ff", "heroPercentage"),
    item("stats-triple", "Triple Metrics", "stats", 6, ["16:9"], "#ffcf5c", "#ff6b8b", "tripleMetrics"),
    item("stats-growth", "Growth Signal", "stats", 6, ["16:9", "1:1"], "#64f0a5", "#2f8cff", "growthSignal"),

    item("social-hook", "Reels Hook", "social", 5, ["9:16"], "#ffde59", "#ff4f8b", "reelsHook"),
    item("social-story", "Story Promo", "social", 7, ["9:16"], "#72e8ff", "#6f54ff", "storyPromo"),
    item("social-podcast", "Podcast Clip", "social", 8, ["9:16", "1:1"], "#d7ff67", "#3fd5a4", "podcastClip"),
    item("social-quote", "Bold Quote", "social", 6, ["9:16", "1:1"], "#ffad61", "#ff5d85", "socialQuote"),

    item("end-subscribe", "Subscribe Focus", "end", 5, ["16:9", "9:16"], "#ff526e", "#ff9b55", "subscribeEnd"),
    item("end-next", "Next Video", "end", 7, ["16:9"], "#58ddff", "#6a66ff", "nextVideoEnd"),
    item("end-credits", "Minimal Credits", "end", 6, ["16:9", "9:16"], "#f4f5ff", "#828da8", "creditsEnd"),
    item("end-brand", "Brand Sign-off", "end", 5, ["16:9", "1:1"], "#a9ff66", "#44d4b4", "brandEnd"),

    item("interaction-cursor-click", "Cursor Glide + Click", "interaction", 4, ["16:9", "9:16", "1:1"], "#b88cff", "#ffca62", "cursorGlideClick"),
    item("interaction-drag-select", "Desktop Drag Select", "interaction", 5, ["16:9"], "#a78bfa", "#f4f1ff", "desktopDragSelect"),
    item("interaction-hover-card", "Hover Tooltip Tour", "interaction", 5, ["16:9", "9:16"], "#ffb454", "#f5f2ea", "hoverTooltipTour"),
    item("interaction-mobile-tap", "Mobile Tap + Swipe", "interaction", 5, ["9:16"], "#ff8b73", "#ffe07a", "mobileTapSwipe"),
    item("interaction-search", "Search Command Demo", "interaction", 6, ["16:9", "9:16"], "#a78bfa", "#60d394", "searchCommandDemo"),
    item("interaction-double-click", "Double Click Focus", "interaction", 4, ["16:9", "1:1"], "#e7b66b", "#b997ff", "doubleClickFocus"),

    item("callout-ui-tour", "UI Feature Tour", "callout", 7, ["16:9", "9:16"], "#d7a7ff", "#ffcf70", "uiFeatureTour"),
    item("callout-comment", "Comment Notification", "callout", 5, ["16:9", "9:16", "1:1"], "#ffb45e", "#ff7d9f", "commentNotification"),
    item("callout-hotspot", "Radar Hotspot", "callout", 5, ["16:9", "9:16"], "#8be0b0", "#fff0a8", "radarHotspot"),

    item("logo-clean-wipe", "Clean Wipe Reveal", "logo", 4, ["16:9", "9:16", "1:1"], "#f4eee4", "#b589ff", "cleanWipeLogo"),
    item("logo-stacked", "Stacked Identity Reveal", "logo", 6, ["16:9", "1:1"], "#ffcf66", "#ef6f6c", "stackedIdentityLogo"),
    item("logo-glitch-cut", "Glitch Cut Logo", "logo", 4, ["16:9", "9:16"], "#ff5a88", "#61e2a7", "glitchCutLogo"),

    item("identity-brand-launch", "Complete Brand Launch", "identity", 9, ["16:9", "9:16", "1:1"], "#ffcc66", "#9b7cff", "completeBrandLaunch"),
    item("identity-creator", "Creator Identity System", "identity", 8, ["9:16", "1:1"], "#ff7d98", "#ffc85c", "creatorIdentitySystem"),
    item("identity-tech", "Tech Product System", "identity", 8, ["16:9", "9:16"], "#8ce0b5", "#b797ff", "techProductSystem"),
    item("identity-event", "Event Identity Package", "identity", 8, ["16:9", "9:16", "1:1"], "#ff9d55", "#ff557f", "eventIdentityPackage"),

    item("opener-modular-grid", "Modular Grid Opener", "opener", 6, ["16:9", "1:1"], "#d4adff", "#f0c86c", "modularGridOpener"),
    item("opener-film-title", "Film Title Sequence", "opener", 7, ["16:9"], "#e8ded0", "#c19963", "filmTitleSequence"),
    item("opener-shape-rhythm", "Shape Rhythm Opener", "opener", 5, ["16:9", "9:16", "1:1"], "#ff846d", "#b891ff", "shapeRhythmOpener"),

    item("lower-broadcast", "Broadcast News Lower", "lower", 7, ["16:9"], "#ed5b62", "#f4dfbb", "broadcastLower"),
    item("lower-score", "Sports Scoreboard", "lower", 8, ["16:9", "9:16"], "#b797ff", "#ffcf5f", "sportsScoreboard"),
    item("lower-podcast", "Podcast Speaker ID", "lower", 6, ["16:9", "9:16", "1:1"], "#e2b067", "#98d6ad", "podcastSpeakerLower"),

    item("social-tiktok-creator", "TikTok Creator Story", "social", 8, ["9:16"], "#ff596e", "#74e0bb", "tiktokCreatorStory"),
    item("social-reels-product", "Reels Product Launch", "social", 8, ["9:16"], "#ffac5e", "#bb8cff", "reelsProductLaunch"),
    item("social-story-countdown", "Stories Countdown", "social", 7, ["9:16"], "#f6cb64", "#ef7692", "storiesCountdown"),
    item("social-instagram-carousel", "Instagram Carousel", "social", 7, ["1:1"], "#ff9870", "#b28cff", "instagramCarousel"),
    item("social-feed-promo", "Instagram Feed Promo", "social", 7, ["1:1"], "#f1c86a", "#d980a1", "instagramFeedPromo"),
    item("social-shorts-hook", "YouTube Shorts Hook", "social", 7, ["9:16", "1:1"], "#ff5f62", "#f5eee4", "youtubeShortsHook"),

    item("layout-vertical-player", "Vertical Player 9:16", "layout", 8, ["9:16"], "#b98dff", "#f2c968", "verticalPlayerLayout"),
    item("layout-reels-safe", "Reels Safe-Zone Canvas", "layout", 8, ["9:16"], "#ff8b79", "#f6e4ce", "reelsSafeLayout"),
    item("layout-tiktok-safe", "TikTok Safe-Zone Canvas", "layout", 8, ["9:16"], "#79d9bc", "#f4d06b", "tiktokSafeLayout"),
    item("layout-feed-square", "Instagram Feed 1:1", "layout", 8, ["1:1"], "#db94b4", "#f2c572", "instagramFeedLayout"),
    item("layout-shorts-safe", "Shorts Vertical Canvas", "layout", 8, ["9:16", "1:1"], "#ef6565", "#f0ede6", "shortsSafeLayout"),
    item("layout-phone-showcase", "Phone Screen Showcase", "layout", 8, ["9:16", "16:9"], "#b58cff", "#ecc46d", "phoneShowcaseLayout"),
  ];

  function item(id, name, category, duration, aspect, accent, accent2, builder) {
    return {
      id,
      name,
      category,
      categoryLabel: CATEGORIES[category].label,
      aspect,
      duration,
      accent,
      accent2,
      icon: CATEGORIES[category].icon,
      builder,
      formats: aspect.map((ratio) => ({ ratio, ...FORMAT_PROFILES[ratio] })),
      tags: `${id} ${builder} ${name} ${CATEGORIES[category].label} ${aspect.join(" ")} ${SEARCH_ALIASES[category] || ""}`.toLowerCase(),
    };
  }

  class Templates {
    constructor(store) {
      this.store = store;
      this.items = CATALOG.map((definition) => ({
        ...definition,
        action: () => this.apply(definition.id),
      }));
      installTemplateStyles();
    }

    apply(id) {
      const definition = CATALOG.find((entry) => entry.id === id);
      const builder = definition && BUILDERS[definition.builder];
      if (!definition || !builder) return;
      this.store.beginTransaction(`template:${definition.id}`);
      try {
        const context = new TemplateContext(this.store, definition);
        builder(context);
        context.finish();
      } finally {
        this.store.endTransaction(`template:${definition.id}`);
      }
    }
  }

  class TemplateContext {
    constructor(store, definition) {
      this.store = store;
      this.definition = definition;
      this.start = store.currentTime;
      this.layers = [];
      this.groupId = `template-${definition.id}-${Date.now().toString(36)}`;
      this.a = definition.accent;
      this.b = definition.accent2;
    }

    shape(name, props, options = {}) {
      return this.add("shape", name, props, options);
    }

    text(name, text, props, options = {}) {
      return this.add("text", name, { text, ...props }, options);
    }

    add(type, name, props, options) {
      const layer = this.store.addLayer(type, {
        name,
        start: this.start + Number(options.offset || 0),
        duration: Number(options.duration || this.definition.duration),
        props,
      });
      layer.groupId = this.groupId;
      layer.templateMeta = {
        id: this.definition.id,
        name: this.definition.name,
        category: this.definition.category,
        aspect: [...this.definition.aspect],
      };
      this.layers.push(layer);
      return layer;
    }

    keyframes(layer, property, points) {
      layer.animations = layer.animations || {};
      layer.animations[property] = points.map(([offset, value, ease = "easeOut"]) => ({
        time: layer.start + offset,
        value,
        ease,
      }));
      return layer;
    }

    motion(layer, points, type = "autoBezier") {
      layer.motionPath = {
        type,
        points: points.map(([offset, x, y, ease = "easeInOut"]) => ({
          time: layer.start + offset,
          x,
          y,
          ease,
        })),
      };
      if (type === "autoBezier" && Editor.SvgLibrary?.autoSmooth) {
        Editor.SvgLibrary.autoSmooth(layer.motionPath.points);
      }
      return layer;
    }

    stagger(layers, property, from, to, step = 0.08, duration = 0.55, ease = "easeOut") {
      layers.forEach((layer, index) => this.keyframes(layer, property, [
        [index * step, typeof from === "function" ? from(layer, index) : from],
        [index * step + duration, typeof to === "function" ? to(layer, index) : to, ease],
      ]));
      return layers;
    }

    cursor(name, x, y, size = 72, fill = "#f7f3ea") {
      const pointer = this.text(name, "➤", {
        x, y, width: size * 1.8, height: size * 1.8, fontSize: size,
        fill, stroke: "#171717", strokeWidth: Math.max(2, size * 0.055),
        rotation: -38, shadow: 14, fontWeight: 900,
      });
      pointer.isCursorGraphic = true;
      return pointer;
    }

    clickPulse(name, x, y, offset = 1.8, color = this.a) {
      const pulse = this.shape(name, {
        shape: "circle", x, y, width: 92, height: 92, fill: "transparent",
        stroke: color, strokeWidth: 8, opacity: 0, scale: 0.18,
      }, { offset });
      this.keyframes(pulse, "scale", [[0, 0.18], [0.24, 1.15, "easeOut"], [0.52, 1.65, "easeOut"]]);
      this.keyframes(pulse, "opacity", [[0, 0], [0.04, 0.95], [0.52, 0]]);
      return pulse;
    }

    safeFrame(name, width, height, label, color = this.a) {
      const frame = this.shape(`${name} · área`, {
        x: 960, y: 540, width, height, fill: "transparent", stroke: color,
        strokeWidth: 3, radius: 28, opacity: 0.84,
      });
      const tag = this.text(`${name} · formato`, label, {
        x: 960, y: 540 - height / 2 + 42, width: Math.min(width - 40, 520),
        fontSize: 22, fill: color, letterSpacing: 4, fontWeight: 750,
      });
      return [frame, tag];
    }

    fade(layer, duration = 0.45, out = true) {
      layer.transitionIn = { name: "Fade", duration, ease: "easeOut" };
      if (out) layer.transitionOut = { name: "Fade", duration, ease: "easeIn" };
      return layer;
    }

    preset(layer, name) {
      Editor.Presets.apply(layer, name);
      return layer;
    }

    finish() {
      const selected = this.layers.slice().reverse().find((layer) => layer.type === "text") || this.layers[this.layers.length - 1];
      if (selected) this.store.setSelected(selected.id);
      this.store.emit(`template:${this.definition.id}`);
    }
  }

  const BUILDERS = {
    signalBar(t) {
      const box = t.shape("Signal · painel", { x: 460, y: 850, width: 760, height: 150, fill: "#101722", stroke: t.a, strokeWidth: 2, radius: 28, opacity: 0.96, shadow: 24 });
      const bar = t.shape("Signal · acento", { x: 104, y: 850, width: 18, height: 150, fill: t.a, radius: 9 });
      const title = t.text("Signal · nome", "NOME DO CONVIDADO", { x: 455, y: 823, width: 650, fontSize: 52, fill: "#ffffff", align: "left", fontWeight: 800 });
      const role = t.text("Signal · cargo", "CARGO · EMPRESA", { x: 455, y: 880, width: 650, fontSize: 25, fill: t.a, align: "left", fontWeight: 650, letterSpacing: 3 });
      [box, bar, title, role].forEach((layer, index) => t.keyframes(layer, "x", [[0, layer.props.x - 170 - index * 16], [0.7 + index * 0.05, layer.props.x, "back"]]));
      [box, bar, title, role].forEach((layer) => t.fade(layer, 0.32));
    },

    minimalLine(t) {
      const line = t.shape("Minimal · linha", { shape: "line", x: 390, y: 884, width: 620, height: 0, fill: t.a, stroke: t.a, strokeWidth: 4 });
      const name = t.text("Minimal · nome", "ALEX MARTINS", { x: 390, y: 810, width: 620, fontSize: 56, fill: "#ffffff", align: "left", letterSpacing: 2 });
      const role = t.text("Minimal · cargo", "Direção criativa", { x: 390, y: 855, width: 620, fontSize: 27, fill: "#c9cede", align: "left", fontWeight: 500 });
      t.keyframes(line, "scaleX", [[0, 0], [0.65, 1, "easeInOut"]]);
      t.preset(name, "Aparecer por letra");
      t.fade(role, 0.55);
    },

    editorialLower(t) {
      const tag = t.shape("Editorial · índice", { x: 174, y: 804, width: 118, height: 118, fill: t.a, radius: 12, shadow: 18 });
      const number = t.text("Editorial · número", "01", { x: 174, y: 804, width: 90, fontSize: 48, fill: "#18130d", fontWeight: 900 });
      const title = t.text("Editorial · nome", "CAPÍTULO / PESSOA", { x: 520, y: 795, width: 560, fontSize: 47, fill: "#ffffff", align: "left", fontWeight: 850 });
      const role = t.text("Editorial · contexto", "Contexto editorial em uma linha", { x: 520, y: 850, width: 560, fontSize: 25, fill: "#c9c5bc", align: "left", fontWeight: 450 });
      [tag, number].forEach((layer) => t.preset(layer, "Pop rapido"));
      [title, role].forEach((layer) => t.keyframes(layer, "x", [[0, layer.props.x - 110], [0.75, layer.props.x, "easeOut"]]));
    },

    creatorTag(t) {
      const card = t.shape("Creator · cartão", { x: 400, y: 835, width: 700, height: 144, fill: "#17131f", stroke: "#4b405c", strokeWidth: 2, radius: 72, shadow: 28 });
      const avatar = t.shape("Creator · avatar", { shape: "circle", x: 122, y: 835, width: 104, height: 104, fill: t.b, stroke: "#ffffff", strokeWidth: 4 });
      const initials = t.text("Creator · iniciais", "LM", { x: 122, y: 835, width: 90, fontSize: 34, fill: "#ffffff" });
      const handle = t.text("Creator · handle", "@seuperfil", { x: 372, y: 815, width: 350, fontSize: 43, fill: "#ffffff", align: "left" });
      const role = t.text("Creator · bio", "Criador · Motion designer", { x: 372, y: 860, width: 350, fontSize: 24, fill: "#c7bed5", align: "left", fontWeight: 500 });
      const follow = t.shape("Creator · seguir", { x: 654, y: 835, width: 154, height: 62, fill: t.a, radius: 31 });
      const cta = t.text("Creator · CTA", "SEGUIR", { x: 654, y: 835, width: 130, fontSize: 22, fill: "#ffffff", letterSpacing: 2 });
      [card, avatar, initials, handle, role, follow, cta].forEach((layer, index) => t.keyframes(layer, "y", [[0, layer.props.y + 150 + index * 4], [0.72, layer.props.y, "back"]]));
    },

    kineticSplit(t) {
      const bg = t.shape("Kinetic · fundo", { x: 960, y: 540, width: 1920, height: 1080, fill: "#091117", z: -20 });
      const blockA = t.shape("Kinetic · bloco A", { x: 420, y: 540, width: 840, height: 1080, fill: "#102f35", z: -10 });
      const blockB = t.shape("Kinetic · bloco B", { x: 1450, y: 540, width: 940, height: 1080, fill: "#101b36", z: -9 });
      const top = t.text("Kinetic · linha 1", "MOVA", { x: 960, y: 425, width: 1500, fontSize: 178, fill: "#ffffff", letterSpacing: 12, shadow: 18 });
      const bottom = t.text("Kinetic · linha 2", "IDEIAS", { x: 960, y: 610, width: 1500, fontSize: 184, fill: t.a, letterSpacing: 8 });
      t.keyframes(blockA, "x", [[0, -420], [0.8, 420, "easeInOut"]]);
      t.keyframes(blockB, "x", [[0, 2350], [0.8, 1450, "easeInOut"]]);
      t.preset(top, "Impacto curto");
      t.preset(bottom, "Letras embaralhadas");
      t.fade(bg, 0.2);
    },

    editorialFrame(t) {
      t.shape("Editorial opener · fundo", { x: 960, y: 540, width: 1920, height: 1080, fill: "#15130f", z: -20 });
      const frame = t.shape("Editorial opener · moldura", { x: 960, y: 540, width: 1640, height: 800, fill: "#15130f", stroke: t.a, strokeWidth: 5, radius: 8, z: -10 });
      const issue = t.text("Editorial opener · edição", "EDIÇÃO 01 · 2026", { x: 960, y: 285, width: 900, fontSize: 24, fill: t.a, letterSpacing: 9, fontWeight: 600 });
      const title = t.text("Editorial opener · título 1", "HISTÓRIAS", { x: 960, y: 455, width: 1350, fontSize: 116, fill: "#f7f0df", letterSpacing: 2 });
      const title2 = t.text("Editorial opener · título 2", "QUE MOVEM", { x: 960, y: 595, width: 1350, fontSize: 116, fill: "#f7f0df", letterSpacing: 2 });
      const sub = t.text("Editorial opener · subtítulo", "UMA SÉRIE ORIGINAL", { x: 960, y: 785, width: 900, fontSize: 25, fill: "#c2b8a7", letterSpacing: 8, fontWeight: 500 });
      t.keyframes(frame, "scale", [[0, 1.12], [1.2, 1, "easeInOut"]]);
      t.preset(issue, "Teclado");
      t.preset(title, "Titulo cinema");
      t.preset(title2, "Titulo cinema");
      t.fade(sub, 0.8);
    },

    neonPulse(t) {
      t.shape("Neon · fundo", { x: 960, y: 540, width: 1920, height: 1080, fill: "#070812", z: -30 });
      const ringA = t.shape("Neon · órbita A", { shape: "circle", x: 960, y: 540, width: 560, height: 560, fill: "#070812", stroke: t.a, strokeWidth: 10, shadow: 42, shadowColor: t.a, z: -10 });
      const ringB = t.shape("Neon · órbita B", { shape: "circle", x: 960, y: 540, width: 720, height: 720, fill: "#070812", stroke: t.b, strokeWidth: 4, shadow: 32, shadowColor: t.b, z: -11 });
      const title = t.text("Neon · título", "PULSE", { x: 960, y: 515, width: 1000, fontSize: 162, fill: "#ffffff", letterSpacing: 18, shadow: 42, shadowColor: t.a });
      const sub = t.text("Neon · subtítulo", "THE NIGHT IS YOURS", { x: 960, y: 640, width: 850, fontSize: 26, fill: t.a, letterSpacing: 9, fontWeight: 600 });
      t.keyframes(ringA, "scale", [[0, 0.25], [0.8, 1.08, "back"], [1.2, 1]]);
      t.keyframes(ringB, "scale", [[0, 0.15], [1.05, 1, "back"]]);
      t.preset(title, "Neon texto");
      t.preset(sub, "Aparecer por letra");
    },

    productLaunch(t) {
      t.shape("Product · fundo", { x: 960, y: 540, width: 1920, height: 1080, fill: "#0a100d", z: -20 });
      const pill = t.shape("Product · badge", { x: 960, y: 300, width: 300, height: 62, fill: t.a, radius: 31 });
      const badge = t.text("Product · badge texto", "NOVO · 2026", { x: 960, y: 300, width: 260, fontSize: 23, fill: "#10200a", letterSpacing: 4 });
      const title = t.text("Product · título 1", "CRIADO PARA", { x: 960, y: 455, width: 1450, fontSize: 120, fill: "#ffffff", letterSpacing: -2 });
      const title2 = t.text("Product · título 2", "IR ALÉM", { x: 960, y: 585, width: 1450, fontSize: 120, fill: "#ffffff", letterSpacing: -2 });
      const sub = t.text("Product · subtítulo", "Apresente sua próxima grande ideia.", { x: 960, y: 735, width: 1000, fontSize: 34, fill: "#b9c9c0", fontWeight: 500 });
      [pill, badge].forEach((layer) => t.preset(layer, "Pop rapido"));
      t.preset(title, "Palavra por palavra");
      t.preset(title2, "Palavra por palavra");
      t.fade(sub, 0.75);
    },

    karaokeFocus(t) {
      const back = t.shape("Karaoke · fundo", { x: 960, y: 875, width: 1300, height: 132, fill: "#0c0d12", radius: 28, opacity: 0.92, shadow: 26 });
      const sentence = t.text("Karaoke · frase", "FAÇA CADA PALAVRA CONTAR", { x: 960, y: 875, width: 1200, fontSize: 63, fill: "#ffffff", stroke: "#000000", strokeWidth: 5 });
      sentence.textAnimation = { enabled: true, inEnabled: true, outEnabled: false, inMode: "wordFade", duration: 2.4, inDuration: 2.4, speed: 1 };
      t.keyframes(back, "scaleX", [[0, 0.2], [0.4, 1, "back"]]);
    },

    documentaryCaption(t) {
      const back = t.shape("Documentary · placa", { x: 960, y: 885, width: 1420, height: 130, fill: "#0a0b0e", radius: 8, opacity: 0.86 });
      const line = t.shape("Documentary · linha", { x: 290, y: 885, width: 8, height: 82, fill: t.b, radius: 4 });
      const caption = t.text("Documentary · legenda", "Uma legenda sóbria, legível e pronta para editar.", { x: 990, y: 885, width: 1280, fontSize: 45, fill: "#ffffff", align: "left", fontWeight: 560 });
      [back, line, caption].forEach((layer) => t.fade(layer, 0.24));
    },

    popCaption(t) {
      const bubble = t.shape("Pop · bolha", { x: 960, y: 820, width: 980, height: 170, fill: t.a, stroke: "#ffffff", strokeWidth: 5, radius: 85, rotation: -2, shadow: 28 });
      const caption = t.text("Pop · legenda", "ISSO MUDOU TUDO!", { x: 960, y: 820, width: 900, fontSize: 72, fill: "#ffffff", stroke: "#551447", strokeWidth: 7, rotation: -2 });
      [bubble, caption].forEach((layer) => t.preset(layer, "Pop rapido"));
      t.keyframes(bubble, "rotation", [[0, -8], [0.5, -2, "back"]]);
    },

    cleanCaption(t) {
      const accent = t.shape("Clean caption · destaque", { x: 960, y: 890, width: 1060, height: 96, fill: t.a, radius: 16 });
      const caption = t.text("Clean caption · texto", "CLAREZA É PARTE DO DESIGN", { x: 960, y: 890, width: 990, fontSize: 47, fill: "#11231b", letterSpacing: 1 });
      t.keyframes(accent, "scaleX", [[0, 0], [0.5, 1, "easeInOut"]]);
      t.preset(caption, "Aparecer por letra");
    },

    orbitLogo(t) {
      t.shape("Orbit · fundo", { x: 960, y: 540, width: 1920, height: 1080, fill: "#090b16", z: -20 });
      const orbit = t.shape("Orbit · anel", { shape: "circle", x: 960, y: 540, width: 440, height: 440, fill: "#090b16", stroke: t.a, strokeWidth: 5, shadow: 34, shadowColor: t.a });
      const dot = t.shape("Orbit · satélite", { shape: "circle", x: 1174, y: 540, width: 34, height: 34, fill: t.b, shadow: 24, shadowColor: t.b });
      const logo = t.text("Orbit · logo editável", "LOGO", { x: 960, y: 540, width: 620, fontSize: 104, fill: "#ffffff", letterSpacing: 12 });
      t.keyframes(orbit, "scale", [[0, 0.1], [0.9, 1, "back"]]);
      t.keyframes(dot, "rotation", [[0, -180], [1.2, 0, "easeOut"]]);
      t.preset(logo, "Letras embaralhadas");
    },

    apertureLogo(t) {
      t.shape("Aperture · fundo", { x: 960, y: 540, width: 1920, height: 1080, fill: "#110b0b", z: -30 });
      for (let index = 0; index < 6; index += 1) {
        const blade = t.shape(`Aperture · lâmina ${index + 1}`, { x: 960, y: 540, width: 520, height: 92, fill: index % 2 ? t.a : t.b, radius: 46, rotation: index * 30, opacity: 0.7, z: -10 });
        t.keyframes(blade, "rotation", [[0, index * 30 - 70], [1.1, index * 30, "easeInOut"]]);
        t.keyframes(blade, "scaleX", [[0, 0.1], [0.9, 1, "back"]]);
      }
      const logo = t.text("Aperture · logo editável", "LOGO", { x: 960, y: 540, width: 650, fontSize: 112, fill: "#ffffff", stroke: "#2c0e12", strokeWidth: 8, letterSpacing: 10 });
      t.preset(logo, "Impacto curto");
    },

    glassLogo(t) {
      t.shape("Glass logo · fundo", { x: 960, y: 540, width: 1920, height: 1080, fill: "#0b1020", z: -30 });
      const glow = t.shape("Glass logo · halo", { shape: "circle", x: 960, y: 540, width: 620, height: 620, fill: t.b, opacity: 0.22, blur: 24, z: -20 });
      const card = t.shape("Glass logo · cartão", { x: 960, y: 540, width: 520, height: 520, fill: "#18233c", stroke: "#b9f5ff", strokeWidth: 3, radius: 108, opacity: 0.9, shadow: 42, shadowColor: t.b, z: -10 });
      const logo = t.text("Glass logo · monograma editável", "LM", { x: 960, y: 520, width: 430, fontSize: 188, fill: "#ffffff", letterSpacing: 6, shadow: 25, shadowColor: t.a });
      const brand = t.text("Glass logo · marca", "SUA MARCA", { x: 960, y: 675, width: 430, fontSize: 25, fill: t.a, letterSpacing: 9, fontWeight: 600 });
      t.keyframes(glow, "scale", [[0, 0.4], [1.2, 1.08, "easeOut"], [2.1, 1]]);
      [card, logo].forEach((layer) => t.preset(layer, "Pop rapido"));
      t.preset(brand, "Aparecer por letra");
    },

    precisionPin(t) {
      const pin = t.shape("Pin · ponto", { shape: "circle", x: 1230, y: 420, width: 34, height: 34, fill: t.a, stroke: "#ffffff", strokeWidth: 4, shadow: 18, shadowColor: t.a });
      const line = t.shape("Pin · linha", { shape: "line", x: 1055, y: 515, width: 380, height: 0, fill: t.a, stroke: t.a, strokeWidth: 4, rotation: -28 });
      const card = t.shape("Pin · cartão", { x: 700, y: 630, width: 530, height: 152, fill: "#111827", stroke: t.a, strokeWidth: 2, radius: 22, shadow: 24 });
      const title = t.text("Pin · título", "DETALHE IMPORTANTE", { x: 700, y: 605, width: 450, fontSize: 34, fill: "#ffffff", align: "left" });
      const sub = t.text("Pin · descrição", "Explique este ponto em uma linha.", { x: 700, y: 655, width: 450, fontSize: 23, fill: "#aebbd0", align: "left", fontWeight: 500 });
      t.keyframes(line, "scaleX", [[0, 0], [0.65, 1, "easeInOut"]]);
      [pin, card, title, sub].forEach((layer, index) => t.keyframes(layer, "opacity", [[0.18 + index * 0.08, 0], [0.55 + index * 0.08, 1]]));
    },

    featureBracket(t) {
      const top = t.shape("Bracket · topo", { x: 1340, y: 350, width: 460, height: 8, fill: t.a, radius: 4 });
      const side = t.shape("Bracket · lateral", { x: 1566, y: 500, width: 8, height: 308, fill: t.a, radius: 4 });
      const title = t.text("Bracket · título", "RECURSO PREMIUM", { x: 1320, y: 430, width: 430, fontSize: 43, fill: "#ffffff", align: "right" });
      const sub = t.text("Bracket · descrição 1", "Destaque um benefício", { x: 1320, y: 510, width: 430, fontSize: 27, fill: "#c9d4cf", align: "right", fontWeight: 500 });
      const sub2 = t.text("Bracket · descrição 2", "sem esconder o conteúdo.", { x: 1320, y: 550, width: 430, fontSize: 27, fill: "#c9d4cf", align: "right", fontWeight: 500 });
      t.keyframes(top, "scaleX", [[0, 0], [0.6, 1, "easeInOut"]]);
      t.keyframes(side, "scaleY", [[0.35, 0], [0.9, 1, "easeInOut"]]);
      [title, sub, sub2].forEach((layer) => t.keyframes(layer, "x", [[0, layer.props.x + 100], [0.85, layer.props.x, "easeOut"]]));
    },

    quoteBubble(t) {
      const bubble = t.shape("Quote · cartão", { x: 620, y: 520, width: 930, height: 360, fill: "#19161a", stroke: t.a, strokeWidth: 3, radius: 46, shadow: 32 });
      const quote = t.text("Quote · fala 1", "“UMA IDEIA FORTE", { x: 620, y: 450, width: 790, fontSize: 58, fill: "#ffffff", align: "left", fontWeight: 800 });
      const quote2 = t.text("Quote · fala 2", "MUDA A DIREÇÃO.”", { x: 620, y: 535, width: 790, fontSize: 58, fill: "#ffffff", align: "left", fontWeight: 800 });
      const author = t.text("Quote · autor", "— NOME DA PESSOA", { x: 620, y: 650, width: 790, fontSize: 25, fill: t.a, align: "left", letterSpacing: 4, fontWeight: 600 });
      t.preset(bubble, "Pop rapido");
      t.preset(quote, "Palavra por palavra");
      t.preset(quote2, "Palavra por palavra");
      t.fade(author, 0.8);
    },

    heroPercentage(t) {
      const ring = t.shape("Percentual · anel", { shape: "circle", x: 960, y: 520, width: 440, height: 440, fill: "#0b1616", stroke: t.a, strokeWidth: 18, shadow: 38, shadowColor: t.b });
      const value = t.text("Percentual · valor", "87%", { x: 960, y: 505, width: 400, fontSize: 150, fill: "#ffffff", letterSpacing: -5 });
      const label = t.text("Percentual · legenda", "CRESCIMENTO", { x: 960, y: 655, width: 500, fontSize: 27, fill: t.a, letterSpacing: 7, fontWeight: 650 });
      t.keyframes(ring, "rotation", [[0, -180], [1.3, 0, "easeOut"]]);
      t.keyframes(ring, "scale", [[0, 0.2], [0.85, 1, "back"]]);
      t.preset(value, "Impacto curto");
      t.preset(label, "Aparecer por letra");
    },

    tripleMetrics(t) {
      const metrics = [["2.4M", "ALCANCE"], ["+38%", "CONVERSÃO"], ["12X", "RETORNO"]];
      metrics.forEach(([value, label], index) => {
        const x = 430 + index * 530;
        const card = t.shape(`Métrica ${index + 1} · cartão`, { x, y: 540, width: 440, height: 320, fill: index === 1 ? "#241b13" : "#15171d", stroke: index === 1 ? t.a : "#353a48", strokeWidth: 3, radius: 34, shadow: 24 });
        const number = t.text(`Métrica ${index + 1} · valor`, value, { x, y: 505, width: 380, fontSize: 100, fill: index === 1 ? t.a : "#ffffff" });
        const text = t.text(`Métrica ${index + 1} · rótulo`, label, { x, y: 640, width: 360, fontSize: 22, fill: "#b8bdc9", letterSpacing: 5, fontWeight: 600 });
        [card, number, text].forEach((layer) => t.keyframes(layer, "y", [[index * 0.12, layer.props.y + 110], [0.75 + index * 0.12, layer.props.y, "back"]]));
      });
    },

    growthSignal(t) {
      const panel = t.shape("Growth · painel", { x: 960, y: 540, width: 1260, height: 620, fill: "#0d1715", stroke: "#28443d", strokeWidth: 3, radius: 42, shadow: 30 });
      const title = t.text("Growth · título", "CRESCIMENTO MENSAL", { x: 960, y: 320, width: 1060, fontSize: 35, fill: "#dfeae6", align: "left", letterSpacing: 4 });
      const value = t.text("Growth · valor", "+64%", { x: 960, y: 455, width: 1060, fontSize: 128, fill: t.a, align: "left" });
      const line = t.shape("Growth · tendência", { shape: "line", x: 1020, y: 675, width: 760, height: 0, fill: t.a, stroke: t.a, strokeWidth: 12, rotation: -12, shadow: 22, shadowColor: t.a });
      const dot = t.shape("Growth · ponto", { shape: "circle", x: 1395, y: 595, width: 38, height: 38, fill: t.b, stroke: "#ffffff", strokeWidth: 4 });
      t.fade(panel, 0.4);
      t.preset(value, "Impacto curto");
      t.keyframes(line, "scaleX", [[0.6, 0], [1.5, 1, "easeInOut"]]);
      t.keyframes(dot, "scale", [[1.25, 0], [1.65, 1.25, "back"], [1.9, 1]]);
    },

    reelsHook(t) {
      const rail = t.shape("Reels · rail", { x: 960, y: 540, width: 700, height: 1080, fill: "#121116", stroke: "#32303a", strokeWidth: 3, radius: 34, z: -20 });
      const badge = t.shape("Reels · badge", { x: 960, y: 250, width: 340, height: 70, fill: t.a, radius: 35 });
      const badgeText = t.text("Reels · badge texto", "PARE O SCROLL", { x: 960, y: 250, width: 300, fontSize: 25, fill: "#241b08", letterSpacing: 3 });
      const line1 = t.text("Reels · hook 1", "3 SEGREDOS", { x: 960, y: 455, width: 630, fontSize: 90, fill: "#ffffff" });
      const line2 = t.text("Reels · hook 2", "QUE NINGUÉM", { x: 960, y: 565, width: 630, fontSize: 74, fill: t.a });
      const line3 = t.text("Reels · hook 3", "TE CONTOU", { x: 960, y: 660, width: 630, fontSize: 82, fill: "#ffffff" });
      t.fade(rail, 0.3);
      [badge, badgeText].forEach((layer) => t.preset(layer, "Pop rapido"));
      [line1, line2, line3].forEach((layer, index) => {
        layer.textAnimation = { enabled: true, inEnabled: true, outEnabled: false, inMode: "wordZoom", duration: 0.8, inDuration: 0.8, speed: 1 };
        t.keyframes(layer, "opacity", [[0.35 + index * 0.18, 0], [0.58 + index * 0.18, 1]]);
      });
    },

    storyPromo(t) {
      t.shape("Story · fundo vertical", { x: 960, y: 540, width: 700, height: 1080, fill: "#0b1023", z: -20 });
      const eyebrow = t.text("Story · eyebrow", "LANÇAMENTO", { x: 960, y: 220, width: 600, fontSize: 24, fill: t.a, letterSpacing: 8 });
      const title = t.text("Story · título 1", "NOVA", { x: 960, y: 370, width: 620, fontSize: 104, fill: "#ffffff" });
      const title2 = t.text("Story · título 2", "COLEÇÃO", { x: 960, y: 485, width: 620, fontSize: 104, fill: "#ffffff" });
      const card = t.shape("Story · mídia placeholder", { x: 960, y: 720, width: 520, height: 330, fill: "#19274b", stroke: t.a, strokeWidth: 3, radius: 42, shadow: 30 });
      const placeholder = t.text("Story · placeholder", "SUA MÍDIA", { x: 960, y: 720, width: 420, fontSize: 34, fill: "#8fa7d8", letterSpacing: 5 });
      const cta = t.text("Story · CTA", "DESLIZE PARA CONHECER →", { x: 960, y: 950, width: 600, fontSize: 23, fill: "#ffffff", letterSpacing: 3 });
      t.preset(eyebrow, "Aparecer por letra");
      t.preset(title, "Palavra por palavra");
      t.preset(title2, "Palavra por palavra");
      [card, placeholder].forEach((layer) => t.preset(layer, "Entrada suave"));
      t.keyframes(cta, "x", [[0, 900], [1.2, 960, "easeOut"]]);
    },

    podcastClip(t) {
      t.shape("Podcast · fundo vertical", { x: 960, y: 540, width: 700, height: 1080, fill: "#101712", z: -20 });
      const photo = t.shape("Podcast · foto placeholder", { x: 960, y: 385, width: 520, height: 520, fill: "#21372b", stroke: t.a, strokeWidth: 4, radius: 260, shadow: 34 });
      const initials = t.text("Podcast · iniciais", "HOST", { x: 960, y: 385, width: 420, fontSize: 86, fill: "#8ac4a7", letterSpacing: 8 });
      const show = t.text("Podcast · programa", "PODCAST ORIGINAL", { x: 960, y: 715, width: 600, fontSize: 25, fill: t.a, letterSpacing: 7 });
      const quote = t.text("Podcast · corte 1", "“A MELHOR DECISÃO", { x: 960, y: 795, width: 620, fontSize: 49, fill: "#ffffff" });
      const quote2 = t.text("Podcast · corte 2", "É COMEÇAR.”", { x: 960, y: 865, width: 620, fontSize: 49, fill: "#ffffff" });
      const waveform = t.shape("Podcast · waveform", { shape: "line", x: 960, y: 965, width: 430, height: 0, fill: t.a, stroke: t.a, strokeWidth: 8 });
      [photo, initials].forEach((layer) => t.preset(layer, "Entrada suave"));
      t.preset(show, "Aparecer por letra");
      t.preset(quote, "Palavra por palavra");
      t.preset(quote2, "Palavra por palavra");
      t.keyframes(waveform, "scaleX", [[0.8, 0.1], [1.8, 1, "easeInOut"]]);
    },

    socialQuote(t) {
      t.shape("Quote social · fundo", { x: 960, y: 540, width: 700, height: 1080, fill: "#1b1013", z: -20 });
      const mark = t.text("Quote social · marca", "“", { x: 960, y: 310, width: 540, fontSize: 250, fill: t.a, opacity: 0.75 });
      const quote = t.text("Quote social · linha 1", "O FUTURO", { x: 960, y: 485, width: 620, fontSize: 73, fill: "#ffffff", letterSpacing: 1 });
      const quote2 = t.text("Quote social · linha 2", "É CRIADO", { x: 960, y: 585, width: 620, fontSize: 73, fill: "#ffffff", letterSpacing: 1 });
      const quote3 = t.text("Quote social · linha 3", "EM MOVIMENTO.", { x: 960, y: 685, width: 620, fontSize: 67, fill: "#ffffff", letterSpacing: 1 });
      const author = t.text("Quote social · autor", "— SUA MARCA", { x: 960, y: 875, width: 540, fontSize: 25, fill: t.a, letterSpacing: 7 });
      t.keyframes(mark, "scale", [[0, 0.2], [0.65, 1, "back"]]);
      t.preset(quote, "Palavra por palavra");
      t.preset(quote2, "Palavra por palavra");
      t.preset(quote3, "Palavra por palavra");
      t.preset(author, "Aparecer por letra");
    },

    subscribeEnd(t) {
      t.shape("Subscribe · fundo", { x: 960, y: 540, width: 1920, height: 1080, fill: "#120b10", z: -20 });
      const title = t.text("Subscribe · título", "GOSTOU?", { x: 960, y: 350, width: 1200, fontSize: 145, fill: "#ffffff" });
      const sub = t.text("Subscribe · subtítulo", "FIQUE PARA O PRÓXIMO.", { x: 960, y: 500, width: 1100, fontSize: 52, fill: "#c7bac1", letterSpacing: 3 });
      const button = t.shape("Subscribe · botão", { x: 960, y: 685, width: 450, height: 112, fill: t.a, radius: 56, shadow: 34, shadowColor: t.a });
      const cta = t.text("Subscribe · CTA", "INSCREVA-SE", { x: 960, y: 685, width: 380, fontSize: 37, fill: "#ffffff", letterSpacing: 4 });
      t.preset(title, "Impacto curto");
      t.fade(sub, 0.7);
      [button, cta].forEach((layer) => t.keyframes(layer, "scale", [[0.8, 0.2], [1.25, 1.12, "back"], [1.55, 1]]));
    },

    nextVideoEnd(t) {
      t.shape("Next · fundo", { x: 960, y: 540, width: 1920, height: 1080, fill: "#090e1d", z: -20 });
      const eyebrow = t.text("Next · eyebrow", "CONTINUE ASSISTINDO", { x: 520, y: 250, width: 720, fontSize: 28, fill: t.a, align: "left", letterSpacing: 7 });
      const title = t.text("Next · título 1", "PRÓXIMO", { x: 520, y: 430, width: 720, fontSize: 112, fill: "#ffffff", align: "left" });
      const title2 = t.text("Next · título 2", "VÍDEO", { x: 520, y: 560, width: 720, fontSize: 112, fill: "#ffffff", align: "left" });
      const thumb = t.shape("Next · vídeo placeholder", { x: 1340, y: 535, width: 700, height: 410, fill: "#17294c", stroke: t.a, strokeWidth: 4, radius: 38, shadow: 36 });
      const placeholder = t.text("Next · placeholder", "THUMBNAIL", { x: 1340, y: 535, width: 600, fontSize: 46, fill: "#829bd2", letterSpacing: 7 });
      const arrow = t.text("Next · seta", "→", { x: 520, y: 760, width: 300, fontSize: 100, fill: t.a, align: "left" });
      t.preset(eyebrow, "Aparecer por letra");
      t.preset(title, "Palavra por palavra");
      t.preset(title2, "Palavra por palavra");
      [thumb, placeholder].forEach((layer) => t.preset(layer, "Entrada suave"));
      t.keyframes(arrow, "x", [[0, 450], [0.65, 520, "easeOut"], [1.2, 550, "easeInOut"], [1.8, 520, "easeInOut"]]);
    },

    creditsEnd(t) {
      t.shape("Credits · fundo", { x: 960, y: 540, width: 1920, height: 1080, fill: "#0d0e11", z: -20 });
      const title = t.text("Credits · título", "CRÉDITOS", { x: 960, y: 275, width: 900, fontSize: 64, fill: "#ffffff", letterSpacing: 12 });
      const roleA = t.text("Credits · direção", "DIREÇÃO", { x: 680, y: 455, width: 420, fontSize: 24, fill: "#7f8799", align: "right", letterSpacing: 5 });
      const nameA = t.text("Credits · direção nome", "SEU NOME", { x: 1240, y: 455, width: 420, fontSize: 35, fill: "#ffffff", align: "left" });
      const roleB = t.text("Credits · edição", "EDIÇÃO", { x: 680, y: 555, width: 420, fontSize: 24, fill: "#7f8799", align: "right", letterSpacing: 5 });
      const nameB = t.text("Credits · edição nome", "OUTRO NOME", { x: 1240, y: 555, width: 420, fontSize: 35, fill: "#ffffff", align: "left" });
      const thanks = t.text("Credits · agradecimento", "OBRIGADO POR ASSISTIR", { x: 960, y: 790, width: 1000, fontSize: 26, fill: t.a, letterSpacing: 8 });
      [title, roleA, nameA, roleB, nameB, thanks].forEach((layer, index) => t.keyframes(layer, "opacity", [[index * 0.12, 0], [0.6 + index * 0.12, 1]]));
    },

    brandEnd(t) {
      t.shape("Brand end · fundo", { x: 960, y: 540, width: 1920, height: 1080, fill: "#09130f", z: -20 });
      const mark = t.shape("Brand end · símbolo", { shape: "circle", x: 960, y: 425, width: 250, height: 250, fill: t.a, shadow: 38, shadowColor: t.b });
      const initials = t.text("Brand end · iniciais", "LM", { x: 960, y: 425, width: 220, fontSize: 92, fill: "#102018", letterSpacing: 4 });
      const brand = t.text("Brand end · marca", "SUA MARCA", { x: 960, y: 625, width: 900, fontSize: 78, fill: "#ffffff", letterSpacing: 12 });
      const url = t.text("Brand end · URL", "SEUSITE.COM", { x: 960, y: 735, width: 700, fontSize: 25, fill: t.a, letterSpacing: 8 });
      [mark, initials].forEach((layer) => t.preset(layer, "Pop rapido"));
      t.preset(brand, "Aparecer por letra");
      t.preset(url, "Teclado");
    },
    cursorGlideClick,
    desktopDragSelect,
    hoverTooltipTour,
    mobileTapSwipe,
    searchCommandDemo,
    doubleClickFocus,
    uiFeatureTour,
    commentNotification,
    radarHotspot,
    cleanWipeLogo,
    stackedIdentityLogo,
    glitchCutLogo,
    completeBrandLaunch,
    creatorIdentitySystem,
    techProductSystem,
    eventIdentityPackage,
    modularGridOpener,
    filmTitleSequence,
    shapeRhythmOpener,
    broadcastLower,
    sportsScoreboard,
    podcastSpeakerLower,
    tiktokCreatorStory,
    reelsProductLaunch,
    storiesCountdown,
    instagramCarousel,
    instagramFeedPromo,
    youtubeShortsHook,
    verticalPlayerLayout,
    reelsSafeLayout,
    tiktokSafeLayout,
    instagramFeedLayout,
    shortsSafeLayout,
    phoneShowcaseLayout,
  };

  function installTemplateStyles() {
    if (document.getElementById("lumi-template-catalog-styles")) return;
    const style = document.createElement("style");
    style.id = "lumi-template-catalog-styles";
    style.textContent = `
      .template-catalog-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:12px 0 8px; }
      .template-catalog-head strong { color:#f4f6fb; }
      .template-count { color:#8f98aa; font-size:11px; }
      .template-filter-row { display:flex; gap:6px; overflow-x:auto; padding:1px 0 10px; scrollbar-width:thin; }
      .template-filter-row .chip { white-space:nowrap; font-size:11px; padding:5px 8px; border-radius:999px; }
      .template-filter-row .chip.active { color:#fff; background:#6f4fa8; border-color:#9270c9; }
      .template-grid.premium { grid-template-columns:repeat(auto-fill,minmax(132px,1fr)); gap:11px; }
      .template-grid.premium .template-card { min-height:150px; border-radius:12px; background:#242424; box-shadow:0 8px 24px rgba(0,0,0,.16); transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease; }
      .template-grid.premium .template-card:hover { transform:translateY(-2px); box-shadow:0 12px 28px rgba(0,0,0,.28); }
      .template-preview { position:relative; height:86px; display:grid; place-items:center; overflow:hidden; background:linear-gradient(135deg,var(--template-a),var(--template-b)); }
      .template-preview::before { content:""; position:absolute; width:76px; height:76px; border:1px solid rgba(255,255,255,.36); border-radius:24px; transform:rotate(18deg); box-shadow:0 0 30px rgba(255,255,255,.18); }
      .template-preview::after { content:""; position:absolute; inset:0; background:linear-gradient(145deg,rgba(255,255,255,.23),transparent 43%,rgba(0,0,0,.28)); }
      .template-icon { position:relative; z-index:1; color:white; font-size:22px; font-weight:900; letter-spacing:1px; text-shadow:0 2px 12px rgba(0,0,0,.35); }
      .template-category-badge { position:absolute; z-index:2; left:6px; top:6px; padding:3px 5px; border-radius:5px; background:#202020; color:#fff; font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:.7px; }
      .template-card-body { padding:8px 9px 9px; }
      .template-card-body .preset-name { padding:0; color:#f3f5f8; font-size:12px; font-weight:750; }
      .template-meta { display:flex; justify-content:space-between; gap:5px; margin-top:5px; color:#9099aa; font-size:9px; }
      .template-empty { grid-column:1/-1; padding:28px 12px; text-align:center; color:#999; border:1px dashed #484848; border-radius:12px; }
    `;
    document.head.appendChild(style);
  }

  function patchTemplateCatalog() {
    if (!Editor.MediaLibrary || Editor.MediaLibrary.prototype.__premiumTemplates) return;
    Editor.MediaLibrary.prototype.__premiumTemplates = true;
    Editor.MediaLibrary.prototype.renderTemplates = function renderPremiumTemplates() {
      const search = Editor.Utils.$("#panelSearch");
      const query = String(search?.value || "").trim().toLowerCase();
      const activeCategory = this.templateCategory || "all";
      const filtered = this.templates.items.filter((entry) => {
        const categoryMatches = activeCategory === "all" || entry.category === activeCategory;
        return categoryMatches && (!query || entry.tags.includes(query));
      });
      const filters = [
        ["all", "Todos"],
        ...Object.entries(CATEGORIES).map(([id, category]) => [id, category.label]),
      ];
      this.panel.innerHTML = `
        ${this.selectionContext()}
        <div class="template-catalog-head"><strong>Motion graphics</strong><span class="template-count">${filtered.length} de ${this.templates.items.length}</span></div>
        <div class="template-filter-row">${filters.map(([id, label]) => `<span class="chip ${activeCategory === id ? "active" : ""}" data-template-category="${escapeAttr(id)}">${escapeHtml(label)}</span>`).join("")}</div>
        <div class="template-grid premium">${filtered.length ? filtered.map((entry) => `
          <div class="template-card" data-template-id="${escapeAttr(entry.id)}" title="Aplicar ${escapeAttr(entry.name)}">
            <div class="template-preview" style="--template-a:${escapeAttr(entry.accent)};--template-b:${escapeAttr(entry.accent2)}">
              <span class="template-category-badge">${escapeHtml(entry.categoryLabel)}</span>
              <span class="template-icon">${escapeHtml(entry.icon)}</span>
            </div>
            <div class="template-card-body">
              <div class="preset-name">${escapeHtml(entry.name)}</div>
              <div class="template-meta"><span>${escapeHtml(entry.aspect.join(" · "))}</span><span>${entry.duration}s</span></div>
            </div>
          </div>`).join("") : `<div class="template-empty">Nenhum template encontrado.</div>`}</div>`;

      this.panel.querySelectorAll("[data-template-id]").forEach((node) => node.addEventListener("click", () => {
        const template = this.templates.items.find((entry) => entry.id === node.dataset.templateId);
        template?.action();
      }));
      this.panel.querySelectorAll("[data-template-category]").forEach((node) => node.addEventListener("click", () => {
        this.templateCategory = node.dataset.templateCategory;
        this.render();
      }));
      if (search) {
        search.oninput = () => {
          if (this.active === "templates") this.render();
        };
      }
    };
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  patchTemplateCatalog();
  Editor.Templates = Templates;
  Editor.TemplateCatalog = CATALOG;
  Editor.TemplateFormats = FORMAT_PROFILES;
})();
