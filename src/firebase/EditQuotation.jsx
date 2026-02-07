const { doc } = require("firebase/firestore")
const { db } = require("./config")


const getCustomerData = async ()=>{
    const ref = doc(db,"customers")
}