(function(){
  const now=Date.now(), MIN=60000;
  const P=(id,name,cat,price,veg,tags,c)=>({c:c||["#d9722e","#f4c98d"],id,cat,img:null,veg,desc:"",name,tags:tags||[],price,spice:1,stock:true,addons:[],variants:[]});
  const menu=[P("pt","Paneer Tikka","Starters",260,true,["Bestseller"],["#d9722e","#f4c98d"]),P("hbk","Hara Bhara Kebab","Starters",210,true,[],["#4f8a3b","#a9cf74"]),P("c65","Chicken 65","Starters",290,false,["Spicy"],["#b8361f","#e8784a"]),P("cc","Crispy Corn","Starters",220,true,[],["#e8b62c","#f6dc7c"]),
    P("pbm","Paneer Butter Masala","Main Course",280,true,["Bestseller"],["#e0782f","#f7e4c3"]),P("dm","Dal Makhani","Main Course",240,true,[],["#6b3a22","#c98b57"]),P("bc","Butter Chicken","Main Course",340,false,[],["#d1572a","#f2b48a"]),P("bn","Butter Naan","Breads",60,true,["Bestseller"],["#e9cf96","#c8923f"]),P("vb","Veg Dum Biryani","Rice & Biryani",260,true,[],["#e2a43a","#f5e3b0"]),P("jr","Jeera Rice","Rice & Biryani",170,true,[],["#efe2bf","#c9a96a"]),P("mc","Masala Chaas","Beverages",70,true,[],["#e9efe0","#9cc27c"]),P("fls","Fresh Lime Soda","Beverages",90,true,[],["#d8ec9a","#9fcc3c"]),P("gj","Gulab Jamun","Desserts",110,true,[],["#7a2f14","#c26a32"])];
  menu.forEach(m=>m.desc=m.desc||{pt:"Cottage cheese in a hung-curd and kashmiri chilli marinade, charred in the tandoor.",hbk:"Spinach, peas and potato patties with a cashew crust.",c65:"Curry leaf and red chilli fried chicken, Chennai style.",cc:"Sweet corn tossed with pepper, spring onion and lime.",pbm:"Soft paneer in a tomato, butter and cashew gravy.",dm:"Black urad dal slow-cooked overnight with cream.",bc:"Tandoori chicken in a smoky makhani gravy.",bn:"Tandoor-baked, brushed with butter."}[m.id]||"");
  const cats=["Starters","Main Course","Breads","Rice & Biryani","Beverages","Desserts"];
  const theme = JSON.parse(localStorage.getItem("__theme")||"null");
  const rest={name:"Demo Kitchen",area:"Mirzapur, Ahmedabad",city:"",open:true,gst:5,plan:"pro",cover:null,logo:null,tables:12,qrOtp:true,theme};
  const orders=[
   {id:'o115',no:115,table:2,name:'Taken by Suresh',by:'Suresh',staff:true,items:[{n:'Dal Makhani',q:1,p:240,veg:true},{n:'Butter Naan',opt:'Garlic',q:4,p:75,veg:true},{n:'Jeera Rice',q:1,p:170,veg:true}],status:'ready',pay:'unpaid',t:now-23*MIN},
   {id:'o116',qr:true,ver:true,phone:'9898011223',no:116,table:9,name:'Arjun',items:[{n:'Chicken 65',q:1,p:290,veg:false},{n:'Fresh Lime Soda',opt:'Salted',q:2,p:90,veg:true}],note:'Less spicy please',sr:{tandoor:true},status:'preparing',pay:'unpaid',t:now-11*MIN},
   {id:'o117',qr:true,ver:true,phone:'9824544210',no:117,table:7,name:'Priya',items:[{n:'Paneer Tikka',q:1,p:260,veg:true},{n:'Masala Chaas',q:2,p:70,veg:true}],status:'new',pay:'unpaid',t:now-2*MIN},
   {id:'o118',qr:true,ver:true,phone:'9879012345',no:118,table:3,name:'Kabir',items:[{n:'Paneer Butter Masala',opt:'Full',q:1,p:280,veg:true},{n:'Butter Naan',q:3,p:60,veg:true},{n:'Gulab Jamun',q:1,p:110,veg:true}],note:'Less oil please',status:'new',pay:'unpaid',t:now-1*MIN},
   {id:'o119',no:119,table:11,name:'Taken by Vijay',by:'Vijay',staff:true,items:[{n:'Veg Dum Biryani',opt:'Full',q:1,p:260,veg:true},{n:'Masala Chaas',q:2,p:70,veg:true}],status:'preparing',pay:'unpaid',t:now-9*MIN},
  ];
  window.__saved=[];
  window.ZESTRO_MOCK=async (fn,a)=>{
    const info={id:"demo-kitchen",name:"Demo Kitchen",area:"Mirzapur, Ahmedabad",city:"",plan:"pro",state:"active",tables:12,paid_until:"2027-11-01"};
    if(fn==="z_public") return {...info,rest,menu,cats};
    if(fn==="z_sync2"||fn==="z_sync") return {now:new Date().toISOString(),restaurant:info,data:{rest,menu,cats,stations:[{id:'tandoor',name:'Tandoor',cats:['Starters','Breads']},{id:'main',name:'Main kitchen',cats:['Main Course','Rice & Biryani']},{id:'drinks',name:'Drinks & desserts',cats:['Beverages','Desserts']}],staff:[{id:'st1',name:'Saalim',role:'Owner',pin:''},{id:'st2',name:'Vijay',role:'Waiter',pin:'1111'},{id:'st3',name:'Suresh',role:'Waiter',pin:'2222'},{id:'st4',name:'Ravi',role:'Kitchen',station:'tandoor',pin:'3333'}]},orders: fn==="z_sync2"&&!a.p_since?orders:[],alerts:[]};
    if(fn==="z_save_data"){ window.__saved.push(a); return new Date().toISOString(); }
    return {};
  };
})();
