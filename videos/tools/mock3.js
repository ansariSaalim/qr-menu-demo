(function(){
  const now=Date.now(), MIN=60000;
  const TR={pt:['पनीर टिक्का','પનીર ટિક્કા','பனீர் டிக்கா'],hbk:['हरा भरा कबाब','હરા ભરા કબાબ','ஹரா பரா கபாப்'],c65:['चिकन 65','ચિકન 65','சிக்கன் 65'],cc:['क्रिस्पी कॉर्न','ક્રિસ્પી કોર્ન','கிரிஸ்பி கார்ன்'],
    pbm:['पनीर बटर मसाला','પનીર બટર મસાલા','பனீர் பட்டர் மசாலா'],dm:['दाल मखनी','દાલ મખની','தால் மக்கனி'],bc:['बटर चिकन','બટર ચિકન','பட்டர் சிக்கன்'],bn:['बटर नान','બટર નાન','பட்டர் நான்'],
    vb:['वेज दम बिरयानी','વેજ દમ બિરયાની','வெஜ் தம் பிரியாணி'],jr:['जीरा राइस','જીરા રાઇસ','சீரக சாதம்'],mc:['मसाला छाछ','મસાલા છાશ','மசாலா மோர்'],fls:['फ़्रेश लाइम सोडा','ફ્રેશ લાઈમ સોડા','ஃப்ரெஷ் லைம் சோடா'],gj:['गुलाब जामुन','ગુલાબ જાંબુ','குலாப் ஜாமூன்']};
  const P=(id,name,cat,price,veg,tags,c)=>({c:c||["#d9722e","#f4c98d"],id,cat,img:null,veg,desc:"",name,tags:tags||[],price,spice:1,stock:true,addons:[],variants:[],tr:{hi:TR[id][0],gu:TR[id][1],ta:TR[id][2]}});
  const menu=[P("pt","Paneer Tikka","Starters",260,true,["Bestseller"],["#d9722e","#f4c98d"]),P("hbk","Hara Bhara Kebab","Starters",210,true,[],["#4f8a3b","#a9cf74"]),P("c65","Chicken 65","Starters",290,false,["Spicy"],["#b8361f","#e8784a"]),P("cc","Crispy Corn","Starters",220,true,[],["#e8b62c","#f6dc7c"]),
    P("pbm","Paneer Butter Masala","Main Course",280,true,["Bestseller"],["#e0782f","#f7e4c3"]),P("dm","Dal Makhani","Main Course",240,true,[],["#6b3a22","#c98b57"]),P("bc","Butter Chicken","Main Course",340,false,[],["#d1572a","#f2b48a"]),P("bn","Butter Naan","Breads",60,true,["Bestseller"],["#e9cf96","#c8923f"]),P("vb","Veg Dum Biryani","Rice & Biryani",260,true,[],["#e2a43a","#f5e3b0"]),P("jr","Jeera Rice","Rice & Biryani",170,true,[],["#efe2bf","#c9a96a"]),P("mc","Masala Chaas","Beverages",70,true,[],["#e9efe0","#9cc27c"]),P("fls","Fresh Lime Soda","Beverages",90,true,[],["#d8ec9a","#9fcc3c"]),P("gj","Gulab Jamun","Desserts",110,true,[],["#7a2f14","#c26a32"])];
  menu.forEach(m=>m.desc={pt:"Cottage cheese in a hung-curd and kashmiri chilli marinade, charred in the tandoor.",hbk:"Spinach, peas and potato patties with a cashew crust.",c65:"Curry leaf and red chilli fried chicken, Chennai style.",cc:"Sweet corn tossed with pepper, spring onion and lime.",pbm:"Soft paneer in a tomato, butter and cashew gravy.",dm:"Black urad dal slow-cooked overnight with cream.",bc:"Tandoori chicken in a smoky makhani gravy.",bn:"Tandoor-baked, brushed with butter."}[m.id]||"");
  const cats=["Starters","Main Course","Breads","Rice & Biryani","Beverages","Desserts"];
  const CT={hi:{"Starters":"स्टार्टर","Main Course":"मेन कोर्स","Breads":"रोटियाँ","Rice & Biryani":"चावल और बिरयानी","Beverages":"पेय","Desserts":"मिठाई"},gu:{"Starters":"સ્ટાર્ટર","Main Course":"મેઈન કોર્સ","Breads":"રોટી","Rice & Biryani":"ભાત અને બિરયાની","Beverages":"પીણાં","Desserts":"મીઠાઈ"},ta:{"Starters":"ஸ்டார்ட்டர்","Main Course":"மெயின் கோர்ஸ்","Breads":"ரொட்டி","Rice & Biryani":"சாதம் & பிரியாணி","Beverages":"பானங்கள்","Desserts":"இனிப்புகள்"}};
  const web={on:true,wa:"9824011223",delivery:{on:true,km:4,min:199},pickup:{on:true},lat:23.0324611,lng:72.5806909,cash:true,langs:["hi","gu","ta"],
    sub:"Order in 30 seconds · free delivery near Mirzapur",address:"Mirzapur Road, Ahmedabad",party:{on:true,text:"Party and function orders taken",sub:"Birthdays, weddings and office lunches"},
    t:{hi:{cats:CT.hi,tagline:"रोज़ ताज़ा, सीधे तंदूर से",sub:"30 सेकंड में ऑर्डर · मिर्ज़ापुर के पास फ़्री डिलीवरी",party:"पार्टी और फ़ंक्शन के ऑर्डर लिए जाते हैं",partySub:"जन्मदिन, शादी और ऑफ़िस लंच"},
       gu:{cats:CT.gu,tagline:"રોજ તાજું, સીધું તંદૂરમાંથી",sub:"30 સેકન્ડમાં ઓર્ડર · મિર્ઝાપુર પાસે ફ્રી ડિલિવરી",party:"શુભ પ્રસંગના ઓર્ડર લેવામાં આવે છે",partySub:"જન્મદિવસ, લગ્ન અને ઓફિસ લંચ"},
       ta:{cats:CT.ta,tagline:"தினமும் புதிதாக, தந்தூரிலிருந்து நேராக",sub:"30 வினாடிகளில் ஆர்டர் · மிர்சாபூர் அருகே இலவச டெலிவரி",party:"பார்ட்டி மற்றும் விழா ஆர்டர்கள் எடுக்கப்படும்",partySub:"பிறந்தநாள், திருமணம், அலுவலக மதிய உணவு"}}};
  const theme = JSON.parse(localStorage.getItem("__theme")||"null") || {tagline:"Fresh from the tandoor, every day"};
  const rest={name:"Demo Kitchen",area:"Mirzapur, Ahmedabad",city:"",open:true,gst:5,plan:"pro",cover:null,logo:null,tables:12,qrOtp:true,theme,upi:"demokitchen@okaxis",web};
  const I=(id,q)=>{const m=menu.find(x=>x.id===id); return {id,n:m.name,opt:'',q,p:m.price,veg:m.veg};};
  const orders=[
   {id:'w121',rid:'demo-kitchen',no:121,table:0,type:'takeaway',web:true,mode:'delivery',name:'Neha Shah',phone:'9824011223',addr:'B-12, Shanti Park, near Lal Darwaja',loc:{lat:23.04,lng:72.586,km:1.3,src:'gps'},items:[I('pbm',1),I('bn',4),I('gj',2)],note:'Less spicy please',status:'new',pay:'unpaid',payMode:'upi',upiClaim:true,t:now-1*MIN},
   {id:'w120',rid:'demo-kitchen',no:120,table:0,type:'takeaway',web:true,mode:'pickup',name:'Arif',phone:'9898012345',addr:'',loc:null,items:[I('vb',2),I('mc',2)],note:'',status:'preparing',pay:'unpaid',payMode:'cash',t:now-8*MIN},
   {id:'o117',qr:true,ver:true,phone:'9824544210',no:117,table:7,name:'Priya',items:[{n:'Paneer Tikka',q:1,p:260,veg:true},{n:'Masala Chaas',q:2,p:70,veg:true}],status:'new',pay:'unpaid',t:now-2*MIN},
   {id:'o116',qr:true,ver:true,phone:'9898011223',no:116,table:9,name:'Arjun',items:[{n:'Chicken 65',q:1,p:290,veg:false},{n:'Fresh Lime Soda',opt:'Salted',q:2,p:90,veg:true}],note:'Less spicy please',status:'preparing',pay:'unpaid',t:now-11*MIN},
   {id:'o115',no:115,table:2,name:'Taken by Suresh',by:'Suresh',staff:true,items:[{n:'Dal Makhani',q:1,p:240,veg:true},{n:'Butter Naan',opt:'Garlic',q:4,p:75,veg:true},{n:'Jeera Rice',q:1,p:170,veg:true}],status:'ready',pay:'unpaid',t:now-23*MIN},
  ];
  window.__saved=[]; window.__calls=[];
  window.ZESTRO_MOCK=async (fn,a)=>{
    window.__calls.push([fn,a]);
    const info={id:"demo-kitchen",name:"Demo Kitchen",area:"Mirzapur, Ahmedabad",city:"",plan:"pro",state:"active",tables:12,paid_until:"2027-11-01",price:8999,prices:{basic:6999,pro:8999,web:6499}};
    if(fn==="z_public") return JSON.parse(JSON.stringify({...info,rest,menu,cats}));
    if(fn==="z_sync2"||fn==="z_sync") return {now:new Date().toISOString(),restaurant:info,data:a.p_since?{}:{rest,menu,cats,staff:[{id:'st1',name:'Saalim',role:'Owner',pin:''}]},orders: a.p_since?[]:orders,alerts:[]};
    if(fn==="z_save_data"){ window.__saved.push(a); return new Date().toISOString(); }
    if(fn==="z_place_web_order"){ const items=a.p_order.items.map(i=>{const m=menu.find(x=>x.id===i.id); return {id:m.id,n:m.name,opt:i.v||'',q:i.q,p:m.price,veg:m.veg};}); return {...a.p_order,id:'w122',no:122,items,status:'new',pay:'unpaid',web:true,t:Date.now(),loc:a.p_order.loc?{...a.p_order.loc,km:1.3}:null}; }
    if(fn==="z_my_orders") return (a.p_ids||[]).map(id=>({id,status:'preparing',pay:'unpaid'}));
    return {};
  };
})();
