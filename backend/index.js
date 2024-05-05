const port=4000;
const express=require('express');
const app=express();
const mongoose=require('mongoose');
const jwt=require('jsonwebtoken');
const multer=require('multer');
const path=require('path');
const cors=require('cors');


app.use(express.json());
app.use(cors());
// Dtabase conncetion with ongodb--->mongodb+srv://shreyash12110805:<password>@cluster0.wlog9yy.mongodb.net/

mongoose.connect("mongodb+srv://shreyashpandeyji98:Aman90@cluster0.3impox7.mongodb.net/e-commerce");

//API Creation
app.get('/',(req,res)=>{
    res.send("Express app is running");
})




//here i am using multer thatis my middleware

const storage=multer.diskStorage({destination:'./upload/images',filename:(req,file,cb)=>{
    return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
}})


///here we creat an upload fxn and pass this config

const upload=multer({storage:storage})

//creating upload endpoint for image


app.use('/images',express.static('upload/images'))


app.post('/upload',upload.single('product'),(req,res)=>{
    res.json({
        succes:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})


//creating scheam using the magoose

//1product

const Product=mongoose.model("product",{
    id:{
        type:Number,
        required:true,    
    },
    name:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    avilable:{
        type:Boolean,
        default:true,
    },   
})


//endpoint for porduct

app.post('/addproduct',async(req,res)=>{

    let products=await Product.find({});
    let id;
    if(products.length>0)
    {
        let last_product_array=products.slice(-1);
        let last_product=last_product_array[0];
        id=last_product.id+1;
    }
    else
    {
        id=1;
    }
    const product=new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);

    //to save in my mongodb datbase
    await product.save();
    console.log("saved");
    res.json({
        success:true,
        name:req.body.name
    })
})

//end point for remove
app.post('/removeproduct',async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});//method is by mongoose
    console.log("removed");
    res.json({
        success:true,
        name:req.body.name
    })
})


//to get all the products

app.get('/allproduct',async (req,res)=>{
    let products=await Product.find({});
    console.log("All product Fetched");

    res.send(products);
})


///////////////////////////////USER////////////////////

const Users=mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,     
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

//endpoint for registering user

app.post('/signup',async(req,res)=>{


    let check=await Users.findOne({email:req.body.email});

    if(check){
        return res.status(400).json({success:false,errors:"email already registered"})
    }

    let cart={};

    for(let i=0;i<300;i++)
        {
            cart[i]=0;
        }
    
    const user= new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    });

    await user.save();


    //jwt authentication

    const data={
        user:{
            id:user.id
        }
    }

    const token=jwt.sign(data,'secret_ecom');
    res.json({success:true,token})
    
})

///login

app.post('/login',async(req,res)=>
{
    let user=await Users.findOne({email:req.body.email});
    if(user)
    {
        const passCompare=req.body.password===user.password;
        if(passCompare)
        { 
            const data={user:{id:user.id}}
            const token=jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else
        {
            res.json({success:false,errors:"Invalid Password"});
        }
    }
    else
    {
        res.json({success:false,errors:"User Not Exist"});
    }
   
})

//to get the latest data

app.get('/newcollections',async(req,res)=>
{
    let products=await Product.find({});
    let newcollection=products.slice(1).slice(-8);

    console.log("newCollection Fetched");
    res.send(newcollection);
})


//popular in women

app.get('/popularinwomen',async (req,res)=>{
    let products =await Product.find({category:"women"});

    let popular_in_women=products.slice(0,4);
    console.log("popular in women fetc Ho gaya");
    res.send(popular_in_women);
})


//creating middleware to fetch user

const fetchUser=async (req,res,next)=>
{
    const token=req.header('auth-token');

    if(!token)
    {
        res.status(401).send({errors:"Please Authenticate First"})
    }
    else
    {
        try{
            const data=jwt.verify(token,'secret_ecom');
            req.user=data.user;
            next();
        }catch(error)
        {
            res.status(401).send({errors:"please authenticate using a valid tokens"})
        }
    }
}

//product in cart
// 

app.post('/addtocart',fetchUser,async (req,res)=>
{
    console.log("addeded",req.body.itemId)
   let userData = await Users.findOne({_id:req.user.id});
   userData.cartData[req.body.itemId]+=1;

   await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
   res.send("Added in the Cart");
})


//remove fromcart

app.post('/removefromcart',fetchUser,async(req,res)=>
{
    console.log("removed",req.body.itemId)
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId]-=1;

   await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
   res.send("removed from the Cart");
   
})


//get cart data

app.post('/getcart',fetchUser,async (req,res)=>
{
    console.log("get Cart");

    let userData=await Users.findOne({_id:req.user.id});

    res.json(userData.cartData);
    
})

////
app.listen(port,(err)=>{
    if(!err)
    console.log("server running on port");
    else
    console.log("error",err);
});