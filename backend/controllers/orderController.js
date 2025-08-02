import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";

import razorpay from 'razorpay'

const currency = "inr";
const delivery_charge = 49;

//GATEWAY INITIALIZE
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID ,
  key_secret:process.env.RAZORPAY_KEY_SECRET, 
})


//order using COD
const placeOrder = async (req, res, next) => {
  try {
    const { userId, address, amount, items } = req.body;

    const orderData = {items,address,amount,userId,paymentMethod: "COD",payment: false,date: Date.now(),};

    const newOrder = new orderModel(orderData)
    await newOrder.save()

    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    res.json({success:true , message: "Order Placed"}) 
  } catch (error) {
    console.log(error);
    res.json({success:false,message:error.message})
    
  }
};

//place order using stripe
const placeOrderStripe = async (req, res, next) => {
  try {
    const { userId, address, amount, items } = req.body;
    const { origin } = req.headers;
    const orderData = {
      items,
      address,
      amount,
      userId,
      paymentMethod: "stripe",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData)
    await newOrder.save()

    const line_items = items.map((item) => ({
      price_data: {
        currency: currency,
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    }));

    line_items.push({
      price_data: {
        currency: currency,
        product_data: {
          name: "Delivery Charges",
        },
        unit_amount: delivery_charge *100,
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
      line_items,
      mode: "payment",
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.log(error);
    res.json({success:false,message:error.message})
  }
};


//place order using razorpay
const placeOrderRazorpay = async (req, res) => {
  try {
    const { userId, address, amount, items } = req.body;

    // 1. Save Order to DB
    const orderData = {
      items,
      address,
      amount,
      userId,
      paymentMethod: "Razorpay",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    // 2. Create Razorpay Order
    const options = {
      amount: amount * 100, // in paise
      currency: currency.toUpperCase(),
      receipt: newOrder._id.toString(),
    };

    // ✅ Use promise-based call, not callback
    const order = await razorpayInstance.orders.create(options);

    // 3. Send back the order object
    res.json({ success: true, order });

  } catch (error) {
    console.log("🔥 Razorpay Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


//All orders for admin panel
const allOrders = async (req, res, next) => {
  try {
    const orders = await orderModel.find({});
    res.json({success:true,orders})
  } catch (error) {
    console.log(error);
    res.json({success:false,message: error.message})
  }
};
//user order data for frontend
const userOrders = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const orders = await orderModel.find({ userId });
    res.json({success:true,orders})
  } catch (error) {
    console.log(error);
    res.json({success:false,message: error.message})
    
  }
};


//update order status from admin panel
const updateStatus = async (req, res, next) => {
  try {
    const { orderId, status } = req.body;

    await orderModel.findByIdAndUpdate(orderId, { status });
    res.json({success:true,message:"Status updated"})
  } catch (error) {
    console.log(error);
    res.json({success:false,message: error.message})
  }
};


//Verify stripe payment
const verifyStripePayment = async (req, res, next) => {
  try {
    const { orderId, success, userId } = req.body;

    if (success === "true") {
      await orderModel.findByIdAndUpdate( orderId,{ payment: true });
      await userModel.findByIdAndUpdate(userId,{ cartData: {} });

      res.json({success:true})
    } else {
      await orderModel.findByIdAndDelete(orderId);
      res.json({success:false})
    }
  } catch (error) {
    console.log(error);
    res.json({success:false,message: error.message})
  }
};
const verifyRazorpay = async (req, res) => {
  try {
    const {  userId , razorpay_order_id} = req.body;
    const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)
    if(orderInfo .status === 'paid'){
      await orderModel.findByIdAndUpdate(orderInfo.receipt,{payment:true});
      await userModel.findByIdAndUpdate(userId,{cartData:{}})
      res.json({success: true,message: "Payment Successful"})
      
    }
    else{
        res.json({success: false,message: "failed"})
      }
    
  }catch (error) {
    console.log(error);
    res.json({success:false,message: error.message})
  }
};

export {
  placeOrder,
  verifyRazorpay,
  placeOrderStripe,
  placeOrderRazorpay,
  allOrders,
  userOrders,
  updateStatus,
  verifyStripePayment,
};
